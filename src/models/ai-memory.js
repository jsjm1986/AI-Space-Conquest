class AIMemory {
  constructor(aiId) {
    this.aiId = aiId;
    this.shortTerm = [];
    this.midTerm = [];
    this.longTerm = {
      enemyPatterns: {},
      successfulStrategies: [],
      failedStrategies: []
    };
  }

  addShortTerm(event) {
    this.shortTerm.push({ ...event, time: Date.now() });
    if (this.shortTerm.length > 100) {
      this.shortTerm.shift();
    }
  }

  addMidTerm(event) {
    this.midTerm.push({ ...event, time: Date.now() });
    if (this.midTerm.length > 50) {
      this.midTerm.shift();
    }
  }

  updateLongTerm(key, value) {
    if (key === 'enemyPattern') {
      this.longTerm.enemyPatterns[value.aiId] = value.pattern;
    } else if (key === 'strategy') {
      if (value.success) {
        this.longTerm.successfulStrategies.push(value.strategy);
      } else {
        this.longTerm.failedStrategies.push(value.strategy);
      }
    }
  }

  getRecentShortTerm(minutes = 60) {
    const cutoff = Date.now() - minutes * 60000;
    return this.shortTerm.filter(e => e.time > cutoff);
  }

  getRecentMidTerm(hours = 6) {
    const cutoff = Date.now() - hours * 3600000;
    return this.midTerm.filter(e => e.time > cutoff);
  }
}

export default AIMemory;
