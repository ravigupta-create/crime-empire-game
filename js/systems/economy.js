// ─── Economy System ───────────────────────────────────────
// Manages all money flow: rackets, fronts, crew salaries,
// laundering, weekly financial ticks.

class EconomySystem {
  constructor() {
    this.init();
  }

  init() {
    Events.on('weekly_tick', () => this.weeklyTick());
  }

  weeklyTick() {
    const player = GameState.player;
    const report = { income: 0, expenses: 0, events: [] };

    // 1. Collect racket income
    for (const racket of player.rackets) {
      if (!racket.isActive) continue;
      const npc = GameState.npcs[racket.targetNpcId];
      if (!npc) continue;

      if (npc.fear >= 30 || npc.loyalty >= 40) {
        player.addDirty(racket.weeklyPayment);
        report.income += racket.weeklyPayment;
        racket.lastPaid = GameState.time.day;
        racket.weeksMissed = 0;
      } else {
        racket.weeksMissed++;
        report.events.push({ type: 'RACKET_OVERDUE', racket });
        Events.emit('log', {
          text: `${npc.name} missed payment! (${racket.weeksMissed} weeks overdue)`,
          type: 'warning'
        });
        if (racket.weeksMissed >= 3) {
          racket.isActive = false;
          Events.emit('log', { text: `Racket collapsed: ${npc.name} stopped paying entirely!`, type: 'danger' });
          Events.emit('heat_change', { amount: 10, source: 'racket_collapse_report' });
          // Domino effect
          for (const otherRacket of player.rackets) {
            if (otherRacket.blockId === racket.blockId && otherRacket.isActive) {
              const otherNpc = GameState.npcs[otherRacket.targetNpcId];
              if (otherNpc) otherNpc.fear = Math.max(0, otherNpc.fear - 10);
            }
          }
        }
      }
    }

    // 2. Front legit income + reset launder capacity
    for (const front of player.fronts) {
      if (!front.isRaided) {
        player.addClean(front.legitIncome);
        report.income += front.legitIncome;
        front.launderedThisWeek = 0;
      } else {
        front.raidCooldown--;
        if (front.raidCooldown <= 0) {
          front.isRaided = false;
          Events.emit('log', { text: `${front.type} is back in operation after raid.`, type: 'info' });
        }
      }
    }

    // 3. Territory passive income
    for (const [blockId, block] of Object.entries(BLOCKS)) {
      if (block.control.player >= 50) {
        const income = Math.floor(block.control.player * 2);
        player.addDirty(income);
        report.income += income;
      }
    }

    // 4. Pay crew salaries
    for (const crew of player.activeCrew) {
      if (player.canAfford(crew.recruitCost)) {
        player.spendCash(crew.recruitCost);
        report.expenses += crew.recruitCost;
        crew.loyalty = Math.min(100, crew.loyalty + 3);
      } else {
        crew.loyalty -= 10;
        report.events.push({ type: 'MISSED_PAYMENT', crew: crew.name });
        Events.emit('log', {
          text: `Can't pay ${crew.name}! Loyalty dropped to ${crew.loyalty}.`,
          type: 'danger'
        });
      }
    }

    // 5. Check front raids
    if (player.heat > 50) {
      for (const front of player.fronts) {
        if (front.isRaided) continue;
        const raidChance = (player.heat - 50) * 2;
        if (RNG.chance(raidChance)) {
          front.isRaided = true;
          front.raidCooldown = 5;
          report.events.push({ type: 'FRONT_RAIDED', front: front.type });
          Events.emit('log', { text: `Your ${front.type} was RAIDED by cops!`, type: 'danger' });
          Events.emit('heat_change', { amount: 5, source: 'raid_attention' });
        }
      }
    }

    // Summary
    Events.emit('log', {
      text: `Weekly Report: Income $${report.income} | Expenses $${report.expenses} | Net $${report.income - report.expenses}`,
      type: 'info'
    });

    return report;
  }

  launder(front, amount) {
    const player = GameState.player;
    if (front.isRaided) return { success: false, reason: 'Front is shut down from raid.' };
    if (player.cash.dirty < amount) return { success: false, reason: 'Not enough dirty cash.' };

    const available = front.launderCapacity - front.launderedThisWeek;
    const actual = Math.min(amount, available);
    if (actual <= 0) return { success: false, reason: 'Front at capacity this week.' };

    const cut = Math.floor(actual * front.launderCut);
    const clean = actual - cut;

    player.cash.dirty -= actual;
    player.cash.clean += clean;
    front.launderedThisWeek += actual;

    Events.emit('log', {
      text: `Laundered $${actual} through ${front.type}. Cut: $${cut}. Clean: $${clean}.`,
      type: 'success'
    });
    Events.emit('money_changed', { laundered: actual, clean });

    return { success: true, laundered: actual, cut, clean };
  }

  createRacket(npc, weeklyPayment, blockId) {
    const racket = {
      id: 'racket_' + Math.random().toString(36).substr(2, 6),
      targetNpcId: npc.id,
      blockId: blockId,
      weeklyPayment: weeklyPayment,
      isActive: true,
      weeksMissed: 0,
      lastPaid: GameState.time.day
    };
    GameState.player.rackets.push(racket);
    Events.emit('log', { text: `New racket: ${npc.name} pays $${weeklyPayment}/week.`, type: 'success' });
    return racket;
  }

  buyFront(type) {
    const FRONTS = {
      laundromat:  { cost: 5000,  launderCut: 0.15, launderCapacity: 3000,  legitIncome: 100 },
      restaurant:  { cost: 15000, launderCut: 0.12, launderCapacity: 8000,  legitIncome: 250 },
      car_wash:    { cost: 10000, launderCut: 0.13, launderCapacity: 6000,  legitIncome: 150 },
      nightclub:   { cost: 30000, launderCut: 0.10, launderCapacity: 15000, legitIncome: 500 },
      real_estate: { cost: 80000, launderCut: 0.08, launderCapacity: 40000, legitIncome: 1000 }
    };

    const template = FRONTS[type];
    if (!template) return { success: false, reason: 'Unknown front type.' };
    if (!GameState.player.canAfford(template.cost)) return { success: false, reason: 'Not enough cash.' };

    GameState.player.spendCash(template.cost);
    const front = {
      id: 'front_' + Math.random().toString(36).substr(2, 6),
      type: type,
      ...template,
      launderedThisWeek: 0,
      isRaided: false,
      raidCooldown: 0,
      upgradeLevel: 0
    };
    GameState.player.fronts.push(front);
    Events.emit('log', { text: `Purchased ${type} front for $${template.cost}.`, type: 'success' });
    return { success: true, front };
  }
}

window.EconomySystem = EconomySystem;
