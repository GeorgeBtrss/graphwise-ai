// ═══════════════════════════════════════════════════
// NODES — render, add/edit modal, delete, inline edits
// ═══════════════════════════════════════════════════

const Nodes = {
  renderOne(n, canvasEl) {
    const graph = getGraph();
    const label   = labelById(graph, n.labelId);
    const t     = labelTheme(label);

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
        <span class="node-tag" style="background:${t.border};color:${t.text};">${escHtml(n.tag || label.name || '')}</span>
        ${rootBadge}
      </div>
      <div class="node-body">
        ${n.file ? `<div style="font-size:9px;color:${t.text};opacity:.6;margin-bottom:5px;">${escHtml(n.file)}</div>` : ''}
        <div id="items-${n.id}">${itemsHtml}</div>
        <div class="node-add-item" onclick="Nodes.addItem('${n.id}')">＋ add detail</div>
      </div>`;

    div.addEventListener('mouseenter', () =>
      div.querySelectorAll('.del-item').forEach(e => e.style.opacity = '1'));
    div.addEventListener('mouseleave', () =>
      div.querySelectorAll('.del-item').forEach(e => e.style.opacity = '0'));

    div.addEventListener('mousedown', e => {
      const isEditable = e.target.isContentEditable;
      const isBtn      = e.target.classList.contains('node-action-btn');
      const isAddItem  = e.target.classList.contains('node-add-item');
      const isDelItem  = e.target.classList.contains('del-item');
      if (isEditable || isBtn || isAddItem || isDelItem) return;
      if (Editor.viewMode) return;
      if (Canvas._connectMode) { e.stopPropagation(); Canvas.handleConnectClick(n.id, div); return; }
      if (e.button !== 0 || Canvas._ctrlDown) return;
      e.stopPropagation();
      Canvas.startDrag(div, n, e.clientX, e.clientY);
    });

    canvasEl.appendChild(div);
  },

  onTitleBlur(el) {
    const graph = getGraph();
    const n     = graph?.nodes.find(x => x.id === el.dataset.node);
    if (!n) return;
    n.title = el.innerText.trim() || 'Card';
    persistGraph();
  },

  onItemBlur(el) {
    const graph = getGraph();
    const n     = graph?.nodes.find(x => x.id === el.dataset.node);
    if (!n) return;
    n.items[parseInt(el.dataset.item)] = el.innerText.trim();
    persistGraph();
  },

  addItem(nodeId) {
    const graph = getGraph();
    const n     = graph?.nodes.find(x => x.id === nodeId);
    if (!n) return;
    n.items = n.items || [];
    n.items.push('New detail');
    persistGraph();
    Canvas.renderAll();
    setTimeout(() => {
      const items = document.getElementById('items-' + nodeId)?.querySelectorAll('.node-item');
      if (items?.length) { const last = items[items.length - 1]; last.focus(); document.execCommand('selectAll'); }
    }, 60);
  },

  deleteItem(nodeId, index) {
    const graph = getGraph();
    const n     = graph?.nodes.find(x => x.id === nodeId);
    if (!n) return;
    n.items.splice(index, 1);
    persistGraph();
    Canvas.renderAll();
  },
};

// ── Node modal ──
const NodeModal = {
  _editingId:     null,
  _selectedLabelId: null,

  open() {
    const graph = getGraph(); if (!graph) return;
    this._editingId      = null;
    this._selectedLabelId  = graph.labels[0]?.id || null;
    document.getElementById('node-icon-input').value          = '🔷';
    document.getElementById('node-name-input').value          = '';
    document.getElementById('node-tag-input').value           = 'COMP';
    document.getElementById('node-file-input').value          = '';
    document.getElementById('modal-node-title').textContent   = 'Add Card';
    document.getElementById('modal-node-confirm').textContent = 'Add Card';
    this._buildLabelPicker();
    Modals.open('modal-node');
    setTimeout(() => document.getElementById('node-name-input').focus(), 100);
  },

  openEdit(id) {
    const graph = getGraph();
    const n     = graph?.nodes.find(x => x.id === id);
    if (!n) return;
    this._editingId     = id;
    this._selectedLabelId = n.labelId || graph.labels[0]?.id || null;
    document.getElementById('node-icon-input').value          = '🔷';
    document.getElementById('node-name-input').value          = n.title || '';
    document.getElementById('node-tag-input').value           = n.tag   || '';
    document.getElementById('node-file-input').value          = n.file  || '';
    document.getElementById('modal-node-title').textContent   = 'Edit Card';
    document.getElementById('modal-node-confirm').textContent = 'Save Changes';
    this._buildLabelPicker();
    Modals.open('modal-node');
  },

  _buildLabelPicker() {
    const graph = getGraph();
    if (!graph) return;

    const el = document.getElementById('node-label-picker');

    if (!graph.labels.length) {
      el.innerHTML = `
        <div style="font-size:10px;color:var(--text-muted);">
          No labels — add one in the Labels panel first.
        </div>
      `;
      return;
    }

    el.innerHTML = `
      <div class="node-label-select-wrap">
        <div
          class="node-label-preview"
          id="node-label-preview">
        </div>

        <select
          id="node-label-select"
          class="node-label-select"
          onchange="NodeModal.selectLabel(this.value)">
          ${graph.labels.map(label => `
            <option
              value="${label.id}"
              ${label.id === this._selectedLabelId ? 'selected' : ''}>
              ${escHtml(label.name)}
            </option>
          `).join('')}
        </select>
      </div>
    `;

    this._updateLabelPreview();
  },

  selectLabel(id) {
    this._selectedLabelId = id;
    this._buildLabelPicker();
  },

  _updateLabelPreview() {
    const graph = getGraph();
    if (!graph) return;

    const label = graph.labels.find(
      l => l.id === this._selectedLabelId
    );

    const preview = document.getElementById('node-label-preview');

    if (!preview || !label) return;

    preview.style.background = label.hex;
  },

  selectLabel(id) {
    this._selectedLabelId = id;

    this._updateLabelPreview();
  },

  quickAddLabel() {
    const graph = getGraph(); if (!graph) return;
    const hex   = PRESETS[graph.labels.length % PRESETS.length];
    const label = { id: genId(), name: 'New Label', hex };
    graph.labels.push(label);
    this._selectedLabelId = label.id;
    persistGraph();
    this._buildLabelPicker();
    Labels.render();
    showToast('Label added — rename it in the Labels panel');
  },

  confirm() {
    const icon  = document.getElementById('node-icon-input').value.trim() || '🔷';
    const title = document.getElementById('node-name-input').value.trim() || 'Card';
    const tag   = document.getElementById('node-tag-input').value.trim();
    const file  = document.getElementById('node-file-input').value.trim();
    const graph = getGraph();

    if (this._editingId) {
      const n = graph.nodes.find(x => x.id === this._editingId);
      if (n) { n.icon = icon; n.title = title; n.tag = tag; n.file = file; n.labelId = this._selectedLabelId; }
    } else {
      const wrap = document.getElementById('canvasWrap');
      const cx   = (wrap.clientWidth  / 2 - Canvas.panX) / Canvas.scale;
      const cy   = (wrap.clientHeight / 2 - Canvas.panY) / Canvas.scale;
      graph.nodes.push({
        id: genId(), icon, title, tag, file,
        labelId: this._selectedLabelId,
        x: cx - 90, y: cy - 60,
        items: [], isRoot: false,
      });
    }

    persistGraph();
    Modals.close('modal-node');
    Canvas.renderAll();
  },

  confirmDelete(id) {
    const graph = getGraph();
    const n     = graph?.nodes.find(x => x.id === id);
    if (!n) return;
    document.getElementById('confirm-node-name').textContent = n.title || 'Untitled Card';
    document.getElementById('confirm-node-btn').onclick = () => {
      graph.nodes  = graph.nodes.filter(x => x.id !== id);
      graph.arrows = graph.arrows.filter(a => a.from !== id && a.to !== id);
      persistGraph();
      Modals.close('modal-confirm-node');
      Canvas.renderAll();
    };
    Modals.open('modal-confirm-node');
  },
};
