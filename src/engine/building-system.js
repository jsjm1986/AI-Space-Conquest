const BUILDINGS = {
  mine: { cost: { metal: 500, energy: 200 }, buildTime: 2160 },
  powerPlant: { cost: { metal: 400, energy: 300 }, buildTime: 2160 },
  shipyard: { cost: { metal: 800, energy: 400 }, buildTime: 4320 },
  defense: { cost: { metal: 600, energy: 500 }, buildTime: 3240 },
  lab: { cost: { metal: 1000, energy: 800 }, buildTime: 8640 }
};

class BuildingSystem {
  constructor(resourceManager) {
    this.resourceManager = resourceManager;
  }

  startBuild(planet, buildingType, gameState) {
    if (planet.buildQueue.length > 0) return { success: false, reason: '建造队列已满' };

    const building = BUILDINGS[buildingType];
    if (!building) return { success: false, reason: '无效建筑类型' };

    const currentLevel = planet.buildings[buildingType] || 0;
    if (currentLevel >= 5) return { success: false, reason: '建筑已达最高等级' };

    const cost = {
      metal: building.cost.metal * (currentLevel + 1),
      energy: building.cost.energy * (currentLevel + 1)
    };

    if (!this.resourceManager.canAfford(planet, cost)) {
      return { success: false, reason: '资源不足' };
    }

    this.resourceManager.deductResources(planet, cost);

    const buildTime = building.buildTime * (currentLevel + 1);

    planet.buildQueue.push({
      type: buildingType,
      startTime: Date.now(),
      endTime: Date.now() + buildTime * 1000
    });

    return { success: true };
  }

  processBuildQueue(gameState) {
    const now = Date.now();

    gameState.planets.forEach(planet => {
      if (planet.buildQueue.length === 0) return;

      const current = planet.buildQueue[0];
      if (now >= current.endTime) {
        planet.buildings[current.type] = (planet.buildings[current.type] || 0) + 1;

        if (current.type === 'defense') {
          planet.defenseValue += 100;
        }

        planet.buildQueue.shift();
      }
    });
  }
}

export default BuildingSystem;
