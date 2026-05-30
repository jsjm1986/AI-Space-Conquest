class Planet {
  constructor(id, name, type, position) {
    this.id = id;
    this.name = name;
    this.type = type;
    this.position = position;
    this.owner = null;
    this.resources = { metal: 5000, energy: 2500, population: 200 };
    this.production = this.getBaseProduction();
    this.buildings = { mine: 1, powerPlant: 1, shipyard: 0, defense: 1, lab: 0 };
    this.defenseValue = 200;
    this.buildQueue = [];
    this.shipBuildQueue = [];
  }

  getBaseProduction() {
    const rates = {
      home: { metalPerSecond: 5, energyPerSecond: 3, populationPerSecond: 0.2 },
      resource: { metalPerSecond: 3, energyPerSecond: 2, populationPerSecond: 0.1 },
      normal: { metalPerSecond: 1, energyPerSecond: 1, populationPerSecond: 0.05 }
    };
    return rates[this.type] || rates.normal;
  }
}

export default Planet;
