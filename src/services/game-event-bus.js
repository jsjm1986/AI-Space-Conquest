import { EventEmitter } from 'events';

class GameEventBus extends EventEmitter {
  createWorldEvent(gameState, type, data = {}, overrides = {}) {
    return {
      id: overrides.id || `event_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
      type,
      tick: overrides.tick ?? gameState?.currentTick ?? 0,
      timestamp: overrides.timestamp ?? Date.now(),
      data,
      ...overrides
    };
  }

  appendWorldEvent(gameState, event) {
    if (!gameState) return event;

    gameState.worldEvents = Array.isArray(gameState.worldEvents) ? gameState.worldEvents : [];
    const existingIndex = gameState.worldEvents.findIndex(item => item.id === event.id);

    if (existingIndex >= 0) {
      gameState.worldEvents[existingIndex] = event;
    } else {
      gameState.worldEvents.push(event);
    }

    if (gameState.worldEvents.length > 500) {
      gameState.worldEvents = gameState.worldEvents.slice(-500);
    }

    return event;
  }

  recordWorldEvent(gameState, type, data = {}, overrides = {}) {
    const event = this.createWorldEvent(gameState, type, data, overrides);
    this.appendWorldEvent(gameState, event);
    this.emit('world_event', event);
    return event;
  }

  emitWorldEvent(event) {
    const payload = {
      id: event.id || `event_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
      timestamp: Date.now(),
      ...event
    };
    this.emit('world_event', payload);
    return payload;
  }

  onWorldEvent(listener) {
    this.on('world_event', listener);
    return () => this.off('world_event', listener);
  }
}

export default new GameEventBus();
