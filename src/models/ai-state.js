import { DEFAULT_TECH } from '../data/tech-tree.js';

const DEFAULT_RESOURCES = { metal: 10000, energy: 5000, population: 500 };

function normalizeIntelRecord(record = {}) {
  return {
    id: record.id || null,
    name: record.name || '',
    type: record.type || 'unknown',
    position: record.position ? { ...record.position } : null,
    owner: record.owner ?? null,
    defenseValue: record.defenseValue ?? 0,
    resources: record.resources ? { ...record.resources } : null,
    buildings: record.buildings ? { ...record.buildings } : null,
    buildQueueLength: record.buildQueueLength ?? 0,
    shipBuildQueueLength: record.shipBuildQueueLength ?? 0,
    discovered: Boolean(record.discovered),
    lastSeenAt: record.lastSeenAt ?? null,
    lastSeenTick: record.lastSeenTick ?? null,
    source: record.source || 'unknown',
    stale: Boolean(record.stale)
  };
}

function normalizeIntel(intel = {}) {
  const planets = {};
  for (const [planetId, record] of Object.entries(intel.planets || {})) {
    planets[planetId] = normalizeIntelRecord({ ...record, id: record.id || planetId });
  }

  return {
    planets,
    fleets: intel.fleets && typeof intel.fleets === 'object' ? { ...intel.fleets } : {},
    contacts: intel.contacts && typeof intel.contacts === 'object' ? { ...intel.contacts } : {},
    lastUpdatedAt: intel.lastUpdatedAt ?? null
  };
}

function normalizeDeception(deception = {}) {
  const operation = deception?.operation && typeof deception.operation === 'object'
    ? {
        id: deception.operation.id || null,
        mode: deception.operation.mode || 'feint_assault',
        targetAi: deception.operation.targetAi || null,
        targetPlanetId: deception.operation.targetPlanetId || null,
        sourcePlanetId: deception.operation.sourcePlanetId || null,
        intensity: Math.max(0.2, Math.min(1.2, Number(deception.operation.intensity) || 0.6)),
        startedAt: deception.operation.startedAt ?? null,
        expiresAt: deception.operation.expiresAt ?? null,
        cooldownUntil: deception.operation.cooldownUntil ?? null
      }
    : null;

  return {
    operation,
    history: Array.isArray(deception.history) ? deception.history.slice(-12) : [],
    cooldownUntil: deception.cooldownUntil ?? operation?.cooldownUntil ?? null
  };
}

class AIState {
  constructor(id, name, personality) {
    this.id = id;
    this.name = name;
    this.personality = personality;
    this.color = null;
    this.resources = { ...DEFAULT_RESOURCES };
    this.planets = [];
    this.fleets = [];
    this.tech = { ...DEFAULT_TECH };
    this.diplomacy = {};
    this.reputation = 50;
    this.researchQueue = null;
    this.scoutedPlanets = [];
    this.knownAIs = [];
    this.totalFleetPower = 0;
    this.usedPopulation = 0;
    this.availablePopulation = this.resources.population;
    this.status = 'active';
    this.eliminatedAt = null;
    this.intel = normalizeIntel();
    this.deception = normalizeDeception();
  }

  static fromJSON(data = {}) {
    const state = new AIState(data.id, data.name, data.personality);
    state.color = data.color ?? null;
    state.resources = { ...DEFAULT_RESOURCES, ...(data.resources || {}) };
    state.planets = Array.isArray(data.planets) ? data.planets : [];
    state.fleets = Array.isArray(data.fleets) ? data.fleets : [];
    state.tech = { ...DEFAULT_TECH, ...(data.tech || {}) };
    state.diplomacy = data.diplomacy && typeof data.diplomacy === 'object' ? { ...data.diplomacy } : {};
    state.reputation = data.reputation ?? 50;
    state.researchQueue = data.researchQueue ?? data.techQueue ?? null;
    state.scoutedPlanets = Array.isArray(data.scoutedPlanets) ? [...data.scoutedPlanets] : [];
    state.knownAIs = Array.isArray(data.knownAIs) ? [...data.knownAIs] : [];
    state.totalFleetPower = data.totalFleetPower ?? 0;
    state.usedPopulation = data.usedPopulation ?? 0;
    state.availablePopulation = data.availablePopulation ?? Math.max(0, (state.resources.population || 0) - state.usedPopulation);
    state.status = data.status || 'active';
    state.eliminatedAt = data.eliminatedAt || null;
    state.intel = normalizeIntel(data.intel);
    state.deception = normalizeDeception(data.deception);
    return state;
  }
}

export default AIState;
