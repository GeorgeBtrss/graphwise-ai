// ═══════════════════════════════════════════════════
// LABELS — CRUD + legend panel rendering
// ═══════════════════════════════════════════════════

const Labels = {
  render() {
    const graph = getGraph();
    if (!graph) return;
    if (!Array.isArray(graph.labels)) {
      graph.labels = [];
    }

    const el = document.getElementById('legend-items');

    if (graph.labels.length === 0) {
      el.innerHTML = `
        <div style="font-size:10px;color:var(--text-muted);padding:2px 0 6px;">
          No labels yet
        </div>
      `;
      return;
    }
    el.innerHTML = graph.labels.map(label => {
      const t = labelTheme(label);
      return `<div class="label-row" id="labelrow-${label.id}">
        <div class="label-swatch" style="background:${t.bg};border-color:${t.border};"
          onclick="ColorPicker.openForLabel('${label.id}')"></div>
        <input class="label-name-input" value="${escHtml(label.name)}" placeholder="Label name"
          onblur="Labels.rename('${label.id}', this.value)"
          onkeydown="if(event.key==='Enter') this.blur()">
        <button class="label-del-btn" onclick="Labels.delete('${label.id}')" title="Delete">✕</button>
      </div>`;
    }).join('');
  },

  add() {
    History.capture('Label change');
    const graph = getGraph();
    if (!graph) return;

    if (!Array.isArray(graph.labels)) {
      graph.labels = [];
    }

    const presets = Array.isArray(PRESETS) && PRESETS.length
      ? PRESETS
      : ['#7c6dff'];

    const label = {
      id: genId(),
      name: 'New Label',
      hex: presets[graph.labels.length % presets.length],

      // NEW ATTRIBUTES
      textColor: '#ffffff',
      borderStyle: 'solid',
      description: '',
    };

    graph.labels.push(label);

    persistGraph();

    this.render();
    Canvas.renderAll();

    setTimeout(() => {
      const inp = document.querySelector(
        `#labelrow-${label.id} .label-name-input`
      );

      if (inp) {
        inp.focus();
        inp.select();
      }
    }, 60);

    // OPEN EDIT MENU AUTOMATICALLY
    ColorPicker.openForLabel(label.id);
  },

  rename(id, name) {
    History.capture('Label change');
    const graph = getGraph();
    const label   = graph?.labels.find(l => l.id === id);
    if (!label) return;
    label.name = name.trim() || label.name;
    persistGraph();
    this.render();
    Canvas.renderAll();
  },

  delete(id) {
    History.capture('Label change');
    const graph = getGraph();

    if (!graph) return;

    // Prevent deleting the root node's label
    const rootUsesLabel = graph.nodes.some(
      n => n.isRoot && n.labelId === id
    );

    if (rootUsesLabel) {
      showToast(
        'This label is assigned to the root card. Assign the root card to another label before deleting it.'
      );
      return;
    }

    const used = graph.nodes.some(
      n => n.labelId === id
    );

    if (
      used &&
      !confirm(
        'This label is used by some cards. Delete anyway?'
      )
    ) {
      return;
    }

    History.capture('Delete label');

    // Remove label
    graph.labels = graph.labels.filter(
      l => l.id !== id
    );

    // Reassign affected nodes
    const fallbackLabelId =
      graph.labels[0]?.id || null;

    graph.nodes.forEach(n => {
      if (n.labelId === id) {
        n.labelId = fallbackLabelId;
      }
    });

    persistGraph();

    this.render();

    Canvas.renderAll();
  },
};
