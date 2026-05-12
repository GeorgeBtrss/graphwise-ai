// ═══════════════════════════════════════════════════
// COLORS — preset palette + category theme helpers
// ═══════════════════════════════════════════════════

const PRESETS = [
  '#1e3a5f','#2a5298','#4080d0',
  '#1a3d2b','#266b40','#3daa68',
  '#3d2a10','#8a5a1a','#e08030',
  '#3a1230','#7a2060','#c040a0',
  '#1a1a40','#3a3a90','#6060d0',
  '#2a1040','#6030a0','#a060e0',
  '#102828','#1a6060','#30b0b0',
  '#401010','#902020','#d04040',
  '#2a2010','#806020','#c09030',
  '#101030','#302060','#5040b0',
  '#1e1e1e','#3c3c3c','#888888',
  '#0d2030','#155080','#2090d0',
];

const DEFAULT_CATEGORIES = [
  { name: 'Screen',    hex: '#2a5298' },
  { name: 'Component', hex: '#266b40' },
  { name: 'Hook',      hex: '#8a5a1a' },
  { name: 'Service',   hex: '#7a2060' },
  { name: 'Storage',   hex: '#3a3a90' },
];

function catTheme(cat) {
  return deriveTheme(cat.hex);
}

function catById(map, id) {
  return map.categories.find(c => c.id === id)
    || map.categories[0]
    || { id: 'fallback', name: '?', hex: '#3a3a90' };
}

function makeDefaultCategories() {
  return DEFAULT_CATEGORIES.map(c => ({ ...c, id: genId() }));
}
