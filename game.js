// Deploy Dash: a tiny endless runner. Canvas is sized in CSS pixels and scaled for retina.
(() => {
  const cv = document.getElementById('game');
  const ctx = cv.getContext('2d');
  const scoreEl = document.getElementById('g-score');
  const bestEl = document.getElementById('g-best');
  const tok = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  const C = { ink: tok('--ink'), panel: tok('--panel'), line: tok('--line'), fg: tok('--fg'), muted: tok('--muted'), signal: tok('--signal'), cloud: tok('--cloud'), bug: tok('--bug') };
  const MONO = '500 12px "JetBrains Mono", ui-monospace, Menlo, monospace';
  const GRAVITY = 2300, JUMP = 760;
  const FAILS = [
    'System.LimitException: Too many bugs: 101',
    'Deployment failed: 1 test method failed',
    'UNABLE_TO_LOCK_ROW: unable to obtain exclusive access',
    'Code coverage 74%. At least 75% is required',
  ];

  let W = 0, H = 0, ground = 0;
  let state = 'idle', last = 0, fail = '';
  let hog, things, speed, dist, bonus, spawnIn, cloudIn, step, best = 0;

  try { best = +localStorage.getItem('deployDashBest') || 0; } catch (e) {}
  bestEl.textContent = best;

  function reset() {
    hog = { x: 56, y: 0, vy: 0, w: 42, h: 30 };
    things = []; speed = 320; dist = 0; bonus = 0; spawnIn = 0.8; cloudIn = 2.5; step = 0;
  }
  const score = () => Math.floor(dist / 12) + bonus;

  function resize() {
    const r = cv.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2);
    W = r.width; H = r.height; ground = H - 40;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (state !== 'run') draw();
  }

  function action() {
    if (state === 'run') {
      if (hog.y === 0) hog.vy = JUMP;
      return;
    }
    reset(); state = 'run'; last = performance.now();
    requestAnimationFrame(loop);
  }

  function spawn() {
    const r = Math.random();
    if (r < 0.55) things.push({ kind: 'bug', x: W + 20, y: 0, w: 26, h: 18 });
    else if (r < 0.8) things.push({ kind: 'bug', x: W + 20, y: 0, w: 26, h: 18 }, { kind: 'bug', x: W + 50, y: 0, w: 26, h: 18 });
    else things.push({ kind: 'limit', x: W + 20, y: 0, w: 24, h: 46 });
    spawnIn = (0.75 + Math.random() * 0.9) * (380 / speed) + 0.35;
  }

  function hit(a, b, pad) {
    return a.x + pad < b.x + b.w && a.x + a.w - pad > b.x && a.y + pad < b.y + b.h && a.y + a.h - pad > b.y;
  }

  function update(dt) {
    speed = Math.min(680, speed + 9 * dt);
    dist += speed * dt; step += dt;

    hog.vy -= GRAVITY * dt; hog.y = Math.max(0, hog.y + hog.vy * dt);
    if (hog.y === 0) hog.vy = 0;

    if ((spawnIn -= dt) <= 0) spawn();
    if ((cloudIn -= dt) <= 0) {
      things.push({ kind: 'cloud', x: W + 20, y: 60 + Math.random() * 40, w: 34, h: 20 });
      cloudIn = 2.5 + Math.random() * 3;
    }
    for (const t of things) t.x -= speed * dt;
    things = things.filter((t) => t.x + t.w > -40 && !t.taken);

    for (const t of things) {
      if (!hit(hog, t, t.kind === 'cloud' ? 0 : 6)) continue;
      if (t.kind === 'cloud') { t.taken = true; bonus += 25; }
      else return over();
    }
    scoreEl.textContent = score();
  }

  function over() {
    state = 'over';
    fail = FAILS[Math.floor(Math.random() * FAILS.length)];
    const s = score();
    scoreEl.textContent = s;
    if (s > best) {
      best = s; bestEl.textContent = best;
      try { localStorage.setItem('deployDashBest', best); } catch (e) {}
    }
    draw();
  }

  function loop(now) {
    if (state !== 'run') return;
    const dt = Math.min(0.033, (now - last) / 1000); last = now;
    update(dt);
    if (state === 'run') { draw(); requestAnimationFrame(loop); }
  }

  // ---- drawing ----
  const Y = (y, h) => ground - y - h; // world (y up from ground) to canvas

  function drawHog() {
    const x = hog.x, top = Y(hog.y, hog.h), b = ground - hog.y;
    const run = state === 'run' && hog.y === 0;
    const leg = run ? (Math.floor(step * 14) % 2) * 4 : 0;
    ctx.fillStyle = C.fg;
    ctx.fillRect(x + 10, b - 4, 5, 4 + (run ? leg : 0) - (run ? 2 : 0));
    ctx.fillRect(x + 26, b - 4, 5, 4 + (run ? 4 - leg : 0) - (run ? 2 : 0));
    // spikes
    ctx.fillStyle = C.muted;
    ctx.beginPath();
    ctx.moveTo(x, b - 6);
    const n = 6;
    for (let i = 0; i <= n; i++) {
      const a = Math.PI + (i / n) * Math.PI * 0.82;
      const r = i % 2 ? 24 : 17;
      ctx.lineTo(x + 20 + Math.cos(a) * r, b - 6 + Math.sin(a) * r * 1.05);
    }
    ctx.lineTo(x + 30, b - 6);
    ctx.closePath(); ctx.fill();
    // face and belly
    ctx.fillStyle = C.signal;
    ctx.beginPath(); ctx.ellipse(x + 31, b - 12, 11, 8, -0.15, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x + 38, b - 16); ctx.lineTo(x + 46, b - 11); ctx.lineTo(x + 38, b - 8); ctx.fill();
    ctx.fillStyle = C.ink;
    ctx.beginPath(); ctx.arc(x + 46, b - 11, 2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + 35, b - 15, 1.8, 0, Math.PI * 2); ctx.fill();
  }

  function drawBug(t) {
    const x = t.x, y = Y(t.y, t.h);
    ctx.strokeStyle = C.bug; ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
      const lx = x + 7 + i * 6;
      ctx.beginPath(); ctx.moveTo(lx, y + 10); ctx.lineTo(lx - 3, y + t.h); ctx.stroke();
    }
    ctx.fillStyle = C.bug;
    ctx.beginPath(); ctx.ellipse(x + 13, y + 9, 12, 8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = C.ink;
    ctx.fillRect(x + 12, y + 2, 2, 14);
    ctx.beginPath(); ctx.arc(x + 3, y + 8, 2, 0, Math.PI * 2); ctx.fill();
  }

  function drawLimit(t) {
    const y = Y(t.y, t.h);
    ctx.fillStyle = C.panel; ctx.strokeStyle = C.bug; ctx.lineWidth = 2;
    ctx.fillRect(t.x, y, t.w, t.h); ctx.strokeRect(t.x + 1, y + 1, t.w - 2, t.h - 2);
    ctx.save(); ctx.translate(t.x + t.w / 2, y + t.h / 2); ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = C.bug; ctx.font = '500 10px "JetBrains Mono", ui-monospace, Menlo, monospace';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('LIMIT', 0, 0);
    ctx.restore();
  }

  function drawCloud(t) {
    const x = t.x, y = Y(t.y, t.h) + 10;
    ctx.fillStyle = C.cloud;
    ctx.beginPath();
    ctx.arc(x + 10, y + 2, 8, 0, Math.PI * 2);
    ctx.arc(x + 19, y - 3, 10, 0, Math.PI * 2);
    ctx.arc(x + 27, y + 3, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(x + 10, y + 2, 17, 8);
  }

  function text(lines) {
    ctx.textAlign = 'center';
    lines.forEach(([str, font, color], i) => {
      ctx.font = font; ctx.fillStyle = color;
      ctx.fillText(str, W / 2, H / 2 - 30 + i * 26, W - 32);
    });
    ctx.textAlign = 'left';
  }

  function draw() {
    ctx.fillStyle = C.ink; ctx.fillRect(0, 0, W, H);
    // ground with moving dashes
    ctx.strokeStyle = C.line; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, ground + 0.5); ctx.lineTo(W, ground + 0.5); ctx.stroke();
    ctx.fillStyle = C.line;
    const off = (dist || 0) % 40;
    for (let x = -off; x < W; x += 40) ctx.fillRect(x, ground + 10, 14, 2);

    if (!hog) reset();
    for (const t of things) {
      if (t.kind === 'bug') drawBug(t);
      else if (t.kind === 'limit') drawLimit(t);
      else drawCloud(t);
    }
    drawHog();

    if (state === 'idle') {
      text([['Deploy Dash', '700 22px Archivo, "Helvetica Neue", Arial, sans-serif', C.fg],
            ['Press Space or tap to start', MONO, C.muted]]);
    } else if (state === 'over') {
      ctx.fillStyle = 'rgba(11, 18, 32, 0.72)'; ctx.fillRect(0, 0, W, H);
      text([[fail, MONO, C.bug],
            ['Score ' + score(), '700 22px Archivo, "Helvetica Neue", Arial, sans-serif', C.fg],
            ['Press Space or tap to redeploy', MONO, C.muted]]);
    }
  }

  cv.addEventListener('pointerdown', (e) => { e.preventDefault(); cv.focus({ preventScroll: true }); action(); });
  addEventListener('keydown', (e) => {
    if (e.code !== 'Space' && e.key !== 'ArrowUp') return;
    if (document.activeElement !== cv && state !== 'run') return;
    e.preventDefault(); action();
  });
  new ResizeObserver(resize).observe(cv);
  document.fonts && document.fonts.ready.then(() => { if (state !== 'run') draw(); });
})();
