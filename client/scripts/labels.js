// ═══════════════════════════════════════════════════
// CATEGORIES — CRUD + legend panel rendering
// ═══════════════════════════════════════════════════

const Categories = {
  render() {
    const map = getMap();
    if (!map) return;
    const el = document.getElementById('legend-items');
    if (!map.categories.length) {
      el.innerHTML = '<div style="font-size:10px;color:var(--text-muted);padding:2px 0 6px;">No categories yet</div>';
      return;
    }
    el.innerHTML = map.categories.map(cat => {
      const t = catTheme(cat);
      return `<div class="cat-row" id="catrow-${cat.id}">
        <div class="cat-swatch" style="background:${t.bg};border-color:${t.border};"
          onclick="ColorPicker.openForCategory('${cat.id}')"></div>
        <input class="cat-name-input" value="${escHtml(cat.name)}" placeholder="Category name"
          onblur="Categories.rename('${cat.id}', this.value)"
          onkeydown="if(event.key==='Enter') this.blur()">
        <button class="cat-del-btn" onclick="Categories.delete('${cat.id}')" title="Delete">✕</button>
      </div>`;
    }).join('');
  },

  add() {
    const map = getMap();
    if (!map) return;
    const hex = PRESETS[map.categories.length % PRESETS.length];
    const cat = { id: genId(), name: 'New Category', hex };
    map.categories.push(cat);
    persistMap();
    this.render();
    setTimeout(() => {
      const inp = document.querySelector(`#catrow-${cat.id} .cat-name-input`);
      if (inp) { inp.focus(); inp.select(); }
    }, 60);
  },

  rename(id, name) {
    const map = getMap();
    const cat = map?.categories.find(c => c.id === id);
    if (!cat) return;
    cat.name = name.trim() || cat.name;
    persistMap();
    this.render();
    Canvas.renderAll();
  },

  delete(id) {
    const map = getMap();
    if (!map) return;
    const used = map.nodes.some(n => n.catId === id);
    if (used && !confirm('This category is used by some cards. Delete anyway?')) return;
    map.categories = map.categories.filter(c => c.id !== id);
    map.nodes.forEach(n => { if (n.catId === id) n.catId = map.categories[0]?.id || null; });
    persistMap();
    this.render();
    Canvas.renderAll();
  },
};
