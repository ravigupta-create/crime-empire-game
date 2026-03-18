# Crime Empire — Systems Architecture

Every player action flows through one or more **core systems**. This document defines each system, its data model, how every action mutates state, the possible outcomes (success / partial / failure), risk factors, and pseudo-code logic flows. Everything is modular and ready to become JavaScript classes.

---

## Table of Contents
1. [Core Systems Overview & Module Map](#1-core-systems-overview--module-map)
2. [Data Models (All Game State)](#2-data-models)
3. [Player Action Registry — Every Action Defined](#3-player-action-registry)
4. [System Definitions](#4-system-definitions)
   - 4.1 Interaction System
   - 4.2 NPC System
   - 4.3 Economy System
   - 4.4 Heat System
   - 4.5 Reputation System
   - 4.6 Territory System
   - 4.7 Combat System
   - 4.8 Time System
   - 4.9 Job System
5. [System Interconnections — The Event Bus](#5-system-interconnections)
6. [Complete Logic Flows (Pseudo-Code)](#6-complete-logic-flows)
7. [File/Module Map](#7-filemodule-map)

---

## 1. Core Systems Overview & Module Map

```
┌─────────────────────────────────────────────────────────────┐
│                        EVENT BUS                             │
│  (All systems communicate through events, never directly)    │
└────┬──────┬──────┬──────┬──────┬──────┬──────┬──────┬───────┘
     │      │      │      │      │      │      │      │
     ▼      ▼      ▼      ▼      ▼      ▼      ▼      ▼
┌────────┐┌──────┐┌──────┐┌────┐┌─────┐┌─────┐┌──────┐┌────┐
│Interact││ NPC  ││Econ  ││Heat││ Rep ││Terri││Combat││Time│
│System  ││System││System││Sys ││ Sys ││tory ││System││Sys │
└────────┘└──────┘└──────┘└────┘└─────┘└─────┘└──────┘└────┘
     │      │      │      │      │      │      │      │
     └──────┴──────┴──────┴──────┴──────┴──────┴──────┘
                           │
                    ┌──────┴──────┐
                    │  GAME STATE │
                    │  (single    │
                    │  source of  │
                    │  truth)     │
                    └─────────────┘
```

**Rule:** Systems never call each other directly. System A emits an event → the Event Bus routes it → System B reacts. This keeps everything modular and testable.

---

## 2. Data Models

### 2.1 Player State

```
Player {
  cash: {
    dirty: number        // Cash on person (default: all dirty)
    clean: number        // Laundered cash (spendable without heat)
    stashed: number      // Cash hidden in safe house
  }
  heat: number           // 0–100
  reputation: number     // 0–99999+
  repTier: number        // 1–7 (derived from reputation)
  hp: number             // 1–10 (default 5)
  maxHp: number          // 5 (upgradeable)
  skills: {
    intimidation: number // 0–8
    persuasion: number   // 0–8
    streetSmarts: number // 0–8
    operations: number   // 0–8
    leadership: number   // 0–8
  }
  skillPoints: number    // Unspent
  inventory: Item[]      // Stolen goods, contraband, tools
  crewSlots: number      // Starts 1, unlocks more with rep
  activeCrew: CrewMember[]
  safeHouses: SafeHouse[]
  fronts: FrontBusiness[]
  rackets: Racket[]
  contacts: ContactID[]
  arrestRecord: number   // Times busted (affects bail/sentencing)
  position: { x, y }
  currentBlock: BlockID
  currentDistrict: DistrictID
}
```

### 2.2 NPC State

```
NPC {
  id: string
  name: string
  role: 'civilian' | 'contact' | 'crew' | 'rival' | 'cop'
  subRole: string          // e.g., 'fence', 'supplier', 'beat_cop', 'detective'
  loyalty: number          // 0–100 (toward player)
  fear: number             // 0–100 (of player)
  trust: number            // 0–100 (business reliability)
  nerve: number            // 0–100 (resistance to intimidation)
  suspicion: number        // 0–100 (resistance to persuasion)
  hp: number
  isAlive: boolean
  isWitness: boolean       // Currently witnessed a crime?
  witnessedCrime: CrimeID | null
  schedule: ScheduleEntry[]  // Time → location mapping
  position: { x, y }
  currentBlock: BlockID
  homeDistrict: DistrictID
  dialogueState: string    // Tracks conversation progress
  recruitCost: number      // Weekly salary if crew
  specialty: string | null // If crew: 'muscle', 'tech', 'driver', 'negotiator'
  betrayalTimer: number    // Days at low loyalty before betrayal triggers
  isSnitch: boolean        // Flipped to cops/rivals
  worksFor: 'player' | RivalID | 'independent'
}
```

### 2.3 Block & Territory State

```
Block {
  id: string               // e.g., "row_a", "docks_c"
  districtId: DistrictID
  control: {
    player: number         // 0–100
    [rivalId]: number      // 0–100 per rival
    neutral: number        // Remainder
  }
  crewStationed: CrewMember[]
  businesses: Business[]
  fronts: FrontBusiness[]
  population: number       // Civilian density (affects witness chance)
  copPresence: number      // 0–100 (higher = more patrols)
  pointsOfInterest: POI[]
  isDefended: boolean      // Has player crew stationed?
  weeklyIncome: number     // Passive dirty money from control
}

District {
  id: string
  name: string
  blocks: Block[4]
  controlledBy: 'player' | RivalID | 'contested' | 'neutral'
  rivalStronghold: POI | null
}
```

### 2.4 Economy Objects

```
FrontBusiness {
  id: string
  type: 'laundromat' | 'restaurant' | 'car_wash' | 'nightclub' | 'real_estate'
  blockId: BlockID
  purchaseCost: number
  launderCut: number       // Percentage lost to laundering
  launderCapacity: number  // Max per week
  launderedThisWeek: number
  legitIncome: number      // Small passive clean income
  isRaided: boolean        // Shut down by cops?
  raidCooldown: number     // Days until operational again
  upgradeLevel: number     // 0–3
}

Racket {
  id: string
  targetNpcId: NPCID
  blockId: BlockID
  weeklyPayment: number
  isActive: boolean
  weeksMissed: number      // Consecutive missed payments
  lastPaid: GameDay
}

Item {
  id: string
  name: string
  type: 'stolen_goods' | 'contraband' | 'weapon' | 'tool' | 'document'
  value: number            // Fence/sale price
  heatIfCarried: number    // Extra heat if caught with this
  isEvidence: boolean      // Links to a crime?
}
```

### 2.5 Job State

```
Job {
  id: string
  type: 'theft' | 'delivery' | 'collection' | 'deal' | 'shakedown' | 'heist' | 'smuggling'
  clientId: NPCID
  targetId: NPCID | null
  locationBlock: BlockID
  pay: number
  riskLevel: 'low' | 'medium' | 'high' | 'extreme'
  requiredRep: number
  requiredCrew: number     // Minimum crew members
  timeLimit: GameHours | null
  isActive: boolean
  isComplete: boolean
  isFailed: boolean
  stingChance: number      // 0.0–1.0 (modified by heat)
}
```

### 2.6 Rival State

```
Rival {
  id: string
  name: string
  personality: 'aggressive' | 'cautious' | 'diplomatic' | 'ruthless'
  strength: number         // Total crew + resources
  controlledBlocks: BlockID[]
  hostility: number        // 0–100 toward player
  threatPhase: 'passive' | 'probe' | 'provoke' | 'attack' | 'war'
  phaseTimer: number       // Days until next escalation
  tributeActive: boolean   // Player paying tribute?
  tributeAmount: number
  allianceActive: boolean
}
```

---

## 3. Player Action Registry

Every action the player can take, which systems handle it, exact data mutations, outcomes, and risk factors.

---

### ACTION: Talk

| Field | Value |
|-------|-------|
| **Systems** | Interaction → NPC |
| **Preconditions** | Player within interaction range of NPC. NPC is alive. |
| **Data Changes** | |
| — Money | None |
| — Heat | None |
| — Reputation | None |
| — NPC State | `npc.loyalty += 3` (capped at 100). `npc.dialogueState` advances. |
| — Territory | None |
| **Success** | NPC shares info, offers a job, or becomes friendlier. Loyalty +3. |
| **Partial Success** | NPC is guarded — shares limited info. Loyalty +1. (If NPC fear > 60, they're too scared to talk freely.) |
| **Failure** | NPC refuses to talk. (If NPC loyalty < 10 AND role == 'civilian', they may walk away.) |
| **Risk: Police** | 0% |
| **Risk: Betrayal** | 0% |
| **Risk: Money Loss** | 0% |

---

### ACTION: Threaten

| Field | Value |
|-------|-------|
| **Systems** | Interaction → NPC → Heat → Reputation |
| **Preconditions** | Player within range. Threaten option unlocked (Rep ≥ 0 for civilians, Rep ≥ 50 for contacts). |
| **Skill Check** | `player.skills.intimidation` vs `npc.nerve` |
| **Success Formula** | `baseChance = 40 + (player.skills.intimidation * 8) - (npc.nerve * 0.4)` clamped 10–95% |
| **Data Changes on SUCCESS** | |
| — Money | None (direct). Enables collection/compliance. |
| — Heat | `+3` base. `+2` per civilian witness in range. `+5` if in high-population block. |
| — Reputation | `+5` (fear = respect at low tiers) |
| — NPC State | `npc.fear += 20`. `npc.loyalty -= 10`. `npc.isWitness = false` (if they were a witness, they're silenced). |
| — Territory | None directly. |
| **Data Changes on FAILURE** | |
| — Heat | `+8` (NPC resists loudly or reports) |
| — Reputation | `-3` (seen as weak) |
| — NPC State | `npc.fear -= 5` (emboldened). `npc.nerve += 10` (harder to threaten next time). May trigger combat if `npc.nerve > 70`. |
| **Partial Success** | NPC complies but gives less (e.g., pays 50% of debt). `npc.fear += 10`. `heat += 2`. |
| **Risk: Police** | `5% + (heat * 0.3)%` — higher if witnesses present |
| **Risk: Betrayal** | 0% (but NPC may retaliate later if fear decays) |
| **Risk: Money Loss** | 0% direct. If combat triggers from failure, risk of losing cash if player loses fight. |

---

### ACTION: Bribe

| Field | Value |
|-------|-------|
| **Systems** | Interaction → NPC → Economy → Heat |
| **Preconditions** | Player has enough dirty or clean cash. Bribe option unlocked. |
| **Cost Calculation** | Depends on target: civilian witness $50, beat cop $200, detective $1,000, politician $10,000+ |
| **Data Changes** | |
| — Money | `player.cash.dirty -= bribeAmount` (or clean if available). If spending dirty > $500, `heat += 1`. |
| — Heat | Depends on target. Bribing a cop: `heat -= 8`. Bribing a witness: prevents `+heat` from their report. |
| — Reputation | None (bribes are quiet) |
| — NPC State | `npc.loyalty += 10`. `npc.isWitness = false` (if witness). For cops: `npc.subRole = 'corrupt_cop'`, added to contacts. |
| — Territory | None |
| **Success** | Always succeeds if player can pay (money talks). Exception: Feds cannot be bribed (auto-fail). |
| **Partial Success** | N/A — bribes are binary (pay or don't). |
| **Failure** | Only fails if: target is a Fed (`heat += 15`, immediate pursuit), or NPC loyalty to rival > 80 (they report the bribe attempt, `heat += 10`). |
| **Risk: Police** | 2% base (someone sees the exchange). 0% if no witnesses. |
| **Risk: Betrayal** | 5% if bribing a cop — cop may later flip under investigation (`heat += 15` delayed). |
| **Risk: Money Loss** | 100% — the bribe cost is always spent, even on failure. |

---

### ACTION: Recruit

| Field | Value |
|-------|-------|
| **Systems** | Interaction → NPC → Economy → Reputation |
| **Preconditions** | NPC role suitable (civilian/contact convertible, or designated recruitable). `player.activeCrew.length < player.crewSlots`. `player.reputation >= npc.requiredRep`. `npc.loyalty >= 20 OR npc.fear >= 50`. |
| **Data Changes** | |
| — Money | `player.cash -= signBonus` (if offered). Ongoing: `player.cash -= npc.recruitCost` per week. |
| — Heat | None |
| — Reputation | `+5` (growing operation) |
| — NPC State | `npc.role = 'crew'`. `npc.worksFor = 'player'`. `npc.loyalty = baseLoyalty` (40 for fair pay, 20 for lowball, 30 for deferred). |
| — Territory | None immediately. Crew can be assigned for `+2% control/day`. |
| **Success** | NPC joins crew. Added to `player.activeCrew[]`. |
| **Partial Success** | NPC joins but with conditions (e.g., "I want a cut of the next big job" — must deliver within 2 weeks or loyalty tanks). |
| **Failure** | NPC declines. Possible if: player rep too low, NPC loyalty/fear too low, or NPC already works for a rival. `npc.loyalty -= 5` (offended by the ask). |
| **Risk: Police** | 0% |
| **Risk: Betrayal** | Immediate: 0%. Future: `loyaltyBetrayalChance = npc.loyalty < 20 ? (20 - npc.loyalty) * 2 : 0` percent per week. |
| **Risk: Money Loss** | Ongoing salary drain. If crew member betrays, may steal stash. |

---

### ACTION: Collect (Debt/Racket)

| Field | Value |
|-------|-------|
| **Systems** | Interaction → NPC → Economy → Heat → Reputation |
| **Preconditions** | Active job (collection) or active racket with overdue payment. |
| **Data Changes on SUCCESS** | |
| — Money | `player.cash.dirty += collectAmount * playerCutPercent` |
| — Heat | `+2` (quiet collection) to `+12` (violent collection) |
| — Reputation | `+8` (getting paid = respect) |
| — NPC State | `npc.fear += 5` (reminder of who's boss). Racket: `racket.lastPaid = currentDay`. |
| — Territory | `block.control.player += 2` (presence felt) |
| **Failure Modes** | |
| — Target refuses | Triggers dialogue options (threaten/fight/negotiate). No money until resolved. |
| — Target fights | Combat encounter. Win: get money + bonus loot. Lose: `-$100`, `-5 Rep`. |
| — Target fled | Job failed. `job.isFailed = true`. Client trust `npc.trust -= 15`. |
| — Target reported to cops | `heat += 10`. Cop patrol dispatched. |
| **Risk: Police** | `3% + (heat * 0.2)%` base. +10% if block `copPresence > 50`. |
| **Risk: Betrayal** | If collecting via crew member: `betrayalChance = crewMember.loyalty < 30 ? 15% : 0%`. Crew may pocket the money. |
| **Risk: Money Loss** | If combat and player loses: `−$100 to −$500` (robbed). |

---

### ACTION: Deal (Drug Sale)

| Field | Value |
|-------|-------|
| **Systems** | Interaction → NPC → Economy → Heat → Job → Time |
| **Preconditions** | Player has product in inventory. Buyer NPC at location. Within time window. |
| **Data Changes on SUCCESS** | |
| — Money | `player.cash.dirty += salePrice * playerCutPercent` |
| — Heat | `+3` (clean handoff) to `+8` (sloppy/public deal) |
| — Reputation | `+8` per unit sold. `+15` for bulk deals. |
| — NPC State | Supplier: `npc.trust += 3`. Buyer: removed (one-time NPC). |
| — Territory | `block.control.player += 1` (minor presence) |
| **Partial Success — Upsell** | Persuasion check succeeds: `playerCutPercent += 0.15`. Extra profit, no extra heat. |
| **Partial Success — Upsell Fail** | Buyer walks. No sale. `supplier.trust -= 5`. |
| **Failure — Sting** | |
| — Sting Chance | `baseStingChance = 0.05 + (player.heat * 0.005)`. At heat 40: `0.05 + 0.20 = 25%`. Street Smarts check to detect: `detectChance = player.skills.streetSmarts * 12%`. |
| — If stung | Cop confrontation. Flee (chase mini-game) or surrender (arrest). |
| — If stung and caught | `player.cash.dirty -= carriedCash * 0.5`. Contraband seized. `heat += 20`. `rep -= 20`. Bail: `$500 * (1 + player.arrestRecord)`. Skip `2 + player.arrestRecord` days. |
| **Failure — Robbery** | Buyer attacks. Combat encounter. If player loses: product + cash stolen. |
| **Failure — Counterfeit** | 10% chance. Player doesn't know until spending. `$0` from that sale, discovered next purchase attempt. |
| **Risk: Police** | `stingChance` as above + `3% + (heat * 0.2)%` for patrol encounter. |
| **Risk: Betrayal** | If supplier trust < 20: supplier may give bad product (no value) or set player up. |
| **Risk: Money Loss** | Upfront product cost if deal fails. Carried cash if arrested. |

---

### ACTION: Shakedown (Initiate Protection Racket)

| Field | Value |
|-------|-------|
| **Systems** | Interaction → NPC → Economy → Heat → Territory → Reputation |
| **Preconditions** | Target is a business owner NPC. `player.repTier >= 2` (Hustler). Block not fully controlled by a rival. |
| **Data Changes on SUCCESS** | |
| — Money | `player.rackets.push(newRacket)`. `racket.weeklyPayment` deposited each week. |
| — Heat | `+0` (persuasion) to `+15` (violence/property destruction) depending on approach |
| — Reputation | `+10` (per new racket established) |
| — NPC State | `npc.fear = 40–70` (depending on method). `npc.loyalty = 10–30`. `npc.dialogueState = 'paying'`. |
| — Territory | `block.control.player += 5` (business under your control) |
| **Approach-Specific Outcomes** | |
| — Persuasion ("Nice place...") | Success: `racket.weeklyPayment = demand * 0.66`. `heat += 0`. `npc.loyalty += 10`. Fail: NPC says no. Must escalate or leave. |
| — Intimidation (slam counter) | Success: full payment. `heat += 8`. `npc.fear += 30`. Fail: NPC fights back → combat or retreat. |
| — Genuine protection offer | Requires `rep > 50`. `racket.weeklyPayment = demand * 0.83`. `npc.loyalty += 20`. NPC becomes informant. `heat += 0`. |
| — Trash the store | Auto-success. Full payment. `heat += 15`. `rep -= 10` (neighborhood). `npc.fear = 90`. NPC secretly contacts rival → `rival.hostility += 10` in 10 days. |
| **Failure** | NPC refuses all approaches. If player leaves: no racket, `-3 rep` (backed down). NPC may report to cops: `heat += 8`. |
| **Risk: Police** | `0%` (persuasion) to `15% + (heat * 0.3)%` (violence). Witnesses report. |
| **Risk: Betrayal** | Long-term: if `npc.fear < 30`, NPC stops paying AND may report (`heat += 10`). |
| **Risk: Money Loss** | None direct. Lost opportunity if failed. |

---

### ACTION: Heist

| Field | Value |
|-------|-------|
| **Systems** | Job → Interaction → Combat → Economy → Heat → Territory |
| **Preconditions** | `player.repTier >= 3`. Active heist job. Required crew assembled. Gear obtained. |
| **Phases** | Planning → Infiltration → Execution → Escape |
| **Data Changes on SUCCESS** | |
| — Money | `player.cash.dirty += heistPayout` ($2,000–$50,000 depending on tier) |
| — Heat | `+10` (clean) to `+25` (messy). Modified by crew skill, gear, time of day. |
| — Reputation | `+30` to `+100` (heists are big rep events) |
| — NPC State | Crew: `loyalty += 5` each (shared success). Witnesses: must be handled. |
| — Territory | `block.control.player += 10` (major operation in this block) |
| **Partial Success** | Got some loot but had to abort early. `payout * 0.3–0.6`. Higher heat from messy exit. |
| **Failure — Alarm** | Security triggered. 60-second timer to grab what you can and flee. `heat += 20`. |
| **Failure — Crew injury** | Crew member hurt. `crewMember.hp -= 3`. If HP hits 0: crew member dies. `loyalty -= 10` for surviving crew. |
| **Failure — Caught** | Arrest. Major charges: `bail = $2,000 * (1 + arrestRecord)`. Skip 5 days. `rep -= 30`. |
| **Risk: Police** | `20% + (heat * 0.4)%` during heist. Modified by crew lookout: `-15%` with lookout assigned. |
| **Risk: Betrayal** | If any crew member `loyalty < 25`: `betrayalChance = 10%`. They tip off cops or steal loot mid-heist. |
| **Risk: Money Loss** | Gear cost ($500–$5,000). Carried cash if arrested. Bail. |

---

### ACTION: Launder Money

| Field | Value |
|-------|-------|
| **Systems** | Economy → Heat |
| **Preconditions** | Player owns at least one front. `front.isRaided == false`. `front.launderedThisWeek < front.launderCapacity`. |
| **Data Changes** | |
| — Money | `amountToLaunder = min(requested, front.launderCapacity - front.launderedThisWeek)`. `player.cash.dirty -= amountToLaunder`. `player.cash.clean += amountToLaunder * (1 - front.launderCut)`. `front.launderedThisWeek += amountToLaunder`. |
| — Heat | None (laundering PREVENTS future heat from spending). |
| — Reputation | None |
| — NPC State | None |
| — Territory | None |
| **Success** | Always succeeds if preconditions met. |
| **Partial Success** | Front capacity reached mid-launder. Remainder stays dirty. |
| **Failure** | Front is raided (can't launder). Must wait for cooldown or use another front. |
| **Risk: Police** | 0% for the act itself. But if `heat > 60`, front may be raided: `raidChance = (heat - 50) * 2%` per day. |
| **Risk: Betrayal** | 0% |
| **Risk: Money Loss** | The laundering cut (8–15%) is the cost. |

---

### ACTION: Bribe Official (Heat Reduction)

| Field | Value |
|-------|-------|
| **Systems** | Interaction → NPC → Economy → Heat |
| **Preconditions** | Target is cop/detective/judge. Player has enough cash. Target is not a Fed (Feds refuse). |
| **Data Changes** | |
| — Money | `player.cash -= bribeCost` (dirty or clean — dirty adds no extra heat since it's a bribe) |
| — Heat | Beat cop: `heat -= 8`. Detective: `heat -= 15`. Judge: `heat -= 25`. |
| — Reputation | None |
| — NPC State | `npc.loyalty += 15`. `npc.subRole = 'corrupt_' + npc.subRole`. Added to player contacts. |
| — Territory | Block `copPresence -= 10` (corrupt cop looks the other way) |
| **Success** | Heat reduced. Cop becomes asset. |
| **Partial Success** | Cop takes the money but delivers less (`heat -= 4` instead of 8). Low trust NPC. |
| **Failure** | Target is a Fed: `heat += 15`. Immediate pursuit. Target is internal affairs: `heat += 20`, all corrupt cops in contacts exposed (`heat += 5` per exposed cop). |
| **Risk: Police** | 0% at time of bribe. Future: `copFlipChance = 5%` per week. If cop is investigated and flips: `heat += 15`, cop removed from contacts, testifies against player. |
| **Risk: Betrayal** | `5%` per week as above. |
| **Risk: Money Loss** | 100% — bribe cost is non-refundable. |

---

### ACTION: Assign Crew to Block

| Field | Value |
|-------|-------|
| **Systems** | NPC → Territory |
| **Preconditions** | Crew member available (not on another assignment). Block is accessible (not deep in rival territory). |
| **Data Changes** | |
| — Money | None (salary already handled weekly) |
| — Heat | None |
| — Reputation | None |
| — NPC State | `crewMember.assignedBlock = blockId`. `crewMember.assignment = 'territory'`. |
| — Territory | `block.crewStationed.push(crewMember)`. Daily tick: `block.control.player += 2` (per crew member). `block.isDefended = true`. |
| **Success** | Always succeeds. |
| **Risk** | Crew member may be attacked by rivals if the block is contested. `rivalAttackChance = rival.hostility * 0.5%` per day. If attacked and loses: crew member injured/killed, `block.control.player -= 15`. |

---

### ACTION: Rest (Safe House)

| Field | Value |
|-------|-------|
| **Systems** | Time → Heat → NPC (crew ticks) → Territory (rival ticks) |
| **Preconditions** | Player at a safe house. |
| **Data Changes** | |
| — Money | None |
| — Heat | `heat -= 1` per in-game day skipped (passive decay) |
| — Reputation | None |
| — NPC State | Crew loyalty ticks proceed. Rival timers advance. |
| — Territory | Rivals may advance. Undefended blocks decay. |
| — HP | `player.hp = player.maxHp` (full heal) |
| **Success** | Always succeeds. |
| **Risk** | Time passes — rivals advance, crew needs payment, jobs expire. |

---

### ACTION: Flee (Chase)

| Field | Value |
|-------|-------|
| **Systems** | Combat → Heat → Reputation |
| **Preconditions** | Player is in a cop confrontation or combat they want to escape. |
| **Skill Check** | Chase mini-game. Base success: `50% + (player.skills.streetSmarts * 6%)`. Modified by: time of day (night +10%), block population (low pop +10%). |
| **Data Changes on SUCCESS** | |
| — Heat | `+5` (got away but they know your face) |
| — Reputation | `+3` (slippery) |
| — NPC State | Pursuing cop: `npc.suspicion += 20` (remembers you) |
| **Data Changes on FAILURE** | |
| — Money | Arrested: lose carried dirty cash. Pay bail. |
| — Heat | `+15` (chase drew attention) |
| — Reputation | `−10` (caught running = weak) |
| — Arrest triggered (see Getting Busted flow below) |
| **Risk: Police** | 100% — you're already in a police encounter. |
| **Risk: Money Loss** | If caught: `player.cash.dirty * 0.5` seized + bail. |

---

### ACTION: Eliminate (Kill NPC)

| Field | Value |
|-------|-------|
| **Systems** | Combat → NPC → Heat → Reputation → Territory |
| **Preconditions** | NPC is alive. Player initiates combat with lethal intent. |
| **Data Changes** | |
| — Money | Can loot body: `npc.cash` (small amounts on civilians, more on rivals). |
| — Heat | `+15` minimum. `+25` if witnesses. `+5` per witness who escapes. |
| — Reputation | `+10` to `+30` (depending on target — killing a rival enforcer = big rep). `−15` if target was a civilian (monster reputation). |
| — NPC State | `npc.isAlive = false`. Permanently removed. All NPCs in visual range: `fear += 30`. Witnesses created. |
| — Territory | If rival crew: `block.control[rivalId] -= 15`. If rival boss: triggers war or absorption. |
| **Success** | Target dead. Consequences as above. |
| **Failure** | Target wins combat. Player loses HP, money, rep. May be killed (game over if HP reaches 0 with no safe house). |
| **Risk: Police** | `30% + (heat * 0.5)%`. Murder = highest heat action. |
| **Risk: Betrayal** | Crew who witness may lose loyalty if they disagree with the kill. `loyalty -= 5` for crew members with `loyalty > 60` (they signed up for crime, not murder). |
| **Risk: Money Loss** | If combat fails: robbed. If caught: maximum bail, long jail time. |

---

## 4. System Definitions

### 4.1 Interaction System (`interaction.js`)

**Purpose:** Central router for all player ↔ NPC interactions. Determines which options are available, handles skill checks, dispatches results to other systems.

```
InteractionSystem {
  // Determine what dialogue options are available for this NPC
  getAvailableActions(player, npc) → Action[]

  // Execute a chosen action
  executeAction(action, player, npc) → ActionResult

  // Perform a skill check
  skillCheck(skillName, skillLevel, difficulty) → { success, margin }

  // Build the dialogue wheel UI data
  buildDialogueWheel(player, npc) → DialogueOption[]
}
```

**Available Actions Logic:**
```
FUNCTION getAvailableActions(player, npc):
  actions = [TALK]   // Always available

  IF npc.isAlive == false:
    RETURN [LOOT]

  // Threaten: available for civilians always, contacts at rep 50+
  IF npc.role == 'civilian' OR (npc.role == 'contact' AND player.repTier >= 2):
    actions.push(THREATEN)

  // Bribe: available if player has cash
  IF player.cash.dirty + player.cash.clean >= getMinBribeCost(npc):
    actions.push(BRIBE)

  // Recruit: available if crew slots open, NPC is recruitable, rep sufficient
  IF player.activeCrew.length < player.crewSlots
     AND npc.role IN ['civilian', 'contact']
     AND npc.loyalty >= 20 OR npc.fear >= 50
     AND player.reputation >= npc.requiredRep:
    actions.push(RECRUIT)

  // Eliminate: available at rep 50+ (you need to be someone who "does that")
  IF player.repTier >= 2 AND npc.role != 'cop':
    actions.push(ELIMINATE)

  // Context-specific actions
  IF npc has active job targeting them:
    actions.push(COLLECT, SEARCH_LOCATION)
  IF npc.role == 'contact' AND npc.subRole == 'supplier':
    actions.push(BUY_PRODUCT)
  IF npc.role == 'contact' AND npc.subRole == 'fence':
    actions.push(SELL_GOODS)
  IF npc.role == 'contact' AND npc.subRole == 'forger':
    actions.push(REQUEST_FORGERY)

  RETURN actions
```

**Skill Check Logic:**
```
FUNCTION skillCheck(skillName, skillLevel, difficulty):
  // difficulty = npc.nerve (for intimidation), npc.suspicion (for persuasion), etc.
  baseChance = 40 + (skillLevel * 8) - (difficulty * 0.4)
  chance = clamp(baseChance, 10, 95)  // Always 10–95% — never guaranteed

  roll = random(0, 100)
  success = roll < chance
  margin = chance - roll  // Positive = succeeded by this much. Negative = failed by this much.

  RETURN { success, margin, roll, chance }
```

---

### 4.2 NPC System (`npc.js`)

**Purpose:** Manages all NPC state, schedules, loyalty/fear decay, betrayal checks, witness behavior.

```
NPCSystem {
  npcs: Map<NPCID, NPC>

  // Called every in-game hour
  tick(gameTime)

  // Update NPC position based on schedule
  updateSchedules(gameTime)

  // Decay fear/loyalty toward neutral over time
  decayStats()

  // Check if any crew members betray
  checkBetrayals(player) → BetrayalEvent[]

  // Check if any witnesses report crimes
  processWitnesses() → WitnessReport[]

  // Spawn new NPCs as needed
  spawnCycle(district)

  // Get all NPCs in a radius
  getNPCsInRange(position, radius) → NPC[]
}
```

**Loyalty/Fear Decay (per in-game day):**
```
FUNCTION decayStats():
  FOR EACH npc IN npcs:
    // Fear decays toward 0 (people forget threats)
    IF npc.fear > 0:
      npc.fear -= 2  // Lose 2 fear per day
      npc.fear = max(npc.fear, 0)

    // Loyalty decays toward 30 (people drift to neutral-ish)
    IF npc.loyalty > 30 AND npc.worksFor != 'player':
      npc.loyalty -= 1
    IF npc.loyalty < 30 AND npc.role == 'contact':
      npc.loyalty += 1  // Contacts drift back to slightly friendly

    // Trust decays if not maintained
    IF npc.trust > 50 AND daysSinceLastInteraction(npc) > 7:
      npc.trust -= 3
```

**Betrayal Check (per in-game day for crew):**
```
FUNCTION checkBetrayals(player):
  betrayals = []
  FOR EACH crew IN player.activeCrew:
    IF crew.loyalty < 20:
      crew.betrayalTimer += 1
      IF crew.betrayalTimer >= 14:  // 2 weeks at low loyalty
        // Betrayal is now possible
        betrayalRoll = random(0, 100)
        betrayalChance = (20 - crew.loyalty) * 3  // Max 60% at loyalty 0
        IF betrayalRoll < betrayalChance:
          betrayals.push({
            traitor: crew,
            type: pickBetrayalType(crew),  // 'snitch', 'steal', 'defect_to_rival'
            compromisedInfo: getCrewKnowledge(crew, player)
          })
    ELSE:
      crew.betrayalTimer = 0  // Reset if loyalty recovers

  RETURN betrayals
```

**Witness Processing:**
```
FUNCTION processWitnesses():
  reports = []
  FOR EACH npc IN npcs:
    IF npc.isWitness AND npc.witnessedCrime != null:
      // Will they report?
      reportChance = 60 - (npc.fear * 0.8)  // High fear = low report chance
      reportChance = max(reportChance, 5)    // Minimum 5% — some people always talk

      IF random(0, 100) < reportChance:
        reports.push({
          npcId: npc.id,
          crimeId: npc.witnessedCrime,
          heatGenerated: 8 + random(0, 7)  // 8–15 heat
        })
        npc.isWitness = false
        npc.witnessedCrime = null
      ELSE:
        // Scared into silence, but might report later
        npc.fear -= 5  // Fear decays, may report next cycle

  RETURN reports
```

---

### 4.3 Economy System (`economy.js`)

**Purpose:** Tracks all money flow — dirty cash, clean cash, stash, racket income, crew salaries, front businesses, laundering.

```
EconomySystem {
  // Process weekly financial cycle
  weeklyTick(player, gameState)

  // Handle a money transaction
  transaction(player, amount, type, isDirty) → TransactionResult

  // Launder money through a front
  launder(player, front, amount) → LaunderResult

  // Calculate total weekly income/expenses
  getFinancialReport(player) → Report
}
```

**Weekly Tick (every 7 in-game days):**
```
FUNCTION weeklyTick(player, gameState):
  report = { income: 0, expenses: 0, events: [] }

  // 1. Collect racket income
  FOR EACH racket IN player.rackets:
    IF racket.isActive:
      npc = getNPC(racket.targetNpcId)
      IF npc.fear >= 30 OR npc.loyalty >= 40:
        player.cash.dirty += racket.weeklyPayment
        report.income += racket.weeklyPayment
        racket.lastPaid = currentDay
        racket.weeksMissed = 0
      ELSE:
        // NPC stopped paying
        racket.weeksMissed += 1
        report.events.push({ type: 'RACKET_OVERDUE', racket, weeksMissed: racket.weeksMissed })
        IF racket.weeksMissed >= 3:
          racket.isActive = false
          EMIT('racket_collapsed', { racket, npc })
          // Domino effect: other rackets in same block may rebel
          FOR EACH otherRacket IN getRacketsInBlock(racket.blockId):
            otherNpc = getNPC(otherRacket.targetNpcId)
            otherNpc.fear -= 10  // Emboldened by neighbor's defiance

  // 2. Collect front legit income
  FOR EACH front IN player.fronts:
    IF NOT front.isRaided:
      player.cash.clean += front.legitIncome
      report.income += front.legitIncome
      front.launderedThisWeek = 0  // Reset weekly capacity

  // 3. Collect territory passive income
  FOR EACH block IN getPlayerControlledBlocks():
    IF block.control.player >= 50:
      passiveIncome = floor(block.control.player * 2)  // $100/week at 50%, $200 at 100%
      player.cash.dirty += passiveIncome
      report.income += passiveIncome

  // 4. Pay crew salaries
  FOR EACH crew IN player.activeCrew:
    IF player.cash.dirty + player.cash.clean >= crew.recruitCost:
      IF player.cash.clean >= crew.recruitCost:
        player.cash.clean -= crew.recruitCost
      ELSE:
        player.cash.dirty -= crew.recruitCost
      report.expenses += crew.recruitCost
      crew.loyalty += 3  // Paid on time
    ELSE:
      // Can't afford salary
      crew.loyalty -= 10
      report.events.push({ type: 'MISSED_PAYMENT', crew })

  // 5. Check front raids
  FOR EACH front IN player.fronts:
    IF player.heat > 50:
      raidChance = (player.heat - 50) * 2  // 2% per heat point above 50
      IF random(0, 100) < raidChance:
        front.isRaided = true
        front.raidCooldown = 5  // 5 days to reopen
        report.events.push({ type: 'FRONT_RAIDED', front })
        EMIT('heat_change', { amount: 5, source: 'front_raid_attention' })

  RETURN report
```

**Spending with Heat Check:**
```
FUNCTION transaction(player, amount, type, isDirty):
  IF isDirty AND amount > 500:
    heatGain = floor(amount / 1000) + 1  // +1 heat per $1000 spent dirty
    EMIT('heat_change', { amount: heatGain, source: 'dirty_spending' })

  IF isDirty:
    player.cash.dirty -= amount
  ELSE:
    player.cash.clean -= amount

  RETURN { success: true, heatGained: heatGain || 0 }
```

---

### 4.4 Heat System (`heat.js`)

**Purpose:** Central heat tracker. Listens for heat-changing events from all systems. Controls cop spawning, investigation triggers, raid timing.

```
HeatSystem {
  // Modify heat
  changeHeat(player, amount, source)

  // Get current heat tier
  getHeatTier(heat) → 'cold' | 'warm' | 'hot' | 'blazing' | 'inferno'

  // Daily passive decay
  dailyDecay(player)

  // Determine cop behavior based on heat
  getCopBehavior(heat, block) → CopBehavior

  // Check for investigation/raid triggers
  checkTriggers(player, gameState) → HeatEvent[]
}
```

**Heat Change with Cascading Effects:**
```
FUNCTION changeHeat(player, amount, source):
  oldTier = getHeatTier(player.heat)
  player.heat = clamp(player.heat + amount, 0, 100)
  newTier = getHeatTier(player.heat)

  // Tier transition events
  IF newTier != oldTier:
    IF newTier == 'warm' AND oldTier == 'cold':
      EMIT('heat_tier_change', { tier: 'warm' })
      // Spawn patrol cars in player's district
      spawnPatrols(player.currentDistrict, frequency: 90)  // Every 90 seconds

    IF newTier == 'hot':
      EMIT('heat_tier_change', { tier: 'hot' })
      // Detectives start investigating
      spawnDetective(player.currentDistrict)
      // All skill checks +5% harder (people are nervous)
      EMIT('difficulty_modifier', { amount: 5 })

    IF newTier == 'blazing':
      EMIT('heat_tier_change', { tier: 'blazing' })
      // Trigger front raid checks more frequently
      // Undercover cops may infiltrate crew recruitment
      EMIT('undercover_risk_active', {})

    IF newTier == 'inferno':
      EMIT('heat_tier_change', { tier: 'inferno' })
      // Feds deployed. Arrest on sight.
      spawnFeds(player.currentDistrict)
      // Crew members pressured to flip
      FOR EACH crew IN player.activeCrew:
        IF crew.loyalty < 50:
          crew.loyalty -= 15  // Pressure breaks weak loyalty
          EMIT('crew_pressured', { crew })

  RETURN { oldTier, newTier, currentHeat: player.heat }
```

**Cop Behavior Based on Heat:**
```
FUNCTION getCopBehavior(heat, block):
  IF heat < 20:
    RETURN { patrols: 'none', response: 'ignore', stingChance: 0.05 }
  IF heat < 40:
    RETURN { patrols: 'occasional', response: 'investigate_if_witnessed', stingChance: 0.10 }
  IF heat < 60:
    RETURN { patrols: 'frequent', response: 'approach_on_suspicion', stingChance: 0.20 }
  IF heat < 80:
    RETURN { patrols: 'heavy', response: 'search_on_sight', stingChance: 0.35 }
  RETURN { patrols: 'lockdown', response: 'arrest_on_sight', stingChance: 0.50 }
```

---

### 4.5 Reputation System (`reputation.js`)

**Purpose:** Tracks player reputation, manages tier transitions, unlocks content, handles rep-gated features.

```
ReputationSystem {
  // Modify reputation
  changeRep(player, amount, source)

  // Get tier from rep value
  getTier(rep) → { tier, title, nextTierAt }

  // Check if action is unlocked
  isUnlocked(action, player) → boolean

  // Get tier-up rewards
  getTierRewards(tier) → Reward[]
}
```

**Tier Calculation & Transition:**
```
CONST TIERS = [
  { tier: 1, title: 'Street Rat',  min: 0,     crewSlots: 1, unlocks: ['theft', 'small_deal'] },
  { tier: 2, title: 'Hustler',     min: 100,   crewSlots: 2, unlocks: ['shakedown', 'fencing', 'safe_house'] },
  { tier: 3, title: 'Enforcer',    min: 500,   crewSlots: 3, unlocks: ['heist', 'bribery', 'forger'] },
  { tier: 4, title: 'Lieutenant',  min: 1500,  crewSlots: 5, unlocks: ['territory_control', 'fronts', 'smuggling'] },
  { tier: 5, title: 'Underboss',   min: 5000,  crewSlots: 8, unlocks: ['rival_takeover', 'corrupt_officials'] },
  { tier: 6, title: 'Crime Lord',  min: 15000, crewSlots: 12, unlocks: ['multi_district', 'political'] },
  { tier: 7, title: 'Kingpin',     min: 50000, crewSlots: 20, unlocks: ['endgame_ops', 'untouchable'] },
]

FUNCTION changeRep(player, amount, source):
  oldTier = getTier(player.reputation)
  player.reputation = max(player.reputation + amount, 0)
  newTier = getTier(player.reputation)

  IF newTier.tier > oldTier.tier:
    // TIER UP
    player.crewSlots = newTier.crewSlots
    EMIT('tier_up', { oldTier, newTier, unlocks: newTier.unlocks })
    // Grant skill point every 2 tiers
    IF newTier.tier % 2 == 0:
      player.skillPoints += 1
      EMIT('skill_point_earned', {})
    // Rivals react to player's rising power
    FOR EACH rival IN getRivals():
      IF rival.hostility < 50:
        rival.hostility += 10  // Growing threat

  IF newTier.tier < oldTier.tier:
    // TIER DOWN (losing rep)
    player.crewSlots = newTier.crewSlots
    // If player has more crew than new max, furthest-assigned leave
    WHILE player.activeCrew.length > player.crewSlots:
      removed = player.activeCrew.pop()
      removed.worksFor = 'independent'
      EMIT('crew_lost', { crew: removed, reason: 'rep_loss' })
```

---

### 4.6 Territory System (`territory.js`)

**Purpose:** Manages block control, rival territory AI, passive income from controlled blocks, defense.

```
TerritorySystem {
  districts: Map<DistrictID, District>
  blocks: Map<BlockID, Block>

  // Daily territory tick
  dailyTick(player, rivals)

  // Modify control for a block
  changeControl(blockId, faction, amount)

  // Check district ownership
  checkDistrictControl(districtId) → ControllerID

  // Process rival expansion AI
  rivalExpansionTick(rival)

  // Get blocks at risk
  getContestedBlocks() → Block[]
}
```

**Daily Territory Tick:**
```
FUNCTION dailyTick(player, rivals):
  events = []

  FOR EACH block IN blocks:
    // Player crew presence builds control
    crewCount = block.crewStationed.length
    IF crewCount > 0:
      controlGain = crewCount * 2  // +2% per crew per day
      block.control.player = min(block.control.player + controlGain, 100)
      // Reduce rival control proportionally
      FOR EACH rivalId IN block.control:
        IF rivalId != 'player' AND rivalId != 'neutral':
          block.control[rivalId] = max(block.control[rivalId] - controlGain, 0)

    // Undefended player blocks decay
    IF crewCount == 0 AND block.control.player > 0:
      block.control.player = max(block.control.player - 1, 0)  // -1%/day
      block.control.neutral = min(block.control.neutral + 1, 100)

    // Calculate block income
    IF block.control.player >= 50:
      block.weeklyIncome = floor(block.control.player * 2)
    ELSE:
      block.weeklyIncome = 0

    // Check if block is contested
    IF block.control.player > 20:
      FOR EACH rivalId IN getActiveRivals():
        IF block.control[rivalId] > 20:
          events.push({ type: 'BLOCK_CONTESTED', block, rivals: [rivalId] })

  // Rival expansion AI
  FOR EACH rival IN rivals:
    rivalExpansionTick(rival)

  RETURN events
```

**Rival AI Expansion:**
```
FUNCTION rivalExpansionTick(rival):
  IF rival.threatPhase == 'passive':
    // Rival builds up in their own territory
    FOR EACH blockId IN rival.controlledBlocks:
      block = getBlock(blockId)
      block.control[rival.id] = min(block.control[rival.id] + 1, 100)

    // Check if should advance to probe
    IF rival.hostility > 30 OR player.reputation > rival.strength * 0.5:
      rival.phaseTimer -= 1
      IF rival.phaseTimer <= 0:
        rival.threatPhase = 'probe'
        rival.phaseTimer = 14  // 2 weeks in probe phase
        EMIT('rival_phase_change', { rival, phase: 'probe' })

  IF rival.threatPhase == 'probe':
    // Send scouts to player's adjacent blocks
    adjacentBlocks = getBlocksAdjacentTo(rival.controlledBlocks, player.controlledBlocks)
    IF adjacentBlocks.length > 0:
      EMIT('rival_scouts_spotted', { rival, blocks: adjacentBlocks })
    rival.phaseTimer -= 1
    IF rival.phaseTimer <= 0:
      rival.threatPhase = 'provoke'
      rival.phaseTimer = 7  // 1 week of provocations

  IF rival.threatPhase == 'provoke':
    // Vandalize player businesses, intimidate player's NPCs
    targetBlock = pickWeakestPlayerBlock()
    IF targetBlock:
      targetBlock.control.player -= 3
      EMIT('rival_provocation', { rival, block: targetBlock, type: 'vandalism' })
      // Player's racket NPCs in this block lose fear
      FOR EACH racket IN getRacketsInBlock(targetBlock.id):
        npc = getNPC(racket.targetNpcId)
        npc.fear -= 5
    rival.phaseTimer -= 1
    IF rival.phaseTimer <= 0:
      rival.threatPhase = 'attack'
      rival.phaseTimer = 3  // 3-day warning before attack

  IF rival.threatPhase == 'attack':
    rival.phaseTimer -= 1
    IF rival.phaseTimer <= 0:
      // Full attack on a player block
      targetBlock = pickWeakestPlayerBlock()
      EMIT('rival_attack', { rival, block: targetBlock })
      // Combat resolution: rival strength vs player defense
      playerDefense = targetBlock.crewStationed.length * 10 + targetBlock.control.player * 0.5
      rivalAttack = rival.strength * 0.3
      IF rivalAttack > playerDefense:
        // Rival wins
        targetBlock.control.player -= 30
        targetBlock.control[rival.id] += 30
        EMIT('territory_lost', { block: targetBlock, toRival: rival })
      ELSE:
        // Player defends
        rival.strength -= 5  // Lost crew in the attack
        EMIT('territory_defended', { block: targetBlock, rival })
      rival.threatPhase = 'passive'
      rival.phaseTimer = 21  // 3 weeks before next cycle
```

---

### 4.7 Combat System (`combat.js`)

**Purpose:** Handles turn-based confrontations, chase sequences, and mini-games.

```
CombatSystem {
  // Start a turn-based confrontation
  startCombat(player, opponent) → CombatState

  // Process a player action in combat
  playerAction(combatState, action) → CombatResult

  // Process opponent AI turn
  opponentTurn(combatState) → CombatResult

  // Start a chase sequence
  startChase(player, pursuer) → ChaseState

  // Process chase input
  chaseAction(chaseState, input) → ChaseResult

  // Lock pick mini-game
  startLockPick(difficulty) → LockPickState
  lockPickAttempt(state, timing) → LockPickResult
}
```

**Combat Resolution:**
```
FUNCTION playerAction(combatState, action):
  result = {}

  SWITCH action:
    CASE 'punch':
      hitChance = 80 + (player.skills.intimidation * 2)  // Intimidation helps in fights
      IF random(0, 100) < hitChance:
        combatState.opponent.hp -= 1
        result.hit = true
      ELSE:
        result.hit = false

    CASE 'grab':
      // Skip opponent's next turn
      grabChance = 60 + (player.skills.operations * 3)
      IF random(0, 100) < grabChance:
        combatState.opponentStunned = true
        result.stunned = true
      ELSE:
        result.stunned = false

    CASE 'flee':
      fleeChance = 50 + (player.skills.streetSmarts * 6)
      IF random(0, 100) < fleeChance:
        result.fled = true
        EMIT('combat_ended', { outcome: 'fled' })
        RETURN result
      ELSE:
        result.fled = false  // Failed to flee, lose this turn

    CASE 'talk':
      // De-escalation attempt
      deescalateChance = 20 + (player.skills.persuasion * 8) - (combatState.opponent.nerve * 0.3)
      IF random(0, 100) < deescalateChance:
        result.deescalated = true
        EMIT('combat_ended', { outcome: 'deescalated' })
        RETURN result

  // Track noise (combat attracts attention)
  combatState.rounds += 1
  IF combatState.rounds >= 3:
    EMIT('heat_change', { amount: 10, source: 'combat_noise' })
    combatState.policeAlerted = true

  // Check if opponent is down
  IF combatState.opponent.hp <= 0:
    EMIT('combat_ended', { outcome: 'player_won', opponent: combatState.opponent })

  RETURN result
```

---

### 4.8 Time System (`time.js`)

**Purpose:** Game clock. Drives day/night cycle, schedules, weekly ticks, NPC routines.

```
TimeSystem {
  gameTime: { day: number, hour: number, minute: number }
  realTimePerGameHour: number  // Milliseconds (default: ~12500ms = 5 min per day)

  // Advance time
  tick(deltaMs)

  // Skip time (rest at safe house)
  skipTo(targetHour)

  // Get time of day period
  getPeriod() → 'morning' | 'afternoon' | 'night' | 'late_night'

  // Check if specific time
  isNightTime() → boolean
}
```

**Time Tick & Event Dispatch:**
```
FUNCTION tick(deltaMs):
  oldHour = gameTime.hour
  oldDay = gameTime.day

  gameTime.minute += deltaMs / realTimePerGameMinute

  IF gameTime.minute >= 60:
    gameTime.hour += floor(gameTime.minute / 60)
    gameTime.minute = gameTime.minute % 60

    // Hourly events
    EMIT('hour_changed', { hour: gameTime.hour })
    EMIT('npc_schedule_update', { hour: gameTime.hour })

    // Late night fatigue
    IF gameTime.hour >= 0 AND gameTime.hour < 6:
      EMIT('player_fatigue', { hpLoss: 1 })

  IF gameTime.hour >= 24:
    gameTime.day += floor(gameTime.hour / 24)
    gameTime.hour = gameTime.hour % 24

    // Daily events
    EMIT('day_changed', { day: gameTime.day })
    EMIT('heat_daily_decay', {})
    EMIT('npc_daily_tick', {})
    EMIT('territory_daily_tick', {})
    EMIT('rival_daily_tick', {})

    // Weekly events (every 7 days)
    IF gameTime.day % 7 == 0:
      EMIT('weekly_tick', {})  // Triggers economy weekly cycle
```

---

### 4.9 Job System (`jobs.js`)

**Purpose:** Generates, tracks, and resolves jobs. Connects to economy for payouts, heat for risk, NPC for clients.

```
JobSystem {
  activeJobs: Job[]
  availableJobs: Job[]
  completedJobs: Job[]

  // Generate new jobs each day
  generateDailyJobs(player, contacts)

  // Accept a job
  acceptJob(jobId) → Job

  // Complete/fail a job
  resolveJob(jobId, outcome) → JobResult

  // Check time limits
  checkDeadlines(gameTime)
}
```

**Job Generation:**
```
FUNCTION generateDailyJobs(player, contacts):
  available = []
  jobCount = 2 + floor(player.repTier * 0.5) + contacts.length  // More contacts = more jobs

  FOR i = 0 TO min(jobCount, 5):  // Max 5 available at once
    jobType = weightedRandom({
      'theft': player.repTier <= 2 ? 30 : 10,
      'delivery': 25,
      'collection': player.repTier >= 2 ? 25 : 5,
      'deal': 20,
      'shakedown': player.repTier >= 2 ? 15 : 0,
      'heist': player.repTier >= 3 ? 10 : 0,
      'smuggling': player.repTier >= 4 ? 10 : 0,
    })

    job = generateJob(jobType, player.repTier)

    // Scale pay with rep tier
    job.pay = job.basePay * (1 + (player.repTier - 1) * 0.5)

    // Scale risk with heat
    job.stingChance = job.baseStingChance + (player.heat * 0.005)

    available.push(job)

  availableJobs = available
  EMIT('jobs_updated', { jobs: available })
```

---

## 5. System Interconnections — The Event Bus

```
EventBus {
  listeners: Map<EventName, Callback[]>

  on(event, callback)    // Subscribe
  off(event, callback)   // Unsubscribe
  emit(event, data)      // Publish
}
```

### Complete Event Flow Map

Every event, who emits it, and who listens:

```
EVENT                      │ EMITTED BY        │ LISTENED BY
───────────────────────────┼───────────────────┼─────────────────────────
heat_change                │ Interaction,      │ Heat System (update meter,
                           │ Economy, Combat,  │ check tier transitions,
                           │ NPC (witnesses)   │ spawn cops)
───────────────────────────┼───────────────────┼─────────────────────────
heat_tier_change           │ Heat System       │ NPC (cop spawning),
                           │                   │ Territory (raid checks),
                           │                   │ UI (visual changes)
───────────────────────────┼───────────────────┼─────────────────────────
rep_change                 │ Interaction, Job, │ Reputation System (tier
                           │ Combat, Territory │ check, unlock content)
───────────────────────────┼───────────────────┼─────────────────────────
tier_up                    │ Reputation System │ Job (new job types),
                           │                   │ NPC (new recruits spawn),
                           │                   │ Rival (hostility increase),
                           │                   │ UI (tier-up screen)
───────────────────────────┼───────────────────┼─────────────────────────
money_changed              │ Economy System    │ UI (update HUD),
                           │                   │ Heat (check dirty spend)
───────────────────────────┼───────────────────┼─────────────────────────
npc_state_changed          │ NPC System,       │ Economy (racket payment
                           │ Interaction       │ check), Territory (crew
                           │                   │ assignment), UI
───────────────────────────┼───────────────────┼─────────────────────────
crew_betrayal              │ NPC System        │ Heat (+25), Territory
                           │                   │ (info compromised),
                           │                   │ Economy (stash at risk),
                           │                   │ Rival (traitor joins them)
───────────────────────────┼───────────────────┼─────────────────────────
racket_collapsed           │ Economy System    │ Territory (control loss),
                           │                   │ Heat (+10 from report),
                           │                   │ NPC (domino fear decay)
───────────────────────────┼───────────────────┼─────────────────────────
rival_attack               │ Territory System  │ Combat (auto-resolve or
                           │                   │ player intervention),
                           │                   │ NPC (crew defense),
                           │                   │ UI (alert)
───────────────────────────┼───────────────────┼─────────────────────────
territory_lost             │ Territory System  │ Economy (income loss),
                           │                   │ Reputation (rep hit),
                           │                   │ NPC (crew morale drop)
───────────────────────────┼───────────────────┼─────────────────────────
player_arrested            │ Heat System,      │ Economy (cash seized),
                           │ Combat            │ Time (skip days),
                           │                   │ NPC (crew loyalty drop),
                           │                   │ Territory (rivals advance),
                           │                   │ Reputation (rep loss)
───────────────────────────┼───────────────────┼─────────────────────────
combat_ended               │ Combat System     │ NPC (update HP/alive),
                           │                   │ Heat (noise-based heat),
                           │                   │ Economy (loot if won),
                           │                   │ Reputation (+/- based on
                           │                   │ outcome)
───────────────────────────┼───────────────────┼─────────────────────────
day_changed                │ Time System       │ Heat (passive decay),
                           │                   │ NPC (fear/loyalty decay,
                           │                   │ betrayal check, witness
                           │                   │ processing), Territory
                           │                   │ (daily tick), Rival
                           │                   │ (phase timer)
───────────────────────────┼───────────────────┼─────────────────────────
weekly_tick                │ Time System       │ Economy (salary, rackets,
                           │                   │ fronts, income/expense),
                           │                   │ Job (refresh available)
───────────────────────────┼───────────────────┼─────────────────────────
front_raided               │ Economy System    │ Heat (attention spike),
                           │                   │ Economy (launder capacity
                           │                   │ offline), UI (alert)
───────────────────────────┼───────────────────┼─────────────────────────
witness_reported           │ NPC System        │ Heat (+8 to +15),
                           │                   │ Job (evidence linked)
```

---

## 6. Complete Logic Flows (Pseudo-Code)

### Flow 1: Player Shakes Down a Shop Owner

```
1.  Player presses [E] near shop owner NPC
2.  InteractionSystem.getAvailableActions(player, shopOwner)
    → Returns: [TALK, THREATEN, BRIBE, OFFER_PROTECTION]
    → (SHAKEDOWN unlocked because player.repTier >= 2)
3.  UI renders dialogue wheel
4.  Player selects [THREATEN — "Pay $300/week or else"]
5.  InteractionSystem.executeAction(THREATEN, player, shopOwner):
    a. skillCheck('intimidation', player.skills.intimidation, shopOwner.nerve)
       → intimidation = 1, nerve = 45
       → baseChance = 40 + (1 * 8) - (45 * 0.4) = 40 + 8 - 18 = 30
       → chance = clamp(30, 10, 95) = 30%
       → roll = 22 → SUCCESS (22 < 30)
    b. On success:
       → EMIT('npc_state_changed', { npc: shopOwner, fear: +30, loyalty: -10 })
       → NPCSystem updates: shopOwner.fear = 0 + 30 = 30, shopOwner.loyalty = 50 - 10 = 40
    c. Check witnesses:
       → 2 civilians in range. Each becomes a witness.
       → civilian1.isWitness = true, civilian1.witnessedCrime = 'shakedown_123'
       → civilian2.isWitness = true, civilian2.witnessedCrime = 'shakedown_123'
    d. EMIT('heat_change', { amount: 8, source: 'threaten_public' })
       → HeatSystem: player.heat = 12 + 8 = 20
       → Tier transition: cold → warm
       → EMIT('heat_tier_change', { tier: 'warm' })
       → Cop patrols begin in district
    e. Create racket:
       → EconomySystem creates Racket { target: shopOwner, payment: $300/week }
       → player.rackets.push(newRacket)
    f. EMIT('rep_change', { amount: 10, source: 'new_racket' })
       → ReputationSystem: player.reputation = 80 + 10 = 90
       → No tier change (still tier 1, need 100 for tier 2)
    g. EMIT('territory_change', { block: shopOwner.currentBlock, player: +5 })
       → TerritorySystem: block.control.player = 25 + 5 = 30

6.  Later (next day tick):
    → NPCSystem.processWitnesses():
      → civilian1: reportChance = 60 - (0 * 0.8) = 60%. Roll 35. Reports.
        → EMIT('heat_change', { amount: 11, source: 'witness_report' })
        → player.heat = 20 + 11 = 31 (still 'warm')
      → civilian2: reportChance = 60%. Roll 72. Stays silent (for now).

7.  End state after shakedown:
    Cash: unchanged (income starts next week)
    Heat: 31 (warm — patrols active)
    Rep: 90
    New racket: $300/week
    Territory: Block control +5%
    2 witnesses created, 1 reported
```

---

### Flow 2: Drug Deal Goes Wrong (Sting + Chase + Arrest)

```
1.  Player accepts deal job. Picks up product from Rico (supplier).
    → player.inventory.push(Item { type: 'contraband', value: 350, heatIfCarried: 15 })

2.  Player arrives at Maple Park at 11 PM. Buyer NPC present.
    → TimeSystem confirms: gameTime.hour == 23. Job time window valid.

3.  Player selects [SELL — standard price]

4.  JobSystem checks for sting:
    → stingChance = 0.05 + (player.heat * 0.005)
    → player.heat = 31
    → stingChance = 0.05 + 0.155 = 0.205 (20.5%)
    → roll = 0.14 → STING TRIGGERED (0.14 < 0.205)

5.  Street Smarts detection check:
    → detectChance = player.skills.streetSmarts * 0.12 = 0 * 0.12 = 0%
    → Player has no Street Smarts — does NOT detect the sting
    → (If player had selected [ABORT] and had streetSmarts >= 2, they'd have escaped clean)

6.  Sting triggers:
    → Buyer reveals badge. 2 cop NPCs close in.
    → UI shows: [FLEE] [SURRENDER]

7.  Player selects [FLEE]:
    → CombatSystem.startChase(player, cops):
      → baseSuccess = 50 + (player.skills.streetSmarts * 6) = 50%
      → Night bonus: +10% = 60%
      → Low population (park): +10% = 70%
      → BUT player.heat > 30: -5% = 65%
      → Chase mini-game: player must hit 3/5 correct turns
      → Player hits 2/5 → FAIL

8.  Arrest:
    → EMIT('player_arrested', { charges: ['possession', 'dealing'], evidence: true })

    a. EconomySystem:
       → dirtyOnPerson = player.cash.dirty = $1,400
       → seized = floor(1400 * 0.5) = $700
       → player.cash.dirty = $700
       → Contraband removed from inventory
       → bail = $500 * (1 + player.arrestRecord) = $500 * 1 = $500
       → player.cash.dirty -= $500 → player.cash.dirty = $200
       → player.arrestRecord += 1

    b. TimeSystem:
       → skipDays = 2 + player.arrestRecord = 2 + 1 = 3
       → gameTime.day += 3
       → All daily ticks fire for skipped days

    c. ReputationSystem:
       → EMIT('rep_change', { amount: -20, source: 'arrested' })
       → player.reputation = 90 - 20 = 70

    d. NPCSystem:
       → FOR EACH crew: crew.loyalty -= 8 (boss got busted)
       → Rico (supplier): rico.trust -= 10 (player got caught with his product)

    e. HeatSystem:
       → player.heat += 15 (arrest generates paperwork/attention)
       → BUT 3 days passed: heat -= 3 (passive decay)
       → Net heat: 31 + 15 - 3 = 43 → tier: 'hot'
       → Detectives now active

    f. TerritorySystem (during 3 skipped days):
       → Rival daily ticks fire 3 times
       → If Kostarov was in 'provoke' phase:
         → Player's weakest block loses 3 * 3 = 9% control
       → Undefended blocks decay 3%

9.  End state after arrest:
    Cash: $200 dirty (was $1,400)
    Heat: 43 (hot — detectives active)
    Rep: 70 (dropped from 90)
    Inventory: contraband seized
    Time: 3 days lost
    Crew: loyalty -8 each
    Supplier trust: -10
    Territory: potentially -9% to -12% on blocks
```

---

### Flow 3: Crew Betrayal Cascade

```
1.  TRIGGER: Dex loyalty = 15 (below 20 for 14+ days)
    → NPCSystem.checkBetrayals(player):
      → betrayalChance = (20 - 15) * 3 = 15%
      → roll = 8 → BETRAYAL TRIGGERED

2.  Betrayal type selection:
    → Dex was assigned to Block A (knows safe house location, racket details)
    → type = 'snitch' (most common for low-loyalty crew)

3.  Betrayal event fires DURING a job:
    → Player accepts a collection job. Walks to location.
    → Instead of target NPC, empty room + note: "You've been set up. — D"
    → EMIT('crew_betrayal', { traitor: dex, type: 'snitch', info: compromisedData })

4.  Cop ambush:
    → 2 cop NPCs spawn at exits
    → UI: [SPRINT TO WINDOW] [FIGHT] [SURRENDER] [BLUFF]
    → Player selects [SPRINT TO WINDOW]:
      → Agility check: 40 + (streetSmarts * 8) = 40%
      → roll = 35 → SUCCESS (barely)

5.  Escape aftermath:
    a. HeatSystem:
       → EMIT('heat_change', { amount: 25, source: 'betrayal_ambush' })
       → player.heat = 43 + 25 = 68 → tier: 'blazing'
       → EMIT('heat_tier_change', { tier: 'blazing' })
       → Front raid checks intensify
       → Undercover risk active

    b. NPCSystem:
       → dex removed from player.activeCrew
       → dex.worksFor = 'kostarov'
       → dex.isSnitch = true
       → dex role changed to 'rival' (now hostile)

    c. Compromised information:
       → dex knew: safeHouse location, Block A racket details, crew roster
       → EMIT('safe_house_compromised', { safeHouseId, timeToRaid: 2 })
       → In 2 days: cops raid safe house
         → IF player hasn't moved stash: player.cash.stashed = 0
         → safeHouse.isCompromised = true (must buy new one)
       → Rackets in Block A: all target NPCs contacted by cops
         → Each racket NPC fear -= 20 (cops offered protection from player)

    d. TerritorySystem:
       → Block A: crewStationed removes Dex
       → block.isDefended = false
       → Kostarov receives intel on player's weak points
       → rival.hostility += 20
       → IF rival.threatPhase == 'passive': advance to 'probe'

    e. ReputationSystem:
       → EMIT('rep_change', { amount: -15, source: 'crew_betrayal' })
       → Public humiliation — boss got ratted out

6.  Player must now:
    → Move stash from safe house (2-day window)
    → Re-establish rackets (fear decayed)
    → Deal with 'blazing' heat (68)
    → Handle Kostarov's accelerated aggression
    → Optionally: hunt Dex (revenge mission chain)

7.  End state:
    Cash: on person unchanged, stash at risk
    Heat: 68 (blazing — fronts being raided, undercover active)
    Rep: -15 from betrayal
    Crew: -1 member, remaining crew loyalty -5 (shaken)
    Territory: Block A undefended, rackets destabilized
    Rival: hostility spiked, phase accelerated
    Safe house: 2-day countdown to raid
```

---

## 7. File / Module Map

```
crime-empire-game/
├── index.html              # Entry point, canvas setup
├── css/
│   └── styles.css          # HUD, menus, dialogue wheel styling
├── js/
│   ├── main.js             # Game init, main loop, canvas setup
│   ├── state.js            # Central game state (single source of truth)
│   ├── events.js           # Event bus implementation
│   ├── systems/
│   │   ├── interaction.js  # Dialogue wheel, skill checks, action routing
│   │   ├── npc.js          # NPC state, schedules, decay, betrayal, witnesses
│   │   ├── economy.js      # Money, rackets, fronts, laundering, weekly tick
│   │   ├── heat.js         # Heat meter, cop behavior, tier transitions
│   │   ├── reputation.js   # Rep tracking, tier unlocks, skill points
│   │   ├── territory.js    # Block control, rival AI, passive income
│   │   ├── combat.js       # Turn-based fights, chases, lock-pick mini-game
│   │   ├── time.js         # Game clock, day/night, scheduling
│   │   └── jobs.js         # Job generation, tracking, resolution
│   ├── entities/
│   │   ├── player.js       # Player data model + methods
│   │   ├── npc-data.js     # NPC templates, spawn tables
│   │   ├── items.js        # Item definitions
│   │   └── districts.js    # Map data, block definitions, POIs
│   ├── ui/
│   │   ├── hud.js          # Cash, heat, rep, crew, minimap display
│   │   ├── phone.js        # Burner phone UI (jobs, contacts, finances)
│   │   ├── dialogue.js     # Dialogue wheel renderer
│   │   └── notifications.js # Toast messages, alerts, events
│   ├── render/
│   │   ├── renderer.js     # Canvas rendering engine
│   │   ├── sprites.js      # Procedural pixel art generation
│   │   ├── camera.js       # Camera follow, zoom
│   │   └── lighting.js     # Day/night lighting, streetlights
│   └── audio/
│       └── audio.js        # Web Audio API — ambient, stingers, music
├── GAME_DESIGN.md          # High-level design document
├── SYSTEMS_ARCHITECTURE.md # This file
└── saves/                  # localStorage save structure (virtual)
```

**Estimated LOC per module:**

| Module | Est. LOC | Complexity |
|--------|---------|-----------|
| main.js | ~200 | Low |
| state.js | ~150 | Low |
| events.js | ~60 | Low |
| interaction.js | ~500 | High |
| npc.js | ~600 | High |
| economy.js | ~450 | High |
| heat.js | ~300 | Medium |
| reputation.js | ~200 | Medium |
| territory.js | ~500 | High |
| combat.js | ~400 | High |
| time.js | ~150 | Low |
| jobs.js | ~350 | Medium |
| player.js | ~150 | Low |
| npc-data.js | ~300 | Medium (data-heavy) |
| items.js | ~100 | Low |
| districts.js | ~200 | Medium (data-heavy) |
| hud.js | ~300 | Medium |
| phone.js | ~350 | Medium |
| dialogue.js | ~250 | Medium |
| notifications.js | ~100 | Low |
| renderer.js | ~500 | High |
| sprites.js | ~400 | High |
| camera.js | ~100 | Low |
| lighting.js | ~150 | Medium |
| audio.js | ~200 | Medium |
| styles.css | ~200 | Low |
| index.html | ~50 | Low |
| **TOTAL** | **~7,160** | |
