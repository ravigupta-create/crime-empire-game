// ─── Event Bus ─────────────────────────────────────────────
// All systems communicate through events, never directly.
// This is the central nervous system of the game.

class EventBus {
  constructor() {
    this.listeners = {};
    this.history = [];       // Last 50 events for debugging
  }

  on(event, callback) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(callback);
  }

  off(event, callback) {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
  }

  emit(event, data = {}) {
    this.history.push({ event, data, time: Date.now() });
    if (this.history.length > 50) this.history.shift();

    if (this.listeners[event]) {
      for (const cb of this.listeners[event]) {
        cb(data);
      }
    }
  }
}

window.Events = new EventBus();
