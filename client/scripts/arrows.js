// ═══════════════════════════════════════════════════
// ARROWS — add, edit, delete, context menu
// ═══════════════════════════════════════════════════

const Arrows = {
  _editingId:  null,
  _pendingFrom: null,
  _pendingTo:   null,
  _menuTargetId: null,

  // ── Add modal (called after connect-mode picks two nodes) ──
  openAddModal(from, to) {
    this._editingId   = null;
    this._pendingFrom = from;
    this._pendingTo   = to;
    document.getElementById('modal-arrow-title').textContent   = 'Add Arrow';
    document.getElementById('modal-arrow-confirm').textContent = 'Add Arrow';
    document.getElementById('arrow-label-input').value         = '';
    document.querySelector('input[name="arrow-style"][value="solid"]').checked = true;
    Modals.open('modal-arrow');
    setTimeout(() => document.getElementById('arrow-label-input').focus(), 100);
  },

  // ── Edit modal ──
  openEditModal(arrowId) {
    const map = getMap();
    const a   = map?.arrows.find(x => x.id === arrowId);
    if (!a) return;
    this._editingId   = arrowId;
    this._pendingFrom = null;
    this._pendingTo   = null;
    document.getElementById('modal-arrow-title').textContent   = 'Edit Arrow';
    document.getElementById('modal-arrow-confirm').textContent = 'Save Changes';
    document.getElementById('arrow-label-input').value         = a.label || '';
    document.querySelector(`input[name="arrow-style"][value="${a.style || 'solid'}"]`).checked = true;
    Modals.open('modal-arrow');
    setTimeout(() => document.getElementById('arrow-label-input').focus(), 100);
  },

  confirm() {
    const map   = getMap(); if (!map) return;
    const label = document.getElementById('arrow-label-input').value.trim();
    const style = document.querySelector('input[name="arrow-style"]:checked').value;

    if (this._editingId) {
      const a = map.arrows.find(x => x.id === this._editingId);
      if (a) { a.label = label; a.style = style; }
      this._editingId = null;
    } else {
      map.arrows.push({
        id:    genId(),
        from:  this._pendingFrom,
        to:    this._pendingTo,
        label,
        style,
      });
      // Exit connect mode after successfully adding an arrow
      if (Canvas._connectMode) Canvas.toggleConnectMode();
    }

    persistMap();
    Modals.close('modal-arrow');
    Canvas.drawArrows();
  },

  cancel() {
    this._editingId   = null;
    this._pendingFrom = null;
    this._pendingTo   = null;
    Modals.close('modal-arrow');
    if (Canvas._connectMode) Canvas.toggleConnectMode();
  },

  // ── Context menu (right-click / click on arrow hit area) ──
  showMenu(arrowId, x, y) {
    this._menuTargetId = arrowId;
    const menu = document.getElementById('arrow-menu');
    menu.style.display = 'block';
    menu.style.left    = x + 'px';
    menu.style.top     = y + 'px';
    // Keep inside viewport
    requestAnimationFrame(() => {
      const rect = menu.getBoundingClientRect();
      if (rect.right  > window.innerWidth)  menu.style.left = (x - rect.width)  + 'px';
      if (rect.bottom > window.innerHeight) menu.style.top  = (y - rect.height) + 'px';
    });
  },

  hideMenu() {
    document.getElementById('arrow-menu').style.display = 'none';
    this._menuTargetId = null;
  },

  menuEdit() {
    const id = this._menuTargetId;
    this.hideMenu();
    this.openEditModal(id);
  },

  menuDelete() {
    const id  = this._menuTargetId;
    this.hideMenu();
    const map = getMap();
    const a   = map?.arrows.find(x => x.id === id);
    if (!a) return;
    const fn = map.nodes.find(n => n.id === a.from);
    const tn = map.nodes.find(n => n.id === a.to);
    const label = a.label ? ` (${a.label})` : '';
    document.getElementById('confirm-arrow-name').textContent =
      `${fn?.title || '?'}  →  ${tn?.title || '?'}${label}`;
    document.getElementById('confirm-arrow-btn').onclick = () => {
      map.arrows = map.arrows.filter(x => x.id !== id);
      persistMap();
      Modals.close('modal-confirm-arrow');
      Canvas.drawArrows();
    };
    Modals.open('modal-confirm-arrow');
  },

  init() {
    // Close menu when clicking anywhere outside it
    document.addEventListener('click', e => {
      const menu = document.getElementById('arrow-menu');
      if (menu.style.display !== 'none' && !menu.contains(e.target)) {
        this.hideMenu();
      }
    }, { capture: true });
  },
};
