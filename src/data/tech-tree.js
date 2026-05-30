const COST_CURVE_STANDARD = [
  { metal: 1000, energy: 500, time: 3600 },
  { metal: 2000, energy: 1000, time: 7200 },
  { metal: 4000, energy: 2000, time: 14400 },
  { metal: 8000, energy: 4000, time: 28800 },
  { metal: 16000, energy: 8000, time: 57600 }
];

const COST_CURVE_ENERGY = [
  { metal: 900, energy: 700, time: 3600 },
  { metal: 1800, energy: 1400, time: 7200 },
  { metal: 3600, energy: 2800, time: 14400 },
  { metal: 7200, energy: 5600, time: 28800 },
  { metal: 14400, energy: 11200, time: 57600 }
];

const COST_CURVE_HEAVY = [
  { metal: 1200, energy: 600, time: 4200 },
  { metal: 2400, energy: 1200, time: 8400 },
  { metal: 4800, energy: 2400, time: 16800 },
  { metal: 9600, energy: 4800, time: 33600 },
  { metal: 19200, energy: 9600, time: 67200 }
];

const TECH_TREE = {
  weaponUpgrade: {
    name: '武器强化',
    branch: 'warfare',
    maxLevel: 5,
    effect: '舰队攻击力+10%/级',
    cost: COST_CURVE_STANDARD
  },
  shieldTech: {
    name: '护盾技术',
    branch: 'warfare',
    maxLevel: 5,
    effect: '舰队防御力+10%/级',
    cost: COST_CURVE_STANDARD
  },
  engineUpgrade: {
    name: '引擎升级',
    branch: 'mobility',
    maxLevel: 5,
    effect: '舰队航速+20%/级',
    cost: COST_CURVE_STANDARD
  },
  miningEfficiency: {
    name: '采矿效率',
    branch: 'economy',
    maxLevel: 5,
    effect: '金属产出+15%/级',
    cost: COST_CURVE_STANDARD
  },
  energyTech: {
    name: '能源技术',
    branch: 'economy',
    maxLevel: 5,
    effect: '能源产出+15%/级',
    cost: COST_CURVE_STANDARD
  },
  populationGrowth: {
    name: '人口增长',
    branch: 'economy',
    maxLevel: 5,
    effect: '人口容量+20%/级',
    cost: COST_CURVE_STANDARD
  },
  logisticsNetwork: {
    name: '后勤网络',
    branch: 'mobility',
    maxLevel: 5,
    effect: '维护成本降低、战备恢复加快、深空远征惩罚减轻',
    cost: COST_CURVE_ENERGY
  },
  siegeEngineering: {
    name: '攻城工程',
    branch: 'warfare',
    maxLevel: 5,
    effect: '攻打防御工事更强，占领稳定速度更快',
    cost: COST_CURVE_HEAVY
  },
  fortification: {
    name: '要塞化',
    branch: 'warfare',
    maxLevel: 5,
    effect: '星球防御与驻军韧性提升',
    cost: COST_CURVE_HEAVY
  },
  sensorNetwork: {
    name: '传感网络',
    branch: 'intel',
    maxLevel: 5,
    effect: '情报保鲜更久，边境传感能力增强',
    cost: COST_CURVE_ENERGY
  }
};

const DEFAULT_TECH = Object.keys(TECH_TREE).reduce((result, key) => {
  result[key] = 0;
  return result;
}, {});

export {
  TECH_TREE,
  DEFAULT_TECH
};
