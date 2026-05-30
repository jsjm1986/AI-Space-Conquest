import AIState from './ai-state.js';

class GameState {
  constructor(gameId) {
    this.gameId = gameId;
    this.status = 'running';
    this.startTime = Date.now();
    this.currentTick = 0;
    this.planets = [];
    this.fleets = [];
    this.aiStates = [];
    this.battles = [];
    this.worldEvents = [];
    this.starMap = [];
    this.mapMeta = null;
    this.diplomacyProposals = [];
    this.winner = null;
    this.endTime = null;
    this.rankings = [];
    this.betResults = [];
  }

  toJSON() {
    return {
      gameId: this.gameId,
      status: this.status,
      startTime: this.startTime,
      currentTick: this.currentTick,
      planets: this.planets,
      fleets: this.fleets,
      aiStates: this.aiStates,
      battles: this.battles,
      worldEvents: this.worldEvents,
      starMap: this.starMap,
      mapMeta: this.mapMeta,
      diplomacyProposals: this.diplomacyProposals,
      winner: this.winner,
      endTime: this.endTime,
      rankings: this.rankings,
      betResults: this.betResults
    };
  }

  static fromJSON(data) {
    const state = new GameState(data.gameId);
    state.status = data.status;
    state.startTime = data.startTime;
    state.currentTick = data.currentTick;
    state.planets = data.planets || [];
    state.fleets = data.fleets || [];
    state.aiStates = Array.isArray(data.aiStates) ? data.aiStates.map(ai => AIState.fromJSON(ai)) : [];
    state.battles = data.battles || [];
    state.worldEvents = data.worldEvents || [];
    state.starMap = data.starMap || [];
    state.mapMeta = data.mapMeta || null;
    state.diplomacyProposals = data.diplomacyProposals || [];
    state.winner = data.winner || null;
    state.endTime = data.endTime || null;
    state.rankings = data.rankings || [];
    state.betResults = data.betResults || [];
    return state;
  }
}

export default GameState;
