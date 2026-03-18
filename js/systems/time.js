// ─── Time System ──────────────────────────────────────────
// Game clock. Drives day/night cycle, scheduling, weekly ticks.
// 1 real second = 1 game minute. 1 real day cycle = ~5 min.

class TimeSystem {
  constructor() {
    this.day = 1;
    this.hour = 22;        // Start at 10 PM
    this.minute = 0;
    this.tickRate = 1000;  // ms per game minute
    this.paused = false;
    this.lastTick = 0;
    this.totalMinutes = 0;
    this.weekDay = 0;      // 0-6
    this.DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  }

  update(timestamp) {
    if (this.paused) return;
    if (!this.lastTick) { this.lastTick = timestamp; return; }

    const elapsed = timestamp - this.lastTick;
    if (elapsed >= this.tickRate) {
      const ticks = Math.floor(elapsed / this.tickRate);
      this.lastTick = timestamp;
      this.advance(ticks);
    }
  }

  advance(minutes) {
    const oldHour = this.hour;
    const oldDay = this.day;
    this.totalMinutes += minutes;
    this.minute += minutes;

    while (this.minute >= 60) {
      this.minute -= 60;
      this.hour++;

      if (this.hour !== oldHour) {
        Events.emit('hour_changed', { hour: this.hour % 24, day: this.day });
      }

      if (this.hour >= 24) {
        this.hour -= 24;
        this.day++;
        this.weekDay = (this.weekDay + 1) % 7;

        Events.emit('day_changed', { day: this.day, weekDay: this.DAYS[this.weekDay] });

        if (this.day % 7 === 0) {
          Events.emit('weekly_tick', { week: Math.floor(this.day / 7) });
        }
      }
    }

    Events.emit('time_updated', {
      day: this.day, hour: this.hour, minute: this.minute,
      period: this.getPeriod(), weekDay: this.DAYS[this.weekDay]
    });
  }

  getPeriod() {
    if (this.hour >= 6 && this.hour < 12) return 'morning';
    if (this.hour >= 12 && this.hour < 18) return 'afternoon';
    if (this.hour >= 18 && this.hour < 24) return 'night';
    return 'late_night';
  }

  isNight() {
    return this.hour >= 18 || this.hour < 6;
  }

  getTimeString() {
    const h = this.hour % 12 || 12;
    const ampm = this.hour < 12 ? 'AM' : 'PM';
    const m = String(this.minute).padStart(2, '0');
    return `${h}:${m} ${ampm}`;
  }

  getDateString() {
    return `Day ${this.day} (${this.DAYS[this.weekDay]})`;
  }

  // Skip to a specific hour (for resting)
  skipTo(targetHour) {
    let hoursToSkip = targetHour - this.hour;
    if (hoursToSkip <= 0) hoursToSkip += 24;
    this.advance(hoursToSkip * 60);
    Events.emit('log', { text: `Skipped to ${this.getTimeString()}.`, type: 'info' });
  }

  pause() { this.paused = true; }
  resume() { this.paused = false; this.lastTick = 0; }

  setSpeed(multiplier) {
    // 1 = normal (1 sec per game minute), 2 = fast, 0.5 = slow
    this.tickRate = 1000 / multiplier;
  }
}

window.TimeSystem = TimeSystem;
