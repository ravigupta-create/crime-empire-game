// ─── District & Block Data Models ─────────────────────────

class Block {
  constructor(config) {
    this.id = config.id;
    this.name = config.name;
    this.districtId = config.districtId;
    this.control = {
      player: config.playerControl ?? 0,
      kostarov: config.kostarovControl ?? 0,
      dragos: config.dragosControl ?? 0,
      vega: config.vegaControl ?? 0,
      neutral: 100
    };
    this.recalcNeutral();
    this.crewStationed = [];
    this.population = config.population ?? 50;    // Affects witness chance
    this.copPresence = config.copPresence ?? 10;
    this.weeklyIncome = 0;
  }

  recalcNeutral() {
    const claimed = this.control.player +
      this.control.kostarov +
      this.control.dragos +
      this.control.vega;
    this.control.neutral = Math.max(0, 100 - claimed);
  }

  get isDefended() {
    return this.crewStationed.length > 0;
  }

  get controllerName() {
    let max = 0, who = 'neutral';
    for (const [faction, val] of Object.entries(this.control)) {
      if (faction !== 'neutral' && val > max) { max = val; who = faction; }
    }
    return max >= 50 ? who : 'contested';
  }
}

class District {
  constructor(config) {
    this.id = config.id;
    this.name = config.name;
    this.description = config.description;
    this.blocks = config.blocks;      // Block IDs
    this.vibe = config.vibe;
  }
}

// ─── World Map Data ───────────────────────────────────────

const DISTRICTS = {
  the_row: new District({
    id: 'the_row',
    name: 'The Row',
    description: 'Slums. Street-level crime. Where you start.',
    blocks: ['row_a', 'row_b', 'row_c', 'row_d'],
    vibe: 'slums'
  }),
  the_docks: new District({
    id: 'the_docks',
    name: 'The Docks',
    description: 'Industrial smuggling hub. Warehouses and shipping containers.',
    blocks: ['docks_a', 'docks_b', 'docks_c', 'docks_d'],
    vibe: 'industrial'
  }),
  midtown: new District({
    id: 'midtown',
    name: 'Midtown',
    description: 'Commercial district. Corporate fronts and white-collar crime.',
    blocks: ['midtown_a', 'midtown_b', 'midtown_c', 'midtown_d'],
    vibe: 'commercial'
  }),
  old_quarter: new District({
    id: 'old_quarter',
    name: 'Old Quarter',
    description: 'Historic district. Black markets and hidden tunnels.',
    blocks: ['oldquarter_a', 'oldquarter_b', 'oldquarter_c', 'oldquarter_d'],
    vibe: 'historic'
  }),
  uptown: new District({
    id: 'uptown',
    name: 'Uptown',
    description: 'Wealthy residential. High-risk, high-reward targets.',
    blocks: ['uptown_a', 'uptown_b', 'uptown_c', 'uptown_d'],
    vibe: 'wealthy'
  }),
  the_strip: new District({
    id: 'the_strip',
    name: 'The Strip',
    description: 'Nightlife and entertainment. Gambling dens and nightclubs.',
    blocks: ['strip_a', 'strip_b', 'strip_c', 'strip_d'],
    vibe: 'nightlife'
  })
};

const BLOCKS = {
  // The Row
  row_a: new Block({ id: 'row_a', name: 'The Row - Block A', districtId: 'the_row', population: 40, copPresence: 10 }),
  row_b: new Block({ id: 'row_b', name: 'The Row - Block B', districtId: 'the_row', population: 55, copPresence: 20 }),
  row_c: new Block({ id: 'row_c', name: 'The Row - Block C', districtId: 'the_row', population: 45, copPresence: 15 }),
  row_d: new Block({ id: 'row_d', name: 'The Row - Block D', districtId: 'the_row', population: 35, copPresence: 10 }),
  // The Docks
  docks_a: new Block({ id: 'docks_a', name: 'The Docks - Block A', districtId: 'the_docks', population: 20, copPresence: 5 }),
  docks_b: new Block({ id: 'docks_b', name: 'The Docks - Block B', districtId: 'the_docks', population: 25, copPresence: 10 }),
  docks_c: new Block({ id: 'docks_c', name: 'The Docks - Block C', districtId: 'the_docks', population: 15, copPresence: 5 }),
  docks_d: new Block({ id: 'docks_d', name: 'The Docks - Block D', districtId: 'the_docks', population: 30, copPresence: 15 }),
  // Midtown
  midtown_a: new Block({ id: 'midtown_a', name: 'Midtown - Block A', districtId: 'midtown', population: 70, copPresence: 40, dragosControl: 40 }),
  midtown_b: new Block({ id: 'midtown_b', name: 'Midtown - Block B', districtId: 'midtown', population: 65, copPresence: 35, dragosControl: 35 }),
  midtown_c: new Block({ id: 'midtown_c', name: 'Midtown - Block C', districtId: 'midtown', population: 60, copPresence: 30 }),
  midtown_d: new Block({ id: 'midtown_d', name: 'Midtown - Block D', districtId: 'midtown', population: 75, copPresence: 45, dragosControl: 50 }),
  // Old Quarter
  oldquarter_a: new Block({ id: 'oldquarter_a', name: 'Old Quarter - Block A', districtId: 'old_quarter', population: 35, copPresence: 10, kostarovControl: 60 }),
  oldquarter_b: new Block({ id: 'oldquarter_b', name: 'Old Quarter - Block B', districtId: 'old_quarter', population: 40, copPresence: 15, kostarovControl: 50 }),
  oldquarter_c: new Block({ id: 'oldquarter_c', name: 'Old Quarter - Block C', districtId: 'old_quarter', population: 30, copPresence: 10, kostarovControl: 45 }),
  oldquarter_d: new Block({ id: 'oldquarter_d', name: 'Old Quarter - Block D', districtId: 'old_quarter', population: 45, copPresence: 20, kostarovControl: 55 }),
  // Uptown
  uptown_a: new Block({ id: 'uptown_a', name: 'Uptown - Block A', districtId: 'uptown', population: 50, copPresence: 50 }),
  uptown_b: new Block({ id: 'uptown_b', name: 'Uptown - Block B', districtId: 'uptown', population: 55, copPresence: 45 }),
  uptown_c: new Block({ id: 'uptown_c', name: 'Uptown - Block C', districtId: 'uptown', population: 45, copPresence: 40 }),
  uptown_d: new Block({ id: 'uptown_d', name: 'Uptown - Block D', districtId: 'uptown', population: 60, copPresence: 55 }),
  // The Strip
  strip_a: new Block({ id: 'strip_a', name: 'The Strip - Block A', districtId: 'the_strip', population: 60, copPresence: 25, vegaControl: 45 }),
  strip_b: new Block({ id: 'strip_b', name: 'The Strip - Block B', districtId: 'the_strip', population: 70, copPresence: 30, vegaControl: 55 }),
  strip_c: new Block({ id: 'strip_c', name: 'The Strip - Block C', districtId: 'the_strip', population: 55, copPresence: 20, vegaControl: 40 }),
  strip_d: new Block({ id: 'strip_d', name: 'The Strip - Block D', districtId: 'the_strip', population: 65, copPresence: 35, vegaControl: 50 })
};

window.Block = Block;
window.District = District;
window.DISTRICTS = DISTRICTS;
window.BLOCKS = BLOCKS;
