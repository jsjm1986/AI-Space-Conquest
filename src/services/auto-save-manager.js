import dbService from '../services/db-service.js';
import { GameState } from '../models/index.js';

class AutoSaveManager {
  constructor() {
    this.gameState = null;
    this.interval = 300000;
    this.timer = null;
  }

  start(gameState, interval) {
    this.gameState = gameState;
    if (interval) this.interval = interval;
    this.stop();
    this.saveGame(this.gameState);
    this.timer = setInterval(() => {
      this.saveGame(this.gameState);
    }, this.interval);
    console.log(`自动保存已启动，间隔：${this.interval / 1000}秒`);
  }

  saveGame(gameState) {
    try {
      dbService.upsertGame({
        id: gameState.gameId,
        status: gameState.status,
        start_time: gameState.startTime,
        end_time: gameState.endTime || null,
        current_tick: gameState.currentTick,
        winner: gameState.winner || null
      });
      dbService.saveSnapshot(gameState.gameId, gameState.currentTick, gameState.toJSON());
      dbService.saveWorldEvents(gameState.gameId, gameState.worldEvents || []);
      dbService.recordAIResources(gameState.gameId, gameState.currentTick, gameState.aiStates);
      console.log(`游戏已保存 - 时刻：${gameState.currentTick}`);
    } catch (error) {
      console.error('保存失败:', error);
    }
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  async restore() {
    await dbService.ready;
    const activeGame = dbService.getActiveGame();
    if (!activeGame) return null;

    const snapshot = dbService.getLatestSnapshot(activeGame.id);
    if (!snapshot) return null;

    const state = JSON.parse(snapshot.state_json);
    console.log(`恢复游戏 - 对局：${activeGame.id}，时刻：${state.currentTick}`);
    const restoredState = GameState.fromJSON(state);
    const persistedEvents = dbService.getWorldEvents(activeGame.id, 500);

    if (persistedEvents.length > 0) {
      restoredState.worldEvents = this.mergeWorldEvents(restoredState.worldEvents || [], persistedEvents);
    }

    restoredState.status = activeGame.status || restoredState.status;
    restoredState.currentTick = Math.max(restoredState.currentTick || 0, activeGame.current_tick || 0);
    restoredState.winner = activeGame.winner || restoredState.winner || null;
    restoredState.gameId = activeGame.id;

    return restoredState;
  }

  mergeWorldEvents(snapshotEvents, persistedEvents) {
    const merged = new Map();

    [...snapshotEvents, ...persistedEvents].forEach(event => {
      if (!event) return;

      const normalized = {
        id: event.id,
        type: event.type || event.event_type || 'unknown',
        tick: event.tick || 0,
        timestamp: event.timestamp || Date.now(),
        data: event.data || {}
      };

      const fallbackKey = `${normalized.type}:${normalized.tick}:${normalized.timestamp}:${JSON.stringify(normalized.data)}`;
      merged.set(normalized.id || fallbackKey, normalized);
    });

    return [...merged.values()]
      .sort((left, right) => (left.timestamp || 0) - (right.timestamp || 0))
      .slice(-500);
  }
}

export default new AutoSaveManager();
