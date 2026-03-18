// ─── Player Data Model ────────────────────────────────────

class Player {
  constructor() {
    this.cash = { dirty: 0, clean: 0, stashed: 0 };
    this.heat = 0;
    this.reputation = 0;
    this.repTier = 1;
    this.hp = 5;
    this.maxHp = 5;
    this.skills = {
      intimidation: 0,
      persuasion: 0,
      streetSmarts: 0,
      operations: 0,
      leadership: 0
    };
    this.skillPoints = 0;
    this.inventory = [];
    this.crewSlots = 1;
    this.activeCrew = [];
    this.safeHouses = [];
    this.fronts = [];
    this.rackets = [];
    this.contacts = [];
    this.arrestRecord = 0;
    this.position = { x: 0, y: 0 };
    this.currentBlock = 'row_a';
    this.currentDistrict = 'the_row';
  }

  get totalCash() {
    return this.cash.dirty + this.cash.clean;
  }

  get carriedCash() {
    return this.cash.dirty + this.cash.clean;
  }

  addDirty(amount) {
    this.cash.dirty += amount;
    Events.emit('money_changed', { dirty: amount, total: this.totalCash });
  }

  addClean(amount) {
    this.cash.clean += amount;
    Events.emit('money_changed', { clean: amount, total: this.totalCash });
  }

  spendCash(amount) {
    // Spend clean first, then dirty
    if (this.cash.clean >= amount) {
      this.cash.clean -= amount;
      return { spent: amount, wasDirty: false };
    }
    const fromClean = this.cash.clean;
    const fromDirty = amount - fromClean;
    this.cash.clean = 0;
    this.cash.dirty -= fromDirty;

    // Dirty spending over $500 generates heat
    if (fromDirty > 500) {
      const heatGain = Math.floor(fromDirty / 1000) + 1;
      Events.emit('heat_change', { amount: heatGain, source: 'dirty_spending' });
    }

    Events.emit('money_changed', { spent: amount, total: this.totalCash });
    return { spent: amount, wasDirty: fromDirty > 0 };
  }

  canAfford(amount) {
    return this.totalCash >= amount;
  }

  hasCrewSlot() {
    return this.activeCrew.length < this.crewSlots;
  }

  addCrewMember(npc) {
    if (!this.hasCrewSlot()) return false;
    this.activeCrew.push(npc);
    Events.emit('crew_changed', { added: npc, total: this.activeCrew.length });
    return true;
  }

  removeCrewMember(npcId) {
    const idx = this.activeCrew.findIndex(c => c.id === npcId);
    if (idx === -1) return null;
    const removed = this.activeCrew.splice(idx, 1)[0];
    Events.emit('crew_changed', { removed, total: this.activeCrew.length });
    return removed;
  }

  takeDamage(amount) {
    this.hp = Math.max(0, this.hp - amount);
    Events.emit('player_hp_changed', { hp: this.hp, maxHp: this.maxHp });
    if (this.hp <= 0) Events.emit('player_dead', {});
  }

  heal(amount) {
    this.hp = Math.min(this.maxHp, this.hp + amount);
    Events.emit('player_hp_changed', { hp: this.hp, maxHp: this.maxHp });
  }
}

window.Player = Player;
