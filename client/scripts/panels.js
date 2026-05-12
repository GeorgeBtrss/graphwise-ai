// ═══════════════════════════════════════════════════
// PANELS — right-side collapsible panels
// ═══════════════════════════════════════════════════

const Panels = {
  state: { desc: true, legend: true, controls: true },

  toggle(id) {
    this.state[id] = !this.state[id];
    document.getElementById(id + '-body')?.classList.toggle('collapsed', !this.state[id]);
    const chevron = document.getElementById(id + '-chevron');
    if (chevron) chevron.classList.toggle('open', this.state[id]);
  },

  // Reset all panels to open (called when a new map is opened)
  resetAll() {
    Object.keys(this.state).forEach(id => {
      this.state[id] = true;
      document.getElementById(id + '-body')?.classList.remove('collapsed');
      document.getElementById(id + '-chevron')?.classList.add('open');
    });
  },
};
