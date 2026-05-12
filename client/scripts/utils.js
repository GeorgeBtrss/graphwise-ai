// ═══════════════════════════════════════════════════
// UTILS — pure helpers, no dependencies
// ═══════════════════════════════════════════════════

function genId() {
  return '_' + Math.random().toString(36).slice(2, 9);
}

function escHtml(s) {
  return (s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// Derive card bg / border / text colours from a single hex accent
function deriveTheme(hex) {
  const r = parseInt(hex.slice(1,3), 16);
  const g = parseInt(hex.slice(3,5), 16);
  const b = parseInt(hex.slice(5,7), 16);
  const darken  = (v, f) => Math.round(v * f);
  const lighten  = (v, f) => Math.min(255, Math.round(v + (255 - v) * f));
  return {
    bg:     `rgb(${darken(r,.45)},${darken(g,.45)},${darken(b,.45)})`,
    border: `rgb(${darken(r,.80)},${darken(g,.80)},${darken(b,.80)})`,
    text:   `rgb(${lighten(r,.6)},${lighten(g,.6)},${lighten(b,.6)})`,
    hex,
  };
}

// Clamp a number between min and max
function clamp(v, min, max) { return Math.min(max, Math.max(min, v)); }
