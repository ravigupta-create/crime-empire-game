// ─── NPC Data Model & Templates ───────────────────────────

class NPC {
  constructor(config) {
    this.id = config.id || 'npc_' + Math.random().toString(36).substr(2, 6);
    this.name = config.name || 'Unknown';
    this.role = config.role || 'civilian';        // civilian, contact, crew, rival, cop
    this.subRole = config.subRole || '';           // fence, supplier, beat_cop, etc.
    this.loyalty = config.loyalty ?? 30;           // 0-100 toward player
    this.fear = config.fear ?? 0;                  // 0-100 of player
    this.trust = config.trust ?? 30;               // 0-100 business reliability
    this.nerve = config.nerve ?? 40;               // Resistance to intimidation
    this.suspicion = config.suspicion ?? 50;        // Resistance to persuasion
    this.hp = config.hp ?? 3;
    this.maxHp = config.maxHp ?? 3;
    this.isAlive = true;
    this.isWitness = false;
    this.witnessedCrime = null;
    this.currentBlock = config.currentBlock || 'row_a';
    this.homeDistrict = config.homeDistrict || 'the_row';
    this.dialogueState = 'idle';
    this.recruitCost = config.recruitCost ?? 100;  // Weekly salary
    this.specialty = config.specialty || null;      // muscle, tech, driver, negotiator
    this.betrayalTimer = 0;
    this.isSnitch = false;
    this.worksFor = config.worksFor || 'independent';
    this.requiredRep = config.requiredRep ?? 0;
    this.lastInteractionDay = 0;
    this.description = config.description || '';
  }

  clone() {
    return new NPC({ ...this });
  }
}

// ─── NPC Templates (spawn tables) ────────────────────────

const NPC_TEMPLATES = {
  // Key contacts
  marcus_fence: {
    id: 'marcus_fence',
    name: 'Marcus "The Fence" Delgado',
    role: 'contact',
    subRole: 'fence',
    loyalty: 35,
    trust: 40,
    nerve: 55,
    suspicion: 60,
    hp: 4,
    maxHp: 4,
    currentBlock: 'row_a',
    homeDistrict: 'the_row',
    description: 'Runs the pawn shop. Buys stolen goods, no questions asked.'
  },
  rico_supplier: {
    id: 'rico_supplier',
    name: 'Rico Vasquez',
    role: 'contact',
    subRole: 'supplier',
    loyalty: 25,
    trust: 35,
    nerve: 60,
    suspicion: 55,
    hp: 4,
    maxHp: 4,
    currentBlock: 'row_b',
    homeDistrict: 'the_row',
    description: 'Your connect for product. Reliable, but all business.'
  },
  elena_forger: {
    id: 'elena_forger',
    name: 'Elena "Ink" Petrov',
    role: 'contact',
    subRole: 'forger',
    loyalty: 20,
    trust: 45,
    nerve: 35,
    suspicion: 70,
    hp: 2,
    maxHp: 2,
    requiredRep: 50,
    currentBlock: 'row_c',
    homeDistrict: 'the_row',
    description: 'Forges documents, cleans records. Expensive but worth it.'
  },

  // Recruitable crew
  dex_lookout: {
    id: 'dex_lookout',
    name: 'Dex',
    role: 'civilian',   // Starts civilian, becomes crew when recruited
    subRole: 'lookout',
    loyalty: 30,
    trust: 25,
    nerve: 30,
    suspicion: 35,
    hp: 3,
    maxHp: 3,
    recruitCost: 100,
    specialty: 'lookout',
    currentBlock: 'row_a',
    homeDistrict: 'the_row',
    description: 'Washes dishes at Rusty\'s Bar. Desperate for a way out.'
  },
  vince_muscle: {
    id: 'vince_muscle',
    name: 'Vince "Knuckles" Tran',
    role: 'civilian',
    subRole: 'muscle',
    loyalty: 20,
    trust: 30,
    nerve: 70,
    suspicion: 25,
    hp: 6,
    maxHp: 6,
    recruitCost: 200,
    specialty: 'muscle',
    requiredRep: 100,
    currentBlock: 'row_b',
    homeDistrict: 'the_row',
    description: 'Ex-boxer. Hits hard, doesn\'t ask questions.'
  },
  sara_driver: {
    id: 'sara_driver',
    name: 'Sara "Wheels" Okafor',
    role: 'civilian',
    subRole: 'driver',
    loyalty: 35,
    trust: 40,
    nerve: 40,
    suspicion: 45,
    hp: 3,
    maxHp: 3,
    recruitCost: 150,
    specialty: 'driver',
    requiredRep: 200,
    currentBlock: 'docks_a',
    homeDistrict: 'the_docks',
    description: 'Drives like the devil. Knows every back road in the city.'
  },

  // Targets / debtors
  jimmy_debtor: {
    id: 'jimmy_debtor',
    name: 'Jimmy "Two-Shoes" Malone',
    role: 'civilian',
    nerve: 55,
    suspicion: 30,
    hp: 3,
    maxHp: 3,
    currentBlock: 'row_b',
    homeDistrict: 'the_row',
    description: 'Owes money to the wrong people. Has a temper.'
  },
  chen_shopowner: {
    id: 'chen_shopowner',
    name: 'Mr. Chen',
    role: 'civilian',
    nerve: 45,
    suspicion: 40,
    hp: 2,
    maxHp: 2,
    currentBlock: 'row_b',
    homeDistrict: 'the_row',
    description: 'Runs the corner store on Block B. Stubborn but honest.'
  },

  // Rival enforcers
  viktor_enforcer: {
    id: 'viktor_enforcer',
    name: 'Viktor Kostarov',
    role: 'rival',
    subRole: 'enforcer',
    loyalty: 0,
    fear: 0,
    nerve: 80,
    suspicion: 75,
    hp: 7,
    maxHp: 7,
    currentBlock: 'oldquarter_a',
    homeDistrict: 'old_quarter',
    worksFor: 'kostarov',
    description: 'Enforcer for the Kostarov Crew. Cold, professional, dangerous.'
  },

  // Law enforcement
  officer_beat: {
    id: 'officer_beat',
    name: 'Officer Daniels',
    role: 'cop',
    subRole: 'beat_cop',
    loyalty: 0,
    nerve: 50,
    suspicion: 60,
    hp: 5,
    maxHp: 5,
    currentBlock: 'row_b',
    homeDistrict: 'the_row',
    description: 'Patrols The Row. Could be useful if the price is right.'
  },
  detective_morrison: {
    id: 'detective_morrison',
    name: 'Detective Morrison',
    role: 'cop',
    subRole: 'detective',
    loyalty: 0,
    nerve: 70,
    suspicion: 80,
    hp: 5,
    maxHp: 5,
    requiredRep: 500,
    currentBlock: 'midtown_a',
    homeDistrict: 'midtown',
    description: 'Seasoned detective. Expensive to buy, but controls investigations.'
  },

  // Generic civilian templates (for spawning)
  civilian_generic: {
    name: 'Civilian',
    role: 'civilian',
    nerve: 25,
    suspicion: 40,
    hp: 2,
    maxHp: 2,
    description: 'Just a regular person going about their day.'
  }
};

// Name pools for procedural civilian generation
const CIVILIAN_FIRST_NAMES = [
  'Mike', 'Tony', 'Lisa', 'Angela', 'Derek', 'Nina', 'Carlos', 'Jade',
  'Ray', 'Keisha', 'Omar', 'Tanya', 'Hector', 'Priya', 'Yuri', 'Brenda',
  'Marcus', 'Diane', 'Jamal', 'Rosa', 'Wei', 'Fatima', 'Anton', 'Grace'
];
const CIVILIAN_LAST_NAMES = [
  'Johnson', 'Rivera', 'Kim', 'Patel', 'Brown', 'Garcia', 'Nguyen', 'Smith',
  'Williams', 'Davis', 'Martinez', 'Lee', 'Wilson', 'Anderson', 'Thomas', 'Moore'
];

function generateCivilianName() {
  const first = CIVILIAN_FIRST_NAMES[Math.floor(Math.random() * CIVILIAN_FIRST_NAMES.length)];
  const last = CIVILIAN_LAST_NAMES[Math.floor(Math.random() * CIVILIAN_LAST_NAMES.length)];
  return first + ' ' + last;
}

function spawnCivilian(blockId) {
  const template = { ...NPC_TEMPLATES.civilian_generic };
  template.id = 'civ_' + Math.random().toString(36).substr(2, 6);
  template.name = generateCivilianName();
  template.currentBlock = blockId;
  template.nerve = 15 + Math.floor(Math.random() * 30);
  template.suspicion = 30 + Math.floor(Math.random() * 30);
  return new NPC(template);
}

window.NPC = NPC;
window.NPC_TEMPLATES = NPC_TEMPLATES;
window.spawnCivilian = spawnCivilian;
