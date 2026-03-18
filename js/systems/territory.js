// ─── Territory System ─────────────────────────────────────
// Manages block control, rival expansion AI, passive income,
// defense, and rival threat phases.

class TerritorySystem {
  constructor() {
    this.rivals = {
      kostarov: {
        id: 'kostarov', name: 'Kostarov Crew', personality: 'cautious',
        strength: 60, hostility: 20,
        threatPhase: 'passive', phaseTimer: 30,
        tributeActive: false, tributeAmount: 0, allianceActive: false
      },
      dragos: {
        id: 'dragos', name: 'Dragos Syndicate', personality: 'aggressive',
        strength: 70, hostility: 15,
        threatPhase: 'passive', phaseTimer: 40,
        tributeActive: false, tributeAmount: 0, allianceActive: false
      },
      vega: {
        id: 'vega', name: 'Vega Cartel', personality: 'diplomatic',
        strength: 55, hostility: 10,
        threatPhase: 'passive', phaseTimer: 35,
        tributeActive: false, tributeAmount: 0, allianceActive: false
      }
    };
    this.init();
  }

  init() {
    Events.on('day_changed', () => this.dailyTick());
    Events.on('rival_hostility_increase', (data) => {
      for (const rival of Object.values(this.rivals)) {
        rival.hostility = Math.min(100, rival.hostility + (data.amount || 5));
      }
    });
  }

  dailyTick() {
    const player = GameState.player;

    for (const [blockId, block] of Object.entries(BLOCKS)) {
      // Player crew builds control
      const crewCount = block.crewStationed.length;
      if (crewCount > 0) {
        const gain = crewCount * 2;
        block.control.player = Math.min(100, block.control.player + gain);
        // Reduce rival control proportionally
        for (const rivalId of Object.keys(this.rivals)) {
          if (block.control[rivalId] > 0) {
            block.control[rivalId] = Math.max(0, block.control[rivalId] - gain);
          }
        }
        block.recalcNeutral();
      }

      // Undefended player blocks decay
      if (crewCount === 0 && block.control.player > 0) {
        block.control.player = Math.max(0, block.control.player - 1);
        block.recalcNeutral();
      }

      // Update weekly income
      block.weeklyIncome = block.control.player >= 50 ? Math.floor(block.control.player * 2) : 0;
    }

    // Rival AI
    for (const rival of Object.values(this.rivals)) {
      if (rival.allianceActive) continue;
      this.rivalTick(rival, player);
    }
  }

  rivalTick(rival, player) {
    switch (rival.threatPhase) {
      case 'passive':
        if (rival.hostility > 30 || player.reputation > rival.strength * 50) {
          rival.phaseTimer--;
          if (rival.phaseTimer <= 0) {
            rival.threatPhase = 'probe';
            rival.phaseTimer = 14;
            Events.emit('log', {
              text: `The ${rival.name} is sending scouts into your territory...`,
              type: 'warning'
            });
          }
        }
        break;

      case 'probe':
        rival.phaseTimer--;
        if (rival.phaseTimer <= 0) {
          rival.threatPhase = 'provoke';
          rival.phaseTimer = 7;
          Events.emit('log', {
            text: `The ${rival.name} is provoking you — vandalism on your blocks!`,
            type: 'danger'
          });
        }
        break;

      case 'provoke':
        // Damage a random player block
        const playerBlocks = Object.values(BLOCKS).filter(b => b.control.player > 15);
        if (playerBlocks.length > 0) {
          const target = RNG.pick(playerBlocks);
          target.control.player = Math.max(0, target.control.player - 3);
          target.recalcNeutral();
        }
        rival.phaseTimer--;
        if (rival.phaseTimer <= 0) {
          rival.threatPhase = 'attack';
          rival.phaseTimer = 3;
          Events.emit('log', {
            text: `The ${rival.name} is preparing an ATTACK on your territory!`,
            type: 'danger'
          });
        }
        break;

      case 'attack':
        rival.phaseTimer--;
        if (rival.phaseTimer <= 0) {
          this.executeRivalAttack(rival);
          rival.threatPhase = 'passive';
          rival.phaseTimer = 21 + RNG.int(0, 14);
        }
        break;
    }
  }

  executeRivalAttack(rival) {
    const playerBlocks = Object.values(BLOCKS)
      .filter(b => b.control.player > 10)
      .sort((a, b) => a.crewStationed.length - b.crewStationed.length);

    if (playerBlocks.length === 0) return;

    const target = playerBlocks[0]; // Attack weakest
    const playerDefense = target.crewStationed.length * 10 + target.control.player * 0.5;
    const rivalAttack = rival.strength * 0.3;

    if (rivalAttack > playerDefense) {
      target.control.player = Math.max(0, target.control.player - 30);
      target.control[rival.id] = Math.min(100, (target.control[rival.id] || 0) + 30);
      target.recalcNeutral();
      Events.emit('log', {
        text: `The ${rival.name} seized control of ${target.name}! (-30% control)`,
        type: 'danger'
      });
      Events.emit('rep_change', { amount: -10, source: 'territory_lost' });
    } else {
      rival.strength -= 5;
      Events.emit('log', {
        text: `Your crew defended ${target.name} against the ${rival.name}!`,
        type: 'success'
      });
      Events.emit('rep_change', { amount: 10, source: 'territory_defended' });
    }
  }

  changeControl(blockId, faction, amount) {
    const block = BLOCKS[blockId];
    if (!block) return;
    block.control[faction] = Math.max(0, Math.min(100, (block.control[faction] || 0) + amount));
    block.recalcNeutral();
  }

  getPlayerControlledBlocks() {
    return Object.values(BLOCKS).filter(b => b.control.player >= 50);
  }

  getPlayerPresenceBlocks() {
    return Object.values(BLOCKS).filter(b => b.control.player > 0);
  }
}

window.TerritorySystem = TerritorySystem;
