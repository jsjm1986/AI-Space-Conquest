import initSqlJs from 'sql.js';
import path from 'path';
import fs from 'fs';
import { resolveProjectPath } from '../utils/project-paths.js';
import logger from '../utils/logger.js';

class DatabaseService {
  constructor(dbPath = process.env.DB_PATH || './data/game.db') {
    this.dbPath = resolveProjectPath(dbPath);
    this.db = null;
    this.SQL = null;
    this.ready = this.init();
  }

  async init() {
    const SQL = await initSqlJs();
    this.SQL = SQL;
    const dir = path.dirname(this.dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    if (fs.existsSync(this.dbPath)) {
      try {
        const buffer = fs.readFileSync(this.dbPath);
        this.db = new SQL.Database(buffer);
        this.initTables();
        const health = this.checkHealth();
        if (!health.ok) {
          this.rebuildCorruptedDatabase({
            stage: 'health_check',
            issues: health.issues
          });
        }
      } catch (error) {
        this.rebuildCorruptedDatabase({
          stage: 'open_existing',
          error: error.message
        });
      }
    } else {
      this.db = new SQL.Database();
      this.initTables();
    }

    return this;
  }

  save() {
    const data = this.db.export();
    fs.writeFileSync(this.dbPath, data);
  }

  initTables() {
    this.db.run(`
      CREATE TABLE IF NOT EXISTS games (
        id TEXT PRIMARY KEY,
        status TEXT,
        start_time INTEGER,
        end_time INTEGER,
        current_tick INTEGER,
        winner TEXT
      );

      CREATE TABLE IF NOT EXISTS game_snapshots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        game_id TEXT,
        timestamp INTEGER,
        tick INTEGER,
        state_json TEXT,
        FOREIGN KEY (game_id) REFERENCES games(id)
      );

      CREATE TABLE IF NOT EXISTS ai_memories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        game_id TEXT,
        ai_id TEXT,
        memory_type TEXT,
        timestamp INTEGER,
        content_json TEXT,
        FOREIGN KEY (game_id) REFERENCES games(id)
      );

      CREATE TABLE IF NOT EXISTS battles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        game_id TEXT,
        timestamp INTEGER,
        attacker_id TEXT,
        defender_id TEXT,
        planet_id TEXT,
        result TEXT,
        details_json TEXT,
        FOREIGN KEY (game_id) REFERENCES games(id)
      );

      CREATE TABLE IF NOT EXISTS ai_resource_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        game_id TEXT,
        tick INTEGER,
        ai_id TEXT,
        metal INTEGER,
        energy INTEGER,
        planets INTEGER,
        fleet_power INTEGER,
        timestamp INTEGER,
        FOREIGN KEY (game_id) REFERENCES games(id)
      );

      CREATE TABLE IF NOT EXISTS diplomatic_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        game_id TEXT,
        timestamp INTEGER,
        event_type TEXT,
        ai_1 TEXT,
        ai_2 TEXT,
        details_json TEXT,
        FOREIGN KEY (game_id) REFERENCES games(id)
      );

      CREATE TABLE IF NOT EXISTS world_events (
        id TEXT PRIMARY KEY,
        game_id TEXT,
        tick INTEGER,
        timestamp INTEGER,
        event_type TEXT,
        data_json TEXT,
        FOREIGN KEY (game_id) REFERENCES games(id)
      );

      CREATE INDEX IF NOT EXISTS idx_snapshots_game ON game_snapshots(game_id, timestamp);
      CREATE INDEX IF NOT EXISTS idx_memories_ai ON ai_memories(game_id, ai_id);
      CREATE INDEX IF NOT EXISTS idx_battles_game ON battles(game_id, timestamp);
      CREATE INDEX IF NOT EXISTS idx_world_events_game ON world_events(game_id, timestamp);
    `);
  }

  checkHealth() {
    const issues = [];
    const quickCheck = this.safeExec('PRAGMA quick_check(1)');

    if (quickCheck.error) {
      issues.push({ probe: 'quick_check', error: quickCheck.error.message });
    } else {
      const quickCheckValue = quickCheck.result?.[0]?.values?.[0]?.[0];
      if (quickCheckValue && quickCheckValue !== 'ok') {
        issues.push({ probe: 'quick_check', error: String(quickCheckValue) });
      }
    }

    const probes = [
      { name: 'games', sql: 'SELECT COUNT(1) AS count FROM games' },
      { name: 'game_snapshots', sql: 'SELECT COUNT(1) AS count FROM game_snapshots' },
      { name: 'ai_memories', sql: 'SELECT COUNT(1) AS count FROM ai_memories' },
      { name: 'battles', sql: 'SELECT COUNT(1) AS count FROM battles' },
      { name: 'ai_resource_history', sql: 'SELECT COUNT(1) AS count FROM ai_resource_history' },
      { name: 'diplomatic_events', sql: 'SELECT COUNT(1) AS count FROM diplomatic_events' },
      { name: 'world_events', sql: 'SELECT COUNT(1) AS count FROM world_events' }
    ];

    probes.forEach((probe) => {
      const result = this.safeExec(probe.sql);
      if (result.error) {
        issues.push({ probe: probe.name, error: result.error.message });
      }
    });

    return { ok: issues.length === 0, issues };
  }

  safeExec(sql, params = []) {
    try {
      return { result: this.db.exec(sql, params), error: null };
    } catch (error) {
      return { result: null, error };
    }
  }

  selectOneSafe(sql, params = []) {
    const { result, error } = this.safeExec(sql, params);
    if (error || !result?.[0]) {
      return null;
    }
    return this.rowToObject(result[0]);
  }

  selectManySafe(sql, params = []) {
    const { result, error } = this.safeExec(sql, params);
    if (error || !result?.[0]) {
      return [];
    }
    return this.rowsToArray(result[0]);
  }

  collectRecoverableData() {
    let game = this.selectOneSafe("SELECT * FROM games WHERE status = 'running' ORDER BY start_time DESC LIMIT 1");
    if (!game) {
      game = this.selectOneSafe('SELECT * FROM games ORDER BY start_time DESC LIMIT 1');
    }

    let snapshot = null;
    if (game?.id) {
      snapshot = this.selectOneSafe('SELECT * FROM game_snapshots WHERE game_id = ? ORDER BY timestamp DESC LIMIT 1', [game.id]);
    }
    if (!snapshot) {
      snapshot = this.selectOneSafe('SELECT * FROM game_snapshots ORDER BY timestamp DESC LIMIT 1');
    }

    const recoveredGameId = game?.id || snapshot?.game_id || null;
    const worldEvents = recoveredGameId
      ? this.selectManySafe('SELECT * FROM world_events WHERE game_id = ? ORDER BY timestamp DESC LIMIT 500', [recoveredGameId])
      : [];

    const aiMemories = recoveredGameId
      ? this.selectManySafe(
        'SELECT * FROM ai_memories WHERE game_id = ? AND memory_type = ? ORDER BY timestamp DESC',
        [recoveredGameId, 'full']
      )
      : [];

    if (!game && recoveredGameId) {
      game = {
        id: recoveredGameId,
        status: 'running',
        start_time: snapshot?.timestamp || Date.now(),
        end_time: null,
        current_tick: snapshot?.tick || 0,
        winner: null
      };
    }

    return {
      game,
      snapshot,
      worldEvents,
      aiMemories
    };
  }

  backupCorruptedDatabase() {
    if (!fs.existsSync(this.dbPath)) {
      return null;
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = `${this.dbPath}.corrupt-${timestamp}.bak`;
    fs.copyFileSync(this.dbPath, backupPath);
    return backupPath;
  }

  rebuildCorruptedDatabase(context = {}) {
    const recoveredData = this.db ? this.collectRecoverableData() : {
      game: null,
      snapshot: null,
      worldEvents: [],
      aiMemories: []
    };
    const backupPath = this.backupCorruptedDatabase();

    if (this.db) {
      try {
        this.db.close();
      } catch {
        // Ignore close errors during recovery.
      }
    }

    this.db = new this.SQL.Database();
    this.initTables();
    this.restoreRecoveredData(recoveredData);
    this.save();

    logger.warn('检测到数据库损坏，已自动备份并重建', {
      dbPath: this.dbPath,
      backupPath,
      stage: context.stage || 'unknown',
      error: context.error || null,
      issues: context.issues || [],
      recovered: {
        gameId: recoveredData.game?.id || null,
        snapshotTick: recoveredData.snapshot?.tick || null,
        worldEvents: recoveredData.worldEvents?.length || 0,
        aiMemories: recoveredData.aiMemories?.length || 0
      }
    });
  }

  restoreRecoveredData(recoveredData) {
    if (!recoveredData) {
      return;
    }

    const { game, snapshot, worldEvents, aiMemories } = recoveredData;

    if (game) {
      this.db.run(
        'INSERT OR REPLACE INTO games (id, status, start_time, end_time, current_tick, winner) VALUES (?, ?, ?, ?, ?, ?)',
        [game.id, game.status, game.start_time, game.end_time, game.current_tick, game.winner]
      );
    }

    if (snapshot) {
      this.db.run(
        'INSERT INTO game_snapshots (game_id, timestamp, tick, state_json) VALUES (?, ?, ?, ?)',
        [snapshot.game_id || game?.id, snapshot.timestamp || Date.now(), snapshot.tick || 0, snapshot.state_json]
      );
    }

    worldEvents.forEach((event) => {
      this.db.run(
        'INSERT OR IGNORE INTO world_events (id, game_id, tick, timestamp, event_type, data_json) VALUES (?, ?, ?, ?, ?, ?)',
        [
          event.id,
          event.game_id || game?.id,
          event.tick || 0,
          event.timestamp || Date.now(),
          event.event_type || event.type || 'unknown',
          event.data_json || JSON.stringify(event.data || {})
        ]
      );
    });

    const insertedAIs = new Set();
    aiMemories.forEach((memory) => {
      if (!memory.ai_id || insertedAIs.has(memory.ai_id)) {
        return;
      }
      insertedAIs.add(memory.ai_id);
      this.db.run(
        'INSERT INTO ai_memories (game_id, ai_id, memory_type, timestamp, content_json) VALUES (?, ?, ?, ?, ?)',
        [
          memory.game_id || game?.id,
          memory.ai_id,
          memory.memory_type || 'full',
          memory.timestamp || Date.now(),
          memory.content_json
        ]
      );
    });
  }

  // 游戏CRUD
  createGame(gameData) {
    this.db.run(
      'INSERT INTO games (id, status, start_time, end_time, current_tick, winner) VALUES (?, ?, ?, ?, ?, ?)',
      [gameData.id, gameData.status, gameData.start_time, gameData.end_time, gameData.current_tick, gameData.winner]
    );
    this.save();
  }

  upsertGame(gameData) {
    const existing = this.getGame(gameData.id);
    if (existing) {
      this.updateGame(gameData.id, {
        status: gameData.status,
        start_time: gameData.start_time,
        end_time: gameData.end_time,
        current_tick: gameData.current_tick,
        winner: gameData.winner
      });
      return;
    }

    this.createGame(gameData);
  }

  getGame(gameId) {
    const result = this.db.exec('SELECT * FROM games WHERE id = ?', [gameId]);
    return result[0] ? this.rowToObject(result[0]) : null;
  }

  updateGame(gameId, updates) {
    const existing = this.getGame(gameId);
    if (!existing) {
      this.createGame({
        id: gameId,
        status: updates.status || 'running',
        start_time: updates.start_time || Date.now(),
        end_time: updates.end_time || null,
        current_tick: updates.current_tick || 0,
        winner: updates.winner || null
      });
      return;
    }

    const fields = Object.keys(updates).map(k => `${k} = ?`).join(', ');
    const values = [...Object.values(updates), gameId];
    this.db.run(`UPDATE games SET ${fields} WHERE id = ?`, values);
    this.save();
  }

  getActiveGame() {
    const result = this.db.exec("SELECT * FROM games WHERE status = 'running' ORDER BY start_time DESC LIMIT 1");
    return result[0] ? this.rowToObject(result[0]) : null;
  }

  // 快照CRUD
  saveSnapshot(gameId, tick, stateJson) {
    this.db.run(
      'INSERT INTO game_snapshots (game_id, timestamp, tick, state_json) VALUES (?, ?, ?, ?)',
      [gameId, Date.now(), tick, JSON.stringify(stateJson)]
    );
    this.save();
  }

  getLatestSnapshot(gameId) {
    const result = this.db.exec('SELECT * FROM game_snapshots WHERE game_id = ? ORDER BY timestamp DESC LIMIT 1', [gameId]);
    return result[0] ? this.rowToObject(result[0]) : null;
  }

  // AI记忆CRUD
  saveMemory(gameId, aiId, memoryType, content) {
    this.db.run(
      'INSERT INTO ai_memories (game_id, ai_id, memory_type, timestamp, content_json) VALUES (?, ?, ?, ?, ?)',
      [gameId, aiId, memoryType, Date.now(), JSON.stringify(content)]
    );
    this.save();
  }

  getMemories(gameId, aiId, memoryType = null) {
    let sql = 'SELECT * FROM ai_memories WHERE game_id = ? AND ai_id = ?';
    const params = [gameId, aiId];

    if (memoryType) {
      sql += ' AND memory_type = ?';
      params.push(memoryType);
    }

    sql += ' ORDER BY timestamp DESC';
    const result = this.db.exec(sql, params);
    return result[0] ? this.rowsToArray(result[0]) : [];
  }

  saveAIMemory(gameId, aiId, memoryData) {
    this.db.run(
      'DELETE FROM ai_memories WHERE game_id = ? AND ai_id = ? AND memory_type = ?',
      [gameId, aiId, 'full']
    );
    this.db.run(
      'INSERT INTO ai_memories (game_id, ai_id, memory_type, timestamp, content_json) VALUES (?, ?, ?, ?, ?)',
      [gameId, aiId, 'full', Date.now(), JSON.stringify(memoryData)]
    );
    this.save();
  }

  loadAIMemory(gameId, aiId) {
    const result = this.db.exec(
      'SELECT content_json FROM ai_memories WHERE game_id = ? AND ai_id = ? AND memory_type = ? ORDER BY timestamp DESC LIMIT 1',
      [gameId, aiId, 'full']
    );
    if (result[0] && result[0].values[0]) {
      return JSON.parse(result[0].values[0][0]);
    }
    return null;
  }

  // 战斗日志
  saveBattle(gameId, battleData) {
    this.db.run(
      'INSERT INTO battles (game_id, timestamp, attacker_id, defender_id, planet_id, result, details_json) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [gameId, Date.now(), battleData.attacker_id, battleData.defender_id, battleData.planet_id, battleData.result, JSON.stringify(battleData.details)]
    );
    this.save();
  }

  getBattles(gameId, limit = 100) {
    const result = this.db.exec('SELECT * FROM battles WHERE game_id = ? ORDER BY timestamp DESC LIMIT ?', [gameId, limit]);
    return result[0] ? this.rowsToArray(result[0]) : [];
  }

  // 外交事件
  saveDiplomaticEvent(gameId, eventData) {
    this.db.run(
      'INSERT INTO diplomatic_events (game_id, timestamp, event_type, ai_1, ai_2, details_json) VALUES (?, ?, ?, ?, ?, ?)',
      [gameId, Date.now(), eventData.event_type, eventData.ai_1, eventData.ai_2, JSON.stringify(eventData.details)]
    );
    this.save();
  }

  getDiplomaticEvents(gameId, limit = 100) {
    const result = this.db.exec('SELECT * FROM diplomatic_events WHERE game_id = ? ORDER BY timestamp DESC LIMIT ?', [gameId, limit]);
    return result[0] ? this.rowsToArray(result[0]) : [];
  }

  saveWorldEvents(gameId, events) {
    events.forEach(event => {
      if (!event?.id) return;
      this.db.run(
        'INSERT OR IGNORE INTO world_events (id, game_id, tick, timestamp, event_type, data_json) VALUES (?, ?, ?, ?, ?, ?)',
        [event.id, gameId, event.tick || 0, event.timestamp || Date.now(), event.type || 'unknown', JSON.stringify(event.data || {})]
      );
    });
    this.save();
  }

  getWorldEvents(gameId, limit = 500) {
    const result = this.db.exec('SELECT * FROM world_events WHERE game_id = ? ORDER BY timestamp DESC LIMIT ?', [gameId, limit]);
    const rows = result[0] ? this.rowsToArray(result[0]) : [];
    return rows.map(row => ({
      id: row.id,
      game_id: row.game_id,
      tick: row.tick,
      timestamp: row.timestamp,
      type: row.event_type,
      data: this.parseJson(row.data_json, {}),
      event_type: row.event_type
    }));
  }

  // 辅助方法
  rowToObject(result) {
    const obj = {};
    result.columns.forEach((col, i) => {
      obj[col] = result.values[0][i];
    });
    return obj;
  }

  rowsToArray(result) {
    return result.values.map(row => {
      const obj = {};
      result.columns.forEach((col, i) => {
        obj[col] = row[i];
      });
      return obj;
    });
  }

  parseJson(value, fallback = null) {
    try {
      return value ? JSON.parse(value) : fallback;
    } catch {
      return fallback;
    }
  }

  close() {
    try {
      this.save();
    } catch (error) {
      logger.warn('关闭数据库时保存失败', { error: error.message });
    }

    try {
      this.db?.close();
    } catch (error) {
      logger.warn('关闭数据库失败', { error: error.message });
    }
  }

  recordAIResources(gameId, tick, aiStates) {
    aiStates.forEach(ai => {
      this.db.run(
        'INSERT INTO ai_resource_history (game_id, tick, ai_id, metal, energy, planets, fleet_power, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [gameId, tick, ai.id, Math.floor(ai.resources?.metal || 0), Math.floor(ai.resources?.energy || 0), ai.planets?.length || 0, ai.totalFleetPower || 0, Date.now()]
      );
    });
    this.save();
  }

  getAIResourceHistory(gameId, aiId) {
    const result = this.db.exec('SELECT * FROM ai_resource_history WHERE game_id = ? AND ai_id = ? ORDER BY tick', [gameId, aiId]);
    return result[0] ? this.rowsToArray(result[0]) : [];
  }
}

export default new DatabaseService();
