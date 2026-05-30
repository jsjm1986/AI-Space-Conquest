import apiService from '../services/api-service.js';
import MemoryManager from './memory-manager.js';
import PromptBuilder from './prompt-builder.js';
import logger from '../utils/logger.js';
import { BUILDINGS, SHIPS, TECH_TREE } from '../utils/constants.js';

const STRATEGY_FOCUS_LABELS = {
  military: '军事扩张',
  defense: '防御建设',
  economy: '经济发展',
  technology: '科技研发',
  diplomacy: '外交布局'
};

const FLEET_ACTION_LABELS = {
  attack: '攻击',
  defend: '调防',
  redeploy: '换防',
  contest: '争夺',
  move: '机动'
};

class AIWorker {
  constructor(aiId, gameId) {
    this.aiId = aiId;
    this.gameId = gameId;
    this.memory = new MemoryManager(aiId, gameId);
    this.promptBuilder = new PromptBuilder(aiId);
    this.isProcessing = false;
    this.pendingEvents = [];
    this.processingEventQueue = false;
    this.wsService = null;
  }

  buildRequestOptions(requestType) {
    const autonomousKey = `${this.aiId}:autonomy`;
    if (requestType === 'strategy') {
      return {
        aiId: this.aiId,
        requestType,
        priority: 1,
        replaceKey: autonomousKey,
        dropOnCircuitOpen: false,
        maxQueueMs: 4 * 60 * 1000
      };
    }

    if (requestType === 'event') {
      return {
        aiId: this.aiId,
        requestType,
        priority: 2,
        replaceKey: autonomousKey,
        dropOnCircuitOpen: true,
        maxQueueMs: 20 * 1000
      };
    }

    if (requestType === 'question') {
      return {
        aiId: this.aiId,
        requestType,
        priority: 0,
        dropOnCircuitOpen: false,
        maxQueueMs: 45 * 1000
      };
    }

    return {
      aiId: this.aiId,
      requestType: 'tactical',
      priority: 3,
      replaceKey: autonomousKey,
      dropOnCircuitOpen: true,
      maxQueueMs: 45 * 1000
    };
  }

  setWebSocketService(wsService) {
    this.wsService = wsService;
  }

  async initialize() {
    await this.memory.load();
    logger.info(`AI Worker ${this.aiId} 已初始化`);
  }

  sanitizeGameStateForAI(gameState) {
    if (!gameState) return gameState;
    return {
      ...gameState,
      rankings: [],
      winner: null,
      betResults: []
    };
  }

  async makeStrategyDecision(gameState) {
    return this.runExclusive(async () => {
      const aiView = this.sanitizeGameStateForAI(gameState);
      const messages = this.promptBuilder.buildStrategyPrompt(aiView, this.memory);
      const response = await apiService.callAI(messages, 'strategy', 3, this.buildRequestOptions('strategy'));
      if (response == null) return null;
      const decision = this.parseJSON(response) || {};

      if (decision?.memory_update) {
        this.memory.updateLongTerm(decision.memory_update);
      }

      this.memory.addEvent('strategy_decision', decision);
      await this.memory.save();

      const readableFocus = STRATEGY_FOCUS_LABELS[decision.strategy?.focus] || decision.strategy?.focus || '战略规划';
      logger.info(`${this.aiId} 战略决策: ${readableFocus}`);

      if (this.wsService) {
        const data = {
          aiId: this.aiId,
          type: 'strategy',
          focus: readableFocus,
          reasoning: this.localizeNarrative(decision.strategy?.reasoning || decision.reasoning || '分析当前局势', gameState),
          timestamp: Date.now()
        };
        this.wsService.broadcast('ai_decision', data);
        logger.info(`广播战略决策: ${this.aiId}`, data);
      }

      return decision;
    }, error => {
      logger.error(`${this.aiId} 战略决策失败: ${error.message}`);
      return null;
    });
  }

  async makeTacticalDecision(gameState) {
    return this.runExclusive(async () => {
      const aiView = this.sanitizeGameStateForAI(gameState);
      const messages = this.promptBuilder.buildTacticalPrompt(aiView, this.memory);
      const response = await apiService.callAI(messages, 'tactical', 3, this.buildRequestOptions('tactical'));
      if (response == null) return null;
      const decision = this.parseJSON(response) || {};

      this.memory.addEvent('tactical_decision', decision);
      await this.memory.save();

      logger.info(`${this.aiId} 战术决策完成`);

      if (this.wsService) {
        const actions = [];
        if (decision.resource_allocation) {
          for (const [planetId, acts] of Object.entries(decision.resource_allocation)) {
            const planetName = this.getPlanetLabel(gameState, planetId);
            if (acts.build) actions.push(`${planetName}建造${this.getBuildingLabel(acts.build)}`);
            if (acts.ships) {
              const ships = Object.entries(acts.ships)
                .filter(([, count]) => Number(count) > 0)
                .map(([shipType, count]) => `${this.getShipLabel(shipType)}x${count}`)
                .join('、');
              if (ships) {
                actions.push(`${planetName}补充${ships}`);
              }
            }
          }
        }
        const fleetOrders = Array.isArray(decision.fleet_orders)
          ? decision.fleet_orders
          : (!decision.fleet_orders || typeof decision.fleet_orders !== 'object'
            ? []
            : Object.entries(decision.fleet_orders).map(([fleetId, order]) => ({ fleet_id: fleetId, ...order })));
        for (const order of fleetOrders.slice(0, 3)) {
          const action = FLEET_ACTION_LABELS[(order.action || '').toLowerCase()] || '调动';
          const target = this.getPlanetLabel(gameState, order.target || order.targetPlanet || order.target_planet);
          actions.push(`${action}${target}`);
        }
        if (fleetOrders.length > 3) {
          actions.push(`舰队命令${fleetOrders.length}项`);
        }
        if (decision.tech_research) actions.push(`研究${this.getTechLabel(decision.tech_research)}`);

        const data = {
          aiId: this.aiId,
          type: 'tactical',
          actions: actions.join('，') || '观察局势',
          reasoning: this.localizeNarrative(decision.reasoning || '执行战术计划', gameState),
          timestamp: Date.now()
        };
        this.wsService.broadcast('ai_decision', data);
        logger.info(`广播战术决策: ${this.aiId}`, data);
      }

      return decision;
    }, error => {
      logger.error(`${this.aiId} 战术决策失败: ${error.message}`);
      return null;
    });
  }

  async respondToEvent(event, gameState) {
    if (this.isProcessing) {
      return new Promise(resolve => this.queueEventResponse(event, gameState, resolve));
    }

    return this.runExclusive(async () => this.respondToEventNow(event, gameState), error => {
      logger.error(`${this.aiId} 事件响应失败: ${error.message}`);
      return null;
    });
  }

  async answerQuestion(question, gameState) {
    const aiView = this.sanitizeGameStateForAI(gameState);
    const messages = this.promptBuilder.buildQuestionPrompt(question, aiView, this.memory);
    const response = await apiService.callAI(messages, 'question', 3, this.buildRequestOptions('question'));
    if (response == null) {
      return '当前通信信道拥塞，稍后再问我。';
    }
    const answer = typeof response === 'string' ? response.trim() : String(response || '');
    this.memory.addEvent('question_answered', { question, answer });
    await this.memory.save();
    return answer.replace(/^["']|["']$/g, '');
  }

  async recordWorldEvent(event) {
    this.memory.addWorldEvent(event);
    await this.memory.save();
  }

  parseJSON(text) {
    if (typeof text !== 'string') return null;

    const fencedMatch = text.match(/```json\s*([\s\S]*?)```/i);
    if (fencedMatch) {
      try {
        return JSON.parse(fencedMatch[1]);
      } catch {
        // Continue to balanced JSON extraction.
      }
    }

    const start = text.indexOf('{');
    if (start === -1) return null;

    let depth = 0;
    let inString = false;
    let escaped = false;
    for (let index = start; index < text.length; index++) {
      const char = text[index];

      if (inString) {
        if (escaped) {
          escaped = false;
        } else if (char === '\\') {
          escaped = true;
        } else if (char === '"') {
          inString = false;
        }
        continue;
      }

      if (char === '"') {
        inString = true;
      } else if (char === '{') {
        depth++;
      } else if (char === '}') {
        depth--;
        if (depth === 0) {
          try {
            return JSON.parse(text.slice(start, index + 1));
          } catch {
            return null;
          }
        }
      }
    }

    return null;
  }

  async compressMemory() {
    this.memory.compress();
    await this.memory.save();
  }

  getPlanetLabel(gameState, planetId) {
    if (!planetId) return '目标星球';
    const planet = gameState?.planets?.find(item => item.id === planetId);
    if (planet?.name) return planet.name;
    const match = /^planet_(\d+)$/i.exec(String(planetId));
    return match ? `${Number(match[1])}号星球` : String(planetId);
  }

  getBuildingLabel(buildingType) {
    return BUILDINGS[buildingType]?.name || buildingType || '建筑';
  }

  getShipLabel(shipType) {
    return SHIPS[shipType]?.name || shipType || '舰船';
  }

  getTechLabel(techType) {
    return TECH_TREE[techType]?.name || techType || '科技';
  }

  localizeNarrative(text, gameState) {
    if (text == null || text === '') return '';

    let value = String(text);
    value = value.replace(/\b(ai_\d+)\b/gi, (match) => gameState?.aiStates?.find(item => item.id === match)?.name || match);
    value = value.replace(/\b(planet_\d+)\b/gi, (match) => this.getPlanetLabel(gameState, match));
    value = value.replace(/\b(scout|frigate|cruiser|battleship)\s*x\s*(\d+)\b/gi, (_, shipType, count) => `${this.getShipLabel(shipType)}x${count}`);
    value = value.replace(/\b(scout|frigate|cruiser|battleship)x(\d+)\b/gi, (_, shipType, count) => `${this.getShipLabel(shipType)}x${count}`);

    for (const [key, label] of Object.entries(STRATEGY_FOCUS_LABELS)) {
      value = value.replace(new RegExp(`\\b${key}\\b`, 'g'), label);
    }
    for (const [key, label] of Object.entries(FLEET_ACTION_LABELS)) {
      value = value.replace(new RegExp(`\\b${key}\\b`, 'g'), label);
    }
    for (const [key, info] of Object.entries(BUILDINGS)) {
      value = value.replace(new RegExp(`\\b${key}\\b`, 'g'), info.name);
    }
    for (const [key, info] of Object.entries(SHIPS)) {
      value = value.replace(new RegExp(`\\b${key}\\b`, 'g'), info.name);
    }
    for (const [key, info] of Object.entries(TECH_TREE)) {
      value = value.replace(new RegExp(`\\b${key}\\b`, 'g'), info.name);
    }

    return value
      .replace(/\bfeint_assault\b/gi, '佯攻假象')
      .replace(/\bdeception_planted\b/gi, '佯动展开')
      .replace(/\bdeception_ended\b/gi, '佯动结束')
      .replace(/\bsurprise_strike\b/gi, '违约突袭')
      .replace(/\bsurprise_attack\b/gi, '违约突袭')
      .replace(/\balliance_broken\b/gi, '联盟破裂')
      .replace(/\bcrisis_escalated\b/gi, '危机升级')
      .replace(/\bcrisis_cooled\b/gi, '危机降温')
      .replace(/\bETA\b/gi, '抵达倒计时')
      .replace(/\bTick\b/gi, '时刻')
      .replace(/\bLv\b/gi, '等级')
      .replace(/\s+\|\s+/g, '；')
      .trim();
  }

  async respondToEventNow(event, gameState) {
    const aiView = this.sanitizeGameStateForAI(gameState);
    const messages = this.promptBuilder.buildEventPrompt(event, aiView, this.memory);
    const response = await apiService.callAI(messages, 'event', 3, this.buildRequestOptions('event'));
    if (response == null) return null;
    const decision = this.parseJSON(response) || {};

    this.memory.addWorldEvent(event);
    await this.memory.save();

    logger.info(`${this.aiId} 事件响应: ${event.type}`);
    return decision;
  }

  async runExclusive(task, onError = null, drainAfter = true) {
    if (this.isProcessing) return null;

    this.isProcessing = true;
    try {
      return await task();
    } catch (error) {
      if (typeof onError === 'function') {
        return onError(error);
      }
      throw error;
    } finally {
      this.isProcessing = false;
      if (drainAfter) {
        void this.processPendingEvents();
      }
    }
  }

  async processPendingEvents() {
    if (this.isProcessing || this.processingEventQueue || this.pendingEvents.length === 0) {
      return;
    }

    this.processingEventQueue = true;

    try {
      while (!this.isProcessing && this.pendingEvents.length > 0) {
        const next = this.pendingEvents.shift();
        const result = await this.runExclusive(
          async () => this.respondToEventNow(next.event, next.gameState),
          error => {
            logger.error(`${this.aiId} 队列事件响应失败: ${error.message}`);
            return null;
          },
          false
        );
        next.resolve(result);
      }
    } finally {
      this.processingEventQueue = false;
      if (this.pendingEvents.length > 0 && !this.isProcessing) {
        void this.processPendingEvents();
      }
    }
  }

  queueEventResponse(event, gameState, resolve) {
    const entry = { event, gameState, resolve };

    if (this.isDiplomacyProposalEvent(event)) {
      const existingIndex = this.pendingEvents.findIndex(item =>
        this.isDiplomacyProposalEvent(item.event) &&
        item.event?.data?.proposalId === event?.data?.proposalId
      );

      if (existingIndex >= 0) {
        this.pendingEvents[existingIndex].resolve(null);
        this.pendingEvents[existingIndex] = entry;
      } else {
        this.pendingEvents.unshift(entry);
      }
      return;
    }

    const retained = this.pendingEvents.filter(item => this.isDiplomacyProposalEvent(item.event));
    const dropped = this.pendingEvents.find(item => !this.isDiplomacyProposalEvent(item.event));
    dropped?.resolve(null);
    this.pendingEvents = [...retained, entry];
  }

  isDiplomacyProposalEvent(event) {
    return ['alliance_proposed', 'peace_proposed', 'trade_proposed'].includes(event?.type);
  }
}

export default AIWorker;
