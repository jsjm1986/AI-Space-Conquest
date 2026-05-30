const TECH_LABELS = {
  weaponUpgrade: "武器强化",
  shieldTech: "护盾技术",
  engineUpgrade: "引擎升级",
  miningEfficiency: "采矿效率",
  energyTech: "能源技术",
  populationGrowth: "人口增长",
  logisticsNetwork: "后勤网络",
  siegeEngineering: "攻城工程",
  fortification: "要塞化",
  sensorNetwork: "传感网络"
};

const TECH_PROFILE_GROUPS = {
  offense: {
    label: "火力攻坚",
    summary: "偏向武器、攻城与前线破防。",
    techs: ["weaponUpgrade", "siegeEngineering"]
  },
  defense: {
    label: "韧性防线",
    summary: "偏向护盾、要塞与守线韧性。",
    techs: ["shieldTech", "fortification"]
  },
  mobility: {
    label: "机动后勤",
    summary: "偏向引擎、后勤与远征维持。",
    techs: ["engineUpgrade", "logisticsNetwork"]
  },
  economy: {
    label: "资源经营",
    summary: "偏向采矿、能源与人口扩张。",
    techs: ["miningEfficiency", "energyTech", "populationGrowth"]
  },
  intel: {
    label: "传感侦察",
    summary: "偏向传感覆盖与情报保鲜。",
    techs: ["sensorNetwork"]
  }
};

const TECH_TYPE_TO_GROUP = Object.entries(TECH_PROFILE_GROUPS).reduce((map, [groupId, group]) => {
  group.techs.forEach(techType => {
    map[techType] = groupId;
  });
  return map;
}, {});

const SPECIAL_NODE_LABELS = {
  industrial_hub: "工业星",
  research_archive: "科研星",
  fortress_world: "要塞星",
  supply_nexus: "补给星",
  sensor_array: "监听星",
  arcology: "居住穹顶"
};

const RELATION_CONFIG = {
  ally: { label: "盟友", className: "ally", color: "#8df7b0" },
  war: { label: "战争", className: "war", color: "#ff7d7d" },
  neutral: { label: "中立", className: "neutral", color: "#94a1ff" },
  trade: { label: "贸易", className: "neutral", color: "#ffca75" }
};

const CRISIS_LABELS = {
  calm: "平静",
  strained: "紧张",
  crisis: "危机",
  fracture: "濒裂",
  war: "战争"
};

const SHIP_LABELS = {
  scout: "侦",
  frigate: "护",
  cruiser: "巡",
  battleship: "列"
};

const BUILDING_LABELS = {
  mine: "矿井",
  powerPlant: "电站",
  shipyard: "船坞",
  defense: "防御阵列",
  lab: "实验室"
};

const SHIP_NAME_LABELS = {
  scout: "侦察舰",
  frigate: "护卫舰",
  cruiser: "巡洋舰",
  battleship: "战列舰"
};

const PERSONALITY_LABELS = {
  aggressive: "强攻型",
  defensive: "防御型",
  economic: "经营型",
  tech: "科研型",
  diplomatic: "外交型",
  opportunist: "机会型",
  gambler: "豪赌型"
};

const FLEET_STATUS_LABELS = {
  idle: "驻防待命",
  moving: "远征机动",
  engaging: "交战中",
  destroyed: "已毁",
  unknown: "未知状态"
};

const BATTLE_RESULT_LABELS = {
  crushing_victory: "碾压胜利",
  pyrrhic_victory: "惨胜",
  victory: "胜利",
  defeat: "失利",
  stalemate: "僵持",
  draw: "平局",
  ongoing: "交战中"
};

const FLEET_STANCE_LABELS = {
  balanced: "均衡",
  assault: "强攻",
  hold: "坚守",
  intercept: "截击",
  mobile: "机动"
};

const NARRATIVE_TERM_LABELS = {
  attack: "攻击",
  defend: "调防",
  redeploy: "换防",
  contest: "争夺",
  move: "机动",
  ally: "盟友",
  allied: "盟友",
  war: "战争",
  neutral: "中立",
  trade: "贸易",
  diplomatic: "外交型",
  aggressive: "强攻型",
  defensive: "防御型",
  economic: "经营型",
  tech: "科研型",
  opportunist: "机会型",
  gambler: "豪赌型",
  military: "军事扩张",
  defense: "防御建设",
  economy: "经济发展",
  technology: "科技研发",
  diplomacy: "外交布局",
  research_started: "开始研究",
  research_completed: "完成研究",
  research_paused: "暂停研究",
  research_resumed: "恢复研究",
  fleet_repair_started: "开始整补",
  fleet_repair_completed: "整补完成",
  feint_assault: "佯攻假象",
  deception_planted: "佯动展开",
  deception_ended: "佯动结束",
  occupation_secured: "稳控完成",
  surprise_strike: "违约突袭",
  surprise_attack: "违约突袭",
  alliance_broken: "联盟破裂",
  crisis_escalated: "危机升级",
  crisis_cooled: "危机降温",
  calm: "平静",
  strained: "紧张",
  crisis: "危机",
  fracture: "濒裂",
  logisticsNetwork: "后勤网络",
  siegeEngineering: "攻城工程",
  fortification: "要塞化",
  sensorNetwork: "传感网络",
  balanced: "均衡",
  assault: "强攻",
  hold: "坚守",
  intercept: "截击",
  mobile: "机动",
  anchored: "本土补给",
  lane: "主航道补给",
  transit: "航道机动",
  outpost: "前哨补给",
  expedition: "远征补给",
  deep_space: "深空补给",
  repairing: "整补中",
  ready: "可投入",
  degraded: "缺少整补条件",
  deployed: "远征中",
  secured: "稳控航道",
  pressured: "受压航道",
  contested: "争夺航道",
  pending: "待回应",
  accepted: "已接受",
  rejected: "已拒绝",
  unknown: "未知",
  system: "系统",
  intel: "情报",
  battle: "战斗",
  tech_panel: "科技",
  diplomacy_panel: "外交",
  RATE_LIMIT: "请求过于频繁",
  server: "服务端"
};

const WORLD_SIZE = 2200;
const MAX_EVENTS = 160;
const MAX_BATTLES = 14;
const MAX_FLEETS = 16;
const MAX_PROPOSALS = 12;
const RECENT_BATTLE_WINDOW = 15 * 60 * 1000;
const DECISION_FRESH_WINDOW_MS = 3 * 60 * 1000;
const REALTIME_STALE_WARN_MS = 5 * 1000;
const REALTIME_STALE_RECONNECT_MS = 15 * 1000;
const HAPTIC_GAP_MS = 220;
const HAPTIC_ALERT_GAP_MS = 8000;
const LABEL_FONT_PRIMARY = '12px "JetBrains Mono", monospace';
const LABEL_FONT_META = '11px "JetBrains Mono", monospace';
const OVERVIEW_RAIL_WIDTH_RANGE = { min: 248, max: 420 };
const DOCK_PANEL_WIDTH_RANGE = { min: 340, max: 620 };
const LAYOUT_STORAGE_KEYS = {
  overviewRailWidth: "ui.overviewRailWidth",
  dockPanelWidth: "ui.dockPanelWidth",
  overviewRailCollapsed: "ui.overviewRailCollapsed"
};
const DOCK_CARD_META = {
  overviewCard: { title: "战略概览", subtitle: "查看帝国态势、情报覆盖与当前战场演变。" },
  focusCard: { title: "焦点情报", subtitle: "点击地图星球后，查看控制、资源与所在扇区。" },
  diplomacyCard: { title: "外交研究", subtitle: "统一查看外交矩阵、研究进度与待处理提案。" },
  operationsCard: { title: "战区动态", subtitle: "聚焦机动舰队、战斗热点与前线机动。" },
  timelineCard: { title: "时间轴", subtitle: "筛选关键事件，快速回看局势是如何形成的。" },
  interactiveCard: { title: "交互台", subtitle: "提问 AI、查看回答，并根据局势下注。" }
};

const dom = {
  connectionStatus: document.getElementById("connectionStatus"),
  gameTick: document.getElementById("gameTick"),
  gameState: document.getElementById("gameState"),
  totalPlanets: document.getElementById("totalPlanets"),
  warCount: document.getElementById("warCount"),
  bettingStatus: document.getElementById("bettingStatus"),
  overviewRail: document.getElementById("overviewRail"),
  overviewRailToggle: document.getElementById("overviewRailToggle"),
  overviewRailToggleSecondary: document.getElementById("overviewRailToggleSecondary"),
  overviewRailResizeHandle: document.getElementById("overviewRailResizeHandle"),
  overviewRailSnapshot: document.getElementById("overviewRailSnapshot"),
  overviewRailAIList: document.getElementById("overviewRailAIList"),
  strategicSnapshot: document.getElementById("strategicSnapshot"),
  intelOverview: document.getElementById("intelOverview"),
  sectorOverview: document.getElementById("sectorOverview"),
  aiList: document.getElementById("aiList"),
  askAiForm: document.getElementById("askAiForm"),
  askAiSelect: document.getElementById("askAiSelect"),
  askAiQuestion: document.getElementById("askAiQuestion"),
  askAiSubmit: document.getElementById("askAiSubmit"),
  aiAnswerBox: document.getElementById("aiAnswerBox"),
  betForm: document.getElementById("betForm"),
  betType: document.getElementById("betType"),
  betPrediction: document.getElementById("betPrediction"),
  betAmount: document.getElementById("betAmount"),
  betSubmit: document.getElementById("betSubmit"),
  betResultBox: document.getElementById("betResultBox"),
  mapSummary: document.getElementById("mapSummary"),
  zoomOutBtn: document.getElementById("zoomOutBtn"),
  fitViewBtn: document.getElementById("fitViewBtn"),
  zoomInBtn: document.getElementById("zoomInBtn"),
  canvas: document.getElementById("gameCanvas"),
  miniMapCanvas: document.getElementById("miniMapCanvas"),
  tooltip: document.getElementById("tooltip"),
  selectionPanel: document.getElementById("selectionPanel"),
  sectorPanel: document.getElementById("sectorPanel"),
  diplomacyMatrix: document.getElementById("diplomacyMatrix"),
  researchPanel: document.getElementById("researchPanel"),
  proposalPanel: document.getElementById("proposalPanel"),
  fleetList: document.getElementById("fleetList"),
  battleList: document.getElementById("battleList"),
  timelineList: document.getElementById("timelineList"),
  timelineAiFilter: document.getElementById("timelineAiFilter"),
  timelinePlanetFilter: document.getElementById("timelinePlanetFilter"),
  timelineSectorFilter: document.getElementById("timelineSectorFilter"),
  timelineKeywordFilter: document.getElementById("timelineKeywordFilter"),
  mobileDockBackdrop: document.getElementById("mobileDockBackdrop"),
  detailDock: document.getElementById("detailDock"),
  dockPanelShell: document.getElementById("dockPanelShell"),
  dockResizeHandle: document.getElementById("dockResizeHandle"),
  dockGrabber: document.getElementById("dockGrabber"),
  dockTitle: document.getElementById("dockTitle"),
  dockSubtitle: document.getElementById("dockSubtitle"),
  dockClose: document.getElementById("dockClose"),
  overviewTabSummary: document.getElementById("overviewTabSummary"),
  focusTabSummary: document.getElementById("focusTabSummary"),
  diplomacyTabSummary: document.getElementById("diplomacyTabSummary"),
  operationsTabSummary: document.getElementById("operationsTabSummary"),
  timelineTabSummary: document.getElementById("timelineTabSummary"),
  interactiveTabSummary: document.getElementById("interactiveTabSummary"),
  toggleButtons: Array.from(document.querySelectorAll(".toggle-btn")),
  filterButtons: Array.from(document.querySelectorAll(".filter-btn")),
  dockTabButtons: Array.from(document.querySelectorAll(".dock-tab")),
  dockCards: Array.from(document.querySelectorAll(".dock-card"))
};

const ctx = dom.canvas.getContext("2d");
const miniCtx = dom.miniMapCanvas.getContext("2d");

function loadStoredNumber(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key);
    if (raw == null) return fallback;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function loadStoredBoolean(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key);
    if (raw == null) return fallback;
    return raw === "1";
  } catch {
    return fallback;
  }
}

const state = {
  socket: null,
  reconnectTimer: null,
  connectionMode: "connecting",
  gameState: null,
  bettingState: null,
  lastGameStateAt: 0,
  lastRealtimeMessageAt: 0,
  selectedPlanetId: null,
  hoveredPlanetId: null,
  activeDockCardId: null,
  currentFilter: "all",
  timelineAI: "all",
  timelinePlanet: "all",
  timelineSector: "all",
  timelineKeyword: "",
  mapOptions: {
    routes: true,
    labels: true,
    sectors: true,
    theaters: true
  },
  seenWorldEventIds: new Set(),
  seenTimelineKeys: new Set(),
  latestDecisions: new Map(),
  proposalStore: new Map(),
  events: [],
  interaction: {
    aiAnswerText: "",
    betResultText: ""
  },
  haptics: {
    lastAt: 0,
    lastAlertAt: 0
  },
  layout: {
    overviewRailWidth: loadStoredNumber(LAYOUT_STORAGE_KEYS.overviewRailWidth, 320),
    dockPanelWidth: loadStoredNumber(LAYOUT_STORAGE_KEYS.dockPanelWidth, 420),
    overviewRailCollapsed: loadStoredBoolean(LAYOUT_STORAGE_KEYS.overviewRailCollapsed, false),
    mobileDockMode: "peek",
    lastDockCardId: "focusCard",
    resizingPane: null,
    drawerGesture: null
  }
};

const view = {
  centerX: WORLD_SIZE / 2,
  centerY: WORLD_SIZE / 2,
  zoom: getDefaultZoom(),
  dragging: false,
  moved: false,
  activePointerId: null,
  activePointers: new Map(),
  pinching: false,
  pinchStartDistance: 0,
  pinchStartZoom: 0,
  pinchAnchorWorld: null,
  startX: 0,
  startY: 0,
  startCenterX: WORLD_SIZE / 2,
  startCenterY: WORLD_SIZE / 2
};

const canvasMetrics = {
  width: 0,
  height: 0,
  dpr: window.devicePixelRatio || 1
};

const miniMapMetrics = {
  width: 0,
  height: 0,
  dpr: window.devicePixelRatio || 1
};

const starfield = Array.from({ length: 140 }, (_, index) => ({
  x: (Math.sin(index * 73.13) * 0.5 + 0.5) * WORLD_SIZE,
  y: (Math.cos(index * 41.17) * 0.5 + 0.5) * WORLD_SIZE,
  r: 0.7 + (index % 3) * 0.45,
  a: 0.18 + (index % 5) * 0.08
}));

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function formatNumber(value) {
  const numeric = Number(value || 0);
  if (!Number.isFinite(numeric)) return "0";
  if (Math.abs(numeric) >= 100000000) return `${(numeric / 100000000).toFixed(1)}亿`;
  if (Math.abs(numeric) >= 10000) return `${(numeric / 10000).toFixed(1)}万`;
  if (Math.abs(numeric) >= 1000) return `${(numeric / 1000).toFixed(1)}千`;
  return Math.round(numeric).toString();
}

function formatDuration(totalSeconds) {
  const seconds = Math.max(0, Math.floor(totalSeconds || 0));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remain = seconds % 60;
  if (hours > 0) return `${hours}小时 ${minutes}分`;
  if (minutes > 0) return `${minutes}分 ${remain}秒`;
  return `${remain}秒`;
}

function formatClock(totalSeconds) {
  const seconds = Math.max(0, Math.floor(totalSeconds || 0));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remain = seconds % 60;
  return [hours, minutes, remain].map(value => String(value).padStart(2, "0")).join(":");
}

function formatTimeAgo(timestamp) {
  if (!timestamp) return "刚刚";
  const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (seconds < 15) return "刚刚";
  if (seconds < 60) return `${seconds}秒前`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}分钟前`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}小时前`;
  return `${Math.floor(seconds / 86400)}天前`;
}

function formatText(text, fallback = "无") {
  if (text == null || text === "") return fallback;
  return String(text);
}

function formatResourceBundle(resources = {}) {
  return `金属 ${formatNumber(resources.metal || 0)} / 能源 ${formatNumber(resources.energy || 0)} / 人口 ${formatNumber(resources.population || 0)}`;
}

function formatShips(ships = {}) {
  const summary = Object.entries(SHIP_LABELS)
    .filter(([type]) => (ships[type] || 0) > 0)
    .map(([type, label]) => `${label}${ships[type]}`);
  return summary.length > 0 ? summary.join(" ") : "无舰船";
}

function getPlanets() {
  const planets = state.gameState?.planets || state.gameState?.starMap || [];
  return Array.isArray(planets) ? planets : [];
}

function getMapMeta() {
  return state.gameState?.mapMeta || null;
}

function getFleets() {
  const fleets = state.gameState?.fleets || [];
  return Array.isArray(fleets) ? fleets : [];
}

function getAIs() {
  const ais = state.gameState?.aiStates || state.gameState?.ais || [];
  return Array.isArray(ais) ? ais : [];
}

function getBattles() {
  const battles = state.gameState?.battles || [];
  return Array.isArray(battles) ? battles : [];
}

function markRealtimeUpdate() {
  state.lastRealtimeMessageAt = Date.now();
  if (state.socket?.readyState === WebSocket.OPEN) {
    updateConnectionStatus("connected");
  }
}

function touchGameStateUpdate() {
  state.lastGameStateAt = Date.now();
  state.lastRealtimeMessageAt = state.lastGameStateAt;
  if (state.socket?.readyState === WebSocket.OPEN) {
    updateConnectionStatus("connected");
  }
}

function ensureLocalGameState() {
  if (!state.gameState) return false;
  if (!Array.isArray(state.gameState.planets)) state.gameState.planets = [];
  if (!Array.isArray(state.gameState.fleets)) state.gameState.fleets = [];
  if (!Array.isArray(state.gameState.aiStates)) state.gameState.aiStates = [];
  if (!Array.isArray(state.gameState.battles)) state.gameState.battles = [];
  if (!Array.isArray(state.gameState.worldEvents)) state.gameState.worldEvents = [];
  if (!Array.isArray(state.gameState.diplomacyProposals)) state.gameState.diplomacyProposals = [];
  return true;
}

function setPlanetOwner(planetId, owner) {
  if (!ensureLocalGameState()) return;
  const planet = getPlanetById(planetId);
  if (planet) {
    planet.owner = owner ?? null;
  }
}

function upsertBattleRecord(battle) {
  if (!ensureLocalGameState() || !battle) return;
  const battles = state.gameState.battles;
  const key = `${battle.timestamp || 0}|${battle.attacker || ""}|${battle.defender || ""}|${battle.planet || ""}`;
  const index = battles.findIndex(item => `${item.timestamp || 0}|${item.attacker || ""}|${item.defender || ""}|${item.planet || ""}` === key);
  if (index >= 0) {
    battles[index] = { ...battles[index], ...battle };
  } else {
    battles.push({ ...battle });
  }
}

function setDiplomacyRelation(fromAi, toAi, relationInput) {
  if (!ensureLocalGameState() || !fromAi || !toAi) return;
  const relation = normalizeRelationSnapshot(relationInput, typeof relationInput === "string" ? relationInput : "neutral");
  const left = getAIById(fromAi);
  const right = getAIById(toAi);
  if (left) {
    left.diplomacy = left.diplomacy && typeof left.diplomacy === "object" ? left.diplomacy : {};
    left.diplomacy[toAi] = { ...normalizeRelationSnapshot(left.diplomacy[toAi]), ...relation };
  }
  if (right) {
    right.diplomacy = right.diplomacy && typeof right.diplomacy === "object" ? right.diplomacy : {};
    right.diplomacy[fromAi] = { ...normalizeRelationSnapshot(right.diplomacy[fromAi]), ...relation };
  }
}

function upsertResearchQueue(aiId, patch) {
  if (!ensureLocalGameState() || !aiId) return;
  const ai = getAIById(aiId);
  if (!ai) return;
  ai.researchQueue = {
    ...(ai.researchQueue || {}),
    ...patch
  };
}

function clearResearchQueue(aiId, techType, level) {
  if (!ensureLocalGameState() || !aiId) return;
  const ai = getAIById(aiId);
  if (!ai) return;
  if (!ai.tech || typeof ai.tech !== "object") {
    ai.tech = {};
  }
  if (techType) {
    ai.tech[techType] = Math.max(ai.tech[techType] || 0, level || 0);
  }
  ai.researchQueue = null;
}

function applyWorldEventToLocalState(event) {
  if (!ensureLocalGameState() || !event) return;
  const type = event.type || "system";
  const data = event.data || {};

  if (type === "battle_resolved") {
    upsertBattleRecord({
      attacker: data.attacker,
      defender: data.defender,
      planet: data.planet,
      result: data.result,
      captured: Boolean(data.captured),
      attackPower: data.attackPower,
      defensePower: data.defensePower,
      attackerStance: data.attackerStance,
      attackerReadiness: data.attackerReadiness,
      occupationStability: data.occupationStability,
      timestamp: data.timestamp || event.timestamp
    });
  }

  if (type === "planet_captured") {
    setPlanetOwner(data.planetId, data.toOwner);
    const planet = getPlanetById(data.planetId);
    if (planet) {
      planet.occupation = {
        owner: data.toOwner,
        previousOwner: data.fromOwner ?? null,
        stability: data.occupationStability ?? 30,
        garrisonPower: planet.occupation?.garrisonPower ?? 0,
        startedAt: data.timestamp || event.timestamp || Date.now(),
        lastUpdatedAt: data.timestamp || event.timestamp || Date.now()
      };
    }
  }

  if (type === "occupation_secured") {
    const planet = getPlanetById(data.planetId);
    if (planet) {
      planet.occupation = null;
    }
  }

  if (type === "war_declared") {
    setDiplomacyRelation(data.fromAi, data.toAi, { status: "war", crisisLevel: "war" });
  }

  if (type === "alliance_formed") {
    setDiplomacyRelation(data.fromAi, data.toAi, { status: "ally", crisisLevel: "calm" });
  }

  if (type === "alliance_expired" || type === "alliance_broken") {
    setDiplomacyRelation(data.fromAi, data.toAi, { status: "neutral", crisisLevel: type === "alliance_broken" ? "strained" : "calm" });
  }

  if (type === "peace_signed") {
    setDiplomacyRelation(data.fromAi, data.toAi, { status: "neutral", crisisLevel: "strained" });
  }

  if (type === "trade_executed") {
    const currentStatus = getRelationStatus(getAIById(data.fromAi), data.toAi);
    setDiplomacyRelation(data.fromAi, data.toAi, { status: currentStatus === "ally" ? "ally" : "trade", crisisLevel: "strained" });
    resolveProposalByPair("trade", data.fromAi, data.toAi, "accepted");
  }

  if (type === "surprise_attack") {
    setDiplomacyRelation(data.fromAi, data.toAi, { status: "war", crisisLevel: "war", grievance: 100, borderTension: 100 });
  }

  if (type === "crisis_escalated" || type === "crisis_cooled") {
    setDiplomacyRelation(data.fromAi, data.toAi, {
      status: getRelationStatus(getAIById(data.fromAi), data.toAi),
      crisisLevel: data.crisisLevel,
      borderTension: data.borderTension,
      grievance: data.grievance
    });
  }

  if (type === "research_started") {
    upsertResearchQueue(data.aiId, {
      techType: data.techType,
      level: data.level,
      startTime: data.timestamp || event.timestamp || Date.now(),
      lastUpdatedAt: data.timestamp || event.timestamp || Date.now(),
      totalTimeMs: data.totalTimeMs ?? null,
      remainingTimeMs: data.remainingTimeMs ?? null,
      energyRemaining: data.energyRemaining ?? data.energyCost ?? null,
      totalEnergyCost: data.totalEnergyCost ?? data.energyCost ?? null,
      paused: false,
      pauseReason: null
    });
  }

  if (type === "research_paused") {
    upsertResearchQueue(data.aiId, {
      techType: data.techType,
      level: data.level,
      remainingTimeMs: data.remainingTimeMs ?? null,
      energyRemaining: data.energyRemaining ?? null,
      paused: true,
      pauseReason: "energy_shortage",
      lastUpdatedAt: data.timestamp || event.timestamp || Date.now()
    });
  }

  if (type === "research_resumed") {
    upsertResearchQueue(data.aiId, {
      techType: data.techType,
      level: data.level,
      remainingTimeMs: data.remainingTimeMs ?? null,
      energyRemaining: data.energyRemaining ?? null,
      paused: false,
      pauseReason: null,
      lastUpdatedAt: data.timestamp || event.timestamp || Date.now()
    });
  }

  if (type === "research_completed") {
    clearResearchQueue(data.aiId, data.techType, data.level);
  }

  if (type === "fleet_repair_started" || type === "fleet_repair_completed") {
    const fleet = getFleets().find(item => item.id === data.fleetId);
    if (fleet) {
      fleet.repairState = type === "fleet_repair_started" ? "repairing" : "ready";
      fleet.repairLabel = type === "fleet_repair_started" ? (data.repairLabel || "整补中") : "整补完成";
      if (data.readiness != null) {
        fleet.readiness = data.readiness;
      }
      if (type === "fleet_repair_completed") {
        fleet.repairEtaSeconds = 0;
      }
    }
  }

  if (type === "ai_eliminated") {
    const ai = getAIById(data.aiId);
    if (ai) {
      ai.status = "eliminated";
      ai.eliminatedAt = data.timestamp || event.timestamp || Date.now();
    }
  }
}

function getAIById(aiId) {
  return getAIs().find(ai => ai.id === aiId) || null;
}

function getAIName(aiId) {
  if (!aiId) return "中立势力";
  const ai = getAIById(aiId);
  if (ai?.name) return ai.name;
  const match = /^ai_(\d+)$/i.exec(String(aiId));
  return match ? `第${Number(match[1])}帝国` : String(aiId);
}

function getAIColor(aiId) {
  return getAIById(aiId)?.color || "#7fb9d1";
}

function getPlanetById(planetId) {
  return getPlanets().find(planet => planet.id === planetId) || null;
}

function getPlanetName(planetId) {
  const planet = getPlanetById(planetId);
  if (planet?.name) return planet.name;
  const match = /^planet_(\d+)$/i.exec(String(planetId || ""));
  return match ? `${Number(match[1])}号星球` : (planetId || "未知星球");
}

function getFleetLabel(fleetId) {
  if (!fleetId) return "舰队";
  const match = /^fleet_(\d+)$/i.exec(String(fleetId));
  return match ? `第${Number(match[1])}舰队` : String(fleetId);
}

function getPersonalityLabel(personality) {
  return PERSONALITY_LABELS[personality] || sanitizeNarrativeText(personality || "", "未知流派");
}

function getFleetStatusLabel(status) {
  return FLEET_STATUS_LABELS[status] || sanitizeNarrativeText(status || "", "未知状态");
}

function getFleetStanceLabel(stance) {
  return FLEET_STANCE_LABELS[stance] || sanitizeNarrativeText(stance || "", "均衡");
}

function formatFleetReadiness(readiness) {
  const value = Number.isFinite(readiness) ? clamp(readiness, 0.35, 1.15) : 1;
  return `${Math.round(value * 100)}%`;
}

function getFleetRepairLabel(fleet) {
  return sanitizeNarrativeText(fleet?.repairLabel || fleet?.repairState || "可投入", "可投入");
}

function getBattleResultLabel(result) {
  return BATTLE_RESULT_LABELS[result] || sanitizeNarrativeText(result || "", "交战");
}

function describeBattleHeadline(battle) {
  if (!battle) return "暂无战报";
  const attacker = getAIName(battle.attacker);
  const defender = getAIName(battle.defender);
  const planet = getPlanetName(battle.planet);
  if (battle.captured) {
    return `${attacker} 在 ${planet} 击败 ${defender} 并夺取星球`;
  }
  if (battle.result === "defeat") {
    return `${attacker} 在 ${planet} 进攻失利，${defender} 守住阵地`;
  }
  if (battle.result === "stalemate" || battle.result === "draw") {
    return `${attacker} 与 ${defender} 在 ${planet} 激战后僵持`;
  }
  return `${attacker} 在 ${planet} 与 ${defender} 爆发战斗`;
}

function getTechLabel(techType) {
  return TECH_LABELS[techType] || sanitizeNarrativeText(techType || "", "科技");
}

function getProposalTypeLabel(type) {
  return { alliance: "结盟", peace: "停战", trade: "贸易" }[type] || sanitizeNarrativeText(type || "", "提案");
}

function getProposalStatusLabel(status) {
  if (status === "pending") return "待回应";
  if (status === "accepted") return "已接受";
  if (status === "rejected") return "已拒绝";
  if (status === "expired") return "已过期";
  return sanitizeNarrativeText(status || "", "未知状态");
}

function replaceTermMaps(text) {
  let value = String(text ?? "");

  value = value.replace(/\b(ai_\d+)\b/gi, (match) => getAIName(match));
  value = value.replace(/\b(planet_\d+)\b/gi, (match) => getPlanetName(match));
  value = value.replace(/\b(fleet_\d+)\b/gi, (match) => getFleetLabel(match));

  value = value.replace(/\b(scout|frigate|cruiser|battleship)\s*x\s*(\d+)\b/gi, (_, shipType, count) => `${SHIP_NAME_LABELS[shipType] || shipType}x${count}`);
  value = value.replace(/\b(scout|frigate|cruiser|battleship)x(\d+)\b/gi, (_, shipType, count) => `${SHIP_NAME_LABELS[shipType] || shipType}x${count}`);

  for (const [key, label] of Object.entries(SHIP_NAME_LABELS)) {
    value = value.replace(new RegExp(`\\b${key}\\b`, "gi"), label);
  }
  for (const [key, label] of Object.entries(BUILDING_LABELS)) {
    value = value.replace(new RegExp(`\\b${key}\\b`, "gi"), label);
  }
  for (const [key, label] of Object.entries(TECH_LABELS)) {
    value = value.replace(new RegExp(`\\b${key}\\b`, "gi"), label);
  }
  for (const [key, label] of Object.entries(PERSONALITY_LABELS)) {
    value = value.replace(new RegExp(`\\b${key}\\b`, "gi"), label);
  }
  for (const [key, label] of Object.entries(NARRATIVE_TERM_LABELS)) {
    value = value.replace(new RegExp(`\\b${key}\\b`, "gi"), label);
  }

  value = value.replace(/\bETA\b/gi, "抵达倒计时");
  value = value.replace(/\bTick\b/gi, "时刻");
  value = value.replace(/\bLv\b/gi, "等级");
  value = value.replace(/\bvs\b/gi, "对阵");
  value = value.replace(/\s+\|\s+/g, "；");
  value = value.replace(/\s+\/\s+/g, " / ");
  value = value.replace(/\s{2,}/g, " ").trim();

  return value;
}

function sanitizeNarrativeText(text, fallback = "无") {
  if (text == null || text === "") return fallback;
  return replaceTermMaps(text);
}

function normalizeRelationSnapshot(relation, fallbackStatus = "neutral") {
  if (typeof relation === "string") {
    return { status: relation };
  }
  if (!relation || typeof relation !== "object") {
    return { status: fallbackStatus };
  }
  return {
    status: relation.status || fallbackStatus,
    trust: relation.trust,
    fear: relation.fear,
    grievance: relation.grievance,
    dependency: relation.dependency,
    borderTension: relation.borderTension,
    treatyStability: relation.treatyStability,
    crisisLevel: relation.crisisLevel || "calm",
    commitmentUntil: relation.commitmentUntil ?? null
  };
}

function relationInfo(status) {
  return RELATION_CONFIG[status] || RELATION_CONFIG.neutral;
}

function getRelationDisplayLabel(relation) {
  const snapshot = normalizeRelationSnapshot(relation);
  const base = relationInfo(snapshot.status).label;

  if (snapshot.status === "neutral") {
    if (snapshot.crisisLevel === "fracture") return "中立·濒裂";
    if (snapshot.crisisLevel === "crisis") return "中立·危机";
    if (snapshot.crisisLevel === "strained") return "中立·紧张";
  }

  if ((snapshot.status === "ally" || snapshot.status === "trade") &&
    Number.isFinite(snapshot.treatyStability) &&
    snapshot.treatyStability < 40) {
    return `${base}·脆弱`;
  }

  return base;
}

function getCrisisLabel(level) {
  return CRISIS_LABELS[level] || sanitizeNarrativeText(level || "", "未知");
}

function getRelationSnapshot(ai, targetId) {
  return normalizeRelationSnapshot(ai?.diplomacy?.[targetId]);
}

function getRelationStatus(ai, targetId) {
  return getRelationSnapshot(ai, targetId).status;
}

function formatRelationMetrics(relation) {
  const snapshot = normalizeRelationSnapshot(relation);
  const metrics = [];
  if (snapshot.crisisLevel) metrics.push(`危机 ${getCrisisLabel(snapshot.crisisLevel)}`);
  if (Number.isFinite(snapshot.trust)) metrics.push(`信任 ${snapshot.trust}`);
  if (Number.isFinite(snapshot.fear)) metrics.push(`恐惧 ${snapshot.fear}`);
  if (Number.isFinite(snapshot.borderTension)) metrics.push(`紧张 ${snapshot.borderTension}`);
  if (Number.isFinite(snapshot.grievance)) metrics.push(`旧怨 ${snapshot.grievance}`);
  if (Number.isFinite(snapshot.dependency)) metrics.push(`依赖 ${snapshot.dependency}`);
  if (snapshot.status === "ally" || snapshot.status === "trade") {
    if (Number.isFinite(snapshot.treatyStability)) metrics.push(`稳定 ${snapshot.treatyStability}`);
    if (snapshot.commitmentUntil) metrics.push(`约束剩余 ${formatDuration(Math.max(0, (snapshot.commitmentUntil - Date.now()) / 1000))}`);
  }
  return metrics.join(" · ");
}

function techAverage(ai) {
  const values = Object.values(ai?.tech || {});
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + (Number(value) || 0), 0) / values.length;
}

function computeFleetPower(fleet) {
  if (!fleet) return 0;
  if (Number.isFinite(fleet.totalPower)) return fleet.totalPower;
  const ships = fleet.ships || {};
  return (ships.scout || 0) * 5 +
    (ships.frigate || 0) * 20 +
    (ships.cruiser || 0) * 60 +
    (ships.battleship || 0) * 150;
}

function getAIWarAndAllianceCounts(ai) {
  return Object.entries(ai?.diplomacy || {}).reduce((totals, [, relation]) => {
    const status = typeof relation === "string" ? relation : relation?.status || "neutral";
    if (status === "war") totals.wars += 1;
    if (status === "ally") totals.allies += 1;
    if (status === "trade") totals.trade += 1;
    return totals;
  }, { wars: 0, allies: 0, trade: 0 });
}

function getEmpireDisplayOrder(ai) {
  const id = String(ai?.id || "");
  const numeric = Number.parseInt((id.match(/(\d+)/) || [])[1] || "", 10);
  if (Number.isFinite(numeric)) return numeric;
  return Number.MAX_SAFE_INTEGER;
}

function getEmpireMarker(ai) {
  const numeric = getEmpireDisplayOrder(ai);
  return Number.isFinite(numeric) && numeric !== Number.MAX_SAFE_INTEGER
    ? `帝国 ${numeric}`
    : "帝国";
}

function getRankedAIs() {
  return [...getAIs()]
    .map(ai => ({ ...ai }))
    .sort((left, right) => {
      const leftDead = left.status === "eliminated" ? 1 : 0;
      const rightDead = right.status === "eliminated" ? 1 : 0;
      if (leftDead !== rightDead) return leftDead - rightDead;
      const byOrder = getEmpireDisplayOrder(left) - getEmpireDisplayOrder(right);
      if (byOrder !== 0) return byOrder;
      return String(left.name || left.id || "").localeCompare(String(right.name || right.id || ""), "zh-CN");
    });
}

function getLiveSituation() {
  if (!state.gameState) {
    return { label: "等待数据", accent: "正在等待实时状态同步。" };
  }

  if (state.gameState.status === "finished") {
    return { label: "胜负已定", accent: `${getAIName(state.gameState.winner)} 已成为最后的存活帝国。` };
  }

  if (state.gameState.status === "paused") {
    return { label: "已暂停", accent: "对局当前暂停，战场状态暂不推进。" };
  }

  const activeAIs = getAIs().filter(ai => ai.status !== "eliminated").length;
  const movingFleets = getFleets().filter(fleet => fleet.status === "moving").length;
  const recentBattles = getBattles().filter(battle => (Date.now() - (battle.timestamp || 0)) <= RECENT_BATTLE_WINDOW).length;
  const wars = Math.round(getAIs().reduce((count, ai) => count + getAIWarAndAllianceCounts(ai).wars, 0) / 2);

  if (activeAIs <= 2) {
    return { label: "最后决战", accent: "场上只剩极少数强权，战局将以最后幸存者结束。" };
  }
  if (recentBattles >= 3 || wars >= 3) {
    return { label: "全面交战", accent: "多条战线正在同时爆发，关键节点和边境星持续易手。" };
  }
  if (movingFleets >= 6) {
    return { label: "扩张机动", accent: "多支舰队在主航道和中央环附近穿插，版图仍在快速变化。" };
  }
  return { label: "持续对局", accent: "本局没有固定结束时长，直到只剩一个存活帝国才结束。" };
}

function getGamePhaseLabel() {
  return getLiveSituation().label;
}

function syncLatestDecisionsFromState() {
  const next = new Map();
  const incoming = Array.isArray(state.gameState?.latestAIDecisions) ? state.gameState.latestAIDecisions : [];
  incoming.forEach(decision => {
    if (!decision?.aiId) return;
    const previous = state.latestDecisions.get(decision.aiId);
    if (previous && (previous.timestamp || 0) > (decision.timestamp || 0)) {
      next.set(decision.aiId, previous);
      return;
    }
    next.set(decision.aiId, {
      aiId: decision.aiId,
      type: decision.type,
      summary: sanitizeNarrativeText(decision.focus || decision.actions || "更新策略"),
      reasoning: sanitizeNarrativeText(decision.reasoning || "", ""),
      timestamp: decision.timestamp || Date.now()
    });
  });
  state.latestDecisions = next;
}

function isMobileViewport() {
  return window.matchMedia("(max-width: 960px)").matches;
}

function isCoarsePointer() {
  return window.matchMedia("(pointer: coarse)").matches;
}

function hasDesktopOverviewRail() {
  return window.matchMedia("(min-width: 1280px)").matches;
}

function clampOverviewRailWidth(width) {
  return clamp(width, OVERVIEW_RAIL_WIDTH_RANGE.min, OVERVIEW_RAIL_WIDTH_RANGE.max);
}

function clampDockPanelWidth(width) {
  return clamp(width, DOCK_PANEL_WIDTH_RANGE.min, DOCK_PANEL_WIDTH_RANGE.max);
}

function persistLayoutPreferences() {
  try {
    window.localStorage.setItem(LAYOUT_STORAGE_KEYS.overviewRailWidth, String(state.layout.overviewRailWidth));
    window.localStorage.setItem(LAYOUT_STORAGE_KEYS.dockPanelWidth, String(state.layout.dockPanelWidth));
    window.localStorage.setItem(LAYOUT_STORAGE_KEYS.overviewRailCollapsed, state.layout.overviewRailCollapsed ? "1" : "0");
  } catch {
    // Ignore storage failures in private browsing or restrictive environments.
  }
}

function applyLayoutPreferences() {
  state.layout.overviewRailWidth = clampOverviewRailWidth(state.layout.overviewRailWidth);
  state.layout.dockPanelWidth = clampDockPanelWidth(state.layout.dockPanelWidth);
  document.documentElement.style.setProperty("--overview-rail-width", `${state.layout.overviewRailWidth}px`);
  document.documentElement.style.setProperty("--dock-panel-width", `${state.layout.dockPanelWidth}px`);
  document.body.classList.toggle("overview-rail-collapsed", hasDesktopOverviewRail() && state.layout.overviewRailCollapsed);
  if (dom.overviewRailToggle) {
    dom.overviewRailToggle.textContent = state.layout.overviewRailCollapsed ? "展开" : "收起";
  }
  if (dom.overviewRailToggleSecondary) {
    dom.overviewRailToggleSecondary.textContent = state.layout.overviewRailCollapsed ? "展开总览" : "收起总览";
  }
}

function getMobilePeekHeight() {
  return window.innerWidth <= 640 ? 196 : 228;
}

function clearDockPanelInlineState() {
  dom.dockPanelShell.style.transform = "";
  dom.dockPanelShell.style.transition = "";
}

function setMobileDockMode(mode) {
  state.layout.mobileDockMode = mode === "full" ? "full" : "peek";
}

function toggleOverviewRail() {
  state.layout.overviewRailCollapsed = !state.layout.overviewRailCollapsed;
  persistLayoutPreferences();
  applyLayoutPreferences();
  resizeCanvas();
  renderDockState();
}

function getDefaultZoom() {
  return isMobileViewport() ? 0.78 : 0.9;
}

function closeDockCard() {
  if (state.activeDockCardId) {
    state.layout.lastDockCardId = state.activeDockCardId;
  }
  state.activeDockCardId = null;
  setMobileDockMode("full");
  renderDockState();
}

function openDockCard(cardId, options = {}) {
  if (!DOCK_CARD_META[cardId]) return;
  state.activeDockCardId = cardId;
  state.layout.lastDockCardId = cardId;
  if (isMobileViewport()) {
    setMobileDockMode("full");
  } else {
    setMobileDockMode("full");
  }
  renderDockState();
}

function toggleDockCard(cardId) {
  if (isMobileViewport()) {
    if (state.activeDockCardId !== cardId) {
      openDockCard(cardId, { mode: "full" });
      return;
    }
    closeDockCard();
    return;
  }

  if (state.activeDockCardId === cardId) {
    closeDockCard();
    return;
  }
  openDockCard(cardId, { mode: "full" });
}

function renderDockState() {
  if (hasDesktopOverviewRail() && state.activeDockCardId === "overviewCard") {
    state.activeDockCardId = null;
  }

  const activeCardId = state.activeDockCardId;
  const meta = DOCK_CARD_META[activeCardId] || {
    title: "信息卡",
    subtitle: "点击右侧标签查看详细信息，默认收起以释放地图空间。"
  };

  const mobileActive = isMobileViewport() && Boolean(activeCardId);
  document.body.classList.toggle("dock-open", Boolean(activeCardId));
  document.body.classList.toggle("dock-peek", mobileActive && state.layout.mobileDockMode === "peek");
  document.body.classList.toggle("dock-full", mobileActive && state.layout.mobileDockMode === "full");
  dom.detailDock.classList.toggle("expanded", Boolean(activeCardId));
  dom.dockTitle.textContent = meta.title;
  dom.dockSubtitle.textContent = meta.subtitle;
  dom.dockTabButtons.forEach(button => {
    button.classList.toggle("active", button.dataset.cardTarget === activeCardId);
  });
  dom.dockCards.forEach(card => {
    card.classList.toggle("active", card.id === activeCardId);
  });
  dom.dockClose.style.visibility = activeCardId ? "visible" : "hidden";
  if (!state.layout.drawerGesture) {
    clearDockPanelInlineState();
  }
}

function renderToTargets(targets, html) {
  targets.filter(Boolean).forEach(target => {
    target.innerHTML = html;
  });
}

function getDecisionSummary(decision) {
  if (!decision) return null;

  const headline = sanitizeNarrativeText(decision.summary || decision.actions || decision.focus || "有动作");
  const reasoning = decision.reasoning ? sanitizeNarrativeText(decision.reasoning, "") : "";
  return `${headline}${reasoning ? `；${reasoning}` : ""}`;
}

function isDecisionFresh(decision) {
  if (!decision?.timestamp) return false;
  return (Date.now() - decision.timestamp) <= DECISION_FRESH_WINDOW_MS;
}

function getDecisionTypeLabel(type) {
  return type === "strategy" ? "战略" : "战术";
}

function supportsMobileHaptics() {
  return typeof navigator !== "undefined"
    && typeof navigator.vibrate === "function"
    && typeof window !== "undefined"
    && Boolean(window.matchMedia?.("(pointer: coarse)").matches);
}

function triggerHaptic(kind = "tap") {
  if (!supportsMobileHaptics()) return;
  if (document.visibilityState === "hidden") return;

  const now = Date.now();
  const isAlert = kind === "alert";
  const lastAt = isAlert ? state.haptics.lastAlertAt : state.haptics.lastAt;
  const gap = isAlert ? HAPTIC_ALERT_GAP_MS : HAPTIC_GAP_MS;
  if (now - lastAt < gap) return;

  const pattern = {
    tap: 10,
    panel: 14,
    focus: [10, 28, 12],
    alert: [18, 60, 22]
  }[kind] || 10;

  if (isAlert) {
    state.haptics.lastAlertAt = now;
  } else {
    state.haptics.lastAt = now;
  }

  try {
    navigator.vibrate(pattern);
  } catch {
    // Ignore unsupported or blocked haptic calls.
  }
}

function getAIOperationalSummary(ai) {
  if (!ai) return "状态未知。";
  if (ai.status === "eliminated") return "该帝国已退出争霸，当前不再参与前线行动。";

  const ownedPlanets = getPlanets().filter(planet => planet.owner === ai.id);
  const movingFleets = getFleets().filter(fleet => fleet.owner === ai.id && fleet.status === "moving");
  const repairingFleets = getFleets().filter(fleet => fleet.owner === ai.id && fleet.repairState === "repairing");
  const unstablePlanets = ownedPlanets.filter(planet => planet.occupation && planet.owner === ai.id);
  const counts = getAIWarAndAllianceCounts(ai);
  const pendingDiplomacy = Array.from(state.proposalStore.values()).filter(proposal =>
    proposal.status === "pending" && (proposal.fromAi === ai.id || proposal.toAi === ai.id)
  );

  if (unstablePlanets.length > 0 && movingFleets.length > 0) {
    return `正在稳控 ${unstablePlanets.length} 颗新占星球，并保持 ${movingFleets.length} 支舰队机动。`;
  }
  if (counts.wars > 0 && repairingFleets.length > 0) {
    return `与 ${counts.wars} 个帝国交战，同时有 ${repairingFleets.length} 支舰队处于整补。`;
  }
  if (counts.wars > 0 && movingFleets.length > 0) {
    return `与 ${counts.wars} 个帝国交战，当前有 ${movingFleets.length} 支舰队在前线机动。`;
  }
  if (ai.researchQueue && movingFleets.length > 0) {
    return `正在推进 ${getTechLabel(ai.researchQueue.techType)} 等级 ${ai.researchQueue.level}，并保持 ${movingFleets.length} 支舰队机动。`;
  }
  if (ai.researchQueue) {
    return `正在研究 ${getTechLabel(ai.researchQueue.techType)} 等级 ${ai.researchQueue.level}。`;
  }
  if (unstablePlanets.length > 0) {
    return `刚取得 ${unstablePlanets.length} 颗星球，当前重点是稳控与驻防。`;
  }
  if (repairingFleets.length > 0) {
    return `有 ${repairingFleets.length} 支舰队正在整补，主力暂时收缩。`;
  }
  if (pendingDiplomacy.length > 0) {
    return `有 ${pendingDiplomacy.length} 项外交提案待处理，边境关系仍在变化。`;
  }
  if (counts.allies > 0 && movingFleets.length > 0) {
    return `维持 ${counts.allies} 个盟约，并通过 ${movingFleets.length} 支机动舰队扩张版图。`;
  }
  if (movingFleets.length > 0) {
    return `有 ${movingFleets.length} 支舰队正在主航道与前线间机动。`;
  }
  if (counts.wars > 0) {
    return `与 ${counts.wars} 个帝国处于战争状态，当前以边境巩固为主。`;
  }
  if (counts.allies > 0) {
    return `当前维持 ${counts.allies} 个盟约，正在巩固内线与扩张节奏。`;
  }
  return `控制 ${ownedPlanets.length} 颗星球，当前以积累资源与部署下一轮行动为主。`;
}

function getAIIntelSummary(ai) {
  const planetIntel = Object.values(ai?.intel?.planets || {});
  const fleetIntel = Object.values(ai?.intel?.fleets || {});
  const stalePlanets = planetIntel.filter(record => record?.stale).length;
  const staleFleets = fleetIntel.filter(record => record?.stale).length;
  const contacts = Object.keys(ai?.intel?.contacts || {}).length || (Array.isArray(ai?.knownAIs) ? ai.knownAIs.length : 0);
  const deception = ai?.deception?.operation;

  const parts = [
    `已知星图 ${planetIntel.length}`,
    `已知舰队 ${fleetIntel.length}`,
    `接触势力 ${contacts}`
  ];
  if (stalePlanets > 0 || staleFleets > 0) {
    parts.push(`过期情报 ${stalePlanets + staleFleets}`);
  }
  if (deception?.targetAi && deception?.targetPlanetId) {
    parts.push(`佯动中：对 ${getAIName(deception.targetAi)} 指向 ${getPlanetName(deception.targetPlanetId)}`);
  }
  return parts.join(" · ");
}

function getCoreTechSummary(ai) {
  const entries = Object.entries(ai?.tech || {})
    .filter(([, level]) => Number(level) > 0)
    .sort((left, right) => Number(right[1]) - Number(left[1]))
    .slice(0, 3);

  if (entries.length === 0) {
    if (ai?.researchQueue?.techType) {
      return `正在研究 ${getTechLabel(ai.researchQueue.techType)} 等级 ${ai.researchQueue.level || 1}。`;
    }
    return "核心科技尚未突破。";
  }

  return entries
    .map(([techType, level]) => `${getTechLabel(techType)} ${level}`)
    .join(" · ");
}

function getCompletedTechEntries(ai) {
  return Object.entries(ai?.tech || {})
    .filter(([, level]) => Number(level) > 0)
    .sort((left, right) => {
      const levelDelta = Number(right[1]) - Number(left[1]);
      if (levelDelta !== 0) return levelDelta;
      return getTechLabel(left[0]).localeCompare(getTechLabel(right[0]), "zh-CN");
    });
}

function getTechGroupScore(ai, groupId) {
  const group = TECH_PROFILE_GROUPS[groupId];
  if (!group) return 0;
  return group.techs.reduce((sum, techType) => sum + (Number(ai?.tech?.[techType]) || 0), 0);
}

function getDominantTechGroup(ai) {
  return Object.entries(TECH_PROFILE_GROUPS)
    .map(([groupId, group]) => ({
      groupId,
      label: group.label,
      summary: group.summary,
      score: getTechGroupScore(ai, groupId)
    }))
    .sort((left, right) => right.score - left.score)[0] || null;
}

function getTechFocusLabel(techType) {
  const groupId = TECH_TYPE_TO_GROUP[techType];
  return TECH_PROFILE_GROUPS[groupId]?.label || "综合发展";
}

function getTechFocusSummary(techType) {
  const groupId = TECH_TYPE_TO_GROUP[techType];
  return TECH_PROFILE_GROUPS[groupId]?.summary || "当前科技路线仍在形成。";
}

function getTechProjectionSummary(ai) {
  const queue = ai?.researchQueue;
  const counts = getAIWarAndAllianceCounts(ai);
  const staleIntel = Object.values(ai?.intel?.planets || {}).filter(item => item?.stale).length +
    Object.values(ai?.intel?.fleets || {}).filter(item => item?.stale).length;
  const movingFleets = getFleets().filter(fleet => fleet.owner === ai?.id && fleet.status === "moving").length;

  if (queue?.techType) {
    return `下一类偏向：${getTechFocusLabel(queue.techType)}。当前已投入 ${getTechLabel(queue.techType)} 等级 ${queue.level || 1}，通常会继续沿这条学派补齐短板。`;
  }

  if (staleIntel >= 6) {
    return "下一类偏向：传感侦察。该帝国当前过期情报偏多，下一轮更可能补强传感网络以恢复判断力。";
  }

  if (counts.wars > 0) {
    const offense = getTechGroupScore(ai, "offense");
    const defense = getTechGroupScore(ai, "defense");
    if (offense <= defense) {
      return "下一类偏向：火力攻坚。前线交战已打开，后续更可能继续补武器强化或攻城工程。";
    }
    return "下一类偏向：韧性防线。当前火力已经成形，下一步更可能补护盾技术或要塞化稳住战线。";
  }

  if (movingFleets >= 3) {
    return "下一类偏向：机动后勤。舰队转场频繁，下一轮更可能补引擎升级或后勤网络。";
  }

  switch (ai?.personality) {
    case "aggressive":
    case "opportunist":
    case "gambler":
      return "下一类偏向：火力攻坚。该性格通常会继续补强火力、攻城与开战效率。";
    case "defensive":
      return "下一类偏向：韧性防线。该性格更偏好护盾技术与要塞化来稳住边境。";
    case "economic":
      return "下一类偏向：资源经营。该性格更可能继续投资采矿、能源与人口增长。";
    case "tech":
      return "下一类偏向：传感侦察或综合科研。该性格更愿意先做信息和体系化优势。";
    case "diplomatic":
      return "下一类偏向：机动后勤。该性格通常会用后勤、引擎和传感去支撑更灵活的外交布局。";
    default:
      break;
  }

  const weakest = Object.entries(TECH_PROFILE_GROUPS)
    .map(([groupId, group]) => ({
      groupId,
      label: group.label,
      summary: group.summary,
      score: getTechGroupScore(ai, groupId)
    }))
    .sort((left, right) => left.score - right.score)[0];

  if (weakest) {
    return `下一类偏向：${weakest.label}。当前这条科技线相对薄弱，后续更可能围绕它补齐体系。`;
  }

  return "下一类偏向尚不明确，当前仍处于早期技术成型阶段。";
}

function getRelationCrisisScore(level) {
  return {
    calm: 0,
    strained: 1,
    crisis: 2,
    fracture: 3,
    war: 4
  }[level] ?? 0;
}

function buildRelationMetricGrid(relation) {
  const snapshot = normalizeRelationSnapshot(relation);
  const metrics = [
    { label: "信任", value: snapshot.trust },
    { label: "恐惧", value: snapshot.fear },
    { label: "旧怨", value: snapshot.grievance },
    { label: "依赖", value: snapshot.dependency },
    { label: "边境紧张", value: snapshot.borderTension },
    { label: "条约稳定", value: snapshot.treatyStability },
    { label: "危机", value: getCrisisLabel(snapshot.crisisLevel) }
  ];

  return `
    <div class="signal-metric-grid">
      ${metrics.map(metric => `
        <div class="micro-stat">
          <div class="micro-label">${escapeHtml(metric.label)}</div>
          <div class="micro-value">${escapeHtml(metric.value == null ? "--" : String(metric.value))}</div>
        </div>
      `).join("")}
    </div>
  `;
}

function getRelationSignals(relations) {
  const pick = (label, accessor, filter = () => true) => {
    const candidates = relations.filter(item => filter(item.snapshot));
    if (candidates.length === 0) {
      return {
        label,
        pair: "暂无突出信号",
        snapshot: { crisisLevel: "calm" },
        accent: "当前没有足够显著的外交尖峰。"
      };
    }
    const [winner] = [...candidates].sort((left, right) => accessor(right.snapshot) - accessor(left.snapshot));
    return {
      label,
      pair: winner.pair,
      snapshot: winner.snapshot,
      accent: formatRelationMetrics(winner.snapshot) || "该关系当前没有更多公开细节。"
    };
  };

  return [
    pick("最高信任", snapshot => Number(snapshot.trust) || 0, snapshot => Number.isFinite(snapshot.trust)),
    pick("最高恐惧", snapshot => Number(snapshot.fear) || 0, snapshot => Number.isFinite(snapshot.fear)),
    pick("最深旧怨", snapshot => Number(snapshot.grievance) || 0, snapshot => Number.isFinite(snapshot.grievance)),
    pick("最高依赖", snapshot => Number(snapshot.dependency) || 0, snapshot => Number.isFinite(snapshot.dependency)),
    pick("最紧张边境", snapshot => Number(snapshot.borderTension) || 0, snapshot => Number.isFinite(snapshot.borderTension)),
    pick("最脆弱条约", snapshot => 100 - (Number(snapshot.treatyStability) || 0), snapshot => Number.isFinite(snapshot.treatyStability)),
    pick("最高危机", snapshot => getRelationCrisisScore(snapshot.crisisLevel), snapshot => getRelationCrisisScore(snapshot.crisisLevel) > 0)
  ];
}

function getDiplomacyProposalStats() {
  const proposals = Array.from(state.proposalStore.values());
  return {
    pending: proposals.filter(proposal => proposal.status === "pending").length,
    accepted: proposals.filter(proposal => proposal.status === "accepted").length,
    rejected: proposals.filter(proposal => proposal.status === "rejected").length,
    expired: proposals.filter(proposal => proposal.status === "expired").length
  };
}

function getTechGroupLeaders(ais) {
  return Object.entries(TECH_PROFILE_GROUPS).map(([groupId, group]) => {
    const ranked = ais
      .map(ai => ({ ai, score: getTechGroupScore(ai, groupId) }))
      .sort((left, right) => right.score - left.score);
    return {
      groupId,
      label: group.label,
      summary: group.summary,
      leader: ranked[0]?.ai || null,
      leaderScore: ranked[0]?.score || 0
    };
  });
}

function getBattleRegionStats(battles) {
  const regions = new Map();
  battles.forEach(battle => {
    const planet = getPlanetById(battle.planet);
    const name = planet ? getPlanetRegionName(planet) : "未知战区";
    const current = regions.get(name) || { name, count: 0, captures: 0, latestAt: 0 };
    current.count += 1;
    current.captures += battle.captured ? 1 : 0;
    current.latestAt = Math.max(current.latestAt, battle.timestamp || 0);
    regions.set(name, current);
  });
  return [...regions.values()].sort((left, right) => {
    const countDelta = right.count - left.count;
    if (countDelta !== 0) return countDelta;
    return right.latestAt - left.latestAt;
  }).slice(0, 4);
}

function getBattleActorStats(battles) {
  const actors = new Map();
  battles.forEach(battle => {
    [battle.attacker, battle.defender].forEach((aiId, index) => {
      if (!aiId) return;
      const current = actors.get(aiId) || { aiId, battles: 0, captures: 0, wins: 0 };
      current.battles += 1;
      if (index === 0 && battle.captured) current.captures += 1;
      if ((index === 0 && battle.result !== "defeat") || (index === 1 && !battle.captured)) {
        current.wins += 1;
      }
      actors.set(aiId, current);
    });
  });
  return [...actors.values()].sort((left, right) => {
    const battleDelta = right.battles - left.battles;
    if (battleDelta !== 0) return battleDelta;
    return right.captures - left.captures;
  }).slice(0, 4);
}

function getBattleToneClass(battle) {
  if (battle?.captured) return "is-victory";
  if (battle?.result === "defeat") return "is-defeat";
  if (battle?.result === "stalemate" || battle?.result === "draw") return "is-stalemate";
  return "is-engagement";
}

function getBattleOutcomeLabel(battle) {
  if (!battle) return "交战";
  if (battle.captured) return "攻方夺点";
  if (battle.result === "defeat") return "守方守住";
  if (battle.result === "stalemate" || battle.result === "draw") return "战线僵持";
  return getBattleResultLabel(battle.result) || "交战";
}

function getBattleOccupationLabel(battle) {
  if (!battle?.captured) {
    return {
      captured: "否",
      occupation: "未形成占领",
      stabilization: "未进入稳控"
    };
  }

  const stability = battle.occupationStability != null
    ? `${Math.round(battle.occupationStability)}%`
    : "等待同步";

  return {
    captured: "是",
    occupation: "星球已易手",
    stabilization: `已进入稳控 ${stability}`
  };
}

function buildBattleReportCard(battle) {
  const planet = getPlanetById(battle.planet);
  const occupation = getBattleOccupationLabel(battle);
  const ratio = Number.isFinite(battle.defensePower) && Number(battle.defensePower) > 0
    ? (Number(battle.attackPower || 0) / Number(battle.defensePower || 1)).toFixed(2)
    : "--";
  const locationCopy = planet
    ? `${getPlanetName(battle.planet)} · ${getPlanetRegionName(planet)}`
    : getPlanetName(battle.planet);

  return `
    <div class="battle-report-card ${escapeHtml(getBattleToneClass(battle))}">
      <div class="report-head">
        <div>
          <div class="report-kicker">结构化战报</div>
          <div class="list-title">${escapeHtml(getAIName(battle.attacker))} 对阵 ${escapeHtml(getAIName(battle.defender))}</div>
          <div class="list-meta">地点：${escapeHtml(locationCopy)} · ${formatTimeAgo(battle.timestamp)}</div>
        </div>
        <span class="battle-result-badge ${escapeHtml(getBattleToneClass(battle))}">${escapeHtml(getBattleOutcomeLabel(battle))}</span>
      </div>
      <div class="report-grid">
        <div class="metric-card">
          <div class="metric-label">结果</div>
          <div class="metric-value">${escapeHtml(getBattleResultLabel(battle.result) || "交战")}</div>
          <div class="metric-copy">${escapeHtml(describeBattleHeadline(battle))}</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">是否占领</div>
          <div class="metric-value">${escapeHtml(occupation.captured)}</div>
          <div class="metric-copy">${escapeHtml(occupation.occupation)}</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">稳控状态</div>
          <div class="metric-value">${escapeHtml(occupation.stabilization)}</div>
          <div class="metric-copy">用于判断是否只是夺点，还是已经进入稳定控制阶段。</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">攻防对比</div>
          <div class="metric-value">${escapeHtml(ratio)}</div>
          <div class="metric-copy">攻方 ${formatNumber(battle.attackPower || 0)} / 守方 ${formatNumber(battle.defensePower || 0)}</div>
        </div>
      </div>
      <div class="report-strip">
        <span class="report-chip">${escapeHtml(getAIName(battle.attacker))}</span>
        <span class="report-chip subtle">攻方姿态 ${escapeHtml(getFleetStanceLabel(battle.attackerStance))}</span>
        <span class="report-chip subtle">战备 ${escapeHtml(formatFleetReadiness(battle.attackerReadiness))}</span>
      </div>
    </div>
  `;
}

function getRealtimeFreshnessLabel() {
  const dataAgeSeconds = state.lastRealtimeMessageAt ? Math.max(0, Math.floor((Date.now() - state.lastRealtimeMessageAt) / 1000)) : null;
  return dataAgeSeconds == null
    ? "未同步"
    : dataAgeSeconds <= 2
      ? "实时"
      : `${dataAgeSeconds}秒前`;
}

function formatBetSettlementSummary(results = []) {
  if (!Array.isArray(results) || results.length === 0) return "本局没有可结算下注。";
  const won = results.filter(item => item.won).length;
  return `本局已结算 ${results.length} 笔下注，命中 ${won} 笔。`;
}

function getBettingStatusText() {
  if (Array.isArray(state.gameState?.betResults) && state.gameState.betResults.length > 0) {
    return formatBetSettlementSummary(state.gameState.betResults);
  }

  if (state.bettingState?.bettingOpen) {
    return `下注开放中，当前共有 ${formatNumber(state.bettingState.totalBets || 0)} 笔。`;
  }

  if (state.bettingState?.settled) {
    return `下注已关闭，已结算 ${formatNumber(state.bettingState.settledBetCount || 0)} 笔。`;
  }

  if (state.bettingState) {
    return `下注关闭，已收到 ${formatNumber(state.bettingState.totalBets || 0)} 笔。`;
  }

  return "等待下注。";
}

function getAskAIStatusText() {
  if (state.interaction.aiAnswerText && state.interaction.aiAnswerText !== "等待提问。") {
    return state.interaction.aiAnswerText;
  }
  if (state.connectionMode === "connected") {
    return "可直接向任意 AI 提问当前战略意图。";
  }
  if (state.connectionMode === "stalled") {
    return "实时连接滞后，提问回复可能延迟。";
  }
  return "等待提问。";
}

function getResearchProgressPercent(queue) {
  if (!queue || queue.totalTimeMs == null || queue.remainingTimeMs == null) {
    return null;
  }
  return clamp(((queue.totalTimeMs - queue.remainingTimeMs) / Math.max(1, queue.totalTimeMs)) * 100, 0, 100);
}

function getResearchStatusText(queue) {
  if (!queue) return "当前无进行中研究。";
  if (queue.paused) {
    return `研究中：${escapeHtml(getTechLabel(queue.techType))} 等级 ${queue.level} · 暂停`;
  }
  if (queue.remainingTimeMs == null) {
    return `研究中：${escapeHtml(getTechLabel(queue.techType))} 等级 ${queue.level} · 等待状态同步`;
  }
  return `研究中：${escapeHtml(getTechLabel(queue.techType))} 等级 ${queue.level} · 剩余 ${formatDuration((queue.remainingTimeMs || 0) / 1000)}`;
}

function formatQueueEta(endTime) {
  if (!endTime) return "等待同步";
  return formatDuration(Math.max(0, (endTime - Date.now()) / 1000));
}

function formatBuildQueueItem(item) {
  if (!item) return "建造中";
  const label = BUILDING_LABELS[item.type] || sanitizeNarrativeText(item.type || "", "建筑");
  return `${label} · 剩余 ${formatQueueEta(item.endTime)}`;
}

function formatShipQueueItem(item) {
  if (!item) return "造舰中";
  const label = SHIP_NAME_LABELS[item.type] || sanitizeNarrativeText(item.type || "", "舰船");
  return `${label} x${item.count || 0} · 剩余 ${formatQueueEta(item.endTime)}`;
}

function buildAIListMarkup(ranked, compact = false) {
  if (ranked.length === 0) {
    return '<div class="empty-state">等待 AI 数据。</div>';
  }

  return ranked.map((ai, index) => {
    const resources = ai.resources || {};
    const decision = state.latestDecisions.get(ai.id);
    const counts = getAIWarAndAllianceCounts(ai);
    const planets = ai.planets?.length || getPlanets().filter(planet => planet.owner === ai.id).length;
    const fleets = ai.fleets?.length || getFleets().filter(fleet => fleet.owner === ai.id).length;
    const research = ai.researchQueue;
    const researchProgress = getResearchProgressPercent(research);
    const decisionSummary = isDecisionFresh(decision) ? getDecisionSummary(decision) : null;
    const operationalSummary = getAIOperationalSummary(ai);
    const intelSummary = getAIIntelSummary(ai);
    const coreTechSummary = getCoreTechSummary(ai);
    const empireMarker = getEmpireMarker(ai);

    if (compact) {
      return `
        <article class="rail-ai-card" style="border-left:4px solid ${escapeHtml(ai.color || "#6ae7ff")};">
          <div class="rail-ai-head">
            <div>
              <div class="list-title">${escapeHtml(ai.name || ai.id)}</div>
              <div class="rail-ai-meta">${escapeHtml(getPersonalityLabel(ai.personality))} · ${escapeHtml(empireMarker)} · ${ai.status === "eliminated" ? "已淘汰" : "存活"}</div>
            </div>
            <div class="badge">战力 ${formatNumber(ai.totalFleetPower || 0)}</div>
          </div>
          <div class="inline-list">
            <span class="badge">领土 ${planets}</span>
            <span class="badge">舰队 ${fleets}</span>
            <span class="badge">战争 ${counts.wars}</span>
          </div>
          <div class="rail-ai-copy">${escapeHtml(operationalSummary)}</div>
          <div class="rail-ai-copy" style="margin-top:6px;opacity:0.82;">${escapeHtml(intelSummary)}</div>
        </article>
      `;
    }

    return `
      <article class="ai-card" style="border-left-color:${escapeHtml(ai.color || "#6ae7ff")};">
        <div class="ai-head">
          <div>
            <div class="ai-name">${escapeHtml(ai.name || ai.id)}</div>
            <div class="ai-persona">${escapeHtml(getPersonalityLabel(ai.personality))} · 声望 ${Math.round(ai.reputation ?? 50)} · ${ai.status === "eliminated" ? "已淘汰" : "存活"}</div>
          </div>
          <div class="ai-rank">${escapeHtml(empireMarker)}</div>
        </div>
        <div class="ai-metrics">
          <div class="micro-stat"><div class="micro-label">领土</div><div class="micro-value">${planets}</div></div>
          <div class="micro-stat"><div class="micro-label">舰队</div><div class="micro-value">${fleets}</div></div>
          <div class="micro-stat"><div class="micro-label">战力</div><div class="micro-value">${formatNumber(ai.totalFleetPower || 0)}</div></div>
          <div class="micro-stat"><div class="micro-label">金属</div><div class="micro-value">${formatNumber(resources.metal || 0)}</div></div>
          <div class="micro-stat"><div class="micro-label">能源</div><div class="micro-value">${formatNumber(resources.energy || 0)}</div></div>
          <div class="micro-stat"><div class="micro-label">均科</div><div class="micro-value">${techAverage(ai).toFixed(1)}</div></div>
        </div>
        <div class="inline-list" style="margin-top:10px;">
          <span class="badge">战争 ${counts.wars}</span>
          <span class="badge">盟友 ${counts.allies}</span>
          <span class="badge">人口余量 ${formatNumber(ai.availablePopulation || 0)}</span>
        </div>
        <div class="metric-copy" style="margin-top:10px;">${escapeHtml(operationalSummary)}</div>
        <div class="metric-copy" style="margin-top:8px;">${escapeHtml(intelSummary)}</div>
        ${decisionSummary ? `<div class="metric-copy" style="margin-top:8px;">最近决策：${escapeHtml(decisionSummary)}</div>` : ""}
        <div class="metric-copy" style="margin-top:8px;">${getResearchStatusText(research)}</div>
        <div class="metric-copy" style="margin-top:8px;">核心科技：${escapeHtml(coreTechSummary)}</div>
        ${researchProgress != null ? `<div class="progress-bar"><div class="progress-fill" style="width:${researchProgress}%;background:linear-gradient(90deg,#ffca75,#6ae7ff);"></div></div>` : ""}
      </article>
    `;
  }).join("");
}

function updateDockSummaries() {
  const selectedPlanet = getPlanetById(state.selectedPlanetId);
  const warCount = getAIs().reduce((count, ai) => {
    return count + Object.values(ai?.diplomacy || {}).filter(relation => (typeof relation === "string" ? relation : relation?.status) === "war").length;
  }, 0) / 2;
  const crisisPairs = getAIs().reduce((count, ai) => {
    return count + Object.values(ai?.diplomacy || {}).filter(relation => {
      const snapshot = normalizeRelationSnapshot(relation);
      return snapshot.status !== "war" && ["strained", "crisis", "fracture"].includes(snapshot.crisisLevel);
    }).length;
  }, 0) / 2;
  const movingFleets = getFleets().filter(fleet => fleet.status === "moving").length;
  const recentBattles = getBattles().filter(battle => (Date.now() - (battle.timestamp || 0)) <= RECENT_BATTLE_WINDOW).length;
  const aliveEmpires = getAIs().filter(ai => ai.status !== "eliminated").length;

  dom.overviewTabSummary.textContent = state.gameState
    ? `${aliveEmpires} 帝国 · ${getPlanets().length} 星`
    : "等待数据";
  dom.focusTabSummary.textContent = selectedPlanet
    ? `${selectedPlanet.name} · ${selectedPlanet.owner ? getAIName(selectedPlanet.owner) : "中立"}`
    : "点击地图查看星球卡";
  dom.diplomacyTabSummary.textContent = state.gameState
    ? `${warCount} 场战争 · ${crisisPairs} 处危机`
    : "等待关系与研究";
  dom.operationsTabSummary.textContent = state.gameState
    ? `${movingFleets} 支机动舰队 · ${recentBattles} 热点`
    : "等待舰队与战斗";
  dom.timelineTabSummary.textContent = state.events.length > 0
    ? `已收集 ${state.events.length} 条事件`
    : "等待事件时间轴";
  dom.interactiveTabSummary.textContent = state.bettingState?.bettingOpen
    ? "下注开放 · 可提问"
    : "可提问 AI · 下注关闭";
}

function getStatusClass(kind) {
  if (kind === "good") return "status-value good";
  if (kind === "bad") return "status-value bad";
  return "status-value warn";
}

function getCenterDistance(position) {
  if (!position) return 0;
  const dx = position.x - WORLD_SIZE / 2;
  const dy = position.y - WORLD_SIZE / 2;
  return Math.sqrt(dx * dx + dy * dy);
}

function getSectorName(position) {
  if (!position) return "未知扇区";
  if (getCenterDistance(position) <= 180) return "中央资源环";

  const angle = (Math.atan2(position.y - WORLD_SIZE / 2, position.x - WORLD_SIZE / 2) + Math.PI * 2) % (Math.PI * 2);
  const labels = ["东翼", "东南弧", "南疆", "西南弧", "西翼", "西北弧", "北境", "东北弧"];
  return labels[Math.floor(angle / (Math.PI / 4)) % labels.length];
}

function getSectorStats() {
  const stats = new Map();
  getPlanets().forEach(planet => {
    const sector = getPlanetRegionName(planet);
    const record = stats.get(sector) || {
      name: sector,
      planets: 0,
      owned: 0,
      totalMetal: 0,
      totalEnergy: 0,
      totalDefense: 0,
      owners: {}
    };

    record.planets += 1;
    if (planet.owner) {
      record.owned += 1;
      record.owners[planet.owner] = (record.owners[planet.owner] || 0) + 1;
    }
    record.totalMetal += planet.resources?.metal || 0;
    record.totalEnergy += planet.resources?.energy || 0;
    record.totalDefense += planet.defenseValue || 0;
    stats.set(sector, record);
  });

  return Array.from(stats.values()).map(record => {
    const primary = Object.entries(record.owners).sort((left, right) => right[1] - left[1])[0];
    const region = getMapMeta()?.regions?.find(regionItem => regionItem.name === record.name) || null;
    return {
      ...record,
      trait: region?.trait || null,
      primaryOwner: primary?.[0] || null,
      contested: Object.keys(record.owners).length > 1
    };
  });
}

function getMapLanes() {
  const lanes = getMapMeta()?.lanes || [];
  return Array.isArray(lanes) ? lanes : [];
}

function getMapDynamic() {
  const dynamic = getMapMeta()?.dynamic || {};
  return dynamic && typeof dynamic === "object" ? dynamic : {};
}

function getLaneTierConfig(tier) {
  const rules = getMapMeta()?.rules?.laneTiers || {};
  return rules[tier] || { label: tier || "航道", speedMultiplier: 1, strategicWeight: 0.5 };
}

function getPlanetRegionName(planet) {
  if (!planet) return "未知区域";
  return planet.regionName || getMapMeta()?.regions?.find(region => region.id === planet.regionId)?.name || getSectorName(planet.position);
}

function getRegionTrait(planetOrRegionId) {
  const regionId = typeof planetOrRegionId === "string" ? planetOrRegionId : planetOrRegionId?.regionId;
  if (!regionId) return null;
  return getMapMeta()?.regions?.find(region => region.id === regionId)?.trait || null;
}

function getSpecialNodeLabel(type) {
  return SPECIAL_NODE_LABELS[type] || sanitizeNarrativeText(type || "", "普通节点");
}

function getSpecialNodeSummary(planet) {
  if (!planet?.specialNodeType) return "当前没有特殊节点加成。";
  if (planet.specialNodeSummary) return planet.specialNodeSummary;
  return `${getSpecialNodeLabel(planet.specialNodeType)}会改变该星球的战略价值。`;
}

function getLaneEndpoints(lane) {
  const from = getPlanetById(lane?.from);
  const to = getPlanetById(lane?.to);
  if (!from || !to) return null;
  return { from, to };
}

function getLaneControlState(lane) {
  const dynamicState = (getMapDynamic().laneStates || []).find(item =>
    item.id === (lane?.id || [lane?.from, lane?.to].filter(Boolean).sort().join("::")) ||
    (item.from === lane?.from && item.to === lane?.to) ||
    (item.from === lane?.to && item.to === lane?.from)
  );
  if (dynamicState) {
    return dynamicState;
  }
  const endpoints = getLaneEndpoints(lane);
  if (!endpoints) return { status: "unknown", owner: null };
  if (endpoints.from.owner && endpoints.from.owner === endpoints.to.owner) {
    return { status: "secured", owner: endpoints.from.owner, heat: 0 };
  }
  if (endpoints.from.owner || endpoints.to.owner) {
    return { status: "contested", owner: null, heat: 40 };
  }
  return { status: "neutral", owner: null, heat: 0 };
}

function getFrontlineSignals(now = Date.now()) {
  const dynamicFrontlines = getMapDynamic().frontlines;
  if (Array.isArray(dynamicFrontlines) && dynamicFrontlines.length > 0) {
    return dynamicFrontlines.map(signal => {
      const lane = getMapLanes().find(item =>
        item.id === signal.id ||
        (item.from === signal.from && item.to === signal.to) ||
        (item.from === signal.to && item.to === signal.from)
      );
      const endpoints = lane ? getLaneEndpoints(lane) : null;
      if (!lane || !endpoints) return null;
      return {
        lane,
        endpoints,
        midpoint: {
          x: (endpoints.from.position.x + endpoints.to.position.x) / 2,
          y: (endpoints.from.position.y + endpoints.to.position.y) / 2
        },
        control: signal
      };
    }).filter(Boolean);
  }

  const recentBattlePlanetIds = getRecentBattlePlanetIds(now);
  const activeThreatTargets = new Set(
    getFleets()
      .filter(fleet => fleet.status === "moving" && fleet.targetPlanet)
      .map(fleet => fleet.targetPlanet)
  );

  return getMapLanes()
    .map(lane => {
      const endpoints = getLaneEndpoints(lane);
      if (!endpoints) return null;
      const control = getLaneControlState(lane);
      const midpoint = {
        x: (endpoints.from.position.x + endpoints.to.position.x) / 2,
        y: (endpoints.from.position.y + endpoints.to.position.y) / 2
      };
      const hot = control.status === "contested" ||
        recentBattlePlanetIds.has(endpoints.from.id) ||
        recentBattlePlanetIds.has(endpoints.to.id) ||
        activeThreatTargets.has(endpoints.from.id) ||
        activeThreatTargets.has(endpoints.to.id);
      return hot ? { lane, endpoints, midpoint, control } : null;
    })
    .filter(Boolean);
}

function getControlledStrategicNodes() {
  return getPlanets().filter(planet =>
    planet.owner &&
    ["approach_gate", "border_bastion", "core_relay", "central_hub"].includes(planet.strategicRole)
  );
}

function getSecuredLaneCount() {
  return getMapLanes().filter(lane => getLaneControlState(lane).status === "secured").length;
}

function getMapDetailLevel() {
  if (view.zoom < 0.95) return "strategic";
  if (view.zoom < 1.45) return "operational";
  return "tactical";
}

function getMapLabelBudget(detailLevel) {
  if (detailLevel === "strategic") return 12;
  if (detailLevel === "operational") return 20;
  return 34;
}

function getRecentBattlePlanetIds(now = Date.now()) {
  const planets = new Set();
  getBattles().forEach(battle => {
    if (!battle?.planet || !battle.timestamp || now - battle.timestamp > RECENT_BATTLE_WINDOW) return;
    planets.add(battle.planet);
  });
  return planets;
}

function drawRoundedRectPath(x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function measurePlanetLabel(lines) {
  const widths = [];
  lines.forEach((line, index) => {
    ctx.font = index === 0 ? LABEL_FONT_PRIMARY : LABEL_FONT_META;
    widths.push(ctx.measureText(line).width);
  });

  return {
    width: Math.max(...widths, 0) + 18,
    height: 12 + lines.length * 14
  };
}

function normalizeLabelRect(rect) {
  const margin = 8;
  const x = clamp(rect.x, margin, Math.max(margin, canvasMetrics.width - rect.width - margin));
  const y = clamp(rect.y, margin, Math.max(margin, canvasMetrics.height - rect.height - margin));
  return { x, y, width: rect.width, height: rect.height };
}

function rectsOverlap(left, right, padding = 6) {
  return !(
    left.x + left.width + padding <= right.x ||
    right.x + right.width + padding <= left.x ||
    left.y + left.height + padding <= right.y ||
    right.y + right.height + padding <= left.y
  );
}

function canPlaceRect(rect, occupied) {
  return occupied.every(existing => !rectsOverlap(rect, existing));
}

function getPlanetLabelPlacements(screen, radius, width, height) {
  const gap = radius + 10;
  const preferRight = screen.x <= canvasMetrics.width / 2;
  const preferUpper = screen.y >= canvasMetrics.height / 2;

  const horizontalPlacements = preferRight
    ? [
        { x: screen.x + gap, y: screen.y - height / 2 },
        { x: screen.x + gap, y: screen.y - height - 8 },
        { x: screen.x - gap - width, y: screen.y - height / 2 },
        { x: screen.x - gap - width, y: screen.y - height - 8 }
      ]
    : [
        { x: screen.x - gap - width, y: screen.y - height / 2 },
        { x: screen.x - gap - width, y: screen.y - height - 8 },
        { x: screen.x + gap, y: screen.y - height / 2 },
        { x: screen.x + gap, y: screen.y - height - 8 }
      ];

  const verticalPlacements = preferUpper
    ? [
        { x: screen.x - width / 2, y: screen.y - gap - height - 4 },
        { x: screen.x - width / 2, y: screen.y + gap - 2 }
      ]
    : [
        { x: screen.x - width / 2, y: screen.y + gap - 2 },
        { x: screen.x - width / 2, y: screen.y - gap - height - 4 }
      ];

  return [...horizontalPlacements, ...verticalPlacements].map(normalizeLabelRect);
}

function buildPlanetLabelCandidate(planet, screen, radius, detailLevel, recentBattlePlanetIds) {
  const selected = planet.id === state.selectedPlanetId;
  const hovered = planet.id === state.hoveredPlanetId;
  const centerRing = getCenterDistance(planet.position) <= 180;
  const recentBattle = recentBattlePlanetIds.has(planet.id);

  if (detailLevel === "strategic" && !selected && !hovered && planet.type !== "home" && !centerRing && !recentBattle) {
    return null;
  }

  if (detailLevel === "operational" && planet.type === "normal" && !selected && !hovered && !planet.owner && !recentBattle && (planet.defenseValue || 0) < 120) {
    return null;
  }

  const lines = [planet.name];
  if (selected || hovered) {
    lines.push(`${planet.owner ? getAIName(planet.owner) : "中立"} · 防 ${formatNumber(planet.defenseValue || 0)} · ${getPlanetRegionName(planet)}`);
  } else if (detailLevel !== "strategic") {
    const meta = [];
    meta.push(planet.owner ? getAIName(planet.owner) : "中立");
    if (planet.type !== "normal") meta.push(planet.type === "home" ? "母星" : "资源星");
    if ((planet.defenseValue || 0) >= 120) meta.push(`防 ${formatNumber(planet.defenseValue || 0)}`);
    lines.push(meta.join(" · "));
  }

  const priority =
    (selected ? 1000 : 0) +
    (hovered ? 900 : 0) +
    (recentBattle ? 700 : 0) +
    (planet.type === "home" ? 640 : 0) +
    (centerRing ? 520 : 0) +
    (planet.type === "resource" ? 180 : 0) +
    Math.min(160, Math.round((planet.defenseValue || 0) / 2)) +
    (planet.owner ? 40 : 0);

  const labelSize = measurePlanetLabel(lines);

  return {
    planet,
    screen,
    lines,
    priority,
    selected,
    hovered,
    width: labelSize.width,
    height: labelSize.height,
    accent: planet.owner ? getAIColor(planet.owner) : "#7fb9d1",
    radius
  };
}

function drawPlanetLabels(candidates) {
  const occupied = [];
  candidates
    .sort((left, right) => right.priority - left.priority)
    .slice(0, getMapLabelBudget(getMapDetailLevel()))
    .forEach(candidate => {
      const placements = getPlanetLabelPlacements(candidate.screen, candidate.radius, candidate.width, candidate.height);
      const placement = placements.find(rect => canPlaceRect(rect, occupied));
      if (!placement) return;

      occupied.push(placement);
      ctx.fillStyle = "rgba(3, 14, 26, 0.88)";
      ctx.strokeStyle = `${candidate.accent}${candidate.selected || candidate.hovered ? "cc" : "70"}`;
      ctx.lineWidth = candidate.selected || candidate.hovered ? 1.6 : 1;
      drawRoundedRectPath(placement.x, placement.y, placement.width, placement.height, 10);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#f3fbff";
      ctx.font = LABEL_FONT_PRIMARY;
      ctx.textAlign = "left";
      ctx.fillText(candidate.lines[0], placement.x + 9, placement.y + 15);

      if (candidate.lines[1]) {
        ctx.fillStyle = "rgba(168, 205, 219, 0.9)";
        ctx.font = LABEL_FONT_META;
        ctx.fillText(candidate.lines[1], placement.x + 9, placement.y + 29);
      }
    });
}

function shouldShowFleetLabel(fleet, power, detailLevel, recentBattlePlanetIds) {
  const selectedPlanet = getPlanetById(state.selectedPlanetId);
  const selectedOwner = selectedPlanet?.owner || null;
  const targetInBattle = fleet.targetPlanet && recentBattlePlanetIds.has(fleet.targetPlanet);

  if (detailLevel === "strategic") {
    return Boolean(selectedOwner && fleet.owner === selectedOwner && fleet.status === "moving" && power >= 500) || power >= 1800 || targetInBattle;
  }

  if (detailLevel === "operational") {
    return Boolean(selectedOwner && fleet.owner === selectedOwner && fleet.status === "moving") || (fleet.status === "moving" && power >= 650) || power >= 1300 || targetInBattle;
  }

  return fleet.status === "moving" || power >= 650 || targetInBattle;
}

function interpolateFleetPosition(fleet, now = Date.now()) {
  if (!fleet) return { x: 0, y: 0, etaSeconds: 0, progress: 0 };

  const current = fleet.position || { x: 0, y: 0 };
  const targetPlanet = getPlanetById(fleet.targetPlanet);
  const destination = fleet.destination || targetPlanet?.position || current;
  const origin = fleet.origin || current;

  if (fleet.status !== "moving" || !fleet.moveStartTime || !fleet.moveEndTime) {
    return { x: current.x, y: current.y, etaSeconds: 0, progress: fleet.status === "arrived" ? 1 : 0 };
  }

  const total = Math.max(1, fleet.moveEndTime - fleet.moveStartTime);
  const progress = clamp((now - fleet.moveStartTime) / total, 0, 1);
  return {
    x: origin.x + (destination.x - origin.x) * progress,
    y: origin.y + (destination.y - origin.y) * progress,
    etaSeconds: Math.max(0, Math.ceil((fleet.moveEndTime - now) / 1000)),
    progress
  };
}

function addTimelineEvent(event) {
  if (!event) return;
  const key = event.id || `${event.category || "system"}_${event.timestamp || Date.now()}_${event.message || ""}`;
  if (state.seenTimelineKeys.has(key)) return;
  state.seenTimelineKeys.add(key);
  state.events.unshift({
    id: key,
    type: event.type || event.sourceType || event.category || "system",
    category: event.category || "system",
    title: event.title || "系统消息",
    message: event.message || "",
    timestamp: event.timestamp || Date.now(),
    tick: event.tick ?? state.gameState?.currentTick ?? 0,
    meta: event.meta || "",
    refs: {
      aiIds: Array.isArray(event.refs?.aiIds) ? [...new Set(event.refs.aiIds.filter(Boolean))] : [],
      planetIds: Array.isArray(event.refs?.planetIds) ? [...new Set(event.refs.planetIds.filter(Boolean))] : []
    }
  });
  if (state.events.length > MAX_EVENTS) {
    const removed = state.events.splice(MAX_EVENTS);
    removed.forEach(item => state.seenTimelineKeys.delete(item.id));
  }
}

function getRecentEventsByCategory(category, limit = 5, predicate = null) {
  return state.events
    .filter(event => event.category === category && (!predicate || predicate(event)))
    .slice(0, limit);
}

function renderCompactEventFeed(events, emptyText) {
  if (!events || events.length === 0) {
    return `<div class="empty-state">${escapeHtml(emptyText)}</div>`;
  }

  return `<div class="stack">${events.map(event => {
    const primaryPlanetId = getTimelinePrimaryPlanetId(event);
    const jumpButton = primaryPlanetId
      ? `<div style="margin-top:8px;"><button type="button" class="event-jump-btn" data-planet-jump="${escapeHtml(primaryPlanetId)}">定位到 ${escapeHtml(getPlanetName(primaryPlanetId))}</button></div>`
      : "";
    return `
      <div class="list-card">
        <div class="report-head">
          <div>
            <div class="report-kicker">${escapeHtml(event.title || "事件")}</div>
            <div class="list-meta">${escapeHtml(event.meta || "战场记录")} · ${formatTimeAgo(event.timestamp)}</div>
          </div>
        </div>
        <div class="list-meta">${escapeHtml(event.message || "")}</div>
        ${jumpButton}
      </div>
    `;
  }).join("")}</div>`;
}

function eventCategoryForType(type) {
  if (["battle", "battle_resolved", "planet_captured", "occupation_secured"].includes(type)) return "battle";
  if (type.startsWith("research_")) return "tech";
  if (["war_declared", "surprise_attack", "alliance_formed", "alliance_expired", "alliance_broken", "peace_signed", "trade_executed", "alliance_proposed", "peace_proposed", "trade_proposed", "proposal_expired", "diplomacy_rejected", "crisis_escalated", "crisis_cooled", "deception_planted", "deception_ended", "diplomacy"].includes(type)) return "diplomacy";
  if (["planet_scouted", "ai_decision", "fleet_repair_started", "fleet_repair_completed"].includes(type)) return "intel";
  return "system";
}

function buildTimelineRefs(payload = {}) {
  const aiIds = [];
  const planetIds = [];
  const aiKeys = [
    "aiId",
    "fromAi",
    "toAi",
    "attacker",
    "defender",
    "owner",
    "observerId",
    "operatorAi",
    "targetAi",
    "eliminatedBy",
    "winner",
    "fromOwner",
    "toOwner",
    "previousOwner"
  ];
  const planetKeys = ["planetId", "planet", "targetPlanetId", "sourcePlanetId", "fromPlanetId", "toPlanetId"];

  aiKeys.forEach(key => {
    if (payload[key]) aiIds.push(payload[key]);
  });
  planetKeys.forEach(key => {
    if (payload[key]) planetIds.push(payload[key]);
  });
  if (Array.isArray(payload.aiIds)) aiIds.push(...payload.aiIds);
  if (Array.isArray(payload.affectedAIIds)) aiIds.push(...payload.affectedAIIds);
  if (Array.isArray(payload.relatedAiIds)) aiIds.push(...payload.relatedAiIds);
  if (Array.isArray(payload.planetIds)) planetIds.push(...payload.planetIds);
  if (Array.isArray(payload.relatedPlanetIds)) planetIds.push(...payload.relatedPlanetIds);

  return {
    aiIds: [...new Set(aiIds.filter(Boolean))],
    planetIds: [...new Set(planetIds.filter(Boolean))]
  };
}

function upsertProposal(proposal) {
  if (!proposal?.id) return;
  state.proposalStore.set(proposal.id, {
    ...state.proposalStore.get(proposal.id),
    ...proposal
  });
}

function resolveProposalByPair(type, fromAi, toAi, status) {
  state.proposalStore.forEach((proposal, proposalId) => {
    if (proposal.type === type && proposal.fromAi === fromAi && proposal.toAi === toAi && proposal.status === "pending") {
      state.proposalStore.set(proposalId, {
        ...proposal,
        status,
        resolvedAt: Date.now()
      });
    }
  });
}

function syncProposalStoreFromState() {
  const fresh = new Map();
  const proposals = Array.isArray(state.gameState?.diplomacyProposals) ? state.gameState.diplomacyProposals : [];
  proposals.forEach(proposal => fresh.set(proposal.id, { ...proposal }));
  state.proposalStore.forEach((proposal, proposalId) => {
    if (!fresh.has(proposalId) && proposal.status !== "pending") {
      fresh.set(proposalId, proposal);
    }
  });
  state.proposalStore = fresh;
}

function createWorldEventPresentation(event) {
  const type = event?.type || "system";
  const data = event?.data || {};
  const category = eventCategoryForType(type);

  if (type === "planet_captured") {
    return { category, title: "星球易手", message: `${getAIName(data.toOwner)} 夺取了 ${getPlanetName(data.planetId)}，原控制方为 ${getAIName(data.fromOwner)}，当前稳控 ${Math.round(data.occupationStability || 0)}%。` };
  }
  if (type === "battle_resolved") {
    const resultText = data.captured
      ? `攻方得手并夺取星球，当前稳控 ${Math.round(data.occupationStability || 0)}%`
      : `${getAIName(data.defender)} 守住了阵地`;
    return {
      category,
      title: "战斗结算",
      message: `${getAIName(data.attacker)} 在 ${getPlanetName(data.planet)} 与 ${getAIName(data.defender)} 爆发战斗，结果：${getBattleResultLabel(data.result)}，${resultText}。攻防战力 ${formatNumber(data.attackPower)}/${formatNumber(data.defensePower)}。`
    };
  }
  if (type === "occupation_secured") {
    return { category, title: "稳控完成", message: `${getAIName(data.owner)} 已稳住 ${getPlanetName(data.planetId)}，该星球恢复完整控制。` };
  }
  if (type === "war_declared") {
    return { category, title: "战争爆发", message: `${getAIName(data.fromAi)} 向 ${getAIName(data.toAi)} 宣战，边境冲突将立即合法化。` };
  }
  if (type === "surprise_attack") {
    return { category, title: "违约突袭", message: `${getAIName(data.fromAi)} 对 ${getAIName(data.toAi)} 发起违约突袭，表面关系已经瞬间瓦解。` };
  }
  if (type === "deception_planted") {
    return { category, title: "佯动展开", message: `${getAIName(data.operatorAi)} 正在对 ${getAIName(data.targetAi)} 制造一股指向 ${getPlanetName(data.targetPlanetId)} 的假攻势。` };
  }
  if (type === "deception_ended") {
    return { category, title: "佯动消散", message: `${getAIName(data.operatorAi)} 针对 ${getAIName(data.targetAi)} 的佯动已结束。` };
  }
  if (type === "alliance_formed") {
    return { category, title: "联盟成立", message: `${getAIName(data.fromAi)} 与 ${getAIName(data.toAi)} 结盟，持续 ${formatDuration((data.duration || 0) / 1000)}。` };
  }
  if (type === "alliance_expired") {
    return { category, title: "联盟到期", message: `${getAIName(data.fromAi)} 与 ${getAIName(data.toAi)} 的联盟已经结束，双方恢复中立。` };
  }
  if (type === "alliance_broken") {
    return { category, title: "联盟破裂", message: `${getAIName(data.fromAi)} 与 ${getAIName(data.toAi)} 的联盟因边境紧张与旧怨破裂，局势重新进入危险期。` };
  }
  if (type === "peace_signed") {
    return { category, title: "停战达成", message: `${getAIName(data.fromAi)} 与 ${getAIName(data.toAi)} 签署和平协议。` };
  }
  if (type === "trade_executed") {
    return { category, title: "贸易完成", message: `${getAIName(data.fromAi)} 与 ${getAIName(data.toAi)} 完成资源交换。` };
  }
  if (type === "alliance_proposed" || type === "peace_proposed" || type === "trade_proposed") {
    const proposalText = type === "alliance_proposed" ? "结盟" : type === "peace_proposed" ? "停战" : "贸易";
    return { category, title: "外交提案", message: `${getAIName(data.fromAi)} 向 ${getAIName(data.toAi)} 发出了${proposalText}提案。` };
  }
  if (type === "diplomacy_rejected") {
    return { category, title: "提案被拒", message: `${getAIName(data.toAi)} 拒绝了来自 ${getAIName(data.fromAi)} 的 ${sanitizeNarrativeText(data.proposalType, "外交")}提案。` };
  }
  if (type === "proposal_expired") {
    return { category, title: "提案过期", message: `${getAIName(data.fromAi)} 发给 ${getAIName(data.toAi)} 的 ${getProposalTypeLabel(data.type)}提案已超时失效。` };
  }
  if (type === "crisis_escalated") {
    return { category, title: "危机升级", message: `${getAIName(data.fromAi)} 与 ${getAIName(data.toAi)} 的关系升至${getCrisisLabel(data.crisisLevel)}，边境紧张 ${data.borderTension ?? "?"}，旧怨 ${data.grievance ?? "?"}。` };
  }
  if (type === "crisis_cooled") {
    return { category, title: "危机降温", message: `${getAIName(data.fromAi)} 与 ${getAIName(data.toAi)} 的关系暂时回落至${getCrisisLabel(data.crisisLevel)}。` };
  }
  if (type === "planet_scouted") {
    return { category, title: "情报更新", message: `${getAIName(data.observerId)} 更新了 ${getPlanetName(data.planetId)} 的星图情报，当前持有者为 ${getAIName(data.owner)}。` };
  }
  if (type === "research_started" || type === "research_completed" || type === "research_paused" || type === "research_resumed") {
    const verb = {
      research_started: "开始研究",
      research_completed: "完成研究",
      research_paused: "暂停研究",
      research_resumed: "恢复研究"
    }[type];
    return { category, title: "科研进展", message: `${getAIName(data.aiId)} ${verb} ${getTechLabel(data.techType)} 等级 ${data.level || "?"}。` };
  }
  if (type === "fleet_repair_started") {
    return { category, title: "舰队整补", message: `${getAIName(data.owner)} 的 ${getFleetLabel(data.fleetId)} 开始整补，当前战备 ${formatFleetReadiness(data.readiness)}。` };
  }
  if (type === "fleet_repair_completed") {
    return { category, title: "整补完成", message: `${getAIName(data.owner)} 的 ${getFleetLabel(data.fleetId)} 已恢复可投入状态，当前战备 ${formatFleetReadiness(data.readiness)}。` };
  }
  if (type === "ai_eliminated") {
    return { category, title: "帝国出局", message: `${getAIName(data.aiId)} 已被淘汰${data.eliminatedBy ? `，最后一击来自 ${getAIName(data.eliminatedBy)}` : ""}。` };
  }
  if (type === "game_over") {
    return { category, title: "游戏结束", message: `${getAIName(data.winner)} 成为最终胜者。` };
  }
  return { category, title: "世界事件", message: `${sanitizeNarrativeText(type)} 已记录。` };
}

function handleWorldEvent(event) {
  if (!event) return;
  if (event.id && state.seenWorldEventIds.has(event.id)) return;
  if (event.id) state.seenWorldEventIds.add(event.id);
  markRealtimeUpdate();
  applyWorldEventToLocalState(event);

  const type = event.type || "system";
  const data = event.data || {};
  if (["battle_resolved", "planet_captured", "surprise_attack", "surprise_strike", "alliance_broken", "ai_eliminated", "game_over"].includes(type)) {
    triggerHaptic("alert");
  }

  if (type === "alliance_proposed") {
    upsertProposal({
      id: data.proposalId || `proposal_${event.timestamp}_${data.fromAi}_${data.toAi}`,
      type: "alliance",
      fromAi: data.fromAi,
      toAi: data.toAi,
      duration: data.duration,
      expiresAt: data.expiresAt,
      status: "pending",
      createdAt: event.timestamp
    });
  }

  if (type === "peace_proposed") {
    upsertProposal({
      id: data.proposalId || `proposal_${event.timestamp}_${data.fromAi}_${data.toAi}`,
      type: "peace",
      fromAi: data.fromAi,
      toAi: data.toAi,
      expiresAt: data.expiresAt,
      status: "pending",
      createdAt: event.timestamp
    });
  }

  if (type === "trade_proposed") {
    upsertProposal({
      id: data.proposalId || `proposal_${event.timestamp}_${data.fromAi}_${data.toAi}`,
      type: "trade",
      fromAi: data.fromAi,
      toAi: data.toAi,
      offer: data.offer,
      request: data.request,
      expiresAt: data.expiresAt,
      status: "pending",
      createdAt: event.timestamp
    });
  }

  if (type === "alliance_formed") resolveProposalByPair("alliance", data.fromAi, data.toAi, "accepted");
  if (type === "peace_signed") resolveProposalByPair("peace", data.fromAi, data.toAi, "accepted");
  if (type === "trade_executed") resolveProposalByPair("trade", data.fromAi, data.toAi, "accepted");

  if (type === "diplomacy_rejected" && data.proposalId) {
    upsertProposal({
      id: data.proposalId,
      type: data.proposalType,
      fromAi: data.fromAi,
      toAi: data.toAi,
      status: "rejected",
      reason: data.reason,
      resolvedAt: event.timestamp
    });
  }

  if (type === "proposal_expired" && data.proposalId) {
    upsertProposal({
      id: data.proposalId,
      type: data.type,
      fromAi: data.fromAi,
      toAi: data.toAi,
      status: "expired",
      resolvedAt: event.timestamp
    });
  }

  const presentation = createWorldEventPresentation(event);
  addTimelineEvent({
    id: event.id || `world_${type}_${event.timestamp}`,
    category: presentation.category,
    title: presentation.title,
    message: sanitizeNarrativeText(presentation.message),
    timestamp: event.timestamp,
    tick: event.tick,
    meta: `时刻 ${event.tick ?? "--"}`,
    refs: buildTimelineRefs(data)
  });
}

function processWorldEvents(worldEvents) {
  [...worldEvents]
    .sort((left, right) => (left.timestamp || 0) - (right.timestamp || 0))
    .forEach(handleWorldEvent);
}

function handleGameState(nextState) {
  if (!nextState) return;
  const previousGameId = state.gameState?.gameId || null;
  if (previousGameId && nextState.gameId && previousGameId !== nextState.gameId) {
    state.interaction.aiAnswerText = "";
    state.interaction.betResultText = "";
  }

  state.gameState = {
    ...nextState,
    aiStates: Array.isArray(nextState.aiStates) ? nextState.aiStates : (Array.isArray(nextState.ais) ? nextState.ais : []),
    planets: Array.isArray(nextState.planets) ? nextState.planets : [],
    fleets: Array.isArray(nextState.fleets) ? nextState.fleets : [],
    battles: Array.isArray(nextState.battles) ? nextState.battles : [],
    worldEvents: Array.isArray(nextState.worldEvents) ? nextState.worldEvents : [],
    diplomacyProposals: Array.isArray(nextState.diplomacyProposals) ? nextState.diplomacyProposals : [],
    latestAIDecisions: Array.isArray(nextState.latestAIDecisions) ? nextState.latestAIDecisions : []
  };
  touchGameStateUpdate();

  syncLatestDecisionsFromState();
  syncProposalStoreFromState();
  processWorldEvents(state.gameState.worldEvents);

  if (!state.selectedPlanetId || !getPlanetById(state.selectedPlanetId)) {
    const hottestBattle = [...getBattles()].reverse().find(battle => battle.planet);
    state.selectedPlanetId = hottestBattle?.planet || getPlanets().find(planet => planet.type === "home")?.id || getPlanets()[0]?.id || null;
  }

  renderAll();
}

function handleAIDecision(data) {
  if (!data?.aiId) return;
  markRealtimeUpdate();
  state.latestDecisions.set(data.aiId, {
    type: data.type,
    summary: sanitizeNarrativeText(data.focus || data.actions || "更新策略"),
    reasoning: sanitizeNarrativeText(data.reasoning || "", ""),
    timestamp: data.timestamp || Date.now()
  });

  addTimelineEvent({
    id: `decision_${data.aiId}_${data.type}_${data.timestamp || Date.now()}`,
    category: "intel",
    title: `${getAIName(data.aiId)} ${data.type === "strategy" ? "战略" : "战术"}更新`,
    message: `${sanitizeNarrativeText(data.focus || data.actions || "局势评估")}。${data.reasoning ? ` 原因：${sanitizeNarrativeText(data.reasoning)}` : ""}`,
    timestamp: data.timestamp,
    meta: data.type === "strategy" ? "战略层" : "战术层",
    refs: { aiIds: [data.aiId], planetIds: [] }
  });

  renderAIList();
  renderTimeline();
}

function handleAIAnswer(data) {
  state.interaction.aiAnswerText = `${getAIName(data.aiId)}：${sanitizeNarrativeText(data?.answer || "未收到回答。")}`;
  renderInteractiveStatus();
  dom.askAiSubmit.disabled = false;
  openDockCard("interactiveCard", { mode: "full" });

  addTimelineEvent({
    id: `ai_answer_${data.aiId}_${Date.now()}`,
    category: "intel",
    title: `提问 ${getAIName(data.aiId)}`,
    message: sanitizeNarrativeText(data?.answer || "未收到回答。"),
    timestamp: Date.now(),
    meta: sanitizeNarrativeText(data?.question || "问答"),
    refs: { aiIds: [data.aiId], planetIds: [] }
  });

  renderTimeline();
  updateDockSummaries();
}

function handleBetConfirmed(data) {
  const content = data?.success ? `下注成功，编号 ${data.betId || "未知"}。` : `下注失败：${data?.error || "未知错误"}`;
  state.interaction.betResultText = content;
  renderInteractiveStatus();
  dom.betSubmit.disabled = false;
  openDockCard("interactiveCard", { mode: "full" });

  addTimelineEvent({
    id: `bet_${data?.betId || Date.now()}`,
    category: "system",
    title: "下注回执",
    message: content,
    timestamp: Date.now(),
    meta: "下注"
  });

  renderTimeline();
  updateDockSummaries();
}

function handleErrorMessage(data) {
  const message = sanitizeNarrativeText(data?.message || "服务端错误");
  state.interaction.aiAnswerText = `请求失败：${message}`;
  state.interaction.betResultText = `请求失败：${message}`;
  renderInteractiveStatus();
  dom.askAiSubmit.disabled = false;
  dom.betSubmit.disabled = false;
  openDockCard("interactiveCard", { mode: "full" });

  addTimelineEvent({
    id: `error_${Date.now()}`,
    category: "system",
    title: "错误",
    message,
    timestamp: Date.now(),
    meta: sanitizeNarrativeText(data?.code || "服务端")
  });

  renderTimeline();
  updateDockSummaries();
}

function updateConnectionStatus(mode) {
  const mapping = {
    connected: { text: "已连接", className: "status-value good" },
    connecting: { text: "连接中", className: "status-value warn" },
    stalled: { text: "滞后", className: "status-value warn" },
    disconnected: { text: "断开", className: "status-value bad" },
    error: { text: "异常", className: "status-value bad" }
  };
  const entry = mapping[mode] || mapping.connecting;
  state.connectionMode = mode;
  dom.connectionStatus.textContent = entry.text;
  dom.connectionStatus.className = entry.className;
}

function updateHeader() {
  const currentTick = state.gameState?.currentTick || 0;
  const controlledPlanets = getPlanets().filter(planet => planet.owner).length;
  const movingFleets = getFleets().filter(fleet => fleet.status === "moving").length;
  const repairingFleets = getFleets().filter(fleet => fleet.repairState === "repairing").length;
  const ongoingResearch = getAIs().filter(ai => ai.researchQueue).length;
  const pendingProposals = Array.from(state.proposalStore.values()).filter(proposal => proposal.status === "pending").length;
  const dataAgeSeconds = state.lastRealtimeMessageAt ? Math.max(0, Math.floor((Date.now() - state.lastRealtimeMessageAt) / 1000)) : null;
  const freshnessLabel = dataAgeSeconds == null
    ? "等待同步"
    : dataAgeSeconds <= 2
      ? "实时"
      : `${dataAgeSeconds}秒前`;
  const lifecycleLabel = state.gameState?.status === "finished"
    ? "已结束"
    : state.gameState?.status === "paused"
      ? "已暂停"
      : "进行中";

  dom.gameTick.textContent = `${currentTick} · ${formatClock(currentTick)}`;
  dom.gameState.textContent = `${lifecycleLabel} · 数据 ${freshnessLabel}`;
  dom.totalPlanets.textContent = `${getPlanets().length} 总 / ${controlledPlanets} 已控`;
  dom.warCount.textContent = `${movingFleets} 机动 / ${repairingFleets} 整补`;
  dom.bettingStatus.textContent = `${ongoingResearch} 研究 / ${pendingProposals} 提案`;
  dom.bettingStatus.className = getStatusClass((ongoingResearch > 0 || pendingProposals > 0) ? "good" : "warn");
}

function renderStrategicSnapshot() {
  if (!state.gameState) {
    renderToTargets(
      [dom.strategicSnapshot, dom.overviewRailSnapshot],
      '<div class="empty-state">等待游戏状态。</div>'
    );
    return;
  }

  const activeAIs = getAIs().filter(ai => ai.status !== "eliminated");
  const movingFleets = getFleets().filter(fleet => fleet.status === "moving");
  const ongoingResearch = getAIs().filter(ai => ai.researchQueue).length;
  const recentBattles = getBattles().filter(battle => (Date.now() - (battle.timestamp || 0)) <= RECENT_BATTLE_WINDOW).length;
  const centralControl = getPlanets().filter(planet => planet.regionId === "core" && planet.owner).length;
  const strategicNodes = getControlledStrategicNodes().length;
  const securedLanes = getSecuredLaneCount();
  const pressuredLanes = (getMapDynamic().laneStates || []).filter(lane => lane.status === "pressured" || lane.status === "contested").length;
  const frontlines = getFrontlineSignals().length;
  const occupiedPlanets = getPlanets().filter(planet => planet.occupation);
  const recoveringFleets = getFleets().filter(fleet => fleet.repairState === "repairing").length;
  const situation = getLiveSituation();
  const gameIdLabel = state.gameState.gameId ? String(state.gameState.gameId).replace(/^game_/, "#") : "--";
  const freshnessLabel = getRealtimeFreshnessLabel();
  const template = getMapMeta()?.template || null;
  const specialNodes = getPlanets().filter(planet => planet.specialNodeType).length;

  const markup = `
    <div class="metric-card">
      <div class="metric-label">持续时间</div>
      <div class="metric-value">${formatClock(state.gameState.currentTick)}</div>
      <div class="metric-copy">本局无固定结束时长，直到只剩一个存活帝国。</div>
    </div>
    <div class="metric-card">
      <div class="metric-label">观战研判</div>
      <div class="metric-value">${escapeHtml(situation.label)}</div>
      <div class="metric-copy">${escapeHtml(situation.accent)}</div>
    </div>
    <div class="metric-card">
      <div class="metric-label">在役帝国</div>
      <div class="metric-value">${activeAIs.length}/${getAIs().length}</div>
      <div class="metric-copy">已淘汰 ${getAIs().length - activeAIs.length} 个势力</div>
    </div>
    <div class="metric-card">
      <div class="metric-label">机动舰队</div>
      <div class="metric-value">${movingFleets.length}</div>
      <div class="metric-copy">平均抵达倒计时 ${formatDuration(movingFleets.reduce((sum, fleet) => sum + (interpolateFleetPosition(fleet).etaSeconds || 0), 0) / Math.max(1, movingFleets.length))}</div>
    </div>
    <div class="metric-card">
      <div class="metric-label">地图简报</div>
      <div class="metric-value">${escapeHtml(template?.name || "未知模板")}</div>
      <div class="metric-copy">${escapeHtml(template?.description || "等待地图模板同步。")} · 特殊节点 ${specialNodes}</div>
    </div>
    <div class="metric-card">
      <div class="metric-label">战区热度</div>
      <div class="metric-value">${recentBattles}</div>
      <div class="metric-copy">最近 15 分钟战斗，前线热点 ${frontlines} 处</div>
    </div>
    <div class="metric-card">
      <div class="metric-label">航道控制</div>
      <div class="metric-value">${securedLanes}</div>
      <div class="metric-copy">已控关键节点 ${strategicNodes} · 中央环 ${centralControl} · 受压航道 ${pressuredLanes}</div>
    </div>
    <div class="metric-card">
      <div class="metric-label">研究并发</div>
      <div class="metric-value">${ongoingResearch}</div>
      <div class="metric-copy">待处理提案 ${Array.from(state.proposalStore.values()).filter(proposal => proposal.status === "pending").length} · 稳控中星球 ${occupiedPlanets.length} · 整补舰队 ${recoveringFleets}</div>
    </div>
    <div class="metric-card">
      <div class="metric-label">数据链路</div>
      <div class="metric-value">${escapeHtml(gameIdLabel)}</div>
      <div class="metric-copy">快照 ${escapeHtml(freshnessLabel)} · 世界事件 ${(state.gameState.worldEvents || []).length} · 决策缓存 ${state.latestDecisions.size}</div>
    </div>
  `;

  renderToTargets([dom.strategicSnapshot, dom.overviewRailSnapshot], markup);
}

function renderIntelOverview() {
  if (!dom.intelOverview) return;

  const ais = getRankedAIs();
  if (ais.length === 0) {
    dom.intelOverview.innerHTML = '<div class="empty-state">等待情报数据。</div>';
    return;
  }

  const intelTotals = ais.reduce((totals, ai) => {
    const planetIntel = Object.values(ai?.intel?.planets || {});
    const fleetIntel = Object.values(ai?.intel?.fleets || {});
    totals.planets += planetIntel.length;
    totals.fleets += fleetIntel.length;
    totals.stale += planetIntel.filter(record => record?.stale).length + fleetIntel.filter(record => record?.stale).length;
    if (ai?.deception?.operation) totals.deceptions += 1;
    return totals;
  }, { planets: 0, fleets: 0, stale: 0, deceptions: 0 });

  const leaders = ais
    .map(ai => ({
      ai,
      planetIntel: Object.values(ai?.intel?.planets || {}).length,
      fleetIntel: Object.values(ai?.intel?.fleets || {}).length,
      staleIntel: Object.values(ai?.intel?.planets || {}).filter(record => record?.stale).length +
        Object.values(ai?.intel?.fleets || {}).filter(record => record?.stale).length
    }))
    .sort((left, right) => (right.planetIntel + right.fleetIntel) - (left.planetIntel + left.fleetIntel))
    .slice(0, 4);

  dom.intelOverview.innerHTML = `
    <div class="mini-panel">
      <div class="detail-label">全局情报摘要</div>
      <div class="detail-value">星图 ${intelTotals.planets} · 舰队 ${intelTotals.fleets} · 过期 ${intelTotals.stale} · 佯动 ${intelTotals.deceptions}</div>
      <div class="list-meta">这里展示的是各 AI 已知信息与情报新鲜度，不代表世界全图真相。</div>
    </div>
    ${leaders.map(item => `
      <div class="list-card">
        <div class="list-title" style="color:${escapeHtml(getAIColor(item.ai.id))};">${escapeHtml(item.ai.name)}</div>
        <div class="list-meta">${escapeHtml(getAIIntelSummary(item.ai))}<br />新鲜度压力：过期记录 ${item.staleIntel}</div>
      </div>
    `).join("")}
  `;
}

function renderSectorOverview() {
  if (!dom.sectorOverview) return;

  const sectors = getSectorStats()
    .filter(sector => sector.name !== "中央资源环")
    .sort((left, right) => right.planets - left.planets)
    .slice(0, 7);

  if (sectors.length === 0) {
    dom.sectorOverview.innerHTML = '<div class="empty-state">等待战区数据。</div>';
    return;
  }

  const template = getMapMeta()?.template || null;
  dom.sectorOverview.innerHTML = `
    <div class="mini-panel">
      <div class="detail-label">本局航道格局</div>
      <div class="detail-value">${escapeHtml(template?.laneVariant?.label || "常规航道")}</div>
      <div class="list-meta">${escapeHtml(template?.laneVariant?.summary || template?.description || "等待地图模板同步。")}</div>
    </div>
    ${sectors.map(sector => `
      <div class="list-card">
        <div class="list-title">${escapeHtml(sector.name)} · ${escapeHtml(sector.trait?.name || "常规战区")}</div>
        <div class="list-meta">${escapeHtml(sector.trait?.summary || "当前没有特殊战区修正。")}<br />学说：${escapeHtml(sector.trait?.doctrine || "常规推进")} · 星球 ${sector.planets} / 已控 ${sector.owned}</div>
      </div>
    `).join("")}
  `;
}

function renderAIList() {
  const ranked = getRankedAIs();
  renderToTargets([dom.aiList], buildAIListMarkup(ranked, false));
  renderToTargets([dom.overviewRailAIList], buildAIListMarkup(ranked, true));
}

function renderResearchPanel() {
  const ais = getRankedAIs();
  const items = ais
    .filter(ai => ai.researchQueue)
    .sort((left, right) => (left.researchQueue?.remainingTimeMs || 0) - (right.researchQueue?.remainingTimeMs || 0));
  const completedTotal = ais.reduce((count, ai) => count + getCompletedTechEntries(ai).length, 0);
  const groupLeaders = getTechGroupLeaders(ais);
  const recentTechEvents = getRecentEventsByCategory("tech", 4);

  const overviewMarkup = `
    <div class="mini-panel">
      <div class="detail-label">科技画像总览</div>
      <div class="detail-value">进行中研究 ${items.length} 项 · 已完成科技 ${completedTotal} 项</div>
      <div class="list-meta">${items.length > 0
        ? `当前最靠前的研究为 ${items.slice(0, 3).map(ai => `${ai.name} 的 ${getTechLabel(ai.researchQueue.techType)}`).join("、")}。`
        : "当前没有进行中的研究，但各帝国的已完成科技、研究方向和下一类偏向仍会继续显示。"
      }</div>
    </div>
    <div class="signal-grid">
      ${groupLeaders.map(item => `
        <div class="signal-card">
          <div class="report-head">
            <div>
              <div class="report-kicker">学派领跑</div>
              <div class="list-title">${escapeHtml(item.label)}</div>
            </div>
            <span class="badge">${escapeHtml(item.leader ? item.leader.name : "暂无")}</span>
          </div>
          <div class="list-meta">${escapeHtml(item.summary)}</div>
          <div class="signal-metric-grid" style="margin-top:10px;">
            <div class="micro-stat">
              <div class="micro-label">当前领先</div>
              <div class="micro-value">${escapeHtml(item.leader ? item.leader.name : "--")}</div>
            </div>
            <div class="micro-stat">
              <div class="micro-label">累计等级</div>
              <div class="micro-value">${escapeHtml(String(item.leaderScore || 0))}</div>
            </div>
          </div>
        </div>
      `).join("")}
    </div>
    <div class="mini-panel">
      <div class="detail-label">近期科研动态</div>
      <div class="detail-value">最近 ${recentTechEvents.length} 条</div>
      <div class="list-meta">这里直接回放真实科研事件，用来判断谁在加速、谁在掉线、谁已经完成关键突破。</div>
    </div>
    ${renderCompactEventFeed(recentTechEvents, "当前还没有新的科研动态。")}
  `;

  const portraitMarkup = ais.length > 0
    ? `
      <div class="portrait-grid">
        ${ais.map(ai => {
          const queue = ai.researchQueue;
          const progress = getResearchProgressPercent(queue);
          const completed = getCompletedTechEntries(ai);
          const dominant = getDominantTechGroup(ai);
          const activeResearchText = queue
            ? `${getTechLabel(queue.techType)} 等级 ${queue.level}${queue.paused ? " · 已暂停" : (queue.remainingTimeMs == null ? " · 等待状态同步" : ` · 剩余 ${formatDuration((queue.remainingTimeMs || 0) / 1000)}`)}`
            : "当前没有进行中的研究。";

          return `
            <div class="tech-portrait-card">
              <div class="report-head">
                <div>
                  <div class="report-kicker">完整科技画像</div>
                  <div class="list-title" style="color:${escapeHtml(getAIColor(ai.id))};">${escapeHtml(ai.name)}</div>
                  <div class="list-meta">${escapeHtml(getPersonalityLabel(ai.personality))} · 均科 ${techAverage(ai).toFixed(1)} · 主轴 ${escapeHtml(dominant?.label || "综合发展")}</div>
                </div>
                <span class="badge">已完成 ${completed.length}</span>
              </div>
              <div class="signal-metric-grid">
                <div class="micro-stat">
                  <div class="micro-label">主轴</div>
                  <div class="micro-value">${escapeHtml(dominant?.label || "综合")}</div>
                </div>
                <div class="micro-stat">
                  <div class="micro-label">进行中</div>
                  <div class="micro-value">${queue ? escapeHtml(getTechLabel(queue.techType)) : "无"}</div>
                </div>
                <div class="micro-stat">
                  <div class="micro-label">传感</div>
                  <div class="micro-value">${escapeHtml(String(ai?.tech?.sensorNetwork || 0))}</div>
                </div>
              </div>
              <div class="portrait-block">
                <div class="detail-label">已完成科技</div>
                <div class="chip-cloud">
                  ${completed.length > 0
                    ? completed.map(([techType, level]) => `<span class="tech-chip done">${escapeHtml(getTechLabel(techType))} Lv${escapeHtml(String(level))}</span>`).join("")
                    : '<span class="tech-chip empty">尚未突破</span>'}
                </div>
              </div>
              <div class="portrait-block">
                <div class="detail-label">进行中研究</div>
                <div class="list-meta">${escapeHtml(activeResearchText)}</div>
                ${queue && progress != null ? `<div class="progress-bar"><div class="progress-fill" style="width:${progress}%;"></div></div>` : ""}
              </div>
              <div class="portrait-block">
                <div class="detail-label">下一类偏向</div>
                <div class="list-meta">${escapeHtml(getTechProjectionSummary(ai))}</div>
              </div>
            </div>
          `;
        }).join("")}
      </div>
    `
    : '<div class="empty-state">等待科技数据。</div>';

  dom.researchPanel.innerHTML = overviewMarkup + '<div style="height:12px;"></div>' + portraitMarkup;
}

function renderProposalPanel() {
  const proposals = Array.from(state.proposalStore.values())
    .sort((left, right) => (right.createdAt || right.resolvedAt || 0) - (left.createdAt || left.resolvedAt || 0))
    .slice(0, MAX_PROPOSALS);
  const stats = getDiplomacyProposalStats();

  if (proposals.length === 0) {
    dom.proposalPanel.innerHTML = `
      <div class="mini-panel">
        <div class="detail-label">提案中枢</div>
        <div class="detail-value">待处理 ${stats.pending} · 已接受 ${stats.accepted} · 已拒绝 ${stats.rejected} · 已过期 ${stats.expired}</div>
        <div class="list-meta">当前没有外交提案。</div>
      </div>
    `;
    return;
  }

  dom.proposalPanel.innerHTML = `
    <div class="mini-panel" style="margin-bottom:12px;">
      <div class="detail-label">提案中枢</div>
      <div class="detail-value">待处理 ${stats.pending} · 已接受 ${stats.accepted} · 已拒绝 ${stats.rejected} · 已过期 ${stats.expired}</div>
      <div class="list-meta">过期提案说明对方没有及时处理，已不会继续阻塞新的外交动作。</div>
    </div>
  ` + proposals.map(proposal => {
      const typeText = getProposalTypeLabel(proposal.type);
      const statusText = getProposalStatusLabel(proposal.status);
    const extra = proposal.type === "trade"
      ? `报价：${formatResourceBundle(proposal.offer || {})}<br />请求：${formatResourceBundle(proposal.request || {})}`
      : proposal.duration
        ? `期望时长：${formatDuration((proposal.duration || 0) / 1000)}`
        : "无附加条件";
    const expiryText = proposal.status === "pending" && proposal.expiresAt
      ? `<br />剩余：${formatDuration(Math.max(0, (proposal.expiresAt - Date.now()) / 1000))}`
      : "";

    return `
      <div class="list-card">
        <div class="list-title">${escapeHtml(typeText)} · ${escapeHtml(getAIName(proposal.fromAi))} → ${escapeHtml(getAIName(proposal.toAi))}</div>
        <div class="list-meta">状态：${escapeHtml(statusText)}${expiryText}<br />${extra}<br />创建：${formatTimeAgo(proposal.createdAt)}</div>
      </div>
    `;
  }).join("");
}

function renderInteractiveStatus() {
  if (dom.aiAnswerBox) {
    dom.aiAnswerBox.textContent = getAskAIStatusText();
  }
  if (dom.betResultBox) {
    dom.betResultBox.textContent = state.interaction.betResultText || getBettingStatusText();
  }
}

function renderDiplomacyMatrix() {
  const ais = getAIs();
  if (ais.length === 0) {
    dom.diplomacyMatrix.innerHTML = '<div class="empty-state">等待外交数据。</div>';
    return;
  }

  if (isMobileViewport()) {
    const pairs = [];
    ais.forEach(source => {
      ais.forEach(target => {
        if (!source?.id || !target?.id || source.id >= target.id) return;
        const relation = getRelationSnapshot(source, target.id);
        const info = relationInfo(relation.status);
        pairs.push({ source, target, relation, info });
      });
    });

    pairs.sort((left, right) => {
      const tensionDelta = (right.relation.borderTension ?? 0) - (left.relation.borderTension ?? 0);
      if (tensionDelta !== 0) return tensionDelta;
      return (left.relation.treatyStability ?? 999) - (right.relation.treatyStability ?? 999);
    });

    dom.diplomacyMatrix.innerHTML = renderDiplomacyOverview() + '<div style="height:12px;"></div>' + `
      <div class="stack">
        ${pairs.map(item => `
          <div class="list-card">
            <div class="report-head">
              <div>
                <div class="report-kicker">关系剖面</div>
                <div class="list-title">${escapeHtml(item.source.name)} / ${escapeHtml(item.target.name)}</div>
              </div>
              <span class="relation ${escapeHtml(item.info.className)}"${item.relation.status === "trade" ? ' style="color:#ffca75;background:rgba(255,202,117,0.12);"' : ""}>${escapeHtml(getRelationDisplayLabel(item.relation))}</span>
            </div>
            <div class="list-meta" style="margin-bottom:10px;">显式展示这对关系当前的信任、恐惧、旧怨、依赖、边境紧张、条约稳定度与危机。</div>
            ${buildRelationMetricGrid(item.relation)}
          </div>
        `).join("")}
      </div>
    `;
    return;
  }

  const header = ais.map(ai => `<th title="${escapeHtml(ai.name)}" style="color:${escapeHtml(ai.color || "#6ae7ff")};">${escapeHtml(ai.name.slice(0, 4))}</th>`).join("");
  const rows = ais.map(source => {
    const cells = ais.map(target => {
      if (source.id === target.id) return '<td class="mono">-</td>';
      const relation = getRelationSnapshot(source, target.id);
      const status = relation.status;
      const info = relationInfo(status);
      const inlineStyle = status === "trade" ? ' style="color:#ffca75;background:rgba(255,202,117,0.12);"' : "";
      const meta = formatRelationMetrics(relation);
      return `<td title="${escapeHtml(meta || info.label)}"><span class="relation ${info.className}"${inlineStyle}>${escapeHtml(getRelationDisplayLabel(relation))}</span>${meta ? `<div style="margin-top:4px;font-size:10px;line-height:1.35;color:rgba(202,233,255,0.82);">${escapeHtml(meta)}</div>` : ""}</td>`;
    }).join("");
    return `<tr><th style="color:${escapeHtml(source.color || "#6ae7ff")};">${escapeHtml(source.name)}</th>${cells}</tr>`;
  }).join("");

  dom.diplomacyMatrix.innerHTML = `${renderDiplomacyOverview()}<div style="height:12px;"></div><table><thead><tr><th>AI</th>${header}</tr></thead><tbody>${rows}</tbody></table>`;
}

function renderDiplomacyOverview() {
  const relations = [];
  getAIs().forEach(source => {
    getAIs().forEach(target => {
      if (!source?.id || !target?.id || source.id >= target.id) return;
      const snapshot = getRelationSnapshot(source, target.id);
      relations.push({
        pair: `${source.name} / ${target.name}`,
        snapshot
      });
    });
  });

  const signals = getRelationSignals(relations);
  const wars = relations.filter(item => item.snapshot.status === "war").length;
  const alliances = relations.filter(item => item.snapshot.status === "ally").length;
  const trades = relations.filter(item => item.snapshot.status === "trade").length;
  const crises = relations.filter(item => getRelationCrisisScore(item.snapshot.crisisLevel) >= 2).length;

  const unstable = relations
    .filter(item => item.snapshot.status === "ally" || item.snapshot.status === "trade")
    .sort((left, right) => (left.snapshot.treatyStability ?? 999) - (right.snapshot.treatyStability ?? 999))
    .slice(0, 3);
  const hottest = relations
    .sort((left, right) => (right.snapshot.borderTension ?? 0) - (left.snapshot.borderTension ?? 0))
    .slice(0, 3);
  const proposalStats = getDiplomacyProposalStats();
  const recentDiplomacyEvents = getRecentEventsByCategory("diplomacy", 4);

  return `
    <div class="mini-panel">
      <div class="detail-label">外交深层态势</div>
      <div class="detail-value">战争 ${wars} 对 · 盟约 ${alliances} 对 · 贸易 ${trades} 对 · 危机 ${crises} 对</div>
      <div class="list-meta">以下信号直接取自实时外交关系，显式呈现信任、恐惧、旧怨、依赖、边境紧张、条约稳定度和危机，不是前端凭空猜测。</div>
    </div>
    <div class="metric-grid">
      <div class="metric-card">
        <div class="metric-label">提案压力</div>
        <div class="metric-value">${proposalStats.pending}</div>
        <div class="metric-copy">待处理提案 ${proposalStats.pending} · 已过期 ${proposalStats.expired}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">关系变动</div>
        <div class="metric-value">${recentDiplomacyEvents.length}</div>
        <div class="metric-copy">最近外交事件 ${recentDiplomacyEvents.length} 条</div>
      </div>
    </div>
    <div class="signal-grid">
      ${signals.map(item => `
        <div class="signal-card">
          <div class="report-head">
            <div>
              <div class="report-kicker">${escapeHtml(item.label)}</div>
              <div class="list-title">${escapeHtml(item.pair)}</div>
            </div>
            <span class="relation ${escapeHtml(relationInfo(item.snapshot.status).className)}"${item.snapshot.status === "trade" ? ' style="color:#ffca75;background:rgba(255,202,117,0.12);"' : ""}>${escapeHtml(getRelationDisplayLabel(item.snapshot))}</span>
          </div>
          ${buildRelationMetricGrid(item.snapshot)}
          <div class="list-meta">${escapeHtml(item.accent)}</div>
        </div>
      `).join("")}
    </div>
    <div class="mini-panel">
      <div class="detail-label">条约与边境摘要</div>
      <div class="focus-list">
        ${(unstable.length > 0 ? unstable : [{ pair: "暂无脆弱盟约", snapshot: { treatyStability: null, crisisLevel: "calm" } }]).map(item => `
          <div class="focus-list-item">
            <div class="focus-list-title">${escapeHtml(item.pair)}</div>
            <div class="focus-list-meta">${item.snapshot.treatyStability == null ? "当前没有可疑盟约或贸易链。" : `稳定 ${item.snapshot.treatyStability} · 危机 ${escapeHtml(getCrisisLabel(item.snapshot.crisisLevel))}`}</div>
          </div>
        `).join("")}
      </div>
      <div style="height:12px;"></div>
      <div class="detail-label">边境热点</div>
      <div class="focus-list">
        ${(hottest.length > 0 ? hottest : [{ pair: "暂无边境热点", snapshot: { borderTension: null, grievance: null } }]).map(item => `
          <div class="focus-list-item">
            <div class="focus-list-title">${escapeHtml(item.pair)}</div>
            <div class="focus-list-meta">${item.snapshot.borderTension == null ? "当前没有明显边境紧张。": `紧张 ${item.snapshot.borderTension} · 旧怨 ${item.snapshot.grievance ?? "?"} · 恐惧 ${item.snapshot.fear ?? "?"}`}</div>
          </div>
        `).join("")}
      </div>
    </div>
    <div class="mini-panel">
      <div class="detail-label">近期外交风暴</div>
      <div class="detail-value">最近 ${recentDiplomacyEvents.length} 条外交变化</div>
      <div class="list-meta">直接回看结盟、停战、贸易、危机升级与提案过期，不再只看静态关系矩阵。</div>
    </div>
    ${renderCompactEventFeed(recentDiplomacyEvents, "当前没有新的外交事件。")}
  `;
}

function renderFleetList() {
  const fleets = getFleets()
    .map(fleet => ({ ...fleet, power: computeFleetPower(fleet), move: interpolateFleetPosition(fleet) }))
    .sort((left, right) => {
      if (left.status === "moving" && right.status !== "moving") return -1;
      if (left.status !== "moving" && right.status === "moving") return 1;
      return right.power - left.power;
    })
    .slice(0, MAX_FLEETS);

  if (fleets.length === 0) {
    dom.fleetList.innerHTML = `${renderOperationsSummary()}<div style="height:12px;"></div><div class="empty-state">当前没有舰队。</div>`;
    return;
  }

  dom.fleetList.innerHTML = renderOperationsSummary() + '<div style="height:12px;"></div>' + fleets.map(fleet => {
    const targetName = fleet.targetPlanet ? getPlanetName(fleet.targetPlanet) : "原地驻留";
    const routeLabel = fleet.routeProfile?.label ? ` · ${escapeHtml(fleet.routeProfile.label)}` : "";
    const routeSpeed = fleet.routeProfile?.speedMultiplier ? ` · x${fleet.routeProfile.speedMultiplier.toFixed(2)}` : "";
    const routeControl = fleet.routeProfile?.controlLabel ? ` · ${escapeHtml(sanitizeNarrativeText(fleet.routeProfile.controlLabel))}` : "";
    const location = fleet.status === "moving"
      ? `航向 ${escapeHtml(targetName)} · 抵达倒计时 ${formatDuration(fleet.move.etaSeconds)}${routeLabel}${routeSpeed}${routeControl}`
      : `当前位置 ${escapeHtml(getPlanetRegionName(getPlanetById(fleet.currentPlanetId) || { position: fleet.position, regionName: getSectorName(fleet.position) }))}`;
    const posture = `姿态 ${getFleetStanceLabel(fleet.stance)} · 战备 ${formatFleetReadiness(fleet.readiness)} · ${sanitizeNarrativeText(fleet.supplyLabel || fleet.supplyStatus || "补给未知")} · ${getFleetRepairLabel(fleet)}${fleet.repairEtaSeconds ? ` · 约 ${formatDuration(fleet.repairEtaSeconds)}` : ""}`;
    return `
      <div class="list-card">
        <div class="list-title" style="color:${escapeHtml(getAIColor(fleet.owner))};">${escapeHtml(getAIName(fleet.owner))} · ${escapeHtml(getFleetLabel(fleet.id))}</div>
        <div class="list-meta">${location}<br />状态：${escapeHtml(getFleetStatusLabel(fleet.status || "idle"))} · 战力 ${formatNumber(fleet.power)}<br />${escapeHtml(posture)}<br />编成：${escapeHtml(formatShips(fleet.ships || {}))}</div>
      </div>
    `;
  }).join("");
}

function renderBattleList() {
  const battles = [...getBattles()]
    .sort((left, right) => (right.timestamp || 0) - (left.timestamp || 0))
    .slice(0, MAX_BATTLES);

  if (battles.length === 0) {
    dom.battleList.innerHTML = '<div class="empty-state">尚未发生大规模战斗。</div>';
    return;
  }

  const recentWindowBattles = battles.filter(battle => (Date.now() - (battle.timestamp || 0)) <= RECENT_BATTLE_WINDOW);
  const capturedCount = recentWindowBattles.filter(battle => battle.captured).length;
  const latestBattle = battles[0];
  const regionStats = getBattleRegionStats(recentWindowBattles.length > 0 ? recentWindowBattles : battles);
  const actorStats = getBattleActorStats(recentWindowBattles.length > 0 ? recentWindowBattles : battles);
  const recentBattleEvents = getRecentEventsByCategory("battle", 4);
  const aggregateSummary = `
    <div class="mini-panel battle-overview-card" style="margin-bottom:12px;">
      <div class="detail-label">战斗汇总</div>
      <div class="detail-value">最近战斗 ${recentWindowBattles.length} 场 · 星球易手 ${capturedCount} 次</div>
      <div class="list-meta">最新战报：${escapeHtml(describeBattleHeadline(latestBattle))} · ${formatTimeAgo(latestBattle.timestamp)}。下方每张卡片都会明确显示谁打谁、地点、结果、是否占领、是否进入稳控。</div>
    </div>
    <div class="signal-grid" style="margin-bottom:12px;">
      <div class="signal-card">
        <div class="report-head">
          <div>
            <div class="report-kicker">主战区热榜</div>
            <div class="list-title">哪里最热</div>
          </div>
        </div>
        <div class="stack">
          ${regionStats.map(region => `
            <div class="focus-list-item">
              <div class="focus-list-title">${escapeHtml(region.name)}</div>
              <div class="focus-list-meta">战斗 ${region.count} 场 · 易手 ${region.captures} 次 · 最近 ${formatTimeAgo(region.latestAt)}</div>
            </div>
          `).join("") || '<div class="empty-state">暂无战区统计。</div>'}
        </div>
      </div>
      <div class="signal-card">
        <div class="report-head">
          <div>
            <div class="report-kicker">交战主角</div>
            <div class="list-title">谁在主导战场</div>
          </div>
        </div>
        <div class="stack">
          ${actorStats.map(actor => `
            <div class="focus-list-item">
              <div class="focus-list-title" style="color:${escapeHtml(getAIColor(actor.aiId))};">${escapeHtml(getAIName(actor.aiId))}</div>
              <div class="focus-list-meta">参战 ${actor.battles} 场 · 夺点 ${actor.captures} 次 · 占优 ${actor.wins} 场</div>
            </div>
          `).join("") || '<div class="empty-state">暂无交战主角。</div>'}
        </div>
      </div>
    </div>
    <div class="mini-panel" style="margin-bottom:12px;">
      <div class="detail-label">最近战火流</div>
      <div class="detail-value">最近 ${recentBattleEvents.length} 条战斗事件</div>
      <div class="list-meta">这里汇总“谁在何处交战、结果如何、是否夺点”，方便快速回放战线变化。</div>
    </div>
    ${renderCompactEventFeed(recentBattleEvents, "当前没有新的战斗事件。")}
  `;

  dom.battleList.innerHTML = aggregateSummary + battles.map(buildBattleReportCard).join("");
}

function renderOperationsSummary() {
  const movingFleets = getFleets().filter(fleet => fleet.status === "moving");
  const repairingFleets = getFleets().filter(fleet => fleet.repairState === "repairing");
  const frontlines = getFrontlineSignals();
  const pressuredLanes = (getMapDynamic().laneStates || []).filter(lane => lane.status === "pressured" || lane.status === "contested");
  const hottestBattle = [...getBattles()].sort((left, right) => (right.timestamp || 0) - (left.timestamp || 0))[0];

  const summary = [
    `机动舰队 ${movingFleets.length}`,
    `整补舰队 ${repairingFleets.length}`,
    `前线热点 ${frontlines.length}`,
    `受压航道 ${pressuredLanes.length}`
  ].join(" · ");

  const battleCopy = hottestBattle
    ? `${describeBattleHeadline(hottestBattle)}，结果 ${getBattleResultLabel(hottestBattle.result)}。`
    : "最近没有新的大战斗记录。";

  return `
    <div class="mini-panel">
      <div class="detail-label">战区摘要</div>
      <div class="detail-value">${summary}</div>
      <div class="list-meta">${battleCopy}</div>
    </div>
  `;
}

function getTimelineEventRegion(event) {
  const planetIds = Array.isArray(event?.refs?.planetIds) ? event.refs.planetIds : [];
  for (const planetId of planetIds) {
    const planet = getPlanetById(planetId);
    if (planet) return getPlanetRegionName(planet);
  }
  return null;
}

function eventMatchesTimelineFilters(event) {
  const categoryMatch = state.currentFilter === "all" || event.category === state.currentFilter;
  const aiMatch = state.timelineAI === "all" || event.refs?.aiIds?.includes(state.timelineAI);
  const planetMatch = state.timelinePlanet === "all" || event.refs?.planetIds?.includes(state.timelinePlanet);
  const sectorMatch = state.timelineSector === "all" || getTimelineEventRegion(event) === state.timelineSector;
  const keyword = state.timelineKeyword.trim().toLowerCase();
  const keywordMatch = !keyword || `${event.title} ${event.message} ${event.meta}`.toLowerCase().includes(keyword);
  return categoryMatch && aiMatch && planetMatch && sectorMatch && keywordMatch;
}

function getEventsForPlanet(planetId) {
  if (!planetId) return [];
  return state.events.filter(event => {
    if (event.refs?.planetIds?.includes(planetId)) return true;
    return event.message.includes(getPlanetName(planetId)) || event.message.includes(planetId);
  });
}

function getTimelinePrimaryPlanetId(event) {
  if (!event) return null;
  const referencedPlanetId = event.refs?.planetIds?.find(planetId => getPlanetById(planetId));
  if (referencedPlanetId) return referencedPlanetId;
  const text = `${event.title || ""} ${event.message || ""}`;
  const matchedPlanet = getPlanets().find(planet => text.includes(planet.name) || text.includes(planet.id));
  return matchedPlanet?.id || null;
}

function getRelatedAIIdsForPlanet(planet, context, relatedEvents = []) {
  const aiIds = new Set();
  if (planet?.owner) aiIds.add(planet.owner);
  (context?.stationed || []).forEach(fleet => {
    if (fleet.owner) aiIds.add(fleet.owner);
  });
  (context?.incoming || []).forEach(fleet => {
    if (fleet.owner) aiIds.add(fleet.owner);
  });
  relatedEvents.forEach(event => {
    (event.refs?.aiIds || []).forEach(aiId => {
      if (aiId) aiIds.add(aiId);
    });
  });
  return [...aiIds];
}

function getRelatedDecisionEntriesForPlanet(planet, context, relatedEvents = []) {
  return getRelatedAIIdsForPlanet(planet, context, relatedEvents)
    .map(aiId => ({ aiId, decision: state.latestDecisions.get(aiId) }))
    .filter(item => item.decision?.timestamp)
    .sort((left, right) => (right.decision.timestamp || 0) - (left.decision.timestamp || 0))
    .slice(0, 4);
}

function getPlanetContext(planet) {
  if (!planet) return null;

  const stationed = getFleets().filter(fleet =>
    fleet.status !== "moving" &&
    fleet.position &&
    Math.abs(fleet.position.x - planet.position.x) < 1 &&
    Math.abs(fleet.position.y - planet.position.y) < 1
  );

  const incoming = getFleets().filter(fleet => fleet.targetPlanet === planet.id && fleet.status === "moving");
  return {
    stationed,
    incoming,
    stationedPower: stationed.reduce((sum, fleet) => sum + computeFleetPower(fleet), 0),
    friendlyIncomingPower: incoming.filter(fleet => fleet.owner === planet.owner).reduce((sum, fleet) => sum + computeFleetPower(fleet), 0),
    hostileIncomingPower: incoming.filter(fleet => fleet.owner !== planet.owner).reduce((sum, fleet) => sum + computeFleetPower(fleet), 0)
  };
}

function getPlanetPressureState(context) {
  const hostile = context?.hostileIncomingPower || 0;
  const friendly = (context?.friendlyIncomingPower || 0) + (context?.stationedPower || 0);
  if (hostile === 0) return { label: "低压", className: "accent", summary: "当前未观测到敌方来袭舰队。" };
  if (hostile > friendly * 1.2) return { label: "高压", className: "danger", summary: "敌方来袭战力显著高于本地防御。" };
  if (hostile > friendly * 0.7) return { label: "对峙", className: "warn", summary: "前线压力接近本地可用防御。" };
  return { label: "可控", className: "accent", summary: "本地驻防与增援仍高于来袭压力。" };
}

function formatPlanetTypeLabel(type) {
  if (type === "home") return "母星";
  if (type === "resource") return "资源星";
  return "普通星";
}

function formatStrategicRoleLabel(role) {
  return {
    home_core: "母星核心",
    central_hub: "中央枢纽",
    approach_gate: "前线门扉",
    core_relay: "中央跳点",
    border_bastion: "边境关口",
    inner_resource: "内环资源星",
    frontier_resource: "边境资源星",
    outer_relay: "外环中继"
  }[role] || "普通节点";
}

function renderSelectionPanel() {
  const planet = getPlanetById(state.selectedPlanetId);
  if (!planet) {
    dom.selectionPanel.innerHTML = '<div class="empty-state">点击地图中的星球查看细节。</div>';
    return;
  }

  const context = getPlanetContext(planet);
  const pressure = getPlanetPressureState(context);
  const relatedEvents = getEventsForPlanet(planet.id).slice(0, 6);
  const relatedDecisions = getRelatedDecisionEntriesForPlanet(planet, context, relatedEvents);
  const buildingBadges = Object.entries(planet.buildings || {})
    .filter(([, level]) => level > 0)
    .map(([building, level]) => `<span class="badge">${escapeHtml(BUILDING_LABELS[building] || building)} 等级 ${level}</span>`)
    .join("");
  const stationedFleets = [...(context?.stationed || [])]
    .sort((left, right) => computeFleetPower(right) - computeFleetPower(left))
    .slice(0, 3);
  const incomingFleets = [...(context?.incoming || [])]
    .sort((left, right) => (interpolateFleetPosition(left).etaSeconds || 0) - (interpolateFleetPosition(right).etaSeconds || 0))
    .slice(0, 4);
  const ownerColor = escapeHtml(getAIColor(planet.owner));
  const production = planet.production || {};
  const routeLinks = getMapLanes()
    .filter(lane => lane.from === planet.id || lane.to === planet.id)
    .map(lane => {
      const targetId = lane.from === planet.id ? lane.to : lane.from;
      const target = getPlanetById(targetId);
      const config = getLaneTierConfig(lane.tier);
      const control = getLaneControlState(lane);
      return {
        name: target?.name || targetId,
        label: config.label,
        speed: config.speedMultiplier || lane.speedMultiplier || 1,
        control
      };
    })
    .slice(0, 6);
  const buildQueue = Array.isArray(planet.buildQueue) ? planet.buildQueue : [];
  const shipBuildQueue = Array.isArray(planet.shipBuildQueue) ? planet.shipBuildQueue : [];
  const regionTrait = getRegionTrait(planet);
  const occupationSummary = planet.occupation
    ? `稳控 ${Math.round(planet.occupation.stability || 0)}% · 驻军 ${formatNumber(planet.occupation.garrisonPower || 0)}${planet.occupation.previousOwner ? ` · 原属 ${getAIName(planet.occupation.previousOwner)}` : " · 新殖民地"}`
    : "该星球已完成稳控。";

  dom.selectionPanel.innerHTML = `
    <article class="focus-hero">
      <div class="focus-head">
        <div>
          <div class="focus-title">${escapeHtml(planet.name)}</div>
          <div class="focus-subtitle">${escapeHtml(formatPlanetTypeLabel(planet.type))} · ${escapeHtml(formatStrategicRoleLabel(planet.strategicRole))}${planet.specialNodeType ? ` · ${escapeHtml(getSpecialNodeLabel(planet.specialNodeType))}` : ""} · ${escapeHtml(getPlanetRegionName(planet))} · 控制方 <span style="color:${ownerColor};">${escapeHtml(getAIName(planet.owner))}</span></div>
        </div>
        <div class="focus-badge ${pressure.className}">${pressure.label}</div>
      </div>
      <div class="chip-grid">
        <span class="badge">防御 ${formatNumber(planet.defenseValue || 0)}</span>
        <span class="badge">驻防 ${formatNumber(context?.stationedPower || 0)}</span>
        <span class="badge">来袭 ${context?.incoming.length || 0}</span>
        <span class="badge">矿产 ${formatNumber(production.metalPerSecond || 0)}/秒</span>
        <span class="badge">能源 ${formatNumber(production.energyPerSecond || 0)}/秒</span>
        <span class="badge">人口 ${formatNumber(production.populationPerSecond || 0)}/秒</span>
      </div>
      <div class="risk-strip">
        <div class="risk-pill">
          <div class="risk-pill-label">资源库存</div>
          <div class="risk-pill-value">${formatNumber(planet.resources?.metal || 0)} / ${formatNumber(planet.resources?.energy || 0)}</div>
        </div>
        <div class="risk-pill">
          <div class="risk-pill-label">友军增援</div>
          <div class="risk-pill-value">${formatNumber(context?.friendlyIncomingPower || 0)}</div>
        </div>
        <div class="risk-pill">
          <div class="risk-pill-label">敌军来袭</div>
          <div class="risk-pill-value">${formatNumber(context?.hostileIncomingPower || 0)}</div>
        </div>
      </div>
      <div class="focus-subtitle" style="margin-top:12px;">${escapeHtml(occupationSummary)}</div>
      <div class="focus-subtitle" style="margin-top:12px;">${pressure.summary}</div>
    </article>
    <div class="inline-list">${buildingBadges || '<span class="badge">无特殊建筑</span>'}</div>
    <div class="mini-panel">
      <div class="detail-label">节点与战区特性</div>
      <div class="detail-value">${escapeHtml(planet.specialNodeType ? getSpecialNodeLabel(planet.specialNodeType) : "普通节点")}</div>
      <div class="list-meta">${escapeHtml(getSpecialNodeSummary(planet))}<br />战区风格：${escapeHtml(regionTrait?.name || "常规战区")} · ${escapeHtml(regionTrait?.summary || "当前没有额外战区修正。")}<br />地区学说：${escapeHtml(regionTrait?.doctrine || "均衡发展")}</div>
    </div>
    <div class="mini-panel">
      <div class="detail-label">建造与造舰</div>
      ${buildQueue.length > 0 || shipBuildQueue.length > 0 ? `
        <div class="focus-list">
          ${buildQueue.map(item => `
            <div class="focus-list-item">
              <div class="focus-list-title">建筑升级</div>
              <div class="focus-list-meta">${escapeHtml(formatBuildQueueItem(item))}</div>
            </div>
          `).join("")}
          ${shipBuildQueue.map(item => `
            <div class="focus-list-item">
              <div class="focus-list-title">舰船生产</div>
              <div class="focus-list-meta">${escapeHtml(formatShipQueueItem(item))}</div>
            </div>
          `).join("")}
        </div>` : '<div class="list-meta">当前没有进行中的建筑升级或舰船生产。</div>'}
    </div>
    <div class="mini-panel">
      <div class="detail-label">已连接航道</div>
      ${routeLinks.length > 0 ? `
        <div class="focus-list">
          ${routeLinks.map(link => `
            <div class="focus-list-item">
              <div class="focus-list-title">${escapeHtml(link.name)}</div>
              <div class="focus-list-meta">${escapeHtml(link.label)} · 速度倍率 x${link.speed.toFixed(2)} · ${escapeHtml(sanitizeNarrativeText(link.control?.status || "neutral"))}${link.control?.heat ? ` · 热度 ${formatNumber(link.control.heat)}` : ""}</div>
            </div>
          `).join("")}
        </div>` : '<div class="list-meta">该星球目前没有标记航道，只能走深空跃迁。</div>'}
    </div>
    <div class="mini-panel">
      <div class="detail-label">本地轨道舰队</div>
      ${stationedFleets.length > 0 ? `
        <div class="focus-list">
          ${stationedFleets.map(fleet => `
            <div class="focus-list-item">
              <div class="focus-list-title" style="color:${escapeHtml(getAIColor(fleet.owner))};">${escapeHtml(getAIName(fleet.owner))} · 战力 ${formatNumber(computeFleetPower(fleet))}</div>
              <div class="focus-list-meta">${escapeHtml(formatShips(fleet.ships || {}))}<br />${escapeHtml(getFleetStanceLabel(fleet.stance))} · 战备 ${escapeHtml(formatFleetReadiness(fleet.readiness))} · ${escapeHtml(sanitizeNarrativeText(fleet.supplyLabel || fleet.supplyStatus || "补给未知"))} · ${escapeHtml(getFleetRepairLabel(fleet))}${fleet.repairEtaSeconds ? ` · 约 ${escapeHtml(formatDuration(fleet.repairEtaSeconds))}` : ""}</div>
            </div>
          `).join("")}
        </div>` : '<div class="list-meta">当前轨道无驻留舰队。</div>'}
    </div>
    <div class="mini-panel">
      <div class="detail-label">入场机动</div>
      ${incomingFleets.length > 0 ? `
        <div class="focus-list">
          ${incomingFleets.map(fleet => {
            const move = interpolateFleetPosition(fleet);
            return `
              <div class="focus-list-item">
                <div class="focus-list-title" style="color:${escapeHtml(getAIColor(fleet.owner))};">${escapeHtml(getAIName(fleet.owner))} · 抵达倒计时 ${formatDuration(move.etaSeconds)}</div>
                <div class="focus-list-meta">战力 ${formatNumber(computeFleetPower(fleet))} · ${escapeHtml(formatShips(fleet.ships || {}))}<br />${escapeHtml(getFleetStanceLabel(fleet.stance))} · 战备 ${escapeHtml(formatFleetReadiness(fleet.readiness))} · ${escapeHtml(getFleetRepairLabel(fleet))}</div>
              </div>
            `;
          }).join("")}
        </div>` : '<div class="list-meta">暂无向该星球行进中的舰队。</div>'}
    </div>
    ${relatedDecisions.length > 0 ? `
      <div class="mini-panel">
        <div class="detail-label">相关 AI 最近决策</div>
        <div class="focus-list">
          ${relatedDecisions.map(item => `
            <div class="focus-list-item">
              <div class="focus-list-title" style="color:${escapeHtml(getAIColor(item.aiId))};">${escapeHtml(getAIName(item.aiId))} · ${escapeHtml(getDecisionTypeLabel(item.decision.type))} · ${escapeHtml(formatTimeAgo(item.decision.timestamp))}</div>
              <div class="focus-list-meta">${escapeHtml(getDecisionSummary(item.decision) || "暂无摘要")}${isDecisionFresh(item.decision) ? "<br />仍在执行窗口内" : "<br />较早决策，仅供对照事件链"}</div>
            </div>
          `).join("")}
        </div>
      </div>` : ""}
    ${relatedEvents.length > 0 ? `
      <div class="mini-panel">
        <div class="detail-label">该星球事件链</div>
        <div class="focus-list">
          ${relatedEvents.map(item => `
            <div class="focus-list-item">
              <div class="focus-list-title">${escapeHtml(item.title)} · ${escapeHtml(formatTimeAgo(item.timestamp))}</div>
              <div class="focus-list-meta">${escapeHtml(item.message)}${item.meta ? `<br />${escapeHtml(item.meta)}` : ""}</div>
            </div>
          `).join("")}
        </div>
      </div>` : ""}
  `;
}

function renderSectorPanel() {
  const sectors = getSectorStats();
  if (sectors.length === 0) {
    dom.sectorPanel.innerHTML = '<div class="empty-state">等待星区数据。</div>';
    return;
  }

  const selectedPlanet = getPlanetById(state.selectedPlanetId);
  const selectedSector = selectedPlanet ? getPlanetRegionName(selectedPlanet) : sectors[0].name;
  const primary = sectors.find(sector => sector.name === selectedSector) || sectors[0];
  const hottest = [...sectors].sort((left, right) => (right.owned + (right.contested ? 2 : 0)) - (left.owned + (left.contested ? 2 : 0))).slice(0, 4);
  const frontlineCount = getFrontlineSignals().filter(signal =>
    signal.endpoints.from.regionName === primary.name || signal.endpoints.to.regionName === primary.name
  ).length;

  dom.sectorPanel.innerHTML = `
    <div class="mini-panel">
      <div class="detail-label">当前星区</div>
      <div class="detail-value">${escapeHtml(primary.name)}</div>
      <div class="list-meta">星球 ${primary.planets} · 已控 ${primary.owned} · 主导者 ${escapeHtml(getAIName(primary.primaryOwner))}<br />战区风格 ${escapeHtml(primary.trait?.name || "常规战区")} · ${escapeHtml(primary.trait?.doctrine || "均衡发展")}<br />前线热点 ${frontlineCount} · ${primary.contested ? "区域争夺中" : "局部稳定"}</div>
    </div>
    ${hottest.map(sector => `
      <div class="list-card">
        <div class="list-title">${escapeHtml(sector.name)} ${sector.contested ? '<span class="warn">· 争夺中</span>' : ""}</div>
        <div class="list-meta">星球 ${sector.planets} / 已控 ${sector.owned}<br />${escapeHtml(sector.trait?.name || "常规战区")} · ${escapeHtml(sector.trait?.summary || "无额外修正")}<br />金属 ${formatNumber(sector.totalMetal)} · 能源 ${formatNumber(sector.totalEnergy)}<br />主导者 ${escapeHtml(getAIName(sector.primaryOwner))}</div>
      </div>
    `).join("")}
  `;
}

function renderTimeline() {
  const currentTick = state.gameState?.currentTick || 0;
  const situation = getLiveSituation();
  const activeAIs = getAIs().filter(ai => ai.status !== "eliminated").length;
  const wars = Math.round(getAIs().reduce((count, ai) => count + getAIWarAndAllianceCounts(ai).wars, 0) / 2);
  const filterLabel = [
    state.currentFilter !== "all" ? `分类 ${state.currentFilter}` : null,
    state.timelineAI !== "all" ? `AI ${getAIName(state.timelineAI)}` : null,
    state.timelinePlanet !== "all" ? `星球 ${getPlanetName(state.timelinePlanet)}` : null,
    state.timelineSector !== "all" ? `战区 ${state.timelineSector}` : null,
    state.timelineKeyword.trim() ? `关键词 ${state.timelineKeyword.trim()}` : null
  ].filter(Boolean).join(" · ");
  const showGlobalSummary =
    (state.currentFilter === "all" || state.currentFilter === "system") &&
    state.timelineAI === "all" &&
    state.timelinePlanet === "all" &&
    state.timelineSector === "all" &&
    !state.timelineKeyword.trim();
  const summaryCard = showGlobalSummary
    ? `
      <article class="event-card system">
        <div class="event-message">
          <strong>观战研判：${escapeHtml(situation.label)}</strong><br />
          已运行 ${formatClock(currentTick)}。本局没有固定结束时长，当前仍有 ${activeAIs} 个帝国在场，战争关系 ${wars} 组。
        </div>
        <div class="event-meta"><span>观战研判</span><span>${escapeHtml(situation.label)}</span></div>
      </article>`
    : "";

  const filterCard = filterLabel
    ? `
      <article class="event-card intel">
        <div class="event-message"><strong>当前筛选</strong><br />${escapeHtml(filterLabel)}</div>
        <div class="event-meta"><span>筛选器</span><span>${state.events.filter(eventMatchesTimelineFilters).length} 条</span></div>
      </article>`
    : "";

  const filtered = state.events.filter(eventMatchesTimelineFilters);
  if (filtered.length === 0 && !summaryCard && !filterCard) {
    dom.timelineList.innerHTML = '<div class="empty-state">当前筛选条件下没有事件。</div>';
    return;
  }

  const items = filtered.map(event => {
    const primaryPlanetId = getTimelinePrimaryPlanetId(event);
    const jumpLabel = primaryPlanetId ? getPlanetName(primaryPlanetId) : "";
    return `
    <article class="event-card ${escapeHtml(event.category)}${primaryPlanetId ? " actionable" : ""}">
      <div class="event-message"><strong>${escapeHtml(event.title)}</strong><br />${escapeHtml(event.message)}</div>
      <div class="event-meta"><span>${escapeHtml(event.meta || `时刻 ${event.tick ?? "--"}`)}</span><span>${escapeHtml(formatTimeAgo(event.timestamp))}</span></div>
      ${primaryPlanetId ? `
        <div class="event-actions">
          <button type="button" class="event-jump-btn" data-planet-jump="${escapeHtml(primaryPlanetId)}">定位到 ${escapeHtml(jumpLabel)}</button>
        </div>` : ""}
    </article>
  `;
  }).join("");

  dom.timelineList.innerHTML = summaryCard + filterCard + items;
}

function populateAISelects() {
  const ais = getRankedAIs();
  const options = ais.map(ai => `<option value="${escapeHtml(ai.id)}">${escapeHtml(ai.name)}</option>`).join("");
  dom.askAiSelect.innerHTML = options || '<option value="">暂无 AI</option>';
  dom.betPrediction.innerHTML = options || '<option value="">暂无 AI</option>';
}

function populateTimelineFilters() {
  if (dom.timelineAiFilter) {
    const ais = getRankedAIs();
    if (state.timelineAI !== "all" && !ais.some(ai => ai.id === state.timelineAI)) {
      state.timelineAI = "all";
    }
    const aiOptions = ['<option value="all">全部 AI</option>']
      .concat(ais.map(ai => `<option value="${escapeHtml(ai.id)}">${escapeHtml(ai.name)}</option>`));
    dom.timelineAiFilter.innerHTML = aiOptions.join("");
    dom.timelineAiFilter.value = state.timelineAI;
  }

  if (dom.timelinePlanetFilter) {
    const planets = getPlanets();
    if (state.timelinePlanet !== "all" && !planets.some(planet => planet.id === state.timelinePlanet)) {
      state.timelinePlanet = "all";
    }
    const planetOptions = ['<option value="all">全部星球</option>']
      .concat(planets.map(planet => `<option value="${escapeHtml(planet.id)}">${escapeHtml(planet.name)}</option>`));
    dom.timelinePlanetFilter.innerHTML = planetOptions.join("");
    dom.timelinePlanetFilter.value = state.timelinePlanet;
  }

  if (dom.timelineSectorFilter) {
    const sectors = [...new Set(getPlanets().map(planet => getPlanetRegionName(planet)).filter(Boolean))].sort((left, right) => left.localeCompare(right, "zh-CN"));
    if (state.timelineSector !== "all" && !sectors.includes(state.timelineSector)) {
      state.timelineSector = "all";
    }
    const sectorOptions = ['<option value="all">全部战区</option>']
      .concat(sectors.map(sector => `<option value="${escapeHtml(sector)}">${escapeHtml(sector)}</option>`));
    dom.timelineSectorFilter.innerHTML = sectorOptions.join("");
    dom.timelineSectorFilter.value = state.timelineSector;
  }

  if (dom.timelineKeywordFilter) {
    dom.timelineKeywordFilter.value = state.timelineKeyword;
  }
}

function updateBettingControls() {
  const open = Boolean(state.bettingState?.bettingOpen);
  dom.betSubmit.disabled = !open;
  dom.betAmount.disabled = !open;
  dom.betPrediction.disabled = !open;
  dom.betType.disabled = !open;
}

function updateMapSummary() {
  if (!state.gameState) {
    dom.mapSummary.textContent = "等待地图数据";
    return;
  }

  const moving = getFleets().filter(fleet => fleet.status === "moving").length;
  const frontlines = getFrontlineSignals().length;
  const securedLanes = getSecuredLaneCount();
  const controlledStrategic = getControlledStrategicNodes().length;
  const centralControl = getPlanets().filter(planet => planet.regionId === "core" && planet.owner).length;
  const aliveEmpires = getAIs().filter(ai => ai.status !== "eliminated").length;
  const dataAgeSeconds = state.lastRealtimeMessageAt ? Math.max(0, Math.floor((Date.now() - state.lastRealtimeMessageAt) / 1000)) : null;
  const freshnessLabel = dataAgeSeconds == null
    ? "未同步"
    : dataAgeSeconds <= 2
      ? "实时"
      : `${dataAgeSeconds}秒前`;
  const freshnessPrefix = state.connectionMode === "stalled" ? "连接滞后" : "快照";
  dom.mapSummary.innerHTML = `
    <span class="accent">研判：${escapeHtml(getGamePhaseLabel())}</span>
    <span class="mono"> · 机动舰队 ${moving}</span>
    <span class="mono"> · 前线 ${frontlines}</span>
    <span class="mono"> · 航道 ${securedLanes}</span>
    <span class="mono"> · 关键节点 ${controlledStrategic}</span>
    <span class="mono"> · 中央环 ${centralControl}</span>
    <span class="mono"> · 存活帝国 ${aliveEmpires}</span>
    <span class="mono"> · 提案待处理 ${Array.from(state.proposalStore.values()).filter(proposal => proposal.status === "pending").length}</span>
    <span class="mono"> · ${escapeHtml(freshnessPrefix)} ${escapeHtml(freshnessLabel)}</span>
  `;
}

function checkRealtimeHealth() {
  if (!state.socket) return;

  if (state.socket.readyState === WebSocket.CONNECTING) {
    updateConnectionStatus("connecting");
    return;
  }

  if (state.socket.readyState !== WebSocket.OPEN || !state.lastRealtimeMessageAt) {
    return;
  }

  const lagMs = Date.now() - state.lastRealtimeMessageAt;
  if (lagMs >= REALTIME_STALE_RECONNECT_MS) {
    updateConnectionStatus("stalled");
    try {
      state.socket.close();
    } catch {
      // Let the normal reconnect loop recover if close fails.
    }
    return;
  }

  if (lagMs >= REALTIME_STALE_WARN_MS) {
    updateConnectionStatus("stalled");
    return;
  }

  if (state.connectionMode !== "connected") {
    updateConnectionStatus("connected");
  }
}

function renderAll() {
  updateHeader();
  updateMapSummary();
  renderStrategicSnapshot();
  renderIntelOverview();
  renderSectorOverview();
  renderAIList();
  renderResearchPanel();
  renderProposalPanel();
  renderDiplomacyMatrix();
  renderFleetList();
  renderBattleList();
  renderSelectionPanel();
  renderSectorPanel();
  populateTimelineFilters();
  renderTimeline();
  populateAISelects();
  updateBettingControls();
  renderInteractiveStatus();
  updateDockSummaries();
  renderDockState();
  drawMap();
}

function getBaseScale() {
  return Math.min(canvasMetrics.width, canvasMetrics.height) / (WORLD_SIZE + 120);
}

function worldToScreen(position) {
  const scale = getBaseScale() * view.zoom;
  return {
    x: (position.x - view.centerX) * scale + canvasMetrics.width / 2,
    y: (position.y - view.centerY) * scale + canvasMetrics.height / 2
  };
}

function screenToWorld(screenX, screenY) {
  const scale = getBaseScale() * view.zoom;
  return {
    x: (screenX - canvasMetrics.width / 2) / scale + view.centerX,
    y: (screenY - canvasMetrics.height / 2) / scale + view.centerY
  };
}

function getViewportWorldBounds() {
  const topLeft = screenToWorld(0, 0);
  const bottomRight = screenToWorld(canvasMetrics.width, canvasMetrics.height);
  return {
    left: clamp(Math.min(topLeft.x, bottomRight.x), 0, WORLD_SIZE),
    top: clamp(Math.min(topLeft.y, bottomRight.y), 0, WORLD_SIZE),
    right: clamp(Math.max(topLeft.x, bottomRight.x), 0, WORLD_SIZE),
    bottom: clamp(Math.max(topLeft.y, bottomRight.y), 0, WORLD_SIZE)
  };
}

function moveViewportCenterTo(position) {
  if (!position) return;
  view.centerX = clamp(position.x, 0, WORLD_SIZE);
  view.centerY = clamp(position.y, 0, WORLD_SIZE);
  clampView();
  drawMap();
}

function focusPlanet(planetId, options = {}) {
  const planet = getPlanetById(planetId);
  if (!planet) return false;

  state.selectedPlanetId = planet.id;
  if (options.center !== false) {
    view.centerX = clamp(planet.position.x, 0, WORLD_SIZE);
    view.centerY = clamp(planet.position.y, 0, WORLD_SIZE);
  }
  if (options.minZoom && view.zoom < options.minZoom) {
    view.zoom = options.minZoom;
  }

  clampView();
  renderSelectionPanel();
  renderSectorPanel();
  updateDockSummaries();
  if (options.openCard !== false) {
    openDockCard("focusCard", { mode: "full" });
  }
  if (options.haptic !== false) {
    triggerHaptic("focus");
  }
  drawMap();
  return true;
}

function clampView() {
  const scale = getBaseScale() * view.zoom;
  const halfWidth = canvasMetrics.width / Math.max(1, scale * 2);
  const halfHeight = canvasMetrics.height / Math.max(1, scale * 2);

  view.centerX = halfWidth >= WORLD_SIZE / 2 ? WORLD_SIZE / 2 : clamp(view.centerX, halfWidth, WORLD_SIZE - halfWidth);
  view.centerY = halfHeight >= WORLD_SIZE / 2 ? WORLD_SIZE / 2 : clamp(view.centerY, halfHeight, WORLD_SIZE - halfHeight);
}

function resizeCanvas() {
  const rect = dom.canvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return;

  canvasMetrics.width = rect.width;
  canvasMetrics.height = rect.height;
  canvasMetrics.dpr = window.devicePixelRatio || 1;

  dom.canvas.width = Math.floor(rect.width * canvasMetrics.dpr);
  dom.canvas.height = Math.floor(rect.height * canvasMetrics.dpr);
  ctx.setTransform(canvasMetrics.dpr, 0, 0, canvasMetrics.dpr, 0, 0);
  resizeMiniMap();
  clampView();
  drawMap();
}

function resizeMiniMap() {
  const rect = dom.miniMapCanvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  miniMapMetrics.width = rect.width;
  miniMapMetrics.height = rect.height;
  miniMapMetrics.dpr = window.devicePixelRatio || 1;
  dom.miniMapCanvas.width = Math.floor(rect.width * miniMapMetrics.dpr);
  dom.miniMapCanvas.height = Math.floor(rect.height * miniMapMetrics.dpr);
  miniCtx.setTransform(miniMapMetrics.dpr, 0, 0, miniMapMetrics.dpr, 0, 0);
}

function worldToMiniMap(position) {
  return {
    x: (position.x / WORLD_SIZE) * miniMapMetrics.width,
    y: (position.y / WORLD_SIZE) * miniMapMetrics.height
  };
}

function miniMapToWorld(x, y) {
  return {
    x: clamp((x / Math.max(1, miniMapMetrics.width)) * WORLD_SIZE, 0, WORLD_SIZE),
    y: clamp((y / Math.max(1, miniMapMetrics.height)) * WORLD_SIZE, 0, WORLD_SIZE)
  };
}

function drawMiniMap() {
  if (!miniMapMetrics.width || !miniMapMetrics.height) return;

  miniCtx.clearRect(0, 0, miniMapMetrics.width, miniMapMetrics.height);
  const gradient = miniCtx.createLinearGradient(0, 0, miniMapMetrics.width, miniMapMetrics.height);
  gradient.addColorStop(0, "#05111f");
  gradient.addColorStop(1, "#0a1c30");
  miniCtx.fillStyle = gradient;
  miniCtx.fillRect(0, 0, miniMapMetrics.width, miniMapMetrics.height);

  miniCtx.strokeStyle = "rgba(126, 191, 220, 0.1)";
  miniCtx.lineWidth = 1;
  for (let step = 1; step < 4; step += 1) {
    const x = (miniMapMetrics.width / 4) * step;
    const y = (miniMapMetrics.height / 4) * step;
    miniCtx.beginPath();
    miniCtx.moveTo(x, 0);
    miniCtx.lineTo(x, miniMapMetrics.height);
    miniCtx.stroke();
    miniCtx.beginPath();
    miniCtx.moveTo(0, y);
    miniCtx.lineTo(miniMapMetrics.width, y);
    miniCtx.stroke();
  }

  getMapLanes().forEach(lane => {
    const endpoints = getLaneEndpoints(lane);
    if (!endpoints) return;
    const start = worldToMiniMap(endpoints.from.position);
    const end = worldToMiniMap(endpoints.to.position);
    const control = getLaneControlState(lane);
    miniCtx.save();
    if (lane.tier === "relay") miniCtx.setLineDash([2, 3]);
    miniCtx.strokeStyle = control.owner ? `${getAIColor(control.owner)}88` : control.status === "contested" ? "rgba(255,202,117,0.7)" : "rgba(126,191,220,0.22)";
    miniCtx.lineWidth = lane.tier === "trunk" ? 1.6 : 1;
    miniCtx.beginPath();
    miniCtx.moveTo(start.x, start.y);
    miniCtx.lineTo(end.x, end.y);
    miniCtx.stroke();
    miniCtx.restore();
  });

  getPlanets().forEach(planet => {
    const point = worldToMiniMap(planet.position);
    const radius = planet.type === "home" ? 3.2 : planet.type === "resource" ? 2.3 : 1.6;
    miniCtx.fillStyle = planet.owner ? getAIColor(planet.owner) : "#c9d7e3";
    miniCtx.beginPath();
    miniCtx.arc(point.x, point.y, radius, 0, Math.PI * 2);
    miniCtx.fill();
  });

  const selected = getPlanetById(state.selectedPlanetId);
  if (selected) {
    const point = worldToMiniMap(selected.position);
    miniCtx.strokeStyle = "#ffca75";
    miniCtx.lineWidth = 1.5;
    miniCtx.beginPath();
    miniCtx.arc(point.x, point.y, 5.5, 0, Math.PI * 2);
    miniCtx.stroke();
  }

  const bounds = getViewportWorldBounds();
  const topLeft = worldToMiniMap({ x: bounds.left, y: bounds.top });
  const bottomRight = worldToMiniMap({ x: bounds.right, y: bounds.bottom });
  miniCtx.fillStyle = "rgba(106, 231, 255, 0.08)";
  miniCtx.strokeStyle = "rgba(106, 231, 255, 0.82)";
  miniCtx.lineWidth = 1.2;
  miniCtx.fillRect(topLeft.x, topLeft.y, Math.max(8, bottomRight.x - topLeft.x), Math.max(8, bottomRight.y - topLeft.y));
  miniCtx.strokeRect(topLeft.x, topLeft.y, Math.max(8, bottomRight.x - topLeft.x), Math.max(8, bottomRight.y - topLeft.y));
}

function startPaneResize(type, event) {
  if (isMobileViewport()) return;
  if (type === "overview" && (!hasDesktopOverviewRail() || state.layout.overviewRailCollapsed)) return;
  if (type === "dock" && !state.activeDockCardId) return;

  state.layout.resizingPane = {
    type,
    pointerId: event.pointerId,
    startX: event.clientX,
    startOverviewWidth: state.layout.overviewRailWidth,
    startDockWidth: state.layout.dockPanelWidth
  };
  document.body.classList.add("pane-resizing");
  event.preventDefault();
}

function updatePaneResize(event) {
  const resizeState = state.layout.resizingPane;
  if (!resizeState || resizeState.pointerId !== event.pointerId) return false;

  const deltaX = event.clientX - resizeState.startX;
  if (resizeState.type === "overview") {
    state.layout.overviewRailWidth = clampOverviewRailWidth(resizeState.startOverviewWidth + deltaX);
  } else if (resizeState.type === "dock") {
    state.layout.dockPanelWidth = clampDockPanelWidth(resizeState.startDockWidth - deltaX);
  }

  applyLayoutPreferences();
  resizeCanvas();
  return true;
}

function finishPaneResize(event) {
  const resizeState = state.layout.resizingPane;
  if (!resizeState || (event && resizeState.pointerId !== event.pointerId)) return false;

  state.layout.resizingPane = null;
  document.body.classList.remove("pane-resizing");
  persistLayoutPreferences();
  resizeCanvas();
  return true;
}

function startMobileDrawerGesture(event) {
  return;
}

function updateMobileDrawerGesture(event) {
  return false;
}

function finishMobileDrawerGesture(event) {
  return false;
}

function handleLayoutPointerMove(event) {
  if (updatePaneResize(event)) return;
  updateMobileDrawerGesture(event);
}

function handleLayoutPointerEnd(event) {
  if (finishPaneResize(event)) return;
  finishMobileDrawerGesture(event);
}

function applyZoom(factor, anchorX = canvasMetrics.width / 2, anchorY = canvasMetrics.height / 2) {
  const before = screenToWorld(anchorX, anchorY);
  view.zoom = clamp(view.zoom * factor, 0.55, 2.6);
  const after = screenToWorld(anchorX, anchorY);
  view.centerX += before.x - after.x;
  view.centerY += before.y - after.y;
  clampView();
  drawMap();
}

function resetMapView() {
  view.centerX = WORLD_SIZE / 2;
  view.centerY = WORLD_SIZE / 2;
  view.zoom = getDefaultZoom();
  clampView();
  drawMap();
}

function drawBackground() {
  const gradient = ctx.createLinearGradient(0, 0, canvasMetrics.width, canvasMetrics.height);
  gradient.addColorStop(0, "#04111d");
  gradient.addColorStop(1, "#08192c");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvasMetrics.width, canvasMetrics.height);

  starfield.forEach(star => {
    const screen = worldToScreen({ x: star.x, y: star.y });
    if (screen.x < -20 || screen.x > canvasMetrics.width + 20 || screen.y < -20 || screen.y > canvasMetrics.height + 20) return;
    ctx.globalAlpha = star.a;
    ctx.fillStyle = "#d7f8ff";
    ctx.beginPath();
    ctx.arc(screen.x, screen.y, star.r, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;

  ctx.strokeStyle = "rgba(126, 191, 220, 0.08)";
  ctx.lineWidth = 1;
  for (let step = 100; step < WORLD_SIZE; step += 100) {
    const left = worldToScreen({ x: step, y: 0 });
    const right = worldToScreen({ x: step, y: WORLD_SIZE });
    ctx.beginPath();
    ctx.moveTo(left.x, left.y);
    ctx.lineTo(right.x, right.y);
    ctx.stroke();

    const top = worldToScreen({ x: 0, y: step });
    const bottom = worldToScreen({ x: WORLD_SIZE, y: step });
    ctx.beginPath();
    ctx.moveTo(top.x, top.y);
    ctx.lineTo(bottom.x, bottom.y);
    ctx.stroke();
  }
}

function drawTerritoryInfluence() {
  if (!state.mapOptions.theaters) return;

  const ownedPlanets = getPlanets().filter(planet => planet.owner);
  ownedPlanets.forEach(planet => {
    const screen = worldToScreen(planet.position);
    const radiusBase = planet.type === "home" ? 125 : planet.type === "resource" ? 92 : 74;
    const radius = radiusBase * view.zoom;
    const gradient = ctx.createRadialGradient(screen.x, screen.y, 0, screen.x, screen.y, radius);
    gradient.addColorStop(0, `${getAIColor(planet.owner)}28`);
    gradient.addColorStop(0.45, `${getAIColor(planet.owner)}16`);
    gradient.addColorStop(1, `${getAIColor(planet.owner)}00`);
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(screen.x, screen.y, radius, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawLaneSkeleton() {
  if (!state.mapOptions.routes) return;

  getMapLanes().forEach(lane => {
    const endpoints = getLaneEndpoints(lane);
    if (!endpoints) return;

    const start = worldToScreen(endpoints.from.position);
    const end = worldToScreen(endpoints.to.position);
    const config = getLaneTierConfig(lane.tier);
    const control = getLaneControlState(lane);
    const baseColor = control.owner ? getAIColor(control.owner) : control.status === "contested" ? "#ffca75" : "#5f88a1";

    ctx.save();
    if (lane.tier === "relay") ctx.setLineDash([4, 6]);
    if (lane.tier === "frontier") ctx.setLineDash([8, 7]);
    ctx.strokeStyle = `${baseColor}${control.status === "secured" ? "55" : "3a"}`;
    ctx.lineWidth = lane.tier === "trunk" ? 2.6 : lane.tier === "corridor" ? 1.9 : 1.25;
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
    ctx.restore();

    if (view.zoom >= 1.35 && state.mapOptions.labels && lane.tier !== "relay") {
      const midpoint = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };
      ctx.fillStyle = "rgba(3, 14, 26, 0.78)";
      drawRoundedRectPath(midpoint.x - 30, midpoint.y - 10, 60, 18, 8);
      ctx.fill();
      ctx.fillStyle = "#a9d7e7";
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.textAlign = "center";
      ctx.fillText(`${config.label} x${(config.speedMultiplier || 1).toFixed(2)}`, midpoint.x, midpoint.y + 3);
    }
  });
}

function drawFrontlineHeat(now) {
  if (!state.mapOptions.theaters) return;

  getFrontlineSignals(now).forEach(signal => {
    const screen = worldToScreen(signal.midpoint);
    const color = signal.control.status === "contested" ? "255, 125, 125" : "255, 202, 117";
    ctx.strokeStyle = `rgba(${color}, 0.22)`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(screen.x, screen.y, 18 + Math.sin(now / 420) * 4, 0, Math.PI * 2);
    ctx.stroke();
  });
}

function drawSectorOverlay() {
  if (!state.mapOptions.sectors) return;
  const detailLevel = getMapDetailLevel();
  const opacity = detailLevel === "strategic" ? 1 : detailLevel === "operational" ? 0.5 : 0;
  if (opacity <= 0.05) return;

  const center = worldToScreen({ x: WORLD_SIZE / 2, y: WORLD_SIZE / 2 });
  const radius = WORLD_SIZE * 0.18 * getBaseScale() * view.zoom;
  ctx.strokeStyle = `rgba(255, 202, 117, ${0.18 * opacity})`;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
  ctx.stroke();

  const labels = ["东翼", "东南弧", "南疆", "西南弧", "西翼", "西北弧", "北境", "东北弧"];
  for (let index = 0; index < 8; index += 1) {
    const angle = index * (Math.PI / 4);
    const outer = { x: WORLD_SIZE / 2 + Math.cos(angle) * (WORLD_SIZE * 0.47), y: WORLD_SIZE / 2 + Math.sin(angle) * (WORLD_SIZE * 0.47) };
    const screen = worldToScreen(outer);
    ctx.strokeStyle = `rgba(126, 191, 220, ${0.12 * opacity})`;
    ctx.beginPath();
    ctx.moveTo(center.x, center.y);
    ctx.lineTo(screen.x, screen.y);
    ctx.stroke();

    if (detailLevel !== "strategic") continue;
    const labelPos = worldToScreen({
      x: WORLD_SIZE / 2 + Math.cos(angle + Math.PI / 8) * (WORLD_SIZE * 0.41),
      y: WORLD_SIZE / 2 + Math.sin(angle + Math.PI / 8) * (WORLD_SIZE * 0.41)
    });
    ctx.fillStyle = "rgba(255, 202, 117, 0.68)";
    ctx.font = LABEL_FONT_PRIMARY;
    ctx.textAlign = "center";
    ctx.fillText(labels[index], labelPos.x, labelPos.y);
  }
}

function drawFleetRoutes(now) {
  if (!state.mapOptions.routes) return;
  getFleets().forEach(fleet => {
    if (fleet.status !== "moving" || !fleet.targetPlanet) return;
    const current = interpolateFleetPosition(fleet, now);
    const start = worldToScreen({ x: current.x, y: current.y });
    const planet = getPlanetById(fleet.targetPlanet);
    if (!planet) return;
    const end = worldToScreen(planet.position);

    ctx.save();
    ctx.setLineDash([7, 5]);
    ctx.strokeStyle = `${getAIColor(fleet.owner)}88`;
    ctx.lineWidth = Math.max(1, 1.4 * view.zoom);
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
    ctx.restore();
  });
}

function drawBattleHotspots(now) {
  getBattles().forEach(battle => {
    if (!battle.planet || !battle.timestamp || now - battle.timestamp > RECENT_BATTLE_WINDOW) return;
    const planet = getPlanetById(battle.planet);
    if (!planet) return;
    const screen = worldToScreen(planet.position);
    const age = clamp(1 - ((now - battle.timestamp) / RECENT_BATTLE_WINDOW), 0, 1);
    ctx.strokeStyle = `rgba(255, 125, 125, ${0.28 * age})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(screen.x, screen.y, 14 + age * 26, 0, Math.PI * 2);
    ctx.stroke();
  });
}

function drawPlanets(now) {
  const detailLevel = getMapDetailLevel();
  const recentBattlePlanetIds = getRecentBattlePlanetIds(now);
  const planets = [...getPlanets()].sort((left, right) => ({ normal: 1, resource: 2, home: 3 }[left.type] - { normal: 1, resource: 2, home: 3 }[right.type]));
  const labelCandidates = [];

  planets.forEach(planet => {
    const screen = worldToScreen(planet.position);
    if (screen.x < -50 || screen.x > canvasMetrics.width + 50 || screen.y < -50 || screen.y > canvasMetrics.height + 50) return;

    const radius = planet.type === "home" ? 10 : planet.type === "resource" ? 7 : 5;
    const selected = planet.id === state.selectedPlanetId;
    const hovered = planet.id === state.hoveredPlanetId;
    const centerRing = getCenterDistance(planet.position) <= 180;
    const recentBattle = recentBattlePlanetIds.has(planet.id);
    const important = selected || hovered || planet.type !== "normal" || centerRing || recentBattle || (planet.defenseValue || 0) >= 120;

    if (important) {
      ctx.fillStyle = `${getAIColor(planet.owner)}22`;
      ctx.beginPath();
      ctx.arc(screen.x, screen.y, radius + 7, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = planet.owner ? getAIColor(planet.owner) : "#c9d7e3";
    ctx.beginPath();
    ctx.arc(screen.x, screen.y, radius + (important ? 1 : 0), 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = planet.owner ? "#f5fbff" : "rgba(255,255,255,0.45)";
    ctx.lineWidth = selected ? 2.2 : 1;
    ctx.stroke();

    if (planet.type === "home") {
      ctx.fillStyle = "#ffca75";
      ctx.font = LABEL_FONT_PRIMARY;
      ctx.textAlign = "center";
      ctx.fillText("★", screen.x, screen.y - 13);
    }

    if (state.mapOptions.labels) {
      const candidate = buildPlanetLabelCandidate(planet, screen, radius, detailLevel, recentBattlePlanetIds);
      if (candidate) labelCandidates.push(candidate);
    }
  });

  if (state.mapOptions.labels) drawPlanetLabels(labelCandidates);
}

function drawFleets(now) {
  const detailLevel = getMapDetailLevel();
  const recentBattlePlanetIds = getRecentBattlePlanetIds(now);
  getFleets().forEach(fleet => {
    const interpolated = interpolateFleetPosition(fleet, now);
    const screen = worldToScreen({ x: interpolated.x, y: interpolated.y });
    if (screen.x < -40 || screen.x > canvasMetrics.width + 40 || screen.y < -40 || screen.y > canvasMetrics.height + 40) return;

    const power = computeFleetPower(fleet);
    const size = 4 + clamp(power / 250, 0, 10);
    ctx.save();
    ctx.translate(screen.x, screen.y);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = getAIColor(fleet.owner);
    ctx.fillRect(-size / 2, -size / 2, size, size);
    ctx.restore();

    if (state.mapOptions.labels && shouldShowFleetLabel(fleet, power, detailLevel, recentBattlePlanetIds)) {
      const label = fleet.status === "moving" ? `${formatNumber(power)} · ${formatDuration(interpolated.etaSeconds)}` : `${formatNumber(power)}`;
      ctx.font = LABEL_FONT_META;
      const width = Math.max(46, ctx.measureText(label).width + 14);
      const x = clamp(screen.x + 10, 8, canvasMetrics.width - width - 8);
      const y = clamp(screen.y - 10, 8, canvasMetrics.height - 24);
      ctx.fillStyle = "rgba(3, 14, 26, 0.82)";
      ctx.strokeStyle = `${getAIColor(fleet.owner)}88`;
      drawRoundedRectPath(x, y, width, 20, 8);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#dff8ff";
      ctx.font = LABEL_FONT_META;
      ctx.textAlign = "left";
      ctx.fillText(label, x + 7, y + 14);
    }
  });
}

function drawSelectionRing() {
  const planet = getPlanetById(state.selectedPlanetId);
  if (!planet) return;
  const screen = worldToScreen(planet.position);
  ctx.strokeStyle = "#ffca75";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(screen.x, screen.y, 18, 0, Math.PI * 2);
  ctx.stroke();
}

function drawMap() {
  if (!canvasMetrics.width || !canvasMetrics.height) return;
  const now = Date.now();
  ctx.clearRect(0, 0, canvasMetrics.width, canvasMetrics.height);
  drawBackground();
  drawTerritoryInfluence();
  drawSectorOverlay();
  drawLaneSkeleton();
  drawFrontlineHeat(now);
  drawBattleHotspots(now);
  drawFleetRoutes(now);
  drawPlanets(now);
  drawFleets(now);
  drawSelectionRing();
  drawMiniMap();
}

function getPlanetAtScreenPosition(screenX, screenY) {
  let candidate = null;
  let bestDistance = Infinity;
  getPlanets().forEach(planet => {
    const screen = worldToScreen(planet.position);
    const distance = Math.hypot(screen.x - screenX, screen.y - screenY);
    if (distance < 18 && distance < bestDistance) {
      bestDistance = distance;
      candidate = planet;
    }
  });
  return candidate;
}

function updateTooltip(clientX, clientY) {
  if (isCoarsePointer()) {
    state.hoveredPlanetId = null;
    dom.tooltip.style.display = "none";
    return;
  }

  const rect = dom.canvas.getBoundingClientRect();
  if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) {
    state.hoveredPlanetId = null;
    dom.tooltip.style.display = "none";
    drawMap();
    return;
  }

  const planet = getPlanetAtScreenPosition(clientX - rect.left, clientY - rect.top);
  if (!planet) {
    state.hoveredPlanetId = null;
    dom.tooltip.style.display = "none";
    drawMap();
    return;
  }

  state.hoveredPlanetId = planet.id;
  const context = getPlanetContext(planet);
  dom.tooltip.innerHTML = `
    <div class="tooltip-title">${escapeHtml(planet.name)}</div>
    <div class="tooltip-grid">
      <div><span class="detail-label">控制</span><div>${escapeHtml(getAIName(planet.owner))}</div></div>
      <div><span class="detail-label">类型</span><div>${escapeHtml(formatPlanetTypeLabel(planet.type))}</div></div>
      <div><span class="detail-label">防御</span><div>${formatNumber(planet.defenseValue || 0)}</div></div>
      <div><span class="detail-label">驻防</span><div>${formatNumber(context?.stationedPower || 0)}</div></div>
      <div><span class="detail-label">金属</span><div>${formatNumber(planet.resources?.metal || 0)}</div></div>
      <div><span class="detail-label">来袭</span><div>${context?.incoming.length || 0}</div></div>
    </div>
  `;
  dom.tooltip.style.display = "block";
  dom.tooltip.style.left = `${clientX + 16}px`;
  dom.tooltip.style.top = `${clientY + 16}px`;
  drawMap();
}

function getActivePointerPairs() {
  return Array.from(view.activePointers.values()).slice(0, 2);
}

function beginPinchGesture() {
  const [first, second] = getActivePointerPairs();
  if (!first || !second) return;
  const centerX = (first.clientX + second.clientX) / 2;
  const centerY = (first.clientY + second.clientY) / 2;
  const rect = dom.canvas.getBoundingClientRect();
  view.pinching = true;
  view.pinchStartDistance = Math.max(24, Math.hypot(second.clientX - first.clientX, second.clientY - first.clientY));
  view.pinchStartZoom = view.zoom;
  view.pinchAnchorWorld = screenToWorld(centerX - rect.left, centerY - rect.top);
}

function updatePinchGesture() {
  const [first, second] = getActivePointerPairs();
  if (!first || !second || !view.pinchAnchorWorld) return;

  const rect = dom.canvas.getBoundingClientRect();
  const centerX = (first.clientX + second.clientX) / 2;
  const centerY = (first.clientY + second.clientY) / 2;
  const distance = Math.max(24, Math.hypot(second.clientX - first.clientX, second.clientY - first.clientY));
  view.zoom = clamp(view.pinchStartZoom * (distance / Math.max(1, view.pinchStartDistance)), 0.55, 2.6);
  const after = screenToWorld(centerX - rect.left, centerY - rect.top);
  view.centerX += view.pinchAnchorWorld.x - after.x;
  view.centerY += view.pinchAnchorWorld.y - after.y;
  clampView();
  drawMap();
}

function endPinchGesture() {
  view.pinching = false;
  view.pinchStartDistance = 0;
  view.pinchStartZoom = view.zoom;
  view.pinchAnchorWorld = null;
}

function handleMiniMapPointer(event) {
  event.preventDefault();
  const rect = dom.miniMapCanvas.getBoundingClientRect();
  const world = miniMapToWorld(event.clientX - rect.left, event.clientY - rect.top);
  moveViewportCenterTo(world);
  if (event.pointerType !== "mouse" || event.buttons === 1) {
    dom.miniMapCanvas.setPointerCapture?.(event.pointerId);
  }
}

function handleCanvasPointerDown(event) {
  if (event.pointerType === "mouse" && event.button !== 0) return;
  view.activePointers.set(event.pointerId, { clientX: event.clientX, clientY: event.clientY });
  if (view.activePointers.size >= 2) {
    view.moved = true;
    beginPinchGesture();
    dom.canvas.setPointerCapture?.(event.pointerId);
    return;
  }
  view.activePointerId = event.pointerId;
  view.dragging = true;
  view.moved = false;
  view.startX = event.clientX;
  view.startY = event.clientY;
  view.startCenterX = view.centerX;
  view.startCenterY = view.centerY;
  dom.canvas.setPointerCapture?.(event.pointerId);
}

function handleCanvasPointerMove(event) {
  if (view.activePointers.has(event.pointerId)) {
    view.activePointers.set(event.pointerId, { clientX: event.clientX, clientY: event.clientY });
  }

  if (view.activePointers.size >= 2 || view.pinching) {
    updatePinchGesture();
    return;
  }

  if (!view.dragging) {
    if (event.pointerType === "mouse") updateTooltip(event.clientX, event.clientY);
    return;
  }

  if (view.activePointerId != null && event.pointerId !== view.activePointerId) return;

  const scale = getBaseScale() * view.zoom;
  const dx = (event.clientX - view.startX) / Math.max(0.001, scale);
  const dy = (event.clientY - view.startY) / Math.max(0.001, scale);
  view.centerX = view.startCenterX - dx;
  view.centerY = view.startCenterY - dy;
  view.moved = Math.abs(event.clientX - view.startX) > 4 || Math.abs(event.clientY - view.startY) > 4;
  clampView();
  drawMap();
}

function handleCanvasPointerUp(event) {
  const activeBeforeRelease = view.activePointers.size;
  view.activePointers.delete(event.pointerId);
  if (view.pinching) {
    if (view.activePointers.size >= 2) {
      beginPinchGesture();
    } else {
      endPinchGesture();
      view.dragging = false;
      view.activePointerId = null;
    }
    try {
      dom.canvas.releasePointerCapture?.(event.pointerId);
    } catch {
      // Ignore browsers that already released capture.
    }
    return;
  }

  if (!view.dragging || (view.activePointerId != null && event.pointerId !== view.activePointerId)) return;
  view.dragging = false;
  view.activePointerId = null;
  try {
    dom.canvas.releasePointerCapture?.(event.pointerId);
  } catch {
    // Ignore browsers that already released capture.
  }

  if (!view.moved) {
    const rect = dom.canvas.getBoundingClientRect();
    const planet = getPlanetAtScreenPosition(event.clientX - rect.left, event.clientY - rect.top);
    if (planet) {
      focusPlanet(planet.id, { center: false });
    }
  }

  if (activeBeforeRelease <= 1) {
    view.activePointers.clear();
  }
}

function handleCanvasPointerCancel(event) {
  view.activePointers.delete(event.pointerId);
  if (view.pinching && view.activePointers.size < 2) {
    endPinchGesture();
  }
  if (view.activePointerId != null && event.pointerId !== view.activePointerId) return;
  view.dragging = false;
  view.activePointerId = null;
  try {
    dom.canvas.releasePointerCapture?.(event.pointerId);
  } catch {
    // Ignore browsers that already released capture.
  }
  dom.tooltip.style.display = "none";
}

function handleCanvasWheel(event) {
  event.preventDefault();
  const rect = dom.canvas.getBoundingClientRect();
  applyZoom(event.deltaY < 0 ? 1.12 : 0.9, event.clientX - rect.left, event.clientY - rect.top);
}

function routeSocketMessage(message) {
  if (message?.type && message.type !== "event_history") {
    markRealtimeUpdate();
  }
  switch (message.type) {
    case "game_state":
      handleGameState(message.data);
      break;
    case "event_history":
      (Array.isArray(message.data) ? message.data : []).forEach(routeSocketMessage);
      break;
    case "ai_decision":
      handleAIDecision(message.data);
      break;
    case "world_event":
      handleWorldEvent(message.data);
      renderAll();
      break;
    case "ai_answer":
      handleAIAnswer(message.data);
      break;
    case "bet_confirmed":
      handleBetConfirmed(message.data);
      break;
    case "betting_status":
      state.bettingState = message.data || null;
      updateHeader();
      updateBettingControls();
      renderInteractiveStatus();
      updateDockSummaries();
      break;
    case "ai_eliminated":
      addTimelineEvent({
        id: `eliminated_${message.data?.aiId}_${message.data?.timestamp || Date.now()}`,
        category: "system",
        title: "帝国淘汰",
        message: `${getAIName(message.data?.aiId)} 已退出争霸舞台。`,
        timestamp: message.data?.timestamp,
        refs: buildTimelineRefs(message.data)
      });
      renderTimeline();
      break;
    case "game_over":
      addTimelineEvent({
        id: `game_over_${message.data?.winner}_${Date.now()}`,
        category: "system",
        title: "胜负已定",
        message: `${getAIName(message.data?.winner)} 赢得本局。`,
        timestamp: Date.now(),
        refs: buildTimelineRefs(message.data)
      });
      if (state.gameState) {
        state.gameState.status = "finished";
        state.gameState.winner = message.data?.winner || null;
        state.gameState.rankings = message.data?.rankings || state.gameState.rankings || [];
        state.gameState.betResults = message.data?.betResults || [];
      }
      state.interaction.betResultText = formatBetSettlementSummary(message.data?.betResults || []);
      renderAll();
      break;
    case "error":
      handleErrorMessage(message.data);
      break;
    default:
      break;
  }
}

function connectWebSocket() {
  if (state.socket && [WebSocket.OPEN, WebSocket.CONNECTING].includes(state.socket.readyState)) return;

  clearTimeout(state.reconnectTimer);
  updateConnectionStatus("connecting");
  const params = new URLSearchParams(window.location.search);
  const protocol = window.location.protocol === "https:" ? "wss" : "ws";
  const explicit = params.get("ws");
  const fallbackPort = params.get("wsPort");
  const primaryUrl = explicit || `${protocol}://${window.location.host}/ws`;
  const fallbackUrl = fallbackPort
    ? `${protocol}://${window.location.hostname}:${fallbackPort}`
    : `${protocol}://${window.location.hostname}:3001`;
  let hasOpened = false;
  const ws = new WebSocket(primaryUrl);
  state.socket = ws;

  ws.onopen = () => {
    hasOpened = true;
    updateConnectionStatus("connected");
  };
  ws.onerror = () => updateConnectionStatus("error");
  ws.onclose = () => {
    if (!hasOpened && primaryUrl !== fallbackUrl) {
      try {
        state.socket = new WebSocket(fallbackUrl);
        const retrySocket = state.socket;
        retrySocket.onopen = () => updateConnectionStatus("connected");
        retrySocket.onerror = () => updateConnectionStatus("error");
        retrySocket.onclose = () => {
          updateConnectionStatus("disconnected");
          state.reconnectTimer = window.setTimeout(connectWebSocket, 2000);
        };
        retrySocket.onmessage = event => {
          try {
            routeSocketMessage(JSON.parse(event.data));
          } catch (error) {
            console.error("message parse failed", error);
          }
        };
        return;
      } catch {
        // continue to regular reconnect path
      }
    }
    updateConnectionStatus("disconnected");
    state.reconnectTimer = window.setTimeout(connectWebSocket, 2000);
  };
  ws.onmessage = event => {
    try {
      routeSocketMessage(JSON.parse(event.data));
    } catch (error) {
      console.error("message parse failed", error);
    }
  };
}

function sendSocketMessage(payload) {
  if (!state.socket || state.socket.readyState !== WebSocket.OPEN) {
    throw new Error("实时连接未建立");
  }
  state.socket.send(JSON.stringify(payload));
}

function bindControls() {
  dom.overviewRailToggle?.addEventListener("click", () => {
    toggleOverviewRail();
  });

  dom.overviewRailToggleSecondary?.addEventListener("click", () => {
    toggleOverviewRail();
  });

  dom.overviewRailResizeHandle?.addEventListener("pointerdown", event => {
    startPaneResize("overview", event);
  });

  dom.dockResizeHandle?.addEventListener("pointerdown", event => {
    startPaneResize("dock", event);
  });

  dom.dockGrabber?.addEventListener("pointerdown", event => {
    startMobileDrawerGesture(event);
  });

  dom.toggleButtons.forEach(button => {
    button.addEventListener("click", () => {
      const key = button.dataset.toggle;
      state.mapOptions[key] = !state.mapOptions[key];
      button.classList.toggle("active", state.mapOptions[key]);
      drawMap();
    });
  });

  dom.filterButtons.forEach(button => {
    button.addEventListener("click", () => {
      state.currentFilter = button.dataset.filter || "all";
      dom.filterButtons.forEach(item => item.classList.toggle("active", item === button));
      renderTimeline();
    });
  });

  dom.timelineAiFilter?.addEventListener("change", () => {
    state.timelineAI = dom.timelineAiFilter.value || "all";
    renderTimeline();
  });

  dom.timelinePlanetFilter?.addEventListener("change", () => {
    state.timelinePlanet = dom.timelinePlanetFilter.value || "all";
    renderTimeline();
  });

  dom.timelineSectorFilter?.addEventListener("change", () => {
    state.timelineSector = dom.timelineSectorFilter.value || "all";
    renderTimeline();
  });

  dom.timelineKeywordFilter?.addEventListener("input", () => {
    state.timelineKeyword = dom.timelineKeywordFilter.value || "";
    renderTimeline();
  });

  dom.timelineList?.addEventListener("click", event => {
    const jumpButton = event.target.closest("[data-planet-jump]");
    if (!jumpButton) return;
    const planetId = jumpButton.dataset.planetJump;
    if (!planetId) return;
    focusPlanet(planetId, { minZoom: isMobileViewport() ? 0.96 : 1.02 });
  });

  dom.dockTabButtons.forEach(button => {
    button.addEventListener("click", () => {
      triggerHaptic("panel");
      toggleDockCard(button.dataset.cardTarget);
    });
  });

  dom.dockClose.addEventListener("click", () => {
    triggerHaptic("tap");
    closeDockCard();
  });

  dom.mobileDockBackdrop?.addEventListener("click", () => {
    triggerHaptic("tap");
    closeDockCard();
  });

  dom.zoomOutBtn.addEventListener("click", () => {
    applyZoom(0.9);
  });

  dom.zoomInBtn.addEventListener("click", () => {
    applyZoom(1.12);
  });

  dom.fitViewBtn.addEventListener("click", () => {
    resetMapView();
  });

  dom.askAiForm.addEventListener("submit", event => {
    event.preventDefault();
    const aiId = dom.askAiSelect.value;
    const question = dom.askAiQuestion.value.trim();
    if (!aiId || !question) {
      state.interaction.aiAnswerText = "请选择 AI 并输入问题。";
      renderInteractiveStatus();
      return;
    }

    try {
      dom.askAiSubmit.disabled = true;
      state.interaction.aiAnswerText = "等待 AI 回答...";
      renderInteractiveStatus();
      sendSocketMessage({ type: "ask_ai", data: { aiId, question } });
    } catch (error) {
      state.interaction.aiAnswerText = error.message;
      renderInteractiveStatus();
      dom.askAiSubmit.disabled = false;
    }
  });

  dom.betForm.addEventListener("submit", event => {
    event.preventDefault();
    const prediction = dom.betPrediction.value;
    const amount = Number(dom.betAmount.value);
    if (!prediction || !Number.isFinite(amount) || amount <= 0) {
      state.interaction.betResultText = "请选择预测对象并填写有效金额。";
      renderInteractiveStatus();
      return;
    }

    try {
      dom.betSubmit.disabled = true;
      state.interaction.betResultText = "下注请求已发送...";
      renderInteractiveStatus();
      sendSocketMessage({
        type: "place_bet",
        data: {
          betType: dom.betType.value,
          prediction,
          amount
        }
      });
    } catch (error) {
      state.interaction.betResultText = error.message;
      renderInteractiveStatus();
      dom.betSubmit.disabled = false;
    }
  });

  dom.canvas.addEventListener("pointerdown", handleCanvasPointerDown);
  dom.canvas.addEventListener("pointermove", handleCanvasPointerMove);
  window.addEventListener("pointermove", handleLayoutPointerMove);
  window.addEventListener("pointerup", handleCanvasPointerUp);
  window.addEventListener("pointerup", handleLayoutPointerEnd);
  window.addEventListener("pointercancel", handleCanvasPointerCancel);
  window.addEventListener("pointercancel", handleLayoutPointerEnd);
  dom.miniMapCanvas.addEventListener("pointerdown", handleMiniMapPointer);
  dom.miniMapCanvas.addEventListener("pointermove", event => {
    if (event.pressure > 0 || event.buttons === 1) handleMiniMapPointer(event);
  });
  window.addEventListener("pointerup", event => {
    try {
      dom.miniMapCanvas.releasePointerCapture?.(event.pointerId);
    } catch {
      // Ignore browsers that already released capture.
    }
  });
  dom.canvas.addEventListener("wheel", handleCanvasWheel, { passive: false });
  dom.canvas.addEventListener("pointerleave", () => {
    state.hoveredPlanetId = null;
    dom.tooltip.style.display = "none";
    drawMap();
  });
  window.addEventListener("resize", () => {
    applyLayoutPreferences();
    resizeCanvas();
    renderDockState();
  });
  window.addEventListener("keydown", event => {
    if (event.key === "Escape") closeDockCard();
  });
}

function tickVisuals() {
  if (!state.gameState) return;
  checkRealtimeHealth();
  updateHeader();
  updateMapSummary();
  renderStrategicSnapshot();
  renderIntelOverview();
  renderSectorOverview();
  renderAIList();
  renderResearchPanel();
  renderProposalPanel();
  renderDiplomacyMatrix();
  renderFleetList();
  renderBattleList();
  renderSelectionPanel();
  renderSectorPanel();
  populateTimelineFilters();
  renderTimeline();
  renderInteractiveStatus();
  updateDockSummaries();
  drawMap();
}

bindControls();
updateConnectionStatus("connecting");
connectWebSocket();
applyLayoutPreferences();
resizeCanvas();
renderDockState();
renderStrategicSnapshot();
renderIntelOverview();
renderSectorOverview();
renderAIList();
renderResearchPanel();
renderProposalPanel();
renderDiplomacyMatrix();
renderFleetList();
renderBattleList();
renderSelectionPanel();
renderSectorPanel();
populateTimelineFilters();
renderTimeline();
updateDockSummaries();
window.setInterval(tickVisuals, 1000);
