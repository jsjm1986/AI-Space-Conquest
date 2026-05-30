import { loadProjectEnv, resolveFromRoot } from './utils/project-paths.js';

loadProjectEnv();

const [
  expressModule,
  engineModule,
  aiModule,
  websocketServiceModule,
  gameEventBusModule,
  dbServiceModule,
  autoSaveManagerModule,
  bettingServiceModule,
  modelsModule,
  loggerModule,
  configModule
] = await Promise.all([
  import('express'),
  import('./engine/index.js'),
  import('./ai/index.js'),
  import('./services/websocket-service.js'),
  import('./services/game-event-bus.js'),
  import('./services/db-service.js'),
  import('./services/auto-save-manager.js'),
  import('./services/betting-service.js'),
  import('./models/index.js'),
  import('./utils/logger.js'),
  import('../config/game-config.js')
]);

const express = expressModule.default;
const { GameLoop } = engineModule;
const { AIScheduler } = aiModule;
const websocketService = websocketServiceModule.default;
const gameEventBus = gameEventBusModule.default;
const dbService = dbServiceModule.default;
const autoSaveManager = autoSaveManagerModule.default;
const bettingService = bettingServiceModule.default;
const { GameState } = modelsModule;
const logger = loggerModule.default;
const { GAME_CONFIG } = configModule;

class GameServer {
  constructor() {
    this.app = express();
    this.app.use(express.static(resolveFromRoot('client', 'public')));
    this.gameState = null;
    this.gameLoop = null;
    this.aiScheduler = null;
    this.unsubscribeWorldEvents = null;
    this.httpServer = null;
  }

  normalizeRecoveredGameState(gameState) {
    if (!gameState) return gameState;

    const aliveCount = gameState.aiStates.filter(ai => {
      const planetCount = gameState.planets.filter(planet => planet.owner === ai.id).length;
      const fleetCount = gameState.fleets.filter(fleet => fleet.owner === ai.id).length;
      return planetCount > 0 || fleetCount > 0;
    }).length;

    // Older saves could have been marked finished by a removed fixed-duration rule.
    if (gameState.status === 'finished' && aliveCount > 1) {
      gameState.status = 'running';
      gameState.winner = null;
      gameState.endTime = null;
      logger.warn('检测到旧版固定时长终局，已恢复为持续对局', {
        gameId: gameState.gameId,
        aliveCount
      });
    }

    return gameState;
  }

  async initialize() {
    logger.info('初始化游戏服务器...');

    await dbService.ready;

    const savedGame = await autoSaveManager.restore();
    if (savedGame) {
      const { ensureMapTopology } = await import('./engine/map-generator.js');
      this.gameState = this.normalizeRecoveredGameState(savedGame);
      ensureMapTopology(this.gameState);
      dbService.upsertGame({
        id: this.gameState.gameId,
        status: this.gameState.status,
        start_time: this.gameState.startTime,
        end_time: this.gameState.endTime || null,
        current_tick: this.gameState.currentTick,
        winner: this.gameState.winner || null
      });
      logger.info('已恢复游戏', { gameId: savedGame.gameId, tick: savedGame.currentTick });
    } else {
      this.gameState = new GameState(`game_${Date.now()}`);
      await this.initializeNewGame();
      dbService.upsertGame({
        id: this.gameState.gameId,
        status: this.gameState.status,
        start_time: this.gameState.startTime,
        end_time: null,
        current_tick: this.gameState.currentTick,
        winner: null
      });
      logger.info('创建新游戏', { gameId: this.gameState.gameId });
    }

    await this.setupGameEngine();
    await this.setupAISystem();
    this.setupWebSocket();
    this.setupAutoSave();

    logger.info('服务器初始化完成');
  }

  async initializeNewGame() {
    const { initializeMap } = await import('./engine/map-generator.js');
    this.gameState = await initializeMap(this.gameState);
  }

  async setupGameEngine() {
    const { ResourceManager, BuildingSystem, FleetManager, CombatSystem, TechSystem, DiplomacySystem, IntelligenceSystem } = await import('./engine/index.js');

    const resourceManager = new ResourceManager();
    this.intelligenceSystem = new IntelligenceSystem(this.gameState);
    this.intelligenceSystem.initialize();
    const buildingSystem = new BuildingSystem(resourceManager);
    const fleetManager = new FleetManager(resourceManager);
    fleetManager.setIntelligenceSystem(this.intelligenceSystem);
    this.diplomacySystem = new DiplomacySystem(this.gameState);
    this.combatSystem = new CombatSystem(this.diplomacySystem, this.intelligenceSystem);
    this.techSystem = new TechSystem(this.gameState, resourceManager);

    this.gameLoop = new GameLoop(
      this.gameState,
      resourceManager,
      buildingSystem,
      fleetManager,
      this.combatSystem,
      this.techSystem,
      this.diplomacySystem,
      this.intelligenceSystem
    );

    this.gameLoop.techSystem = this.techSystem;
    this.gameLoop.diplomacySystem = this.diplomacySystem;
    this.gameLoop.intelligenceSystem = this.intelligenceSystem;
    this.gameLoop.buildingSystem = buildingSystem;
    this.gameLoop.fleetManager = fleetManager;
  }

  async setupAISystem() {
    this.aiScheduler = new AIScheduler(this.gameState.gameId);
    if (this.wsService) {
      this.aiScheduler.setWebSocketService(this.wsService);
    }
    await this.aiScheduler.initialize();
  }

  setupWebSocket() {
    this.wsService = websocketService;
    websocketService.setGameEngine(this.gameLoop);
    websocketService.setAISystem(this.aiScheduler);
    this.gameLoop.setWebSocketService(websocketService);
    this.combatSystem.setWebSocketService(websocketService);
    this.aiScheduler.setWebSocketService(websocketService);
    if (!this.unsubscribeWorldEvents) {
      this.unsubscribeWorldEvents = gameEventBus.onWorldEvent((event) => {
        websocketService.emitWorldEvent(event);
      });
    }
  }

  setupAutoSave() {
    autoSaveManager.start(this.gameState, GAME_CONFIG.SAVE_INTERVAL);
  }

  start() {
    if (this.gameState.status === 'running') {
      if (this.gameState.currentTick < 10 * 60) {
        bettingService.openBetting(this.gameState.startTime);
      } else {
        bettingService.closeBetting();
      }
      this.gameLoop.start();
      this.aiScheduler.start(this.gameLoop);
    } else {
      bettingService.closeBetting();
      logger.info('恢复到非运行态游戏，未启动主循环', { status: this.gameState.status });
    }
    this.wsService?.pushBettingStatus();

    this.httpServer = this.app.listen(GAME_CONFIG.PORT || 3000, GAME_CONFIG.HOST || '0.0.0.0', () => {
      logger.info('HTTP服务器启动', {
        host: GAME_CONFIG.HOST || '0.0.0.0',
        port: GAME_CONFIG.PORT || 3000
      });
    });
    this.wsService?.start({
      server: this.httpServer,
      path: '/ws'
    });

    logger.info('游戏服务器已启动');
  }

  async shutdown() {
    logger.info('关闭游戏服务器...');
    this.gameLoop.stop();
    this.aiScheduler.stop();
    if (this.unsubscribeWorldEvents) {
      this.unsubscribeWorldEvents();
      this.unsubscribeWorldEvents = null;
    }
    this.wsService?.stop();
    if (this.httpServer) {
      await new Promise(resolve => this.httpServer.close(() => resolve()));
      this.httpServer = null;
    }
    await autoSaveManager.saveGame(this.gameState);
    await dbService.close();
    logger.info('服务器已关闭');
  }
}

const server = new GameServer();

process.on('SIGINT', async () => {
  await server.shutdown();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await server.shutdown();
  process.exit(0);
});

server.initialize().then(() => server.start()).catch(error => {
  logger.error('服务器启动失败', { error: error.message });
  process.exit(1);
});

export default server;
