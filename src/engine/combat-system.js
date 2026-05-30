import gameEventBus from '../services/game-event-bus.js';

const SHIPS = {
  scout: { attack: 5, defense: 10 },
  frigate: { attack: 20, defense: 30 },
  cruiser: { attack: 60, defense: 80 },
  battleship: { attack: 150, defense: 200 }
};

const STANCE_PROFILES = {
  balanced: { attack: 1, defense: 1 },
  assault: { attack: 1.12, defense: 0.9 },
  hold: { attack: 0.92, defense: 1.15 },
  intercept: { attack: 1.04, defense: 1.06 },
  mobile: { attack: 0.98, defense: 0.98 }
};

class CombatSystem {
  constructor(diplomacySystem = null, intelligenceSystem = null) {
    this.wsService = null;
    this.diplomacySystem = diplomacySystem;
    this.intelligenceSystem = intelligenceSystem;
  }

  setDiplomacySystem(diplomacySystem) {
    this.diplomacySystem = diplomacySystem;
  }

  setIntelligenceSystem(intelligenceSystem) {
    this.intelligenceSystem = intelligenceSystem;
  }

  setWebSocketService(wsService) {
    this.wsService = wsService;
  }

  checkBattles(gameState) {
    gameState.fleets.forEach(fleet => {
      if (fleet.status !== 'arrived') return;
      this.ensureFleetState(fleet);

      const planet = gameState.planets.find(p => p.id === fleet.targetPlanet);
      if (!planet) {
        fleet.status = 'idle';
        return;
      }

      if (planet.owner && planet.owner !== fleet.owner) {
        if (this.diplomacySystem && !this.diplomacySystem.canAttack(fleet.owner, planet.owner)) {
          fleet.status = 'idle';
          fleet.destination = null;
          fleet.targetPlanet = null;
          return;
        }
        this.executeBattle(fleet, planet, gameState);
      } else if (!planet.owner) {
        planet.owner = fleet.owner;
        this.beginOccupation(planet, null, gameState, fleet);
        this.resetFleetTravelState(fleet, planet);
        this.intelligenceSystem?.observePlanet(fleet.owner, planet, {
          source: 'colonized',
          tick: gameState.currentTick
        });
        gameEventBus.recordWorldEvent(gameState, 'planet_captured', {
          timestamp: Date.now(),
          planetId: planet.id,
          fromOwner: null,
          toOwner: fleet.owner,
          occupationStability: planet.occupation?.stability || null
        });
      } else {
        this.resetFleetTravelState(fleet, planet);
      }
    });

    gameState.fleets = gameState.fleets.filter(fleet => !this.isFleetDestroyed(fleet));
  }

  executeBattle(attackerFleet, planet, gameState) {
    const attacker = gameState.aiStates.find(a => a.id === attackerFleet.owner);
    const defenderOwner = planet.owner;
    const defender = gameState.aiStates.find(a => a.id === defenderOwner);
    const retreatPlanet = attackerFleet.originPlanetId
      ? gameState.planets.find(p => p.id === attackerFleet.originPlanetId)
      : this.findPlanetForFleet({ ...attackerFleet, position: attackerFleet.origin || attackerFleet.position, currentPlanetId: null }, gameState);

    const attackPower = this.calculateAttackPower(attackerFleet, attacker, planet);
    const defensePower = this.calculateDefensePower(planet, defender, gameState);

    const ratio = attackPower / Math.max(1, defensePower);
    const result = this.determineResult(ratio);

    this.applyLosses(attackerFleet, result.attackerLoss);
    this.applyPlanetLosses(planet, result.defenderLoss, gameState);
    this.adjustFleetReadiness(attackerFleet, result.attackerLoss + (result.captured ? 0.08 : 0.14));
    this.updateFleetStats(attackerFleet);

    if (result.captured) {
      planet.owner = attackerFleet.owner;
      this.beginOccupation(planet, defenderOwner, gameState, attackerFleet, attacker);
      this.resetFleetTravelState(attackerFleet, planet);
    } else {
      this.resetFleetTravelState(attackerFleet, retreatPlanet, attackerFleet.origin);
    }

    const battleEvent = {
      timestamp: Date.now(),
      attacker: attackerFleet.owner,
      defender: defenderOwner,
      planet: planet.id,
      result: result.type,
      captured: result.captured,
      attackPower,
      defensePower,
      attackerStance: attackerFleet.stance || 'balanced',
      attackerReadiness: attackerFleet.readiness || 1,
      occupationStability: planet.occupation?.stability || null
    };

    gameState.battles = gameState.battles || [];
    gameState.battles.push(battleEvent);
    if (gameState.battles.length > 200) {
      gameState.battles = gameState.battles.slice(-200);
    }
    gameEventBus.recordWorldEvent(gameState, 'battle_resolved', battleEvent);

    if (result.captured) {
      const captureEvent = {
        timestamp: battleEvent.timestamp,
        planetId: planet.id,
        fromOwner: defenderOwner,
        toOwner: attackerFleet.owner,
        occupationStability: planet.occupation?.stability || null
      };
      gameEventBus.recordWorldEvent(gameState, 'planet_captured', captureEvent);
      this.intelligenceSystem?.observePlanet(attackerFleet.owner, planet, {
        source: 'battle_capture',
        tick: gameState.currentTick
      });
    }

    if (defenderOwner) {
      this.intelligenceSystem?.observePlanet(defenderOwner, planet, {
        source: 'battle_report',
        tick: gameState.currentTick
      });
    }

    if (this.wsService) {
      const attackerName = attacker?.name || attackerFleet.owner;
      const defenderName = defender?.name || defenderOwner || '中立势力';
      this.wsService.broadcast('battle', {
        message: `${attackerName} 攻击 ${defenderName} 的 ${planet.name}`,
        result: result.captured ? '夺取成功，进入稳控期' : '防守成功',
        ...battleEvent
      });
    }
  }

  calculateAttackPower(fleet, ai, planet = null) {
    this.ensureFleetState(fleet);
    let power =
      (fleet.ships.scout || 0) * SHIPS.scout.attack +
      (fleet.ships.frigate || 0) * SHIPS.frigate.attack +
      (fleet.ships.cruiser || 0) * SHIPS.cruiser.attack +
      (fleet.ships.battleship || 0) * SHIPS.battleship.attack;

    if (ai && ai.tech.weaponUpgrade) {
      power *= (1 + ai.tech.weaponUpgrade * 0.1);
    }

    const siegeBonus = planet ? 1 + ((ai?.tech?.siegeEngineering || 0) * 0.12) : 1;
    const stanceProfile = this.getStanceProfile(fleet.stance);
    const readiness = this.getFleetReadiness(fleet);
    const supplyModifier = this.getSupplyCombatModifier(fleet, ai);

    power *= siegeBonus * stanceProfile.attack * readiness * supplyModifier;
    return power;
  }

  calculateDefensePower(planet, ai, gameState) {
    const fortificationBonus = 1 + ((ai?.tech?.fortification || 0) * 0.1);
    const occupationDefense = this.getOccupationDefenseModifier(planet);
    let power = planet.defenseValue * (1 + (planet.buildings.defense || 0) * 0.5) * fortificationBonus * occupationDefense;

    const defenderFleets = this.findDefenderFleets(planet, gameState);

    defenderFleets.forEach(fleet => {
      this.ensureFleetState(fleet);
      const stanceProfile = this.getStanceProfile(fleet.stance);
      const readiness = this.getFleetReadiness(fleet);
      const supplyModifier = this.getSupplyCombatModifier(fleet, ai);
      power +=
        (
          (fleet.ships.scout || 0) * SHIPS.scout.defense +
          (fleet.ships.frigate || 0) * SHIPS.frigate.defense +
          (fleet.ships.cruiser || 0) * SHIPS.cruiser.defense +
          (fleet.ships.battleship || 0) * SHIPS.battleship.defense
        ) * stanceProfile.defense * readiness * supplyModifier * (1 + ((ai?.tech?.fortification || 0) * 0.06));
    });

    if (ai && ai.tech.shieldTech) {
      power *= (1 + ai.tech.shieldTech * 0.1);
    }

    return power;
  }

  determineResult(ratio) {
    if (ratio >= 3.0) {
      return { type: 'crushing_victory', attackerLoss: 0.08, defenderLoss: 1.0, captured: true };
    } else if (ratio >= 2.15) {
      return { type: 'victory', attackerLoss: 0.24, defenderLoss: 1.0, captured: true };
    } else if (ratio >= 1.45) {
      return { type: 'stalemate', attackerLoss: 0.36, defenderLoss: 0.78, captured: false };
    } else if (ratio >= 0.95) {
      return { type: 'stalemate', attackerLoss: 0.5, defenderLoss: 0.58, captured: false };
    } else if (ratio >= 0.72) {
      return { type: 'defeat', attackerLoss: 0.72, defenderLoss: 0.34, captured: false };
    } else {
      return { type: 'defeat', attackerLoss: 0.86, defenderLoss: 0.18, captured: false };
    }
  }

  applyLosses(fleet, lossRate) {
    Object.keys(fleet.ships).forEach(type => {
      fleet.ships[type] = Math.floor(fleet.ships[type] * (1 - lossRate));
    });
  }

  applyPlanetLosses(planet, lossRate, gameState) {
    const defenderFleets = this.findDefenderFleets(planet, gameState);

    defenderFleets.forEach(fleet => {
      this.applyLosses(fleet, lossRate);
      this.adjustFleetReadiness(fleet, lossRate * 0.75);
      this.updateFleetStats(fleet);
    });

    planet.defenseValue = Math.floor(planet.defenseValue * (1 - lossRate * 0.5));
  }

  updateFleetStats(fleet) {
    this.ensureFleetState(fleet);
    fleet.totalPower =
      (fleet.ships.scout || 0) * SHIPS.scout.attack +
      (fleet.ships.frigate || 0) * SHIPS.frigate.attack +
      (fleet.ships.cruiser || 0) * SHIPS.cruiser.attack +
      (fleet.ships.battleship || 0) * SHIPS.battleship.attack;
  }

  isFleetDestroyed(fleet) {
    const totalShips =
      (fleet.ships.scout || 0) +
      (fleet.ships.frigate || 0) +
      (fleet.ships.cruiser || 0) +
      (fleet.ships.battleship || 0);
    return totalShips <= 0;
  }

  beginOccupation(planet, previousOwner, gameState, attackerFleet, attacker = null) {
    const siegeLevel = attacker?.tech?.siegeEngineering || 0;
    const logisticsLevel = attacker?.tech?.logisticsNetwork || 0;
    const baseStability = previousOwner ? 18 : 48;
    const readinessBonus = Math.max(0, ((attackerFleet?.readiness || 1) - 1) * 16);

    planet.occupation = {
      owner: planet.owner,
      previousOwner: previousOwner ?? null,
      startedAt: Date.now(),
      lastUpdatedAt: Date.now(),
      stability: Math.max(previousOwner ? 12 : 42, Math.min(72, baseStability + siegeLevel * 3 + logisticsLevel * 2 + readinessBonus)),
      garrisonPower: Math.round((attackerFleet?.totalPower || 0) * (attackerFleet?.readiness || 1))
    };
  }

  resetFleetTravelState(fleet, planet = null, fallbackPosition = null) {
    fleet.status = 'idle';
    fleet.destination = null;
    fleet.targetPlanet = null;
    fleet.moveStartTime = null;
    fleet.moveEndTime = null;
    fleet.origin = null;
    fleet.originPlanetId = null;
    fleet.routeDistance = null;
    fleet.routeProfile = null;
    fleet.targetPlanetName = null;
    fleet.etaSeconds = 0;
    if (planet?.position) {
      fleet.position = { ...planet.position };
      fleet.currentPlanetId = planet.id || null;
      return;
    }
    if (fallbackPosition) {
      fleet.position = { ...fallbackPosition };
    }
    fleet.currentPlanetId = null;
  }

  ensureFleetState(fleet) {
    if (!fleet || typeof fleet !== 'object') return;
    fleet.stance = typeof fleet.stance === 'string' ? fleet.stance : 'balanced';
    fleet.readiness = this.getFleetReadiness(fleet);
    fleet.supplyStatus = typeof fleet.supplyStatus === 'string' ? fleet.supplyStatus : 'anchored';
  }

  getFleetReadiness(fleet) {
    const value = Number.isFinite(fleet?.readiness) ? fleet.readiness : 1;
    return Math.max(0.35, Math.min(1.15, value));
  }

  adjustFleetReadiness(fleet, lossFactor = 0.1) {
    this.ensureFleetState(fleet);
    fleet.readiness = Math.max(0.35, this.getFleetReadiness(fleet) - lossFactor * 0.22);
  }

  getStanceProfile(stance) {
    return STANCE_PROFILES[stance] || STANCE_PROFILES.balanced;
  }

  getSupplyCombatModifier(fleet, ai) {
    const logisticsLevel = ai?.tech?.logisticsNetwork || 0;
    const modifiers = {
      anchored: 1.05,
      lane: 1.02,
      transit: 0.97,
      outpost: 0.95,
      expedition: 0.92 + logisticsLevel * 0.015,
      deep_space: 0.85 + logisticsLevel * 0.02
    };
    return Math.max(0.72, Math.min(1.1, modifiers[fleet?.supplyStatus] || 1));
  }

  getOccupationDefenseModifier(planet) {
    if (!planet?.occupation) return 1;
    const normalized = Math.max(0.05, Math.min(1, (planet.occupation.stability || 0) / 100));
    return 0.45 + normalized * 0.55;
  }

  findDefenderFleets(planet, gameState) {
    return gameState.fleets.filter(f =>
      f.owner === planet.owner &&
      f.status === 'idle' &&
      (
        f.currentPlanetId === planet.id ||
        (
          !f.currentPlanetId &&
          Math.abs((f.position?.x || 0) - (planet.position?.x || 0)) < 1 &&
          Math.abs((f.position?.y || 0) - (planet.position?.y || 0)) < 1
        )
      )
    );
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

export default CombatSystem;
