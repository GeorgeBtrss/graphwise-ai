// ═══════════════════════════════════════════════════
// NODES — render, add/edit modal, delete, inline edits
// ═══════════════════════════════════════════════════

const Nodes = {
  // ── Render a single node card into the canvas ──
  renderOne(n, canvasEl) {
    const map = getMap();
    const cat = catById(map, n.catId);
    const t   = catTheme(cat);

    const div = document.createElement('div');
    div.className = 'node';
    div.id        = n.id;
    div.style.cssText = `left:${n.x}px;top:${n.y}px;background:${t.bg};border-color:${t.border};box-shadow:0 4px 24px rgba(0,0,0,.35);`;

    const itemsHtml = (n.items || []).map((item, i) => `
      <div class="node-item-wrap">
        <div class="node-item" contenteditable="true"
          data-node="${n.id}" data-item="${i}"
          onblur="Nodes.onItemBlur(this)">${escHtml(item)}</div>
        <span class="del-item"
          style="font-size:9px;color:var(--text-muted);cursor:pointer;opacity:0;transition:opacity .1s;flex-shrink:0;"
          onclick="Nodes.deleteItem('${n.id}',${i})">✕</span>
      </div>`).join('');

    const rootBadge = n.isRoot ? `<span class="node-root-badge">ROOT</span>` : '';
    const delBtn    = !n.isRoot
      ? `<button class="node-action-btn del" onclick="NodeModal.confirmDelete('${n.id}')">✕</button>`
      : '';

    div.innerHTML = `
      <div class="node-actions">
        ${delBtn}
        <button class="node-action-btn" onclick="NodeModal.openEdit('${n.id}')">✎ Edit</button>
      </div>
      <div class="node-header" style="background:${t.bg};">
        <span style="font-size:14px;line-height:1;">${n.icon || '🔷'}</span>
        <span class="node-title-el" contenteditable="true"
          data-node="${n.id}"
          onblur="Nodes.onTitleBlur(this)">${escHtml(n.title || 'Card')}</span>
        <span class="node-tag" style="background:${t.border};color:${t.text};">${escHtml(n.tag || cat.name || '')}</span>
        ${rootBadge}
      </div>
      <div class="node-body">
        ${n.file ? `<div style="font-size:9px;color:${t.text};opacity:.6;margin-bottom:5px;">${escHtml(n.file)}</div>` : ''}
        <div id="items-${n.id}">${itemsHtml}</div>
        <div class="node-add-item" onclick="Nodes.addItem('${n.id}')">＋ add detail</div>
      </div>`;

    // Show/hide del-item buttons on hover
    div.addEventListener('mouseenter', () =>
      div.querySelectorAll('.del-item').forEach(e => e.style.opacity = '1'));
    div.addEventListener('mouseleave', () =>
      div.querySelectorAll('.del-item').forEach(e => e.style.opacity = '0'));

    // Drag / connect-mode click
    div.addEventListener('mousedown', e => {
      const isEditable = e.target.isContentEditable;
      const isBtn      = e.target.classList.contains('node-action-btn');
      const isAddItem  = e.target.classList.contains('node-add-item');
      const isDelItem  = e.target.classList.contains('del-item');
      if (isEditable || isBtn || isAddItem || isDelItem) return;
      if (Editor.viewMode) return;
      if (Canvas._connectMode) { e.stopPropagation(); Canvas.handleConnectClick(n.id, div); return; }
      if (e.button !== 0 || Canvas._spaceDown) return;
      e.stopPropagation();
      Canvas.startDrag(div, n, e.clientX, e.clientY);
    });

    canvasEl.appendChild(div);
  },

  // ── Inline title edit ──
  onTitleBlur(el) {
    const map = getMap();
    const n   = map?.nodes.find(x => x.id === el.dataset.node);
    if (!n) return;
    n.title = el.innerText.trim() || 'Card';
    persistMap();
  },

  // ── Inline bullet edit ──
  onItemBlur(el) {
    const map = getMap();
    const n   = map?.nodes.find(x => x.id === el.dataset.node);
    if (!n) return;
    n.items[parseInt(el.dataset.item)] = el.innerText.trim();
    persistMap();
  },

  // ── Add bullet ──
  addItem(nodeId) {
    const map = getMap();
    const n   = map?.nodes.find(x => x.id === nodeId);
    if (!n) return;
    n.items = n.items || [];
    n.items.push('New detail');
    persistMap();
    Canvas.renderAll();
    setTimeout(() => {
      const items = document.getElementById('items-' + nodeId)?.querySelectorAll('.node-item');
      if (items?.length) { const last = items[items.length - 1]; last.focus(); document.execCommand('selectAll'); }
    }, 60);
  },

  // ── Delete bullet ──
  deleteItem(nodeId, index) {
    const map = getMap();
    const n   = map?.nodes.find(x => x.id === nodeId);
    if (!n) return;
    n.items.splice(index, 1);
    persistMap();
    Canvas.renderAll();
  },
};

// ── Node modal (add / edit) ──
const NodeModal = {
  _editingId:  null,
  _selectedCatId: null,

  open() {
    const map = getMap(); if (!map) return;
    this._editingId      = null;
    this._selectedCatId  = map.categories[0]?.id || null;
    document.getElementById('node-icon-input').value          = '🔷';
    document.getElementById('node-name-input').value          = '';
    document.getElementById('node-tag-input').value           = 'COMP';
    document.getElementById('node-file-input').value          = '';
    document.getElementById('modal-node-title').textContent   = 'Add Card';
    document.getElementById('modal-node-confirm').textContent = 'Add Card';
    this._buildCatPicker();
    Modals.open('modal-node');
    setTimeout(() => document.getElementById('node-name-input').focus(), 100);
  },

  openEdit(id) {
    const map = getMap();
    const n   = map?.nodes.find(x => x.id === id);
    if (!n) return;
    this._editingId     = id;
    this._selectedCatId = n.catId || map.categories[0]?.id || null;
    document.getElementById('node-icon-input').value          = n.icon  || '🔷';
    document.getElementById('node-name-input').value          = n.title || '';
    document.getElementById('node-tag-input').value           = n.tag   || '';
    document.getElementById('node-file-input').value          = n.file  || '';
    document.getElementById('modal-node-title').textContent   = 'Edit Card';
    document.getElementById('modal-node-confirm').textContent = 'Save Changes';
    this._buildCatPicker();
    Modals.open('modal-node');
  },

  _buildCatPicker() {
    const map = getMap(); if (!map) return;
    const el  = document.getElementById('node-cat-picker');
    if (!map.categories.length) {
      el.innerHTML = '<div style="font-size:10px;color:var(--text-muted);">No categories — add one in the panel first.</div>';
      return;
    }
    el.innerHTML = map.categories.map(cat => {
      const t   = catTheme(cat);
      const sel = cat.id === this._selectedCatId;
      return `<div class="cat-chip ${sel ? 'selected' : ''}"
        style="${sel ? `background:${t.bg};border-color:#fff;color:#fff;` : `border-color:${t.border};`}"
        onclick="NodeModal.selectCat('${cat.id}')">
        <div class="cat-chip-dot" style="background:${t.text};"></div>
        ${escHtml(cat.name)}
      </div>`;
    }).join('');
  },

  selectCat(id) {
    this._selectedCatId = id;
    this._buildCatPicker();
  },

  quickAddCategory() {
    const map = getMap(); if (!map) return;
    const hex = PRESETS[map.categories.length % PRESETS.length];
    const cat = { id: genId(), name: 'New Category', hex };
    map.categories.push(cat);
    this._selectedCatId = cat.id;
    persistMap();
    this._buildCatPicker();
    Categories.render();
    showToast('Category added — rename it in the Categories panel');
  },

  confirm() {
    const icon  = document.getElementById('node-icon-input').value.trim() || '🔷';
    const title = document.getElementById('node-name-input').value.trim() || 'Card';
    const tag   = document.getElementById('node-tag-input').value.trim();
    const file  = document.getElementById('node-file-input').value.trim();
    const map   = getMap();

    if (this._editingId) {
      const n = map.nodes.find(x => x.id === this._editingId);
      if (n) { n.icon = icon; n.title = title; n.tag = tag; n.file = file; n.catId = this._selectedCatId; }
    } else {
      const wrap = document.getElementById('canvasWrap');
      const cx   = (wrap.clientWidth  / 2 - Canvas.panX) / Canvas.scale;
      const cy   = (wrap.clientHeight / 2 - Canvas.panY) / Canvas.scale;
      map.nodes.push({
        id: genId(), icon, title, tag, file,
        catId: this._selectedCatId,
        x: cx - 90, y: cy - 60,
        items: [],
        isRoot: false,
      });
    }

    persistMap();
    Modals.close('modal-node');
    Canvas.renderAll();
  },

  confirmDelete(id) {
    const map = getMap();
    const n   = map?.nodes.find(x => x.id === id);
    if (!n) return;
    document.getElementById('confirm-node-name').textContent = n.title || 'Untitled Card';
    document.getElementById('confirm-node-btn').onclick = () => {
      map.nodes  = map.nodes.filter(x => x.id !== id);
      map.arrows = map.arrows.filter(a => a.from !== id && a.to !== id);
      persistMap();
      Modals.close('modal-confirm-node');
      Canvas.renderAll();
    };
    Modals.open('modal-confirm-node');
  },
};
