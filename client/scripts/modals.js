// ═══════════════════════════════════════════════════
// MODALS — open / close / outside-click behaviour
// ═══════════════════════════════════════════════════

const Modals = {
  open(id)  { document.getElementById(id)?.classList.add('open'); },
  close(id) { document.getElementById(id)?.classList.remove('open'); },

  closeAll() {
    document.querySelectorAll('.modal-backdrop.open')
      .forEach(m => m.classList.remove('open'));
  },

  init() {
    // Click outside modal to close
    document.querySelectorAll('.modal-backdrop').forEach(bd => {
      bd.addEventListener('mousedown', e => {
        if (e.target === bd) bd.classList.remove('open');
      });
    });

    // Escape key closes topmost modal
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') this.closeAll();
    });
  },
};

// ── Toast ──
let _toastTimer;
function showToast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => el.classList.remove('show'), 2600);
}
