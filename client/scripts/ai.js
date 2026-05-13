// ═══════════════════════════════════════════════════
// AI — chat panel, Claude API, apply graph response
// ═══════════════════════════════════════════════════

const AI = {
  _open:        false,
  _apiMessages: [],
  _uiHistory:   [],
  _typing:      false,

  SYSTEM: `You are an expert software architecture assistant embedded in Graphwise, an AI-powered visual architecture graphing tool.

The user is working on a software architecture graph. Their current graph is provided as JSON in each message.

You can:
1. ANSWER questions about the graph — explain components, suggest improvements, identify issues
2. GENERATE a new graph from a description — output a full JSON graph structure
3. MODIFY the existing graph — add/remove/edit nodes or arrows and output updated JSON

When generating or modifying a graph, you MUST output a JSON block wrapped in \`\`\`archmapjson ... \`\`\` tags containing this exact structure:
{
  "nodes": [
    {
      "id": "unique_id",
      "icon": "emoji",
      "title": "Card Title",
      "tag": "TYPE",
      "file": "optional/path.ts",
      "labelId": "label_id_from_labels_array",
      "x": 200,
      "y": 200,
      "items": ["bullet point one", "bullet point two"],
      "isRoot": false
    }
  ],
  "arrows": [
    { "id": "unique_id", "from": "node_id", "to": "node_id", "label": "optional label", "style": "solid" }
  ],
  "labels": [
    { "id": "label_id", "name": "Label Name", "hex": "#2a5298" }
  ],
}

Rules:
- Always include ALL labels in the output, even ones you didn't change
- Always include ALL nodes in the output when modifying (not just changed ones)
- The first node with isRoot:true is the root/entry point
- Position nodes thoughtfully: root at top-center (~500,80), then spread downward/sideways with ~220px horizontal and ~180px vertical spacing
- Use different hex colors per label to make the graph visually clear
- Arrow style is "solid" or "dashed"
- IDs must be unique strings (use short descriptive names like "n_chat", "n_storage")
- When only answering questions (no graph changes), do NOT output a JSON block

Be concise but helpful. When generating graphs, think about real software architecture patterns.`,

  togglePanel() {
    this._open = !this._open;
    const panel = document.getElementById('ai-panel');
    const btn   = document.getElementById('btn-ai-chat');
    panel.classList.toggle('open', this._open);
    btn.classList.toggle('open', this._open);
    // No body.chat-open class needed — panel overlaps, doesn't push

    if (this._open && !this._uiHistory.length) this._showWelcome();
    if (this._open) setTimeout(() => document.getElementById('ai-input').focus(), 300);
  },

  close() {
    this._open = false;
    document.getElementById('ai-panel').classList.remove('open');
    document.getElementById('btn-ai-chat').classList.remove('open');
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

  _showWelcome() {
    const graph = getGraph();
    const nc    = graph?.nodes.length ?? 0;
    this._addMsg('system',
      `Graph loaded: "${graph?.name || 'Untitled'}" · ${nc} card${nc !== 1 ? 's' : ''} · Ask me anything or try a suggestion below.`);
    this._renderSuggestions([
      'Generate a graph for a React Native app',
      'What is this graph missing?',
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

  async send() {
    const input = document.getElementById('ai-input');
    const text  = input.value.trim();
    if (!text || this._typing) return;

    input.value = '';
    this.autoResize(input);
    document.getElementById('ai-suggestions').innerHTML = '';

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
      const graphData = this._extractGraphJson(reply);

      this._apiMessages.push({ role: 'assistant', content: reply });
      this._addMsg('assistant', reply, graphData || null);

      if (!graphData) {
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

  _buildContextMessage(text) {
    const graph = getGraph(); if (!graph) return text;
    const ctx = {
      name:        graph.name,
      description: graph.desc,
      labels:      graph.labels.map(l => ({ id: l.id, name: l.name, hex: l.hex })),
      nodes:       graph.nodes.map(n => ({
        id: n.id, title: n.title, tag: n.tag, icon: n.icon,
        labelId: n.labelId, file: n.file, items: n.items, isRoot: n.isRoot,
        x: Math.round(n.x), y: Math.round(n.y),
      })),
      arrows: graph.arrows.map(a => ({ id: a.id, from: a.from, to: a.to, label: a.label, style: a.style })),
    };
    return `Current graph:\n\`\`\`json\n${JSON.stringify(ctx, null, 2)}\n\`\`\`\n\nUser request: ${text}`;
  },

  applyGraph(msgIndex) {
    const msg  = this._uiHistory[msgIndex];
    const data = msg?.applyData; if (!data) return;
    const graph = getGraph();   if (!graph)  return;

    if (!Array.isArray(data.nodes) || !data.nodes.length) {
      showToast('No valid graph data in response'); return;
    }

    if (Array.isArray(data.labels) && data.labels.length) {
      graph.labels = data.labels.map(l => ({
        id:   l.id   || genId(),
        name: l.name || 'Label',
        hex:  l.hex  || '#2a5298',
      }));
    }

    graph.nodes = data.nodes.map((n, i) => ({
      id:     n.id    || genId(),
      icon:   n.icon  || '🔷',
      title:  n.title || 'Card',
      tag:    n.tag   || 'COMP',
      file:   n.file  || '',
      labelId:  n.labelId || graph.labels[0]?.id || null,
      x:      typeof n.x === 'number' ? n.x : 100 + (i % 4) * 230,
      y:      typeof n.y === 'number' ? n.y : 100 + Math.floor(i / 4) * 200,
      items:  Array.isArray(n.items) ? n.items : [],
      isRoot: !!n.isRoot,
    }));

    const roots = graph.nodes.filter(n => n.isRoot);
    if (!roots.length && graph.nodes.length)    graph.nodes[0].isRoot = true;
    if (roots.length > 1) roots.slice(1).forEach(n => n.isRoot = false);

    graph.arrows = (data.arrows || []).map(a => ({
      id:    a.id    || genId(),
      from:  a.from, to: a.to,
      label: a.label || '',
      style: a.style || 'solid',
    })).filter(a => graph.nodes.find(n => n.id === a.from) && graph.nodes.find(n => n.id === a.to));

    persistGraph();
    Canvas.renderAll();
    setTimeout(() => Canvas.fitToScreen(), 100);

    const btn = document.getElementById(`apply-btn-${msgIndex}`);
    if (btn) { btn.disabled = true; btn.textContent = '✓ Applied'; }

    showToast('Graph updated from AI response');
    this._addMsg('system', `Graph updated — ${graph.nodes.length} cards, ${graph.arrows.length} arrows applied.`);
  },

  _addMsg(role, content, applyData = null) {
    this._uiHistory.push({ role, content, applyData });
    this._render();
  },

  _render() {
    const el = document.getElementById('ai-messages');
    el.innerHTML = this._uiHistory.map((msg, i) => {
      const roleLabel     = msg.role === 'user' ? 'You' : msg.role === 'assistant' ? 'AI' : '';
      const bubbleContent = msg.role === 'assistant' ? this._formatText(msg.content) : escHtml(msg.content);
      const applyBtn      = msg.applyData
        ? `<button class="ai-apply-btn" onclick="AI.applyGraph(${i})" id="apply-btn-${i}">✦ Apply to graph</button>`
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
      .replace(/```archmapjson[\s\S]*?```/g,
        '<em style="color:var(--success);font-size:10px;">✦ Graph data ready — click Apply to graph below</em>')
      .replace(/```[\w]*\n?([\s\S]*?)```/g, '<pre>$1</pre>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br>');
  },

  _extractGraphJson(text) {
    const match = text.match(/```archmapjson\s*([\s\S]*?)```/);
    if (!match) return null;
    try { return JSON.parse(match[1].trim()); } catch { return null; }
  },

  inputKeydown(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.send(); }
  },

  autoResize(el) {
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  },
};
