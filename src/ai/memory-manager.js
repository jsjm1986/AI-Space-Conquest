import dbService from '../services/db-service.js';
import logger from '../utils/logger.js';

const MID_TERM_TYPES = new Set([
  'battle',
  'battle_resolved',
  'war_declared',
  'planet_lost',
  'planet_captured',
  'alliance_proposed',
  'alliance_formed',
  'alliance_expired',
  'alliance_broken',
  'peace_proposed',
  'peace_signed',
  'trade_proposed',
  'trade_executed',
  'diplomacy_rejected',
  'crisis_escalated',
  'crisis_cooled',
  'surprise_attack',
  'research_completed',
  'question_answered'
]);

class MemoryManager {
  constructor(aiId, gameId) {
    this.aiId = aiId;
    this.gameId = gameId;
    this.shortTerm = [];
    this.midTerm = [];
    this.longTerm = { enemyPatterns: {}, successfulStrategies: [], failedStrategies: [] };
    this.worldFacts = { planetOwnership: {}, sightings: {}, diplomaticEvents: [] };
  }

  addEvent(type, data) {
    const event = { time: Date.now(), type, data };
    this.shortTerm.push(event);
    if (this.shortTerm.length > 200) {
      this.shortTerm.shift();
    }

    if (MID_TERM_TYPES.has(type)) {
      this.midTerm.push(event);
      if (this.midTerm.length > 100) {
        this.midTerm.shift();
      }
    }

    return event;
  }

  getRecentEvents(minutes = 15) {
    const cutoff = Date.now() - minutes * 60000;
    return this.shortTerm.filter(e => e.time > cutoff);
  }

  getMidTermEvents(hours = 3) {
    const cutoff = Date.now() - hours * 3600000;
    return this.midTerm.filter(e => e.time > cutoff);
  }

  getRelevantEvents(limit = 10) {
    return [...this.shortTerm].slice(-limit);
  }

  addWorldEvent(event) {
    if (!event) return null;

    const payload = event.data || event;
    this.addEvent(event.type, payload);

    if (event.type === 'planet_scouted' && payload.planetId) {
      this.worldFacts.sightings[payload.planetId] = {
        owner: payload.owner ?? null,
        lastSeenAt: payload.timestamp ?? Date.now(),
        source: payload.source || 'unknown'
      };
    }

    if (event.type === 'planet_captured' && payload.planetId) {
      this.worldFacts.planetOwnership[payload.planetId] = {
        owner: payload.toOwner ?? null,
        lastSeenAt: payload.timestamp ?? Date.now(),
        source: 'capture'
      };
    }

    if (['war_declared', 'surprise_attack', 'alliance_proposed', 'alliance_formed', 'alliance_expired', 'alliance_broken', 'peace_proposed', 'peace_signed', 'trade_proposed', 'trade_executed', 'diplomacy_rejected', 'crisis_escalated', 'crisis_cooled'].includes(event.type)) {
      this.worldFacts.diplomaticEvents.unshift({
        type: event.type,
        ...payload
      });
      this.worldFacts.diplomaticEvents = this.worldFacts.diplomaticEvents.slice(0, 20);
    }

    return payload;
  }

  updateLongTerm(update) {
    if (!update || typeof update !== 'object') return;

    if (update.enemyPattern) {
      this.longTerm.enemyPatterns[update.enemyPattern.aiId] = update.enemyPattern.pattern;
    }
    if (update.pattern && update.target_ai) {
      this.longTerm.enemyPatterns[update.target_ai] = update.pattern;
    }
    if (update.learned) {
      this.longTerm.lastReflection = update.learned;
    }
    if (update.successfulStrategy) {
      this.longTerm.successfulStrategies.push(update.successfulStrategy);
    }
    if (update.failedStrategy) {
      this.longTerm.failedStrategies.push(update.failedStrategy);
    }
  }

  compress() {
    const oneHourAgo = Date.now() - 3600000;
    this.shortTerm = this.shortTerm.filter(e => e.time > oneHourAgo);

    const sixHoursAgo = Date.now() - 6 * 3600000;
    this.midTerm = this.midTerm.filter(e => e.time > sixHoursAgo);
  }

  async save() {
    try {
      await dbService.saveAIMemory(this.gameId, this.aiId, {
        shortTerm: this.shortTerm,
        midTerm: this.midTerm,
        longTerm: this.longTerm,
        worldFacts: this.worldFacts
      });
    } catch (error) {
      logger.warn('AI记忆持久化失败，已降级为仅内存', {
        aiId: this.aiId,
        gameId: this.gameId,
        error: error.message
      });
    }
  }

  async load() {
    try {
      const data = await dbService.loadAIMemory(this.gameId, this.aiId);
      if (data) {
        this.shortTerm = data.shortTerm || [];
        this.midTerm = data.midTerm || [];
        this.longTerm = data.longTerm || { enemyPatterns: {}, successfulStrategies: [], failedStrategies: [] };
        this.worldFacts = data.worldFacts || { planetOwnership: {}, sightings: {}, diplomaticEvents: [] };
      }
    } catch (error) {
      logger.warn('AI记忆加载失败，已降级为默认空记忆', {
        aiId: this.aiId,
        gameId: this.gameId,
        error: error.message
      });
    }
  }
}

export default MemoryManager;
