// ═══════════════════════════════════════════════════
// STORAGE — isolated persistence layer
//
// ALL reads and writes go through this object.
// To add a backend (Supabase etc.), only this file changes.
// ═══════════════════════════════════════════════════

const Storage = {
  KEY_GRAPHS:  'graphwise_graphs_v1',
  KEY_FOLDERS: 'graphwise_folders_v1',

  defaults(partial = {}) {
    return {
      ownerId:       null,
      folderId:      null,
      isPublic:      false,
      shareSlug:     null,
      collaborators: [],
      version:       1,
      ...partial,
    };
  },

  migrateGraph(g) {
    if (!g.version) {
      g.version       = 1;
      g.ownerId       = null;
      g.folderId      = null;
      g.isPublic      = false;
      g.shareSlug     = null;
      g.collaborators = [];
    }
    return g;
  },

  // ── Graphs ──
  async getAllGraphs() {
    try {
      const raw = localStorage.getItem(this.KEY_GRAPHS);
      return (raw ? JSON.parse(raw) : []).map(g => this.migrateGraph(g));
    } catch { return []; }
  },

  async saveGraph(graph) {
    const all = await this.getAllGraphs();
    const idx = all.findIndex(g => g.id === graph.id);
    if (idx >= 0) all[idx] = graph; else all.push(graph);
    localStorage.setItem(this.KEY_GRAPHS, JSON.stringify(all));
  },

  async deleteGraph(id) {
    const all = await this.getAllGraphs();
    localStorage.setItem(this.KEY_GRAPHS, JSON.stringify(all.filter(g => g.id !== id)));
  },

  // ── Folders ──
  async getAllFolders() {
    try {
      const raw = localStorage.getItem(this.KEY_FOLDERS);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  },

  async saveFolder(folder) {
    const all = await this.getAllFolders();
    const idx = all.findIndex(f => f.id === folder.id);
    if (idx >= 0) all[idx] = folder; else all.push(folder);
    localStorage.setItem(this.KEY_FOLDERS, JSON.stringify(all));
  },

  async deleteFolder(id) {
    const all = await this.getAllFolders();
    localStorage.setItem(this.KEY_FOLDERS, JSON.stringify(all.filter(f => f.id !== id)));
  },
};

// ── In-memory state ──
let graphs    = [];   // all graphs
let folders   = [];   // all folders
let currentGraphId = null;

function getGraph() {
  return graphs.find(g => g.id === currentGraphId) || null;
}

async function loadAllData() {
  graphs  = await Storage.getAllGraphs();
  folders = await Storage.getAllFolders();
}

async function persistGraph() {
  const g = getGraph();
  if (!g) return;
  g.updated = Date.now();
  await Storage.saveGraph(g);
}
