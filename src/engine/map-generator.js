import { AI_PERSONALITIES } from '../../config/ai-personalities.js';
import AIState from '../models/ai-state.js';
import { DEFAULT_TECH } from '../data/tech-tree.js';
import IntelligenceSystem from './intelligence-system.js';
import { DEEP_SPACE_RULES, LANE_TIER_RULES, inferRegionId, normalizeLaneKey } from '../utils/map-topology.js';
import { GAME_CONFIG } from '../../config/game-config.js';

const MAP_WIDTH = GAME_CONFIG.MAP_SIZE?.width || 1600;
const MAP_HEIGHT = GAME_CONFIG.MAP_SIZE?.height || 1600;
const MAP_SCALE = Math.min(MAP_WIDTH, MAP_HEIGHT) / 1000;
const MAP_CENTER = { x: MAP_WIDTH / 2, y: MAP_HEIGHT / 2 };
const HOME_RADIUS = Math.round(390 * MAP_SCALE);
const CENTER_RING_RADIUS = Math.round(150 * MAP_SCALE);
const BORDER_RING_RADIUS = Math.round(360 * MAP_SCALE);
const OUTER_RING_RADIUS = Math.round(452 * MAP_SCALE);
const APPROACH_DISTANCE = Math.round(205 * MAP_SCALE);
const CORE_RELAY_RADIUS = Math.round(255 * MAP_SCALE);
const CORE_REGION_RADIUS = Math.round(210 * MAP_SCALE);
const APPROACH_ROLE_RADIUS = Math.round(290 * MAP_SCALE);
const OUTER_ROLE_RADIUS = Math.round(430 * MAP_SCALE);
const DEEP_FRONTIER_RADIUS = Math.round(520 * MAP_SCALE);

const MAP_TEMPLATES = [
  {
    id: 'balanced_ring',
    name: '标准环形',
    description: '中央资源环完整，主航道均衡，适合常规扩张与中央争夺。',
    centerPattern: 'ring5',
    coreRelayCount: 6,
    centerBreaks: 0,
    extraOuterResources: 2,
    laneVariant: 'balanced'
  },
  {
    id: 'dual_core',
    name: '双核心',
    description: '中央分裂成双核心簇，谁掌握两翼跳点，谁就能左右全局走向。',
    centerPattern: 'dual_cluster',
    coreRelayCount: 5,
    centerBreaks: 1,
    extraOuterResources: 2,
    laneVariant: 'mirrored'
  },
  {
    id: 'fractured_core',
    name: '断裂中央',
    description: '中央航道存在断口，侧翼机动和边境穿插会比正面推进更有价值。',
    centerPattern: 'ring4',
    coreRelayCount: 7,
    centerBreaks: 2,
    extraOuterResources: 2,
    laneVariant: 'flanking'
  },
  {
    id: 'outer_rich',
    name: '外环富集',
    description: '外环更富饶，边疆与深空资源带价值更高，适合先做大再压中央。',
    centerPattern: 'ring4',
    coreRelayCount: 6,
    centerBreaks: 1,
    extraOuterResources: 3,
    laneVariant: 'outer_rich'
  }
];

const REGION_TRAITS = [
  {
    id: 'forge_belt',
    name: '锻炉带',
    summary: '金属富集，工业节点更强，适合持续爆舰。',
    doctrine: '工业推进',
    bonuses: { metal: 0.28, shipyardLevel: 1 }
  },
  {
    id: 'scholar_drift',
    name: '学园漂带',
    summary: '能源与科研基础更强，适合侦察与科技滚雪球。',
    doctrine: '科研侦察',
    bonuses: { energy: 0.18, labLevel: 1, sensorRange: 30 }
  },
  {
    id: 'bulwark_arc',
    name: '壁垒弧',
    summary: '防御与稳控更强，适合构筑防线与守住咽喉。',
    doctrine: '防御反击',
    bonuses: { defenseFlat: 80, stabilityGain: 0.05 }
  },
  {
    id: 'relay_web',
    name: '中继网',
    summary: '补给与回防条件更好，适合高机动舰队轮转。',
    doctrine: '快速机动',
    bonuses: { repairRate: 0.00004, maintenanceReduction: 0.06 }
  },
  {
    id: 'frontier_march',
    name: '远征边疆',
    summary: '人口与外线节点更丰沛，但边境暴露更高。',
    doctrine: '外扩抢点',
    bonuses: { population: 0.18, frontierValue: 1 }
  },
  {
    id: 'signal_nest',
    name: '信号巢',
    summary: '监听节点密布，情报保鲜和预警能力更强。',
    doctrine: '监听压制',
    bonuses: { sensorRange: 55, intelRetention: 0.35 }
  },
  {
    id: 'trade_wind',
    name: '贸易风带',
    summary: '能源与外环节点更活跃，适合走外线积累。',
    doctrine: '外线经营',
    bonuses: { energy: 0.12, population: 0.1, relayValue: 1 }
  }
];

const SPECIAL_NODE_TYPES = {
  industrial_hub: {
    label: '工业星',
    summary: '天然工业节点，造舰和金属转化效率更高。',
    bonuses: { metal: 0.22, shipyardLevel: 1 }
  },
  research_archive: {
    label: '科研星',
    summary: '遗留研究设施完好，科研速度更快。',
    bonuses: { energy: 0.1, labLevel: 1 }
  },
  fortress_world: {
    label: '要塞星',
    summary: '天然防御完整，守住后能成为前线锚点。',
    bonuses: { defenseFlat: 160, stabilityGain: 0.08 }
  },
  supply_nexus: {
    label: '补给星',
    summary: '补给链和船坞条件优越，适合整补与前推。',
    bonuses: { repairRate: 0.00005, maintenanceReduction: 0.08, shipyardLevel: 1 }
  },
  sensor_array: {
    label: '监听星',
    summary: '监听阵列增强侦察与预警，利于提前发现敌军。',
    bonuses: { sensorRange: 70, intelRetention: 0.45 }
  },
  arcology: {
    label: '居住穹顶',
    summary: '人口扩张更快，适合长期经营与扩军。',
    bonuses: { population: 0.22 }
  }
};

function getTemplateLaneVariantMeta(template) {
  return {
    balanced: { label: '均衡航道', summary: '主航道与侧翼线较均衡。', exposure: 0.55 },
    mirrored: { label: '双核镜像', summary: '中央双核心牵引两翼争夺。', exposure: 0.62 },
    flanking: { label: '侧翼穿插', summary: '中央存在断口，侧翼航线价值更高。', exposure: 0.48 },
    outer_rich: { label: '外环富集', summary: '外环资源线与补给链更强。', exposure: 0.46 }
  }[template?.laneVariant] || { label: '均衡航道', summary: '主航道与侧翼线较均衡。', exposure: 0.55 };
}

function getRegionTraitDefinition(traitId) {
  return REGION_TRAITS.find(item => item.id === traitId) || null;
}

function normalizeRegionTrait(trait, regionId = null) {
  if (!trait) return null;
  const traitId = typeof trait === 'string' ? trait : trait.id;
  const base = getRegionTraitDefinition(traitId);
  const normalized = typeof trait === 'object' ? trait : { id: traitId };
  return {
    ...(base || {}),
    ...normalized,
    regionId: regionId || normalized.regionId || base?.regionId || null,
    name: normalized.name || base?.name || traitId || '战区特性',
    summary: normalized.summary || base?.summary || '该战区存在特殊修正。',
    doctrine: normalized.doctrine || base?.doctrine || '常规推进',
    bonuses: {
      ...(base?.bonuses || {}),
      ...(normalized.bonuses || {})
    }
  };
}

function mergeNumericModifiers(target, source = {}) {
  Object.entries(source || {}).forEach(([key, value]) => {
    const numeric = Number(value) || 0;
    if (!numeric) return;
    target[key] = (target[key] || 0) + numeric;
  });
  return target;
}

function applyStrategicMetadataToPlanet(planet, trait = null, options = {}) {
  if (!planet || typeof planet !== 'object') return;

  const applyProduction = Boolean(options.applyProduction);
  const applyDefense = Boolean(options.applyDefense);
  const bonuses = trait?.bonuses || {};

  planet.nodeModifiers = planet.nodeModifiers && typeof planet.nodeModifiers === 'object' ? { ...planet.nodeModifiers } : {};
  planet.regionModifiers = planet.regionModifiers && typeof planet.regionModifiers === 'object' ? { ...planet.regionModifiers } : {};

  if (trait) {
    planet.regionTraitId = trait.id;
    planet.regionTraitName = trait.name;
    planet.regionTraitSummary = trait.summary;
    mergeNumericModifiers(planet.regionModifiers, bonuses);
    mergeNumericModifiers(planet.nodeModifiers, {
      shipyardLevel: bonuses.shipyardLevel,
      labLevel: bonuses.labLevel,
      sensorRange: bonuses.sensorRange,
      intelRetention: bonuses.intelRetention,
      repairRate: bonuses.repairRate,
      maintenanceReduction: bonuses.maintenanceReduction,
      stabilityGain: bonuses.stabilityGain,
      frontierValue: bonuses.frontierValue,
      relayValue: bonuses.relayValue
    });
  }

  if (applyProduction && planet.production) {
    if (bonuses.metal) {
      planet.production.metalPerSecond *= (1 + bonuses.metal);
    }
    if (bonuses.energy) {
      planet.production.energyPerSecond *= (1 + bonuses.energy);
    }
    if (bonuses.population) {
      planet.production.populationPerSecond *= (1 + bonuses.population);
    }
    if (bonuses.frontierValue && ['frontier_resource', 'border_bastion', 'approach_gate'].includes(planet.strategicRole)) {
      planet.production.metalPerSecond *= 1 + bonuses.frontierValue * 0.08;
      planet.production.populationPerSecond *= 1 + bonuses.frontierValue * 0.05;
    }
    if (bonuses.relayValue && ['outer_relay', 'core_relay'].includes(planet.strategicRole)) {
      planet.production.energyPerSecond *= 1 + bonuses.relayValue * 0.1;
    }
  }

  if (applyDefense && bonuses.defenseFlat) {
    planet.defenseValue += bonuses.defenseFlat;
  }

  const specialNode = planet.specialNodeType ? SPECIAL_NODE_TYPES[planet.specialNodeType] : null;
  if (specialNode) {
    planet.specialNodeLabel = planet.specialNodeLabel || specialNode.label;
    planet.specialNodeSummary = planet.specialNodeSummary || specialNode.summary;
    mergeNumericModifiers(planet.nodeModifiers, specialNode.bonuses || {});
    if (applyDefense && specialNode.bonuses?.defenseFlat) {
      planet.defenseValue += specialNode.bonuses.defenseFlat;
    }
  }
}

function inferTemplateFromPlanets(planets = []) {
  const centers = planets.filter(planet => planet.strategicRole === 'central_hub').length;
  const coreRelays = planets.filter(planet => planet.strategicRole === 'core_relay').length;
  const outerFrontiers = planets.filter(planet => planet.strategicRole === 'frontier_resource' && distance(planet.position, MAP_CENTER) >= OUTER_RING_RADIUS * 0.92).length;
  const template = centers >= 6
    ? MAP_TEMPLATES.find(item => item.id === 'dual_core')
    : (centers <= 4 && coreRelays >= 7)
      ? MAP_TEMPLATES.find(item => item.id === 'fractured_core')
      : outerFrontiers >= 7
        ? MAP_TEMPLATES.find(item => item.id === 'outer_rich')
        : MAP_TEMPLATES.find(item => item.id === 'balanced_ring');

  return template || MAP_TEMPLATES[0];
}

function randomChoice(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function shuffled(items) {
  const clone = [...items];
  for (let index = clone.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [clone[index], clone[swapIndex]] = [clone[swapIndex], clone[index]];
  }
  return clone;
}

function polar(center, radius, angle) {
  return {
    x: center.x + Math.cos(angle) * radius,
    y: center.y + Math.sin(angle) * radius
  };
}

function normalize(vector) {
  const length = Math.hypot(vector.x, vector.y) || 1;
  return { x: vector.x / length, y: vector.y / length };
}

function perpendicular(vector) {
  return { x: -vector.y, y: vector.x };
}

function distance(left, right) {
  return Math.hypot((left.x || 0) - (right.x || 0), (left.y || 0) - (right.y || 0));
}

function angleFromCenter(position) {
  return Math.atan2(position.y - MAP_CENTER.y, position.x - MAP_CENTER.x);
}

function buildRegions(planets) {
  const homePlanets = planets
    .filter(planet => planet.type === 'home')
    .sort((left, right) => angleFromCenter(left.position) - angleFromCenter(right.position));

  const regions = homePlanets.map((planet, index) => ({
    id: `sector_${index + 1}`,
    name: `${planet.name.replace(/母星$/, '')}战区`,
    kind: 'home_sector',
    anchorPlanetId: planet.id,
    center: {
      x: (planet.position.x + MAP_CENTER.x) / 2,
      y: (planet.position.y + MAP_CENTER.y) / 2
    }
  }));

  regions.push({
    id: 'core',
    name: '中央资源环',
    kind: 'core',
    center: { ...MAP_CENTER }
  });

  const homeAnchors = homePlanets.map((planet, index) => ({
    regionId: regions[index].id,
    name: regions[index].name,
    position: planet.position
  }));

  planets.forEach(planet => {
    const centerDistance = distance(planet.position, MAP_CENTER);
    if (centerDistance <= CORE_REGION_RADIUS) {
      planet.regionId = 'core';
      planet.regionName = '中央资源环';
      return;
    }

    const nearestHome = homeAnchors.reduce((best, anchor) => {
      const currentDistance = distance(planet.position, anchor.position);
      if (!best || currentDistance < best.distance) {
        return { ...anchor, distance: currentDistance };
      }
      return best;
    }, null);

    planet.regionId = nearestHome?.regionId || inferRegionId(planet.position, { regions });
    planet.regionName = nearestHome?.name || regions.find(region => region.id === planet.regionId)?.name || planet.regionId;
  });

  return regions;
}

function inferStrategicRole(planet) {
  if (planet.strategicRole) return planet.strategicRole;
  const centerDistance = distance(planet.position, MAP_CENTER);

  if (planet.type === 'home') return 'home_core';
  if (planet.type === 'resource' && centerDistance <= CORE_REGION_RADIUS) return 'central_hub';
  if (planet.type === 'resource') return 'inner_resource';
  if (centerDistance <= APPROACH_ROLE_RADIUS) return 'approach_gate';
  if (centerDistance >= OUTER_ROLE_RADIUS) return 'outer_relay';
  return 'border_bastion';
}

function buildLane(from, to, tier, label) {
  const tierRule = LANE_TIER_RULES[tier] || LANE_TIER_RULES.frontier;
  const routeTraits = {
    trunk: { exposure: 0.9, stealthValue: 0.12, supplyQuality: 0.92, chokepointRisk: 0.82 },
    corridor: { exposure: 0.68, stealthValue: 0.28, supplyQuality: 0.78, chokepointRisk: 0.64 },
    frontier: { exposure: 0.56, stealthValue: 0.36, supplyQuality: 0.62, chokepointRisk: 0.58 },
    relay: { exposure: 0.42, stealthValue: 0.46, supplyQuality: 0.58, chokepointRisk: 0.4 }
  }[tier] || { exposure: 0.5, stealthValue: 0.3, supplyQuality: 0.6, chokepointRisk: 0.5 };
  return {
    id: `lane_${normalizeLaneKey(from.id, to.id)}`,
    from: from.id,
    to: to.id,
    tier,
    label: label || tierRule.label,
    speedMultiplier: tierRule.speedMultiplier,
    strategicWeight: tierRule.strategicWeight,
    ...routeTraits
  };
}

function buildFallbackMapMeta(planets) {
  const regions = buildRegions(planets);
  const lanes = [];
  const laneKeys = new Set();

  const addLane = (left, right, tier, label) => {
    if (!left || !right || left.id === right.id) return;
    const key = normalizeLaneKey(left.id, right.id);
    if (laneKeys.has(key)) return;
    laneKeys.add(key);
    lanes.push(buildLane(left, right, tier, label));
  };

  const byRole = new Map();
  planets.forEach(planet => {
    const role = inferStrategicRole(planet);
    planet.strategicRole = role;
    const list = byRole.get(role) || [];
    list.push(planet);
    byRole.set(role, list);
  });

  const nearest = (planet, candidates, count = 1, maxDistance = Number.POSITIVE_INFINITY) => {
    return [...candidates]
      .filter(candidate => candidate.id !== planet.id)
      .map(candidate => ({ candidate, value: distance(planet.position, candidate.position) }))
      .filter(item => item.value <= maxDistance)
      .sort((left, right) => left.value - right.value)
      .slice(0, count)
      .map(item => item.candidate);
  };

  const homes = byRole.get('home_core') || [];
  const resources = planets.filter(planet => planet.type === 'resource' && planet.regionId !== 'core');
  const central = byRole.get('central_hub') || [];
  const approaches = byRole.get('approach_gate') || [];
  const border = byRole.get('border_bastion') || [];
  const outer = byRole.get('outer_relay') || [];

  homes.forEach(home => {
    nearest(home, resources, 3, 220).forEach(target => addLane(home, target, 'corridor'));
    nearest(home, approaches, 1, 250).forEach(target => addLane(home, target, 'corridor'));
  });

  approaches.forEach(planet => {
    nearest(planet, central, 2, 210).forEach(target => addLane(planet, target, 'corridor'));
    nearest(planet, border, 2, 170).forEach(target => addLane(planet, target, 'frontier'));
  });

  central
    .sort((left, right) => angleFromCenter(left.position) - angleFromCenter(right.position))
    .forEach((planet, index, list) => {
      addLane(planet, list[(index + 1) % list.length], 'trunk');
    });

  border
    .sort((left, right) => angleFromCenter(left.position) - angleFromCenter(right.position))
    .forEach((planet, index, list) => {
      addLane(planet, list[(index + 1) % list.length], 'frontier');
      nearest(planet, outer, 1, 160).forEach(target => addLane(planet, target, 'relay'));
    });

  outer
    .sort((left, right) => angleFromCenter(left.position) - angleFromCenter(right.position))
    .forEach((planet, index, list) => {
      addLane(planet, list[(index + 1) % list.length], 'relay');
    });

  return {
    size: { width: MAP_WIDTH, height: MAP_HEIGHT },
    regions,
    lanes,
    rules: {
      laneTiers: LANE_TIER_RULES,
      offLane: DEEP_SPACE_RULES
    }
  };
}

class MapGenerator {
  constructor() {
    this.mapSize = { width: MAP_WIDTH, height: MAP_HEIGHT };
    this.template = randomChoice(MAP_TEMPLATES);
  }

  generateMap() {
    const planets = [];
    const aiStates = [];
    const topology = {
      homes: [],
      resourcesByHome: [],
      approaches: [],
      borders: [],
      outers: [],
      coreRelays: [],
      centers: []
    };

    let planetId = 1;
    const sectorAngles = this.generateSectorAngles();
    const regionTraits = this.buildRegionTraits();

    AI_PERSONALITIES.forEach((ai, index) => {
      const position = polar(MAP_CENTER, HOME_RADIUS, sectorAngles[index]);
      const trait = regionTraits[index];
      planets.push(this.createPlanet({
        id: `planet_${String(planetId++).padStart(3, '0')}`,
        name: `${ai.name}母星`,
        type: 'home',
        position,
        owner: ai.id,
        resources: { metal: 10000, energy: 5000, population: 500 },
        production: { metalPerSecond: 5, energyPerSecond: 3, populationPerSecond: 0.2 },
        // Give every empire a viable opening so fleets, diplomacy and tech can start early.
        buildings: { mine: 1, powerPlant: 1, shipyard: 1, defense: 1, lab: 1 },
        defenseValue: 200,
        strategicRole: 'home_core',
        regionTraitId: trait.id
      }));

      aiStates.push(AIState.fromJSON({
        id: ai.id,
        name: ai.name,
        color: ai.color,
        personality: ai.personality,
        reputation: 50,
        tech: { ...DEFAULT_TECH },
        researchQueue: null,
        diplomacy: this.initDiplomacy(ai.id)
      }));

      topology.homes.push(planets[planets.length - 1]);
    });

    topology.homes.forEach((homePlanet, index) => {
      const trait = regionTraits[index];
      const resourcePositions = this.generateLocalResourcePositions(homePlanet.position);
      const localResources = resourcePositions.map((position, resourceIndex) => planets.push(this.createPlanet({
        id: `planet_${String(planetId++).padStart(3, '0')}`,
        name: `${homePlanet.name.replace(/母星$/, '')}${['前矿', '左翼', '右翼'][resourceIndex]}`,
        type: 'resource',
        position,
        owner: null,
        resources: { metal: 3000, energy: 2000, population: 100 },
        production: { metalPerSecond: 3, energyPerSecond: 2, populationPerSecond: 0.1 },
        buildings: { mine: 0, powerPlant: 0, shipyard: 0, defense: 0, lab: 0 },
        defenseValue: 50,
        strategicRole: resourceIndex === 0 ? 'inner_resource' : 'frontier_resource',
        regionTraitId: trait.id
      })) && planets[planets.length - 1]);

      topology.resourcesByHome[index] = localResources;

      for (let extraIndex = 0; extraIndex < (this.template.extraOuterResources || 0); extraIndex += 1) {
        planets.push(this.createPlanet({
          id: `planet_${String(planetId++).padStart(3, '0')}`,
          name: `${homePlanet.name.replace(/母星$/, '')}远疆${extraIndex + 1}`,
          type: 'resource',
          position: this.generateDeepFrontierPosition(homePlanet.position, index, extraIndex),
          owner: null,
          resources: { metal: 2600, energy: 2200, population: 140 },
          production: { metalPerSecond: 2.8, energyPerSecond: 2.3, populationPerSecond: 0.12 },
          buildings: { mine: 0, powerPlant: 0, shipyard: 0, defense: 0, lab: 0 },
          defenseValue: 60,
          strategicRole: 'frontier_resource',
          regionTraitId: trait.id
        }));
      }
    });

    const centerPositions = this.generateCenterPositions();
    centerPositions.forEach((position, index) => {
      planets.push(this.createPlanet({
        id: `planet_${String(planetId++).padStart(3, '0')}`,
        name: `超级资源星${index + 1}`,
        type: 'resource',
        position,
        owner: null,
        resources: { metal: 8000, energy: 6000, population: 200 },
        production: { metalPerSecond: 9, energyPerSecond: 6, populationPerSecond: 0.3 },
        buildings: { mine: 0, powerPlant: 0, shipyard: 0, defense: 0, lab: 0 },
        defenseValue: 150,
        strategicRole: 'central_hub'
      }));
      topology.centers.push(planets[planets.length - 1]);
    });

    topology.homes.forEach((homePlanet, index) => {
      const inward = normalize({ x: MAP_CENTER.x - homePlanet.position.x, y: MAP_CENTER.y - homePlanet.position.y });
      planets.push(this.createPlanet({
        id: `planet_${String(planetId++).padStart(3, '0')}`,
        name: `前线门扉${index + 1}`,
        type: 'normal',
        position: {
          x: homePlanet.position.x + inward.x * APPROACH_DISTANCE,
          y: homePlanet.position.y + inward.y * APPROACH_DISTANCE
        },
        owner: null,
        resources: { metal: 1200, energy: 1100, population: 60 },
        production: { metalPerSecond: 1.1, energyPerSecond: 1.1, populationPerSecond: 0.05 },
        buildings: { mine: 0, powerPlant: 0, shipyard: 0, defense: 0, lab: 0 },
        defenseValue: 35,
        strategicRole: 'approach_gate',
        regionTraitId: regionTraits[index].id
      }));
      topology.approaches.push(planets[planets.length - 1]);
    });

    for (let index = 0; index < sectorAngles.length; index += 1) {
      const borderAngle = sectorAngles[index] + Math.PI / 7;
      planets.push(this.createPlanet({
        id: `planet_${String(planetId++).padStart(3, '0')}`,
        name: `边境关口${index + 1}`,
        type: 'normal',
        position: polar(MAP_CENTER, BORDER_RING_RADIUS, borderAngle),
        owner: null,
        resources: { metal: 1300, energy: 1100, population: 65 },
        production: { metalPerSecond: 1.15, energyPerSecond: 1.05, populationPerSecond: 0.05 },
        buildings: { mine: 0, powerPlant: 0, shipyard: 0, defense: 0, lab: 0 },
        defenseValue: 45,
        strategicRole: 'border_bastion',
        regionTraitId: regionTraits[index].id
      }));
      topology.borders.push(planets[planets.length - 1]);

      planets.push(this.createPlanet({
        id: `planet_${String(planetId++).padStart(3, '0')}`,
        name: `外环中继${index + 1}`,
        type: 'normal',
        position: polar(MAP_CENTER, OUTER_RING_RADIUS, borderAngle),
        owner: null,
        resources: { metal: 900, energy: 900, population: 55 },
        production: { metalPerSecond: 0.9, energyPerSecond: 0.95, populationPerSecond: 0.04 },
        buildings: { mine: 0, powerPlant: 0, shipyard: 0, defense: 0, lab: 0 },
        defenseValue: 25,
        strategicRole: 'outer_relay',
        regionTraitId: regionTraits[index].id
      }));
      topology.outers.push(planets[planets.length - 1]);
    }

    const coreRelayCount = Math.max(4, this.template.coreRelayCount || 6);
    for (let index = 0; index < coreRelayCount; index += 1) {
      const angle = -Math.PI / 2 + (Math.PI * 2 / coreRelayCount) * index;
      planets.push(this.createPlanet({
        id: `planet_${String(planetId++).padStart(3, '0')}`,
        name: `中央跳点${index + 1}`,
        type: 'normal',
        position: polar(MAP_CENTER, CORE_RELAY_RADIUS, angle),
        owner: null,
        resources: { metal: 1100, energy: 1200, population: 70 },
        production: { metalPerSecond: 1.05, energyPerSecond: 1.15, populationPerSecond: 0.05 },
        buildings: { mine: 0, powerPlant: 0, shipyard: 0, defense: 0, lab: 0 },
        defenseValue: 40,
        strategicRole: 'core_relay'
      }));
      topology.coreRelays.push(planets[planets.length - 1]);
    }

    const regions = buildRegions(planets);
    const traitMap = this.attachRegionTraits(planets, regions, regionTraits);
    this.applyTemplateAndRegionBonuses(planets, traitMap);
    this.assignSpecialNodes(planets, topology, traitMap);
    const mapMeta = this.buildStructuredMapMeta(planets, topology, traitMap);
    return { planets, aiStates, mapMeta };
  }

  generateSectorAngles() {
    return Array.from({ length: 7 }, (_, index) => (-Math.PI / 2) + (Math.PI * 2 / 7) * index);
  }

  buildRegionTraits() {
    return shuffled(REGION_TRAITS).slice(0, AI_PERSONALITIES.length).map((trait, index) => ({
      ...trait,
      regionId: `sector_${index + 1}`
    }));
  }

  generateCenterPositions() {
    if (this.template.centerPattern === 'dual_cluster') {
      const leftCenter = { x: MAP_CENTER.x - Math.round(88 * MAP_SCALE), y: MAP_CENTER.y };
      const rightCenter = { x: MAP_CENTER.x + Math.round(88 * MAP_SCALE), y: MAP_CENTER.y };
      const clusterRadius = Math.round(74 * MAP_SCALE);
      return [
        polar(leftCenter, clusterRadius, -Math.PI / 2),
        polar(leftCenter, clusterRadius, Math.PI / 6),
        polar(leftCenter, clusterRadius, Math.PI * 5 / 6),
        polar(rightCenter, clusterRadius, -Math.PI / 2),
        polar(rightCenter, clusterRadius, Math.PI / 6),
        polar(rightCenter, clusterRadius, Math.PI * 5 / 6)
      ];
    }

    const count = this.template.centerPattern === 'ring4' ? 4 : 5;
    const offset = this.template.centerPattern === 'ring4' ? Math.PI / 4 : 0;
    return Array.from({ length: count }, (_, index) => {
      const angle = -Math.PI / 2 + offset + (Math.PI * 2 / count) * index;
      return polar(MAP_CENTER, CENTER_RING_RADIUS, angle);
    });
  }

  generateDeepFrontierPosition(homePosition, sectorIndex, extraIndex = 0) {
    const outward = normalize({ x: homePosition.x - MAP_CENTER.x, y: homePosition.y - MAP_CENTER.y });
    const tangent = perpendicular(outward);
    const swing = (extraIndex % 2 === 0 ? 1 : -1) * (52 + sectorIndex * 2) * MAP_SCALE;
    const radialReach = Math.max(0, DEEP_FRONTIER_RADIUS - HOME_RADIUS);
    return {
      x: homePosition.x + outward.x * radialReach + tangent.x * swing,
      y: homePosition.y + outward.y * radialReach + tangent.y * swing
    };
  }

  attachRegionTraits(planets, regions, regionTraits) {
    const traitMap = new Map(regionTraits.map(trait => [trait.regionId, trait]));
    regions.forEach(region => {
      if (region.id === 'core') {
        region.trait = {
          id: 'core_flux',
          name: this.template.name,
          summary: this.template.description,
          doctrine: '中央争夺',
          bonuses: {}
        };
        return;
      }
      region.trait = traitMap.get(region.id) || null;
    });

    planets.forEach(planet => {
      const region = regions.find(item => item.id === planet.regionId);
      if (!region?.trait) return;
      planet.regionTraitId = region.trait.id;
      planet.regionTraitName = region.trait.name;
      planet.regionTraitSummary = region.trait.summary;
    });

    return new Map(regions.map(region => [region.id, region.trait]).filter(([, trait]) => Boolean(trait)));
  }

  applyTemplateAndRegionBonuses(planets, traitMap) {
    planets.forEach(planet => {
      const trait = traitMap.get(planet.regionId);
      applyStrategicMetadataToPlanet(planet, trait, { applyProduction: true, applyDefense: true });
      if (this.template.id === 'outer_rich' && ['outer_relay', 'frontier_resource', 'border_bastion'].includes(planet.strategicRole)) {
        planet.production.metalPerSecond *= 1.12;
        planet.production.energyPerSecond *= 1.08;
      }
      if (this.template.id === 'fractured_core' && planet.regionId === 'core') {
        planet.defenseValue += 20;
      }
    });
  }

  assignSpecialNodes(planets, topology, traitMap) {
    const applyNode = (planet, nodeType) => {
      if (!planet || !SPECIAL_NODE_TYPES[nodeType]) return;
      planet.specialNodeType = nodeType;
      applyStrategicMetadataToPlanet(planet, null, { applyProduction: false, applyDefense: true });
    };

    topology.homes.forEach((home, index) => {
      const trait = traitMap.get(`sector_${index + 1}`);
      const localResources = topology.resourcesByHome[index] || [];
      if (trait?.id === 'forge_belt') applyNode(localResources[0], 'industrial_hub');
      if (trait?.id === 'scholar_drift') applyNode(localResources[0], 'research_archive');
      if (trait?.id === 'relay_web') applyNode(topology.approaches[index], 'supply_nexus');
      if (trait?.id === 'bulwark_arc') applyNode(topology.borders[index], 'fortress_world');
      if (trait?.id === 'signal_nest') applyNode(topology.outers[index], 'sensor_array');
      if (trait?.id === 'frontier_march' || trait?.id === 'trade_wind') applyNode(localResources[1], 'arcology');
    });

    if (this.template.id === 'dual_core') {
      applyNode(topology.centers[0], 'research_archive');
      applyNode(topology.centers[topology.centers.length - 1], 'industrial_hub');
    } else if (this.template.id === 'fractured_core') {
      applyNode(topology.coreRelays[0], 'sensor_array');
      applyNode(topology.coreRelays[Math.floor(topology.coreRelays.length / 2)], 'fortress_world');
    } else if (this.template.id === 'outer_rich') {
      topology.outers.slice(0, 2).forEach(planet => applyNode(planet, 'supply_nexus'));
    } else {
      applyNode(topology.centers[0], 'industrial_hub');
      applyNode(topology.coreRelays[0], 'sensor_array');
    }
  }

  generateLocalResourcePositions(homePosition) {
    const inward = normalize({ x: MAP_CENTER.x - homePosition.x, y: MAP_CENTER.y - homePosition.y });
    const tangent = perpendicular(inward);
    return [
      {
        x: homePosition.x + inward.x * (118 * MAP_SCALE),
        y: homePosition.y + inward.y * (118 * MAP_SCALE)
      },
      {
        x: homePosition.x + inward.x * (72 * MAP_SCALE) + tangent.x * (88 * MAP_SCALE),
        y: homePosition.y + inward.y * (72 * MAP_SCALE) + tangent.y * (88 * MAP_SCALE)
      },
      {
        x: homePosition.x + inward.x * (72 * MAP_SCALE) - tangent.x * (88 * MAP_SCALE),
        y: homePosition.y + inward.y * (72 * MAP_SCALE) - tangent.y * (88 * MAP_SCALE)
      }
    ];
  }

  createPlanet({ id, name, type, position, owner, resources, production, buildings, defenseValue, strategicRole, regionTraitId = null }) {
    return {
      id,
      name,
      type,
      position,
      owner,
      resources,
      production,
      buildings,
      defenseValue,
      strategicRole,
      regionTraitId,
      regionTraitName: null,
      regionTraitSummary: null,
      specialNodeType: null,
      specialNodeLabel: null,
      specialNodeSummary: null,
      nodeModifiers: {},
      buildQueue: [],
      shipBuildQueue: []
    };
  }

  buildStructuredMapMeta(planets, topology, traitMap = new Map()) {
    const regions = buildRegions(planets).map(region => ({
      ...region,
      trait: traitMap.get(region.id) || region.trait || null
    }));
    const lanes = [];
    const laneKeys = new Set();

    const addLane = (left, right, tier, label) => {
      if (!left || !right || left.id === right.id) return;
      const key = normalizeLaneKey(left.id, right.id);
      if (laneKeys.has(key)) return;
      laneKeys.add(key);
      lanes.push(buildLane(left, right, tier, label));
    };

    const connectRing = (items, tier, label) => {
      items.forEach((planet, index) => {
        const shouldBreak =
          tier === 'trunk' &&
          this.template.centerBreaks > 0 &&
          index < this.template.centerBreaks &&
          items.length > 4;
        if (shouldBreak) return;
        addLane(planet, items[(index + 1) % items.length], tier, label);
      });
    };

    topology.homes.forEach((home, index) => {
      const [inner, clockwise, counter] = topology.resourcesByHome[index];
      const leftBorder = topology.borders[(index + topology.borders.length - 1) % topology.borders.length];
      const rightBorder = topology.borders[index];

      addLane(home, inner, 'corridor');
      addLane(home, clockwise, 'frontier');
      addLane(home, counter, 'frontier');
      addLane(home, topology.approaches[index], 'corridor');
      addLane(inner, topology.approaches[index], 'corridor', '前线推进航道');
      addLane(clockwise, rightBorder, 'frontier');
      addLane(counter, leftBorder, 'frontier');
      addLane(topology.approaches[index], leftBorder, 'frontier');
      addLane(topology.approaches[index], rightBorder, 'frontier');

      const nearestCenters = [...topology.centers]
        .map(planet => ({ planet, value: distance(topology.approaches[index].position, planet.position) }))
        .sort((left, right) => left.value - right.value)
        .slice(0, 2)
        .map(item => item.planet);

      nearestCenters.forEach(centerPlanet => addLane(topology.approaches[index], centerPlanet, 'corridor', '中央争夺走廊'));
    });

    connectRing(topology.centers, 'trunk');
    connectRing(topology.borders, 'frontier');
    connectRing(topology.outers, 'relay');
    connectRing(topology.coreRelays, 'trunk', '核心跳点链');

    topology.borders.forEach((border, index) => {
      addLane(border, topology.outers[index], 'relay');
      addLane(border, topology.outers[(index + topology.outers.length - 1) % topology.outers.length], 'relay');
    });

    topology.coreRelays.forEach(coreRelay => {
      const nearestCenters = [...topology.centers]
        .map(planet => ({ planet, value: distance(coreRelay.position, planet.position) }))
        .sort((left, right) => left.value - right.value)
        .slice(0, 2)
        .map(item => item.planet);

      const nearestApproaches = [...topology.approaches]
        .map(planet => ({ planet, value: distance(coreRelay.position, planet.position) }))
        .sort((left, right) => left.value - right.value)
        .slice(0, 2)
        .map(item => item.planet);

      nearestCenters.forEach(target => addLane(coreRelay, target, 'trunk'));
      nearestApproaches.forEach(target => addLane(coreRelay, target, 'corridor'));
    });

    const laneVariantMeta = getTemplateLaneVariantMeta(this.template);

    return {
      size: { width: MAP_WIDTH, height: MAP_HEIGHT },
      template: {
        id: this.template.id,
        name: this.template.name,
        description: this.template.description,
        laneVariant: laneVariantMeta
      },
      regions,
      lanes,
      rules: {
        laneTiers: LANE_TIER_RULES,
        offLane: DEEP_SPACE_RULES
      }
    };
  }

  initDiplomacy(aiId) {
    const relations = {};
    const since = Date.now();
    AI_PERSONALITIES.forEach(ai => {
      if (ai.id !== aiId) {
        relations[ai.id] = {
          status: 'neutral',
          since,
          trust: 42,
          fear: 18,
          grievance: 0,
          dependency: 8,
          borderTension: 12,
          treatyStability: 0,
          crisisLevel: 'calm',
          lastIncidentAt: null,
          lastTradeAt: null,
          lastProposalAt: null,
          lastStatusChangeAt: since,
          commitmentUntil: null,
          commonEnemyCount: 0
        };
      }
    });
    return relations;
  }
}

export function ensureMapTopology(gameState) {
  if (!gameState) return gameState;

  const planets = Array.isArray(gameState.planets) ? gameState.planets : [];
  planets.forEach(planet => {
    if (planet?.type !== 'home') return;
    planet.buildings = planet.buildings && typeof planet.buildings === 'object' ? planet.buildings : {};
    planet.buildings.shipyard = Math.max(1, planet.buildings.shipyard || 0);
    planet.buildings.lab = Math.max(1, planet.buildings.lab || 0);
  });
  if (planets.length === 0) {
    const inferredTemplate = inferTemplateFromPlanets(planets);
    gameState.mapMeta = {
      size: { width: MAP_WIDTH, height: MAP_HEIGHT },
      template: {
        id: inferredTemplate.id,
        name: inferredTemplate.name,
        description: inferredTemplate.description,
        laneVariant: getTemplateLaneVariantMeta(inferredTemplate)
      },
      regions: [],
      lanes: [],
      rules: {
        laneTiers: LANE_TIER_RULES,
        offLane: DEEP_SPACE_RULES
      }
    };
    return gameState;
  }

  const inferredTemplate = inferTemplateFromPlanets(planets);
  const regions = buildRegions(planets);
  const traitMap = new Map();

  (gameState.mapMeta?.regions || []).forEach(region => {
    const normalized = normalizeRegionTrait(region?.trait, region?.id);
    if (region?.id && normalized) {
      traitMap.set(region.id, normalized);
    }
  });

  planets.forEach(planet => {
    if (!planet?.regionId || traitMap.has(planet.regionId) || !planet.regionTraitId) return;
    const normalized = normalizeRegionTrait({
      id: planet.regionTraitId,
      name: planet.regionTraitName,
      summary: planet.regionTraitSummary
    }, planet.regionId);
    if (normalized) {
      traitMap.set(planet.regionId, normalized);
    }
  });

  regions.forEach(region => {
    if (region.id === 'core') {
      region.trait = {
        id: 'core_flux',
        name: gameState.mapMeta?.template?.name || inferredTemplate.name,
        summary: gameState.mapMeta?.template?.description || inferredTemplate.description,
        doctrine: '中央争夺',
        bonuses: {}
      };
      return;
    }
    region.trait = traitMap.get(region.id) || null;
  });

  planets.forEach(planet => {
    planet.nodeModifiers = {};
    planet.regionModifiers = {};
    applyStrategicMetadataToPlanet(planet, traitMap.get(planet.regionId) || null, {
      applyProduction: false,
      applyDefense: false
    });
  });

  const hasTopology = Array.isArray(gameState.mapMeta?.lanes) && gameState.mapMeta.lanes.length > 0;
  if (hasTopology) {
    gameState.mapMeta = {
      ...gameState.mapMeta,
      size: { width: MAP_WIDTH, height: MAP_HEIGHT },
      template: {
        id: gameState.mapMeta?.template?.id || inferredTemplate.id,
        name: gameState.mapMeta?.template?.name || inferredTemplate.name,
        description: gameState.mapMeta?.template?.description || inferredTemplate.description,
        laneVariant: gameState.mapMeta?.template?.laneVariant || getTemplateLaneVariantMeta(inferredTemplate)
      },
      regions,
      rules: {
        laneTiers: LANE_TIER_RULES,
        offLane: DEEP_SPACE_RULES
      }
    };
    return gameState;
  }

  gameState.mapMeta = {
    ...buildFallbackMapMeta(planets),
    template: {
      id: inferredTemplate.id,
      name: inferredTemplate.name,
      description: inferredTemplate.description,
      laneVariant: getTemplateLaneVariantMeta(inferredTemplate)
    },
    regions,
    rules: {
      laneTiers: LANE_TIER_RULES,
      offLane: DEEP_SPACE_RULES
    }
  };
  return gameState;
}

export default MapGenerator;

export async function initializeMap(gameState) {
  const generator = new MapGenerator();
  const { planets, aiStates, mapMeta } = generator.generateMap();

  gameState.planets = planets;
  gameState.aiStates = aiStates;
  gameState.fleets = [];
  gameState.battles = [];
  gameState.worldEvents = [];
  gameState.mapMeta = mapMeta;
  ensureMapTopology(gameState);

  const intelligenceSystem = new IntelligenceSystem(gameState);
  intelligenceSystem.initialize();

  return gameState;
}
