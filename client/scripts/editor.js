// ═══════════════════════════════════════════════════
// EDITOR — open/close map, view mode, header inputs
// ═══════════════════════════════════════════════════

const Editor = {
  viewMode: false,

  open(mapId) {
    currentMapId = mapId;
    const map    = getMap();

    // Populate header inputs
    document.getElementById('map-title-input').value  = map.name || '';
    document.getElementById('desc-textarea').value    = map.desc || '';

    // Show editor, hide home
    document.getElementById('view-editor').classList.add('active');
    document.getElementById('view-home').classList.add('hidden');

    // Reset all subsystem state
    Canvas.reset();
    Canvas._connectMode = false;
    Canvas._connectSrc  = null;
    document.getElementById('btn-connect').classList.remove('active');
    document.getElementById('canvasWrap').classList.remove('arrow-mode');

    this._setViewMode(false);

    AI.close();
    AI.reset();

    Panels.resetAll();

    setTimeout(() => { Canvas.renderAll(); Canvas.fitToScreen(); }, 80);
  },

  goHome() {
    this._flushInputs();
    document.getElementById('view-editor').classList.remove('active');
    document.getElementById('view-home').classList.remove('hidden');
    Home.render();
  },

  // ── Title / desc live sync ──
  onTitleChange() {
    const map = getMap(); if (!map) return;
    map.name = document.getElementById('map-title-input').value;
    persistMap();
  },

  onDescChange() {
    const map = getMap(); if (!map) return;
    map.desc = document.getElementById('desc-textarea').value;
    persistMap();
  },

  // Flush inputs before navigating away (belt-and-suspenders)
  _flushInputs() {
    const map = getMap(); if (!map) return;
    map.name    = document.getElementById('map-title-input').value.trim() || 'Untitled';
    map.desc    = document.getElementById('desc-textarea').value;
    map.updated = Date.now();
    persistMap();
  },

  // ── View mode ──
  toggleViewMode() { this._setViewMode(!this.viewMode); },

  _setViewMode(on) {
    this.viewMode = on;
    document.body.classList.toggle('view-mode', on);

    const btn   = document.getElementById('btn-viewmode');
    const icon  = document.getElementById('viewmode-icon');
    const label = document.getElementById('viewmode-label');

    if (on) {
      btn.classList.add('viewing');
      icon.textContent  = '✎';
      label.textContent = 'Edit';
      if (Canvas._connectMode) Canvas.toggleConnectMode();
      Arrows.hideMenu();
    } else {
      btn.classList.remove('viewing');
      icon.textContent  = '◎';
      label.textContent = 'View';
    }

    // Redraw so arrow cursors / interactivity update
    Canvas.drawArrows();
  },
};
