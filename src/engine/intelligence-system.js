import { SHIPS as SHIP_CONFIG } from '../../config/game-config.js';
import gameEventBus from '../services/game-event-bus.js';

class IntelligenceSystem {
  constructor(gameState) {
    this.gameState = gameState;
  }

  initialize() {
    this.gameState.starMap = this._buildStarMap();
    this.gameState.aiStates.forEach(ai => this._ensureAIIntel(ai));
    this.sync(Date.now());
  }

  sync(timestamp = Date.now()) {
    this.gameState.starMap = this._buildStarMap();
    this._observeOwnedPlanets(timestamp);
    this._observeOwnFleets(timestamp);
    this._shareAllianceVision(timestamp);
    this._applyDeceptionIntel(timestamp);
    this._pruneFleetIntel(timestamp);
    this._markStaleIntel();
    this._syncAggregates();
  }

  observePlanet(aiId, planet, options = {}) {
    const ai = this.gameState.aiStates.find(item => item.id === aiId);
    if (!ai || !planet) return;

    this._ensureAIIntel(ai);

    const record = {
      id: planet.id,
      name: planet.name,
      type: planet.type,
      position: { ...planet.position },
      owner: planet.owner ?? null,
      defenseValue: planet.defenseValue ?? 0,
      specialNodeType: planet.specialNodeType || null,
      specialNodeLabel: planet.specialNodeLabel || null,
      regionTraitName: planet.regionTraitName || null,
      resources: planet.resources ? { ...planet.resources } : null,
      buildings: planet.buildings ? { ...planet.buildings } : null,
      buildQueueLength: planet.buildQueue?.length || 0,
      shipBuildQueueLength: planet.shipBuildQueue?.length || 0,
      discovered: true,
      lastSeenAt: options.timestamp ?? Date.now(),
      lastSeenTick: options.tick ?? this.gameState.currentTick,
      source: options.source || 'direct',
      stale: false
    };

    ai.intel.planets[planet.id] = record;
    ai.intel.lastUpdatedAt = record.lastSeenAt;

    if (!ai.scoutedPlanets.includes(planet.id)) {
      ai.scoutedPlanets.push(planet.id);
    }

    if (planet.owner && planet.owner !== ai.id && !ai.knownAIs.includes(planet.owner)) {
      ai.knownAIs.push(planet.owner);
    }

    if (planet.owner && planet.owner !== ai.id) {
      ai.intel.contacts[planet.owner] = {
        aiId: planet.owner,
        lastSeenAt: record.lastSeenAt,
        lastSeenTick: record.lastSeenTick,
        onPlanetId: planet.id,
        source: record.source
      };
    }
  }

  observeFleet(aiId, fleet, options = {}) {
    const ai = this.gameState.aiStates.find(item => item.id === aiId);
    if (!ai || !fleet) return;

    this._ensureAIIntel(ai);

    ai.intel.fleets[fleet.id] = {
      id: fleet.id,
      owner: fleet.owner,
      position: fleet.position ? { ...fleet.position } : null,
      status: fleet.status || 'unknown',
      targetPlanet: fleet.targetPlanet || null,
      ships: fleet.ships ? { ...fleet.ships } : {},
      totalPower: fleet.totalPower ?? 0,
      lastSeenAt: options.timestamp ?? Date.now(),
      lastSeenTick: options.tick ?? this.gameState.currentTick,
      source: options.source || 'direct',
      stale: false
    };

    if (fleet.owner && fleet.owner !== ai.id && !ai.knownAIs.includes(fleet.owner)) {
      ai.knownAIs.push(fleet.owner);
    }
  }

  _observeOwnedPlanets(timestamp) {
    const lanes = Array.isArray(this.gameState.mapMeta?.lanes) ? this.gameState.mapMeta.lanes : [];
    this.gameState.planets.forEach(planet => {
      if (!planet.owner) return;
      const ownerAI = this.gameState.aiStates.find(item => item.id === planet.owner);
      const sensorLevel = ownerAI?.tech?.sensorNetwork || 0;
      this.observePlanet(planet.owner, planet, {
        source: 'owned',
        timestamp,
        tick: this.gameState.currentTick
      });

      this.gameState.fleets
        .filter(fleet => fleet.position?.x === planet.position.x && fleet.position?.y === planet.position.y)
        .forEach(fleet => {
          this.observeFleet(planet.owner, fleet, {
            source: fleet.owner === planet.owner ? 'owned' : 'planet_sensor',
            timestamp,
            tick: this.gameState.currentTick
          });
        });

      if (sensorLevel <= 0) {
        return;
      }

      const sensorRange = this.getAISensorRange(ownerAI);
      const adjacentLanePlanets = lanes
        .filter(lane => lane.from === planet.id || lane.to === planet.id)
        .map(lane => lane.from === planet.id ? lane.to : lane.from);

      this.gameState.planets
        .filter(otherPlanet => otherPlanet.id !== planet.id)
        .forEach(otherPlanet => {
          const dx = (otherPlanet.position?.x || 0) - (planet.position?.x || 0);
          const dy = (otherPlanet.position?.y || 0) - (planet.position?.y || 0);
          const inRange = Math.sqrt(dx * dx + dy * dy) <= sensorRange || adjacentLanePlanets.includes(otherPlanet.id);
          if (!inRange) return;
          this.observePlanet(planet.owner, otherPlanet, {
            source: 'sensor_sweep',
            timestamp,
            tick: this.gameState.currentTick
          });
        });

      this.gameState.fleets
        .filter(fleet => fleet.owner !== planet.owner && fleet.position)
        .forEach(fleet => {
          const dx = (fleet.position?.x || 0) - (planet.position?.x || 0);
          const dy = (fleet.position?.y || 0) - (planet.position?.y || 0);
          if (Math.sqrt(dx * dx + dy * dy) > sensorRange) return;
          this.observeFleet(planet.owner, fleet, {
            source: 'sensor_sweep',
            timestamp,
            tick: this.gameState.currentTick
          });
        });
    });
  }

  _observeOwnFleets(timestamp) {
    this.gameState.fleets.forEach(fleet => {
      this.observeFleet(fleet.owner, fleet, {
        source: 'owned',
        timestamp,
        tick: this.gameState.currentTick
      });
    });
  }

  _shareAllianceVision(timestamp) {
    this.gameState.aiStates.forEach(ai => {
      this._ensureAIIntel(ai);
      Object.entries(ai.diplomacy || {}).forEach(([otherId, relation]) => {
        const status = typeof relation === 'string' ? relation : relation?.status;
        if (status !== 'ally') return;

        const other = this.gameState.aiStates.find(item => item.id === otherId);
        if (!other?.intel?.planets) return;

        this._ensureAIIntel(other);
        this._mergePlanetIntel(ai, other, timestamp);
        this._mergeFleetIntel(ai, other, timestamp);
      });
    });
  }

  _mergePlanetIntel(targetAI, sourceAI, timestamp) {
    for (const [planetId, record] of Object.entries(sourceAI.intel.planets || {})) {
      const current = targetAI.intel.planets[planetId];
      if (!current || (record.lastSeenAt || 0) > (current.lastSeenAt || 0)) {
        targetAI.intel.planets[planetId] = {
          ...record,
          source: record.source === 'owned' ? 'allied_shared' : record.source
        };
        targetAI.intel.lastUpdatedAt = timestamp;
      }
    }
  }

  _mergeFleetIntel(targetAI, sourceAI, timestamp) {
    for (const [fleetId, record] of Object.entries(sourceAI.intel.fleets || {})) {
      const current = targetAI.intel.fleets[fleetId];
      if (!current || (record.lastSeenAt || 0) > (current.lastSeenAt || 0)) {
        targetAI.intel.fleets[fleetId] = {
          ...record,
          source: record.source === 'owned' ? 'allied_shared' : record.source
        };
        targetAI.intel.lastUpdatedAt = timestamp;
      }
    }
  }

  _ensureAIIntel(ai) {
    ai.scoutedPlanets = Array.isArray(ai.scoutedPlanets) ? ai.scoutedPlanets : [];
    ai.knownAIs = Array.isArray(ai.knownAIs) ? ai.knownAIs : [];
    ai.intel = ai.intel && typeof ai.intel === 'object'
      ? {
          planets: ai.intel.planets && typeof ai.intel.planets === 'object' ? ai.intel.planets : {},
          fleets: ai.intel.fleets && typeof ai.intel.fleets === 'object' ? ai.intel.fleets : {},
          contacts: ai.intel.contacts && typeof ai.intel.contacts === 'object' ? ai.intel.contacts : {},
          lastUpdatedAt: ai.intel.lastUpdatedAt ?? null
        }
      : { planets: {}, fleets: {}, contacts: {}, lastUpdatedAt: null };
  }

  _applyDeceptionIntel(timestamp) {
    this.gameState.aiStates.forEach(operator => {
      const operation = operator?.deception?.operation;
      if (!operation) return;

      if (operation.expiresAt && timestamp >= operation.expiresAt) {
        operator.deception.history = Array.isArray(operator.deception.history) ? operator.deception.history : [];
        operator.deception.history.unshift({
          id: operation.id,
          mode: operation.mode,
          targetAi: operation.targetAi,
          targetPlanetId: operation.targetPlanetId,
          endedAt: timestamp
        });
        operator.deception.history = operator.deception.history.slice(0, 12);
        gameEventBus.recordWorldEvent(this.gameState, 'deception_ended', {
          operatorAi: operator.id,
          targetAi: operation.targetAi,
          targetPlanetId: operation.targetPlanetId,
          mode: operation.mode
        }, {
          aiIds: [operator.id]
        });
        operator.deception.operation = null;
        return;
      }

      const targetAI = this.gameState.aiStates.find(item => item.id === operation.targetAi);
      const targetPlanet = this.gameState.planets.find(planet => planet.id === operation.targetPlanetId);
      const sourcePlanet = this.gameState.planets.find(planet => planet.id === operation.sourcePlanetId)
        || this.gameState.planets.find(planet => planet.owner === operator.id);
      if (!targetAI || !targetPlanet || !sourcePlanet) return;

      this._ensureAIIntel(targetAI);

      const fakeFleetId = operation.id || `phantom_${operator.id}_${targetAI.id}_${targetPlanet.id}`;
      const intensity = Math.max(0.2, Math.min(1.2, Number(operation.intensity) || 0.6));
      const estimatedPower = Math.max(
        20,
        Math.round((operator.totalFleetPower || this._estimateRealFleetPower(operator.id)) * intensity * 0.38)
      );
      const fakePosition = this._interpolateDeceptionPosition(sourcePlanet.position, targetPlanet.position, timestamp, operation);

      targetAI.intel.fleets[fakeFleetId] = {
        id: fakeFleetId,
        owner: operator.id,
        position: fakePosition,
        status: 'moving',
        targetPlanet: targetPlanet.id,
        ships: this._buildPhantomShips(estimatedPower),
        totalPower: estimatedPower,
        lastSeenAt: timestamp,
        lastSeenTick: this.gameState.currentTick,
        source: 'deception',
        stale: false,
        phantom: true,
        deceptionExpiresAt: operation.expiresAt ?? (timestamp + 6 * 60 * 1000)
      };

      if (!targetAI.knownAIs.includes(operator.id)) {
        targetAI.knownAIs.push(operator.id);
      }
    });
  }

  _pruneFleetIntel(timestamp = Date.now()) {
    const currentTick = this.gameState.currentTick || 0;
    const activeFleetIds = new Set(this.gameState.fleets.map(fleet => fleet.id));
    const now = timestamp;

    this.gameState.aiStates.forEach(ai => {
      this._ensureAIIntel(ai);

      Object.entries(ai.intel.fleets).forEach(([fleetId, record]) => {
        const age = currentTick - (record.lastSeenTick || currentTick);
        const removeExpiredPhantom = record.phantom && record.deceptionExpiresAt && record.deceptionExpiresAt <= now;
        const removeOwnedGhost = record.owner === ai.id && !activeFleetIds.has(fleetId);
        const removeExpiredGhost = !record.phantom && !activeFleetIds.has(fleetId) && age > 900;

        if (removeExpiredPhantom || removeOwnedGhost || removeExpiredGhost) {
          delete ai.intel.fleets[fleetId];
        }
      });
    });
  }

  _markStaleIntel() {
    const currentTick = this.gameState.currentTick || 0;
    this.gameState.aiStates.forEach(ai => {
      this._ensureAIIntel(ai);
      const sensorLevel = ai?.tech?.sensorNetwork || 0;
      const retentionBonus = this.gameState.planets
        .filter(planet => planet.owner === ai?.id)
        .reduce((sum, planet) => sum + (planet.nodeModifiers?.intelRetention || 0), 0);
      const planetThreshold = 300 + sensorLevel * 120 + Math.round(retentionBonus * 220);
      const fleetThreshold = 120 + sensorLevel * 60 + Math.round(retentionBonus * 110);

      Object.values(ai.intel.planets).forEach(record => {
        const age = currentTick - (record.lastSeenTick || currentTick);
        record.stale = age > planetThreshold;
      });

      Object.values(ai.intel.fleets).forEach(record => {
        const age = currentTick - (record.lastSeenTick || currentTick);
        record.stale = age > fleetThreshold;
      });
    });
  }

  getAISensorRange(ai) {
    const sensorLevel = ai?.tech?.sensorNetwork || 0;
    const ownedSensorBonus = this.gameState.planets
      .filter(planet => planet.owner === ai?.id)
      .reduce((sum, planet) => sum + (planet.nodeModifiers?.sensorRange || 0), 0);
    return 110 + sensorLevel * 55 + ownedSensorBonus;
  }

  _estimateRealFleetPower(aiId) {
    return this.gameState.fleets
      .filter(fleet => fleet.owner === aiId)
      .reduce((sum, fleet) => sum + (fleet.totalPower || 0), 0);
  }

  _buildPhantomShips(totalPower) {
    const cruiser = Math.max(0, Math.floor(totalPower / 60));
    const remainder = Math.max(0, totalPower - cruiser * 60);
    const frigate = Math.max(0, Math.floor(remainder / 20));
    const scout = Math.max(1, Math.ceil(Math.max(0, remainder - frigate * 20) / 5));
    return { scout, frigate, cruiser, battleship: 0 };
  }

  _interpolateDeceptionPosition(from, to, timestamp, operation) {
    const startedAt = operation.startedAt || timestamp;
    const expiresAt = operation.expiresAt || (startedAt + 6 * 60 * 1000);
    const total = Math.max(1, expiresAt - startedAt);
    const progress = Math.max(0.18, Math.min(0.92, (timestamp - startedAt) / total));
    return {
      x: (from?.x || 0) + ((to?.x || 0) - (from?.x || 0)) * progress,
      y: (from?.y || 0) + ((to?.y || 0) - (from?.y || 0)) * progress
    };
  }

  _syncAggregates() {
    this.gameState.aiStates.forEach(ai => {
      ai.planets = this.gameState.planets.filter(planet => planet.owner === ai.id);
      ai.fleets = this.gameState.fleets.filter(fleet => fleet.owner === ai.id);
      ai.resources = ai.planets.reduce((totals, planet) => {
        totals.metal += planet.resources?.metal || 0;
        totals.energy += planet.resources?.energy || 0;
        totals.population += planet.resources?.population || 0;
        return totals;
      }, { metal: 0, energy: 0, population: 0 });
      const usedPopulation = ai.fleets.reduce((sum, fleet) => {
        return sum + Object.entries(fleet.ships || {}).reduce((fleetSum, [shipType, count]) => {
          return fleetSum + (SHIP_CONFIG[shipType]?.capacity || 0) * count;
        }, 0);
      }, 0) + ai.planets.reduce((sum, planet) => {
        return sum + (planet.shipBuildQueue || []).reduce((queueSum, item) => {
          return queueSum + (SHIP_CONFIG[item.type]?.capacity || 0) * (item.count || 0);
        }, 0);
      }, 0);
      ai.totalFleetPower = ai.fleets.reduce((sum, fleet) => sum + (fleet.totalPower || 0), 0);
      ai.usedPopulation = usedPopulation;
      ai.availablePopulation = Math.max(0, ai.resources.population - usedPopulation);
    });
  }

  _buildStarMap() {
    return this.gameState.planets.map(planet => ({
      id: planet.id,
      name: planet.name,
      type: planet.type,
      position: { ...planet.position },
      regionId: planet.regionId || null,
      regionName: planet.regionName || null,
      strategicRole: planet.strategicRole || null
    }));
  }
}

export default IntelligenceSystem;
