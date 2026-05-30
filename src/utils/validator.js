class Validator {
  static isValidPosition(pos) {
    return pos && typeof pos.x === 'number' && typeof pos.y === 'number';
  }

  static isValidResource(resources) {
    return resources &&
           typeof resources.metal === 'number' &&
           typeof resources.energy === 'number' &&
           resources.metal >= 0 &&
           resources.energy >= 0;
  }

  static hasEnoughResources(current, required) {
    return current.metal >= required.metal &&
           current.energy >= required.energy;
  }

  static isValidAIId(aiId) {
    return /^ai_[1-7]$/.test(aiId);
  }

  static isValidPlanetId(planetId) {
    return typeof planetId === 'string' && planetId.startsWith('planet_');
  }

  static isValidFleetId(fleetId) {
    return typeof fleetId === 'string' && fleetId.startsWith('fleet_');
  }
}

export default Validator;
