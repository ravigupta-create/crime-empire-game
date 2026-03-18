# Crime Empire — Game Design Document

## Overview
**Genre:** Open-world crime strategy / simulation
**Platform:** Browser (pure HTML/CSS/JS, zero dependencies, 100% free)
**Perspective:** Top-down 2D
**Theme:** Rise from street-level hustler to untouchable crime lord

---

## 1. Core Gameplay Loop — Concrete Playable Breakdown

```
SCOUT → PLAN → EXECUTE → PROFIT → EXPAND → DEFEND
  ↑                                              |
  └──────────────────────────────────────────────┘
```

Every cycle raises **Heat** and **Reputation** — the twin currencies of risk and reward.

---

### 1.1 PHASE 1 — First 5 Minutes (Tutorial / Cold Open)

**The screen:** Black. A text crawl types out:

> *"You just got out. No crew. No cash. No rep. The Row doesn't care who you were. It only cares what you do next."*

The player's sprite fades in on a rain-slicked street corner in **The Row — Block A**. Night time. A few civilians walk past. The HUD fades in piece by piece:

| HUD Element | Starting Value | Position |
|------------|---------------|----------|
| Cash | $0 | Top-left |
| Heat | 0/100 | Top-left, below cash |
| Rep | 0 (Street Rat) | Top-left, below heat |
| Mini-map | The Row, Block A | Bottom-right |
| Time of Day | 10:00 PM | Top-right |
| Crew | Empty (0/1 slots) | Bottom-left |

---

#### Minute 0:00–1:00 — Movement & World Introduction

**What the player does:**
- WASD/arrow keys to move the sprite through the street
- The camera follows top-down; streetlights cast pixel-art light cones
- 3 civilians walk on fixed paths. One NPC has a **yellow icon** above their head (interactable)

**What the player sees:**
- Boarded-up shops, a flickering neon "PAWN" sign, a dumpster-lined alley
- A **tooltip** appears: *"Approach NPCs with a [!] or [?] icon to interact. Use [E] or click."*
- One alley entrance glows faintly — labeled **"?"** on the mini-map (undiscovered location)

**What the player clicks:**
- Walk toward the yellow-icon NPC standing under a pawn shop awning
- Press **[E]** to interact

**NPC: Marcus "The Fence" Delgado**
> *"You look like you need money and I look like I need product. Funny how that works."*

The **dialogue wheel** appears for the first time — but only 2 options are lit (the rest are locked/greyed out with "Requires Rep 2" etc.):

```
        [Talk]
          |
[Locked] -●- [Locked]
          |
       [Leave]
```

**Player clicks [Talk]:**
> Marcus: *"See that parked car across the street? Blue sedan. Owner's inside the bar — won't be out for an hour. Pop the trunk, bring me what's inside. I'll give you $150. Easy."*

**A job marker** appears on the mini-map: blue diamond, 40 meters away.

**System taught:** Movement, NPC interaction, job acceptance.

---

#### Minute 1:00–2:30 — First Job: Car Trunk Theft

**What the player does:**
- Walk to the blue sedan (highlighted with a subtle outline)
- Press **[E]** near the trunk → a **mini-game** starts:

**Lock Pick Mini-Game (Simple):**
```
┌─────────────────────────────┐
│  ◄━━━━━━━━●━━━━━━━━━━━━━►  │  ← A cursor bounces left/right
│         [GREEN ZONE]         │  ← Hit [SPACE] when cursor is in the green zone
│  Attempt 1/3                 │  ← 3 tries before the alarm triggers
└─────────────────────────────┘
```

- **Success:** Trunk pops open. Player receives: *Stolen Electronics (value: ~$150)*
- **Fail (all 3 attempts):** Car alarm blares. +5 Heat. A civilian turns to look. Player must flee or wait it out.

**After grabbing the item:**
- A **toast notification** appears: *"Stolen Electronics acquired. Bring to Marcus."*
- Walk back to Marcus, press **[E]**

**Marcus:**
> *"Not bad. Here's your cut."*

**Screen flash:** `+$150 Cash | +10 Rep`

**Player's HUD now:** Cash: $150 | Heat: 2 | Rep: 10

**System taught:** Jobs, lock-pick mini-game, loot, rewards, heat consequences on failure.

---

#### Minute 2:30–3:30 — The Phone & Job Board

Marcus hands the player a **burner phone** (new HUD element, bottom-center):

> Marcus: *"Keep this. Jobs come through here. And stay off the main streets — cops cruise Block B after midnight."*

**The phone UI** slides up (player can toggle it with **[TAB]**):

```
┌──────────────────────────┐
│  BURNER PHONE             │
│ ─────────────────────────│
│  📋 Jobs (1 new)          │
│  👤 Contacts (1)          │
│  🗺️ Map                   │
│  💰 Finances              │
│  ⚙️ Settings              │
└──────────────────────────┘
```

**Player clicks Jobs:**

```
┌──────────────────────────────────────┐
│  AVAILABLE JOBS                       │
│ ─────────────────────────────────────│
│                                       │
│  [!] Corner Delivery                  │
│  Client: Unknown                      │
│  Pay: $200                            │
│  Risk: Low                            │
│  "Pick up a package from the alley    │
│   behind Rosie's Diner. Deliver to    │
│   the man in the red jacket at the    │
│   bus stop on 4th. Don't open it."    │
│                                       │
│  [ACCEPT]  [DECLINE]                  │
└──────────────────────────────────────┘
```

**Player clicks [ACCEPT].** Job marker appears on mini-map.

**System taught:** Phone UI, job board, risk indicators.

---

#### Minute 3:30–5:00 — First Drug Delivery (First Real Choice)

**What the player does:**
- Walk to the alley behind Rosie's Diner (marked on map)
- A **crate** glows on the ground → press **[E]** to pick up: *"Unmarked Package"*
- Walk toward the bus stop on 4th Street

**Mid-delivery event — the first REAL CHOICE:**

Halfway there, a **random civilian** steps into the player's path:

> Civilian (nervous): *"Hey... hey. I know what's in that bag. I saw you grab it. I'm calling the cops unless you make it worth my while."*

**Dialogue wheel — 4 options this time:**

```
       [Bribe - $50]
           |
[Threaten] ●  [Ignore & Walk Away]
           |
     [Talk Down]
```

**Option A — Bribe ($50):**
> Civilian: *"Smart choice."* (walks away)
> Result: −$50 cash. No heat. Witness neutralized.

**Option B — Threaten:**
> Player: *"You didn't see anything. And if you think you did, remember — I know where this bus stop is."*
> **Intimidation check:** Player's Intimidation skill is 0 (base). Roll against civilian's nerve (low).
> **Success (70% chance):** Civilian backs off. +3 Fear on this NPC. +2 Heat (threatening is noisy).
> **Fail (30% chance):** Civilian runs. +8 Heat (they report you). A cop patrol marker appears nearby on the mini-map — player has 30 seconds to complete the delivery or abort.

**Option C — Ignore & Walk Away:**
> Civilian pulls out a phone. +10 Heat. Cop patrol spawns in 60 seconds.

**Option D — Talk Down (Persuasion):**
> Player: *"Relax. It's takeout from Rosie's. You think I'm out here running drugs in a t-shirt?"*
> **Persuasion check:** skill 0 vs. civilian suspicion.
> **Success (50% chance):** Civilian shrugs, walks away. 0 heat. 0 cost. Best outcome.
> **Fail:** Civilian doesn't buy it. Reverts to Bribe/Threaten/Ignore options.

**Player completes delivery** (assuming no arrest):
- Red jacket man at bus stop: *"On time. Good."*
- **Screen flash:** `+$200 Cash | +15 Rep | +3 Heat`

**Player's HUD now:** Cash: $300 | Heat: 5–15 (depending on choices) | Rep: 25

**System taught:** Dialogue choices with real mechanical consequences, skill checks, witness system, heat as a direct result of player decisions.

---

### 1.2 PHASE 2 — First 30 Minutes (Early Game Loop)

By minute 5, the player has: ~$300 cash, Rep 25, Heat 5–15, the burner phone, Marcus as a contact, and freedom to roam The Row's 4 blocks.

#### Minutes 5–10: The Job Ecosystem Opens Up

The phone buzzes with 2–3 new jobs. Jobs rotate every in-game day (1 day = ~5 real minutes). The player picks from a mix:

---

**JOB TYPE: Debt Collection**
```
┌────────────────────────────────────────────┐
│  COLLECT FROM: "Jimmy Two-Shoes"            │
│  OWES: $400 to an unnamed client            │
│  YOUR CUT: 40% ($160)                       │
│  LOCATION: Apartment 3B, Greystone Complex  │
│  RISK: Medium — Jimmy has a temper           │
└────────────────────────────────────────────┘
```

**Step-by-step:**
1. Player walks to Greystone Complex (2 blocks away). Enters the building (interior loads).
2. Knocks on door 3B. Jimmy answers.

> Jimmy: *"I don't have it. Come back next week."*

**Dialogue wheel:**

| Option | What Happens | Outcome |
|--------|-------------|---------|
| **[Talk — "Payment plan"]** | Offer to take $200 now, $200 next week | +$80 now, +$80 later (must return). Jimmy loyalty +10. No heat. |
| **[Threaten — "Pay now or else"]** | Intimidation check (60% success at skill 0) | **Success:** Jimmy pays $400. Your cut: $160. +5 Heat, +20 Fear on Jimmy. **Fail:** Jimmy pulls a knife. Combat encounter (see below). |
| **[Bribe — "I'll reduce it to $300"]** | Forgive $100 of debt | Your cut drops to $120, but Jimmy is grateful. Loyalty +15. Can recruit him later. |
| **[Search apartment]** | Requires Jimmy to be intimidated or knocked out | Find $400 in a shoebox under the bed + a stolen watch (fence for $75). +8 Heat if Jimmy reports. |

**If combat triggers (Jimmy pulls a knife):**

```
┌─────────────────────────────────────┐
│  CONFRONTATION — Jimmy Two-Shoes     │
│                                      │
│  Jimmy: ❤️❤️❤️ (3 HP)               │
│  You:   ❤️❤️❤️❤️❤️ (5 HP)           │
│                                      │
│  [Punch]  → 1 damage, 80% hit       │
│  [Grab]   → Restrain, skip his turn  │
│  [Flee]   → Escape, job failed       │
│  [Talk]   → De-escalate (Persuasion) │
│                                      │
│  ⚠️ Noise attracts attention after   │
│     3 rounds (+10 Heat)              │
└─────────────────────────────────────┘
```

- Combat is **turn-based**, 1 action per turn
- If player wins: Jimmy is knocked out. Loot the $400 + anything in the apartment. +12 Heat.
- If player loses: black out, wake up outside with −$100 (Jimmy robbed you). −5 Rep (humiliating).

---

**JOB TYPE: Drug Deal (Corner Sale)**
```
┌─────────────────────────────────────────────┐
│  MEET BUYER: "College kid, west end of      │
│  Maple Park, 11 PM"                         │
│  PRODUCT: 1 unit (provided by Supplier)     │
│  SALE PRICE: $350                           │
│  YOUR CUT: $150 (Supplier keeps $200)       │
│  RISK: Low — but buyer might be sketchy     │
└─────────────────────────────────────────────┘
```

**Step-by-step:**
1. Visit Supplier NPC ("Rico") at his location first. He hands you the product.
> Rico: *"Don't sample the merchandise. And if anything feels off — walk. I'm not losing product over some college kid."*

2. Go to Maple Park at 11 PM (the in-game clock matters — arrive early and wait, or arrive late and the buyer leaves = job failed, Rico's loyalty −5).

3. Buyer approaches:
> Buyer: *"You got it?"*

**Dialogue wheel:**

| Option | What Happens |
|--------|-------------|
| **[Sell — standard price]** | Clean deal. +$150 cash. +8 Rep. +3 Heat. |
| **[Upsell — "Price went up"]** | Persuasion check. **Success:** +$220 instead of $150. **Fail:** Buyer walks. Job failed. Rico −5 loyalty. |
| **[Rob the buyer]** | Take his money ($350) AND keep the product. +$350 cash, product to resell. +15 Heat. Buyer spreads the word — future buyers less likely to show. Rico furious (−20 loyalty). |
| **[Abort — "Something's off"]** | If Street Smarts ≥ 2, you notice an unmarked car. Aborting saves you from a sting. If Street Smarts < 2, the abort is just paranoia — you lose the sale for nothing. |

**Sting scenario (5% base chance, rises with Heat):**
- If player proceeds with the deal and it's a sting: immediate cop confrontation
- **Flee:** Chase mini-game (mash [SPACE] to sprint, choose left/right at intersections). Success = escape, +15 Heat. Fail = busted.
- **Surrender:** Arrested. Lose product + dirty cash. −20 Rep. Pay $500 bail or skip 2 in-game days in holding.

---

**JOB TYPE: Shakedown / Protection Racket**
```
┌────────────────────────────────────────────┐
│  TARGET: Chen's Corner Store, Block B       │
│  DEMAND: $300/week "protection fee"         │
│  DIFFICULTY: Mr. Chen is stubborn           │
│  REWARD: $300/week passive income           │
│  RISK: High visibility location             │
└────────────────────────────────────────────┘
```

**Step-by-step:**
1. Enter Chen's Corner Store. 2 civilians browsing inside.
2. Approach Mr. Chen behind the counter.

> Mr. Chen: *"What do you want? I'm busy."*

**Dialogue wheel:**

| Option | Outcome |
|--------|---------|
| **[Talk — "Nice place. Be a shame if something happened."]** | Subtle threat. Persuasion check. **Success:** Chen agrees to $200/week (less than target, but no heat). **Fail:** Chen tells you to get out. |
| **[Threaten — slam hand on counter]** | Intimidation check. **Success:** Chen agrees to $300/week. +8 Heat. Civilians flee (witnesses — may report). **Fail:** Chen reaches for a bat under the counter. Choose: fight, back down, or escalate. |
| **[Offer protection — "Rival gangs hit shops like this"]** | Genuine offer. If the player has Rep > 50, Chen takes it seriously. He pays $250/week willingly. Loyalty builds. He becomes an informant over time. No heat. |
| **[Trash the store]** | Smash displays. Guaranteed compliance ($300/week). +15 Heat. −10 Rep in the neighborhood (civilians hostile). Chen secretly contacts rivals for help — this will come back to bite you in ~10 in-game days. |

**If Chen pays up:**
- A new entry appears in the phone under **Finances → Rackets**:
```
Chen's Corner Store — $300/week
Status: Active (paying)
Loyalty: 15  |  Fear: 60
⚠️ If fear drops below 30, Chen may stop paying or report you.
```
- Every in-game week, $300 auto-deposits (minus laundering if routed through a front)

---

#### Minutes 10–15: First Crew Recruitment & Safe House

**The bar scene:**
The player enters **Rusty's Bar** (Point of Interest in Block A). Several NPCs inside. One has a recruitment icon (green [+] above head).

**NPC: "Dex" — Small-time Lookout**

> Dex: *"I heard you've been making moves. I'm stuck washing dishes here for $80 a week. Whatever you're paying, it's gotta be better than this."*

**Recruitment dialogue:**

| Option | Cost | Outcome |
|--------|------|---------|
| **[Recruit — $100/week salary]** | $100/week ongoing | Dex joins as Lookout. Crew slot 1/1 filled. Loyalty starts at 40. |
| **[Lowball — $50/week]** | $50/week | Dex joins reluctantly. Loyalty starts at 20 (betrayal risk zone). |
| **[Promise a big cut later]** | $0 now, owes a favor | Dex joins. Loyalty 30. If player doesn't deliver a $500+ payday within 2 weeks, Dex leaves and spreads bad word (−10 Rep). |
| **[Decline]** | $0 | Dex stays at the bar. Can return later. |

**What Dex does once recruited:**
- Assign him to jobs for a bonus (lookout = +15% chance to spot cops/traps during operations)
- Assign him to a block for passive territory control (+2% control/day)
- He has a loyalty tick every in-game week: paid on time → +3 loyalty. Missed payment → −10 loyalty. Successful job → +5 loyalty. Failed job where he gets hurt → −8 loyalty.

**Safe house purchase:**
Marcus texts the phone:
> *"Apartment on Greystone, 2nd floor. $800 and it's yours. Good for stashing cash and laying low."*

**Safe house features:**
- **Save game** (manual save point)
- **Stash:** Store dirty cash here (not on your person). If busted, cops seize what you're carrying, not your stash.
- **Rest:** Skip time forward (useful for waiting for night jobs or letting heat decay)
- **Heal:** Recover HP between confrontations

---

#### Minutes 15–25: Heat Starts Shaping Decisions

By now the player has done 4–6 jobs. Typical state:

| Stat | Value | What It Means |
|------|-------|--------------|
| Cash | $800–$1,500 | Enough for a front or to stockpile |
| Heat | 15–30 (Warm) | Cops are starting to notice |
| Rep | 60–90 | Approaching Hustler tier |
| Crew | 1 member (Dex) | 1 lookout |
| Territory | Block A: 25% control | Passive presence from crew |

**Heat changes the world visually and mechanically:**

**At Heat 20 ("Warm"):**
- A **cop patrol car** now slowly cruises Block B every 90 seconds (visible on mini-map as a blue dot)
- Civilians are slightly less willing to interact (Persuasion checks +5% harder)
- The phone buzzes with a tip from Marcus: *"Cops asked about you at the pawn shop. Might want to cool it for a day or buy yourself some breathing room."*

**Player's heat-management options at this stage:**

| Action | Cost | Heat Reduction | Side Effects |
|--------|------|---------------|-------------|
| Lay low (skip 1 in-game day at safe house) | Time | −3 Heat | Miss a day of jobs/income. Rivals advance. |
| Bribe a beat cop | $200 | −8 Heat | Cop becomes contact. But if HE gets investigated later, heat spikes +15. |
| Visit the Forger (unlocks at Rep 50) | $300 | −10 Heat | One-time use. Forger has a 3-day cooldown. |
| Route racket money through a front | $5,000 (front cost) | Prevents future spend-heat | Only worth it once income is steady. |
| Stop doing jobs | Free | Passive −1/day | No income. Crew unpaid. Loyalty drops. |

**The tension:** The player NEEDS money to pay crew, buy the safe house, save for a front — but every job raises heat. The player must decide: grind fast and deal with cops, or pace themselves and risk rivals gaining ground.

---

#### Minutes 25–30: Rival Encounter & The World Pushes Back

**Scripted event at ~Rep 80:**

The player is walking through Block C (the border between The Row and Old Quarter). A cutscene triggers:

> Three NPCs step out of a doorway. The lead one is **Viktor**, an enforcer for **The Kostarov Crew** (Rival B — controls Old Quarter).

> Viktor: *"You've been busy. My boss noticed. He doesn't like new players in The Row — makes the borders feel... thin."*

**Dialogue wheel — this one matters:**

| Option | Immediate Result | Long-Term Consequence |
|--------|-----------------|---------------------|
| **[Respectful — "I'm not looking for trouble"]** | Viktor nods. *"Keep it that way."* He leaves. | Kostarov ignores you for ~5 in-game weeks. Buys time to build up. But your crew sees you as soft (Dex loyalty −5). |
| **[Defiant — "The Row is mine. Tell your boss."]** | Viktor laughs. *"Bold. Stupid, but bold."* | +15 Rep (respect). Kostarov begins Probe phase in 2 weeks. Dex loyalty +5 (impressed). |
| **[Offer tribute — Pay $500]** | Viktor takes the money. *"Smart."* | Kostarov leaves you alone for ~8 weeks. −$500. No rep gain. If you ever stop paying, they attack immediately. |
| **[Threaten — "Touch my blocks and I'll burn yours"]** | Viktor pulls a gun. Standoff. Intimidation check (hard — 30% at skill 0). **Success:** Viktor backs down. +25 Rep. Kostarov cautious. **Fail:** Viktor pistol-whips you. −2 HP. +20 Heat (gunfire). Kostarov moves to Provoke phase immediately. |

**After this encounter, the game opens fully.** The tutorial gloves are off. The player now juggles:
- Active jobs for income
- Crew salary payments every week
- Heat management
- Rival threat timeline
- Territory expansion decisions

---

### 1.3 PHASE 3 — Ongoing Gameplay Loop (Post-30 Minutes)

The player has entered the **self-directed loop**. No more scripted events (except major story beats at Rep milestones). Every in-game day (~5 real minutes), the player runs through this decision cycle:

#### The Daily Cycle

```
┌─────────── MORNING (6 AM – 12 PM) ───────────┐
│ • Check phone: new jobs, messages, payments    │
│ • Collect racket income (auto-deposited)       │
│ • Pay crew salaries (weekly, auto-deducted)    │
│ • Review territory map: any rival movement?    │
│ • Plan: which jobs to run today?               │
└───────────────────────────────────────────────┘
          ↓
┌─────────── AFTERNOON (12 PM – 6 PM) ─────────┐
│ • Run 1–2 jobs (deals, collections, heists)    │
│ • Visit contacts (buy gear, get intel)         │
│ • Recruit new crew if slots available          │
│ • Manage fronts (check launder capacity)       │
└───────────────────────────────────────────────┘
          ↓
┌─────────── NIGHT (6 PM – 12 AM) ─────────────┐
│ • High-risk/high-reward jobs available         │
│ • Fewer civilians = fewer witnesses            │
│ • But cop patrols intensify in hot areas       │
│ • Rival activity increases at night            │
│ • Best time for heists and smuggling           │
└───────────────────────────────────────────────┘
          ↓
┌─────────── LATE NIGHT (12 AM – 6 AM) ────────┐
│ • Most civilians gone — almost no witnesses    │
│ • Highest-risk jobs (break-ins, ambushes)      │
│ • Player fatigues if no rest (−1 HP/hour)     │
│ • Ideal for laying low if heat is high         │
│ • Safe house rest to skip to morning           │
└───────────────────────────────────────────────┘
```

---

#### Repeatable Actions & Escalation Table

As Rep increases, the same actions scale in risk AND reward:

| Action | Rep 1–2 (Street Rat) | Rep 3–4 (Enforcer) | Rep 5–7 (Underboss+) |
|--------|---------------------|--------------------|--------------------|
| **Theft** | Car trunks, wallets ($50–200) | Warehouse burglary ($2K–5K) | Museum heist ($20K–50K, crew required) |
| **Deals** | Corner handoffs ($150–350) | Multi-kilo supply runs ($1K–5K) | Distribution network (passive $5K–20K/week) |
| **Collection** | Beat up a debtor ($160) | Enforce racket on a block ($300–2K/week) | Entire district tribute ($5K–15K/week) |
| **Intimidation** | Scare one civilian | Shut down a rival's front | Force a rival boss to kneel |
| **Bribery** | Beat cop ($200) | Detective ($1,000) | Judge / politician ($10K–50K) |
| **Violence** | Fistfight | Armed confrontation | Gang war (multi-block battle) |
| **Heat risk** | +2–8 per job | +5–15 per job | +10–25 per job |
| **Failure cost** | Lose $100, minor rep hit | Lose $1K+, crew injuries | Lose territory, crew deaths, arrest |

---

#### System Interactions — Moment-to-Moment Examples

**Example 1: The Snowball (everything goes right)**
1. Player completes a smuggling run at the docks → +$3,000 cash, +30 Rep, +8 Heat
2. Launders $2,000 through the restaurant front (−$240 laundering cut)
3. Uses clean money to bribe Detective Morrison → −12 Heat
4. With low heat, runs a shakedown on a Block C shop → +$500/week passive, +5 Heat
5. Stations Dex on Block C → territory control ticks up
6. End of day: more money, more territory, manageable heat. Snowball grows.

**Example 2: The Death Spiral (everything goes wrong)**
1. Player runs a drug deal at Heat 35 → deal is a sting (5% chance, but elevated by heat)
2. Flees from cops → chase mini-game. Fails. Arrested.
3. Loses $1,200 in dirty cash (seized). Pays $500 bail. −20 Rep.
4. While in holding (2 days skipped): Kostarov attacks Block B. Control drops from 40% to 15%.
5. Dex wasn't paid this week (player was broke). Loyalty drops to 18 — betrayal zone.
6. Player gets out. Dex leaked safe house location to Kostarov. Stash raided (−$800).
7. Player is broke, territory crumbling, no crew, heat still at 25. Must rebuild.

**Example 3: The Slow Burn (strategic play)**
1. Player lays low for 2 in-game days. Heat decays from 28 to 22.
2. Visits the Forger. Pays $300. Heat drops to 12 (Cold).
3. With cold heat, runs 3 clean deals back-to-back at night (fewer witnesses).
4. Earns $900 total. Heat only rises to 18 (stayed clean, no violence).
5. Invests $5,000 in a laundromat front. Future income generates less heat.
6. Begins recruiting a second crew member (just hit Rep 100 — Hustler tier, unlocks shakedowns + 2nd crew slot).

---

#### Specific Interaction Scenarios (Fully Scripted)

**SCENARIO: Threatening a Shop Owner Who Stopped Paying**

Mr. Chen (from the earlier shakedown) hasn't paid in 2 weeks. His fear decayed from 60 to 28.

Phone notification: *"Chen's Corner Store — PAYMENT OVERDUE (2 weeks). Loyalty: 8. Fear: 28."*

Player walks to the store. Chen is behind the counter, nervous.

> Chen: *"I... I can't keep paying. My wife found out. She's going to the police."*

**Dialogue wheel:**

| Option | Mechanics | Narrative Result |
|--------|----------|-----------------|
| **[Threaten Chen]** | Intimidation check (70% at skill 1). Cost: +6 Heat | **Success:** Chen pays double this week ($600) to make up. Fear resets to 70. But his wife DOES go to the cops → +15 Heat in 3 days (delayed). **Fail:** Chen snaps, throws a can at you. Mini-confrontation. |
| **[Threaten the wife]** | Auto-success (civilian wife, no resistance). Cost: +10 Heat, −15 Rep (crossing a line) | Chen pays AND his wife stays quiet. But word spreads — other business owners see you as a monster. Future shakedown Persuasion checks are +20% harder in this block. |
| **[Forgive the debt]** | $0 income from Chen going forward | Chen is grateful. Loyalty shoots to 60. He becomes a reliable informant — texts you when cops or rivals are in the area. Long-term strategic value. |
| **[Offer a smaller payment — $150/week]** | Reduced income, but sustainable | Chen agrees. Fear stays at 28 but loyalty rises to 35. Stable revenue. No heat. |
| **[Send crew member Dex to "remind" him]** | Dex handles it off-screen. Result depends on Dex's loyalty and skill | **Dex loyalty > 50:** Clean job. Chen pays. +4 Heat. **Dex loyalty < 30:** Dex takes the money for himself. You get nothing. Dex loyalty −10. |

---

**SCENARIO: Negotiating a Drug Supply Deal**

Player has reached Rep 150 (Hustler). Rico the Supplier introduces a new opportunity:

> Rico: *"I've got a new connect. Higher quality product, bigger margins. But the minimum order is $2,000 upfront. You move it, you keep 60%. That's $3,000 profit if you sell it all."*

**Phone shows the deal structure:**
```
┌─────────────────────────────────────────┐
│  SUPPLY DEAL — Rico's New Connect        │
│ ────────────────────────────────────────│
│  Upfront cost:  $2,000                   │
│  Product:       10 units                 │
│  Street price:  $500/unit                │
│  Total revenue: $5,000                   │
│  Your cut (60%): $3,000                  │
│  Net profit:    $1,000                   │
│                                          │
│  ⚠️ Must sell all 10 within 1 week or    │
│     product expires (total loss)         │
│  ⚠️ Each sale = +3–8 Heat               │
│  ⚠️ Carrying product when busted =      │
│     possession charge (heavy sentence)   │
│                                          │
│  [ACCEPT]  [NEGOTIATE]  [DECLINE]        │
└─────────────────────────────────────────┘
```

**If player clicks [NEGOTIATE]:**
> Player: *"60% is low. I'm the one taking the street risk."*
> Persuasion check:
> **Success:** Rico agrees to 70%. Profit jumps to $1,500.
> **Fail:** Rico: *"60 or nothing. I've got other buyers."* Take it or leave it.

**Selling the product (10 individual jobs over the week):**
- Each sale is a mini-encounter: walk to buyer, exchange, leave
- Some buyers are reliable (clean sale, +$500, +3 Heat)
- Some buyers are sketchy (50% chance of complication):
  - Buyer tries to rob you (combat encounter)
  - Buyer is an undercover cop (sting — flee or get busted)
  - Buyer pays in counterfeit bills (you don't find out until you try to spend — $0 from that sale)
- Player must choose: sell fast (more heat, more risk) or sell slow (safer, but risk not finishing in time)

---

**SCENARIO: Crew Betrayal**

Dex's loyalty has been below 20 for 2 weeks (player missed payments, failed a job where Dex got hurt). A betrayal event triggers.

**No warning.** The player starts a routine collection job. Arrives at the location.

> The target is already gone. The apartment is empty. On the table: a note.
> *"You've been set up. — D"*

**Cops burst in through two doors.** No dialogue wheel — this is a pure action moment.

```
┌────────────────────────────────────────┐
│  ⚠️ AMBUSH — 2 COPS, BLOCKED EXITS     │
│                                         │
│  [Sprint to window] → Agility check    │
│  [Fight through]    → Combat (hard)    │
│  [Surrender]        → Arrested         │
│  [Bluff — "Wrong apartment, officers"] │
│    → Persuasion check (very hard)      │
└────────────────────────────────────────┘
```

**Aftermath (if player escapes):**
- +25 Heat (massive spike)
- Dex is gone from crew roster. He's now marked as a **Snitch** NPC
- Any info Dex had (safe house location, racket details, crew roster) is compromised
- Cops may raid the safe house within 2 in-game days (move your stash!)
- Dex appears working for Kostarov 1 week later — he sold out to the rival

**Player can hunt Dex down later** (requires finding him through informants) — that's a whole separate mission chain.

---

#### Failure Scenarios — Complete Reference

| Failure | Trigger | Immediate Cost | Cascading Consequences |
|---------|---------|---------------|----------------------|
| **Busted (arrested)** | Caught by cops during a crime or sting | Lose carried cash + contraband. Pay bail ($500–$5,000) or skip 2–7 days. | −20 Rep. Crew unpaid during jailtime. Rivals advance. Lawyer costs $1K+ to reduce sentence. |
| **Lost fight** | Lose a combat encounter | −HP, wake up robbed (−$100–$500). | −5 Rep (word spreads). If hospitalized, miss 1 day. Attacker may take over your job/block. |
| **Failed job** | Botch a delivery, miss a deadline, target escapes | No pay. Client trust −10 to −20. | Fewer jobs offered by that contact. If repeated, contact cuts you off entirely. |
| **Missed crew payment** | Can't cover weekly salaries | Crew loyalty −10 per member. | Below loyalty 20 = betrayal risk. Below 0 = crew member leaves and may become hostile. |
| **Racket collapse** | Business owner stops paying (fear too low, reports to cops) | Lose passive income from that racket. +10 Heat. | Other rackets in the same block may also rebel (domino effect). Must re-intimidate or lose the block. |
| **Stash raided** | Cops raid safe house (high heat) or rival tips them off | Lose all stashed cash and contraband. | Must buy a new safe house ($800+). Old location burned. |
| **Rival takeover** | Rival attacks an undefended block and wins | Lose control of that block. Income from that block = 0. | Rival presence grows. They may push into adjacent blocks. Your crew morale drops. |
| **Full crew wipe** | All crew members killed or deserted | Back to solo operations. | Can't run crew-required jobs. Territory control bleeds. Must recruit from scratch. |
| **Inferno heat (80+)** | Accumulated heat from reckless play | Feds deploy. Arrest on sight. All fronts raided. | Essentially a "wanted" state. Player must flee to a safe district, lay low for multiple days, spend heavily on bribes/forger, or get arrested and eat the consequences. |

---

## 2. Progression Systems

### 2.1 Reputation (Player Level)
Reputation replaces XP. It represents your standing in the criminal underworld.

| Tier | Title | Rep Range | Unlocks |
|------|-------|-----------|---------|
| 1 | Street Rat | 0–99 | Petty theft, small deals, 1 crew slot |
| 2 | Hustler | 100–499 | Shakedowns, fencing, safe house |
| 3 | Enforcer | 500–1,499 | Heists, bribery, 3 crew slots |
| 4 | Lieutenant | 1,500–4,999 | Territory control, laundering fronts |
| 5 | Underboss | 5,000–14,999 | Rival takeovers, corrupt officials on payroll |
| 6 | Crime Lord | 15,000–49,999 | Multi-district empire, political influence |
| 7 | Kingpin | 50,000+ | Untouchable status, endgame operations |

**How you gain Rep:**
- Completing operations (+10 to +500 based on scale/risk)
- Controlling territory (+passive per district held)
- NPC loyalty milestones
- Defeating rivals

**How you lose Rep:**
- Getting busted (arrested = major rep hit)
- Losing territory to rivals
- Crew betrayal (public humiliation)
- Backing down from confrontations

### 2.2 Skills (Criminal Expertise)
5 skill trees, each with 8 upgrades. Skill points earned every 2 reputation tiers.

| Skill | Focus | Example Upgrades |
|-------|-------|-----------------|
| **Intimidation** | Fear-based control | Silent threat, Bone breaker, Reputation precedes you |
| **Persuasion** | Smooth talking, bribes | Silver tongue, Dirty favors, Blackmail leverage |
| **Street Smarts** | Awareness, escape | Sixth sense, Back alley routes, Counter-surveillance |
| **Operations** | Heist/deal efficiency | Quick hands, Inside man, Clean getaway |
| **Leadership** | Crew management | Loyalty bonus, Crew expansion, Undying loyalty |

---

## 3. Economy — Dirty Money

All income is **dirty money** by default. Spending large amounts of dirty money raises Heat.

### 3.1 Income Sources

**Tier 1 — Street Level (Rep 1–2)**
- Petty theft (wallets, car breaks) — $50–$200/job
- Small drug deals (corner sales) — $100–$500/deal
- Stolen goods fencing — $75–$300/item
- Debt collection for NPCs — $200–$800/job

**Tier 2 — Operations (Rep 3–4)**
- Protection rackets — $500–$2,000/week passive per business
- Burglary/heists — $2,000–$15,000/job
- Smuggling runs — $1,000–$5,000/run
- Underground gambling den — $800–$3,000/week passive

**Tier 3 — Empire (Rep 5–7)**
- Drug distribution network — $5,000–$20,000/week passive
- Arms dealing — $10,000–$50,000/deal
- Money counterfeiting — $3,000–$12,000/week passive
- Political corruption (kickbacks) — $8,000–$30,000/contract

### 3.2 Money Laundering
To spend freely without raising Heat, money must be laundered through **fronts**:

| Front Business | Cost | Launder Rate | Capacity/Week |
|---------------|------|-------------|---------------|
| Laundromat | $5,000 | 15% cut | $3,000 |
| Restaurant | $15,000 | 12% cut | $8,000 |
| Car Wash | $10,000 | 13% cut | $6,000 |
| Nightclub | $30,000 | 10% cut | $15,000 |
| Real Estate Firm | $80,000 | 8% cut | $40,000 |

- Fronts also generate small **legit income** on the side
- Fronts can be raided by cops if Heat is too high — temporarily shut down
- Upgraded fronts launder faster with lower cuts

### 3.3 Spending
- **Crew salaries** — weekly cost per crew member (fail to pay = loyalty drop)
- **Weapons & gear** — better tools for operations
- **Bribes** — pay off cops, officials, witnesses
- **Safe houses** — save points, stash locations
- **Territory upgrades** — fortify turf, install surveillance
- **Front businesses** — laundering + passive income

---

## 4. NPC Roles and Behaviors

Every NPC has: **Name, Role, Loyalty (0–100), Fear (0–100), Location, Schedule**

### 4.1 NPC Categories

**Civilians**
- Walk streets on daily schedules (home → work → shop → home)
- Can be witnesses to crimes (report to cops if not intimidated/bribed)
- Some can be recruited as informants
- React to player reputation (fear, respect, or hostility)

**Criminal Contacts**
- **Fence** — buys stolen goods. Better prices at higher loyalty
- **Supplier** — provides contraband. Unlock better product tiers via trust
- **Hacker** — disables alarms, finds intel. Available at Rep 3+
- **Forger** — fake IDs, documents. Reduces Heat for a price
- **Wheelman** — getaway driver for heists. Speed/reliability scales with loyalty

**Crew Members** (recruitable)
- Each has a specialty (muscle, tech, driver, negotiator)
- Loyalty affected by: pay consistency, mission success, player choices
- At loyalty < 20: risk of betrayal (leak info to cops or rivals)
- At loyalty > 80: take a bullet for you, refuse bribes from rivals
- Can be promoted (lieutenant → underboss) for passive bonuses

**Rivals**
- AI-controlled crime bosses who also expand territory
- Each has a personality (aggressive, cautious, diplomatic, ruthless)
- Will approach player with offers (alliance, threats, trade)
- Defeated rivals can be absorbed (crew + territory) or eliminated

**Law Enforcement**
- Beat cops — patrol districts, respond to crimes in progress
- Detectives — investigate past crimes if evidence exists
- Feds — triggered at very high Heat, much harder to bribe/evade
- Corrupt cops — can be recruited to your payroll (reduce Heat, tip-offs)

### 4.2 NPC Interaction System
Every NPC interaction uses a **dialogue wheel** with crime-themed options:

- **Talk** — gather info, build rapport (+loyalty)
- **Threaten** — get compliance through fear (+fear, −loyalty, +heat)
- **Bribe** — pay for favors (−money, +loyalty or −heat)
- **Recruit** — offer a cut to join your crew (requires min rep/loyalty)
- **Eliminate** — permanent removal (+heat, +fear to witnesses, rival rep impact)

---

## 5. Risk System — Heat & Consequences

### 5.1 Heat Meter (0–100)
Heat represents law enforcement attention on the player.

| Heat Level | Range | Effects |
|-----------|-------|---------|
| Cold | 0–19 | No police attention. Operate freely |
| Warm | 20–39 | Occasional patrol presence. Cops notice suspicious behavior |
| Hot | 40–59 | Active investigation. Detectives snoop around your territory |
| Blazing | 60–79 | Raids on fronts. Undercover cops attempt infiltration |
| Inferno | 80–100 | Fed task force. Arrest on sight. Crew members pressured to flip |

**Heat increases from:**
- Committing crimes near witnesses (+2 to +15)
- Spending large dirty money (+1 to +5)
- Leaving evidence at crime scenes (+5 to +20)
- NPC reports / crew betrayal (+10 to +30)
- Escalating violence (guns > threats > stealth)

**Heat decreases from:**
- Laying low (time-based passive decay: −1/day)
- Bribing officials (−5 to −20, costs money)
- Using a forger (−10, costs money)
- Eliminating witnesses (−evidence, but +heat if caught)
- Laundering money properly (prevents spend-based heat)

### 5.2 Getting Busted
If arrested:
- Lose a % of dirty cash (seized)
- Crew loyalty drops across the board
- Rivals may grab undefended territory
- Must post bail (scales with offense) or do time (skip days)
- Repeat offenses = longer time, higher bail
- Lawyer NPC can reduce sentences (expensive)

### 5.3 Rival Threat System
Rivals operate on their own AI cycle:

- **Probe** — rival sends scouts to your territory
- **Provoke** — vandalism, intimidation of your businesses
- **Attack** — armed takeover attempt on your turf
- **War** — full gang war across multiple districts

Player can respond at each stage: negotiate, retaliate, or fortify.
Ignoring provocations = territory loss + crew morale drop.

---

## 6. World Structure

### 6.1 City Map — 6 Districts

| District | Vibe | Starting Control | Key Features |
|----------|------|-----------------|-------------|
| **The Docks** | Industrial, smuggling hub | Neutral | Shipping containers, warehouse heists, smuggling routes |
| **Midtown** | Commercial, business district | Rival A | Corporate fronts, white-collar crime, high-value targets |
| **The Row** | Slums, street-level crime | Player start | Drug corners, petty crime, cheap recruitment |
| **Old Quarter** | Historic, black market | Rival B | Underground markets, antique fencing, hidden tunnels |
| **Uptown** | Wealthy residential | Neutral | Home burglaries, corrupt politicians, high-risk/high-reward |
| **The Strip** | Nightlife, entertainment | Rival C | Nightclubs, gambling dens, prostitution rings, laundering |

### 6.2 Territory Control
Each district is divided into **4 blocks** (24 blocks total). Each block has:

- **Control %** (0–100) — who runs it (player, rival, or neutral)
- **Income** — passive dirty money from controlled blocks
- **Defenses** — crew stationed, surveillance, fortifications
- **Businesses** — front businesses for laundering
- **Population** — civilian density (more witnesses = more heat risk)

**Gaining control:**
- Complete operations in the block (+5–15% control)
- Defeat rival crew in the block (+20% control)
- Bribe local businesses to side with you (+10% control)
- Station crew to maintain presence (+passive control)

**Losing control:**
- Rival attacks succeed (−10–30% control)
- High heat causes raids, disrupting your operations (−5% control)
- Crew pulled out / killed (−passive control)
- Neglect (undefended blocks slowly revert to neutral)

### 6.3 Points of Interest (per district)
Each district has 3–5 unique locations:
- **Safe houses** — save game, stash cash, heal
- **Contact hangouts** — meet NPCs (bars, pool halls, diners)
- **Job boards** — pick up freelance criminal work
- **Black markets** — buy weapons, tools, contraband
- **Rival strongholds** — must be taken to fully control a district

---

## 7. System Interconnections

Every system feeds into at least 2 others — nothing exists in isolation:

```
Territory ←→ Income ←→ Laundering
    ↕            ↕          ↕
  Rivals ←→   Crew    ←→  Heat
    ↕            ↕          ↕
Reputation ←→ Operations ←→ Law Enforcement
```

**Examples of interconnection:**
- More territory = more income, but also more to defend (crew spread thin)
- Higher rep unlocks better operations, but draws rival attention
- Better crew = smoother operations, but higher salary costs
- Laundering reduces heat, but fronts can be raided if heat is already high
- Bribing cops reduces heat, but costs money and if the cop flips, heat spikes

---

## 8. Consequences & Choices

Key design rule: **every major decision has a trade-off.**

| Choice | Benefit | Cost |
|--------|---------|------|
| Use violence over persuasion | Faster results, +fear | +heat, −loyalty, witnesses |
| Expand territory aggressively | More income, +rep | Rivals unite against you, crew stretched |
| Pay crew generously | +loyalty, −betrayal risk | Less profit margin |
| Bribe vs. eliminate witnesses | Bribe: clean, reusable. Eliminate: permanent | Bribe: costs money. Eliminate: +heat if caught |
| Alliance with rival | Peace on one front, trade access | Share profits, can't expand into their turf |
| Go to war with rival | Take everything they have | Crew casualties, massive heat, expensive |

---

## 9. Game Flow — First 30 Minutes

See **Section 1 (Core Gameplay Loop)** for the complete minute-by-minute breakdown including:
- First 5 minutes: tutorial, first theft, first delivery, first player choice with real consequences
- Minutes 5–30: job ecosystem, crew recruitment, heat escalation, rival encounter
- Ongoing loop: daily cycle, escalation table, system interactions, and full failure reference

---

## 10. Technical Approach

- **Pure HTML/CSS/JS** — zero dependencies, zero cost
- **Canvas-based** 2D rendering with procedural pixel art
- **Web Audio API** — ambient city sounds, crime stingers, tension music
- **localStorage** — save/load system (multiple save slots)
- **Modular architecture** — separate files for engine, world, NPCs, economy, combat, UI
- **Target:** ~8,000–12,000 LOC across 10–15 files

---

## 11. Future Expansion Hooks

These are not in v1 but the architecture supports them:

- **Multiplayer turf wars** (WebRTC peer-to-peer)
- **Procedural city generation** (randomized districts each playthrough)
- **Story campaigns** (scripted heist sequences)
- **Reputation factions** (choose between mafia, cartel, syndicate paths)
- **Prison break minigame** (if arrested at max heat)
- **Informant system** (plant moles in rival gangs)
