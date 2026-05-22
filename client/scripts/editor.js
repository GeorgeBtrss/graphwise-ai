// ═══════════════════════════════════════════════════
// EDITOR — open/close graph, view mode, header inputs
// ═══════════════════════════════════════════════════

const Editor = {
  viewMode: false,

  open(graphId) {
    currentGraphId = graphId;
    const g = getGraph();

    document.getElementById('graph-title-input').value = g.name || '';
    document.getElementById('desc-textarea').value     = g.desc || '';

    document.getElementById('view-editor').classList.add('active');
    document.getElementById('view-home').classList.add('hidden');

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

    Canvas._selectMode = false;
    Canvas._selectedNodes.clear();

    const selectBtn = document.getElementById('btn-select');

    if (selectBtn) {
      selectBtn.classList.remove('active');
    }

    document.getElementById('view-editor').classList.remove('active');
    document.getElementById('view-home').classList.remove('hidden');

    Home.render();
  },

  onTitleChange() {
    const g = getGraph(); if (!g) return;
    g.name = document.getElementById('graph-title-input').value;
    persistGraph();
  },

  onDescChange() {
    const g = getGraph(); if (!g) return;
    g.desc = document.getElementById('desc-textarea').value;
    persistGraph();
  },

  _flushInputs() {
    const g = getGraph(); if (!g) return;
    g.name    = document.getElementById('graph-title-input').value.trim() || 'Untitled';
    g.desc    = document.getElementById('desc-textarea').value;
    g.updated = Date.now();
    persistGraph();
  },

  toggleViewMode() { this._setViewMode(!this.viewMode); },

  _setViewMode(on) {
    this.viewMode = on;
    document.body.classList.toggle('view-mode', on);

    const btn   = document.getElementById('btn-viewmode');
    const icon  = document.getElementById('viewmode-icon');
    const label = document.getElementById('viewmode-label');

    if (on) {
      btn.classList.add('viewing');
      icon.textContent  = '✏️';
      label.textContent = 'Edit';
      if (Canvas._connectMode) Canvas.toggleConnectMode();
      Arrows.hideMenu();
    } else {
      btn.classList.remove('viewing');
      icon.textContent  = '◎';
      label.textContent = 'View';
    }
    Canvas.drawArrows();
  },
};
