import fs from 'fs';

process.env.DB_PATH = './data/test-smoke.db';

const { default: GameState } = await import('../src/models/game-state.js');
const { default: AIState } = await import('../src/models/ai-state.js');
const { default: IntelligenceSystem } = await import('../src/engine/intelligence-system.js');
const { default: DiplomacySystem } = await import('../src/engine/diplomacy-system.js');
const { default: ResourceManager } = await import('../src/engine/resource-manager.js');
const { default: BuildingSystem } = await import('../src/engine/building-system.js');
const { default: FleetManager } = await import('../src/engine/fleet-manager.js');
const { default: CombatSystem } = await import('../src/engine/combat-system.js');
const { default: TechSystem } = await import('../src/engine/tech-system.js');
const { default: GameLoop } = await import('../src/engine/game-loop.js');
const { default: AIScheduler } = await import('../src/ai/ai-scheduler.js');
const { default: PromptBuilder } = await import('../src/ai/prompt-builder.js');
const { initializeMap, ensureMapTopology } = await import('../src/engine/map-generator.js');
const { default: gameEventBus } = await import('../src/services/game-event-bus.js');
const { default: autoSaveManager } = await import('../src/services/auto-save-manager.js');
const { default: dbService } = await import('../src/services/db-service.js');
const { default: bettingService } = await import('../src/services/betting-service.js');
const { buildStrategicMapState } = await import('../src/utils/strategic-map.js');

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function noop() {}

async function main() {
  await dbService.ready;
  const resourceManager = new ResourceManager();

  const state = new GameState('smoke_game');
  const ai1 = new AIState('ai_1', 'Alpha', 'balanced');
  const ai2 = new AIState('ai_2', 'Beta', 'aggressive');

  ai1.color = '#f00';
  ai2.color = '#0f0';
  state.aiStates = [ai1, ai2];
  state.planets = [
    {
      id: 'p1',
      name: 'Home Alpha',
      type: 'home',
      owner: 'ai_1',
      position: { x: 100, y: 100 },
      resources: { metal: 1000, energy: 1000, population: 500 },
      buildings: { mine: 1, powerPlant: 1, shipyard: 1, defense: 1, lab: 1 },
      defenseValue: 100,
      buildQueue: [],
      shipBuildQueue: []
    },
    {
      id: 'p2',
      name: 'Home Beta',
      type: 'home',
      owner: 'ai_2',
      position: { x: 200, y: 200 },
      resources: { metal: 800, energy: 900, population: 400 },
      buildings: { mine: 1, powerPlant: 1, shipyard: 1, defense: 1, lab: 1 },
      defenseValue: 100,
      buildQueue: [],
      shipBuildQueue: []
    },
    {
      id: 'p3',
      name: 'Rich Node',
      type: 'resource',
      owner: 'ai_1',
      position: { x: 300, y: 180 },
      production: { metalPerSecond: 9, energyPerSecond: 4, populationPerSecond: 0.2 },
      resources: { metal: 50, energy: 50, population: 20 },
      buildings: { mine: 0, powerPlant: 0, shipyard: 0, defense: 0, lab: 0 },
      defenseValue: 40,
      buildQueue: [],
      shipBuildQueue: []
    }
  ];
  state.fleets = [
    {
      id: 'fleet_a1',
      owner: 'ai_1',
      position: { x: 100, y: 100 },
      destination: null,
      targetPlanet: null,
      status: 'idle',
      ships: { scout: 2, frigate: 1 },
      totalPower: 30,
      speed: 5
    },
    {
      id: 'fleet_a2',
      owner: 'ai_2',
      position: { x: 200, y: 200 },
      destination: null,
      targetPlanet: null,
      status: 'idle',
      ships: { scout: 1, frigate: 2 },
      totalPower: 45,
      speed: 5
    }
  ];

  const diplomacy = new DiplomacySystem(state);
  diplomacy.acceptAlliance('ai_1', 'ai_2', 7200000);

  const intelligence = new IntelligenceSystem(state);
  intelligence.initialize();

  const richProduction = resourceManager.calculateProduction(state.planets[2], state);
  assert(Math.abs(richProduction.metal - (9 * 0.88)) < 0.0001, '超级资源星未基于 planet.production 和全局节奏系数计算产出');
  ensureMapTopology(state);
  assert(Array.isArray(state.mapMeta?.lanes) && state.mapMeta.lanes.length > 0, '旧存档状态未自动回填地图航道拓扑');

  autoSaveManager.start(state, 999999);
  const startupSnapshot = dbService.getLatestSnapshot(state.gameId);
  assert(startupSnapshot, '自动保存启动时未立即写入基线快照');
  autoSaveManager.stop();

  assert(ai1.intel.fleets.fleet_a2, '联盟视野未共享舰队情报给 ai_1');
  assert(ai2.intel.fleets.fleet_a1, '联盟视野未共享舰队情报给 ai_2');

  const scoutedEvent = gameEventBus.recordWorldEvent(state, 'planet_scouted', {
    observerId: 'ai_1',
    planetId: 'p2',
    owner: 'ai_2'
  });
  assert(state.worldEvents.some(event => event.id === scoutedEvent.id), '世界事件未使用统一 ID 写入状态');

  dbService.upsertGame({
    id: state.gameId,
    status: state.status,
    start_time: state.startTime,
    end_time: null,
    current_tick: state.currentTick,
    winner: null
  });
  dbService.saveSnapshot(state.gameId, state.currentTick, state.toJSON());
  dbService.saveWorldEvents(state.gameId, state.worldEvents);

  const restored = await autoSaveManager.restore();
  assert(restored.worldEvents.some(event => event.id === scoutedEvent.id), '恢复时未从 world_events 回填事件历史');

  state.currentTick = 999999;
  const endlessLoop = new GameLoop(
    state,
    { updateResources: noop },
    { processBuildQueue: noop },
    { updateFleets: noop },
    { checkBattles: noop },
    null,
    null,
    intelligence
  );
  endlessLoop.setWebSocketService({ pushAIEliminated: noop, pushGameOver: noop, pushBettingStatus: noop });
  endlessLoop.updateEliminationsAndVictory(Date.now());
  assert(state.status === 'running', '多方存活时游戏不应因时刻过高自动结束');

  gameEventBus.recordWorldEvent(state, 'planet_captured', {
    planetId: 'p2',
    fromOwner: 'ai_2',
    toOwner: 'ai_1'
  });
  state.planets[1].owner = 'ai_1';
  state.fleets = state.fleets.filter(fleet => fleet.owner !== 'ai_2');
  intelligence.sync();

  bettingService.openBetting(state.startTime);
  const placedBet = bettingService.placeBet('client_1', 'winner', 'ai_1', 99);
  assert(placedBet.success, '下注链路校验失败');

  const loop = new GameLoop(
    state,
    { updateResources: noop },
    { processBuildQueue: noop },
    { updateFleets: noop },
    { checkBattles: noop },
    null,
    null,
    intelligence
  );
  loop.setWebSocketService({ pushAIEliminated: noop, pushGameOver: noop, pushBettingStatus: noop });
  loop.updateEliminationsAndVictory(Date.now());

  const ai2State = state.aiStates.find(ai => ai.id === 'ai_2');
  const eliminationEvent = [...state.worldEvents].reverse().find(event => event.type === 'ai_eliminated');

  assert(state.status === 'finished', '单方存活时游戏未结束');
  assert(state.winner === 'ai_1', '胜者计算错误');
  assert(ai2State?.status === 'eliminated', 'AI 淘汰状态未落地');
  assert(eliminationEvent?.data?.eliminatedBy === 'ai_1', '淘汰归因错误');
  assert(state.betResults?.[0]?.won === true, '下注结算错误');

  const populationState = new GameState('population_state');
  const popAI = new AIState('pop_ai', 'Pop', 'balanced');
  populationState.aiStates = [popAI];
  populationState.planets = [
    {
      id: 'pop_1',
      name: 'Pop Home',
      type: 'home',
      owner: 'pop_ai',
      position: { x: 100, y: 100 },
      resources: { metal: 10000, energy: 10000, population: 10 },
      buildings: { mine: 1, powerPlant: 1, shipyard: 1, defense: 1, lab: 1 },
      defenseValue: 100,
      buildQueue: [],
      shipBuildQueue: []
    }
  ];
  populationState.fleets = [
    {
      id: 'pop_fleet',
      owner: 'pop_ai',
      position: { x: 100, y: 100 },
      destination: null,
      targetPlanet: null,
      status: 'idle',
      ships: { cruiser: 1 },
      totalPower: 60,
      speed: 3
    }
  ];

  const fleetManager = new FleetManager(resourceManager);
  const blockedBuild = fleetManager.buildShips(populationState.planets[0], 'battleship', 1, populationState);
  assert(blockedBuild.success === false && blockedBuild.reason === '人口上限不足', '舰船建造未受人口上限限制');

  const occupationState = new GameState('occupation_state');
  const occAI1 = new AIState('occ_1', 'Occupier', 'aggressive');
  const occAI2 = new AIState('occ_2', 'Defender', 'defensive');
  occupationState.aiStates = [occAI1, occAI2];
  occupationState.planets = [
    {
      id: 'occ_home',
      name: 'Occupier Home',
      type: 'home',
      owner: 'occ_1',
      position: { x: 100, y: 100 },
      resources: { metal: 2000, energy: 2000, population: 400 },
      buildings: { mine: 1, powerPlant: 1, shipyard: 1, defense: 1, lab: 1 },
      defenseValue: 120,
      buildQueue: [],
      shipBuildQueue: []
    },
    {
      id: 'occ_front',
      name: 'Occupied Front',
      type: 'resource',
      owner: 'occ_2',
      position: { x: 160, y: 100 },
      production: { metalPerSecond: 4, energyPerSecond: 3, populationPerSecond: 0.12 },
      resources: { metal: 600, energy: 500, population: 120 },
      buildings: { mine: 0, powerPlant: 0, shipyard: 0, defense: 0, lab: 0 },
      defenseValue: 35,
      buildQueue: [],
      shipBuildQueue: []
    }
  ];
  occupationState.fleets = [
    {
      id: 'occ_armada',
      owner: 'occ_1',
      position: { x: 160, y: 100 },
      origin: { x: 100, y: 100 },
      currentPlanetId: null,
      destination: null,
      targetPlanet: 'occ_front',
      status: 'arrived',
      ships: { battleship: 2 },
      totalPower: 300,
      speed: 2,
      stance: 'assault',
      readiness: 1,
      supplyStatus: 'anchored'
    }
  ];

  const occupationDiplomacy = new DiplomacySystem(occupationState);
  occupationDiplomacy.declareWar('occ_1', 'occ_2');
  const occupationCombat = new CombatSystem(occupationDiplomacy, new IntelligenceSystem(occupationState));
  occupationCombat.checkBattles(occupationState);
  assert(occupationState.planets[1].owner === 'occ_1', '战斗胜利后星球未被夺取');
  assert(occupationState.planets[1].occupation && occupationState.planets[1].occupation.stability < 100, '夺取星球后未进入稳控期');
  const occupiedProduction = resourceManager.calculateProduction(occupationState.planets[1], occupationState);
  assert(occupiedProduction.metal < 4, '稳控期星球产出未下降');

  occupationState.planets[1].occupation.stability = 99;
  occupationState.fleets[0].status = 'idle';
  occupationState.fleets[0].currentPlanetId = 'occ_front';
  occupationState.fleets[0].position = { x: 160, y: 100 };
  resourceManager.updateOccupation(occupationState, 60);
  assert(!occupationState.planets[1].occupation, '稳控完成后占领状态未清除');
  assert(occupationState.worldEvents.some(event => event.type === 'occupation_secured'), '稳控完成事件未记录');

  const retreatState = new GameState('retreat_state');
  const retAI1 = new AIState('ret_1', 'Retreater', 'balanced');
  const retAI2 = new AIState('ret_2', 'Bulwark', 'defensive');
  retreatState.aiStates = [retAI1, retAI2];
  retreatState.planets = [
    {
      id: 'ret_home',
      name: 'Retreat Home',
      type: 'home',
      owner: 'ret_1',
      position: { x: 80, y: 80 },
      resources: { metal: 1000, energy: 1000, population: 200 },
      buildings: { mine: 1, powerPlant: 1, shipyard: 0, defense: 0, lab: 0 },
      defenseValue: 80,
      buildQueue: [],
      shipBuildQueue: []
    },
    {
      id: 'ret_wall',
      name: 'Bulwark Wall',
      type: 'home',
      owner: 'ret_2',
      position: { x: 160, y: 80 },
      resources: { metal: 1000, energy: 1000, population: 200 },
      buildings: { mine: 1, powerPlant: 1, shipyard: 0, defense: 2, lab: 0 },
      defenseValue: 220,
      buildQueue: [],
      shipBuildQueue: []
    }
  ];
  retreatState.fleets = [
    {
      id: 'ret_probe',
      owner: 'ret_1',
      position: { x: 160, y: 80 },
      origin: { x: 80, y: 80 },
      currentPlanetId: null,
      destination: null,
      targetPlanet: 'ret_wall',
      status: 'arrived',
      ships: { frigate: 8 },
      totalPower: 160,
      speed: 5,
      stance: 'assault',
      readiness: 1,
      supplyStatus: 'anchored'
    }
  ];
  const retreatDiplomacy = new DiplomacySystem(retreatState);
  retreatDiplomacy.declareWar('ret_1', 'ret_2');
  const retreatCombat = new CombatSystem(retreatDiplomacy, new IntelligenceSystem(retreatState));
  retreatCombat.checkBattles(retreatState);
  assert(retreatState.planets[1].owner === 'ret_2', '失利后防守方不应丢失星球');
  assert(retreatState.fleets[0].currentPlanetId === 'ret_home' || retreatState.fleets[0].position.x === 80, '战斗失利后舰队未撤回原位');

  const supplyState = new GameState('supply_state');
  const supplyAI = new AIState('sup_1', 'Supply', 'balanced');
  supplyState.aiStates = [supplyAI];
  supplyState.planets = [
    {
      id: 'sup_home',
      name: 'Supply Home',
      type: 'home',
      owner: 'sup_1',
      position: { x: 100, y: 100 },
      production: { metalPerSecond: 0, energyPerSecond: 0, populationPerSecond: 0 },
      resources: { metal: 0, energy: 0, population: 500 },
      buildings: { mine: 0, powerPlant: 0, shipyard: 0, defense: 0, lab: 0 },
      defenseValue: 50,
      buildQueue: [],
      shipBuildQueue: []
    }
  ];
  supplyState.fleets = [
    {
      id: 'sup_expedition',
      owner: 'sup_1',
      position: { x: 150, y: 150 },
      currentPlanetId: null,
      destination: { x: 500, y: 500 },
      targetPlanet: 'unknown',
      status: 'moving',
      ships: { cruiser: 1 },
      totalPower: 60,
      speed: 3,
      readiness: 1,
      routeProfile: { speedMultiplier: 0.8 }
    }
  ];
  resourceManager.updateResources(supplyState, 600);
  assert(supplyState.fleets[0].readiness < 1, '深空远征且补给不足时战备未下降');
  assert(supplyState.fleets[0].supplyStatus === 'deep_space', '舰队未被标记为深空补给状态');

  const repairState = new GameState('repair_state');
  const repairAI = new AIState('rep_ai', 'Repair', 'balanced');
  repairState.aiStates = [repairAI];
  repairState.planets = [
    {
      id: 'rep_home',
      name: 'Repair Home',
      type: 'home',
      owner: 'rep_ai',
      position: { x: 100, y: 100 },
      strategicRole: 'home_core',
      resources: { metal: 0, energy: 10000, population: 300 },
      buildings: { mine: 0, powerPlant: 0, shipyard: 2, defense: 1, lab: 0 },
      defenseValue: 100,
      buildQueue: [],
      shipBuildQueue: []
    }
  ];
  repairState.fleets = [
    {
      id: 'rep_fleet',
      owner: 'rep_ai',
      position: { x: 100, y: 100 },
      currentPlanetId: 'rep_home',
      destination: null,
      targetPlanet: null,
      status: 'idle',
      ships: { cruiser: 1 },
      totalPower: 60,
      speed: 3,
      readiness: 0.55,
      supplyStatus: 'anchored'
    }
  ];
  resourceManager.updateResources(repairState, 1200);
  assert(repairState.fleets[0].repairState === 'repairing' || repairState.fleets[0].repairState === 'ready', '后方低战备舰队未进入整补');
  assert(repairState.fleets[0].readiness > 0.55, '后方整补未提升舰队战备');
  assert(repairState.worldEvents.some(event => event.type === 'fleet_repair_started'), '舰队整补开始事件未记录');
  resourceManager.updateResources(repairState, 5000);
  assert(repairState.fleets[0].readiness >= 0.98, '长期整补后舰队战备未恢复');
  assert(repairState.worldEvents.some(event => event.type === 'fleet_repair_completed'), '舰队整补完成事件未记录');

  const laneState = new GameState('lane_state');
  const laneAI1 = new AIState('lane_1', 'Lane One', 'balanced');
  const laneAI2 = new AIState('lane_2', 'Lane Two', 'balanced');
  laneState.aiStates = [laneAI1, laneAI2];
  laneState.planets = [
    {
      id: 'lane_a',
      name: 'Lane A',
      type: 'home',
      owner: 'lane_1',
      position: { x: 100, y: 100 },
      resources: { metal: 1000, energy: 1000, population: 300 },
      buildings: { mine: 1, powerPlant: 1, shipyard: 0, defense: 0, lab: 0 },
      defenseValue: 80,
      buildQueue: [],
      shipBuildQueue: []
    },
    {
      id: 'lane_b',
      name: 'Lane B',
      type: 'resource',
      owner: 'lane_1',
      position: { x: 220, y: 100 },
      resources: { metal: 1000, energy: 1000, population: 300 },
      buildings: { mine: 0, powerPlant: 0, shipyard: 0, defense: 0, lab: 0 },
      defenseValue: 60,
      buildQueue: [],
      shipBuildQueue: []
    },
    {
      id: 'lane_c',
      name: 'Lane C',
      type: 'resource',
      owner: 'lane_2',
      position: { x: 340, y: 100 },
      resources: { metal: 1000, energy: 1000, population: 300 },
      buildings: { mine: 0, powerPlant: 0, shipyard: 0, defense: 0, lab: 0 },
      defenseValue: 60,
      buildQueue: [],
      shipBuildQueue: []
    }
  ];
  laneState.mapMeta = {
    lanes: [
      { from: 'lane_a', to: 'lane_b', tier: 'corridor', strategicWeight: 0.8, speedMultiplier: 1.18 },
      { from: 'lane_b', to: 'lane_c', tier: 'frontier', strategicWeight: 0.7, speedMultiplier: 1.08 }
    ],
    regions: [],
    rules: {}
  };
  laneState.fleets = [
    {
      id: 'lane_fleet',
      owner: 'lane_1',
      position: { x: 100, y: 100 },
      currentPlanetId: 'lane_a',
      destination: null,
      targetPlanet: null,
      status: 'idle',
      ships: { frigate: 2 },
      totalPower: 40,
      speed: 5,
      readiness: 1
    },
    {
      id: 'lane_enemy',
      owner: 'lane_2',
      position: { x: 340, y: 100 },
      currentPlanetId: 'lane_c',
      destination: { x: 220, y: 100 },
      targetPlanet: 'lane_b',
      status: 'moving',
      ships: { frigate: 1 },
      totalPower: 20,
      speed: 5,
      moveStartTime: Date.now(),
      moveEndTime: Date.now() + 60000
    }
  ];
  laneState.mapMeta.dynamic = buildStrategicMapState(laneState).laneStates ? buildStrategicMapState(laneState) : { laneStates: [], frontlines: [] };
  const laneFleetManager = new FleetManager(resourceManager);
  const securedMove = laneFleetManager.moveFleet(
    { ...laneState.fleets[0], id: 'lane_secured', currentPlanetId: 'lane_a', position: { x: 100, y: 100 }, status: 'idle' },
    laneState.planets[1],
    { ...laneState, fleets: [] }
  );
  const contestedState = structuredClone(laneState);
  contestedState.mapMeta.dynamic = buildStrategicMapState(laneState);
  const contestedFleet = { ...laneState.fleets[0], currentPlanetId: 'lane_b', position: { x: 220, y: 100 }, status: 'idle' };
  const contestedMove = laneFleetManager.moveFleet(contestedFleet, laneState.planets[2], contestedState);
  assert(contestedMove.success, '争夺航道移动命令未执行');
  assert((contestedFleet.routeProfile?.controlStatus || '') === 'contested' || (contestedFleet.routeProfile?.controlStatus || '') === 'pressured', '航道态势未写入移动剖面');
  assert(contestedFleet.etaSeconds > 0, '争夺航道 ETA 异常');
  assert(securedMove.success, '己方航道移动命令未执行');

  const recoveryState = new GameState('recovery_state');
  const recoveryAI = new AIState('rec_ai', 'Recovery', 'balanced');
  recoveryState.aiStates = [recoveryAI];
  recoveryState.planets = [
    {
      id: 'rec_home',
      name: 'Recovery Home',
      type: 'home',
      owner: 'rec_ai',
      position: { x: 100, y: 100 },
      regionId: 'sector_alpha',
      regionName: '阿尔法战区',
      strategicRole: 'home_core',
      resources: { metal: 3000, energy: 3000, population: 400 },
      buildings: { mine: 1, powerPlant: 1, shipyard: 1, defense: 2, lab: 1 },
      defenseValue: 180,
      buildQueue: [],
      shipBuildQueue: []
    },
    {
      id: 'rec_front',
      name: 'Recovery Front',
      type: 'resource',
      owner: 'rec_ai',
      position: { x: 260, y: 120 },
      regionId: 'core',
      regionName: '中央环',
      strategicRole: 'approach_gate',
      resources: { metal: 1200, energy: 900, population: 120 },
      buildings: { mine: 0, powerPlant: 0, shipyard: 0, defense: 0, lab: 0 },
      defenseValue: 60,
      buildQueue: [],
      shipBuildQueue: []
    }
  ];
  recoveryState.fleets = [
    {
      id: 'rec_worn',
      owner: 'rec_ai',
      position: { x: 260, y: 120 },
      currentPlanetId: 'rec_front',
      destination: null,
      targetPlanet: null,
      status: 'idle',
      ships: { cruiser: 1 },
      totalPower: 60,
      speed: 3,
      readiness: 0.52,
      supplyStatus: 'expedition'
    }
  ];
  recoveryState.mapMeta = { lanes: [], regions: [], rules: {} };
  const recoveryScheduler = new AIScheduler('recovery_state');
  const recoveryBiasedDecision = recoveryScheduler.applyTacticalBias('rec_ai', {}, {
    getState: () => recoveryState,
    diplomacySystem: new DiplomacySystem(recoveryState),
    buildingSystem: { startBuild: noop },
    fleetManager: new FleetManager(resourceManager),
    techSystem: new TechSystem(recoveryState, resourceManager)
  });
  assert(recoveryBiasedDecision.fleet_orders?.some(order => order.action === 'redeploy' && order.target === 'rec_home'), '低战备舰队未被调回后方整补');

  const freshState = new GameState('fresh_map');
  await initializeMap(freshState);
  assert(Array.isArray(freshState.mapMeta?.lanes) && freshState.mapMeta.lanes.length >= 40, '新地图未生成结构化航道骨架');
  assert(Array.isArray(freshState.mapMeta?.regions) && freshState.mapMeta.regions.length >= 8, '新地图未生成区域信息');

  const researchState = new GameState('research_state');
  const researchAI = new AIState('res_ai', 'Researcher', 'balanced');
  researchState.aiStates = [researchAI];
  researchState.planets = [
    {
      id: 'res_home',
      name: 'Research Home',
      type: 'home',
      owner: 'res_ai',
      position: { x: 100, y: 100 },
      resources: { metal: 5000, energy: 500, population: 200 },
      buildings: { mine: 1, powerPlant: 1, shipyard: 0, defense: 0, lab: 1 },
      defenseValue: 100,
      buildQueue: [],
      shipBuildQueue: []
    }
  ];

  const techSystem = new TechSystem(researchState, resourceManager);
  const researchStarted = techSystem.startResearch('res_ai', 'weaponUpgrade');
  assert(researchStarted.success, '研究启动失败');

  const researchStartTime = researchAI.researchQueue.startTime;
  researchState.planets[0].resources.energy = 0;
  techSystem.update(researchStartTime + 1000);
  assert(researchAI.researchQueue?.paused === true, '能源不足时研究未暂停');
  assert(researchState.worldEvents.some(event => event.type === 'research_paused'), '研究暂停事件未记录');

  researchState.planets[0].resources.energy = 1000;
  techSystem.update(researchStartTime + 2000);
  assert(researchAI.researchQueue?.paused === false, '补充能源后研究未恢复');
  assert(researchState.worldEvents.some(event => event.type === 'research_resumed'), '研究恢复事件未记录');

  const proposalState = new GameState('proposal_state');
  const dipAI1 = new AIState('dip_1', 'Dip One', 'balanced');
  const dipAI2 = new AIState('dip_2', 'Dip Two', 'aggressive');
  proposalState.aiStates = [dipAI1, dipAI2];
  proposalState.planets = [
    {
      id: 'dip_p1',
      name: 'Dip One Home',
      type: 'home',
      owner: 'dip_1',
      position: { x: 100, y: 100 },
      resources: { metal: 3000, energy: 2600, population: 300 },
      buildings: { mine: 1, powerPlant: 1, shipyard: 1, defense: 1, lab: 1 },
      defenseValue: 100,
      buildQueue: [],
      shipBuildQueue: []
    },
    {
      id: 'dip_p2',
      name: 'Dip Two Home',
      type: 'home',
      owner: 'dip_2',
      position: { x: 200, y: 200 },
      resources: { metal: 1800, energy: 2400, population: 280 },
      buildings: { mine: 1, powerPlant: 1, shipyard: 1, defense: 1, lab: 1 },
      defenseValue: 100,
      buildQueue: [],
      shipBuildQueue: []
    }
  ];

  const proposalDiplomacy = new DiplomacySystem(proposalState);
  assert(proposalDiplomacy.canAttack('dip_1', 'dip_2') === false, '中立状态下不应允许直接攻击');
  const allianceProposal = proposalDiplomacy.proposeAlliance('dip_1', 'dip_2');
  assert(allianceProposal.success && allianceProposal.proposal?.status === 'pending', '结盟提案未进入待处理状态');
  const allianceAccepted = proposalDiplomacy.acceptProposal(allianceProposal.proposal.id, 'dip_2');
  assert(allianceAccepted.success, '结盟提案未被正确接受');
  assert(proposalDiplomacy.getRelation('dip_1', 'dip_2').status === 'ally', '结盟接受后外交状态错误');
  assert(proposalDiplomacy.canAttack('dip_1', 'dip_2') === false, '盟友状态下不应允许攻击');

  const warDeclared = proposalDiplomacy.declareWar('dip_1', 'dip_2');
  assert(warDeclared.success, '宣战失败');
  assert(proposalDiplomacy.canAttack('dip_1', 'dip_2') === true, '宣战后应允许攻击');
  const relationKey = proposalDiplomacy.getRelationKey('dip_1', 'dip_2');
  assert(proposalDiplomacy.allianceTimers.has(relationKey) === false, '宣战后旧联盟计时器未清理');
  proposalDiplomacy.warCooldowns.set(relationKey, Date.now() - 1);
  const peaceProposal = proposalDiplomacy.proposePeace('dip_1', 'dip_2');
  assert(peaceProposal.success, '停战提案失败');
  const peaceAccepted = proposalDiplomacy.acceptProposal(peaceProposal.proposal.id, 'dip_2');
  assert(peaceAccepted.success, '停战提案未被正确接受');
  assert(proposalDiplomacy.canAttack('dip_1', 'dip_2') === false, '停战后不应继续允许攻击');
  const redeclareWar = proposalDiplomacy.declareWar('dip_1', 'dip_2');
  assert(redeclareWar.success === false, '停战后宣战冷却未生效');
  const expiringAlliance = proposalDiplomacy.proposeAlliance('dip_1', 'dip_2');
  assert(expiringAlliance.success, '用于过期测试的结盟提案未创建');
  proposalDiplomacy.cleanupProposals((expiringAlliance.proposal.expiresAt || 0) + 1);
  assert(proposalDiplomacy.getProposal(expiringAlliance.proposal.id)?.status === 'expired', '待处理外交提案未按时过期');
  const replacementAlliance = proposalDiplomacy.proposeAlliance('dip_1', 'dip_2');
  assert(replacementAlliance.success, '过期提案未释放新的外交窗口');
  proposalDiplomacy.rejectProposal(replacementAlliance.proposal.id, 'dip_2', 'smoke_cleanup');

  const renewedAlliance = proposalDiplomacy.acceptAlliance('dip_1', 'dip_2', 10);
  assert(renewedAlliance.success, '重新结盟失败');
  proposalDiplomacy.update(Date.now() + 20);
  assert(proposalDiplomacy.getRelation('dip_1', 'dip_2').status === 'neutral', '联盟到期后未恢复中立');
  assert(proposalState.worldEvents.some(event => event.type === 'alliance_expired'), '联盟到期事件未记录');

  const tradeScheduler = new AIScheduler('trade_scheduler');
  await tradeScheduler.executeStrategyDecision('dip_1', {
    diplomatic: {
      offer_trade: [{ target: 'dip_2', offer: { metal: 120 }, request: { energy: 80 } }]
    }
  }, { diplomacySystem: proposalDiplomacy });
  assert(
    proposalState.diplomacyProposals.some(proposal =>
      proposal.type === 'trade' &&
      proposal.fromAi === 'dip_1' &&
      proposal.toAi === 'dip_2' &&
      proposal.status === 'pending'
    ),
    'AI 调度器未能发起贸易提案'
  );

  const acceptedTrade = proposalDiplomacy.executeTrade('dip_1', 'dip_2', { metal: 100 }, { energy: 60 });
  assert(acceptedTrade.success, '合法贸易未执行成功');
  assert(proposalDiplomacy.getRelation('dip_1', 'dip_2').status === 'trade', '贸易执行后双方关系未进入贸易状态');
  assert(proposalState.worldEvents.some(event => event.type === 'trade_executed'), '贸易完成事件未记录');

  const surpriseTrade = proposalDiplomacy.launchSurpriseAttack('dip_1', 'dip_2');
  assert(surpriseTrade.success, '违约突袭未执行成功');
  assert(proposalDiplomacy.getRelation('dip_1', 'dip_2').status === 'war', '违约突袭后双方未进入战争状态');
  assert(proposalState.worldEvents.some(event => event.type === 'surprise_attack'), '违约突袭事件未记录');

  proposalDiplomacy.acceptPeace('dip_1', 'dip_2');
  const fracturedAlliance = proposalDiplomacy.acceptAlliance('dip_1', 'dip_2', 10);
  assert(fracturedAlliance.success, '脆弱联盟构建失败');
  proposalDiplomacy._setRelation('dip_1', 'dip_2', 'ally', Date.now(), {
    trust: 22,
    grievance: 78,
    borderTension: 84,
    treatyStability: 18,
    crisisLevel: 'fracture',
    commitmentUntil: Date.now() + 10
  });
  proposalDiplomacy.allianceTimers.set(relationKey, Date.now() + 10);
  proposalDiplomacy.update(Date.now() + 50);
  assert(proposalState.worldEvents.some(event => event.type === 'alliance_broken'), '脆弱联盟未在危机中破裂');

  const strandedState = new GameState('stranded_trade_state');
  const strandedAI = new AIState('stranded', 'Stranded', 'balanced');
  const traderAI = new AIState('trader', 'Trader', 'economic');
  strandedState.aiStates = [strandedAI, traderAI];
  strandedState.planets = [
    {
      id: 'trade_home',
      name: 'Trader Home',
      type: 'home',
      owner: 'trader',
      position: { x: 100, y: 100 },
      resources: { metal: 2000, energy: 2000, population: 300 },
      buildings: { mine: 1, powerPlant: 1, shipyard: 1, defense: 1, lab: 1 },
      defenseValue: 100,
      buildQueue: [],
      shipBuildQueue: []
    }
  ];
  const strandedDiplomacy = new DiplomacySystem(strandedState);
  const strandedTrade = strandedDiplomacy.proposeTrade('trader', 'stranded', { metal: 50 }, { energy: 10 });
  assert(strandedTrade.success === false, '失去全部星球的帝国不应参与贸易');

  const promptBuilder = new PromptBuilder('ai_1');
  const strategyPrompt = promptBuilder.buildStrategyPrompt(state, {
    getMidTermEvents: () => [],
    longTerm: { enemyPatterns: {} }
  });
  const strategyPromptText = strategyPrompt.map(message => message.content).join('\n');
  assert(strategyPromptText.includes('offer_trade'), '战略提示未明确贸易外交输出 schema');
  assert(strategyPromptText.includes('surprise_strike'), '战略提示未明确违约突袭输出 schema');
  assert(strategyPromptText.includes('已知外交气候'), '战略提示未暴露本地外交气候摘要');
  assert(strategyPromptText.includes('deception'), '战略提示未明确欺骗动作输出 schema');
  assert(strategyPromptText.includes('feint_assault'), '战略提示未明确佯攻假象机制');

  const fogScheduler = new AIScheduler('fog_scheduler');
  const fogState = new GameState('fog_state');
  const fogAI1 = new AIState('fog_1', 'Fog One', 'balanced');
  const fogAI2 = new AIState('fog_2', 'Fog Two', 'aggressive');
  fogState.aiStates = [fogAI1, fogAI2];
  fogState.planets = [
    {
      id: 'fog_home_1',
      name: 'Fog Home 1',
      type: 'home',
      owner: 'fog_1',
      position: { x: 100, y: 100 },
      resources: { metal: 2000, energy: 2000, population: 300 },
      buildings: { mine: 1, powerPlant: 1, shipyard: 1, defense: 1, lab: 1 },
      defenseValue: 100,
      buildQueue: [],
      shipBuildQueue: []
    },
    {
      id: 'fog_home_2',
      name: 'Fog Home 2',
      type: 'home',
      owner: 'fog_2',
      position: { x: 180, y: 120 },
      resources: { metal: 2000, energy: 2000, population: 300 },
      buildings: { mine: 1, powerPlant: 1, shipyard: 1, defense: 1, lab: 1 },
      defenseValue: 100,
      buildQueue: [],
      shipBuildQueue: []
    }
  ];
  fogAI1.diplomacy.fog_2 = { status: 'neutral', trust: 72, borderTension: 18, commonEnemyCount: 2 };
  fogAI1.knownAIs = [];
  fogAI1.intel.planets = {};
  fogAI1.intel.fleets = {};
  const fogBiased = fogScheduler.applyStrategicBias('fog_1', { diplomatic: {} }, fogState, {});
  assert(!Array.isArray(fogBiased.diplomatic?.ally_with) || fogBiased.diplomatic.ally_with.length === 0, '未知对象不应仅凭全局真值被拉入外交偏置');

  const surpriseScheduler = new AIScheduler('surprise_scheduler');
  const surpriseState = new GameState('surprise_state');
  const surpriseAI = new AIState('sur_1', 'Surprise One', 'balanced');
  const surpriseTarget = new AIState('sur_2', 'Surprise Two', 'diplomatic');
  surpriseState.aiStates = [surpriseAI, surpriseTarget];
  surpriseState.planets = [
    {
      id: 'sur_home_1',
      name: 'Surprise Home 1',
      type: 'home',
      owner: 'sur_1',
      position: { x: 100, y: 100 },
      resources: { metal: 1800, energy: 1600, population: 240 },
      buildings: { mine: 1, powerPlant: 1, shipyard: 1, defense: 1, lab: 1 },
      defenseValue: 100,
      buildQueue: [],
      shipBuildQueue: []
    },
    {
      id: 'sur_home_2',
      name: 'Surprise Home 2',
      type: 'home',
      owner: 'sur_2',
      position: { x: 180, y: 140 },
      resources: { metal: 1800, energy: 1600, population: 240 },
      buildings: { mine: 1, powerPlant: 1, shipyard: 1, defense: 1, lab: 1 },
      defenseValue: 100,
      buildQueue: [],
      shipBuildQueue: []
    }
  ];
  const surpriseDiplomacy = new DiplomacySystem(surpriseState);
  surpriseDiplomacy.acceptAlliance('sur_1', 'sur_2', 7200000);
  await surpriseScheduler.executeStrategyDecision('sur_1', {
    diplomatic: {
      surprise_strike: ['sur_2']
    }
  }, { diplomacySystem: surpriseDiplomacy });
  assert(surpriseDiplomacy.getRelation('sur_1', 'sur_2').status === 'war', 'AI 调度器未执行违约突袭');
  assert(surpriseState.worldEvents.some(event => event.type === 'surprise_attack'), '调度器违约突袭未写入世界事件');

  const deceptionState = new GameState('deception_state');
  const deceiverAI = new AIState('dec_1', 'Deceiver', 'opportunist');
  const victimAI = new AIState('dec_2', 'Victim', 'defensive');
  const observerAI = new AIState('dec_3', 'Observer', 'balanced');
  deceiverAI.knownAIs = ['dec_2'];
  deceptionState.aiStates = [deceiverAI, victimAI, observerAI];
  deceptionState.planets = [
    {
      id: 'dec_home',
      name: 'Deceiver Home',
      type: 'home',
      owner: 'dec_1',
      position: { x: 100, y: 100 },
      resources: { metal: 3000, energy: 3000, population: 300 },
      buildings: { mine: 1, powerPlant: 1, shipyard: 1, defense: 1, lab: 1 },
      defenseValue: 100,
      buildQueue: [],
      shipBuildQueue: []
    },
    {
      id: 'dec_target',
      name: 'Victim Gate',
      type: 'resource',
      owner: 'dec_2',
      position: { x: 320, y: 140 },
      resources: { metal: 1500, energy: 1400, population: 180 },
      buildings: { mine: 1, powerPlant: 1, shipyard: 0, defense: 1, lab: 0 },
      defenseValue: 90,
      buildQueue: [],
      shipBuildQueue: []
    },
    {
      id: 'obs_home',
      name: 'Observer Home',
      type: 'home',
      owner: 'dec_3',
      position: { x: 720, y: 720 },
      resources: { metal: 3000, energy: 3000, population: 300 },
      buildings: { mine: 1, powerPlant: 1, shipyard: 1, defense: 1, lab: 1 },
      defenseValue: 100,
      buildQueue: [],
      shipBuildQueue: []
    }
  ];
  deceptionState.fleets = [
    {
      id: 'dec_real_fleet',
      owner: 'dec_1',
      position: { x: 100, y: 100 },
      currentPlanetId: 'dec_home',
      status: 'idle',
      ships: { scout: 2, frigate: 4, cruiser: 1, battleship: 0 },
      totalPower: 150,
      readiness: 1,
      supplyStatus: 'anchored'
    }
  ];
  const deceptionScheduler = new AIScheduler('deception_scheduler');
  await deceptionScheduler.executeStrategyDecision('dec_1', {
    deception: {
      mode: 'feint_assault',
      target_ai: 'dec_2',
      target_planet: 'dec_target',
      intensity: 0.75
    }
  }, {
    getState: () => deceptionState
  });
  assert(deceiverAI.deception?.operation?.targetAi === 'dec_2', 'AI 佯动计划未写入自身状态');
  assert(deceptionState.worldEvents.some(event => event.type === 'deception_planted'), '佯动展开事件未写入世界事件');
  const deceptionIntel = new IntelligenceSystem(deceptionState);
  deceptionIntel.initialize();
  const phantomFleetIds = Object.values(victimAI.intel.fleets).filter(record => record.source === 'deception');
  assert(phantomFleetIds.length > 0, '目标 AI 未收到伪造舰队情报');
  assert(Object.values(observerAI.intel.fleets).every(record => record.source !== 'deception'), '旁观 AI 不应收到佯动伪情报');
  const phantomExpiresAt = deceiverAI.deception.operation.expiresAt;
  deceptionIntel.sync(phantomExpiresAt + 1);
  assert(!deceiverAI.deception.operation, '佯动过期后未清理自身状态');
  assert(Object.values(victimAI.intel.fleets).every(record => record.source !== 'deception'), '佯动过期后伪情报未清理');
  assert(deceptionState.worldEvents.some(event => event.type === 'deception_ended'), '佯动结束事件未记录');

  const biasState = new GameState('bias_state');
  const biasAI = new AIState('bias_ai', 'Bias', 'balanced');
  const rivalAI = new AIState('rival_ai', 'Rival', 'aggressive');
  biasState.aiStates = [biasAI, rivalAI];
  biasState.planets = [
    {
      id: 'bias_home',
      name: 'Bias Home',
      type: 'home',
      owner: 'bias_ai',
      position: { x: 100, y: 100 },
      regionId: 'sector_alpha',
      regionName: '阿尔法扇区',
      strategicRole: 'home_core',
      resources: { metal: 4000, energy: 3500, population: 400 },
      buildings: { mine: 1, powerPlant: 1, shipyard: 1, defense: 1, lab: 1 },
      defenseValue: 100,
      buildQueue: [],
      shipBuildQueue: []
    },
    {
      id: 'bias_gate',
      name: 'Bias Gate',
      type: 'resource',
      owner: 'bias_ai',
      position: { x: 200, y: 120 },
      regionId: 'core',
      regionName: '中央环',
      strategicRole: 'approach_gate',
      resources: { metal: 1200, energy: 900, population: 140 },
      buildings: { mine: 0, powerPlant: 0, shipyard: 0, defense: 0, lab: 0 },
      defenseValue: 60,
      buildQueue: [],
      shipBuildQueue: []
    },
    {
      id: 'central_ring',
      name: 'Central Ring',
      type: 'resource',
      owner: null,
      position: { x: 320, y: 140 },
      regionId: 'core',
      regionName: '中央环',
      strategicRole: 'central_hub',
      resources: { metal: 600, energy: 600, population: 80 },
      buildings: { mine: 0, powerPlant: 0, shipyard: 0, defense: 0, lab: 0 },
      defenseValue: 40,
      buildQueue: [],
      shipBuildQueue: []
    },
    {
      id: 'rival_gate',
      name: 'Rival Gate',
      type: 'resource',
      owner: 'rival_ai',
      position: { x: 420, y: 150 },
      regionId: 'sector_beta',
      regionName: '贝塔扇区',
      strategicRole: 'border_bastion',
      resources: { metal: 1000, energy: 800, population: 120 },
      buildings: { mine: 0, powerPlant: 0, shipyard: 0, defense: 1, lab: 0 },
      defenseValue: 80,
      buildQueue: [],
      shipBuildQueue: []
    }
  ];
  biasState.mapMeta = {
    lanes: [
      { from: 'bias_home', to: 'bias_gate', tier: 'spoke', strategicWeight: 0.65, speedMultiplier: 1.1 },
      { from: 'bias_gate', to: 'central_ring', tier: 'core_spoke', strategicWeight: 0.95, speedMultiplier: 1.3 },
      { from: 'central_ring', to: 'rival_gate', tier: 'central', strategicWeight: 1.0, speedMultiplier: 1.35 },
      { from: 'bias_gate', to: 'rival_gate', tier: 'frontier', strategicWeight: 0.8, speedMultiplier: 1.15 }
    ],
    regions: [],
    rules: {}
  };
  biasState.fleets = [
    {
      id: 'bias_guard',
      owner: 'bias_ai',
      position: { x: 100, y: 100 },
      currentPlanetId: 'bias_home',
      destination: null,
      targetPlanet: null,
      status: 'idle',
      ships: { frigate: 2 },
      totalPower: 40,
      speed: 5
    },
    {
      id: 'bias_spear',
      owner: 'bias_ai',
      position: { x: 100, y: 100 },
      currentPlanetId: 'bias_home',
      destination: null,
      targetPlanet: null,
      status: 'idle',
      ships: { cruiser: 1, frigate: 1 },
      totalPower: 80,
      speed: 3
    },
    {
      id: 'bias_scout',
      owner: 'bias_ai',
      position: { x: 100, y: 100 },
      currentPlanetId: 'bias_home',
      destination: null,
      targetPlanet: null,
      status: 'idle',
      ships: { scout: 1 },
      totalPower: 5,
      speed: 10
    },
    {
      id: 'rival_raider',
      owner: 'rival_ai',
      position: { x: 420, y: 150 },
      currentPlanetId: null,
      destination: { x: 200, y: 120 },
      targetPlanet: 'bias_gate',
      status: 'moving',
      ships: { frigate: 2 },
      totalPower: 40,
      speed: 5,
      moveStartTime: Date.now(),
      moveEndTime: Date.now() + 60000
    }
  ];
  biasAI.intel.planets = {
    bias_home: {
      id: 'bias_home',
      owner: 'bias_ai',
      defenseValue: 100,
      buildings: { mine: 1, powerPlant: 1, shipyard: 1, defense: 1, lab: 1 },
      lastSeenAt: Date.now(),
      lastSeenTick: 0,
      stale: false
    },
    bias_gate: {
      id: 'bias_gate',
      owner: 'bias_ai',
      defenseValue: 60,
      buildings: { mine: 0, powerPlant: 0, shipyard: 0, defense: 0, lab: 0 },
      lastSeenAt: Date.now(),
      lastSeenTick: 0,
      stale: false
    },
    central_ring: {
      id: 'central_ring',
      owner: null,
      defenseValue: 40,
      buildings: { mine: 0, powerPlant: 0, shipyard: 0, defense: 0, lab: 0 },
      lastSeenAt: Date.now(),
      lastSeenTick: 0,
      stale: false
    },
    rival_gate: {
      id: 'rival_gate',
      owner: 'rival_ai',
      defenseValue: 80,
      buildings: { mine: 0, powerPlant: 0, shipyard: 0, defense: 1, lab: 0 },
      lastSeenAt: Date.now(),
      lastSeenTick: 0,
      stale: false
    }
  };
  biasAI.intel.fleets = {
    rival_raider: {
      id: 'rival_raider',
      owner: 'rival_ai',
      position: { x: 420, y: 150 },
      status: 'moving',
      targetPlanet: 'bias_gate',
      ships: { frigate: 2 },
      totalPower: 40,
      lastSeenAt: Date.now(),
      lastSeenTick: 0,
      stale: false
    }
  };
  biasAI.knownAIs = ['rival_ai'];

  const biasDiplomacy = new DiplomacySystem(biasState);
  biasDiplomacy.declareWar('bias_ai', 'rival_ai');
  const biasFleetManager = new FleetManager(resourceManager);
  const biasTechSystem = new TechSystem(biasState, resourceManager);
  const scheduler = new AIScheduler('bias_state');
  const biasEngine = {
    getState: () => biasState,
    diplomacySystem: biasDiplomacy,
    buildingSystem: { startBuild: (planet, type) => { planet.buildQueue.push({ type }); return { success: true }; } },
    fleetManager: biasFleetManager,
    techSystem: biasTechSystem
  };

  const biasedDecision = scheduler.applyTacticalBias('bias_ai', {}, biasEngine);
  assert(biasedDecision.resource_allocation?.bias_gate?.build === 'defense', 'AI 未对受压关键节点追加防御偏置');
  assert(biasedDecision.fleet_orders?.some(order => order.action === 'defend' && order.target === 'bias_gate'), 'AI 未生成关键节点调防命令');
  assert(biasedDecision.fleet_orders?.some(order => order.target === 'central_ring' && order.action === 'contest'), 'AI 未生成中央环抢占命令');
  assert(Boolean(biasedDecision.tech_research), 'AI 在可科研时未追加科技研究偏置');

  await scheduler.executeTacticalDecision('bias_ai', {
    fleet_orders: [{ fleet_id: 'bias_guard', action: 'defend', target: 'bias_gate' }]
  }, biasEngine);
  assert(biasState.fleets.find(fleet => fleet.id === 'bias_guard')?.targetPlanet === 'bias_gate', '非 attack 舰队命令未被执行');
  assert(Boolean(biasAI.researchQueue), 'AI 执行战术决策后未真正启动研究');

  const labBiasState = new GameState('lab_bias_state');
  const labBiasAI = new AIState('lab_ai', 'Lab Bias', 'economic');
  labBiasState.aiStates = [labBiasAI];
  labBiasState.planets = [
    {
      id: 'lab_home',
      name: 'Lab Home',
      type: 'home',
      owner: 'lab_ai',
      position: { x: 100, y: 100 },
      regionId: 'sector_alpha',
      regionName: '阿尔法战区',
      strategicRole: 'home_core',
      resources: { metal: 3000, energy: 2500, population: 300 },
      buildings: { mine: 1, powerPlant: 1, shipyard: 0, defense: 1, lab: 0 },
      defenseValue: 120,
      buildQueue: [],
      shipBuildQueue: []
    }
  ];
  labBiasState.fleets = [];
  labBiasState.mapMeta = { lanes: [], regions: [], rules: {} };
  const labScheduler = new AIScheduler('lab_bias_state');
  const labEngine = {
    getState: () => labBiasState,
    diplomacySystem: new DiplomacySystem(labBiasState),
    buildingSystem: { startBuild: (planet, type) => { planet.buildQueue.push({ type }); return { success: true }; } },
    fleetManager: new FleetManager(resourceManager),
    techSystem: new TechSystem(labBiasState, resourceManager)
  };
  const labBiasedDecision = labScheduler.applyTacticalBias('lab_ai', {
    resource_allocation: {
      lab_home: { build: 'mine' }
    }
  }, labEngine);
  assert(labBiasedDecision.resource_allocation?.lab_home?.build === 'lab', 'AI 在零研究中心时未强制转向研究中心建设');

  const longRunningState = new GameState('long_running_state');
  const longAi1 = new AIState('lr_1', 'LR1', 'aggressive');
  const longAi2 = new AIState('lr_2', 'LR2', 'defensive');
  longRunningState.aiStates = [longAi1, longAi2];
  longRunningState.currentTick = 86400;
  longRunningState.planets = [
    {
      id: 'lr_p1',
      name: '长局一',
      type: 'home',
      owner: 'lr_1',
      position: { x: 100, y: 100 },
      resources: { metal: 1000, energy: 1000, population: 100 },
      buildings: { mine: 1, powerPlant: 1, shipyard: 1, defense: 1, lab: 1 },
      defenseValue: 100,
      buildQueue: [],
      shipBuildQueue: []
    },
    {
      id: 'lr_p2',
      name: '长局二',
      type: 'home',
      owner: 'lr_2',
      position: { x: 400, y: 400 },
      resources: { metal: 1000, energy: 1000, population: 100 },
      buildings: { mine: 1, powerPlant: 1, shipyard: 1, defense: 1, lab: 1 },
      defenseValue: 100,
      buildQueue: [],
      shipBuildQueue: []
    }
  ];
  const longLoop = new GameLoop(
    longRunningState,
    resourceManager,
    new BuildingSystem(resourceManager),
    new FleetManager(resourceManager),
    new CombatSystem(new DiplomacySystem(longRunningState)),
    new TechSystem(longRunningState, resourceManager),
    new DiplomacySystem(longRunningState)
  );
  longLoop.updateEliminationsAndVictory(Date.now());
  assert(longRunningState.status === 'running', '高 Tick 多方存活时仍被错误终局');

  const exileState = new GameState('exile_state');
  const exileAI = new AIState('exile_ai', 'Exile', 'aggressive');
  exileState.aiStates = [exileAI];
  exileState.planets = [];
  exileState.fleets = [{
    id: 'exile_fleet',
    owner: 'exile_ai',
    position: { x: 50, y: 50 },
    status: 'idle',
    ships: { scout: 1 },
    totalPower: 5,
    speed: 10,
    readiness: 0.4
  }];
  resourceManager.updateResources(exileState, 200);
  assert(exileState.fleets.length === 0, '失去全部星球的流亡舰队未被补给崩溃清除');

  console.log('smoke ok');
}

try {
  await main();
} finally {
  autoSaveManager.stop();
  dbService.close();
  if (fs.existsSync('./data/test-smoke.db')) {
    fs.unlinkSync('./data/test-smoke.db');
  }
}
