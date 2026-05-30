import { GAME_CONFIG } from '../../config/game-config.js';
import gameEventBus from '../services/game-event-bus.js';
import { AI_PERSONALITIES, BUILDINGS, SHIPS, TECH_TREE } from '../utils/constants.js';
import logger from '../utils/logger.js';
import { computeTravelProfile } from '../utils/map-topology.js';
import AIWorker from './ai-worker.js';

const STRATEGIC_DEFENSE_ROLES = new Set([
  'home_core',
  'central_hub',
  'approach_gate',
  'core_relay',
  'border_bastion'
]);

const STRATEGIC_ROLE_WEIGHTS = {
  home_core: 155,
  central_hub: 138,
  approach_gate: 112,
  core_relay: 98,
  border_bastion: 86,
  inner_resource: 68,
  frontier_resource: 58,
  outer_relay: 44
};

const TACTICAL_ACTIONS = new Set(['attack', 'move', 'defend', 'redeploy', 'contest']);

class AIScheduler {
  constructor(gameId) {
    this.gameId = gameId;
    this.workers = new Map();
    this.timers = { strategy: null, tactical: null, compression: null };
    this.wsService = null;
    this.gameEngine = null;
    this.unsubscribeWorldEvents = null;
    this.unsubscribeWsWorldEvents = null;
    this.processedWorldEventIds = new Set();
  }

  setWebSocketService(wsService) {
    this.wsService = wsService;
    for (const worker of this.workers.values()) {
      worker.setWebSocketService(wsService);
    }
    if (this.unsubscribeWsWorldEvents) {
      this.unsubscribeWsWorldEvents();
      this.unsubscribeWsWorldEvents = null;
    }
    if (wsService?.on) {
      this.unsubscribeWsWorldEvents = wsService.on('world_event', (event) => {
        this.handleWorldEvent(event);
      });
    }
  }

  async initialize() {
    for (const personality of AI_PERSONALITIES) {
      const worker = new AIWorker(personality.id, this.gameId);
      await worker.initialize();
      if (this.wsService) {
        worker.setWebSocketService(this.wsService);
      }
      this.workers.set(personality.id, worker);
    }
    logger.info('AI调度器已初始化，共7个AI Worker');
  }

  start(gameEngine) {
    this.gameEngine = gameEngine;
    if (gameEngine.getState().status !== 'running') {
      logger.info('AI调度器未启动，游戏不在运行状态', { status: gameEngine.getState().status });
      return;
    }
    if (!this.unsubscribeWorldEvents) {
      this.unsubscribeWorldEvents = gameEventBus.onWorldEvent((event) => {
        void this.handleWorldEvent(event);
      });
    }

    void this.runOpeningCycle(gameEngine);

    this.timers.strategy = setInterval(() => {
      void this.runStrategyDecisions(gameEngine);
    }, Math.max(1000, GAME_CONFIG.STRATEGY_INTERVAL || 15 * 60 * 1000));

    this.timers.tactical = setInterval(() => {
      void this.runTacticalDecisions(gameEngine);
    }, Math.max(1000, GAME_CONFIG.TACTICAL_INTERVAL || 5 * 60 * 1000));

    this.timers.compression = setInterval(() => {
      void this.compressMemories();
    }, 60 * 60 * 1000);

    logger.info('AI调度器已启动');
  }

  async runOpeningCycle(gameEngine) {
    await this.runStrategyDecisions(gameEngine);
    await this.runTacticalDecisions(gameEngine);
  }

  async runStrategyDecisions(gameEngine) {
    if (gameEngine.getState().status !== 'running') return;
    const gameState = this.enrichGameState(gameEngine.getState());

    const decisions = await Promise.all(
      [...this.workers.entries()].map(async ([aiId, worker]) => ([aiId, await worker.makeStrategyDecision(gameState)]))
    );

    for (const [aiId, decision] of decisions) {
      if (decision) {
        await this.executeStrategyDecision(aiId, decision, gameEngine);
      }
    }
  }

  async runTacticalDecisions(gameEngine) {
    if (gameEngine.getState().status !== 'running') return;
    const gameState = this.enrichGameState(gameEngine.getState());

    const decisions = await Promise.all(
      [...this.workers.entries()].map(async ([aiId, worker]) => ([aiId, await worker.makeTacticalDecision(gameState)]))
    );

    for (const [aiId, decision] of decisions) {
      if (decision) {
        await this.executeTacticalDecision(aiId, decision, gameEngine);
      }
    }
  }

  async handleEvent(aiId, event, gameEngine) {
    const worker = this.workers.get(aiId);
    if (!worker) return;

    const gameState = this.enrichGameState(gameEngine.getState());
    const decision = await worker.respondToEvent(event, gameState);
    if (decision) {
      await this.executeTacticalDecision(aiId, decision, gameEngine);
    }
  }

  async handleWorldEvent(event) {
    if (!event) return;
    if (event.id && this.processedWorldEventIds.has(event.id)) return;
    if (event.id) {
      this.processedWorldEventIds.add(event.id);
      if (this.processedWorldEventIds.size > 2000) {
        const iterator = this.processedWorldEventIds.values();
        this.processedWorldEventIds.delete(iterator.next().value);
      }
    }

    const affectedAIIds = this.getAffectedAIIds(event);
    if (affectedAIIds.length === 0) return;

    for (const aiId of affectedAIIds) {
      const worker = this.workers.get(aiId);
      if (!worker) continue;
      await worker.recordWorldEvent(event);
    }

    if (!this.gameEngine || !this.isImmediateResponseEvent(event.type)) {
      return;
    }

    const responseAIIds = this.getImmediateResponseAIIds(event, affectedAIIds);
    if (responseAIIds.length > 0) {
      await Promise.all(
        responseAIIds.map(async (aiId) => {
          await this.handleEvent(aiId, event, this.gameEngine);
        })
      );
    }
  }

  async executeStrategyDecision(aiId, decision, gameEngine) {
    const rawState = this.resolveRuntimeState(gameEngine);
    const gameState = rawState ? this.enrichGameState(rawState) : null;
    if (!gameState) {
      return;
    }
    const biasedDecision = this.applyStrategicBias(aiId, decision, gameState, gameEngine);

    if (biasedDecision.deception) {
      this.executeDeceptionDecision(aiId, biasedDecision.deception, gameEngine);
    }

    if (biasedDecision.diplomatic?.ally_with) {
      for (const targetId of this.normalizeIdList(biasedDecision.diplomatic.ally_with)) {
        const duration = 2 * 60 * 60 * 1000;
        gameEngine.diplomacySystem.proposeAlliance(aiId, targetId, duration);
      }
    }

    if (biasedDecision.diplomatic?.surprise_strike) {
      for (const targetId of this.normalizeIdList(biasedDecision.diplomatic.surprise_strike)) {
        gameEngine.diplomacySystem.launchSurpriseAttack(aiId, targetId, 'ai_surprise_strike');
      }
    }

    if (biasedDecision.diplomatic?.declare_war) {
      for (const targetId of this.normalizeIdList(biasedDecision.diplomatic.declare_war)) {
        gameEngine.diplomacySystem.declareWar(aiId, targetId);
      }
    }

    if (biasedDecision.diplomatic?.offer_peace) {
      for (const targetId of this.normalizeIdList(biasedDecision.diplomatic.offer_peace)) {
        gameEngine.diplomacySystem.proposePeace(aiId, targetId);
      }
    }

    if (biasedDecision.diplomatic?.offer_trade) {
      for (const tradeOffer of this.normalizeTradeOffers(biasedDecision.diplomatic.offer_trade)) {
        gameEngine.diplomacySystem.proposeTrade(aiId, tradeOffer.target, tradeOffer.offer, tradeOffer.request);
      }
    }
  }

  async executeTacticalDecision(aiId, decision, gameEngine) {
    const gameState = gameEngine.getState();
    const biasedDecision = this.applyTacticalBias(aiId, decision, gameEngine);
    const biasAdjustments = this.describeBiasAdjustments(decision, biasedDecision, gameState);

    if (biasAdjustments.length > 0 && this.wsService) {
      this.wsService.broadcast('ai_decision', {
        aiId,
        type: 'tactical',
        actions: biasAdjustments.join('，'),
        reasoning: '调度器根据地图拓扑补充了关键节点防守、航道争夺或中央环抢占动作',
        timestamp: Date.now(),
        source: 'scheduler_bias'
      });
    }

    if (biasedDecision.resource_allocation) {
      for (const [planetId, actions] of Object.entries(biasedDecision.resource_allocation)) {
        const planet = gameState.planets.find(p => p.id === planetId);
        if (!planet || planet.owner !== aiId) continue;

        if (actions.build && gameEngine.buildingSystem) {
          gameEngine.buildingSystem.startBuild(planet, actions.build, gameState);
        }
        if (actions.ships && gameEngine.fleetManager) {
          for (const [shipType, count] of Object.entries(actions.ships)) {
            gameEngine.fleetManager.buildShips(planet, shipType, count, gameState);
          }
        }
      }
    }

    if (biasedDecision.fleet_orders && gameEngine.fleetManager) {
      for (const order of this.normalizeFleetOrders(biasedDecision.fleet_orders)) {
        const fleetId = order.fleet_id || order.fleetId || order.id;
        const fleet = gameState.fleets.find(f => f.id === fleetId && f.owner === aiId);
        const action = typeof order.action === 'string' ? order.action.toLowerCase() : 'attack';
        if (!fleet || !TACTICAL_ACTIONS.has(action)) continue;

        const targetPlanetId = order.target || order.targetPlanet || order.target_planet;
        const targetPlanet = gameState.planets.find(p => p.id === targetPlanetId);
        if (targetPlanet) {
          if (targetPlanet.owner && targetPlanet.owner !== aiId && gameEngine.diplomacySystem && !gameEngine.diplomacySystem.canAttack(aiId, targetPlanet.owner)) {
            continue;
          }
          gameEngine.fleetManager.moveFleet(fleet, targetPlanet, gameState, { action });
        }
      }
    }

    if (biasedDecision.tech_research && gameEngine.techSystem) {
      const result = gameEngine.techSystem.startResearch(aiId, biasedDecision.tech_research, gameState);
      if (!result?.success) {
        logger.info(`${aiId} 科研未启动`, {
          techType: biasedDecision.tech_research,
          reason: result?.error || 'unknown'
        });
      }
    }

    if (biasedDecision.diplomatic_response && gameEngine.diplomacySystem) {
      const response = biasedDecision.diplomatic_response;
      if (response.action === 'accept_proposal' && response.proposal_id) {
        gameEngine.diplomacySystem.acceptProposal(response.proposal_id, aiId);
      }
      if (response.action === 'reject_proposal' && response.proposal_id) {
        gameEngine.diplomacySystem.rejectProposal(response.proposal_id, aiId, response.reason || 'rejected_by_ai');
      }
    }
  }

  async answerQuestion(aiId, question) {
    const worker = this.workers.get(aiId);
    if (!worker || !this.gameEngine) {
      throw new Error('AI系统未就绪');
    }

    const gameState = this.enrichGameState(this.gameEngine.getState());
    return worker.answerQuestion(question, gameState);
  }

  async compressMemories() {
    for (const worker of this.workers.values()) {
      await worker.compressMemory();
    }
    logger.info('AI记忆压缩完成');
  }

  stop() {
    Object.values(this.timers).forEach(timer => timer && clearInterval(timer));
    if (this.unsubscribeWorldEvents) {
      this.unsubscribeWorldEvents();
      this.unsubscribeWorldEvents = null;
    }
    if (this.unsubscribeWsWorldEvents) {
      this.unsubscribeWsWorldEvents();
      this.unsubscribeWsWorldEvents = null;
    }
    logger.info('AI调度器已停止');
  }

  enrichGameState(gameState) {
    const aiStates = gameState.aiStates.map(ai => {
      const planets = gameState.planets.filter(p => p.owner === ai.id);
      const fleets = gameState.fleets.filter(f => f.owner === ai.id);
      const resources = planets.reduce((totals, planet) => {
        totals.metal += planet.resources?.metal || 0;
        totals.energy += planet.resources?.energy || 0;
        totals.population += planet.resources?.population || 0;
        return totals;
      }, { metal: 0, energy: 0, population: 0 });

      const totalFleetPower = fleets.reduce((sum, fleet) => {
        const ships = fleet.ships || {};
        return sum + (ships.scout || 0) * 5 + (ships.frigate || 0) * 20 + (ships.cruiser || 0) * 60 + (ships.battleship || 0) * 150;
      }, 0);
      const usedPopulation = fleets.reduce((sum, fleet) => {
        const ships = fleet.ships || {};
        return sum +
          (ships.scout || 0) * 1 +
          (ships.frigate || 0) * 3 +
          (ships.cruiser || 0) * 8 +
          (ships.battleship || 0) * 20;
      }, 0) + planets.reduce((sum, planet) => {
        return sum + (planet.shipBuildQueue || []).reduce((queueSum, item) => {
          const capacities = { scout: 1, frigate: 3, cruiser: 8, battleship: 20 };
          return queueSum + (capacities[item.type] || 0) * (item.count || 0);
        }, 0);
      }, 0);
      const pendingProposals = (gameState.diplomacyProposals || []).filter(proposal =>
        proposal.status === 'pending' && (proposal.fromAi === ai.id || proposal.toAi === ai.id)
      );

      return {
        ...ai,
        planets,
        fleets,
        resources,
        totalFleetPower,
        usedPopulation,
        availablePopulation: Math.max(0, resources.population - usedPopulation),
        pendingProposals
      };
    });

    return {
      ...gameState,
      aiStates,
      diplomacyProposals: gameState.diplomacyProposals || []
    };
  }

  applyTacticalBias(aiId, decision, gameEngine) {
    const rawState = this.resolveRuntimeState(gameEngine);
    if (!rawState) {
      return decision || {};
    }

    const gameState = this.enrichGameState(rawState);
    const ai = gameState.aiStates.find(item => item.id === aiId);
    if (!ai) {
      return decision || {};
    }
    const knownPlanetIntel = this.getKnownPlanetIntel(ai, gameState);
    const knownFleetIntel = this.getKnownFleetIntel(ai);

    const biasedDecision = JSON.parse(JSON.stringify(decision || {}));
    biasedDecision.resource_allocation = biasedDecision.resource_allocation && typeof biasedDecision.resource_allocation === 'object'
      ? biasedDecision.resource_allocation
      : {};
    biasedDecision.fleet_orders = this.normalizeFleetOrders(biasedDecision.fleet_orders);
    biasedDecision.diplomatic_response = biasedDecision.diplomatic_response || null;

    const assignedFleetIds = new Set(
      biasedDecision.fleet_orders
        .map(order => order.fleet_id || order.fleetId || order.id)
        .filter(Boolean)
    );
    const targetedPlanets = new Set(
      biasedDecision.fleet_orders
        .map(order => order.target || order.targetPlanet || order.target_planet)
        .filter(Boolean)
    );

    const threatenedNodes = this.getThreatenedStrategicNodes(aiId, gameState, gameEngine, ai, knownPlanetIntel, knownFleetIntel);
    const strategicTargets = this.getStrategicAttackTargets(aiId, gameState, gameEngine, ai, knownPlanetIntel, knownFleetIntel);
    const unstableOccupationNodes = this.getUnstableOccupiedPlanets(aiId, gameState);
    const recoveryOrders = this.getFleetRecoveryOrders(aiId, gameState, assignedFleetIds);

    for (const recovery of recoveryOrders) {
      biasedDecision.fleet_orders.push({
        fleet_id: recovery.fleet.id,
        action: 'redeploy',
        target: recovery.targetPlanet.id,
        bias: 'fleet_recovery'
      });
      assignedFleetIds.add(recovery.fleet.id);
      targetedPlanets.add(recovery.targetPlanet.id);
    }

    for (const node of unstableOccupationNodes.slice(0, 2)) {
      const hasLocalOrder = biasedDecision.fleet_orders.some(order =>
        (order.target || order.targetPlanet || order.target_planet) === node.planet.id &&
        ['defend', 'redeploy', 'move'].includes((order.action || '').toLowerCase())
      );

      if (node.requiresDefenseBuild) {
        this.setBiasBuild(biasedDecision, node.planet.id, 'defense');
      }

      if (node.requiresFleetResponse && !hasLocalOrder) {
        const fleet = this.pickBestFleetForTarget(
          this.getIdleFleets(aiId, gameState, assignedFleetIds),
          node.planet,
          gameState
        );

        if (fleet) {
          biasedDecision.fleet_orders.push({
            fleet_id: fleet.id,
            action: 'defend',
            target: node.planet.id,
            bias: 'stabilize_occupation'
          });
          assignedFleetIds.add(fleet.id);
          targetedPlanets.add(node.planet.id);
        }
      }
    }

    for (const node of threatenedNodes.slice(0, 2)) {
      const hasLocalOrder = biasedDecision.fleet_orders.some(order =>
        (order.target || order.targetPlanet || order.target_planet) === node.planet.id &&
        ['defend', 'redeploy', 'move'].includes((order.action || '').toLowerCase())
      );

      if (node.requiresDefenseBuild) {
        this.setBiasBuild(biasedDecision, node.planet.id, 'defense');
      }

      if (node.requiresFleetResponse && !hasLocalOrder) {
        const fleet = this.pickBestFleetForTarget(
          this.getIdleFleets(aiId, gameState, assignedFleetIds),
          node.planet,
          gameState
        );

        if (fleet) {
          biasedDecision.fleet_orders.push({
            fleet_id: fleet.id,
            action: 'defend',
            target: node.planet.id,
            bias: 'defend_strategic_node'
          });
          assignedFleetIds.add(fleet.id);
          targetedPlanets.add(node.planet.id);
        }
      }
    }

    const productionPlanet = this.getBestProductionPlanet(aiId, gameState);
    const empireResources = this.getEmpireResourceTotals(aiId, gameState);
    const researchBias = this.getResearchBias(ai, gameState, threatenedNodes, strategicTargets, empireResources, unstableOccupationNodes);

    if (researchBias.labPlanetId) {
      this.setBiasBuild(biasedDecision, researchBias.labPlanetId, 'lab', { force: researchBias.forceLab });
    }

    if (productionPlanet) {
      const shipPlan = {};
      let populationBuffer = Math.max(0, Math.floor(ai.availablePopulation ?? 0));
      const highThreat = threatenedNodes.some(node => node.severity === 'critical' || node.severity === 'high');
      const wantsLaneForce = strategicTargets.some(target => target.isChokepoint || target.isCentral);

      if (wantsLaneForce && populationBuffer >= 3 && empireResources.metal >= 300 && empireResources.energy >= 150) {
        shipPlan.frigate = (shipPlan.frigate || 0) + 1;
        populationBuffer -= 3;
      }

      if (unstableOccupationNodes.length > 0 && populationBuffer >= 3 && empireResources.metal >= 300 && empireResources.energy >= 150) {
        shipPlan.frigate = (shipPlan.frigate || 0) + 1;
        populationBuffer -= 3;
      }

      if ((strategicTargets.some(target => target.isCentral) || highThreat) && populationBuffer >= 1 && empireResources.metal >= 100 && empireResources.energy >= 50) {
        shipPlan.scout = (shipPlan.scout || 0) + 1;
      }

      if (Object.keys(shipPlan).length > 0) {
        this.mergeBiasResourceAllocation(biasedDecision, productionPlanet.id, { ships: shipPlan });
      }
    }

    if (!biasedDecision.tech_research && researchBias.techType) {
      biasedDecision.tech_research = researchBias.techType;
    }

    if (!biasedDecision.diplomatic_response) {
      biasedDecision.diplomatic_response = this.getProposalResponseBias(ai, gameState);
    }

    const maxOffensiveOrders = Math.min(3, this.getIdleFleets(aiId, gameState, assignedFleetIds).length);
    let offensiveOrders = 0;
    for (const target of strategicTargets) {
      if (offensiveOrders >= maxOffensiveOrders) {
        break;
      }
      if (targetedPlanets.has(target.planet.id)) {
        continue;
      }

      const availableFleets = this.getIdleFleets(aiId, gameState, assignedFleetIds);
      const fleet = this.pickBestFleetForTarget(availableFleets, target.planet, gameState);
      if (!fleet) {
        continue;
      }

      if (target.minAssaultPower > 0 && this.getFleetPower(fleet) < target.minAssaultPower) {
        continue;
      }

      biasedDecision.fleet_orders.push({
        fleet_id: fleet.id,
        action: target.actionBias,
        target: target.planet.id,
        bias: target.biasReason
      });
      assignedFleetIds.add(fleet.id);
      targetedPlanets.add(target.planet.id);
      offensiveOrders += 1;
    }

    return biasedDecision;
  }

  resolveRuntimeState(gameEngine) {
    return gameEngine?.getState?.() ||
      gameEngine?.state ||
      gameEngine?.gameState ||
      gameEngine?.diplomacySystem?.gameState ||
      gameEngine?.techSystem?.gameState ||
      this.gameEngine?.getState?.() ||
      null;
  }

  applyStrategicBias(aiId, decision, gameState, gameEngine) {
    const ai = gameState.aiStates.find(item => item.id === aiId);
    if (!ai) {
      return decision || {};
    }

    const biasedDecision = JSON.parse(JSON.stringify(decision || {}));
    biasedDecision.diplomatic = biasedDecision.diplomatic && typeof biasedDecision.diplomatic === 'object'
      ? biasedDecision.diplomatic
      : {};

    const ensureTarget = (field, targetId) => {
      if (!targetId) return;
      const current = new Set(this.normalizeIdList(biasedDecision.diplomatic[field]));
      current.add(targetId);
      biasedDecision.diplomatic[field] = [...current];
    };

    const knownPlanetIntel = this.getKnownPlanetIntel(ai, gameState);
    const knownFleetIntel = this.getKnownFleetIntel(ai);
    const neighbors = this.getVisibleDiplomaticContacts(ai, gameState, knownPlanetIntel, knownFleetIntel)
      .sort((left, right) => right.pressure - left.pressure);

    const activeWars = neighbors.filter(item => item.relation.status === 'war');
    const strongestNeutralThreat = neighbors.find(item =>
      ['neutral', 'trade'].includes(item.relation.status) &&
      (item.relation.borderTension || 0) >= 58 &&
      item.pressure >= 1
    );
    const allianceCandidate = neighbors.find(item =>
      item.relation.status === 'neutral' &&
      (item.relation.trust || 0) >= 58 &&
      (item.relation.commonEnemyCount || 0) > 0 &&
      (item.relation.borderTension || 0) <= 42
    );
    const tradeCandidate = neighbors.find(item =>
      item.relation.status === 'neutral' &&
      (item.relation.trust || 0) >= 50 &&
      (item.relation.fear || 0) <= 58 &&
      (item.relation.borderTension || 0) <= 46
    );

    if (this.normalizeIdList(biasedDecision.diplomatic.offer_peace).length === 0 && activeWars.length > 0) {
      const overwhelmingWar = activeWars.find(item =>
        (ai.totalFleetPower || 0) < (item.knownPower || 0) * 0.7 &&
        (ai.planets?.length || 0) <= Math.max(1, item.knownPlanetCount || 0)
      );
      if (overwhelmingWar) {
        ensureTarget('offer_peace', overwhelmingWar.ai.id);
      }
    }

    if (this.normalizeIdList(biasedDecision.diplomatic.declare_war).length === 0 && strongestNeutralThreat) {
      const ownPower = ai.totalFleetPower || 0;
      const rivalPower = strongestNeutralThreat.knownPower || 0;
      const crisis = strongestNeutralThreat.relation.crisisLevel;
      const highCrisis = crisis === 'crisis' || crisis === 'fracture';
      if (ownPower >= Math.max(60, rivalPower * 0.85) && highCrisis) {
        ensureTarget('declare_war', strongestNeutralThreat.ai.id);
      }
    }

    if (this.normalizeIdList(biasedDecision.diplomatic.ally_with).length === 0 && allianceCandidate) {
      ensureTarget('ally_with', allianceCandidate.ai.id);
    }

    if (this.normalizeTradeOffers(biasedDecision.diplomatic.offer_trade).length === 0 && tradeCandidate) {
      const resources = this.getEmpireResourceTotals(aiId, gameState);
      if (resources.metal >= 1800 && resources.energy >= 900) {
        biasedDecision.diplomatic.offer_trade = [{
          target: tradeCandidate.ai.id,
          offer: { metal: 180 },
          request: { energy: 120 }
        }];
      }
    }

    return biasedDecision;
  }

  getProposalResponseBias(ai, gameState) {
    const proposal = (gameState.diplomacyProposals || [])
      .filter(item => item.status === 'pending' && item.toAi === ai.id)
      .sort((left, right) => (right.createdAt || 0) - (left.createdAt || 0))[0];

    if (!proposal) return null;

    const relation = ai.diplomacy?.[proposal.fromAi] || { status: 'neutral' };
    const ownPower = ai.totalFleetPower || 0;
    const otherPower = this.estimateKnownEmpirePower(ai, proposal.fromAi, gameState);

    if (proposal.type === 'alliance') {
      const shouldAccept = relation.status !== 'war' &&
        ((relation.trust || 0) >= 52 || (relation.commonEnemyCount || 0) > 0) &&
        (relation.borderTension || 0) <= 58;
      return {
        action: shouldAccept ? 'accept_proposal' : 'reject_proposal',
        proposal_id: proposal.id,
        reason: shouldAccept ? 'frontier_alignment' : 'low_trust_or_border_risk'
      };
    }

    if (proposal.type === 'peace') {
      const shouldAccept = relation.status === 'war' &&
        (ownPower <= otherPower * 1.15 || (ai.planets?.length || 0) <= 2);
      return {
        action: shouldAccept ? 'accept_proposal' : 'reject_proposal',
        proposal_id: proposal.id,
        reason: shouldAccept ? 'war_fatigue' : 'offensive_window_open'
      };
    }

    if (proposal.type === 'trade') {
      const ownResources = this.getEmpireResourceTotals(ai.id, gameState);
      const offerValue = this.estimateTradeValue(proposal.offer || {}, ownResources, 'incoming');
      const requestValue = this.estimateTradeValue(proposal.request || {}, ownResources, 'outgoing');
      const shouldAccept = relation.status !== 'war' && offerValue >= requestValue * 0.9;
      return {
        action: shouldAccept ? 'accept_proposal' : 'reject_proposal',
        proposal_id: proposal.id,
        reason: shouldAccept ? 'favorable_exchange' : 'poor_exchange'
      };
    }

    return null;
  }

  estimateTradeValue(bundle, ownResources, direction) {
    return Object.entries(bundle || {}).reduce((sum, [resource, amount]) => {
      const numeric = Math.max(0, Number(amount) || 0);
      const reserve = ownResources?.[resource] || 0;
      const scarcityWeight = reserve < 1200 ? 1.55 : reserve < 2600 ? 1.2 : 0.9;
      const directionWeight = direction === 'incoming' ? 1 : 1 / scarcityWeight;
      return sum + numeric * scarcityWeight * directionWeight;
    }, 0);
  }

  getMutualBorderPressure(aiId, otherId, gameState) {
    const ai = gameState.aiStates.find(item => item.id === aiId);
    const knownPlanetIntel = this.getKnownPlanetIntel(ai, gameState);
    const ownPlanetIds = new Set(Array.isArray(ai?.planets) ? ai.planets : []);
    const left = gameState.planets.filter(planet => ownPlanetIds.has(planet.id));
    const right = knownPlanetIntel.filter(planet => planet.owner === otherId && planet.position);
    let closePairs = 0;
    for (const leftPlanet of left) {
      for (const rightPlanet of right) {
        if (this.distanceBetweenPlanets(leftPlanet, rightPlanet) <= 280) {
          closePairs += 1;
        }
      }
    }
    return closePairs;
  }

  getVisibleDiplomaticContacts(ai, gameState, knownPlanetIntel = [], knownFleetIntel = []) {
    const knownIds = new Set(Array.isArray(ai?.knownAIs) ? ai.knownAIs : []);

    (knownPlanetIntel || []).forEach(record => {
      if (record.owner && record.owner !== ai.id) {
        knownIds.add(record.owner);
      }
    });

    (knownFleetIntel || []).forEach(record => {
      if (record.owner && record.owner !== ai.id) {
        knownIds.add(record.owner);
      }
    });

    Object.entries(ai?.diplomacy || {}).forEach(([targetId, relation]) => {
      const status = typeof relation === 'string' ? relation : relation?.status;
      if (status && status !== 'neutral') {
        knownIds.add(targetId);
      }
    });

    (gameState.diplomacyProposals || []).forEach(proposal => {
      if (proposal.fromAi === ai.id) knownIds.add(proposal.toAi);
      if (proposal.toAi === ai.id) knownIds.add(proposal.fromAi);
    });

    return [...knownIds]
      .map(otherId => {
        const other = gameState.aiStates.find(item => item.id === otherId);
        if (!other || other.id === ai.id) {
          return null;
        }

        return {
          ai: other,
          relation: ai.diplomacy?.[other.id] || { status: 'neutral' },
          pressure: this.getMutualBorderPressure(ai.id, other.id, gameState),
          knownPower: this.estimateKnownEmpirePower(ai, other.id, gameState, knownFleetIntel, knownPlanetIntel),
          knownPlanetCount: this.getKnownPlanetCount(ai, other.id, gameState, knownPlanetIntel)
        };
      })
      .filter(Boolean);
  }

  getKnownPlanetCount(ai, otherId, gameState, knownPlanetIntel = null) {
    const intel = knownPlanetIntel || this.getKnownPlanetIntel(ai, gameState);
    return intel.filter(record => record.owner === otherId).length;
  }

  estimateKnownEmpirePower(ai, otherId, gameState, knownFleetIntel = null, knownPlanetIntel = null) {
    const fleetIntel = knownFleetIntel || this.getKnownFleetIntel(ai);
    const planetIntel = knownPlanetIntel || this.getKnownPlanetIntel(ai, gameState);
    const knownFleetPower = fleetIntel
      .filter(record => record.owner === otherId)
      .reduce((sum, record) => sum + this.getFleetPower(record) * (record.stale ? 0.55 : 1), 0);
    const knownPlanetSupport = planetIntel
      .filter(record => record.owner === otherId)
      .reduce((sum, record) => sum + Math.max(20, (record.defenseValue || 0) * 0.2), 0);

    return knownFleetPower + knownPlanetSupport;
  }

  normalizeFleetOrders(fleetOrders) {
    if (Array.isArray(fleetOrders)) {
      return fleetOrders;
    }
    if (!fleetOrders || typeof fleetOrders !== 'object') {
      return [];
    }

    return Object.entries(fleetOrders).map(([fleetId, order]) => ({
      fleet_id: fleetId,
      ...order
    }));
  }

  normalizeIdList(value) {
    if (Array.isArray(value)) return value;
    if (!value) return [];
    return [value];
  }

  normalizeTradeOffers(value) {
    const items = Array.isArray(value) ? value : (value ? [value] : []);
    return items
      .map(item => {
        if (!item || typeof item !== 'object') return null;
        const target = item.target || item.toAi || item.aiId || item.id;
        const offer = this.normalizeTradeBundle(item.offer || item.give || item.send);
        const request = this.normalizeTradeBundle(item.request || item.want || item.ask);
        if (!target) return null;
        if (Object.keys(offer).length === 0 && Object.keys(request).length === 0) return null;
        return { target, offer, request };
      })
      .filter(Boolean);
  }

  normalizeTradeBundle(bundle) {
    if (!bundle || typeof bundle !== 'object') return {};

    return Object.entries(bundle).reduce((acc, [resource, amount]) => {
      const value = Math.max(0, Math.floor(Number(amount) || 0));
      if (value > 0) {
        acc[resource] = value;
      }
      return acc;
    }, {});
  }

  executeDeceptionDecision(aiId, deceptionDecision, gameEngine) {
    const plan = this.normalizeDeceptionDecision(deceptionDecision);
    if (!plan || plan.mode !== 'feint_assault') return;

    const gameState = gameEngine?.getState?.();
    const ai = gameState?.aiStates?.find(item => item.id === aiId);
    const targetAI = gameState?.aiStates?.find(item => item.id === plan.target_ai);
    const targetPlanet = gameState?.planets?.find(item => item.id === plan.target_planet);
    if (!ai || !targetAI || !targetPlanet) return;

    const now = Date.now();
    const cooldownUntil = ai.deception?.cooldownUntil || 0;
    const activeOperation = ai.deception?.operation;
    if (cooldownUntil > now) return;
    if (activeOperation?.expiresAt && activeOperation.expiresAt > now) return;

    const knownContacts = new Set(Array.isArray(ai.knownAIs) ? ai.knownAIs : []);
    Object.values(ai.intel?.planets || {}).forEach(record => {
      if (record.owner && record.owner !== aiId) {
        knownContacts.add(record.owner);
      }
    });
    if (!knownContacts.has(plan.target_ai)) return;

    const sourcePlanet = this.getBestDeceptionSourcePlanet(aiId, targetPlanet, gameState);
    if (!sourcePlanet) return;

    const intensity = Math.max(0.35, Math.min(1.05, Number(plan.intensity) || 0.6));
    const energyCost = Math.round(180 + intensity * 220);
    const metalCost = Math.round(90 + intensity * 120);
    if (!this.canFundDeception(aiId, { energy: energyCost, metal: metalCost }, gameState)) return;

    this.drainEmpireResource(aiId, 'energy', energyCost, gameState);
    this.drainEmpireResource(aiId, 'metal', metalCost, gameState);

    ai.deception = ai.deception && typeof ai.deception === 'object' ? ai.deception : {};
    ai.deception.operation = {
      id: `deception_${aiId}_${Date.now()}`,
      mode: 'feint_assault',
      targetAi: plan.target_ai,
      targetPlanetId: targetPlanet.id,
      sourcePlanetId: sourcePlanet.id,
      intensity,
      startedAt: now,
      expiresAt: now + Math.round((4 + intensity * 4) * 60 * 1000),
      cooldownUntil: now + 12 * 60 * 1000
    };
    ai.deception.cooldownUntil = ai.deception.operation.cooldownUntil;
    ai.deception.history = Array.isArray(ai.deception.history) ? ai.deception.history : [];
    ai.deception.history.unshift({
      id: ai.deception.operation.id,
      mode: ai.deception.operation.mode,
      targetAi: plan.target_ai,
      targetPlanetId: targetPlanet.id,
      startedAt: now
    });
    ai.deception.history = ai.deception.history.slice(0, 12);

    gameEventBus.recordWorldEvent(gameState, 'deception_planted', {
      operatorAi: aiId,
      targetAi: plan.target_ai,
      targetPlanetId: targetPlanet.id,
      sourcePlanetId: sourcePlanet.id,
      mode: 'feint_assault',
      intensity
    }, {
      aiIds: [aiId]
    });
  }

  normalizeDeceptionDecision(value) {
    if (!value || typeof value !== 'object') return null;
    const mode = value.mode || value.type || value.action;
    const target_ai = value.target_ai || value.targetAi || value.aiId;
    const target_planet = value.target_planet || value.targetPlanet || value.planetId || value.target;
    if (!mode || !target_ai || !target_planet) return null;
    return {
      mode,
      target_ai,
      target_planet,
      intensity: value.intensity
    };
  }

  getBestDeceptionSourcePlanet(aiId, targetPlanet, gameState) {
    return gameState.planets
      .filter(planet => planet.owner === aiId)
      .sort((left, right) => this.distanceBetween(left.position, targetPlanet.position) - this.distanceBetween(right.position, targetPlanet.position))[0] || null;
  }

  canFundDeception(aiId, cost, gameState) {
    const totals = this.getEmpireResourceTotals(aiId, gameState);
    return totals.metal >= (cost.metal || 0) && totals.energy >= (cost.energy || 0);
  }

  distanceBetween(left, right) {
    const dx = (left?.x || 0) - (right?.x || 0);
    const dy = (left?.y || 0) - (right?.y || 0);
    return Math.sqrt(dx * dx + dy * dy);
  }

  drainEmpireResource(aiId, resource, amount, gameState) {
    let remaining = Math.max(0, Math.floor(Number(amount) || 0));
    if (remaining <= 0) return;

    const ownedPlanets = gameState.planets
      .filter(planet => planet.owner === aiId)
      .sort((left, right) => (right.resources?.[resource] || 0) - (left.resources?.[resource] || 0));

    for (const planet of ownedPlanets) {
      if (remaining <= 0) break;
      const available = planet.resources?.[resource] || 0;
      const spent = Math.min(available, remaining);
      planet.resources[resource] = available - spent;
      remaining -= spent;
    }
  }

  mergeBiasResourceAllocation(decision, planetId, patch) {
    if (!planetId || !patch) return;
    const allocation = decision.resource_allocation[planetId] && typeof decision.resource_allocation[planetId] === 'object'
      ? decision.resource_allocation[planetId]
      : {};

    if (patch.build && !allocation.build) {
      allocation.build = patch.build;
    }

    if (patch.ships && typeof patch.ships === 'object') {
      allocation.ships = allocation.ships && typeof allocation.ships === 'object' ? allocation.ships : {};
      for (const [shipType, count] of Object.entries(patch.ships)) {
        allocation.ships[shipType] = Math.max(0, (allocation.ships[shipType] || 0) + count);
      }
    }

    decision.resource_allocation[planetId] = allocation;
  }

  setBiasBuild(decision, planetId, buildingType, options = {}) {
    if (!planetId || !buildingType) return;
    const allocation = decision.resource_allocation[planetId] && typeof decision.resource_allocation[planetId] === 'object'
      ? decision.resource_allocation[planetId]
      : {};
    const force = Boolean(options.force);

    if (force || !allocation.build) {
      allocation.build = buildingType;
    }

    decision.resource_allocation[planetId] = allocation;
  }

  getKnownPlanetIntel(ai, gameState) {
    const sources = [
      ai.intelligence?.planets,
      ai.intel?.planets,
      ai.worldKnowledge?.planets
    ].filter(Boolean);

    if (sources.length > 0) {
      return Object.values(sources[0]).map(record => ({
        ...record,
        id: record.id || record.planetId,
        lastSeenAt: record.lastSeenAt || record.timestamp || null,
        stale: Boolean(record.stale)
      })).filter(record => record.id);
    }

    return gameState.planets
      .filter(planet => planet.owner === ai.id)
      .map(planet => ({
        id: planet.id,
        name: planet.name,
        type: planet.type,
        position: planet.position,
        regionId: planet.regionId,
        regionName: planet.regionName,
        strategicRole: planet.strategicRole,
        owner: ai.id,
        defenseValue: planet.defenseValue,
        buildings: planet.buildings ? { ...planet.buildings } : {},
        lastSeenAt: Date.now(),
        stale: false
      }));
  }

  getKnownFleetIntel(ai) {
    const fleets = ai.intelligence?.fleets || ai.intel?.fleets || ai.worldKnowledge?.fleets || {};
    return Object.values(fleets).map(record => ({
      ...record,
      lastSeenAt: record.lastSeenAt || record.timestamp || null,
      stale: Boolean(record.stale)
    }));
  }

  getKnownOwnerForPlanet(planetId, aiId, ownedIds, intelMap) {
    if (ownedIds.has(planetId)) {
      return aiId;
    }
    const intel = intelMap.get(planetId);
    return intel ? (intel.owner ?? null) : undefined;
  }

  getUnknownPlanetDefenseBaseline(planet) {
    const typeBase = planet.type === 'home'
      ? 160
      : planet.type === 'resource'
        ? 80
        : 55;
    const roleBase = (STRATEGIC_ROLE_WEIGHTS[planet.strategicRole] || 36) * 0.35;
    return typeBase + roleBase;
  }

  estimateKnownPlanetDefense(planet, aiId, gameState, intelMap, knownFleetIntel = []) {
    if (planet.owner === aiId) {
      return this.estimatePlanetDefense(planet, gameState);
    }

    const intel = intelMap.get(planet.id);
    const knownOwner = intel ? (intel.owner ?? null) : undefined;
    const baseDefense = intel
      ? (intel.defenseValue || 0) * (1 + ((intel.buildings?.defense || 0) * 0.5))
      : this.getUnknownPlanetDefenseBaseline(planet);

    const stationedKnownPower = knownFleetIntel
      .filter(fleet => {
        if (knownOwner && fleet.owner !== knownOwner) return false;
        if ((fleet.status || '').toLowerCase() === 'moving') return false;
        if (fleet.currentPlanetId === planet.id) return true;
        return fleet.position?.x === planet.position?.x && fleet.position?.y === planet.position?.y;
      })
      .reduce((sum, fleet) => sum + this.getFleetPower(fleet) * (fleet.stale ? 0.6 : 1), 0);

    const uncertaintyTax = !intel ? 24 : (intel.stale ? 12 : 0);
    return baseDefense + stationedKnownPower + uncertaintyTax;
  }

  describeBiasAdjustments(originalDecision, biasedDecision, gameState) {
    const original = originalDecision || {};
    const adjustments = [];
    const originalOrders = this.normalizeFleetOrders(original.fleet_orders);
    const biasedOrders = this.normalizeFleetOrders(biasedDecision.fleet_orders);
    const originalOrderKeys = new Set(originalOrders.map(order => `${order.fleet_id || order.fleetId || order.id}|${order.action || ''}|${order.target || order.targetPlanet || order.target_planet || ''}`));

    for (const order of biasedOrders) {
      const key = `${order.fleet_id || order.fleetId || order.id}|${order.action || ''}|${order.target || order.targetPlanet || order.target_planet || ''}`;
      if (!originalOrderKeys.has(key) && order.bias) {
        adjustments.push(`${this.describeFleetAction(order.action)}${this.getPlanetLabel(order.target || order.targetPlanet || order.target_planet, gameState)}`);
      }
    }

    const originalAllocations = original.resource_allocation && typeof original.resource_allocation === 'object' ? original.resource_allocation : {};
    const biasedAllocations = biasedDecision.resource_allocation && typeof biasedDecision.resource_allocation === 'object' ? biasedDecision.resource_allocation : {};
    for (const [planetId, allocation] of Object.entries(biasedAllocations)) {
      const originalAllocation = originalAllocations[planetId] || {};
      if (allocation.build && allocation.build !== originalAllocation.build) {
        if (allocation.build === 'defense') {
          adjustments.push(`加固${this.getPlanetLabel(planetId, gameState)}`);
        } else {
          adjustments.push(`${this.getPlanetLabel(planetId, gameState)}建设${this.getBuildingLabel(allocation.build)}`);
        }
      }

      const originalShips = originalAllocation.ships && typeof originalAllocation.ships === 'object' ? originalAllocation.ships : {};
      const newShips = allocation.ships && typeof allocation.ships === 'object' ? allocation.ships : {};
      const addedShips = Object.entries(newShips)
        .filter(([shipType, count]) => count > (originalShips[shipType] || 0))
        .map(([shipType, count]) => `${this.getShipLabel(shipType)}x${count - (originalShips[shipType] || 0)}`);
      if (addedShips.length > 0) {
        adjustments.push(`${this.getPlanetLabel(planetId, gameState)}补充${addedShips.join('、')}`);
      }
    }

    if (!original.tech_research && biasedDecision.tech_research) {
      adjustments.push(`研究${this.getTechLabel(biasedDecision.tech_research)}`);
    }

    return adjustments.slice(0, 5);
  }

  getThreatenedStrategicNodes(aiId, gameState, gameEngine, ai, knownPlanetIntel = [], knownFleetIntel = []) {
    const lanes = Array.isArray(gameState.mapMeta?.lanes) ? gameState.mapMeta.lanes : [];
    const intelMap = new Map((knownPlanetIntel || []).map(record => [record.id, record]));
    const ownedIds = new Set(gameState.planets.filter(planet => planet.owner === aiId).map(planet => planet.id));
    const hostileFleetIntel = (knownFleetIntel || []).filter(fleet =>
      fleet.owner &&
      fleet.owner !== aiId &&
      this.isHostileToward(fleet.owner, aiId, gameEngine)
    );

    return gameState.planets
      .filter(planet => planet.owner === aiId && STRATEGIC_DEFENSE_ROLES.has(planet.strategicRole))
      .map(planet => {
        const incomingHostilePower = hostileFleetIntel
          .filter(fleet => (fleet.status || '').toLowerCase() === 'moving' && fleet.targetPlanet === planet.id)
          .reduce((sum, fleet) => sum + this.getFleetPower(fleet) * (fleet.stale ? 0.6 : 1), 0);
        const connectedLanes = lanes.filter(lane => lane.from === planet.id || lane.to === planet.id);
        const hostileBorderCount = connectedLanes.reduce((sum, lane) => {
          const neighborId = lane.from === planet.id ? lane.to : lane.from;
          const knownOwner = this.getKnownOwnerForPlanet(neighborId, aiId, ownedIds, intelMap);
          return sum + (knownOwner && knownOwner !== aiId && this.isHostileToward(knownOwner, aiId, gameEngine) ? 1 : 0);
        }, 0);
        const stationedDefense = this.estimatePlanetDefense(planet, gameState);
        const importance = this.getStrategicRoleWeight(planet.strategicRole);
        const threatScore = incomingHostilePower + hostileBorderCount * 60 + connectedLanes.length * 10 + importance - stationedDefense * 0.35;
        const severePressure = incomingHostilePower - stationedDefense;
        let severity = 'guarded';
        if (severePressure > 40 || hostileBorderCount >= 2) {
          severity = 'critical';
        } else if (severePressure > -40 || hostileBorderCount >= 1 || planet.regionId === 'core') {
          severity = 'high';
        } else if (connectedLanes.length >= 3) {
          severity = 'watch';
        }

        return {
          planet,
          incomingHostilePower,
          stationedDefense,
          hostileBorderCount,
          connectedLanes: connectedLanes.length,
          threatScore,
          severity,
          requiresDefenseBuild: planet.buildQueue?.length === 0 && (severity === 'critical' || severity === 'high') && (planet.buildings?.defense || 0) < 5,
          requiresFleetResponse: severity === 'critical' || (severity === 'high' && incomingHostilePower > 0)
        };
      })
      .filter(node => node.severity !== 'guarded' || node.planet.regionId === 'core')
      .sort((left, right) => right.threatScore - left.threatScore);
  }

  getUnstableOccupiedPlanets(aiId, gameState) {
    return gameState.planets
      .filter(planet => planet.owner === aiId && planet.occupation)
      .map(planet => {
        const stability = planet.occupation?.stability || 0;
        const garrisonPower = planet.occupation?.garrisonPower || 0;
        const strategicWeight = this.getStrategicRoleWeight(planet.strategicRole);
        const severityScore = (100 - stability) * 2 + strategicWeight - garrisonPower * 0.04;
        return {
          planet,
          stability,
          garrisonPower,
          severityScore,
          requiresDefenseBuild: stability < 62 && (planet.buildings?.defense || 0) < 5 && (planet.buildQueue?.length || 0) === 0,
          requiresFleetResponse: stability < 78 || garrisonPower < 120
        };
      })
      .sort((left, right) => right.severityScore - left.severityScore);
  }

  getFleetRecoveryOrders(aiId, gameState, assignedFleetIds = new Set()) {
    const candidates = gameState.fleets
      .filter(fleet => fleet.owner === aiId && fleet.status === 'idle' && !assignedFleetIds.has(fleet.id))
      .map(fleet => ({
        fleet,
        readiness: Math.max(0.35, Math.min(1.15, fleet.readiness ?? 1)),
        currentPlanet: this.findPlanetForFleet(fleet, gameState)
      }))
      .filter(entry => {
        const riskySupply = ['deep_space', 'expedition', 'outpost'].includes(entry.fleet.supplyStatus);
        const frontlineRole = ['approach_gate', 'border_bastion', 'central_hub'].includes(entry.currentPlanet?.strategicRole);
        return entry.readiness < 0.72 || (entry.readiness < 0.84 && (riskySupply || frontlineRole));
      })
      .sort((left, right) => left.readiness - right.readiness)
      .slice(0, 2);

    return candidates
      .map(entry => {
        const targetPlanet = this.getBestRecoveryPlanet(aiId, gameState, entry.fleet, entry.currentPlanet);
        if (!targetPlanet || targetPlanet.id === entry.currentPlanet?.id) {
          return null;
        }
        return {
          fleet: entry.fleet,
          targetPlanet,
          readiness: entry.readiness
        };
      })
      .filter(Boolean);
  }

  getStrategicAttackTargets(aiId, gameState, gameEngine, ai, knownPlanetIntel = [], knownFleetIntel = []) {
    const ownedPlanets = gameState.planets.filter(planet => planet.owner === aiId);
    const lanes = Array.isArray(gameState.mapMeta?.lanes) ? gameState.mapMeta.lanes : [];
    if (ownedPlanets.length === 0) {
      return [];
    }
    const ownedIds = new Set(ownedPlanets.map(planet => planet.id));
    const intelMap = new Map((knownPlanetIntel || []).map(record => [record.id, record]));

    return gameState.planets
      .filter(planet => !ownedIds.has(planet.id))
      .map(planet => {
        const intel = intelMap.get(planet.id);
        const knownOwner = intel ? (intel.owner ?? null) : undefined;
        if (knownOwner && !this.canTargetOwner(aiId, knownOwner, gameEngine)) {
          return null;
        }

        const route = this.getBestRouteProfile(ownedPlanets, planet, gameState);
        const laneCount = lanes.filter(lane => lane.from === planet.id || lane.to === planet.id).length;
        const adjacentFriendly = lanes.reduce((sum, lane) => {
          const neighborId = lane.from === planet.id ? lane.to : lane.from;
          const neighborOwner = this.getKnownOwnerForPlanet(neighborId, aiId, ownedIds, intelMap);
          return sum + (neighborOwner === aiId ? 1 : 0);
        }, 0);
        const adjacentHostile = lanes.reduce((sum, lane) => {
          const neighborId = lane.from === planet.id ? lane.to : lane.from;
          const neighborOwner = this.getKnownOwnerForPlanet(neighborId, aiId, ownedIds, intelMap);
          return sum + (neighborOwner && neighborOwner !== aiId && this.isHostileToward(aiId, neighborOwner, gameEngine) ? 1 : 0);
        }, 0);
        const distance = this.distanceToEmpire(planet, ownedPlanets);
        const defense = this.estimateKnownPlanetDefense(planet, aiId, gameState, intelMap, knownFleetIntel);
        const isCentral = planet.regionId === 'core' || planet.strategicRole === 'central_hub';
        const isChokepoint = ['approach_gate', 'core_relay', 'border_bastion'].includes(planet.strategicRole);
        const knownNeutral = intel && knownOwner === null;
        const neutralBonus = !intel ? 8 : (knownNeutral ? 28 : 12);
        const routeBonus = ((route.speedMultiplier || 1) * 18) + ((route.strategicWeight || 0) * 62);
        const weaknessBonus = Math.max(0, 120 - defense) * 0.35;
        const intelConfidence = intel ? 12 : -22;
        const stalePenalty = intel?.stale ? 10 : 0;
        const specialNodeBonus = ({
          industrial_hub: 34,
          research_archive: 28,
          fortress_world: 30,
          supply_nexus: 30,
          sensor_array: 24,
          arcology: 18
        }[planet.specialNodeType] || 0);
        const routeFeatureBonus = ((route.supplyQuality || 0) * 18) + ((route.stealthValue || 0) * 8) - ((route.chokepointRisk || 0) * 6);
        const score =
          this.getStrategicRoleWeight(planet.strategicRole) +
          (isCentral ? 34 : 0) +
          (isChokepoint ? 22 : 0) +
          specialNodeBonus +
          neutralBonus +
          intelConfidence +
          routeBonus +
          routeFeatureBonus +
          weaknessBonus +
          laneCount * 6 +
          adjacentFriendly * 18 -
          adjacentHostile * 10 -
          stalePenalty -
          distance * 0.12;

        const actionBias = isCentral
          ? 'contest'
          : isChokepoint
            ? 'contest'
            : !intel
              ? 'move'
              : knownNeutral
                ? 'redeploy'
                : 'attack';
        const biasReason = isCentral
          ? 'central_ring_capture'
          : isChokepoint
            ? 'lane_contest'
            : !intel
              ? 'intel_gap_probe'
              : 'forward_expansion';

        return {
          planet,
          score,
          laneCount,
          distance,
          defense,
          route,
          isCentral,
          isChokepoint,
          actionBias,
          biasReason,
          minAssaultPower: !intel ? defense * 0.6 : (knownOwner ? defense * 0.72 : defense * 0.45)
        };
      })
      .filter(Boolean)
      .sort((left, right) => right.score - left.score)
      .slice(0, 6);
  }

  getBestRouteProfile(ownedPlanets, targetPlanet, gameState) {
    const origin = ownedPlanets
      .map(planet => ({
        planet,
        distance: this.distanceBetweenPlanets(planet, targetPlanet)
      }))
      .sort((left, right) => left.distance - right.distance)[0]?.planet;

    return computeTravelProfile(origin, targetPlanet, gameState.mapMeta);
  }

  getBestProductionPlanet(aiId, gameState) {
    return gameState.planets
      .filter(planet => planet.owner === aiId)
      .sort((left, right) => {
        const leftScore = (left.buildings?.shipyard || 0) * 80 + (left.strategicRole === 'home_core' ? 25 : 0) - (left.shipBuildQueue?.length || 0) * 20;
        const rightScore = (right.buildings?.shipyard || 0) * 80 + (right.strategicRole === 'home_core' ? 25 : 0) - (right.shipBuildQueue?.length || 0) * 20;
        return rightScore - leftScore;
      })[0] || null;
  }

  getBestResearchPlanet(aiId, gameState) {
    return gameState.planets
      .filter(planet => planet.owner === aiId)
      .sort((left, right) => {
        const leftThreat = ['approach_gate', 'border_bastion', 'central_hub'].includes(left.strategicRole) ? 1 : 0;
        const rightThreat = ['approach_gate', 'border_bastion', 'central_hub'].includes(right.strategicRole) ? 1 : 0;
        const leftScore =
          (left.buildings?.lab || 0) * 180 +
          (left.strategicRole === 'home_core' ? 120 : 0) +
          (left.strategicRole === 'inner_resource' ? 45 : 0) +
          (left.buildQueue?.length ? -80 : 20) +
          (left.resources?.energy || 0) * 0.06 +
          (left.resources?.metal || 0) * 0.04 -
          leftThreat * 60;
        const rightScore =
          (right.buildings?.lab || 0) * 180 +
          (right.strategicRole === 'home_core' ? 120 : 0) +
          (right.strategicRole === 'inner_resource' ? 45 : 0) +
          (right.buildQueue?.length ? -80 : 20) +
          (right.resources?.energy || 0) * 0.06 +
          (right.resources?.metal || 0) * 0.04 -
          rightThreat * 60;
        return rightScore - leftScore;
      })[0] || null;
  }

  getBestRecoveryPlanet(aiId, gameState, fleet, currentPlanet = null) {
    return gameState.planets
      .filter(planet => planet.owner === aiId)
      .sort((left, right) => {
        const leftScore = this.scoreRecoveryPlanet(left, fleet, currentPlanet, gameState);
        const rightScore = this.scoreRecoveryPlanet(right, fleet, currentPlanet, gameState);
        return rightScore - leftScore;
      })[0] || null;
  }

  scoreRecoveryPlanet(planet, fleet, currentPlanet, gameState) {
    const distance = this.distanceFleetToPlanet(fleet, planet);
    const hostileIncoming = gameState.fleets
      .filter(item => item.owner !== fleet.owner && item.status === 'moving' && item.targetPlanet === planet.id)
      .reduce((sum, item) => sum + this.getFleetPower(item), 0);
    const occupationPenalty = planet.occupation ? 120 - (planet.occupation.stability || 0) : 0;
    const safeRoleBonus =
      (planet.strategicRole === 'home_core' ? 180 : 0) +
      (planet.strategicRole === 'inner_resource' ? 80 : 0) +
      (planet.strategicRole === 'core_relay' ? 35 : 0);
    const supportBonus =
      (planet.buildings?.shipyard || 0) * 28 +
      ((planet.nodeModifiers?.shipyardLevel || 0) * 34) +
      (planet.buildings?.lab || 0) * 18 +
      ((planet.nodeModifiers?.labLevel || 0) * 20) +
      (planet.buildings?.defense || 0) * 16 +
      ((planet.nodeModifiers?.repairRate || 0) * 520000) +
      ((planet.nodeModifiers?.maintenanceReduction || 0) * 380) +
      (planet.resources?.energy || 0) * 0.01;
    const specialNodeBonus = {
      supply_nexus: 70,
      fortress_world: 58,
      industrial_hub: 44,
      research_archive: 24,
      sensor_array: 18,
      arcology: 20
    }[planet.specialNodeType] || 0;
    const frontPenalty = ['approach_gate', 'border_bastion', 'central_hub'].includes(planet.strategicRole) ? 70 : 0;
    const currentPenalty = currentPlanet?.id === planet.id ? 40 : 0;
    return safeRoleBonus + supportBonus + specialNodeBonus - hostileIncoming * 0.5 - occupationPenalty - frontPenalty - currentPenalty - distance * 0.12;
  }

  getEmpireResourceTotals(aiId, gameState) {
    return gameState.planets
      .filter(planet => planet.owner === aiId)
      .reduce((totals, planet) => {
        totals.metal += planet.resources?.metal || 0;
        totals.energy += planet.resources?.energy || 0;
        totals.population += planet.resources?.population || 0;
        return totals;
      }, { metal: 0, energy: 0, population: 0 });
  }

  getTotalLabLevel(aiId, gameState) {
    return gameState.planets
      .filter(planet => planet.owner === aiId)
      .reduce((sum, planet) => sum + (planet.buildings?.lab || 0), 0);
  }

  hasQueuedBuilding(aiId, gameState, buildingType) {
    return gameState.planets
      .filter(planet => planet.owner === aiId)
      .some(planet => (planet.buildQueue || []).some(item => item.type === buildingType));
  }

  canPlanetAffordBuild(planet, buildingType) {
    const cost = BUILDINGS[buildingType]?.cost;
    if (!planet || !cost) return false;
    return (planet.resources?.metal || 0) >= (cost.metal || 0) && (planet.resources?.energy || 0) >= (cost.energy || 0);
  }

  getResearchBias(ai, gameState, threatenedNodes, strategicTargets, empireResources, unstableOccupationNodes = []) {
    const totalLabLevel = this.getTotalLabLevel(ai.id, gameState);
    const hasLabQueued = this.hasQueuedBuilding(ai.id, gameState, 'lab');
    const bestResearchPlanet = this.getBestResearchPlanet(ai.id, gameState);
    const criticalThreat = threatenedNodes.some(node => node.severity === 'critical');
    const highThreat = threatenedNodes.some(node => node.severity === 'critical' || node.severity === 'high');
    const canBuildLabNow = totalLabLevel <= 0 &&
      !hasLabQueued &&
      bestResearchPlanet &&
      this.canPlanetAffordBuild(bestResearchPlanet, 'lab') &&
      (!criticalThreat || (ai.personality === 'tech' && empireResources.energy >= 1200));

    const techType = totalLabLevel > 0 && !ai.researchQueue
      ? this.pickResearchTech(ai, gameState, threatenedNodes, strategicTargets, empireResources, highThreat, unstableOccupationNodes)
      : null;

    return {
      labPlanetId: canBuildLabNow ? bestResearchPlanet.id : null,
      forceLab: canBuildLabNow,
      techType
    };
  }

  pickResearchTech(ai, gameState, threatenedNodes, strategicTargets, empireResources, highThreat = false, unstableOccupationNodes = []) {
    const currentTech = ai.tech || {};
    const totalPopulation = Math.max(1, empireResources.population || 0);
    const availablePopulation = Math.max(0, ai.availablePopulation ?? 0);
    const lowPopulationBuffer = availablePopulation / totalPopulation < 0.14;
    const lowEnergyReserve = empireResources.energy < 1500 || empireResources.energy < empireResources.metal * 0.45;
    const underdevelopedEconomy = empireResources.metal < 2200 || (currentTech.miningEfficiency || 0) === 0;
    const unstableOccupation = unstableOccupationNodes.some(node => node.stability < 68);
    const needsSiegePush = strategicTargets.some(target => target.defense >= 180 && (target.isCentral || target.isChokepoint));
    const staleIntelPressure = Object.values(ai.intel?.planets || {}).some(record => record?.stale);
    const wantsMobility = strategicTargets.some(target => target.isCentral || target.isChokepoint) ||
      gameState.fleets.filter(fleet => fleet.owner === ai.id && fleet.status === 'moving').length >= 2;

    const priorities = [];
    if (highThreat) priorities.push('shieldTech', 'fortification');
    if (unstableOccupation) priorities.push('logisticsNetwork', 'fortification');
    if (needsSiegePush) priorities.push('siegeEngineering');
    if (wantsMobility) priorities.push('engineUpgrade', 'logisticsNetwork');
    if (lowPopulationBuffer) priorities.push('populationGrowth');
    if (lowEnergyReserve) priorities.push('energyTech');
    if (underdevelopedEconomy) priorities.push('miningEfficiency');
    if (staleIntelPressure) priorities.push('sensorNetwork');

    switch (ai.personality) {
      case 'tech':
        priorities.push('sensorNetwork', 'energyTech', 'miningEfficiency', 'logisticsNetwork', 'engineUpgrade', 'weaponUpgrade', 'shieldTech', 'siegeEngineering', 'fortification', 'populationGrowth');
        break;
      case 'economic':
        priorities.push('miningEfficiency', 'energyTech', 'populationGrowth', 'logisticsNetwork', 'sensorNetwork', 'shieldTech', 'fortification', 'weaponUpgrade', 'engineUpgrade');
        break;
      case 'defensive':
      case 'diplomatic':
        priorities.push('fortification', 'shieldTech', 'energyTech', 'logisticsNetwork', 'sensorNetwork', 'miningEfficiency', 'populationGrowth', 'engineUpgrade', 'weaponUpgrade');
        break;
      case 'aggressive':
      case 'opportunist':
      case 'gambler':
        priorities.push('weaponUpgrade', 'siegeEngineering', 'engineUpgrade', 'logisticsNetwork', 'shieldTech', 'fortification', 'miningEfficiency', 'energyTech', 'populationGrowth', 'sensorNetwork');
        break;
      default:
        priorities.push('weaponUpgrade', 'shieldTech', 'engineUpgrade', 'logisticsNetwork', 'siegeEngineering', 'fortification', 'sensorNetwork', 'miningEfficiency', 'energyTech', 'populationGrowth');
        break;
    }

    priorities.push('weaponUpgrade', 'shieldTech', 'engineUpgrade', 'logisticsNetwork', 'siegeEngineering', 'fortification', 'sensorNetwork', 'miningEfficiency', 'energyTech', 'populationGrowth');

    for (const techType of priorities) {
      if (this.canStartResearchBias(ai, techType, empireResources)) {
        return techType;
      }
    }

    return null;
  }

  canStartResearchBias(ai, techType, empireResources) {
    const techInfo = TECH_TREE[techType];
    if (!techInfo) return false;

    const currentLevel = ai.tech?.[techType] || 0;
    if (currentLevel >= techInfo.maxLevel) return false;

    const nextCost = techInfo.cost?.[currentLevel];
    if (!nextCost) return false;

    const metalReady = empireResources.metal >= Math.ceil((nextCost.metal || 0) * 1.05);
    const energyReady = empireResources.energy >= Math.max(Math.ceil((nextCost.energy || 0) * 1.2), (nextCost.energy || 0) + 250);
    return metalReady && energyReady;
  }

  getIdleFleets(aiId, gameState, assignedFleetIds = new Set()) {
    return gameState.fleets
      .filter(fleet =>
        fleet.owner === aiId &&
        fleet.status === 'idle' &&
        !assignedFleetIds.has(fleet.id) &&
        (fleet.repairState !== 'repairing' || (fleet.readiness ?? 1) >= 0.9)
      );
  }

  pickBestFleetForTarget(fleets, targetPlanet, gameState) {
    return [...fleets]
      .sort((left, right) => {
        const leftScore = this.scoreFleetForTarget(left, targetPlanet, gameState);
        const rightScore = this.scoreFleetForTarget(right, targetPlanet, gameState);
        return rightScore - leftScore;
      })[0] || null;
  }

  scoreFleetForTarget(fleet, targetPlanet, gameState) {
    const power = this.getFleetPower(fleet);
    const distance = this.distanceFleetToPlanet(fleet, targetPlanet);
    const originPlanet = this.findPlanetForFleet(fleet, gameState);
    const route = computeTravelProfile(originPlanet, targetPlanet, gameState.mapMeta);
    const specialNodeBonus = {
      industrial_hub: 46,
      research_archive: 40,
      fortress_world: 44,
      supply_nexus: 42,
      sensor_array: 34,
      arcology: 24
    }[targetPlanet?.specialNodeType] || 0;
    return power +
      (route.speedMultiplier || 1) * 40 +
      (route.strategicWeight || 0) * 28 +
      ((route.supplyQuality || 0) * 18) +
      ((route.stealthValue || 0) * 10) -
      ((route.chokepointRisk || 0) * 8) +
      specialNodeBonus -
      distance * 0.05;
  }

  getFleetPower(fleet) {
    if (!fleet) return 0;
    if (typeof fleet.totalPower === 'number' && fleet.totalPower > 0) {
      return fleet.totalPower * Math.max(0.35, Math.min(1.15, fleet.readiness ?? 1));
    }

    const ships = fleet.ships || {};
    const basePower = (ships.scout || 0) * 5 +
      (ships.frigate || 0) * 20 +
      (ships.cruiser || 0) * 60 +
      (ships.battleship || 0) * 150;
    return basePower * Math.max(0.35, Math.min(1.15, fleet.readiness ?? 1));
  }

  estimatePlanetDefense(planet, gameState) {
    const stationedFleets = gameState.fleets.filter(fleet =>
      fleet.owner === planet.owner &&
      fleet.status === 'idle' &&
      (
        fleet.currentPlanetId === planet.id ||
        (fleet.position?.x === planet.position?.x && fleet.position?.y === planet.position?.y)
      )
    );

    return stationedFleets.reduce((sum, fleet) => sum + this.getFleetPower(fleet), planet.defenseValue * (1 + (planet.buildings?.defense || 0) * 0.5));
  }

  getStrategicRoleWeight(role) {
    return STRATEGIC_ROLE_WEIGHTS[role] || 36;
  }

  describeFleetAction(action) {
    const labels = {
      attack: '攻击',
      defend: '调防',
      redeploy: '换防',
      contest: '争夺',
      move: '机动'
    };
    return labels[(action || '').toLowerCase()] || '调动';
  }

  getPlanetLabel(planetId, gameState) {
    if (!planetId) return '目标星球';
    const planet = gameState?.planets?.find(item => item.id === planetId);
    if (planet?.name) return planet.name;
    const match = /^planet_(\d+)$/i.exec(String(planetId));
    return match ? `${Number(match[1])}号星球` : String(planetId);
  }

  getShipLabel(shipType) {
    return SHIPS[shipType]?.name || shipType || '舰船';
  }

  getBuildingLabel(buildingType) {
    return BUILDINGS[buildingType]?.name || buildingType || '建筑';
  }

  getTechLabel(techType) {
    return TECH_TREE[techType]?.name || techType || '科技';
  }

  canTargetOwner(aiId, targetOwner, gameEngine) {
    if (!targetOwner || targetOwner === aiId) {
      return true;
    }
    return gameEngine?.diplomacySystem ? gameEngine.diplomacySystem.canAttack(aiId, targetOwner) : true;
  }

  isHostileToward(attackerId, defenderId, gameEngine) {
    if (!attackerId || !defenderId || attackerId === defenderId) {
      return false;
    }
    return gameEngine?.diplomacySystem ? gameEngine.diplomacySystem.canAttack(attackerId, defenderId) : true;
  }

  findPlanetForFleet(fleet, gameState) {
    if (!fleet) return null;
    if (fleet.currentPlanetId) {
      return gameState.planets.find(planet => planet.id === fleet.currentPlanetId) || null;
    }
    return gameState.planets.find(planet =>
      planet.position?.x === fleet.position?.x &&
      planet.position?.y === fleet.position?.y
    ) || null;
  }

  distanceFleetToPlanet(fleet, planet) {
    const dx = (fleet.position?.x || 0) - (planet.position?.x || 0);
    const dy = (fleet.position?.y || 0) - (planet.position?.y || 0);
    return Math.sqrt(dx * dx + dy * dy);
  }

  distanceBetweenPlanets(left, right) {
    const dx = (left.position?.x || 0) - (right.position?.x || 0);
    const dy = (left.position?.y || 0) - (right.position?.y || 0);
    return Math.sqrt(dx * dx + dy * dy);
  }

  distanceToEmpire(planet, ownedPlanets) {
    return ownedPlanets.reduce((best, mine) => {
      return Math.min(best, this.distanceBetweenPlanets(planet, mine));
    }, Number.POSITIVE_INFINITY);
  }

  getAffectedAIIds(event) {
    const payload = event.data || event;
    const ids = new Set();
    [
      event.aiId,
      event.observerId,
      event.attacker,
      event.attackerId,
      event.defender,
      event.defenderId,
      event.fromAi,
      event.toAi,
      event.ai1,
      event.ai2,
      event.toOwner,
      event.fromOwner,
      payload.aiId,
      payload.observerId,
      payload.attacker,
      payload.attackerId,
      payload.defender,
      payload.defenderId,
      payload.fromAi,
      payload.toAi,
      payload.ai1,
      payload.ai2,
      payload.toOwner,
      payload.fromOwner
    ].filter(Boolean).forEach(id => ids.add(id));

    if (Array.isArray(event.aiIds)) {
      event.aiIds.filter(Boolean).forEach(id => ids.add(id));
    }
    if (Array.isArray(payload.aiIds)) {
      payload.aiIds.filter(Boolean).forEach(id => ids.add(id));
    }

    return [...ids].filter(id => this.workers.has(id));
  }

  isImmediateResponseEvent(type) {
    return new Set([
      'battle',
      'battle_resolved',
      'planet_captured',
      'war_declared',
      'alliance_proposed',
      'alliance_formed',
      'alliance_expired',
      'peace_proposed',
      'peace_signed',
      'trade_proposed'
    ]).has(type);
  }

  getImmediateResponseAIIds(event, affectedAIIds) {
    const payload = event.data || event;
    if (['alliance_proposed', 'peace_proposed', 'trade_proposed'].includes(event.type)) {
      return affectedAIIds.filter(aiId => aiId === payload.toAi);
    }

    return affectedAIIds;
  }
}

export default AIScheduler;
