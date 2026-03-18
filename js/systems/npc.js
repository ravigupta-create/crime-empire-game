// ─── NPC System ───────────────────────────────────────────
// Manages NPC state, schedules, loyalty/fear decay,
// betrayal checks, witness behavior.

class NPCSystem {
  constructor() {
    this.init();
  }

  init() {
    Events.on('day_changed', () => this.dailyTick());
  }

  dailyTick() {
    this.decayStats();
    const betrayals = this.checkBetrayals();
    const reports = this.processWitnesses();

    for (const b of betrayals) {
      this.executeBetrayalEvent(b);
    }
    for (const r of reports) {
      Events.emit('heat_change', { amount: r.heatGenerated, source: 'witness_report' });
      Events.emit('log', {
        text: `A witness reported your crime to the police! (+${r.heatGenerated} heat)`,
        type: 'danger'
      });
    }
  }

  decayStats() {
    for (const npc of Object.values(GameState.npcs)) {
      if (!npc.isAlive) continue;

      // Fear decays toward 0
      if (npc.fear > 0) {
        npc.fear = Math.max(0, npc.fear - 2);
      }

      // Non-crew loyalty drifts toward 30
      if (npc.worksFor !== 'player') {
        if (npc.loyalty > 30) npc.loyalty -= 1;
        else if (npc.loyalty < 30 && npc.role === 'contact') npc.loyalty += 1;
      }

      // Trust decays if not interacted with recently
      const daysSince = GameState.time.day - npc.lastInteractionDay;
      if (npc.trust > 50 && daysSince > 7) {
        npc.trust = Math.max(0, npc.trust - 3);
      }
    }
  }

  checkBetrayals() {
    const player = GameState.player;
    const betrayals = [];

    for (const crew of player.activeCrew) {
      if (crew.loyalty < 20) {
        crew.betrayalTimer++;
        if (crew.betrayalTimer >= 14) {
          const betrayalChance = (20 - crew.loyalty) * 3;
          if (RNG.chance(betrayalChance)) {
            betrayals.push({
              traitor: crew,
              type: RNG.pick(['snitch', 'steal', 'defect']),
              info: {
                safeHouseKnown: player.safeHouses.length > 0,
                racketCount: player.rackets.length,
                crewCount: player.activeCrew.length
              }
            });
          }
        }
      } else {
        crew.betrayalTimer = 0;
      }
    }

    return betrayals;
  }

  executeBetrayalEvent(betrayal) {
    const player = GameState.player;
    const traitor = betrayal.traitor;

    Events.emit('log', {
      text: `BETRAYAL! ${traitor.name} has turned against you!`,
      type: 'danger'
    });

    player.removeCrewMember(traitor.id);
    traitor.worksFor = 'kostarov';
    traitor.isSnitch = true;
    traitor.role = 'rival';

    switch (betrayal.type) {
      case 'snitch':
        Events.emit('heat_change', { amount: 25, source: 'crew_betrayal' });
        Events.emit('log', { text: `${traitor.name} ratted you out to the cops!`, type: 'danger' });
        break;
      case 'steal':
        const stolen = Math.floor(player.cash.stashed * 0.5);
        player.cash.stashed -= stolen;
        Events.emit('log', { text: `${traitor.name} stole $${stolen} from your stash!`, type: 'danger' });
        break;
      case 'defect':
        Events.emit('log', { text: `${traitor.name} defected to the Kostarov Crew!`, type: 'danger' });
        Events.emit('rival_hostility_increase', { amount: 20 });
        break;
    }

    Events.emit('rep_change', { amount: -15, source: 'betrayal' });

    // Remaining crew shaken
    for (const crew of player.activeCrew) {
      crew.loyalty = Math.max(0, crew.loyalty - 5);
    }
  }

  processWitnesses() {
    const reports = [];

    for (const npc of Object.values(GameState.npcs)) {
      if (!npc.isWitness || !npc.witnessedCrime) continue;

      const reportChance = Math.max(5, 60 - (npc.fear * 0.8));
      if (RNG.chance(reportChance)) {
        reports.push({
          npcId: npc.id,
          crimeId: npc.witnessedCrime,
          heatGenerated: 8 + RNG.int(0, 7)
        });
        npc.isWitness = false;
        npc.witnessedCrime = null;
      } else {
        npc.fear = Math.max(0, npc.fear - 5);
      }
    }

    return reports;
  }

  // Get all NPCs in a specific block
  getNPCsInBlock(blockId) {
    return Object.values(GameState.npcs).filter(
      n => n.currentBlock === blockId && n.isAlive
    );
  }

  // Create witnesses from nearby civilians
  createWitnesses(blockId, crimeId) {
    const nearby = this.getNPCsInBlock(blockId)
      .filter(n => n.role === 'civilian' && !n.isWitness);
    const block = BLOCKS[blockId];
    const witnessCount = Math.min(nearby.length, Math.floor(block.population / 25));

    for (let i = 0; i < witnessCount; i++) {
      nearby[i].isWitness = true;
      nearby[i].witnessedCrime = crimeId;
    }

    return witnessCount;
  }
}

window.NPCSystem = NPCSystem;
