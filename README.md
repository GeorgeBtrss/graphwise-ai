**This project was built using Claude**

# Graphwise

Visual architecture maps for developers. Build and explore software architecture as an interactive node graph, with AI assistance powered by Claude.

---

## Running locally

ES modules require a local server — you can't open `index.html` directly from the filesystem.

```bash
# Option 1 — Python (no install needed)
python3 -m http.server 3000

# Option 2 — Node.js serve
npx serve .

# Option 3 — VS Code
# Install the "Live Server" extension, right-click index.html → "Open with Live Server"
```

Then open `http://localhost:3000`.

---

## File structure

```
graphwise/
│
├── index.html              # Shell: all HTML, loads CSS + JS
│
├── styles/
│   ├── base.css            # CSS variables, reset, shared buttons, toast, animations
│   ├── home.css            # Home view (map grid, cards, empty state)
│   ├── editor.css          # Editor header, view mode
│   ├── canvas.css          # Canvas stage, node cards, arrow menu
│   ├── panels.css          # Right panel, category rows
│   ├── modals.css          # All modals, color picker, confirm dialogs
│   └── ai.css              # AI chat panel
│
└── scripts/                     # Load order matters — see index.html <script> tags
    ├── utils.js            # Pure helpers: genId, escHtml, deriveTheme, clamp
    ├── storage.js          # Persistence layer — swap internals here for a backend
    ├── colors.js           # PRESETS palette, DEFAULT_CATEGORIES, catTheme, catById
    ├── modals.js           # Modals.open/close, showToast
    ├── panels.js           # Panels.toggle, Panels.resetAll
    ├── categories.js       # Categories.render/add/rename/delete
    ├── colorpicker.js      # ColorPicker modal logic
    ├── canvas.js           # Canvas: viewport, pan, zoom, drag, drawArrows, renderAll
    ├── arrows.js           # Arrows: add/edit/delete modal, context menu
    ├── nodes.js            # Nodes.renderOne, NodeModal (add/edit/delete)
    ├── editor.js           # Editor.open/goHome, view mode, title/desc sync
    ├── home.js             # Home.render, createNew, delete, miniPreview
    ├── ai.js               # AI chat panel, Claude API, applyMap
    └── main.js             # Boot: load storage, init listeners, render home
```

---

## Adding a backend (Supabase)

All persistence goes through `js/storage.js`. The public interface (`Storage.getAll`, `Storage.save`, `Storage.delete`, `Storage.getById`) is already async. To add Supabase:

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Add the Supabase client to `index.html`:
   ```html
   <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js"></script>
   ```
3. Replace the `localStorage` internals in `Storage.getAll`, `Storage.save`, `Storage.delete` with Supabase calls
4. Nothing else changes — every other file calls `Storage.*` and stays untouched

The data model already has `ownerId`, `folderId`, `isPublic`, `shareSlug`, and `version` fields with `null` defaults, ready for when you need them.

---

## Data model

```js
// Map
{
  id, name, desc,
  ownerId: null,        // → user ID when accounts added
  folderId: null,       // → folder UUID for organisation
  isPublic: false,      // → public sharing flag
  shareSlug: null,      // → URL slug e.g. "my-cool-app"
  collaborators: [],    // → [{userId, role}]
  version: 1,           // → bump on schema changes, drives migrateMap()
  categories: [{ id, name, hex }],
  nodes: [{
    id, icon, title, tag, file,
    catId,              // → references a category
    x, y,              // → canvas position
    items: [],         // → bullet points
    isRoot: false,
  }],
  arrows: [{ id, from, to, label, style }],
  created, updated,
}
```

---

## Tech

- Vanilla HTML, CSS, and JavaScript — no build step, no dependencies
- ES modules for clean file separation
- Claude API (`claude-sonnet-4-20250514`) for AI features
- `localStorage` for persistence (swap to Supabase when ready)
