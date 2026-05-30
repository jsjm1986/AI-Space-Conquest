export const GAME_CONFIG = {
  MAP_SIZE: {
    width: Number(process.env.MAP_WIDTH || 2200),
    height: Number(process.env.MAP_HEIGHT || 2200)
  },
  PLANET_COUNT: Number(process.env.PLANET_COUNT || 84),
  TICK_RATE: Number(process.env.TICK_RATE || 1000), // 1秒

  AI_COUNT: 7,
  STRATEGY_INTERVAL: Number(process.env.STRATEGY_INTERVAL || 900000), // 15分钟
  TACTICAL_INTERVAL: Number(process.env.TACTICAL_INTERVAL || 300000), // 5分钟
  SAVE_INTERVAL: Number(process.env.SAVE_INTERVAL || 300000), // 5分钟
  HOST: process.env.HOST || '0.0.0.0',
  PORT: Number(process.env.PORT || 3000),

  INITIAL_RESOURCES: {
    metal: 5000,
    energy: 2500,
    population: 200
  }
};

export const SHIPS = {
  scout: { cost: { metal: 100, energy: 50 }, buildTime: 360, attack: 5, defense: 10, speed: 10, capacity: 1, maintenance: 0.1 },
  frigate: { cost: { metal: 300, energy: 150 }, buildTime: 1080, attack: 20, defense: 30, speed: 5, capacity: 3, maintenance: 0.3 },
  cruiser: { cost: { metal: 800, energy: 400 }, buildTime: 3240, attack: 60, defense: 80, speed: 3, capacity: 8, maintenance: 0.8 },
  battleship: { cost: { metal: 2000, energy: 1000 }, buildTime: 8640, attack: 150, defense: 200, speed: 2, capacity: 20, maintenance: 2.0 }
};

export const BUILDINGS = {
  mine: { cost: { metal: 500, energy: 200 }, buildTime: 2160, effect: 0.2 },
  powerPlant: { cost: { metal: 400, energy: 300 }, buildTime: 2160, effect: 0.2 },
  shipyard: { cost: { metal: 800, energy: 400 }, buildTime: 4320, effect: 0.5 },
  defense: { cost: { metal: 600, energy: 500 }, buildTime: 3240, effect: 100 },
  lab: { cost: { metal: 1000, energy: 800 }, buildTime: 8640, effect: 0.3 }
};
