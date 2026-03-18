// ─── Heat System ──────────────────────────────────────────
// Tracks law enforcement attention. Drives cop behavior,
// investigation triggers, and raid timing.

class HeatSystem {
  constructor() {
    this.TIERS = [
      { name: 'cold',    min: 0,  label: 'Cold',    color: '#4a9eff' },
      { name: 'warm',    min: 20, label: 'Warm',    color: '#ffa500' },
      { name: 'hot',     min: 40, label: 'Hot',     color: '#ff6347' },
      { name: 'blazing', min: 60, label: 'Blazing', color: '#ff1a1a' },
      { name: 'inferno', min: 80, label: 'Inferno', color: '#8b0000' }
    ];
    this.init();
  }

  init() {
    Events.on('heat_change', (data) => this.changeHeat(data));
    Events.on('day_changed', () => this.dailyDecay());
  }

  changeHeat(data) {
    const player = GameState.player;
    const oldTier = this.getTier(player.heat);
    player.heat = Math.max(0, Math.min(100, player.heat + data.amount));
    const newTier = this.getTier(player.heat);

    // Tier transition effects
    if (newTier.name !== oldTier.name) {
      Events.emit('heat_tier_change', {
        oldTier: oldTier.name,
        newTier: newTier.name,
        heat: player.heat
      });
      this.onTierChange(oldTier, newTier, player);
    }

    Events.emit('heat_updated', { heat: player.heat, tier: newTier.name, source: data.source });
  }

  onTierChange(oldTier, newTier, player) {
    const tierIndex = this.TIERS.findIndex(t => t.name === newTier.name);

    if (newTier.name === 'warm') {
      Events.emit('log', { text: 'Cops are starting to notice you. Patrols are increasing.', type: 'warning' });
    }
    if (newTier.name === 'hot') {
      Events.emit('log', { text: 'Detectives are investigating. Watch your back.', type: 'danger' });
    }
    if (newTier.name === 'blazing') {
      Events.emit('log', { text: 'Raids imminent! Undercover cops are everywhere.', type: 'danger' });
      // Pressure crew loyalty
      for (const crew of player.activeCrew) {
        if (crew.loyalty < 50) {
          crew.loyalty -= 5;
          Events.emit('log', { text: `${crew.name} is getting nervous about the heat.`, type: 'warning' });
        }
      }
    }
    if (newTier.name === 'inferno') {
      Events.emit('log', { text: 'FED TASK FORCE DEPLOYED. You are wanted on sight!', type: 'danger' });
      // Heavy crew pressure
      for (const crew of player.activeCrew) {
        if (crew.loyalty < 50) {
          crew.loyalty -= 15;
        }
      }
    }
    if (oldTier.name !== 'cold' && newTier.name === 'cold') {
      Events.emit('log', { text: 'Heat has cooled down. You can operate freely.', type: 'success' });
    }
  }

  dailyDecay() {
    const player = GameState.player;
    if (player.heat > 0) {
      const decay = player.heat >= 80 ? 1 : player.heat >= 40 ? 2 : 3;
      Events.emit('heat_change', { amount: -decay, source: 'daily_decay' });
    }
  }

  getTier(heat) {
    let tier = this.TIERS[0];
    for (const t of this.TIERS) {
      if (heat >= t.min) tier = t;
    }
    return tier;
  }

  // Chance of police encounter during an action
  getPoliceChance(baseChance) {
    const player = GameState.player;
    const block = BLOCKS[player.currentBlock];
    let chance = baseChance + (player.heat * 0.3);
    chance += block.copPresence * 0.2;
    return Math.min(chance, 95);
  }

  // Sting chance for deals
  getStingChance() {
    const player = GameState.player;
    let chance = 5 + (player.heat * 0.5);
    // Street Smarts reduces sting chance
    chance -= player.skills.streetSmarts * 3;
    return Math.max(2, Math.min(chance, 50));
  }

  getCopBehavior() {
    const heat = GameState.player.heat;
    if (heat < 20) return { patrols: 'none', response: 'ignore', stingMod: 0 };
    if (heat < 40) return { patrols: 'occasional', response: 'investigate', stingMod: 5 };
    if (heat < 60) return { patrols: 'frequent', response: 'suspicious', stingMod: 15 };
    if (heat < 80) return { patrols: 'heavy', response: 'search', stingMod: 30 };
    return { patrols: 'lockdown', response: 'arrest_on_sight', stingMod: 45 };
  }
}

window.HeatSystem = HeatSystem;
