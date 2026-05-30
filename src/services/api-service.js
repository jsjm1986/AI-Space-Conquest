import axios from 'axios';
import logger from '../utils/logger.js';

const REQUEST_PRIORITIES = {
  question: 0,
  strategy: 1,
  event: 2,
  tactical: 3
};

const REQUEST_DEFAULTS = {
  question: { maxQueueMs: 45 * 1000, dropOnCircuitOpen: false },
  strategy: { maxQueueMs: 4 * 60 * 1000, dropOnCircuitOpen: false },
  event: { maxQueueMs: 20 * 1000, dropOnCircuitOpen: true },
  tactical: { maxQueueMs: 45 * 1000, dropOnCircuitOpen: true }
};

class APIService {
  constructor() {
    this.baseURL = process.env.API_BASE_URL || 'http://localhost:8000';
    this.apiKey = process.env.API_KEY || '';
    this.model = process.env.API_MODEL || 'gpt-5.2';
    this.timeout = { strategy: 90000, tactical: 60000, event: 30000, question: 45000 };
    this.minGapMs = Math.max(0, Number(process.env.AI_REQUEST_GAP_MS || 1500));
    this.queue = [];
    this.processingQueue = false;
    this.nextTaskId = 1;
    this.cooldownUntil = 0;
  }

  async callAI(messages, type = 'tactical', retries = 3, options = {}) {
    const requestType = options.requestType || type;
    const defaults = REQUEST_DEFAULTS[requestType] || REQUEST_DEFAULTS.tactical;
    const task = {
      id: `req_${this.nextTaskId++}`,
      aiId: options.aiId || null,
      type,
      requestType,
      retries,
      messages,
      replaceKey: options.replaceKey || null,
      priority: Number.isFinite(options.priority) ? options.priority : (REQUEST_PRIORITIES[requestType] ?? REQUEST_PRIORITIES.tactical),
      dropOnCircuitOpen: options.dropOnCircuitOpen ?? defaults.dropOnCircuitOpen,
      maxQueueMs: Number.isFinite(options.maxQueueMs) ? options.maxQueueMs : defaults.maxQueueMs,
      createdAt: Date.now()
    };

    return new Promise((resolve, reject) => {
      task.resolve = resolve;
      task.reject = reject;
      this.enqueueTask(task);
    });
  }

  async healthCheck() {
    try {
      await axios.get(`${this.baseURL}/health`, { timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  enqueueTask(task) {
    if (task.replaceKey) {
      const existingIndex = this.queue.findIndex(item => item.replaceKey === task.replaceKey);
      if (existingIndex >= 0) {
        const existing = this.queue[existingIndex];
        if (this.shouldReplaceQueuedTask(existing, task)) {
          this.queue.splice(existingIndex, 1);
          existing.resolve(null);
          logger.info('AI请求已被新任务替换', {
            aiId: task.aiId,
            replaceKey: task.replaceKey,
            previous: existing.requestType,
            next: task.requestType
          });
        } else {
          logger.info('AI请求被更高优先级任务压制', {
            aiId: task.aiId,
            replaceKey: task.replaceKey,
            existing: existing.requestType,
            dropped: task.requestType
          });
          task.resolve(null);
          return;
        }
      }
    }

    if (this.isCircuitOpen() && task.dropOnCircuitOpen) {
      logger.info('AI请求因熔断直接跳过', {
        aiId: task.aiId,
        type: task.requestType,
        waitMs: Math.max(0, this.cooldownUntil - Date.now())
      });
      task.resolve(null);
      return;
    }

    this.queue.push(task);
    this.sortQueue();
    void this.processQueue();
  }

  shouldReplaceQueuedTask(existing, incoming) {
    if (incoming.priority < existing.priority) return true;
    if (incoming.priority === existing.priority) return true;
    return false;
  }

  sortQueue() {
    this.queue.sort((left, right) => {
      if (left.priority !== right.priority) {
        return left.priority - right.priority;
      }
      return left.createdAt - right.createdAt;
    });
  }

  isTaskExpired(task) {
    return task.maxQueueMs > 0 && (Date.now() - task.createdAt) > task.maxQueueMs;
  }

  isCircuitOpen() {
    return Date.now() < this.cooldownUntil;
  }

  async processQueue() {
    if (this.processingQueue) return;
    this.processingQueue = true;

    try {
      while (this.queue.length > 0) {
        this.sortQueue();
        const task = this.queue.shift();
        if (!task) continue;

        if (this.isTaskExpired(task)) {
          logger.info('AI请求已过期，直接丢弃', { aiId: task.aiId, type: task.requestType });
          task.resolve(null);
          continue;
        }

        if (this.isCircuitOpen()) {
          if (task.dropOnCircuitOpen) {
            logger.info('AI请求在熔断窗口内被丢弃', {
              aiId: task.aiId,
              type: task.requestType,
              waitMs: Math.max(0, this.cooldownUntil - Date.now())
            });
            task.resolve(null);
            continue;
          }
          await this.waitForCooldown();
          if (this.isTaskExpired(task)) {
            task.resolve(null);
            continue;
          }
        }

        let attemptedRequest = false;
        try {
          attemptedRequest = true;
          const result = await this.callAIInternal(task.messages, task.type, task.retries, task);
          task.resolve(result);
        } catch (error) {
          if (task.dropOnCircuitOpen && this.isCircuitOpen()) {
            task.resolve(null);
          } else {
            task.reject(error);
          }
        }

        if (attemptedRequest) {
          await this.sleep(this.minGapMs);
        }
      }
    } finally {
      this.processingQueue = false;
      if (this.queue.length > 0) {
        void this.processQueue();
      }
    }
  }

  getCircuitDelayMs(attemptIndex, error) {
    const retryAfterRaw = Number(error.response?.headers?.['retry-after']);
    const retryAfterMs = Number.isFinite(retryAfterRaw) && retryAfterRaw > 0 ? retryAfterRaw * 1000 : 0;
    const backoffMs = Math.min(120000, 60000 + attemptIndex * 30000);
    return Math.max(60000, retryAfterMs, backoffMs);
  }

  openCircuit(delayMs, meta = {}) {
    const nextUntil = Date.now() + delayMs;
    if (nextUntil <= this.cooldownUntil) return;
    this.cooldownUntil = nextUntil;
    logger.warn('AI请求熔断已开启', {
      waitMs: delayMs,
      ...meta
    });
  }

  async callAIInternal(messages, type = 'tactical', retries = 3, task = null) {
    const timeout = this.timeout[type] || 60000;

    for (let i = 0; i < retries; i++) {
      try {
        const response = await axios.post(`${this.baseURL}/v1/chat/completions`, {
          model: this.model,
          messages,
          temperature: 0.7,
          max_tokens: 1000
        }, {
          headers: { 'Authorization': `Bearer ${this.apiKey}` },
          timeout
        });

        return response.data.choices[0].message.content;
      } catch (error) {
        const status = error.response?.status;
        const errorMsg = error.response?.data?.error?.message || error.message || JSON.stringify(error.response?.data || 'Unknown error');
        const coolingDown = status === 429 && /cooling down/i.test(errorMsg);
        const delay = coolingDown
          ? this.getCircuitDelayMs(i, error)
          : Math.pow(2, i) * 1000;

        logger.warn(`API调用失败 (${i + 1}/${retries}): ${errorMsg}`);

        if (coolingDown) {
          this.openCircuit(delay, {
            aiId: task?.aiId,
            type: task?.requestType || type,
            url: this.baseURL,
            model: this.model,
            status
          });
          if (task?.dropOnCircuitOpen) {
            throw error;
          }
        }

        if (i < retries - 1) {
          await this.sleep(delay);
        } else {
          logger.error(`API最终失败: ${errorMsg}`, {
            url: this.baseURL,
            model: this.model,
            status
          });
          throw error;
        }
      }
    }
  }

  async waitForCooldown() {
    const waitMs = Math.max(0, this.cooldownUntil - Date.now());
    if (waitMs > 0) {
      await this.sleep(waitMs);
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default new APIService();
