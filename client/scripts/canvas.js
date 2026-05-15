// ═══════════════════════════════════════════════════
// CANVAS — viewport, pan, zoom, drag, arrow drawing
// ═══════════════════════════════════════════════════

const Canvas = {
  scale: 1, panX: 60, panY: 60,
  _isPanning: false, _panStart: { x:0, y:0 },
  _ctrlDown: false,
  _dragging: null, _dragOffset: { x:0, y:0 },
  _rafId: null,

  applyTransform() {
    document.getElementById('canvas').style.transform =
      `translate(${this.panX}px,${this.panY}px) scale(${this.scale})`;
  },

  zoomIn()  { this.scale = clamp(this.scale * 1.2, .15, 3); this.applyTransform(); },
  zoomOut() { this.scale = clamp(this.scale / 1.2, .15, 3); this.applyTransform(); },

  fitToScreen() {
    const graph = getGraph();
    if (!graph || !graph.nodes.length) return;
    const wrap = document.getElementById('canvasWrap');
    let minX=Infinity, minY=Infinity, maxX=-Infinity, maxY=-Infinity;
    graph.nodes.forEach(n => {
      const el = document.getElementById(n.id);
      const w = el ? el.offsetWidth : 200, h = el ? el.offsetHeight : 120;
      minX = Math.min(minX, n.x); minY = Math.min(minY, n.y);
      maxX = Math.max(maxX, n.x + w); maxY = Math.max(maxY, n.y + h);
    });
    const pad = 80, pw = wrap.clientWidth, ph = wrap.clientHeight;
    const cw = maxX - minX + pad * 2, ch = maxY - minY + pad * 2;
    this.scale = clamp(Math.min(pw / cw, ph / ch), .15, 1.2);
    this.panX  = (pw - cw * this.scale) / 2 - minX * this.scale + pad * this.scale;
    this.panY  = (ph - ch * this.scale) / 2 - minY * this.scale + pad * this.scale;
    this.applyTransform();
  },

  reset() {
    this.scale = 1; this.panX = 60; this.panY = 60;
    this._ctrlDown = false;
    this.applyTransform();
  },

  renderAll() {
    const canvas = document.getElementById('canvas');
    Array.from(canvas.children).forEach(c => { if (c.tagName !== 'svg') c.remove(); });
    const graph = getGraph();
    if (!graph) return;
    graph.nodes.forEach(n => Nodes.renderOne(n, canvas));
    this.drawArrows();
    Labels.render();
    this.applyTransform();
  },

  drawArrows() {
    const svg = document.getElementById('svg');
    svg.innerHTML = '';
    const graph = getGraph();
    if (!graph) return;

    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    ['solid','dashed'].forEach(type => {
      const m = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
      m.setAttribute('id', `arr-${type}`);
      m.setAttribute('viewBox','0 0 10 10'); m.setAttribute('refX','8'); m.setAttribute('refY','5');
      m.setAttribute('markerWidth','6'); m.setAttribute('markerHeight','6'); m.setAttribute('orient','auto-start-reverse');
      const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      p.setAttribute('d','M0 0 L10 5 L0 10 z'); p.setAttribute('fill','#5060a0');
      m.appendChild(p); defs.appendChild(m);
    });
    svg.appendChild(defs);

    graph.arrows.forEach(a => {
      const fn = graph.nodes.find(n => n.id === a.from);
      const tn = graph.nodes.find(n => n.id === a.to);
      if (!fn || !tn) return;

      const fe = document.getElementById(fn.id), te = document.getElementById(tn.id);
      const fw = fe?fe.offsetWidth:200, fh = fe?fe.offsetHeight:120;
      const tw = te?te.offsetWidth:200, th = te?te.offsetHeight:120;
      const fr = { cx:fn.x+fw/2, cy:fn.y+fh/2, w:fw, h:fh };
      const tr = { cx:tn.x+tw/2, cy:tn.y+th/2, w:tw, h:th };
      const fp = this._edgePt(fr, tr.cx, tr.cy);
      const tp = this._edgePt(tr, fr.cx, fr.cy);

      const dx = tp.x-fp.x, dy = tp.y-fp.y;
      const len = Math.sqrt(dx*dx+dy*dy) || 1, bend = Math.min(80, len*.3);
      const d = `M${fp.x} ${fp.y} C${fp.x+(dx/len)*bend} ${fp.y+(dy/len)*bend},${tp.x-(dx/len)*bend} ${tp.y-(dy/len)*bend},${tp.x} ${tp.y}`;

      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', d); path.setAttribute('stroke','#5060a0');
      path.setAttribute('stroke-width','1.5'); path.setAttribute('fill','none');
      path.setAttribute('opacity','.55'); path.setAttribute('marker-end',`url(#arr-${a.style||'solid'})`);
      if (a.style === 'dashed') { path.setAttribute('stroke-dasharray','6,4'); path.style.animation='dash-flow 1.5s linear infinite'; }

      const hit = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      hit.setAttribute('d', d); hit.setAttribute('stroke','transparent');
      hit.setAttribute('stroke-width','14'); hit.setAttribute('fill','none');
      hit.style.pointerEvents = 'stroke';
      hit.style.cursor = Editor.viewMode ? 'default' : 'pointer';
      hit.addEventListener('click', e => {
        if (Editor.viewMode) return;
        e.stopPropagation();
        Arrows.showMenu(a.id, e.clientX, e.clientY);
      });
      hit.addEventListener('mouseenter', () => { if (!Editor.viewMode) path.setAttribute('opacity','1'); });
      hit.addEventListener('mouseleave', () => path.setAttribute('opacity','.55'));

      svg.appendChild(path);
      svg.appendChild(hit);

      if (a.label) {
        const mx = (fp.x+tp.x)/2, my = (fp.y+tp.y)/2;
        const txt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        txt.setAttribute('x', mx); txt.setAttribute('y', my-6);
        txt.setAttribute('text-anchor','middle'); txt.setAttribute('font-size','9');
        txt.setAttribute('fill','#5a6080'); txt.setAttribute('font-family','DM Mono,monospace');
        txt.textContent = a.label;
        svg.appendChild(txt);
      }
    });
  },

  _edgePt(r, tx, ty) {
    const dx = tx-r.cx, dy = ty-r.cy;
    if (!dx && !dy) return { x:r.cx, y:r.cy };
    const hw = r.w/2, hh = r.h/2;
    const sx = hw/Math.abs(dx||1e-9), sy = hh/Math.abs(dy||1e-9);
    const s = Math.min(sx, sy);
    return { x: r.cx+dx*s, y: r.cy+dy*s };
  },

  // ── Connect mode ──
  _connectMode: false, _connectSrc: null,

  toggleConnectMode() {
    this._connectMode = !this._connectMode;
    this._connectSrc  = null;
    const btn  = document.getElementById('btn-connect');
    const wrap = document.getElementById('canvasWrap');
    btn.classList.toggle('active', this._connectMode);
    wrap.classList.toggle('arrow-mode', this._connectMode);
    if (this._connectMode) showToast('Click source card, then target card');
    else this._clearConnectHL();
  },

  _clearConnectHL() {
    document.querySelectorAll('.node.connect-src,.node.connect-hover')
      .forEach(e => e.classList.remove('connect-src','connect-hover'));
  },

  handleConnectClick(nodeId, el) {
    if (!this._connectSrc) {
      this._connectSrc = nodeId;
      el.classList.add('connect-src');
      showToast('Now click the target card');
    } else {
      if (this._connectSrc === nodeId) { showToast('Cannot connect a card to itself'); return; }
      const from = this._connectSrc;
      this._clearConnectHL();
      this._connectSrc = null;
      Arrows.openAddModal(from, nodeId);
    }
  },

  init() {
    const wrap = document.getElementById('canvasWrap');

    document.addEventListener('mousemove', e => {
      if (this._dragging) {
        const id    = this._dragging.id;
        const graph = getGraph();
        const n     = graph?.nodes.find(x => x.id === id);
        if (!n) return;
        n.x = (e.clientX - this.panX) / this.scale - this._dragOffset.x;
        n.y = (e.clientY - this.panY) / this.scale - this._dragOffset.y;
        this._dragging.style.left = n.x + 'px';
        this._dragging.style.top  = n.y + 'px';
        if (!this._rafId) this._rafId = requestAnimationFrame(() => { this.drawArrows(); this._rafId = null; });
        return;
      }
      if (this._isPanning) {
        this.panX = e.clientX - this._panStart.x;
        this.panY = e.clientY - this._panStart.y;
        this.applyTransform();
      }
    });

    document.addEventListener('mouseup', () => {
      if (this._dragging) {
        this._dragging.classList.remove('dragging');
        persistGraph();
        this._dragging = null;
        this.drawArrows();
      }
      if (this._isPanning) { this._isPanning = false; wrap.style.cursor = ''; }
    });

    wrap.addEventListener('mousedown', e => {
      if (e.button === 1 || (e.button === 0 && this._ctrlDown)) {
        e.preventDefault();
        this._isPanning = true;
        this._panStart  = { x: e.clientX - this.panX, y: e.clientY - this.panY };
        wrap.style.cursor = 'grabbing';
      }
    });

    wrap.addEventListener('wheel', e => {
      e.preventDefault();
      const d    = e.deltaY > 0 ? .92 : 1.08;
      const rect = wrap.getBoundingClientRect();
      const mx   = e.clientX - rect.left, my = e.clientY - rect.top;
      this.panX  = mx - (mx - this.panX) * d;
      this.panY  = my - (my - this.panY) * d;
      this.scale = clamp(this.scale * d, .15, 3);
      this.applyTransform();
    }, { passive: false });

    document.addEventListener('keydown', e => {
      if (e.code === 'ControlLeft' || e.code === 'ControlRight') {
        this._ctrlDown = true;
      }
      if (e.code === 'Escape' && this._connectMode) {
        this.toggleConnectMode();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();

        if (e.shiftKey) {
          History.redo();
        } else {
          History.undo();
        }
        return;
      }
    });

    document.addEventListener('keyup', e => {
      if (e.code === 'ControlLeft' || e.code === 'ControlRight') {
        this._ctrlDown = false;
      }
    });
  },

  startDrag(nodeEl, nodeData, clientX, clientY) {
    this._dragging = nodeEl;
    nodeEl.classList.add('dragging');
    this._dragOffset.x = (clientX - this.panX) / this.scale - nodeData.x;
    this._dragOffset.y = (clientY - this.panY) / this.scale - nodeData.y;
  },
};
