import IntelligenceSystem from './intelligence-system.js';
import bettingService from '../services/betting-service.js';
import gameEventBus from '../services/game-event-bus.js';
import { GAME_CONFIG } from '../../config/game-config.js';
import { buildStrategicMapState } from '../utils/strategic-map.js';

class GameLoop {
  constructor(gameState, resourceManager, buildingSystem, fleetManager, combatSystem, techSystem = null, diplomacySystem = null, intelligenceSystem = null) {
    this.gameState = gameState;
    this.resourceManager = resourceManager;
    this.buildingSystem = buildingSystem;
    this.fleetManager = fleetManager;
    this.combatSystem = combatSystem;
    this.techSystem = techSystem;
    this.diplomacySystem = diplomacySystem;
    this.intelligenceSystem = intelligenceSystem || new IntelligenceSystem(gameState);
    this.intervalId = null;
    this.tickRemainder = 0;
    this.lastTickAt = null;
    this.lastBroadcastTick = gameState.currentTick || 0;
    this.wsService = null;

    if (typeof this.techSystem?.setGameState === 'function') {
      this.techSystem.setGameState(gameState);
    }

    if (typeof this.diplomacySystem?.setGameState === 'function') {
      this.diplomacySystem.setGameState(gameState);
    }

    if (typeof this.fleetManager?.setIntelligenceSystem === 'function') {
      this.fleetManager.setIntelligenceSystem(this.intelligenceSystem);
    }

    if (typeof this.combatSystem?.setIntelligenceSystem === 'function') {
      this.combatSystem.setIntelligenceSystem(this.intelligenceSystem);
    }

    if (typeof this.combatSystem?.setDiplomacySystem === 'function') {
      this.combatSystem.setDiplomacySystem(this.diplomacySystem);
    }
  }

  setWebSocketService(wsService) {
    this.wsService = wsService;
  }

  start() {
    if (this.intervalId) return;
    if (this.gameState.status !== 'running') return;
    this.intelligenceSystem?.initialize();
    this.updateStrategicMapState(Date.now());
    this.lastTickAt = Date.now();
    this.intervalId = setInterval(() => this.tick(), Math.max(50, GAME_CONFIG.TICK_RATE || 1000));
    console.log('游戏主循环已启动');
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      this.lastTickAt = null;
      console.log('游戏主循环已停止');
    }
  }

  tick() {
    if (this.gameState.status !== 'running') return;

    const now = Date.now();
    const elapsedMs = this.lastTickAt ? now - this.lastTickAt : 1000;
    const deltaSeconds = Math.max(0.001, elapsedMs / 1000);
    this.lastTickAt = now;

    this.resourceManager.updateResources(this.gameState, deltaSeconds);
    this.buildingSystem.processBuildQueue(this.gameState);
    this.fleetManager.updateFleets(this.gameState);
    this.combatSystem.checkBattles(this.gameState);
    this.techSystem?.update(now);
    this.diplomacySystem?.update(now);
    this.intelligenceSystem?.sync(now);
    this.updateStrategicMapState(now);

    this.tickRemainder += deltaSeconds;
    const wholeTicks = Math.floor(this.tickRemainder);
    if (wholeTicks > 0) {
      this.gameState.currentTick += wholeTicks;
      this.tickRemainder -= wholeTicks;
    }

    this.updateBettingWindow();
    this.updateEliminationsAndVictory(now);

    if (this.wsService && this.gameState.currentTick - this.lastBroadcastTick >= 1) {
      this.wsService.pushGameState(this.gameState);
      this.lastBroadcastTick = this.gameState.currentTick;
    }
  }

  getState() {
    return this.gameState;
  }

  updateBettingWindow() {
    const bettingDeadlineTicks = 10 * 60;
    if (this.gameState.currentTick < bettingDeadlineTicks && !bettingService.bettingOpen && this.gameState.status === 'running') {
      bettingService.openBetting(this.gameState.startTime);
      this.wsService?.pushBettingStatus();
      return;
    }

    if (this.gameState.currentTick >= bettingDeadlineTicks && bettingService.bettingOpen) {
      bettingService.closeBetting();
      this.wsService?.pushBettingStatus();
    }
  }

  updateEliminationsAndVictory(now) {
    const rankings = this.computeRankings();
    this.gameState.rankings = rankings;

    rankings.forEach(entry => {
      const ai = this.gameState.aiStates.find(item => item.id === entry.aiId);
      if (!ai) return;

      const eliminated = entry.planetCount === 0 && entry.fleetCount === 0;
      if (eliminated && ai.status !== 'eliminated') {
        ai.status = 'eliminated';
        ai.eliminatedAt = now;
        const eliminatedBy = this.inferEliminatedBy(ai.id);
        this.recordWorldEvent('ai_eliminated', {
          aiId: ai.id,
          eliminatedBy,
          timestamp: now
        });
        this.wsService?.pushAIEliminated(ai.id, eliminatedBy);
      } else if (!eliminated) {
        ai.status = 'active';
        ai.eliminatedAt = null;
      }
    });

    const alive = rankings.filter(entry => entry.planetCount > 0 || entry.fleetCount > 0);
    if (this.gameState.status === 'running' && alive.length <= 1) {
      const winner = alive[0]?.aiId || null;
      this.gameState.status = 'finished';
      this.gameState.winner = winner;
      this.gameState.endTime = now;
      bettingService.closeBetting();
      this.wsService?.pushBettingStatus();
      this.gameState.betResults = bettingService.settleBets(winner, rankings);
      this.recordWorldEvent('game_over', {
        winner,
        rankings,
        timestamp: now
      });
      this.wsService?.pushGameOver(winner, rankings);
      this.stop();
    }
  }

  computeRankings() {
    return this.gameState.aiStates
      .map(ai => {
        const planetCount = this.gameState.planets.filter(planet => planet.owner === ai.id).length;
        const ownedFleets = this.gameState.fleets.filter(fleet => fleet.owner === ai.id);
        const fleetCount = ownedFleets.length;
        const fleetPower = ownedFleets.reduce((sum, fleet) => sum + (fleet.totalPower || 0), 0);

        return {
          aiId: ai.id,
          name: ai.name,
          planetCount,
          fleetCount,
          fleetPower,
          score: planetCount * 100 + fleetPower
        };
      })
      .sort((left, right) => right.score - left.score);
  }

  inferEliminatedBy(aiId) {
    const events = Array.isArray(this.gameState.worldEvents) ? [...this.gameState.worldEvents].reverse() : [];
    for (const event of events) {
      const payload = event.data || event;
      if (event.type === 'planet_captured' && payload.fromOwner === aiId && payload.toOwner && payload.toOwner !== aiId) {
        return payload.toOwner;
      }
      if (event.type === 'battle_resolved' && payload.defender === aiId && payload.captured && payload.attacker && payload.attacker !== aiId) {
        return payload.attacker;
      }
    }
    return null;
  }

  recordWorldEvent(type, data) {
    return gameEventBus.recordWorldEvent(this.gameState, type, data);
  }

  updateStrategicMapState(now = Date.now()) {
    this.gameState.mapMeta = this.gameState.mapMeta || {};
    this.gameState.mapMeta.dynamic = buildStrategicMapState(this.gameState, now);
  }
}

export default GameLoop;
