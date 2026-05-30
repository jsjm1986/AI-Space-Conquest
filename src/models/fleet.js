class Fleet {
  constructor(id, owner, position) {
    this.id = id;
    this.owner = owner;
    this.position = position;
    this.destination = null;
    this.status = 'idle';
    this.ships = { scout: 0, frigate: 0, cruiser: 0, battleship: 0 };
    this.totalPower = 0;
    this.speed = 0;
    this.moveStartTime = null;
    this.moveEndTime = null;
    this.targetPlanet = null;
  }

  calculatePower() {
    this.totalPower =
      this.ships.scout * 5 +
      this.ships.frigate * 20 +
      this.ships.cruiser * 60 +
      this.ships.battleship * 150;
  }

  calculateSpeed() {
    const speeds = { scout: 10, frigate: 5, cruiser: 3, battleship: 2 };
    this.speed = Math.min(
      ...Object.entries(this.ships)
        .filter(([_, count]) => count > 0)
        .map(([type, _]) => speeds[type])
    ) || 0;
  }
}

export default Fleet;
