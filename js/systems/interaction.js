// ─── Interaction System ───────────────────────────────────
// Central router for all player ↔ NPC interactions.
// Handles: Talk, Threaten, Bribe, Collect, Deal, Recruit.
// Each action mutates player stats, NPC state, and has
// success/failure outcomes driven by skill checks.

class InteractionSystem {
  constructor() {}

  // ── Determine available actions for an NPC ──────────────
  getAvailableActions(npc) {
    const player = GameState.player;
    const actions = [];

    if (!npc.isAlive) return [{ id: 'loot', label: 'Search Body', enabled: true }];

    // Talk — always available
    actions.push({ id: 'talk', label: 'Talk', enabled: true });

    // Threaten — civilians always, contacts at rep 50+
    const canThreaten = npc.role === 'civilian' ||
      (npc.role === 'contact' && player.repTier >= 2) ||
      npc.role === 'rival';
    actions.push({
      id: 'threaten', label: 'Threaten', enabled: canThreaten,
      locked: !canThreaten ? 'Requires Hustler (Rep 100)' : null
    });

    // Bribe
    const minBribe = this.getBribeCost(npc);
    const canBribe = player.canAfford(minBribe) && npc.role !== 'rival';
    actions.push({
      id: 'bribe', label: `Bribe ($${minBribe})`, enabled: canBribe,
      locked: !canBribe && npc.role !== 'rival' ? `Need $${minBribe}` : null
    });

    // Collect — only if NPC has a debt or overdue racket
    const hasDebt = player.rackets.some(r => r.targetNpcId === npc.id && r.weeksMissed > 0);
    if (hasDebt) {
      actions.push({ id: 'collect', label: 'Collect Payment', enabled: true });
    }

    // Deal — if NPC is a buyer (during active deal jobs) or supplier
    if (npc.subRole === 'supplier') {
      actions.push({ id: 'deal', label: 'Make a Deal', enabled: true });
    }

    // Recruit — if crew slots open, NPC is recruitable
    const canRecruit = player.hasCrewSlot() &&
      (npc.role === 'civilian' || npc.role === 'contact') &&
      npc.specialty !== null &&
      (npc.loyalty >= 20 || npc.fear >= 50) &&
      player.reputation >= (npc.requiredRep || 0);
    if (npc.specialty) {
      actions.push({
        id: 'recruit', label: `Recruit ($${npc.recruitCost}/wk)`, enabled: canRecruit,
        locked: !canRecruit ? this.getRecruitLockReason(npc, player) : null
      });
    }

    // Shakedown — business owners, rep 2+
    if (npc.role === 'civilian' && !npc.specialty &&
        !player.rackets.some(r => r.targetNpcId === npc.id) &&
        player.repTier >= 2) {
      actions.push({ id: 'shakedown', label: 'Shakedown', enabled: true });
    }

    return actions;
  }

  // ── Execute an action ───────────────────────────────────
  execute(actionId, npc) {
    npc.lastInteractionDay = GameState.time.day;
    switch (actionId) {
      case 'talk':      return this.talk(npc);
      case 'threaten':  return this.threaten(npc);
      case 'bribe':     return this.bribe(npc);
      case 'collect':   return this.collect(npc);
      case 'deal':      return this.deal(npc);
      case 'recruit':   return this.recruit(npc);
      case 'shakedown': return this.shakedown(npc);
      default: return { success: false, text: 'Unknown action.' };
    }
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // ACTION: TALK
  // Systems: Interaction → NPC
  // Changes: NPC loyalty +1 to +5. No heat, no money, no rep.
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  talk(npc) {
    const result = { action: 'talk', npc: npc.name };

    if (npc.fear > 60) {
      npc.loyalty += 1;
      result.success = true;
      result.outcome = 'partial';
      result.text = `${npc.name} is too scared to talk freely. They share very little.`;
      result.changes = { loyalty: +1 };
      Events.emit('log', { text: result.text, type: 'info' });
      return result;
    }

    if (npc.loyalty < 10 && npc.role === 'civilian') {
      result.success = false;
      result.outcome = 'failure';
      result.text = `${npc.name} doesn't want to talk to you and walks away.`;
      Events.emit('log', { text: result.text, type: 'info' });
      return result;
    }

    // Success — build rapport
    const loyaltyGain = npc.role === 'contact' ? 5 : 3;
    npc.loyalty = Math.min(100, npc.loyalty + loyaltyGain);

    // Share info based on NPC type
    const info = this.generateInfo(npc);

    result.success = true;
    result.outcome = 'success';
    result.text = `${npc.name}: "${info.dialogue}"\n${info.intel ? `Intel: ${info.intel}` : ''}`;
    result.changes = { loyalty: +loyaltyGain };
    Events.emit('log', { text: result.text, type: 'info' });
    return result;
  }

  generateInfo(npc) {
    const dialogues = {
      civilian: [
        'I keep to myself, you know? But I see things.',
        'This neighborhood ain\'t what it used to be.',
        'I heard someone new is making moves around here.',
        'Watch out for the cops on Block B after midnight.'
      ],
      contact: {
        fence: ['I\'ve got buyers lined up. Bring me quality stuff.',
                'Electronics are hot right now. Good margins.',
                'Word on the street is Kostarov is looking to expand.'],
        supplier: ['Product is fresh this week. Premium quality.',
                   'I can get you a better deal if you move volume.',
                   'Be careful — cops set up a sting on 4th Street last week.'],
        forger: ['Need clean papers? I\'m your woman.',
                 'For the right price, I can make your record disappear.']
      },
      cop: ['You think I don\'t see what you\'re doing?',
            'Keep your nose clean and we won\'t have problems.',
            'Maybe we can help each other out... for a price.']
    };

    let dialogue, intel = null;
    if (npc.role === 'contact' && dialogues.contact[npc.subRole]) {
      dialogue = RNG.pick(dialogues.contact[npc.subRole]);
      if (npc.trust > 40) {
        const intelOptions = [
          'Cops are planning a sweep on The Row this week.',
          `The ${RNG.pick(['Kostarov Crew', 'Dragos Syndicate', 'Vega Cartel'])} is probing Block C.`,
          'There\'s an empty storefront on Block B — good for a front.',
          'A shipment is coming into the docks Tuesday night.'
        ];
        intel = RNG.pick(intelOptions);
      }
    } else if (npc.role === 'cop') {
      dialogue = RNG.pick(dialogues.cop);
    } else {
      dialogue = RNG.pick(dialogues.civilian);
    }

    return { dialogue, intel };
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // ACTION: THREATEN
  // Systems: Interaction → NPC → Heat → Reputation
  // Skill: intimidation vs npc.nerve
  // Success: fear +20, loyalty -10, heat +3-8, rep +5
  // Failure: fear -5, nerve +10, heat +8, rep -3, may trigger combat
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  threaten(npc) {
    const player = GameState.player;
    const result = { action: 'threaten', npc: npc.name };
    const check = RNG.skillCheck(player.skills.intimidation, npc.nerve);

    // Create witnesses
    const witnessCount = GameState.npcSystem.createWitnesses(
      player.currentBlock, 'threaten_' + npc.id
    );
    const witnessHeat = witnessCount * 2;

    if (check.success) {
      // ── SUCCESS ──
      npc.fear = Math.min(100, npc.fear + 20);
      npc.loyalty = Math.max(0, npc.loyalty - 10);

      // Clear witness status if they were a witness
      if (npc.isWitness) {
        npc.isWitness = false;
        npc.witnessedCrime = null;
      }

      const baseHeat = 3 + witnessHeat;
      Events.emit('heat_change', { amount: baseHeat, source: 'threaten' });
      Events.emit('rep_change', { amount: 5, source: 'threaten_success' });

      result.success = true;
      result.outcome = check.critSuccess ? 'critical_success' : 'success';
      result.text = check.critSuccess
        ? `${npc.name} is TERRIFIED. They'll do anything you say. (${check.chance}% chance, rolled ${check.roll})`
        : `${npc.name} backs down, hands shaking. "Okay... okay, I get it." (${check.chance}% chance, rolled ${check.roll})`;
      result.changes = { fear: +20, loyalty: -10, heat: +baseHeat, rep: +5 };
      result.witnessCount = witnessCount;
    } else {
      // ── FAILURE ──
      npc.fear = Math.max(0, npc.fear - 5);
      npc.nerve = Math.min(100, npc.nerve + 10);

      Events.emit('heat_change', { amount: 8 + witnessHeat, source: 'threaten_fail' });
      Events.emit('rep_change', { amount: -3, source: 'threaten_fail' });

      const mightFight = npc.nerve > 60 && npc.hp > 2;
      result.success = false;
      result.outcome = check.critFail ? 'critical_failure' : 'failure';
      result.text = mightFight
        ? `${npc.name} doesn't flinch. "You don't scare me." They're ready to fight! (${check.chance}% chance, rolled ${check.roll})`
        : `${npc.name} isn't impressed but backs off. Word will spread. (${check.chance}% chance, rolled ${check.roll})`;
      result.changes = { fear: -5, nerve: +10, heat: +(8 + witnessHeat), rep: -3 };
      result.combatTriggered = mightFight;
      result.witnessCount = witnessCount;
    }

    Events.emit('log', { text: result.text, type: result.success ? 'success' : 'warning' });
    return result;
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // ACTION: BRIBE
  // Systems: Interaction → NPC → Economy → Heat
  // Always succeeds if player can pay (except Feds).
  // Cost varies by NPC type. loyalty +10, may reduce heat.
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  bribe(npc) {
    const player = GameState.player;
    const cost = this.getBribeCost(npc);
    const result = { action: 'bribe', npc: npc.name, cost };

    if (!player.canAfford(cost)) {
      result.success = false;
      result.text = `You can't afford the $${cost} bribe.`;
      Events.emit('log', { text: result.text, type: 'warning' });
      return result;
    }

    // Feds can't be bribed
    if (npc.subRole === 'fed') {
      Events.emit('heat_change', { amount: 15, source: 'bribe_fed' });
      result.success = false;
      result.outcome = 'critical_failure';
      result.text = `${npc.name} is a FED. They record your bribe attempt. Heat surges!`;
      result.changes = { heat: +15, cash: -0 };
      Events.emit('log', { text: result.text, type: 'danger' });
      return result;
    }

    // Pay the bribe
    player.spendCash(cost);
    npc.loyalty = Math.min(100, npc.loyalty + 10);

    // Type-specific effects
    let heatReduction = 0;
    if (npc.role === 'cop') {
      // Bribing cops reduces heat and makes them a contact
      if (npc.subRole === 'beat_cop') heatReduction = 8;
      else if (npc.subRole === 'detective') heatReduction = 15;
      else heatReduction = 5;

      Events.emit('heat_change', { amount: -heatReduction, source: 'bribe_cop' });

      if (!player.contacts.includes(npc.id)) {
        player.contacts.push(npc.id);
        npc.subRole = 'corrupt_' + npc.subRole;
      }

      result.text = `${npc.name} pockets the cash. "We never had this conversation." (-${heatReduction} heat)`;
      result.changes = { cash: -cost, loyalty: +10, heat: -heatReduction };
    } else if (npc.isWitness) {
      // Bribing a witness silences them
      npc.isWitness = false;
      npc.witnessedCrime = null;
      result.text = `${npc.name} takes the money. "I didn't see anything." Witness silenced.`;
      result.changes = { cash: -cost, loyalty: +10, witnessRemoved: true };
    } else {
      result.text = `${npc.name} appreciates the gesture. Loyalty increased.`;
      result.changes = { cash: -cost, loyalty: +10 };
    }

    // Small chance of cop going corrupt and flipping later
    if (npc.role === 'cop') {
      result.flipRisk = '5% per week this cop could flip under investigation';
    }

    result.success = true;
    result.outcome = 'success';
    Events.emit('log', { text: result.text, type: 'success' });
    return result;
  }

  getBribeCost(npc) {
    switch (npc.role) {
      case 'civilian': return 50;
      case 'cop':
        if (npc.subRole === 'detective' || npc.subRole === 'corrupt_detective') return 1000;
        return 200;
      case 'contact': return 100;
      default: return 50;
    }
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // ACTION: COLLECT
  // Systems: Interaction → NPC → Economy → Heat → Rep
  // Collect overdue racket payment or job debt.
  // Uses intimidation. Success: money + rep. Fail: may fight.
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  collect(npc) {
    const player = GameState.player;
    const result = { action: 'collect', npc: npc.name };

    // Find the racket
    const racket = player.rackets.find(r => r.targetNpcId === npc.id && r.weeksMissed > 0);
    if (!racket) {
      result.success = false;
      result.text = `${npc.name} doesn't owe you anything.`;
      Events.emit('log', { text: result.text, type: 'info' });
      return result;
    }

    const owed = racket.weeklyPayment * racket.weeksMissed;
    const check = RNG.skillCheck(player.skills.intimidation, npc.nerve);

    if (check.success) {
      // ── SUCCESS: Full payment ──
      const collected = owed;
      player.addDirty(collected);
      npc.fear = Math.min(100, npc.fear + 15);
      racket.weeksMissed = 0;
      racket.lastPaid = GameState.time.day;

      const witnessCount = GameState.npcSystem.createWitnesses(player.currentBlock, 'collect_' + npc.id);
      const heat = 5 + witnessCount * 2;

      Events.emit('heat_change', { amount: heat, source: 'collection' });
      Events.emit('rep_change', { amount: 8, source: 'collection' });

      result.success = true;
      result.outcome = 'success';
      result.text = `${npc.name} pays everything owed: $${collected}. "It won't happen again." (${check.chance}%, rolled ${check.roll})`;
      result.changes = { cash: +collected, fear: +15, heat: +heat, rep: +8 };

      // Territory boost
      const block = BLOCKS[player.currentBlock];
      if (block) {
        block.control.player = Math.min(100, block.control.player + 2);
        block.recalcNeutral();
      }
    } else if (check.margin > -15) {
      // ── PARTIAL: Half payment ──
      const collected = Math.floor(owed * 0.5);
      player.addDirty(collected);
      npc.fear = Math.min(100, npc.fear + 5);
      racket.weeksMissed = Math.max(0, racket.weeksMissed - 1);

      Events.emit('heat_change', { amount: 3, source: 'collection_partial' });
      Events.emit('rep_change', { amount: 3, source: 'collection_partial' });

      result.success = true;
      result.outcome = 'partial';
      result.text = `${npc.name} scrapes together half: $${collected}. "I'll get the rest next week." (${check.chance}%, rolled ${check.roll})`;
      result.changes = { cash: +collected, fear: +5, heat: +3, rep: +3 };
    } else {
      // ── FAILURE: Refuses ──
      npc.fear = Math.max(0, npc.fear - 5);
      npc.nerve = Math.min(100, npc.nerve + 5);

      Events.emit('heat_change', { amount: 5, source: 'collection_fail' });
      Events.emit('rep_change', { amount: -5, source: 'collection_fail' });

      const mightFight = npc.nerve > 55;
      result.success = false;
      result.outcome = 'failure';
      result.text = mightFight
        ? `${npc.name} refuses to pay and reaches for something behind the counter! (${check.chance}%, rolled ${check.roll})`
        : `${npc.name}: "I don't have it. Do what you want." You leave empty-handed. (${check.chance}%, rolled ${check.roll})`;
      result.changes = { fear: -5, nerve: +5, heat: +5, rep: -5 };
      result.combatTriggered = mightFight;
    }

    Events.emit('log', { text: result.text, type: result.success ? 'success' : 'warning' });
    return result;
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // ACTION: DEAL
  // Systems: Interaction → NPC → Economy → Heat → Job → Time
  // Buy/sell product. Sting chance based on heat.
  // Success: money + rep. Fail: sting or robbery.
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  deal(npc) {
    const player = GameState.player;
    const result = { action: 'deal', npc: npc.name };

    if (npc.subRole !== 'supplier') {
      result.success = false;
      result.text = `${npc.name} isn't a supplier.`;
      Events.emit('log', { text: result.text, type: 'info' });
      return result;
    }

    // Generate a deal
    const dealValue = 200 + player.repTier * 150 + RNG.int(0, 200);
    const playerCut = Math.floor(dealValue * 0.6);
    const upfrontCost = Math.floor(dealValue * 0.4);

    if (!player.canAfford(upfrontCost)) {
      result.text = `Rico: "Minimum buy-in is $${upfrontCost}. Come back when you've got the cash."`;
      result.success = false;
      Events.emit('log', { text: result.text, type: 'warning' });
      return result;
    }

    // Sting check
    const stingChance = GameState.heatSystem.getStingChance();
    const isSting = RNG.chance(stingChance);

    if (isSting) {
      // ── STING! ──
      // Street smarts detection
      const detectCheck = RNG.skillCheck(player.skills.streetSmarts, 60);
      if (detectCheck.success) {
        result.success = true;
        result.outcome = 'detected_sting';
        result.text = `Something feels off... you spot an unmarked car. You walk away clean. (Sting detected — Street Smarts saved you!)`;
        Events.emit('log', { text: result.text, type: 'success' });
        return result;
      }

      // Caught in sting
      const cashLost = Math.floor(player.cash.dirty * 0.5);
      player.cash.dirty -= cashLost;
      const bail = 500 * (1 + player.arrestRecord);
      player.spendCash(Math.min(bail, player.totalCash));
      player.arrestRecord++;

      Events.emit('heat_change', { amount: 20, source: 'sting_arrested' });
      Events.emit('rep_change', { amount: -20, source: 'arrested' });

      // Crew loyalty hit
      for (const crew of player.activeCrew) {
        crew.loyalty = Math.max(0, crew.loyalty - 8);
      }

      // Skip days
      const daysLost = 2 + player.arrestRecord;
      for (let i = 0; i < daysLost; i++) {
        GameState.time.advance(24 * 60);
      }

      result.success = false;
      result.outcome = 'arrested';
      result.text = `IT'S A STING! Cops swarm in. You're arrested!\nCash seized: $${cashLost}. Bail: $${bail}. Lost ${daysLost} days.\n(Sting chance was ${Math.round(stingChance)}%)`;
      result.changes = { cash: -(cashLost + bail), heat: +20, rep: -20, daysLost };
      Events.emit('log', { text: result.text, type: 'danger' });
      return result;
    }

    // ── CLEAN DEAL ──
    // Try to negotiate better cut
    const negotiateCheck = RNG.skillCheck(player.skills.persuasion, npc.suspicion);
    let finalCut = playerCut;
    let negotiateText = '';

    if (negotiateCheck.success) {
      finalCut = Math.floor(dealValue * 0.7);
      negotiateText = ' (Negotiated a better cut!)';
      npc.trust = Math.min(100, npc.trust + 3);
    }

    player.spendCash(upfrontCost);
    player.addDirty(finalCut);
    const netProfit = finalCut - upfrontCost;

    Events.emit('heat_change', { amount: 5, source: 'deal_complete' });
    Events.emit('rep_change', { amount: 8, source: 'deal' });
    npc.trust = Math.min(100, npc.trust + 3);

    result.success = true;
    result.outcome = 'success';
    result.text = `Deal done.${negotiateText} Invested $${upfrontCost}, earned $${finalCut}. Net profit: $${netProfit}.`;
    result.changes = { cash: +netProfit, heat: +5, rep: +8, trust: +3 };

    Events.emit('log', { text: result.text, type: 'success' });
    return result;
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // ACTION: RECRUIT
  // Systems: Interaction → NPC → Economy → Reputation
  // Requires crew slot, min rep, min loyalty/fear.
  // Ongoing cost: weekly salary.
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  recruit(npc) {
    const player = GameState.player;
    const result = { action: 'recruit', npc: npc.name };

    // Validation
    if (!player.hasCrewSlot()) {
      result.success = false;
      result.text = `Crew is full (${player.activeCrew.length}/${player.crewSlots} slots).`;
      Events.emit('log', { text: result.text, type: 'warning' });
      return result;
    }

    if (player.reputation < (npc.requiredRep || 0)) {
      result.success = false;
      result.text = `${npc.name} won't work for someone with your reputation. Need Rep ${npc.requiredRep}.`;
      Events.emit('log', { text: result.text, type: 'warning' });
      return result;
    }

    if (npc.loyalty < 20 && npc.fear < 50) {
      result.success = false;
      result.text = `${npc.name} doesn't trust or fear you enough to join. Build loyalty or fear first.`;
      Events.emit('log', { text: result.text, type: 'warning' });
      return result;
    }

    // Recruit succeeds
    npc.role = 'crew';
    npc.worksFor = 'player';
    const startLoyalty = npc.fear >= 50 ? 25 : Math.max(30, npc.loyalty);
    npc.loyalty = startLoyalty;
    npc.betrayalTimer = 0;

    player.addCrewMember(npc);
    Events.emit('rep_change', { amount: 5, source: 'recruit' });

    result.success = true;
    result.outcome = 'success';
    result.text = `${npc.name} joins your crew as ${npc.specialty}! Salary: $${npc.recruitCost}/week. Loyalty: ${startLoyalty}.`;
    result.changes = { crewSlots: `${player.activeCrew.length}/${player.crewSlots}`, rep: +5, weeklyCost: +npc.recruitCost };

    Events.emit('log', { text: result.text, type: 'success' });
    return result;
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // ACTION: SHAKEDOWN
  // Systems: Interaction → NPC → Economy → Heat → Territory → Rep
  // Establish a protection racket. Multiple approaches.
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  shakedown(npc) {
    const player = GameState.player;
    const result = { action: 'shakedown', npc: npc.name };
    const weeklyDemand = 200 + player.repTier * 100;

    // Auto-pick approach based on skills (player can refine later with UI choices)
    // For now, try persuasion first, fall back to intimidation
    const persuasionCheck = RNG.skillCheck(player.skills.persuasion, npc.suspicion);
    const intimidationCheck = RNG.skillCheck(player.skills.intimidation, npc.nerve);

    if (persuasionCheck.success) {
      // ── PERSUASION SUCCESS: Subtle, lower payment, no heat ──
      const payment = Math.floor(weeklyDemand * 0.75);
      npc.loyalty = Math.min(100, npc.loyalty + 10);
      npc.fear = Math.min(100, npc.fear + 10);

      GameState.economySystem.createRacket(npc, payment, player.currentBlock);
      Events.emit('rep_change', { amount: 10, source: 'new_racket' });

      const block = BLOCKS[player.currentBlock];
      if (block) {
        block.control.player = Math.min(100, block.control.player + 5);
        block.recalcNeutral();
      }

      result.success = true;
      result.outcome = 'success';
      result.text = `${npc.name} agrees to pay $${payment}/week for "protection." No heat generated. (Persuasion: ${persuasionCheck.chance}%, rolled ${persuasionCheck.roll})`;
      result.changes = { racket: +payment, loyalty: +10, rep: +10, territory: +5 };
    } else if (intimidationCheck.success) {
      // ── INTIMIDATION SUCCESS: Full payment, generates heat ──
      npc.fear = Math.min(100, npc.fear + 30);
      npc.loyalty = Math.max(0, npc.loyalty - 10);

      GameState.economySystem.createRacket(npc, weeklyDemand, player.currentBlock);

      const witnessCount = GameState.npcSystem.createWitnesses(player.currentBlock, 'shakedown_' + npc.id);
      const heat = 8 + witnessCount * 2;
      Events.emit('heat_change', { amount: heat, source: 'shakedown' });
      Events.emit('rep_change', { amount: 10, source: 'new_racket' });

      const block = BLOCKS[player.currentBlock];
      if (block) {
        block.control.player = Math.min(100, block.control.player + 5);
        block.recalcNeutral();
      }

      result.success = true;
      result.outcome = 'success';
      result.text = `${npc.name} is visibly shaken. They agree to $${weeklyDemand}/week. ${witnessCount} witnesses. (Intimidation: ${intimidationCheck.chance}%, rolled ${intimidationCheck.roll})`;
      result.changes = { racket: +weeklyDemand, fear: +30, loyalty: -10, heat: +heat, rep: +10 };
    } else {
      // ── BOTH FAILED ──
      npc.nerve = Math.min(100, npc.nerve + 10);
      Events.emit('rep_change', { amount: -3, source: 'shakedown_fail' });

      result.success = false;
      result.outcome = 'failure';
      result.text = `${npc.name}: "Get out of my store." They're not buying it. (Persuasion: ${persuasionCheck.chance}%, Intimidation: ${intimidationCheck.chance}%)`;
      result.changes = { nerve: +10, rep: -3 };

      // NPC may report you
      if (RNG.chance(30)) {
        Events.emit('heat_change', { amount: 8, source: 'shakedown_reported' });
        result.text += '\nThey picked up the phone after you left. Cops notified.';
        result.changes.heat = +8;
      }
    }

    Events.emit('log', { text: result.text, type: result.success ? 'success' : 'warning' });
    return result;
  }

  getRecruitLockReason(npc, player) {
    if (!player.hasCrewSlot()) return `Crew full (${player.activeCrew.length}/${player.crewSlots})`;
    if (player.reputation < (npc.requiredRep || 0)) return `Need Rep ${npc.requiredRep}`;
    if (npc.loyalty < 20 && npc.fear < 50) return 'Need loyalty 20+ or fear 50+';
    return 'Requirements not met';
  }
}

window.InteractionSystem = InteractionSystem;
