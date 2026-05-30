import gameEventBus from '../services/game-event-bus.js';
import { computeTravelProfile } from '../utils/map-topology.js';
import { findLaneState } from '../utils/strategic-map.js';

const SHIPS = {
  scout: { cost: { metal: 100, energy: 50 }, buildTime: 360, attack: 5, defense: 10, speed: 10, capacity: 1 },
  frigate: { cost: { metal: 300, energy: 150 }, buildTime: 1080, attack: 20, defense: 30, speed: 5, capacity: 3 },
  cruiser: { cost: { metal: 800, energy: 400 }, buildTime: 3240, attack: 60, defense: 80, speed: 3, capacity: 8 },
  battleship: { cost: { metal: 2000, energy: 1000 }, buildTime: 8640, attack: 150, defense: 200, speed: 2, capacity: 20 }
};

class FleetManager {
  constructor(resourceManager) {
    this.resourceManager = resourceManager;
    this.intelligenceSystem = null;
  }

  setIntelligenceSystem(intelligenceSystem) {
    this.intelligenceSystem = intelligenceSystem;
  }

  buildShips(planet, shipType, count, gameState) {
    const ship = SHIPS[shipType];
    if (!ship) return { success: false, reason: '无效舰船类型' };
    if (!Number.isInteger(count) || count <= 0) return { success: false, reason: '舰船数量无效' };

    const totalCost = { metal: ship.cost.metal * count, energy: ship.cost.energy * count };
    if (!this.resourceManager.canAfford(planet, totalCost)) {
      return { success: false, reason: '资源不足' };
    }
    if (!this.resourceManager.canSupportAdditionalShips(gameState, planet.owner, { [shipType]: count })) {
      return { success: false, reason: '人口上限不足' };
    }

    this.resourceManager.deductResources(planet, totalCost);

    const shipyardBonus = (planet.buildings.shipyard || 0) + (planet.nodeModifiers?.shipyardLevel || 0);
    const buildTime = ship.buildTime * count / (1 + shipyardBonus * 0.5);

    planet.shipBuildQueue.push({
      type: shipType,
      count: count,
      startTime: Date.now(),
      endTime: Date.now() + buildTime * 1000
    });

    return { success: true };
  }

  processShipQueue(gameState) {
    const now = Date.now();

    gameState.planets.forEach(planet => {
      if (!planet.owner || planet.shipBuildQueue.length === 0) return;

      while (planet.shipBuildQueue.length > 0) {
        const current = planet.shipBuildQueue[0];
        if (now < current.endTime) break;

        let fleet = gameState.fleets.find(f =>
          f.owner === planet.owner &&
          f.position.x === planet.position.x &&
          f.position.y === planet.position.y &&
          f.status === 'idle'
        );

        if (!fleet) {
          fleet = {
            id: `fleet_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            owner: planet.owner,
            position: { ...planet.position },
            currentPlanetId: planet.id,
            destination: null,
            status: 'idle',
            ships: {},
            totalPower: 0,
            speed: 0,
            stance: 'balanced',
            readiness: 1,
            supplyStatus: 'anchored',
            supplyLabel: '本土补给'
          };
          gameState.fleets.push(fleet);
        }

        this.ensureFleetState(fleet);
        fleet.ships[current.type] = (fleet.ships[current.type] || 0) + current.count;
        this.updateFleetStats(fleet);
        planet.shipBuildQueue.shift();
      }
    });
  }

  moveFleet(fleet, targetPlanet, gameState, options = {}) {
    if (fleet.status !== 'idle') return { success: false, reason: '舰队正在移动' };
    if (!targetPlanet) return { success: false, reason: '目标星球不存在' };

    this.ensureFleetState(fleet);

    const originPlanet = this.findPlanetForFleet(fleet, gameState);
    const travelProfile = this.applyLanePressure(
      computeTravelProfile(originPlanet, targetPlanet, gameState.mapMeta),
      originPlanet,
      targetPlanet,
      fleet.owner,
      gameState
    );

    const distance = Math.sqrt(
      Math.pow(targetPlanet.position.x - fleet.position.x, 2) +
      Math.pow(targetPlanet.position.y - fleet.position.y, 2)
    );

    const ai = gameState.aiStates.find(a => a.id === fleet.owner);
    const speedBonus = ai ? (ai.tech.engineUpgrade || 0) * 0.2 : 0;
    const effectiveSpeed = fleet.speed * (1 + speedBonus) * (travelProfile.speedMultiplier || 1);
    if (effectiveSpeed <= 0) return { success: false, reason: '舰队没有可移动舰船' };
    const travelTime = (distance / effectiveSpeed) * 1000;
    const startTime = Date.now();

    fleet.status = 'moving';
    fleet.origin = { ...fleet.position };
    fleet.originPlanetId = originPlanet?.id || fleet.currentPlanetId || null;
    fleet.destination = { ...targetPlanet.position };
    fleet.targetPlanet = targetPlanet.id;
    fleet.targetPlanetName = targetPlanet.name || targetPlanet.id;
    fleet.routeDistance = distance;
    fleet.routeProfile = travelProfile;
    fleet.currentPlanetId = null;
    fleet.moveStartTime = startTime;
    fleet.moveEndTime = startTime + travelTime;
    fleet.etaSeconds = Math.max(1, Math.ceil(travelTime / 1000));
    fleet.stance = this.deriveStanceFromOrder(options.action, fleet.stance);
    fleet.lastOrder = options.action || 'move';

    return { success: true, arrivalTime: fleet.moveEndTime };
  }

  updateFleets(gameState) {
    const now = Date.now();

    this.processShipQueue(gameState);

    gameState.fleets.forEach(fleet => {
      this.ensureFleetState(fleet);
      if (fleet.status === 'moving') {
        const startTime = fleet.moveStartTime || now;
        const endTime = fleet.moveEndTime || now;
        const origin = fleet.origin || fleet.position;
        const destination = fleet.destination || fleet.position;
        const totalDuration = Math.max(1, endTime - startTime);
        const progress = Math.max(0, Math.min(1, (now - startTime) / totalDuration));

        fleet.position = {
          x: origin.x + (destination.x - origin.x) * progress,
          y: origin.y + (destination.y - origin.y) * progress
        };
        fleet.etaSeconds = Math.max(0, Math.ceil((endTime - now) / 1000));

        if (now < endTime) {
          return;
        }

        fleet.position = { ...destination };
        fleet.status = 'arrived';
        const planet = gameState.planets.find(p => p.id === fleet.targetPlanet);
        const arrivalOriginPlanetId = fleet.originPlanetId || null;
        fleet.currentPlanetId = planet?.id || null;
        fleet.destination = null;
        fleet.origin = null;
        fleet.originPlanetId = arrivalOriginPlanetId;
        fleet.routeDistance = null;
        fleet.routeProfile = null;
        fleet.targetPlanetName = null;
        fleet.etaSeconds = 0;

        if (planet) {
          const ai = gameState.aiStates.find(item => item.id === fleet.owner);
          const previousIntel = ai?.intel?.planets?.[planet.id];
          this.intelligenceSystem?.observePlanet(fleet.owner, planet, {
            source: 'fleet_arrival',
            timestamp: now,
            tick: gameState.currentTick
          });
          const intelChanged = !previousIntel || previousIntel.owner !== planet.owner || previousIntel.lastSeenTick !== gameState.currentTick;
          if (intelChanged) {
            const payload = {
              observerId: fleet.owner,
              planetId: planet.id,
              owner: planet.owner,
              timestamp: now,
              source: 'fleet_arrival'
            };
            gameEventBus.recordWorldEvent(gameState, 'planet_scouted', payload);
          }
        }
      }
    });
  }

  updateFleetStats(fleet) {
    this.ensureFleetState(fleet);
    fleet.totalPower =
      (fleet.ships.scout || 0) * SHIPS.scout.attack +
      (fleet.ships.frigate || 0) * SHIPS.frigate.attack +
      (fleet.ships.cruiser || 0) * SHIPS.cruiser.attack +
      (fleet.ships.battleship || 0) * SHIPS.battleship.attack;

    const speeds = [];
    if (fleet.ships.scout) speeds.push(SHIPS.scout.speed);
    if (fleet.ships.frigate) speeds.push(SHIPS.frigate.speed);
    if (fleet.ships.cruiser) speeds.push(SHIPS.cruiser.speed);
    if (fleet.ships.battleship) speeds.push(SHIPS.battleship.speed);
    fleet.speed = speeds.length > 0 ? Math.min(...speeds) : 0;
  }

  ensureFleetState(fleet) {
    if (!fleet || typeof fleet !== 'object') return;
    if (!fleet.ships || typeof fleet.ships !== 'object') {
      fleet.ships = {};
    }
    fleet.stance = typeof fleet.stance === 'string' ? fleet.stance : 'balanced';
    fleet.readiness = Number.isFinite(fleet.readiness) ? Math.max(0.35, Math.min(1.15, fleet.readiness)) : 1;
    fleet.supplyStatus = typeof fleet.supplyStatus === 'string' ? fleet.supplyStatus : 'anchored';
    fleet.supplyLabel = typeof fleet.supplyLabel === 'string' ? fleet.supplyLabel : '本土补给';
  }

  deriveStanceFromOrder(action, fallback = 'balanced') {
    const normalized = typeof action === 'string' ? action.toLowerCase() : '';
    switch (normalized) {
      case 'attack':
        return 'assault';
      case 'defend':
        return 'hold';
      case 'contest':
        return 'intercept';
      case 'redeploy':
        return 'mobile';
      case 'move':
        return fallback || 'balanced';
      default:
        return fallback || 'balanced';
    }
  }

  applyLanePressure(baseProfile, originPlanet, targetPlanet, ownerId, gameState) {
    const travelProfile = { ...(baseProfile || {}) };
    if (!originPlanet || !targetPlanet) {
      return travelProfile;
    }

    const laneState = findLaneState(gameState?.mapMeta, originPlanet.id, targetPlanet.id);
    if (!laneState) {
      return travelProfile;
    }

    let controlMultiplier = 1;
    let controlLabel = '中立航道';

    if (laneState.owner && laneState.owner === ownerId && laneState.status === 'secured') {
      controlMultiplier = 1.08;
      controlLabel = '己方控制航道';
    } else if (laneState.owner && laneState.owner === ownerId && laneState.status === 'pressured') {
      controlMultiplier = 0.96;
      controlLabel = '受压己方航道';
    } else if (laneState.status === 'contested') {
      controlMultiplier = 0.9;
      controlLabel = '争夺航道';
    } else if (laneState.owner && laneState.owner !== ownerId) {
      controlMultiplier = 0.86;
      controlLabel = '敌控航道';
    }

    travelProfile.speedMultiplier = (travelProfile.speedMultiplier || 1) * controlMultiplier;
    travelProfile.controlStatus = laneState.status;
    travelProfile.controlOwner = laneState.owner || null;
    travelProfile.controlMultiplier = controlMultiplier;
    travelProfile.controlLabel = controlLabel;
    travelProfile.heat = laneState.heat || 0;
    return travelProfile;
  }

  findPlanetForFleet(fleet, gameState) {
    if (!fleet || !gameState) return null;
    if (fleet.currentPlanetId) {
      return gameState.planets.find(planet => planet.id === fleet.currentPlanetId) || null;
    }

    return gameState.planets.find(planet =>
      planet.position?.x === fleet.position?.x &&
      planet.position?.y === fleet.position?.y
    ) || null;
  }
}

export default FleetManager;
