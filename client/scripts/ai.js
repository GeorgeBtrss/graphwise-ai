// ═══════════════════════════════════════════════════
// AI — chat panel, Claude API, apply map response
// ═══════════════════════════════════════════════════

const AI = {
  _open:        false,
  _apiMessages: [],    // {role, content} sent to the API (includes map context)
  _uiHistory:   [],    // {role, content, applyData?} shown in the panel
  _typing:      false,

  SYSTEM: `You are an expert software architecture assistant embedded in Graphwise, a visual architecture graphing tool.

The user is working on a software architecture map. Their current map is provided as JSON in each message.

You can:
1. ANSWER questions about the map — explain components, suggest improvements, identify issues
2. GENERATE a new map from a description — output a full JSON map structure
3. MODIFY the existing map — add/remove/edit nodes or arrows and output updated JSON

When generating or modifying a map, you MUST output a JSON block wrapped in \`\`\`graphwisejson ... \`\`\` tags containing this exact structure:
{
  "nodes": [
    {
      "id": "unique_id",
      "icon": "emoji",
      "title": "Card Title",
      "tag": "TYPE",
      "file": "optional/path.ts",
      "catId": "category_id_from_categories_array",
      "x": 200,
      "y": 200,
      "items": ["bullet point one", "bullet point two"],
      "isRoot": false
    }
  ],
  "arrows": [
    { "id": "unique_id", "from": "node_id", "to": "node_id", "label": "optional label", "style": "solid" }
  ],
  "categories": [
    { "id": "cat_id", "name": "Category Name", "hex": "#2a5298" }
  ]
}

Rules:
- Always include ALL categories in the output, even ones you didn't change
- Always include ALL nodes in the output when modifying (not just changed ones)
- The first node with isRoot:true is the root/entry point
- Position nodes thoughtfully: root at top-center (~500,80), then spread downward/sideways with ~220px horizontal and ~180px vertical spacing
- Use different hex colors per category to make the map visually clear
- Arrow style is "solid" or "dashed"
- IDs must be unique strings (use short descriptive names like "n_chat", "n_storage")
- When only answering questions (no map changes), do NOT output a JSON block

Be concise but helpful. When generating maps, think about real software architecture patterns.`,

  // ── Panel toggle ──
  togglePanel() {
    this._open = !this._open;
    const panel = document.getElementById('ai-panel');
    const btn   = document.getElementById('btn-ai-chat');
    panel.classList.toggle('open', this._open);
    btn.classList.toggle('open', this._open);
    document.body.classList.toggle('chat-open', this._open);

    if (this._open && !this._uiHistory.length) this._showWelcome();
    if (this._open) setTimeout(() => document.getElementById('ai-input').focus(), 300);
  },

  close() {
    this._open = false;
    document.getElementById('ai-panel').classList.remove('open');
    document.getElementById('btn-ai-chat').classList.remove('open');
    document.body.classList.remove('chat-open');
  },

  reset() {
    this._apiMessages = [];
    this._uiHistory   = [];
    this._typing      = false;
    const msgs = document.getElementById('ai-messages');
    const sugg = document.getElementById('ai-suggestions');
    if (msgs) msgs.innerHTML = '';
    if (sugg) sugg.innerHTML = '';
  },

  // ── Welcome state ──
  _showWelcome() {
    const map = getMap();
    const nc  = map?.nodes.length ?? 0;
    this._addMsg('system',
      `Map loaded: "${map?.name || 'Untitled'}" · ${nc} card${nc !== 1 ? 's' : ''} · Ask me anything or try a suggestion below.`);
    this._renderSuggestions([
      'Generate a map for a React app',
      'What is this map missing?',
      'Explain this architecture',
      'Add error handling cards',
      'Suggest better names for my cards',
    ]);
  },

  _renderSuggestions(list) {
    document.getElementById('ai-suggestions').innerHTML = list.map(s =>
      `<div class="ai-suggestion" onclick="AI.useSuggestion(${JSON.stringify(s)})">${escHtml(s)}</div>`
    ).join('');
  },

  useSuggestion(text) {
    document.getElementById('ai-suggestions').innerHTML = '';
    document.getElementById('ai-input').value = text;
    this.autoResize(document.getElementById('ai-input'));
    this.send();
  },

  // ── Send message ──
  async send() {
    const input = document.getElementById('ai-input');
    const text  = input.value.trim();
    if (!text || this._typing) return;

    input.value = '';
    this.autoResize(input);
    document.getElementById('ai-suggestions').innerHTML = '';

    // Add to UI and API history
    this._addMsg('user', text);
    this._apiMessages.push({ role: 'user', content: this._buildContextMessage(text) });

    this._typing = true;
    this._render();
    document.getElementById('ai-send-btn').disabled = true;

    try {
      const res  = await fetch('https://api.anthropic.com/v1/messages', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model:      'claude-sonnet-4-20250514',
          max_tokens: 4000,
          system:     this.SYSTEM,
          messages:   this._apiMessages,
        }),
      });
      const data  = await res.json();
      if (data.error) throw new Error(data.error.message || 'API error');

      const reply   = data.content?.map(b => b.text || '').join('') || '';
      const mapData = this._extractMapJson(reply);

      this._apiMessages.push({ role: 'assistant', content: reply });
      this._addMsg('assistant', reply, mapData || null);

      if (!mapData) {
        this._renderSuggestions(['Tell me more', 'Apply this as changes', 'What else should I add?']);
      }
    } catch (err) {
      this._addMsg('error', `Error: ${err.message}. Check your API key is configured correctly.`);
    } finally {
      this._typing = false;
      this._render();
      document.getElementById('ai-send-btn').disabled = false;
    }
  },

  // ── Build message with map JSON context ──
  _buildContextMessage(text) {
    const map = getMap(); if (!map) return text;
    const ctx = {
      name:        map.name,
      description: map.desc,
      categories:  map.categories.map(c => ({ id: c.id, name: c.name, hex: c.hex })),
      nodes:       map.nodes.map(n => ({
        id: n.id, title: n.title, tag: n.tag, icon: n.icon,
        catId: n.catId, file: n.file, items: n.items, isRoot: n.isRoot,
        x: Math.round(n.x), y: Math.round(n.y),
      })),
      arrows: map.arrows.map(a => ({ id: a.id, from: a.from, to: a.to, label: a.label, style: a.style })),
    };
    return `Current map:\n\`\`\`json\n${JSON.stringify(ctx, null, 2)}\n\`\`\`\n\nUser request: ${text}`;
  },

  // ── Apply AI-generated map to canvas ──
  applyMap(msgIndex) {
    const msg  = this._uiHistory[msgIndex];
    const data = msg?.applyData; if (!data) return;
    const map  = getMap();      if (!map)  return;

    if (!Array.isArray(data.nodes) || !data.nodes.length) {
      showToast('No valid map data in response'); return;
    }

    // Categories
    if (Array.isArray(data.categories) && data.categories.length) {
      map.categories = data.categories.map(c => ({
        id:   c.id   || genId(),
        name: c.name || 'Category',
        hex:  c.hex  || '#2a5298',
      }));
    }

    // Nodes
    map.nodes = data.nodes.map((n, i) => ({
      id:     n.id    || genId(),
      icon:   n.icon  || '🔷',
      title:  n.title || 'Card',
      tag:    n.tag   || 'COMP',
      file:   n.file  || '',
      catId:  n.catId || map.categories[0]?.id || null,
      x:      typeof n.x === 'number' ? n.x : 100 + (i % 4) * 230,
      y:      typeof n.y === 'number' ? n.y : 100 + Math.floor(i / 4) * 200,
      items:  Array.isArray(n.items) ? n.items : [],
      isRoot: !!n.isRoot,
    }));

    // Ensure exactly one root
    const roots = map.nodes.filter(n => n.isRoot);
    if (!roots.length && map.nodes.length)     map.nodes[0].isRoot = true;
    if (roots.length > 1) roots.slice(1).forEach(n => n.isRoot = false);

    // Arrows — only keep ones whose node IDs still exist
    map.arrows = (data.arrows || []).map(a => ({
      id:    a.id    || genId(),
      from:  a.from,
      to:    a.to,
      label: a.label || '',
      style: a.style || 'solid',
    })).filter(a => map.nodes.find(n => n.id === a.from) && map.nodes.find(n => n.id === a.to));

    persistMap();
    Canvas.renderAll();
    setTimeout(() => Canvas.fitToScreen(), 100);

    // Mark button as applied
    const btn = document.getElementById(`apply-btn-${msgIndex}`);
    if (btn) { btn.disabled = true; btn.textContent = '✓ Applied'; }

    showToast('Map updated from AI response');
    this._addMsg('system', `Map updated — ${map.nodes.length} cards, ${map.arrows.length} arrows applied.`);
  },

  // ── Internal helpers ──
  _addMsg(role, content, applyData = null) {
    this._uiHistory.push({ role, content, applyData });
    this._render();
  },

  _render() {
    const el = document.getElementById('ai-messages');
    el.innerHTML = this._uiHistory.map((msg, i) => {
      const roleLabel    = msg.role === 'user' ? 'You' : msg.role === 'assistant' ? 'AI' : '';
      const bubbleContent = msg.role === 'assistant' ? this._formatText(msg.content) : escHtml(msg.content);
      const applyBtn     = msg.applyData
        ? `<button class="ai-apply-btn" onclick="AI.applyMap(${i})" id="apply-btn-${i}">✦ Apply to map</button>`
        : '';
      return `<div class="ai-msg ${msg.role}">
        ${roleLabel ? `<div class="ai-msg-role">${roleLabel}</div>` : ''}
        <div class="ai-msg-bubble">${bubbleContent}</div>
        ${applyBtn}
      </div>`;
    }).join('');

    if (this._typing) {
      el.innerHTML += `<div class="ai-msg assistant">
        <div class="ai-msg-role">AI</div>
        <div class="ai-typing"><span></span><span></span><span></span></div>
      </div>`;
    }
    el.scrollTop = el.scrollHeight;
  },

  _formatText(text) {
    return text
      .replace(/```graphwisejson[\s\S]*?```/g,
        '<em style="color:var(--success);font-size:10px;">✦ Graph data ready — click Apply to graph below</em>')
      .replace(/```[\w]*\n?([\s\S]*?)```/g, '<pre>$1</pre>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br>');
  },

  _extractMapJson(text) {
    const match = text.match(/```graphwisejson\s*([\s\S]*?)```/);
    if (!match) return null;
    try { return JSON.parse(match[1].trim()); } catch { return null; }
  },

  // ── Input helpers ──
  inputKeydown(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.send(); }
  },

  autoResize(el) {
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  },
};
