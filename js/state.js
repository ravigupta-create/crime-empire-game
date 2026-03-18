// ─── Central Game State ───────────────────────────────────
// Single source of truth. All systems read/write through here.

const GameState = {
  player: null,
  npcs: {},          // id → NPC
  time: null,        // TimeSystem instance

  // System references (set during init)
  heatSystem: null,
  repSystem: null,
  economySystem: null,
  npcSystem: null,
  territorySystem: null,
  interactionSystem: null,
  jobSystem: null,

  // UI state
  selectedNpc: null,
  gameLog: [],
  isInitialized: false,

  init() {
    // Create player
    this.player = new Player();

    // Create time system
    this.time = new TimeSystem();

    // Spawn named NPCs from templates
    for (const [key, template] of Object.entries(NPC_TEMPLATES)) {
      if (key === 'civilian_generic') continue;
      this.npcs[template.id || key] = new NPC(template);
    }

    // Spawn some random civilians per block
    const startingBlocks = ['row_a', 'row_b', 'row_c', 'row_d'];
    for (const blockId of startingBlocks) {
      for (let i = 0; i < 3; i++) {
        const civ = spawnCivilian(blockId);
        this.npcs[civ.id] = civ;
      }
    }

    // Initialize systems
    this.heatSystem = new HeatSystem();
    this.repSystem = new ReputationSystem();
    this.economySystem = new EconomySystem();
    this.npcSystem = new NPCSystem();
    this.territorySystem = new TerritorySystem();
    this.interactionSystem = new InteractionSystem();
    this.jobSystem = new JobSystem();

    // Add Marcus as starting contact
    this.player.contacts.push('marcus_fence');

    // Generate initial jobs
    this.jobSystem.generateDailyJobs();

    this.isInitialized = true;

    // Log listener
    Events.on('log', (data) => {
      this.gameLog.push({ text: data.text, type: data.type || 'info', time: this.time.getTimeString() });
      if (this.gameLog.length > 100) this.gameLog.shift();
    });

    Events.emit('log', { text: 'You step out onto the rain-slicked streets of The Row. No crew. No cash. No rep. Time to change that.', type: 'story' });
  },

  // Get NPCs in current block
  getNPCsHere() {
    return Object.values(this.npcs).filter(
      n => n.currentBlock === this.player.currentBlock && n.isAlive
    );
  },

  // Get named (non-generic) NPCs in current block
  getInteractableNPCs() {
    return this.getNPCsHere().filter(n => {
      // Show named NPCs (not generic civilians unless they're witnesses)
      return n.name !== 'Civilian' || n.isWitness;
    });
  },

  // Move to a different block
  moveToBlock(blockId) {
    if (!BLOCKS[blockId]) return;
    this.player.currentBlock = blockId;
    this.player.currentDistrict = BLOCKS[blockId].districtId;
    Events.emit('log', { text: `Moved to ${BLOCKS[blockId].name}.`, type: 'info' });
    Events.emit('location_changed', { block: blockId, district: BLOCKS[blockId].districtId });
  },

  // Save to localStorage
  save(slot = 0) {
    const data = {
      player: this.player,
      npcs: this.npcs,
      time: { day: this.time.day, hour: this.time.hour, minute: this.time.minute, weekDay: this.time.weekDay },
      rivals: this.territorySystem.rivals,
      blocks: {},
      jobs: { available: this.jobSystem.availableJobs, completed: this.jobSystem.completedJobs }
    };
    for (const [id, block] of Object.entries(BLOCKS)) {
      data.blocks[id] = { control: block.control, crewStationed: block.crewStationed.map(c => c.id) };
    }
    localStorage.setItem('crimeEmpire_save_' + slot, JSON.stringify(data));
    Events.emit('log', { text: 'Game saved.', type: 'info' });
  },

  load(slot = 0) {
    const raw = localStorage.getItem('crimeEmpire_save_' + slot);
    if (!raw) return false;
    // Loading would reconstruct state — simplified for now
    Events.emit('log', { text: 'Load system ready (save exists).', type: 'info' });
    return true;
  }
};

window.GameState = GameState;
