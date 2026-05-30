import { WebSocketServer, WebSocket } from 'ws';
import logger from '../utils/logger.js';
import bettingService from './betting-service.js';

class WebSocketService {
  constructor() {
    this.wss = null;
    this.clients = new Map();
    this.rateLimits = new Map();
    this.gameEngine = null;
    this.aiSystem = null;
    this.eventHistory = [];
    this.latestAIDecisions = new Map();
    this.listeners = new Map();
    this.lastGameId = null;
    this.serverMode = null;
  }

  setGameEngine(engine) {
    this.gameEngine = engine;
    this.latestAIDecisions.clear();
    this.lastGameId = null;
    this.rebuildEventHistoryFromState();
  }

  setAISystem(aiSystem) {
    this.aiSystem = aiSystem;
  }

  start(options = 3000) {
    if (this.wss) {
      return;
    }

    const config = typeof options === 'object'
      ? options
      : { port: options };

    const wsOptions = config.server
      ? { server: config.server, path: config.path || '/ws' }
      : { port: config.port || 3001 };

    this.serverMode = config.server
      ? { type: 'shared', path: wsOptions.path }
      : { type: 'standalone', port: wsOptions.port };

    this.wss = new WebSocketServer(wsOptions);

    this.wss.on('connection', (ws, req) => {
      const clientId = this._generateClientId();
      this.clients.set(clientId, ws);
      logger.info('客户端连接', { clientId, ip: req.socket.remoteAddress });

      if (this.gameEngine) {
        const gameState = this.gameEngine.getState();
        ws.send(JSON.stringify({ type: 'game_state', data: this.normalizeGameState(gameState) }));
      }

      ws.send(JSON.stringify({ type: 'betting_status', data: bettingService.getState() }));

      if (this.eventHistory.length > 0) {
        ws.send(JSON.stringify({ type: 'event_history', data: this.eventHistory }));
      }

      ws.on('message', (message) => this._handleMessage(clientId, message));
      ws.on('close', () => this._handleDisconnect(clientId));
      ws.on('error', (error) => logger.error('WebSocket错误', { clientId, error: error.message }));
    });

    logger.info('WebSocket服务启动', this.serverMode.type === 'shared'
      ? { mode: 'shared', path: this.serverMode.path }
      : { mode: 'standalone', port: this.serverMode.port });
  }

  stop() {
    if (!this.wss) return;

    this.clients.forEach((ws, clientId) => {
      try {
        ws.close();
      } catch {
        logger.warn('关闭客户端连接失败', { clientId });
      }
    });
    this.clients.clear();
    this.rateLimits.clear();

    try {
      this.wss.close();
    } catch (error) {
      logger.warn('关闭WebSocket服务失败', { error: error.message });
    }

    this.wss = null;
    this.serverMode = null;
  }

  async _handleMessage(clientId, message) {
    try {
      const msg = JSON.parse(message);

      if (msg.type === 'ask_ai') {
        if (!this._checkRateLimit(clientId, 'ask_ai', 3, 300000)) {
          this._sendToClient(clientId, { type: 'error', data: { code: 'RATE_LIMIT', message: '提问过于频繁' } });
          return;
        }
        await this._handleAskAI(clientId, msg.data);
      } else if (msg.type === 'place_bet') {
        this._handlePlaceBet(clientId, msg.data);
      }
    } catch (error) {
      logger.error('消息解析失败', { clientId, error: error.message });
    }
  }

  async _handleAskAI(clientId, data) {
    if (!this.aiSystem) {
      this._sendToClient(clientId, { type: 'error', data: { message: 'AI系统未就绪' } });
      return;
    }

    try {
      const answer = await this.aiSystem.answerQuestion(data.aiId, data.question);
      this._sendToClient(clientId, { type: 'ai_answer', data: { aiId: data.aiId, question: data.question, answer } });
    } catch (error) {
      logger.error('AI回答失败', { error: error.message });
      this._sendToClient(clientId, { type: 'error', data: { message: 'AI回答失败' } });
    }
  }

  _handlePlaceBet(clientId, data) {
    const result = bettingService.placeBet(clientId, data.betType, data.prediction, data.amount);
    this._sendToClient(clientId, { type: 'bet_confirmed', data: result });
    if (result?.success) {
      this.pushBettingStatus();
    }
  }

  _handleDisconnect(clientId) {
    this.clients.delete(clientId);
    this.rateLimits.delete(clientId);
    logger.info('客户端断开', { clientId });
  }

  _checkRateLimit(clientId, action, maxCount, windowMs) {
    const key = `${clientId}:${action}`;
    const now = Date.now();
    const record = this.rateLimits.get(key) || { count: 0, resetTime: now + windowMs };

    if (now > record.resetTime) {
      record.count = 0;
      record.resetTime = now + windowMs;
    }

    if (record.count >= maxCount) return false;

    record.count++;
    this.rateLimits.set(key, record);
    return true;
  }

  broadcast(type, data) {
    if (type === 'ai_decision' || type === 'battle' || type === 'diplomacy' || type === 'world_event') {
      this.eventHistory.push({ type, data, timestamp: Date.now() });
      if (this.eventHistory.length > 300) this.eventHistory.shift();
    }

    if (type === 'ai_decision' && data?.aiId) {
      this.latestAIDecisions.set(data.aiId, {
        aiId: data.aiId,
        type: data.type,
        focus: data.focus || data.actions || '',
        actions: data.actions || '',
        reasoning: data.reasoning || '',
        timestamp: data.timestamp || Date.now()
      });
    }

    const message = JSON.stringify({ type, data });
    this.clients.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
      }
    });
  }

  _sendToClient(clientId, message) {
    const ws = this.clients.get(clientId);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  _generateClientId() {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  emit(event, data) {
    const callbacks = this.listeners.get(event) || [];
    callbacks.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        logger.error('事件监听执行失败', { event, error: error.message });
      }
    });
  }

  emitWorldEvent(data) {
    this.emit('world_event', data);
    this.broadcast('world_event', data);
  }

  rebuildEventHistoryFromState() {
    const gameState = this.gameEngine?.getState();
    if (!gameState) return;

    const worldEventHistory = (gameState.worldEvents || [])
      .slice(-100)
      .sort((left, right) => (left.timestamp || 0) - (right.timestamp || 0))
      .map(event => ({
        type: 'world_event',
        data: event,
        timestamp: event.timestamp || Date.now()
      }));

    this.eventHistory = worldEventHistory;
  }

  on(event, callback) {
    const callbacks = this.listeners.get(event) || [];
    callbacks.push(callback);
    this.listeners.set(event, callbacks);
    return () => {
      const next = (this.listeners.get(event) || []).filter(fn => fn !== callback);
      if (next.length === 0) {
        this.listeners.delete(event);
      } else {
        this.listeners.set(event, next);
      }
    }
  }

  pushGameState(gameState) {
    this.broadcast('game_state', this.normalizeGameState(gameState));
  }

  pushBattle(battleData) {
    this.broadcast('battle', battleData);
    logger.info('战斗推送', { attacker: battleData.attacker, defender: battleData.defender });
  }

  pushDiplomacy(diplomacyData) {
    this.broadcast('diplomacy', diplomacyData);
    logger.info('外交推送', { eventType: diplomacyData.eventType });
  }

  pushAIEliminated(aiId, eliminatedBy) {
    this.broadcast('ai_eliminated', { aiId, eliminatedBy, timestamp: Date.now() });
    logger.info('AI消灭推送', { aiId, eliminatedBy });
  }

  pushGameOver(winner, rankings) {
    this.broadcast('game_over', { winner, rankings, betResults: bettingService.settlement || [] });
    logger.info('游戏结束推送', { winner });
  }

  pushBettingStatus() {
    this.broadcast('betting_status', bettingService.getState());
  }

  normalizeGameState(gameState) {
    if (this.lastGameId && this.lastGameId !== gameState.gameId) {
      this.latestAIDecisions.clear();
    }
    this.lastGameId = gameState.gameId;

    return {
      gameId: gameState.gameId,
      status: gameState.status,
      startTime: gameState.startTime,
      currentTick: gameState.currentTick,
      planets: Array.isArray(gameState.planets) ? gameState.planets : Array.from(gameState.planets.values()),
      fleets: Array.isArray(gameState.fleets) ? gameState.fleets : Array.from(gameState.fleets.values()),
      aiStates: Array.isArray(gameState.aiStates) ? gameState.aiStates : Array.from(gameState.aiStates.values()),
      ais: Array.isArray(gameState.aiStates) ? gameState.aiStates : Array.from(gameState.aiStates.values()),
      battles: gameState.battles || [],
      starMap: gameState.starMap || [],
      mapMeta: gameState.mapMeta || null,
      worldEvents: (gameState.worldEvents || []).slice(-120),
      rankings: gameState.status === 'finished' ? (gameState.rankings || []) : [],
      winner: gameState.status === 'finished' ? (gameState.winner || null) : null,
      betResults: gameState.status === 'finished' ? (gameState.betResults || []) : [],
      diplomacyProposals: gameState.diplomacyProposals || [],
      latestAIDecisions: Array.from(this.latestAIDecisions.values())
    };
  }
}

export default new WebSocketService();
