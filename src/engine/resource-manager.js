import gameEventBus from '../services/game-event-bus.js';
import { SHIPS as SHIP_CONFIG } from '../../config/game-config.js';

const GLOBAL_PRODUCTION_MULTIPLIER = 0.88;

const RESOURCE_LIMITS = {
  base: 50000,
  perBuildingLevel: 10000
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

class ResourceManager {
  updateResources(gameState, deltaSeconds = 1) {
    if (deltaSeconds <= 0) return;

    const ownedPlanetsByAI = new Map();

    gameState.planets.forEach(planet => {
      this.ensurePlanetState(planet);
      if (!planet.owner) return;

      const production = this.calculateProduction(planet, gameState);

      planet.resources.metal = Math.min(
        planet.resources.metal + production.metal * deltaSeconds,
        this.getResourceLimit(planet, 'mine')
      );
      planet.resources.energy = Math.min(
        planet.resources.energy + production.energy * deltaSeconds,
        this.getResourceLimit(planet, 'powerPlant')
      );
      planet.resources.population = Math.min(
        planet.resources.population + production.population * deltaSeconds,
        this.getResourceLimit(planet, 'population')
      );

      if (!ownedPlanetsByAI.has(planet.owner)) {
        ownedPlanetsByAI.set(planet.owner, []);
      }
      ownedPlanetsByAI.get(planet.owner).push(planet);
    });

    gameState.aiStates.forEach(ai => {
      this.consumeFleetMaintenance(ai.id, ownedPlanetsByAI.get(ai.id) || [], gameState, deltaSeconds);
    });

    this.updateOccupation(gameState, deltaSeconds);
    gameState.fleets = gameState.fleets.filter(fleet => !this.isFleetDestroyed(fleet));
  }

  calculateProduction(planet, gameState) {
    const base = this.getBaseProduction(planet);
    const ai = gameState.aiStates.find(a => a.id === planet.owner);
    const techBonus = ai ? this.getTechBonus(ai.tech) : { metal: 0, energy: 0, population: 0 };
    const occupationMultiplier = this.getOccupationProductionMultiplier(planet);
    const nodeBonuses = this.getPlanetNodeBonuses(planet);

    return {
      metal: base.metal * (1 + planet.buildings.mine * 0.2) * (1 + techBonus.metal + nodeBonuses.metal) * occupationMultiplier * GLOBAL_PRODUCTION_MULTIPLIER,
      energy: base.energy * (1 + planet.buildings.powerPlant * 0.2) * (1 + techBonus.energy + nodeBonuses.energy) * occupationMultiplier * GLOBAL_PRODUCTION_MULTIPLIER,
      population: base.population * (1 + techBonus.population + nodeBonuses.population) * occupationMultiplier * GLOBAL_PRODUCTION_MULTIPLIER
    };
  }

  getBaseProduction(planetOrType) {
    if (planetOrType && typeof planetOrType === 'object' && planetOrType.production) {
      return {
        metal: planetOrType.production.metalPerSecond ?? 0,
        energy: planetOrType.production.energyPerSecond ?? 0,
        population: planetOrType.production.populationPerSecond ?? 0
      };
    }

    const type = typeof planetOrType === 'string' ? planetOrType : planetOrType?.type;
    const rates = {
      home: { metal: 5, energy: 3, population: 0.2 },
      resource: { metal: 3, energy: 2, population: 0.1 },
      normal: { metal: 1, energy: 1, population: 0.05 }
    };
    return rates[type] || rates.normal;
  }

  getTechBonus(tech) {
    return {
      metal: (tech.miningEfficiency || 0) * 0.15,
      energy: (tech.energyTech || 0) * 0.15,
      population: (tech.populationGrowth || 0) * 0.2,
      maintenanceReduction: (tech.logisticsNetwork || 0) * 0.12,
      readinessRecovery: (tech.logisticsNetwork || 0) * 0.08,
      occupationGrowth: (tech.siegeEngineering || 0) * 0.1,
      planetDefense: (tech.fortification || 0) * 0.1,
      garrisonDefense: (tech.fortification || 0) * 0.06,
      sensorRetention: (tech.sensorNetwork || 0) * 0.3,
      deepSpacePenaltyReduction: (tech.logisticsNetwork || 0) * 0.08
    };
  }

  getPlanetNodeBonuses(planet) {
    return {
      metal: planet?.nodeModifiers?.metal || 0,
      energy: planet?.nodeModifiers?.energy || 0,
      population: planet?.nodeModifiers?.population || 0,
      repairRate: planet?.nodeModifiers?.repairRate || 0,
      maintenanceReduction: planet?.nodeModifiers?.maintenanceReduction || 0,
      stabilityGain: planet?.nodeModifiers?.stabilityGain || 0,
      shipyardLevel: planet?.nodeModifiers?.shipyardLevel || 0,
      labLevel: planet?.nodeModifiers?.labLevel || 0,
      sensorRange: planet?.nodeModifiers?.sensorRange || 0,
      intelRetention: planet?.nodeModifiers?.intelRetention || 0,
      frontierValue: planet?.nodeModifiers?.frontierValue || 0,
      relayValue: planet?.nodeModifiers?.relayValue || 0
    };
  }

  getResourceLimit(planet, buildingType) {
    if (buildingType === 'population') {
      return this.getPopulationLimit(planet);
    }
    const level = planet.buildings[buildingType] || 0;
    return RESOURCE_LIMITS.base + level * RESOURCE_LIMITS.perBuildingLevel;
  }

  getPopulationLimit(planet) {
    const totalBuildingLevels = Object.values(planet.buildings || {}).reduce((sum, level) => sum + (level || 0), 0);
    return RESOURCE_LIMITS.base + totalBuildingLevels * RESOURCE_LIMITS.perBuildingLevel;
  }

  consumeFleetMaintenance(aiId, planets, gameState, deltaSeconds) {
    const fleets = gameState.fleets.filter(f => f.owner === aiId);
    const ai = gameState.aiStates.find(item => item.id === aiId);
    const techBonus = this.getTechBonus(ai?.tech || {});

    fleets.forEach(fleet => {
      this.ensureFleetState(fleet);
      const supplyProfile = this.getFleetSupplyProfile(fleet, gameState, aiId, techBonus);
      const maintenanceMultiplier = Math.max(0.55, supplyProfile.maintenanceMultiplier || 1);
      const maintenanceReduction = clamp(1 - (techBonus.maintenanceReduction || 0), 0.45, 1);
      const required = this.getFleetMaintenance(fleet) * maintenanceMultiplier * maintenanceReduction * deltaSeconds;
      const paid = this.spendResourceFromPlanets(planets, 'energy', required);
      const paidRatio = required > 0 ? paid / required : 1;

      this.updateFleetReadiness(gameState, fleet, supplyProfile, paidRatio, deltaSeconds, techBonus, aiId);
      fleet.maintenanceNeed = required;
      fleet.maintenancePaid = paid;
      fleet.maintenanceRatio = clamp(paidRatio, 0, 1);
      this.applyExiledFleetAttrition(gameState, fleet, planets, deltaSeconds, paidRatio);
    });
  }

  getFleetMaintenance(fleet) {
    return Object.entries(fleet.ships || {}).reduce((sum, [shipType, count]) => {
      const maintenance = SHIP_CONFIG[shipType]?.maintenance || 0;
      return sum + maintenance * count;
    }, 0);
  }

  getFleetPopulationUsage(fleet) {
    return Object.entries(fleet.ships || {}).reduce((sum, [shipType, count]) => {
      const capacity = SHIP_CONFIG[shipType]?.capacity || 0;
      return sum + capacity * count;
    }, 0);
  }

  getQueuedPopulationUsage(planet) {
    return (planet.shipBuildQueue || []).reduce((sum, item) => {
      const capacity = SHIP_CONFIG[item.type]?.capacity || 0;
      return sum + capacity * (item.count || 0);
    }, 0);
  }

  canAfford(planet, cost) {
    return planet.resources.metal >= cost.metal && planet.resources.energy >= cost.energy;
  }

  deductResources(planet, cost) {
    planet.resources.metal -= cost.metal;
    planet.resources.energy -= cost.energy;
  }

  getAIResources(gameState, aiId) {
    return gameState.planets
      .filter(planet => planet.owner === aiId)
      .reduce((totals, planet) => {
        totals.metal += planet.resources?.metal || 0;
        totals.energy += planet.resources?.energy || 0;
        totals.population += planet.resources?.population || 0;
        return totals;
      }, { metal: 0, energy: 0, population: 0 });
  }

  getAIUsedPopulation(gameState, aiId) {
    const fleetUsage = gameState.fleets
      .filter(fleet => fleet.owner === aiId)
      .reduce((sum, fleet) => sum + this.getFleetPopulationUsage(fleet), 0);

    const queuedUsage = gameState.planets
      .filter(planet => planet.owner === aiId)
      .reduce((sum, planet) => sum + this.getQueuedPopulationUsage(planet), 0);

    return fleetUsage + queuedUsage;
  }

  getAvailablePopulation(gameState, aiId) {
    const totals = this.getAIResources(gameState, aiId);
    const used = this.getAIUsedPopulation(gameState, aiId);
    return Math.max(0, (totals.population || 0) - used);
  }

  canSupportAdditionalShips(gameState, aiId, ships) {
    const additionalUsage = Object.entries(ships || {}).reduce((sum, [shipType, count]) => {
      const capacity = SHIP_CONFIG[shipType]?.capacity || 0;
      return sum + capacity * count;
    }, 0);

    return this.getAvailablePopulation(gameState, aiId) >= additionalUsage;
  }

  canAffordAI(gameState, aiId, cost) {
    const totals = this.getAIResources(gameState, aiId);
    return totals.metal >= (cost.metal || 0) && totals.energy >= (cost.energy || 0);
  }

  deductAIResources(gameState, aiId, cost) {
    if (!this.canAffordAI(gameState, aiId, cost)) return false;

    const remainingMetal = (cost.metal || 0) - this.spendAIResource(gameState, aiId, 'metal', cost.metal || 0);
    const remainingEnergy = (cost.energy || 0) - this.spendAIResource(gameState, aiId, 'energy', cost.energy || 0);

    return remainingMetal <= 0 && remainingEnergy <= 0;
  }

  spendAIResource(gameState, aiId, resource, amount) {
    if (!amount || amount <= 0) return 0;

    const planets = gameState.planets
      .filter(planet => planet.owner === aiId)
      .sort((left, right) => (right.resources?.[resource] || 0) - (left.resources?.[resource] || 0));

    let remaining = amount;
    let spent = 0;

    planets.forEach(planet => {
      if (remaining <= 0) return;
      const available = planet.resources?.[resource] || 0;
      const deducted = Math.min(available, remaining);
      planet.resources[resource] -= deducted;
      remaining -= deducted;
      spent += deducted;
    });

    return spent;
  }

  ensurePlanetState(planet) {
    if (!planet || typeof planet !== 'object') return;
    planet.buildQueue = Array.isArray(planet.buildQueue) ? planet.buildQueue : [];
    planet.shipBuildQueue = Array.isArray(planet.shipBuildQueue) ? planet.shipBuildQueue : [];
    if (!planet.owner) {
      planet.occupation = null;
      return;
    }
    if (!planet.occupation || typeof planet.occupation !== 'object') {
      return;
    }

    planet.occupation = {
      owner: planet.owner,
      previousOwner: planet.occupation.previousOwner ?? null,
      startedAt: planet.occupation.startedAt ?? Date.now(),
      lastUpdatedAt: planet.occupation.lastUpdatedAt ?? Date.now(),
      stability: clamp(Number(planet.occupation.stability ?? 0), 5, 100),
      garrisonPower: Math.max(0, Number(planet.occupation.garrisonPower ?? 0))
    };
  }

  ensureFleetState(fleet) {
    if (!fleet || typeof fleet !== 'object') return;
    fleet.stance = typeof fleet.stance === 'string' ? fleet.stance : 'balanced';
    fleet.readiness = clamp(Number.isFinite(fleet.readiness) ? fleet.readiness : 1, 0.35, 1.15);
    fleet.supplyStatus = typeof fleet.supplyStatus === 'string' ? fleet.supplyStatus : 'anchored';
    fleet.supplyLabel = typeof fleet.supplyLabel === 'string' ? fleet.supplyLabel : '本土补给';
    fleet.repairState = typeof fleet.repairState === 'string' ? fleet.repairState : 'ready';
    fleet.repairLabel = typeof fleet.repairLabel === 'string' ? fleet.repairLabel : '可投入';
    fleet.repairEtaSeconds = Number.isFinite(fleet.repairEtaSeconds) ? Math.max(0, fleet.repairEtaSeconds) : 0;
    fleet.attritionPulseProgress = Number.isFinite(fleet.attritionPulseProgress) ? Math.max(0, fleet.attritionPulseProgress) : 0;
  }

  applyExiledFleetAttrition(gameState, fleet, ownedPlanets, deltaSeconds, paidRatio) {
    if (!fleet || (ownedPlanets?.length || 0) > 0) {
      if (fleet) fleet.attritionPulseProgress = 0;
      return;
    }

    const severeIsolation = (fleet.readiness || 1) <= 0.46 || (paidRatio || 0) <= 0.05;
    if (!severeIsolation) return;

    fleet.attritionPulseProgress = (fleet.attritionPulseProgress || 0) + deltaSeconds;
    const pulseWindowSeconds = 180;
    const pulses = Math.floor(fleet.attritionPulseProgress / pulseWindowSeconds);
    if (pulses <= 0) return;

    fleet.attritionPulseProgress -= pulses * pulseWindowSeconds;

    for (let index = 0; index < pulses; index += 1) {
      this.applyShipAttrition(fleet, 0.18);
    }

    if (this.isFleetDestroyed(fleet)) {
      gameEventBus.recordWorldEvent(gameState, 'fleet_attrition_destroyed', {
        timestamp: Date.now(),
        fleetId: fleet.id,
        owner: fleet.owner
      });
    }
  }

  applyShipAttrition(fleet, lossRate) {
    Object.keys(fleet.ships || {}).forEach(shipType => {
      const current = fleet.ships[shipType] || 0;
      if (current <= 0) return;
      fleet.ships[shipType] = Math.floor(current * (1 - lossRate));
    });
    this.refreshFleetStats(fleet);
  }

  refreshFleetStats(fleet) {
    fleet.totalPower = Object.entries(fleet.ships || {}).reduce((sum, [shipType, count]) => {
      const attack = SHIP_CONFIG[shipType]?.attack || 0;
      return sum + attack * count;
    }, 0);

    const speeds = Object.entries(fleet.ships || {})
      .filter(([, count]) => count > 0)
      .map(([shipType]) => SHIP_CONFIG[shipType]?.speed || 0)
      .filter(speed => speed > 0);
    fleet.speed = speeds.length > 0 ? Math.min(...speeds) : 0;
  }

  isFleetDestroyed(fleet) {
    return !fleet || Object.values(fleet.ships || {}).every(count => !count || count <= 0);
  }

  getOccupationProductionMultiplier(planet) {
    if (!planet?.occupation) return 1;
    const normalized = clamp((planet.occupation.stability || 0) / 100, 0.05, 1);
    return 0.35 + normalized * 0.65;
  }

  getFleetSupplyProfile(fleet, gameState, aiId, techBonus = {}) {
    const currentPlanet = this.findPlanetForFleet(fleet, gameState);
    const targetPlanet = fleet.targetPlanet ? gameState.planets.find(planet => planet.id === fleet.targetPlanet) : null;
    const route = fleet.routeProfile || {};
    const deepSpaceMultiplier = Math.max(1.08, 1.55 - (techBonus.deepSpacePenaltyReduction || 0));
    const nodeBonuses = this.getPlanetNodeBonuses(currentPlanet);

    if (fleet.status === 'moving') {
      if ((route.speedMultiplier || 1) < 1) {
        return { status: 'deep_space', label: '深空远征', maintenanceMultiplier: deepSpaceMultiplier, readinessDeltaPerSecond: -0.00012 };
      }
      if (targetPlanet?.owner && targetPlanet.owner !== aiId) {
        return { status: 'expedition', label: '进攻远征', maintenanceMultiplier: 1.32, readinessDeltaPerSecond: -0.00008 };
      }
      if ((route.speedMultiplier || 1) > 1.15) {
        return { status: 'lane', label: '主航道补给', maintenanceMultiplier: 0.98, readinessDeltaPerSecond: 0.00003 };
      }
      return { status: 'transit', label: '航道机动', maintenanceMultiplier: 1.08, readinessDeltaPerSecond: -0.00002 };
    }

    if (currentPlanet?.owner === aiId) {
      const localSupport = (nodeBonuses.frontierValue || 0) * 0.03 + (nodeBonuses.relayValue || 0) * 0.04;
      return {
        status: currentPlanet?.specialNodeType === 'supply_nexus' ? 'anchored' : 'anchored',
        label: currentPlanet?.specialNodeType === 'supply_nexus' ? '补给枢纽' : '本土补给',
        maintenanceMultiplier: Math.max(0.62, 0.82 - (nodeBonuses.maintenanceReduction || 0) - localSupport),
        readinessDeltaPerSecond: 0.00012 + (nodeBonuses.repairRate || 0) * 0.5 + (nodeBonuses.relayValue || 0) * 0.00001
      };
    }
    if (currentPlanet && !currentPlanet.owner) {
      return { status: 'outpost', label: '前哨驻留', maintenanceMultiplier: 1.12, readinessDeltaPerSecond: -0.00004 };
    }
    if (currentPlanet?.owner && currentPlanet.owner !== aiId) {
      return { status: 'expedition', label: '敌境滞留', maintenanceMultiplier: 1.3, readinessDeltaPerSecond: -0.00007 };
    }
    return { status: 'deep_space', label: '深空漂泊', maintenanceMultiplier: deepSpaceMultiplier, readinessDeltaPerSecond: -0.00012 };
  }

  updateFleetReadiness(gameState, fleet, supplyProfile, paidRatio, deltaSeconds, techBonus = {}, aiId = null) {
    const previousRepairState = fleet.repairState || 'ready';
    const currentPlanet = this.findPlanetForFleet(fleet, gameState);
    const recoveryMultiplier = 1 + (techBonus.readinessRecovery || 0);
    let delta = (supplyProfile.readinessDeltaPerSecond || 0) * deltaSeconds;
    if (delta > 0) {
      delta *= recoveryMultiplier;
    }

    if (paidRatio < 1) {
      const shortagePenalty = (0.00018 + (fleet.status === 'moving' ? 0.00006 : 0)) * (1 - paidRatio) * deltaSeconds;
      delta -= shortagePenalty;
    }

    const repairProfile = this.getFleetRepairProfile(fleet, currentPlanet, gameState, aiId, techBonus);
    if (repairProfile.readinessDeltaPerSecond !== 0) {
      let repairDelta = repairProfile.readinessDeltaPerSecond * deltaSeconds;
      if (repairDelta > 0) {
        repairDelta *= recoveryMultiplier;
      }
      delta += repairDelta;
    }

    fleet.readiness = clamp((fleet.readiness ?? 1) + delta, 0.35, 1.15);
    fleet.supplyStatus = supplyProfile.status;
    fleet.supplyLabel = supplyProfile.label;
    this.applyRepairState(gameState, fleet, repairProfile, previousRepairState);
  }

  getFleetRepairProfile(fleet, currentPlanet, gameState, aiId, techBonus = {}) {
    const frontlinePressure = currentPlanet
      ? gameState.fleets.some(item => item.owner !== aiId && item.status === 'moving' && item.targetPlanet === currentPlanet.id)
      : false;
    const ownedSafePlanet = currentPlanet?.owner === aiId;
    const nodeBonuses = this.getPlanetNodeBonuses(currentPlanet);
    const shipyardLevel = (currentPlanet?.buildings?.shipyard || 0) + (nodeBonuses.shipyardLevel || 0);
    const homeBonus = currentPlanet?.strategicRole === 'home_core' ? 0.00004 : 0;
    const shipyardBonus = shipyardLevel * 0.00006;
    const frontPenalty = frontlinePressure ? 0.00006 : 0;
    const occupiedPenalty = currentPlanet?.occupation ? 0.00004 : 0;
    const anchoredRepair = ownedSafePlanet && fleet.status === 'idle';
    const baseRepair = anchoredRepair ? 0.00008 + shipyardBonus + homeBonus + (nodeBonuses.repairRate || 0) - frontPenalty - occupiedPenalty : 0;

    if (!anchoredRepair) {
      if (fleet.status === 'moving') {
        return { state: 'deployed', label: '远征中', readinessDeltaPerSecond: 0 };
      }
      if (fleet.readiness < 0.82) {
        return { state: 'degraded', label: '缺少整补条件', readinessDeltaPerSecond: 0 };
      }
      return { state: 'ready', label: '可投入', readinessDeltaPerSecond: 0 };
    }

    if ((fleet.readiness ?? 1) >= 0.985) {
      return { state: 'ready', label: '整补完成', readinessDeltaPerSecond: 0.00001 };
    }

    const adjustedRepair = Math.max(0.00002, baseRepair + (techBonus.readinessRecovery || 0) * 0.00004);
    return {
      state: 'repairing',
      label: shipyardLevel > 0 ? '船坞整补' : '驻地恢复',
      readinessDeltaPerSecond: adjustedRepair
    };
  }

  applyRepairState(gameState, fleet, repairProfile, previousRepairState) {
    const completedThisTick = repairProfile.state === 'repairing' && (fleet.readiness || 0) >= 0.985;
    const nextState = completedThisTick ? 'ready' : repairProfile.state;
    const nextLabel = completedThisTick ? '整补完成' : repairProfile.label;

    fleet.repairState = nextState;
    fleet.repairLabel = nextLabel;
    if (nextState === 'repairing' && repairProfile.readinessDeltaPerSecond > 0) {
      fleet.repairEtaSeconds = Math.ceil(Math.max(0, 0.985 - (fleet.readiness || 1)) / repairProfile.readinessDeltaPerSecond);
    } else {
      fleet.repairEtaSeconds = 0;
    }

    if (!gameState) return;
    if (previousRepairState !== 'repairing' && nextState === 'repairing') {
      gameEventBus.recordWorldEvent(gameState, 'fleet_repair_started', {
        timestamp: Date.now(),
        fleetId: fleet.id,
        owner: fleet.owner,
        repairLabel: fleet.repairLabel,
        readiness: fleet.readiness
      });
    } else if (previousRepairState === 'repairing' && nextState === 'ready') {
      gameEventBus.recordWorldEvent(gameState, 'fleet_repair_completed', {
        timestamp: Date.now(),
        fleetId: fleet.id,
        owner: fleet.owner,
        readiness: fleet.readiness
      });
    }
  }

  spendResourceFromPlanets(planets, resource, amount) {
    if (!amount || amount <= 0) return 0;

    const sortedPlanets = [...(planets || [])]
      .filter(planet => planet?.resources)
      .sort((left, right) => (right.resources?.[resource] || 0) - (left.resources?.[resource] || 0));

    let remaining = amount;
    let spent = 0;

    sortedPlanets.forEach(planet => {
      if (remaining <= 0) return;
      const available = planet.resources?.[resource] || 0;
      const deducted = Math.min(available, remaining);
      planet.resources[resource] -= deducted;
      remaining -= deducted;
      spent += deducted;
    });

    return spent;
  }

  updateOccupation(gameState, deltaSeconds) {
    const now = Date.now();

    gameState.planets.forEach(planet => {
      this.ensurePlanetState(planet);
      if (!planet.owner || !planet.occupation) return;

      const ownerAI = gameState.aiStates.find(ai => ai.id === planet.owner);
      const techBonus = this.getTechBonus(ownerAI?.tech || {});
      const garrisonPower = gameState.fleets
        .filter(fleet => fleet.owner === planet.owner && fleet.status !== 'moving' && this.isFleetAtPlanet(fleet, planet))
        .reduce((sum, fleet) => sum + ((fleet.totalPower || 0) * (fleet.readiness || 1)), 0);

      const progressPerSecond =
        0.014 +
        Math.min(1800, garrisonPower) / 18000 +
        (planet.buildings?.defense || 0) * 0.007 +
        (techBonus.occupationGrowth || 0) * 0.055 +
        (planet.nodeModifiers?.stabilityGain || 0) +
        (techBonus.planetDefense || 0) * 0.028 +
        (techBonus.readinessRecovery || 0) * 0.02 +
        (planet.occupation.previousOwner ? 0 : 0.006) -
        (garrisonPower < 80 ? 0.02 : 0);

      planet.occupation.stability = clamp((planet.occupation.stability || 0) + progressPerSecond * deltaSeconds, 5, 100);
      planet.occupation.garrisonPower = Math.round(garrisonPower);
      planet.occupation.lastUpdatedAt = now;

      if (planet.occupation.stability >= 100) {
        gameEventBus.recordWorldEvent(gameState, 'occupation_secured', {
          timestamp: now,
          planetId: planet.id,
          owner: planet.owner,
          previousOwner: planet.occupation.previousOwner
        });
        planet.occupation = null;
      }
    });
  }

  isFleetAtPlanet(fleet, planet) {
    if (!fleet || !planet) return false;
    if (fleet.currentPlanetId) {
      return fleet.currentPlanetId === planet.id;
    }
    return Math.abs((fleet.position?.x || 0) - (planet.position?.x || 0)) < 1 &&
      Math.abs((fleet.position?.y || 0) - (planet.position?.y || 0)) < 1;
  }

  findPlanetForFleet(fleet, gameState) {
    if (!fleet || !gameState) return null;
    if (fleet.currentPlanetId) {
      return gameState.planets.find(planet => planet.id === fleet.currentPlanetId) || null;
    }
    return gameState.planets.find(planet =>
      Math.abs((planet.position?.x || 0) - (fleet.position?.x || 0)) < 1 &&
      Math.abs((planet.position?.y || 0) - (fleet.position?.y || 0)) < 1
    ) || null;
  }
}

export default ResourceManager;
