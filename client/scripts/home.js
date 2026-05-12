// ═══════════════════════════════════════════════════
// HOME — map grid, create, delete, mini preview
// ═══════════════════════════════════════════════════

const Home = {
  render() {
    const el = document.getElementById('home-content');

    if (!maps.length) {
      el.innerHTML = `
        <div class="empty-state">
          <span class="big">∅</span>
          <p>No maps yet.<br>Create your first architecture map to get started.</p>
          <br>
          <button class="btn btn-primary" onclick="Home.createNew()" style="margin:0 auto;">＋ New Map</button>
        </div>`;
      return;
    }

    const cards = maps.map(m => {
      const nc  = m.nodes.length, ac = m.arrows.length;
      const upd = m.updated ? new Date(m.updated).toLocaleDateString() : 'Today';
      return `
        <div class="map-card" onclick="Home.open('${m.id}')">
          <div class="map-card-preview">${this._miniPreview(m)}</div>
          <div class="map-card-body">
            <div class="map-card-name">${escHtml(m.name || 'Untitled')}</div>
            <div class="map-card-meta">
              <span>${nc} card${nc !== 1 ? 's' : ''}</span>
              <span>${ac} arrow${ac !== 1 ? 's' : ''}</span>
              <span>${upd}</span>
            </div>
          </div>
          <div class="map-card-actions">
            <button class="btn-danger-sm"
              onclick="event.stopPropagation(); Home.delete('${m.id}')">Delete</button>
          </div>
        </div>`;
    }).join('');

    el.innerHTML = `
      <div class="home-section-title">Your Maps</div>
      <div class="maps-grid">
        ${cards}
        <div class="new-map-card" onclick="Home.createNew()">
          <div class="plus">+</div><span>New Map</span>
        </div>
      </div>`;
  },

  // ── Mini SVG thumbnail ──
  _miniPreview(map) {
    if (!map.nodes.length) return '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:#333;font-size:22px;">∅</div>';
    const nodes = map.nodes;
    let minX=Infinity, minY=Infinity, maxX=-Infinity, maxY=-Infinity;
    nodes.forEach(n => {
      minX=Math.min(minX,n.x); minY=Math.min(minY,n.y);
      maxX=Math.max(maxX,n.x+200); maxY=Math.max(maxY,n.y+120);
    });
    const pw=280, ph=160, pad=20;
    const sc = Math.min((pw-pad*2)/(maxX-minX||1), (ph-pad*2)/(maxY-minY||1), .5);
    const offX = pad - minX*sc, offY = pad - minY*sc;

    const rects = nodes.map(n => {
      const t = catTheme(catById(map, n.catId));
      const x=n.x*sc+offX, y=n.y*sc+offY, w=180*sc, h=80*sc;
      return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="4"
        fill="${t.bg}" stroke="${t.border}" stroke-width="1" opacity=".9"/>
        <text x="${x+5}" y="${y+11}" font-size="7" fill="${t.text}"
          font-family="Fraunces,serif" font-weight="700">${escHtml((n.title||'').slice(0,16))}</text>`;
    }).join('');

    const lines = map.arrows.map(a => {
      const fn=nodes.find(n=>n.id===a.from), tn=nodes.find(n=>n.id===a.to);
      if (!fn||!tn) return '';
      return `<line x1="${(fn.x+90)*sc+offX}" y1="${(fn.y+40)*sc+offY}"
        x2="${(tn.x+90)*sc+offX}" y2="${(tn.y+40)*sc+offY}"
        stroke="#4040a0" stroke-width=".8" opacity=".5"/>`;
    }).join('');

    return `<svg width="${pw}" height="${ph}" xmlns="http://www.w3.org/2000/svg">${lines}${rects}</svg>`;
  },

  // ── Create ──
  createNew() {
    document.getElementById('newmap-name').value = '';
    Modals.open('modal-newmap');
    setTimeout(() => document.getElementById('newmap-name').focus(), 100);
  },

  confirmNew() {
    const name       = document.getElementById('newmap-name').value.trim() || 'Untitled Map';
    const categories = makeDefaultCategories();
    const rootNode   = {
      id: genId(), icon: '🔶', title: 'App Entry', tag: 'ROOT', file: '',
      catId: categories[0].id, x: 300, y: 200,
      items: ['Entry point', 'Global setup'],
      isRoot: true,
    };
    const map = {
      ...Storage.defaults({
        id:         genId(),
        name,
        desc:       '',
        categories,
        nodes:      [rootNode],
        arrows:     [],
        created:    Date.now(),
        updated:    Date.now(),
      }),
    };
    maps.push(map);
    Storage.save(map);
    Modals.close('modal-newmap');
    this.open(map.id);
  },

  // ── Delete (styled confirm modal) ──
  delete(id) {
    const map = maps.find(m => m.id === id); if (!map) return;
    document.getElementById('confirm-delete-mapname').textContent = map.name || 'Untitled';
    document.getElementById('confirm-delete-btn').onclick = async () => {
      maps = maps.filter(m => m.id !== id);
      await Storage.delete(id);
      Modals.close('modal-confirm-delete');
      this.render();
    };
    Modals.open('modal-confirm-delete');
  },

  // ── Open ──
  open(id) { Editor.open(id); },
};
