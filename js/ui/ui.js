// ─── UI Renderer ──────────────────────────────────────────
// Renders all game UI: HUD, log, NPC panels, dialogue,
// jobs, map. Pure DOM manipulation — no canvas yet.

class GameUI {
  constructor() {
    this.elements = {};
    this.currentPanel = 'explore';  // explore, phone, npc
    this.init();
  }

  init() {
    this.cacheElements();
    this.setupEventListeners();
    this.setupGameEvents();
  }

  cacheElements() {
    this.elements = {
      cash: document.getElementById('cash'),
      heat: document.getElementById('heat'),
      heatBar: document.getElementById('heat-bar'),
      heatLabel: document.getElementById('heat-label'),
      rep: document.getElementById('rep'),
      repTitle: document.getElementById('rep-title'),
      hp: document.getElementById('hp'),
      crew: document.getElementById('crew'),
      time: document.getElementById('time'),
      day: document.getElementById('day'),
      location: document.getElementById('location'),
      period: document.getElementById('period'),
      log: document.getElementById('game-log'),
      npcList: document.getElementById('npc-list'),
      actionPanel: document.getElementById('action-panel'),
      jobList: document.getElementById('job-list'),
      mapGrid: document.getElementById('map-grid'),
      mainContent: document.getElementById('main-content'),
      tabBtns: document.querySelectorAll('.tab-btn')
    };
  }

  setupEventListeners() {
    // Tab switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentPanel = btn.dataset.tab;
        this.renderPanel();
      });
    });

    // Speed controls
    document.getElementById('speed-1x')?.addEventListener('click', () => { GameState.time.setSpeed(1); this.updateSpeedBtns(1); });
    document.getElementById('speed-3x')?.addEventListener('click', () => { GameState.time.setSpeed(3); this.updateSpeedBtns(3); });
    document.getElementById('speed-5x')?.addEventListener('click', () => { GameState.time.setSpeed(5); this.updateSpeedBtns(5); });
    document.getElementById('pause-btn')?.addEventListener('click', () => {
      if (GameState.time.paused) { GameState.time.resume(); document.getElementById('pause-btn').textContent = '⏸'; }
      else { GameState.time.pause(); document.getElementById('pause-btn').textContent = '▶'; }
    });
    document.getElementById('save-btn')?.addEventListener('click', () => GameState.save(0));
  }

  updateSpeedBtns(speed) {
    document.querySelectorAll('.speed-btn').forEach(b => b.classList.remove('active'));
    const btn = document.getElementById('speed-' + speed + 'x');
    if (btn) btn.classList.add('active');
  }

  setupGameEvents() {
    Events.on('log', () => this.renderLog());
    Events.on('heat_updated', () => this.updateHUD());
    Events.on('rep_updated', () => this.updateHUD());
    Events.on('money_changed', () => this.updateHUD());
    Events.on('time_updated', () => this.updateTime());
    Events.on('player_hp_changed', () => this.updateHUD());
    Events.on('crew_changed', () => this.updateHUD());
    Events.on('location_changed', () => { this.updateHUD(); this.renderPanel(); });
    Events.on('jobs_updated', () => { if (this.currentPanel === 'jobs') this.renderPanel(); });
  }

  // ── HUD Updates ─────────────────────────────────────────
  updateHUD() {
    const p = GameState.player;
    const tier = GameState.repSystem.getTier(p.reputation);
    const heatTier = GameState.heatSystem.getTier(p.heat);

    if (this.elements.cash) this.elements.cash.textContent = `$${p.cash.dirty + p.cash.clean}`;
    if (this.elements.heat) this.elements.heat.textContent = p.heat;
    if (this.elements.heatBar) {
      this.elements.heatBar.style.width = p.heat + '%';
      this.elements.heatBar.style.backgroundColor = heatTier.color;
    }
    if (this.elements.heatLabel) this.elements.heatLabel.textContent = heatTier.label;
    if (this.elements.rep) this.elements.rep.textContent = p.reputation;
    if (this.elements.repTitle) this.elements.repTitle.textContent = tier.title;
    if (this.elements.hp) this.elements.hp.textContent = `${p.hp}/${p.maxHp}`;
    if (this.elements.crew) this.elements.crew.textContent = `${p.activeCrew.length}/${p.crewSlots}`;
    if (this.elements.location) this.elements.location.textContent = BLOCKS[p.currentBlock]?.name || p.currentBlock;

    // Dirty/clean breakdown
    const cashEl = this.elements.cash;
    if (cashEl) {
      cashEl.title = `Dirty: $${p.cash.dirty} | Clean: $${p.cash.clean} | Stashed: $${p.cash.stashed}`;
    }
  }

  updateTime() {
    if (this.elements.time) this.elements.time.textContent = GameState.time.getTimeString();
    if (this.elements.day) this.elements.day.textContent = GameState.time.getDateString();
    if (this.elements.period) {
      const period = GameState.time.getPeriod();
      this.elements.period.textContent = period.replace('_', ' ');
      this.elements.period.className = 'period ' + period;
    }
  }

  // ── Panel Rendering ─────────────────────────────────────
  renderPanel() {
    const content = this.elements.mainContent;
    if (!content) return;

    switch (this.currentPanel) {
      case 'explore': this.renderExplore(content); break;
      case 'jobs':    this.renderJobs(content); break;
      case 'map':     this.renderMap(content); break;
      case 'crew':    this.renderCrew(content); break;
      case 'skills':  this.renderSkills(content); break;
    }
  }

  // ── Explore Panel (NPCs + Actions) ─────────────────────
  renderExplore(container) {
    const npcsHere = GameState.getNPCsHere().filter(n => n.name !== 'Civilian' || n.isWitness);
    const block = BLOCKS[GameState.player.currentBlock];
    const district = DISTRICTS[block.districtId];

    // Navigation buttons
    const adjacentBlocks = district.blocks.filter(b => b !== GameState.player.currentBlock);
    const otherDistricts = Object.values(DISTRICTS).filter(d => d.id !== district.id);

    let html = `<div class="panel-section">
      <h3>📍 ${block.name}</h3>
      <p class="district-desc">${district.description}</p>
      <div class="stats-row">
        <span>Control: <b>${block.control.player}%</b></span>
        <span>Pop: ${block.population}</span>
        <span>Cops: ${block.copPresence}%</span>
      </div>
      <div class="nav-buttons">
        <span class="nav-label">Go to:</span>
        ${adjacentBlocks.map(b => `<button class="nav-btn" onclick="GameState.moveToBlock('${b}')">${BLOCKS[b].name.split(' - ')[1]}</button>`).join('')}
        ${otherDistricts.map(d => `<button class="nav-btn district-btn" onclick="GameState.moveToBlock('${d.blocks[0]}')">${d.name}</button>`).join('')}
      </div>
    </div>`;

    // NPCs
    html += `<div class="panel-section"><h3>People Here</h3>`;
    if (npcsHere.length === 0) {
      html += `<p class="empty">Nobody interesting around. Try a different block.</p>`;
    } else {
      html += `<div class="npc-grid">`;
      for (const npc of npcsHere) {
        const roleIcon = { civilian: '👤', contact: '🤝', crew: '💪', rival: '⚔️', cop: '🚔' }[npc.role] || '👤';
        const witnessTag = npc.isWitness ? '<span class="tag tag-danger">WITNESS</span>' : '';
        html += `
          <div class="npc-card" onclick="gameUI.showNPCActions('${npc.id}')">
            <div class="npc-header">
              <span class="npc-icon">${roleIcon}</span>
              <span class="npc-name">${npc.name}</span>
              ${witnessTag}
            </div>
            <div class="npc-role">${npc.role}${npc.subRole ? ' — ' + npc.subRole : ''}${npc.specialty ? ' (' + npc.specialty + ')' : ''}</div>
            <div class="npc-stats">
              <span title="Loyalty">❤️ ${npc.loyalty}</span>
              <span title="Fear">😨 ${npc.fear}</span>
              <span title="Nerve">💪 ${npc.nerve}</span>
            </div>
            <div class="npc-desc">${npc.description}</div>
          </div>`;
      }
      html += `</div>`;
    }
    html += `</div>`;

    // Action panel
    html += `<div id="action-panel" class="panel-section"></div>`;

    container.innerHTML = html;
  }

  showNPCActions(npcId) {
    const npc = GameState.npcs[npcId];
    if (!npc) return;

    GameState.time.pause();
    const actions = GameState.interactionSystem.getAvailableActions(npc);
    const panel = document.getElementById('action-panel');
    if (!panel) return;

    let html = `<h3>Interact with ${npc.name}</h3>
      <div class="npc-detail-stats">
        <span>Loyalty: ${npc.loyalty}</span>
        <span>Fear: ${npc.fear}</span>
        <span>Trust: ${npc.trust}</span>
        <span>Nerve: ${npc.nerve}</span>
        <span>HP: ${npc.hp}/${npc.maxHp}</span>
      </div>
      <div class="action-buttons">`;

    for (const action of actions) {
      const cls = action.enabled ? 'action-btn' : 'action-btn disabled';
      const lockText = action.locked ? ` (${action.locked})` : '';
      html += `<button class="${cls}" ${action.enabled ? `onclick="gameUI.executeAction('${action.id}', '${npc.id}')"` : 'disabled'}>${action.label}${lockText}</button>`;
    }

    html += `<button class="action-btn cancel-btn" onclick="gameUI.closeActions()">Walk Away</button>`;
    html += `</div><div id="action-result"></div>`;
    panel.innerHTML = html;
    panel.scrollIntoView({ behavior: 'smooth' });
  }

  executeAction(actionId, npcId) {
    const npc = GameState.npcs[npcId];
    if (!npc) return;

    const result = GameState.interactionSystem.execute(actionId, npc);
    const resultDiv = document.getElementById('action-result');
    if (!resultDiv) return;

    const typeClass = result.success ? 'result-success' : 'result-failure';
    let changesHtml = '';
    if (result.changes) {
      changesHtml = '<div class="changes">';
      for (const [key, val] of Object.entries(result.changes)) {
        const sign = typeof val === 'number' && val > 0 ? '+' : '';
        const cls = typeof val === 'number' ? (val > 0 ? 'change-pos' : 'change-neg') : '';
        changesHtml += `<span class="change ${cls}">${key}: ${sign}${val}</span>`;
      }
      changesHtml += '</div>';
    }

    resultDiv.innerHTML = `<div class="action-result ${typeClass}">
      <p>${result.text.replace(/\n/g, '<br>')}</p>
      ${changesHtml}
    </div>`;

    this.updateHUD();
    // Refresh NPC actions to show updated stats
    setTimeout(() => this.showNPCActions(npcId), 100);
  }

  closeActions() {
    const panel = document.getElementById('action-panel');
    if (panel) panel.innerHTML = '';
    GameState.time.resume();
  }

  // ── Jobs Panel ──────────────────────────────────────────
  renderJobs(container) {
    const jobs = GameState.jobSystem.availableJobs;
    const active = GameState.jobSystem.activeJob;

    let html = `<div class="panel-section"><h3>📋 Available Jobs</h3>`;

    if (active) {
      html += `<div class="job-card active-job">
        <div class="job-header"><span class="job-title">ACTIVE: ${active.title}</span><span class="job-pay">$${active.pay}</span></div>
        <p>${active.description}</p>
        <div class="job-meta"><span class="risk risk-${active.riskLevel}">${active.riskLevel}</span><span>Type: ${active.type}</span></div>
        <button class="action-btn" onclick="gameUI.completeJob('${active.id}')">Complete Job</button>
        <button class="action-btn cancel-btn" onclick="gameUI.failJob('${active.id}')">Abandon</button>
      </div>`;
    }

    if (jobs.length === 0 && !active) {
      html += `<p class="empty">No jobs available. Check back tomorrow.</p>`;
    }

    for (const job of jobs) {
      const stingWarning = job.stingChance > 15 ? `<span class="tag tag-danger">⚠️ ${Math.round(job.stingChance)}% sting risk</span>` : '';
      html += `<div class="job-card">
        <div class="job-header"><span class="job-title">${job.title}</span><span class="job-pay">$${job.pay}</span></div>
        <p>${job.description}</p>
        <div class="job-meta">
          <span class="risk risk-${job.riskLevel}">${job.riskLevel}</span>
          <span>Type: ${job.type}</span>
          <span>Heat: +${job.baseHeat}</span>
          ${job.requiredCrew > 0 ? `<span>Crew: ${job.requiredCrew}+</span>` : ''}
          ${stingWarning}
        </div>
        ${!active ? `<button class="action-btn" onclick="gameUI.acceptJob('${job.id}')">Accept</button>` : '<span class="tag">Finish current job first</span>'}
      </div>`;
    }

    html += `</div>`;
    container.innerHTML = html;
  }

  acceptJob(jobId) {
    GameState.jobSystem.acceptJob(jobId);
    this.renderPanel();
  }

  completeJob(jobId) {
    GameState.jobSystem.completeJob(jobId);
    this.renderPanel();
    this.updateHUD();
  }

  failJob(jobId) {
    GameState.jobSystem.failJob(jobId, 'Abandoned');
    this.renderPanel();
    this.updateHUD();
  }

  // ── Map Panel ───────────────────────────────────────────
  renderMap(container) {
    let html = `<div class="panel-section"><h3>🗺️ Territory Map</h3><div class="map-container">`;

    for (const [distId, district] of Object.entries(DISTRICTS)) {
      html += `<div class="district-card">
        <h4>${district.name}</h4>
        <p class="district-vibe">${district.description}</p>
        <div class="block-grid">`;

      for (const blockId of district.blocks) {
        const block = BLOCKS[blockId];
        const isCurrent = GameState.player.currentBlock === blockId;
        const controller = block.controllerName;
        const controlColor = controller === 'player' ? '#4a9eff' :
                            controller === 'contested' ? '#ffa500' :
                            controller === 'neutral' ? '#666' : '#ff4444';

        html += `<div class="block-tile ${isCurrent ? 'current-block' : ''}" onclick="GameState.moveToBlock('${blockId}')" style="border-color: ${controlColor}">
          <div class="block-name">${blockId.split('_')[1].toUpperCase()}</div>
          <div class="block-control">
            <div class="control-bar" style="width: ${block.control.player}%; background: #4a9eff;"></div>
          </div>
          <div class="block-info">${block.control.player}% ${block.crewStationed.length > 0 ? '👥' : ''}</div>
          ${isCurrent ? '<div class="you-here">YOU</div>' : ''}
        </div>`;
      }

      html += `</div></div>`;
    }

    // Rival status
    html += `<h3>⚔️ Rival Status</h3>`;
    for (const rival of Object.values(GameState.territorySystem.rivals)) {
      const phaseColor = { passive: '#666', probe: '#ffa500', provoke: '#ff6347', attack: '#ff0000', war: '#8b0000' }[rival.threatPhase];
      html += `<div class="rival-card">
        <span class="rival-name">${rival.name}</span>
        <span>Hostility: ${rival.hostility}</span>
        <span style="color: ${phaseColor}">Phase: ${rival.threatPhase}</span>
        <span>Strength: ${rival.strength}</span>
      </div>`;
    }

    html += `</div>`;
    container.innerHTML = html;
  }

  // ── Crew Panel ──────────────────────────────────────────
  renderCrew(container) {
    const p = GameState.player;
    let html = `<div class="panel-section"><h3>👥 Crew (${p.activeCrew.length}/${p.crewSlots})</h3>`;

    if (p.activeCrew.length === 0) {
      html += `<p class="empty">No crew members. Find and recruit people from the streets.</p>`;
    }

    for (const crew of p.activeCrew) {
      const loyaltyColor = crew.loyalty >= 60 ? '#4a9eff' : crew.loyalty >= 30 ? '#ffa500' : '#ff4444';
      const betrayalWarning = crew.loyalty < 20 ? '<span class="tag tag-danger">BETRAYAL RISK</span>' : '';
      html += `<div class="crew-card">
        <div class="crew-header">
          <span class="crew-name">${crew.name}</span>
          <span class="crew-role">${crew.specialty || crew.subRole}</span>
          ${betrayalWarning}
        </div>
        <div class="crew-stats">
          <span style="color:${loyaltyColor}">Loyalty: ${crew.loyalty}</span>
          <span>Salary: $${crew.recruitCost}/wk</span>
          <span>HP: ${crew.hp}/${crew.maxHp}</span>
        </div>
        <div class="crew-actions">
          <button class="action-btn small" onclick="gameUI.assignCrewToBlock('${crew.id}')">Station Here</button>
        </div>
      </div>`;
    }

    // Rackets
    html += `<h3>💰 Rackets</h3>`;
    if (p.rackets.length === 0) {
      html += `<p class="empty">No rackets established. Shakedown business owners to start earning.</p>`;
    }
    for (const racket of p.rackets) {
      const npc = GameState.npcs[racket.targetNpcId];
      const statusColor = racket.isActive ? (racket.weeksMissed > 0 ? '#ffa500' : '#4a9eff') : '#ff4444';
      html += `<div class="racket-card" style="border-left-color: ${statusColor}">
        <span>${npc?.name || 'Unknown'}</span>
        <span>$${racket.weeklyPayment}/wk</span>
        <span>${racket.isActive ? (racket.weeksMissed > 0 ? `⚠️ ${racket.weeksMissed}wk overdue` : '✅ Active') : '❌ Collapsed'}</span>
      </div>`;
    }

    // Fronts
    html += `<h3>🏢 Front Businesses</h3>`;
    if (p.fronts.length === 0) {
      html += `<p class="empty">No fronts. Buy one to start laundering money.</p>`;
    }
    for (const front of p.fronts) {
      html += `<div class="front-card">
        <span>${front.type}</span>
        <span>Launder: $${front.launderedThisWeek}/$${front.launderCapacity}</span>
        <span>Cut: ${Math.round(front.launderCut * 100)}%</span>
        <span>${front.isRaided ? '🚨 RAIDED' : '✅ Operating'}</span>
        ${!front.isRaided && p.cash.dirty > 0 ? `<button class="action-btn small" onclick="gameUI.launderMoney('${front.id}')">Launder</button>` : ''}
      </div>`;
    }

    // Buy front button
    if (p.repTier >= 4) {
      html += `<div class="buy-section">
        <h4>Buy a Front:</h4>
        <button class="action-btn" onclick="gameUI.buyFront('laundromat')">Laundromat ($5K)</button>
        <button class="action-btn" onclick="gameUI.buyFront('restaurant')">Restaurant ($15K)</button>
        <button class="action-btn" onclick="gameUI.buyFront('car_wash')">Car Wash ($10K)</button>
        <button class="action-btn" onclick="gameUI.buyFront('nightclub')">Nightclub ($30K)</button>
      </div>`;
    }

    html += `</div>`;
    container.innerHTML = html;
  }

  assignCrewToBlock(crewId) {
    const crew = GameState.player.activeCrew.find(c => c.id === crewId);
    if (!crew) return;
    const block = BLOCKS[GameState.player.currentBlock];
    if (!block) return;

    // Remove from old block if any
    for (const b of Object.values(BLOCKS)) {
      b.crewStationed = b.crewStationed.filter(c => c.id !== crewId);
    }

    block.crewStationed.push(crew);
    Events.emit('log', { text: `${crew.name} stationed at ${block.name}.`, type: 'success' });
    this.renderPanel();
  }

  launderMoney(frontId) {
    const front = GameState.player.fronts.find(f => f.id === frontId);
    if (!front) return;
    const amount = Math.min(GameState.player.cash.dirty, front.launderCapacity - front.launderedThisWeek);
    if (amount <= 0) return;
    GameState.economySystem.launder(front, amount);
    this.updateHUD();
    this.renderPanel();
  }

  buyFront(type) {
    const result = GameState.economySystem.buyFront(type);
    if (!result.success) Events.emit('log', { text: result.reason, type: 'warning' });
    this.updateHUD();
    this.renderPanel();
  }

  // ── Skills Panel ────────────────────────────────────────
  renderSkills(container) {
    const p = GameState.player;
    const skills = [
      { key: 'intimidation', name: 'Intimidation', desc: 'Fear-based control. Affects threaten and collect.' },
      { key: 'persuasion', name: 'Persuasion', desc: 'Smooth talking. Affects deals and shakedowns.' },
      { key: 'streetSmarts', name: 'Street Smarts', desc: 'Awareness. Detects stings, improves escapes.' },
      { key: 'operations', name: 'Operations', desc: 'Heist and job efficiency.' },
      { key: 'leadership', name: 'Leadership', desc: 'Crew management and loyalty.' }
    ];

    let html = `<div class="panel-section"><h3>📊 Skills (${p.skillPoints} points available)</h3>`;
    for (const s of skills) {
      const level = p.skills[s.key];
      const barWidth = (level / 8) * 100;
      html += `<div class="skill-row">
        <div class="skill-info">
          <span class="skill-name">${s.name}: ${level}/8</span>
          <span class="skill-desc">${s.desc}</span>
        </div>
        <div class="skill-bar"><div class="skill-fill" style="width: ${barWidth}%"></div></div>
        ${p.skillPoints > 0 && level < 8 ? `<button class="action-btn small" onclick="gameUI.upgradeSkill('${s.key}')">+1</button>` : ''}
      </div>`;
    }

    html += `<h3>📈 Stats</h3>
      <div class="stats-grid">
        <div class="stat-item"><span>Dirty Cash</span><span>$${p.cash.dirty}</span></div>
        <div class="stat-item"><span>Clean Cash</span><span>$${p.cash.clean}</span></div>
        <div class="stat-item"><span>Stashed</span><span>$${p.cash.stashed}</span></div>
        <div class="stat-item"><span>Arrest Record</span><span>${p.arrestRecord}</span></div>
        <div class="stat-item"><span>Jobs Completed</span><span>${GameState.jobSystem.completedJobs.filter(j=>j.isComplete).length}</span></div>
        <div class="stat-item"><span>Jobs Failed</span><span>${GameState.jobSystem.completedJobs.filter(j=>j.isFailed).length}</span></div>
        <div class="stat-item"><span>Active Rackets</span><span>${p.rackets.filter(r=>r.isActive).length}</span></div>
        <div class="stat-item"><span>Territories (50%+)</span><span>${Object.values(BLOCKS).filter(b=>b.control.player>=50).length}/24</span></div>
      </div>
    </div>`;
    container.innerHTML = html;
  }

  upgradeSkill(skillKey) {
    const p = GameState.player;
    if (p.skillPoints <= 0 || p.skills[skillKey] >= 8) return;
    p.skillPoints--;
    p.skills[skillKey]++;
    Events.emit('log', { text: `Upgraded ${skillKey} to level ${p.skills[skillKey]}.`, type: 'reward' });
    this.renderPanel();
    this.updateHUD();
  }

  // ── Log Rendering ───────────────────────────────────────
  renderLog() {
    const log = this.elements.log;
    if (!log) return;

    const entries = GameState.gameLog.slice(-20);
    log.innerHTML = entries.map(entry => {
      const cls = {
        info: 'log-info', success: 'log-success', warning: 'log-warning',
        danger: 'log-danger', reward: 'log-reward', story: 'log-story'
      }[entry.type] || 'log-info';
      return `<div class="log-entry ${cls}"><span class="log-time">${entry.time}</span> ${entry.text}</div>`;
    }).join('');

    log.scrollTop = log.scrollHeight;
  }
}

window.GameUI = GameUI;
