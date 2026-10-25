// Shared pieces for every lesson under /learn: code highlighting, the click-through
// code explorer and the quiz. Each lesson page supplies its own content.
const Lesson = (() => {
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const span = (cls, s) => '<span class="' + cls + '">' + s + '</span>';

  // ---------- Agent Script ----------
  const AGENT_RE = /("[^"]*")|(@[\w.]+)|(-&gt;|\.\.\.|\|)|\b(True|False)\b|\b(config|variables|system|messages|start_agent|subagent|reasoning|instructions|actions|inputs|outputs|target|description|if|else|set|with|to|available|when|mutable|string|number|boolean|welcome|error|developer_name|agent_label|agent_type|is_required|is_displayable|is_used_by_planner)\b/g;
  function agentLine(line, isPrompt) {
    if (line.trim().startsWith('#')) return span('t-com', esc(line));
    if (isPrompt) return span('t-prompt', esc(line).replace(/\{!([^}]*)\}/g, '<span class="t-tpl">{!$1}</span>'));
    return esc(line).replace(AGENT_RE, (m, str, ref, sym, lit) =>
      span(str ? 't-str' : ref ? 't-ref' : sym ? 't-sym' : lit ? 't-lit' : 't-key', m));
  }
  // A prompt starts at a line beginning with "|" (or a key ending in ":|") and continues
  // on following lines indented deeper than where it started.
  function agentLines(lines) {
    let promptIndent = -1;
    return lines.map((text) => {
      const indent = text.length - text.trimStart().length, t = text.trim();
      let isPrompt = false;
      if (t.startsWith('|')) { isPrompt = true; promptIndent = indent; }
      else if (promptIndent >= 0 && t && indent > promptIndent) isPrompt = true;
      else promptIndent = -1;
      if (t.endsWith(':|')) promptIndent = indent;
      return agentLine(text, isPrompt);
    });
  }

  // ---------- Apex ----------
  const APEX_RE = /('(?:[^'\\]|\\.)*')|(@\w+)|\b(true|false|null)\b|\b(public|private|global|static|class|with|without|sharing|new|return|for|if|else|void|List|Map|Set|String|Integer|Boolean|Id|SELECT|FROM|WHERE|IN|WITH|USER_MODE|LIMIT)\b/g;
  function apexLines(lines) {
    let inDoc = false;
    return lines.map((text) => {
      const t = text.trim();
      if (t.startsWith('/*')) inDoc = !t.endsWith('*/');
      else if (inDoc) { if (t.endsWith('*/')) inDoc = false; return span('t-com', esc(text)); }
      if (t.startsWith('//') || t.startsWith('/*')) return span('t-com', esc(text));
      return esc(text).replace(APEX_RE, (m, str, ann, lit) =>
        span(str ? 't-str' : ann ? 't-ann' : lit ? 't-lit' : 't-key', m));
    });
  }

  // ---------- prompt templates (plain text with merge fields and mask tokens) ----------
  function promptLines(lines) {
    return lines.map((text) => span('t-prompt', esc(text)
      .replace(/\{!([^}]*)\}/g, '<span class="t-tpl">{!$1}</span>')
      .replace(/&lt;([A-Z_]+_\d+)&gt;/g, '<span class="t-mask">&lt;$1&gt;</span>')));
  }

  const LANGS = { agent: agentLines, apex: apexLines, prompt: promptLines };

  // lines: array of [part, text] pairs (part can be '')
  function render(el, lines, lang = 'agent') {
    const html = LANGS[lang](lines.map((l) => l[1]));
    el.innerHTML = '<ol>' + lines.map(([part], i) =>
      '<li data-part="' + part + '"><span>' + (html[i] || ' ') + '</span></li>').join('') + '</ol>';
  }

  // Click-through explorer: buttons for each part, lines light up, explanation beside the code.
  // buttons: element that holds one button per part; parts: { key: { name, title, body } }
  function explorer({ code, buttons: partsEl, explain, lines, parts, lang = 'agent' }) {
    const order = Object.keys(parts);
    render(code, lines, lang);
    partsEl.innerHTML = order.map((k) => '<button type="button" data-part="' + k + '" aria-pressed="false">' + parts[k].name + '</button>').join('');
    function show(k) {
      const i = order.indexOf(k), p = parts[k];
      partsEl.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', b.dataset.part === k));
      code.querySelectorAll('li').forEach((li) => li.classList.toggle('on', li.dataset.part === k));
      explain.innerHTML =
        '<span class="label">' + (i + 1) + ' of ' + order.length + ' · ' + p.name + '</span>' +
        '<h3>' + p.title + '</h3>' + p.body +
        '<div class="step"><button class="btn" type="button" data-go="-1"' + (i === 0 ? ' disabled' : '') + '>← Previous</button>' +
        '<button class="btn" type="button" data-go="1"' + (i === order.length - 1 ? ' disabled' : '') + '>Next →</button></div>';
    }
    partsEl.addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) show(b.dataset.part); });
    code.addEventListener('click', (e) => { const li = e.target.closest('li'); if (li && li.dataset.part) show(li.dataset.part); });
    explain.addEventListener('click', (e) => {
      const b = e.target.closest('[data-go]'); if (!b) return;
      const cur = partsEl.querySelector('[aria-pressed="true"]').dataset.part;
      show(order[order.indexOf(cur) + +b.dataset.go]);
    });
    show(order[0]);
  }

  // Quiz: items are { q, code?, lang?, opts, right, why }.
  function quiz(listEl, scoreEl, items, passText) {
    let answered = 0, correct = 0;
    items.forEach((item, qi) => {
      const box = document.createElement('div');
      box.className = 'q';
      box.innerHTML = '<span class="label">Question ' + (qi + 1) + ' of ' + items.length + '</span><h3>' + item.q + '</h3>' +
        (item.code ? '<div class="code"></div>' : '') +
        '<div class="opts">' + item.opts.map((o, oi) => '<button type="button" data-o="' + oi + '"><b>' + 'ABCD'[oi] + '</b><span>' + o + '</span></button>').join('') + '</div>' +
        '<p class="feedback" hidden></p>';
      if (item.code) render(box.querySelector('.code'), item.code, item.lang);
      box.querySelector('.opts').addEventListener('click', (e) => {
        const b = e.target.closest('button'); if (!b) return;
        const pick = +b.dataset.o, ok = pick === item.right;
        box.querySelectorAll('.opts button').forEach((x, i) => {
          x.disabled = true;
          if (i === item.right) x.classList.add('right');
          else if (i === pick) x.classList.add('wrong');
        });
        const fb = box.querySelector('.feedback');
        fb.hidden = false; fb.className = 'feedback ' + (ok ? 'right' : 'wrong');
        fb.innerHTML = '<strong>' + (ok ? 'Correct.' : 'Not quite.') + '</strong> ' + item.why;
        answered++; if (ok) correct++;
        if (answered === items.length) {
          scoreEl.hidden = false;
          scoreEl.textContent = 'You got ' + correct + ' of ' + items.length + '. ' + (correct === items.length ? passText : 'Scroll up, review, and try again.');
        }
      });
      listEl.appendChild(box);
    });
  }

  return { esc, render, explorer, quiz };
})();
