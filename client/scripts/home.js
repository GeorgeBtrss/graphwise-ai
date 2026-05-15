// ═══════════════════════════════════════════════════
// HOME — tabs (Graphs / Folders), create, delete,
//        edit, preview
// ═══════════════════════════════════════════════════

const Home = {
  _activeTab:      'graphs',
  _editingGraphId: null,
  _editingFolderId: null,
  _selectedFolders: new Set(),

  render() {
    this._renderTab(this._activeTab);
  },

  switchTab(tab) {
    this._activeTab = tab;
    document.getElementById('tab-graphs').classList.toggle('active',  tab === 'graphs');
    document.getElementById('tab-folders').classList.toggle('active', tab === 'folders');
    this._renderTab(tab);
  },

  _renderTab(tab) {
    const el = document.getElementById('home-content');
    if (tab === 'graphs') this._renderGraphs(el);
    else                  this._renderFolders(el);
  },

  // ── GRAPHS TAB ──────────────────────────────────
  _renderGraphs(el) {
  console.log('graphs:', graphs);
  console.log('el:', el);

  if (!el) {
    console.error('home-content not found');
    return;
  }

  if (!graphs || graphs.length === 0) {
    el.innerHTML = `
      <div class="empty-state">
        <span class="big">◈</span>
        <p>No graphs yet.<br>Create your first graph to get started.</p><br>
        <button class="btn btn-primary"
          onclick="Home.createNewGraph()"
          style="margin:0 auto;">
          ✦ New Graph
        </button>
      </div>
    `;
    return;
  }

    const cards = graphs.map(g => this._graphCard(g)).join('');

    el.innerHTML = `<div class="home-section-title">All Graphs</div>
      <div class="graphs-grid">
        ${cards}
        <div class="new-graph-card" onclick="Home.createNewGraph()">
          <div class="plus">✦</div><span>New Graph</span>
        </div>
      </div>`;
  },

  // Shared card template used in both tabs
  _graphCard(g) {
    const nc     = g.nodes.length, ac = g.arrows.length;
    const upd    = g.updated ? new Date(g.updated).toLocaleDateString() : 'Today';
    const folder = g.folderId ? folders.find(f => f.id === g.folderId) : null;
    const folderBadge = folder
      ? `<span class="graph-card-folder">📁 ${escHtml(folder.name)}</span>`
      : '';
    return `<div class="graph-card" onclick="Home.open('${g.id}')">
      <div class="graph-card-preview">${this._miniPreview(g)}</div>
      <div class="graph-card-body">
        <div class="graph-card-name">${escHtml(g.name || 'Untitled')}</div>
        <div class="graph-card-meta">
          <span>${nc} card${nc !== 1 ? 's' : ''}</span>
          <span>${ac} arrow${ac !== 1 ? 's' : ''}</span>
          <span>${upd}</span>
          ${folderBadge}
        </div>
      </div>
      <div class="graph-card-actions">
        <button class="btn-edit-sm"
          onclick="event.stopPropagation(); Home.editGraph('${g.id}')">✎ Edit</button>
        <button class="btn-danger-sm"
          onclick="event.stopPropagation(); Home.deleteGraph('${g.id}')">Delete</button>
      </div>
    </div>`;
  },

  // ── FOLDERS TAB ─────────────────────────────────
  _renderFolders(el) {
    const folderCards = folders.map(f => {
      const count = graphs.filter(g => g.folderId === f.id).length;
      return `<div class="folder-card" onclick="Home._openFolder('${f.id}')">
        <div class="folder-icon">📁</div>
        <div class="folder-info">
          <div class="folder-name">${escHtml(f.name)}</div>
          <div class="folder-meta">${count} graph${count !== 1 ? 's' : ''}</div>
        </div>
        <div class="folder-actions">
          <button class="btn-edit-sm"
            onclick="event.stopPropagation(); Home.editFolder('${f.id}')">
            ✎ Edit
          </button>

          <button class="btn-danger-sm"
            onclick="event.stopPropagation(); Home.deleteFolder('${f.id}')">
            Delete
          </button>
        </div>
      </div>`;
    }).join('');

    const ungrouped      = graphs.filter(g => !g.folderId);
    const ungroupedCards = ungrouped.map(g => this._graphCard(g)).join('');

    const foldersSection = `<div class="home-section-title">Folders</div>
      <div class="folders-grid">
        ${folderCards}
        <div class="new-folder-card" onclick="Home.createNewFolder()">
          <div class="plus">+</div><span>New Folder</span>
        </div>
      </div>`;

    const ungroupedSection = ungrouped.length
      ? `<div class="home-section-title" style="margin-top:32px;">Ungrouped Graphs</div>
         <div class="graphs-grid">${ungroupedCards}</div>`
      : '';

    el.innerHTML = foldersSection + ungroupedSection;
  },

  // ── FOLDER DRILL-DOWN ───────────────────────────
  _openFolder(folderId) {
    const el           = document.getElementById('home-content');
    const folder       = folders.find(f => f.id === folderId);
    const folderGraphs = graphs.filter(g => g.folderId === folderId);
    const cards        = folderGraphs.map(g => this._graphCard(g)).join('');
    const empty        = !folderGraphs.length
      ? `<div class="empty-state" style="padding:40px 0;"><p>No graphs in this folder yet.</p></div>`
      : '';

    el.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:20px;">
        <button class="back-btn" style="padding:4px 8px;"
          onclick="Home.switchTab('folders')">← Folders</button>
        <div class="home-section-title" style="margin:0;">
          📁 ${escHtml(folder?.name || 'Folder')}
        </div>
      </div>
      <div class="graphs-grid">
        ${cards}
        <div class="new-graph-card" onclick="Home.createNewGraph('${folderId}')">
          <div class="plus">✦</div><span>New Graph Here</span>
        </div>
      </div>${empty}`;
  },

  // ── MINI PREVIEW ────────────────────────────────
  _miniPreview(graph) {
    if (!graph.nodes || !graph.nodes.length) {
      return '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:#333;font-size:22px;">◈</div>';
    }
    const nodes = graph.nodes;
    let minX=Infinity, minY=Infinity, maxX=-Infinity, maxY=-Infinity;
    nodes.forEach(n => {
      minX=Math.min(minX,n.x); minY=Math.min(minY,n.y);
      maxX=Math.max(maxX,n.x+200); maxY=Math.max(maxY,n.y+120);
    });
    const pw=280, ph=160, pad=20;
    const sc   = Math.min((pw-pad*2)/(maxX-minX||1),(ph-pad*2)/(maxY-minY||1),.5);
    const offX = pad - minX*sc, offY = pad - minY*sc;

    const rects = nodes.map(n => {
      const lbl = labelById(graph, n.labelId);

      const t = lbl
        ? labelTheme(lbl)
        : {
            bg: '#1e1e1e',
            border: '#444',
            text: '#fff'
          };
      const x=n.x*sc+offX, y=n.y*sc+offY, w=180*sc, h=80*sc;
      return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="4"
        fill="${t.bg}" stroke="${t.border}" stroke-width="1" opacity=".9"/>
        <text x="${x+5}" y="${y+11}" font-size="7" fill="${t.text}"
          font-family="Fraunces,serif" font-weight="700">${escHtml((n.title||'').slice(0,16))}</text>`;
    }).join('');

    const lines = (graph.arrows || []).map(a => {
      const fn=nodes.find(n=>n.id===a.from), tn=nodes.find(n=>n.id===a.to);
      if (!fn||!tn) return '';
      return `<line x1="${(fn.x+90)*sc+offX}" y1="${(fn.y+40)*sc+offY}"
        x2="${(tn.x+90)*sc+offX}" y2="${(tn.y+40)*sc+offY}"
        stroke="#4040a0" stroke-width=".8" opacity=".5"/>`;
    }).join('');

    return `<svg width="${pw}" height="${ph}" xmlns="http://www.w3.org/2000/svg">${lines}${rects}</svg>`;
  },

  // ── CREATE GRAPH ────────────────────────────────
  createNewGraph(presetFolderId = null) {
    const sel = document.getElementById('newgraph-folder');
    sel.innerHTML = '<option value="">— No folder —</option>' +
      folders.map(f => `<option value="${f.id}">${escHtml(f.name)}</option>`).join('');
    if (presetFolderId) sel.value = presetFolderId;
    document.getElementById('newgraph-name').value = '';
    Modals.open('modal-newgraph');
    setTimeout(() => document.getElementById('newgraph-name').focus(), 100);
  },

  confirmNewGraph() {
    const name     = document.getElementById('newgraph-name').value.trim() || 'Untitled Graph';
    const folderId = document.getElementById('newgraph-folder').value || null;
    const labels   = makeDefaultLabels();
    const rootNode = {
      id:      genId(),
      icon:    '🔶',
      title:   'App Entry',
      tag:     'ROOT',
      file:    '',
      labelId: labels[0].id,
      x:       300,
      y:       200,
      items:   ['Entry point', 'Global setup'],
      isRoot:  true,
    };
    const graph = Storage.defaults({
      id:      genId(),
      name,
      desc:    '',
      folderId,
      labels,
      nodes:   [rootNode],
      arrows:  [],
      created: Date.now(),
      updated: Date.now(),
    });
    graphs.push(graph);
    Storage.saveGraph(graph);
    Modals.close('modal-newgraph');
    this.open(graph.id);
  },

  // ── DELETE GRAPH ────────────────────────────────
  deleteGraph(id) {
    const g = graphs.find(x => x.id === id); if (!g) return;
    document.getElementById('confirm-delete-graphname').textContent = g.name || 'Untitled';
    document.getElementById('confirm-delete-btn').onclick = async () => {
      graphs = graphs.filter(x => x.id !== id);
      await Storage.deleteGraph(id);
      Modals.close('modal-confirm-delete');
      this.render();
    };
    Modals.open('modal-confirm-delete');
  },

  // ── EDIT GRAPH ──────────────────────────────────
  editGraph(id) {
    const g = graphs.find(x => x.id === id); if (!g) return;
    this._editingGraphId = id;
    document.getElementById('editgraph-name').value = g.name || '';
    const sel = document.getElementById('editgraph-folder');
    sel.innerHTML = '<option value="">— No folder —</option>' +
      folders.map(f =>
        `<option value="${f.id}" ${f.id === g.folderId ? 'selected' : ''}>${escHtml(f.name)}</option>`
      ).join('');
    Modals.open('modal-editgraph');
    setTimeout(() => document.getElementById('editgraph-name').focus(), 100);
  },

  confirmEdit() {
    const g = graphs.find(x => x.id === this._editingGraphId); if (!g) return;
    const newName = document.getElementById('editgraph-name').value.trim();
    if (newName) g.name = newName;
    g.folderId = document.getElementById('editgraph-folder').value || null;
    g.updated  = Date.now();
    Storage.saveGraph(g);
    Modals.close('modal-editgraph');
    this._editingGraphId = null;
    this.render();
  },

  // ── CREATE FOLDER ───────────────────────────────
  createNewFolder() {
    this._editingFolderId = null;

    document.getElementById('newfolder-name').value = '';

    const title = document.querySelector('#modal-newfolder h2');
    if (title) title.textContent = 'New Folder';

    Modals.open('modal-newfolder');

    setTimeout(() => document.getElementById('newfolder-name').focus(), 100);
  },

  confirmNewFolder() {
    const name = document.getElementById('newfolder-name')
      .value
      .trim() || 'New Folder';

    // ── EDIT MODE ─────────────────────
    if (this._editingFolderId) {
      const folder = folders.find(f => f.id === this._editingFolderId);

      if (folder) {
        folder.name = name;
        Storage.saveFolder(folder);
      }

      this._editingFolderId = null;
      Modals.close('modal-newfolder');
      this.render();
      return;
    }

    // ── CREATE MODE ────────────────────
    const folder = {
      id: genId(),
      name,
      created: Date.now()
    };

    folders.push(folder);
    Storage.saveFolder(folder);

    Modals.close('modal-newfolder');
    this.switchTab('folders');
  },

  // ── DELETE FOLDER ───────────────────────────────
  deleteFolder(id) {
    const f = folders.find(x => x.id === id); if (!f) return;
    document.getElementById('confirm-folder-name').textContent = f.name || 'Untitled';
    document.getElementById('confirm-folder-btn').onclick = async () => {
      graphs.forEach(g => {
        if (g.folderId === id) { g.folderId = null; Storage.saveGraph(g); }
      });
      folders = folders.filter(x => x.id !== id);
      await Storage.deleteFolder(id);
      Modals.close('modal-confirm-folder');
      this.render();
    };
    Modals.open('modal-confirm-folder');
  },

  // ── EDIT FOLDER ────────────────────────────────
  editFolder(id) {
    const folder = folders.find(f => f.id === id);
    if (!folder) return;

    this._editingFolderId = id;

    document.getElementById('newfolder-name').value = folder.name;

    // optional: update modal title so user knows it's editing
    const title = document.querySelector('#modal-newfolder h2');
    if (title) title.textContent = 'Edit Folder';

    Modals.open('modal-newfolder');
  },

  open(id) { Editor.open(id); },
};
