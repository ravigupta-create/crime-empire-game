// ─── Main Game Loop ───────────────────────────────────────
// Initializes all systems, runs the update loop, ties
// everything together.

let gameUI;

function initGame() {
  // Initialize central game state (creates player, NPCs, all systems)
  GameState.init();

  // Initialize UI
  gameUI = new GameUI();
  window.gameUI = gameUI;

  // Initial render
  gameUI.updateHUD();
  gameUI.updateTime();
  gameUI.renderPanel();
  gameUI.renderLog();

  // Start game loop
  requestAnimationFrame(gameLoop);

  console.log('Crime Empire initialized.');
  console.log('Systems:', {
    player: GameState.player,
    npcs: Object.keys(GameState.npcs).length + ' NPCs',
    blocks: Object.keys(BLOCKS).length + ' blocks',
    districts: Object.keys(DISTRICTS).length + ' districts',
    jobs: GameState.jobSystem.availableJobs.length + ' jobs available'
  });
}

// ── Main Game Loop ────────────────────────────────────────
function gameLoop(timestamp) {
  // Update time system (drives all daily/weekly ticks via events)
  GameState.time.update(timestamp);

  // Schedule next frame
  requestAnimationFrame(gameLoop);
}

// ── Start ─────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', initGame);
