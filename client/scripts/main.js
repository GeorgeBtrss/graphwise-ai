// ═══════════════════════════════════════════════════
// MAIN — app entry point, boots all subsystems
// Load order: this file is last in index.html
// ═══════════════════════════════════════════════════

(async function boot() {
  // 1. Load persisted maps into memory
  maps = await Storage.getAll();

  // 2. Wire up subsystem event listeners
  Modals.init();   // modal backdrop clicks + Escape key
  Canvas.init();   // drag / pan / zoom / keyboard
  Arrows.init();   // arrow menu outside-click dismiss

  // 3. Render the home view
  Home.render();
})();
