// ═══════════════════════════════════════════════════
// STORAGE — isolated persistence layer
//
// ALL reads and writes go through this object.
// To add a backend (Supabase, etc.), only this file changes.
// Every other file calls Storage.* and stays untouched.
// ═══════════════════════════════════════════════════

const Storage = {
  KEY: 'graphwise_v3',

  // ── Future-ready map shape ──
  // When you add accounts, fill these in from auth session:
  //   ownerId, folderId, isPublic, shareSlug, collaborators, version
  defaults(partial = {}) {
    return {
      ownerId:       null,   // → auth.user.id when accounts exist
      folderId:      null,   // → folder UUID for organisation
      isPublic:      false,  // → true when shared publicly
      shareSlug:     null,   // → e.g. "graphwise.io/m/my-app"
      collaborators: [],     // → [{userId, role}] for sharing
      version:       1,      // → bump when schema changes, drives migrateMap()
      ...partial,
    };
  },

  // Migrate old saved maps to the current schema version
  migrateMap(map) {
    if (!map.version) {
      // v0 → v1: add future-ready fields with safe defaults
      map.version       = 1;
      map.ownerId       = null;
      map.folderId      = null;
      map.isPublic      = false;
      map.shareSlug     = null;
      map.collaborators = [];
    }
    // if (map.version === 1) { /* v1 → v2 changes */ map.version = 2; }
    return map;
  },

  // ── CRUD ──
  // All async even though localStorage is sync.
  // Swap body to await fetch()/supabase when ready.

  async getAll() {
    try {
      const raw = localStorage.getItem(this.KEY);
      const maps = raw ? JSON.parse(raw) : [];
      return maps.map(m => this.migrateMap(m));
    } catch (e) {
      console.error('Storage.getAll failed', e);
      return [];
    }
  },

  async save(map) {
    // Later: await supabase.from('maps').upsert({ id: map.id, data: map })
    const all = await this.getAll();
    const idx = all.findIndex(m => m.id === map.id);
    if (idx >= 0) all[idx] = map; else all.push(map);
    localStorage.setItem(this.KEY, JSON.stringify(all));
  },

  async delete(id) {
    // Later: await supabase.from('maps').delete().eq('id', id)
    const all = await this.getAll();
    localStorage.setItem(this.KEY, JSON.stringify(all.filter(m => m.id !== id)));
  },

  async getById(id) {
    const all = await this.getAll();
    return all.find(m => m.id === id) || null;
  },
};

// ── In-memory state (single source of truth during a session) ──
let maps = [];
let currentMapId = null;

function getMap() {
  return maps.find(m => m.id === currentMapId) || null;
}

async function loadAllMaps() {
  maps = await Storage.getAll();
}

async function persistMap() {
  const map = getMap();
  if (!map) return;
  map.updated = Date.now();
  await Storage.save(map);
}
