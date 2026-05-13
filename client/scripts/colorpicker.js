// ═══════════════════════════════════════════════════
// COLOR PICKER MODAL
// ═══════════════════════════════════════════════════

const ColorPicker = {
  _currentHex: '#7c6dff',
  _callback: null,

  open(startHex, title, callback) {
    this._currentHex = startHex || '#7c6dff';
    this._callback   = callback;
    document.getElementById('color-modal-title').textContent = title || 'Choose Color';
    this._buildPresets();
    this._updatePreview(this._currentHex);
    document.getElementById('color-wheel').value = this._currentHex;
    document.getElementById('color-hex').value   = this._currentHex;
    Modals.open('modal-color');
  },

  openForLabel(labelId) {
    const graph = getGraph();
    const label = graph?.labels.find(l => l.id === labelId);
    if (!label) return;
    this.open(label.hex, `Color for "${label.name}"`, hex => {
      label.hex = hex;
      persistGraph();
      Labels.render();
      Canvas.renderAll();
    });
  },

  _buildPresets() {
    document.getElementById('preset-grid').innerHTML = PRESETS.map(hex =>
      `<div class="preset-swatch ${hex === this._currentHex ? 'selected' : ''}"
        style="background:${hex};"
        onclick="ColorPicker.selectPreset('${hex}')"></div>`
    ).join('');
  },

  selectPreset(hex) {
    this._currentHex = hex;
    this._buildPresets();
    this._updatePreview(hex);
    document.getElementById('color-wheel').value = hex;
    document.getElementById('color-hex').value   = hex;
  },

  onWheel(hex) {
    this._currentHex = hex;
    this._updatePreview(hex);
    document.getElementById('color-hex').value = hex;
    this._buildPresets();
  },

  onHex(val) {
    const hex = val.startsWith('#') ? val : '#' + val;
    if (/^#[0-9a-fA-F]{6}$/.test(hex)) {
      this._currentHex = hex;
      this._updatePreview(hex);
      document.getElementById('color-wheel').value = hex;
      this._buildPresets();
    }
  },

  _updatePreview(hex) {
    const t = deriveTheme(hex);
    document.getElementById('color-preview-bar').style.background =
      `linear-gradient(90deg,${t.bg},${t.border},${t.text})`;
  },

  confirm() {
    if (this._callback) this._callback(this._currentHex);
    Modals.close('modal-color');
  },
};
