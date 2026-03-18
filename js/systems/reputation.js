// ─── Reputation System ────────────────────────────────────
// Tracks player reputation and tier progression. Unlocks
// content, manages crew slots, grants skill points.

class ReputationSystem {
  constructor() {
    this.TIERS = [
      { tier: 1, title: 'Street Rat',  min: 0,     crewSlots: 1,  unlocks: ['theft', 'small_deal'] },
      { tier: 2, title: 'Hustler',     min: 100,   crewSlots: 2,  unlocks: ['shakedown', 'fencing', 'safe_house'] },
      { tier: 3, title: 'Enforcer',    min: 500,   crewSlots: 3,  unlocks: ['heist', 'bribery', 'forger'] },
      { tier: 4, title: 'Lieutenant',  min: 1500,  crewSlots: 5,  unlocks: ['territory_control', 'fronts', 'smuggling'] },
      { tier: 5, title: 'Underboss',   min: 5000,  crewSlots: 8,  unlocks: ['rival_takeover', 'corrupt_officials'] },
      { tier: 6, title: 'Crime Lord',  min: 15000, crewSlots: 12, unlocks: ['multi_district', 'political'] },
      { tier: 7, title: 'Kingpin',     min: 50000, crewSlots: 20, unlocks: ['endgame_ops', 'untouchable'] }
    ];
    this.init();
  }

  init() {
    Events.on('rep_change', (data) => this.changeRep(data));
  }

  changeRep(data) {
    const player = GameState.player;
    const oldTier = this.getTier(player.reputation);
    player.reputation = Math.max(0, player.reputation + data.amount);
    const newTier = this.getTier(player.reputation);
    player.repTier = newTier.tier;

    if (newTier.tier > oldTier.tier) {
      // Tier up!
      player.crewSlots = newTier.crewSlots;
      if (newTier.tier % 2 === 0) {
        player.skillPoints += 1;
        Events.emit('log', { text: `Skill point earned! You now have ${player.skillPoints} unspent.`, type: 'reward' });
      }
      Events.emit('tier_up', { oldTier, newTier });
      Events.emit('log', {
        text: `TIER UP! You are now a ${newTier.title} (Tier ${newTier.tier}). Crew slots: ${newTier.crewSlots}.`,
        type: 'reward'
      });
      // Rivals react
      Events.emit('rival_hostility_increase', { amount: 10 });
    }

    if (newTier.tier < oldTier.tier) {
      player.crewSlots = newTier.crewSlots;
      // Remove excess crew
      while (player.activeCrew.length > player.crewSlots) {
        const removed = player.activeCrew.pop();
        removed.worksFor = 'independent';
        Events.emit('log', { text: `${removed.name} left — you can no longer support them.`, type: 'danger' });
      }
      Events.emit('log', {
        text: `Rep dropped. You are now a ${newTier.title} (Tier ${newTier.tier}).`,
        type: 'danger'
      });
    }

    Events.emit('rep_updated', { rep: player.reputation, tier: newTier.tier, title: newTier.title });
  }

  getTier(rep) {
    let result = this.TIERS[0];
    for (const t of this.TIERS) {
      if (rep >= t.min) result = t;
    }
    return result;
  }

  isUnlocked(action) {
    const player = GameState.player;
    const tier = this.getTier(player.reputation);
    for (let i = 0; i <= this.TIERS.indexOf(tier); i++) {
      if (this.TIERS[i].unlocks.includes(action)) return true;
    }
    return false;
  }

  getRequiredTierFor(action) {
    for (const t of this.TIERS) {
      if (t.unlocks.includes(action)) return t;
    }
    return null;
  }
}

window.ReputationSystem = ReputationSystem;
