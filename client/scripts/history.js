// ═══════════════════════════════════════════════════
// HISTORY — undo / redo
// ═══════════════════════════════════════════════════

const History = {
  undoStack: [],
  redoStack: [],
  maxSize: 80,

  capture(label = '') {
    const snapshot = {
      graphs: structuredClone(graphs),
      folders: structuredClone(folders),
      currentGraphId,
      label,
      time: Date.now(),
    };

    this.undoStack.push(snapshot);

    if (this.undoStack.length > this.maxSize) {
      this.undoStack.shift();
    }

    this.redoStack = [];
  },

  undo() {
    if (!this.undoStack.length) {
      showToast('Nothing to undo');
      return;
    }

    const current = {
      graphs: structuredClone(graphs),
      folders: structuredClone(folders),
      currentGraphId,
    };

    this.redoStack.push(current);

    const prev = this.undoStack.pop();

    graphs = structuredClone(prev.graphs);
    folders = structuredClone(prev.folders);
    currentGraphId = prev.currentGraphId;

    this._persistAll();

    this._rerender();

    showToast('Undo');
  },

  redo() {
    if (!this.redoStack.length) {
      showToast('Nothing to redo');
      return;
    }

    const current = {
      graphs: structuredClone(graphs),
      folders: structuredClone(folders),
      currentGraphId,
    };

    this.undoStack.push(current);

    const next = this.redoStack.pop();

    graphs = structuredClone(next.graphs);
    folders = structuredClone(next.folders);
    currentGraphId = next.currentGraphId;

    this._persistAll();

    this._rerender();

    showToast('Redo');
  },

  async _persistAll() {
    localStorage.setItem('graphwise_graphs', JSON.stringify(graphs));
    localStorage.setItem('graphwise_folders', JSON.stringify(folders));
  },

  _rerender() {
    if (currentGraphId) {
      Canvas.renderAll();
    }

    Home.render();
  },
};