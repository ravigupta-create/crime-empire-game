// ─── Random Outcome Generator ─────────────────────────────
// Central RNG used by all systems. Provides seeded randomness,
// skill checks, weighted picks, and chance rolls.

class RandomGen {
  constructor() {
    this.seed = Date.now();
  }

  // Random float 0-1
  random() {
    return Math.random();
  }

  // Random integer between min and max (inclusive)
  int(min, max) {
    return Math.floor(this.random() * (max - min + 1)) + min;
  }

  // Returns true with given percent chance (0-100)
  chance(percent) {
    return this.random() * 100 < percent;
  }

  // Pick a random element from an array
  pick(arr) {
    if (arr.length === 0) return null;
    return arr[Math.floor(this.random() * arr.length)];
  }

  // Weighted random pick: { option: weight, ... }
  weightedPick(weights) {
    const entries = Object.entries(weights).filter(([, w]) => w > 0);
    const total = entries.reduce((sum, [, w]) => sum + w, 0);
    let roll = this.random() * total;
    for (const [option, weight] of entries) {
      roll -= weight;
      if (roll <= 0) return option;
    }
    return entries[entries.length - 1][0];
  }

  // Skill check: player skill vs difficulty
  // Returns { success, chance, roll, margin, critSuccess, critFail }
  skillCheck(skillLevel, difficulty) {
    const baseChance = 40 + (skillLevel * 8) - (difficulty * 0.4);
    const chance = Math.max(10, Math.min(95, baseChance));
    const roll = this.random() * 100;
    const success = roll < chance;
    const margin = chance - roll;
    return {
      success,
      chance: Math.round(chance),
      roll: Math.round(roll),
      margin: Math.round(margin),
      critSuccess: roll < 5,      // Natural crit (always 5% chance)
      critFail: roll > 95          // Natural fumble (always 5% chance)
    };
  }

  // Roll with modifier: base% + modifier
  modifiedChance(basePercent, modifier) {
    const final = Math.max(5, Math.min(95, basePercent + modifier));
    return this.chance(final);
  }
}

window.RNG = new RandomGen();
