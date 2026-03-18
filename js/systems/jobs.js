// ─── Job System ───────────────────────────────────────────
// Generates, tracks, and resolves jobs. Connects to economy
// for payouts, heat for risk, NPCs for clients.

class JobSystem {
  constructor() {
    this.availableJobs = [];
    this.activeJob = null;
    this.completedJobs = [];
    this.jobIdCounter = 0;
    this.init();
  }

  init() {
    Events.on('day_changed', () => this.generateDailyJobs());
  }

  generateDailyJobs() {
    const player = GameState.player;
    const tier = player.repTier;
    this.availableJobs = [];

    const count = Math.min(5, 2 + Math.floor(tier * 0.5) + Math.floor(player.contacts.length * 0.5));

    for (let i = 0; i < count; i++) {
      const jobType = RNG.weightedPick({
        theft:      tier <= 2 ? 30 : 10,
        delivery:   25,
        collection: tier >= 2 ? 25 : 5,
        deal:       20,
        shakedown:  tier >= 2 ? 15 : 0,
        heist:      tier >= 3 ? 10 : 0,
        smuggling:  tier >= 4 ? 10 : 0
      });

      this.availableJobs.push(this.createJob(jobType, tier));
    }

    Events.emit('jobs_updated', { jobs: this.availableJobs });
  }

  createJob(type, tier) {
    this.jobIdCounter++;
    const id = 'job_' + this.jobIdCounter;
    const templates = {
      theft: {
        title: RNG.pick(['Car Trunk Job', 'Warehouse Break-in', 'Parking Lot Sweep', 'Storage Unit Hit']),
        description: 'Break in, grab the goods, get out clean.',
        basePay: 100 + tier * 80,
        baseHeat: 5,
        riskLevel: 'low',
        stingChance: 0
      },
      delivery: {
        title: RNG.pick(['Corner Delivery', 'Package Drop', 'Express Handoff', 'Night Run']),
        description: 'Pick up a package, deliver it, no questions asked.',
        basePay: 150 + tier * 100,
        baseHeat: 3,
        riskLevel: 'low',
        stingChance: 3
      },
      collection: {
        title: RNG.pick(['Debt Collection', 'Overdue Payment', 'Settle the Tab', 'Friendly Reminder']),
        description: 'Someone owes money. Go collect.',
        basePay: 120 + tier * 90,
        baseHeat: 5,
        riskLevel: 'medium',
        stingChance: 0
      },
      deal: {
        title: RNG.pick(['Corner Sale', 'Park Meet', 'Parking Garage Deal', 'Late Night Exchange']),
        description: 'Meet the buyer, make the exchange, walk away.',
        basePay: 200 + tier * 120,
        baseHeat: 5,
        riskLevel: 'medium',
        stingChance: 5
      },
      shakedown: {
        title: RNG.pick(['Protection Setup', 'New Client', 'Business Opportunity', 'Territory Expansion']),
        description: 'Convince a business owner they need your protection.',
        basePay: 250 + tier * 100,
        baseHeat: 8,
        riskLevel: 'medium',
        stingChance: 0
      },
      heist: {
        title: RNG.pick(['Warehouse Heist', 'Jewelry Store Hit', 'Safe Cracking', 'Big Score']),
        description: 'Plan it, execute it, get rich or get caught.',
        basePay: 2000 + tier * 1500,
        baseHeat: 15,
        riskLevel: 'high',
        stingChance: 0
      },
      smuggling: {
        title: RNG.pick(['Dock Run', 'Border Package', 'Container Pickup', 'Night Shipment']),
        description: 'Move product across district lines.',
        basePay: 1000 + tier * 800,
        baseHeat: 10,
        riskLevel: 'high',
        stingChance: 8
      }
    };

    const t = templates[type];
    return {
      id,
      type,
      title: t.title,
      description: t.description,
      pay: t.basePay + RNG.int(0, Math.floor(t.basePay * 0.3)),
      baseHeat: t.baseHeat,
      riskLevel: t.riskLevel,
      stingChance: t.stingChance + (GameState.player.heat * 0.5),
      requiredCrew: type === 'heist' ? 1 : 0,
      isComplete: false,
      isFailed: false
    };
  }

  acceptJob(jobId) {
    const job = this.availableJobs.find(j => j.id === jobId);
    if (!job) return null;
    this.activeJob = job;
    this.availableJobs = this.availableJobs.filter(j => j.id !== jobId);
    Events.emit('log', { text: `Accepted job: ${job.title} — $${job.pay}`, type: 'info' });
    return job;
  }

  completeJob(jobId) {
    if (!this.activeJob || this.activeJob.id !== jobId) return null;
    const job = this.activeJob;
    job.isComplete = true;
    this.completedJobs.push(job);
    this.activeJob = null;

    GameState.player.addDirty(job.pay);
    Events.emit('heat_change', { amount: job.baseHeat, source: 'job_complete' });
    Events.emit('rep_change', { amount: 5 + Math.floor(job.pay / 100), source: 'job_complete' });
    Events.emit('log', { text: `Job complete: ${job.title} — +$${job.pay}`, type: 'success' });

    return job;
  }

  failJob(jobId, reason) {
    if (!this.activeJob || this.activeJob.id !== jobId) return null;
    const job = this.activeJob;
    job.isFailed = true;
    this.completedJobs.push(job);
    this.activeJob = null;

    Events.emit('rep_change', { amount: -5, source: 'job_failed' });
    Events.emit('log', { text: `Job failed: ${job.title} — ${reason}`, type: 'danger' });

    return job;
  }
}

window.JobSystem = JobSystem;
