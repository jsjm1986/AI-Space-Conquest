import gameEventBus from '../services/game-event-bus.js';
import logger from '../utils/logger.js';
import { TECH_TREE } from '../data/tech-tree.js';

class TechSystem {
  constructor(gameState, resourceManager = null) {
    this.gameState = gameState;
    this.resourceManager = resourceManager;
  }

  setGameState(gameState) {
    this.gameState = gameState;
  }

  startResearch(aiIdOrState, techType, gameState = this.gameState) {
    const aiId = typeof aiIdOrState === 'object' ? aiIdOrState?.id : aiIdOrState;
    const ai = gameState.aiStates.find(item => item.id === aiId);
    if (!ai) return { success: false, error: 'AI不存在' };
    if (ai.researchQueue) return { success: false, error: '已有研究进行中' };

    const tech = TECH_TREE[techType];
    if (!tech) return { success: false, error: '科技不存在' };

    const currentLevel = ai.tech[techType] || 0;
    if (currentLevel >= tech.maxLevel) return { success: false, error: '已达最高等级' };

    const ownedPlanets = gameState.planets.filter(planet => planet.owner === aiId);
    const totalLabLevel = ownedPlanets.reduce((sum, planet) => sum + (planet.buildings?.lab || 0) + (planet.nodeModifiers?.labLevel || 0), 0);
    if (totalLabLevel <= 0) {
      return { success: false, error: '缺少研究所' };
    }

    const cost = tech.cost[currentLevel];
    const canAfford = this.resourceManager
      ? this.resourceManager.canAffordAI(gameState, aiId, cost)
      : ai.resources.metal >= cost.metal && ai.resources.energy >= cost.energy;

    if (!canAfford) {
      return { success: false, error: '资源不足' };
    }

    if (this.resourceManager) {
      this.resourceManager.deductAIResources(gameState, aiId, { metal: cost.metal, energy: 0 });
    } else {
      ai.resources.metal -= cost.metal;
    }

    const researchSpeedBonus = totalLabLevel * 0.3;
    const researchTimeMs = (cost.time * 1000) / (1 + researchSpeedBonus);
    const startedAt = Date.now();

    ai.researchQueue = {
      techType,
      startTime: startedAt,
      lastUpdatedAt: startedAt,
      endTime: startedAt + researchTimeMs,
      totalTimeMs: researchTimeMs,
      remainingTimeMs: researchTimeMs,
      level: currentLevel + 1,
      energyRemaining: cost.energy,
      totalEnergyCost: cost.energy,
      energyPerMs: cost.energy / Math.max(1, researchTimeMs),
      paused: false,
      pauseReason: null
    };

    this.recordWorldEvent('research_started', {
      aiId,
      techType,
      level: currentLevel + 1,
      timestamp: startedAt,
      energyCost: cost.energy,
      metalCost: cost.metal,
      totalTimeMs: researchTimeMs,
      remainingTimeMs: researchTimeMs,
      energyRemaining: cost.energy,
      totalEnergyCost: cost.energy
    });

    return { success: true };
  }

  update(now = Date.now()) {
    for (const ai of this.gameState.aiStates) {
      if (!ai.researchQueue) continue;

      this.normalizeResearchQueue(ai, now);
      const queue = ai.researchQueue;
      const elapsedMs = Math.max(0, now - (queue.lastUpdatedAt || now));
      if (elapsedMs <= 0) continue;

      const requiredEnergy = Math.min(queue.energyRemaining || 0, (queue.energyPerMs || 0) * elapsedMs);
      const spentEnergy = this.consumeResearchEnergy(ai.id, requiredEnergy);
      const progressRatio = requiredEnergy > 0 ? spentEnergy / requiredEnergy : 1;
      const progressedMs = elapsedMs * progressRatio;

      queue.remainingTimeMs = Math.max(0, (queue.remainingTimeMs || 0) - progressedMs);
      queue.energyRemaining = Math.max(0, (queue.energyRemaining || 0) - spentEnergy);
      queue.lastUpdatedAt = now;
      queue.endTime = now + queue.remainingTimeMs;

      if (progressRatio < 1) {
        if (!queue.paused) {
          queue.paused = true;
          queue.pauseReason = 'energy_shortage';
          this.recordWorldEvent('research_paused', {
            aiId: ai.id,
            techType: queue.techType,
            level: queue.level,
            timestamp: now,
            remainingTimeMs: queue.remainingTimeMs,
            energyRemaining: queue.energyRemaining
          });
        }
        continue;
      }

      if (queue.paused) {
        queue.paused = false;
        queue.pauseReason = null;
        this.recordWorldEvent('research_resumed', {
          aiId: ai.id,
          techType: queue.techType,
          level: queue.level,
          timestamp: now,
          remainingTimeMs: queue.remainingTimeMs,
          energyRemaining: queue.energyRemaining
        });
      }

      if (queue.remainingTimeMs <= 1 || queue.energyRemaining <= 0.001) {
        const completedResearch = {
          aiId: ai.id,
          techType: queue.techType,
          level: queue.level,
          timestamp: now
        };
        ai.tech[queue.techType] = queue.level;
        logger.info(`${ai.name} 完成研究：${TECH_TREE[queue.techType].name} 等级${queue.level}`);
        ai.researchQueue = null;
        this.recordWorldEvent('research_completed', completedResearch);
      }
    }
  }

  getTechBonus(aiId, techType) {
    const ai = this.gameState.aiStates.find(item => item.id === aiId);
    if (!ai) return 0;
    const level = ai.tech[techType] || 0;

    const bonusMap = {
      weaponUpgrade: level * 0.1,
      shieldTech: level * 0.1,
      engineUpgrade: level * 0.2,
      miningEfficiency: level * 0.15,
      energyTech: level * 0.15,
      populationGrowth: level * 0.2,
      logisticsNetwork: level * 0.12,
      siegeEngineering: level * 0.12,
      fortification: level * 0.1,
      sensorNetwork: level * 0.3
    };

    return bonusMap[techType] || 0;
  }

  recordWorldEvent(type, data) {
    if (!this.gameState) return;
    gameEventBus.recordWorldEvent(this.gameState, type, data);
  }

  normalizeResearchQueue(ai, now) {
    const queue = ai.researchQueue;
    if (!queue || queue.remainingTimeMs != null) return;

    const tech = TECH_TREE[queue.techType];
    const levelIndex = Math.max(0, (queue.level || 1) - 1);
    const cost = tech?.cost?.[levelIndex] || { energy: 0, time: 0 };
    const remainingTimeMs = Math.max(0, (queue.endTime || now) - now);
    const totalTimeMs = Math.max(1, (queue.endTime || now) - (queue.startTime || now));

    ai.researchQueue = {
      ...queue,
      lastUpdatedAt: now,
      totalTimeMs,
      remainingTimeMs,
      energyRemaining: queue.energyRemaining ?? cost.energy,
      totalEnergyCost: queue.totalEnergyCost ?? cost.energy,
      energyPerMs: queue.energyPerMs ?? ((cost.energy || 0) / totalTimeMs),
      paused: Boolean(queue.paused),
      pauseReason: queue.pauseReason || null
    };
  }

  consumeResearchEnergy(aiId, amount) {
    if (!amount || amount <= 0) return 0;

    if (this.resourceManager?.spendAIResource) {
      return this.resourceManager.spendAIResource(this.gameState, aiId, 'energy', amount);
    }

    const ai = this.gameState.aiStates.find(item => item.id === aiId);
    if (!ai) return 0;

    const deducted = Math.min(ai.resources.energy || 0, amount);
    ai.resources.energy -= deducted;
    return deducted;
  }
}

export { TechSystem, TECH_TREE };
export default TechSystem;
