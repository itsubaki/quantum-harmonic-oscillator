import { simulate } from "./oscillator.js";

(() => {
  const $ = id => document.getElementById(id);
  const tau = $('tau'), input = $('input');
  const labels = ['|00⟩', '|01⟩', '|10⟩', '|11⟩'];
  let playing = false, lastFrame = 0, animationFrame = null, lastSnapshot = null;
  function bars(container, names) {
    container.innerHTML = '';
    for (let i = 0; i < names.length; i++) {
      const line = document.createElement('div'); line.className = 'bar-item';
      const label = document.createElement('span'); label.className = 'ket'; label.textContent = names[i];
      const bg = document.createElement('div'); bg.className = 'bar-bg';
      const fill = document.createElement('div'); fill.className = 'bar-fill'; bg.appendChild(fill);
      const val = document.createElement('span'); val.className = 'val'; val.textContent = '—';
      line.append(label, bg, val); container.appendChild(line);
    }
  }
  bars($('logicalBars'), labels);
  bars($('levelBars'), Array.from({ length: 5 }, (_, n) => `|${n}⟩`));
  function fillBars(container, values) {
    const rows = container.children;
    values.forEach((v, i) => {
      rows[i].querySelector('.bar-fill').style.width = `${Math.max(0, 100 * v)}%`;
      rows[i].querySelector('.val').textContent = `${(100 * v).toFixed(1)}%`;
    });
  }
  function plot(points) {
    const canvas = $('chart'); const ctx = canvas.getContext('2d');
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = canvas.clientWidth, h = canvas.clientHeight;
    canvas.width = Math.max(1, Math.round(w * dpr)); canvas.height = Math.max(1, Math.round(h * dpr));
    ctx.scale(dpr, dpr); ctx.clearRect(0, 0, w, h);
    const left = 46, right = w - 16, top = 18, bottom = h - 30;
    let max = 0.55;
    for (const p of points) { max = Math.max(max, Math.abs(p.re), Math.abs(p.im), p.density); }
    max *= 1.20;
    const sy = y => top + (max - y) / (2 * max) * (bottom - top);
    const sx = x => left + (x + 6) / 12 * (right - left);
    ctx.lineWidth = 1; ctx.strokeStyle = '#2b3e55';
    for (let i = -2; i <= 2; i++) { const y = i * max / 2; ctx.beginPath(); ctx.moveTo(left, sy(y)); ctx.lineTo(right, sy(y)); ctx.stroke(); }
    for (const x of [-6, -3, 0, 3, 6]) {
      ctx.beginPath(); ctx.moveTo(sx(x), top); ctx.lineTo(sx(x), bottom); ctx.stroke();
      ctx.fillStyle = '#8fa4bf'; ctx.font = '11px system-ui'; ctx.textAlign = 'center'; ctx.fillText(x.toString(), sx(x), bottom + 17);
    }
    ctx.fillStyle = '#8fa4bf'; ctx.textAlign = 'right'; ctx.font = '11px system-ui';
    for (const y of [-max / 2, 0, max / 2]) ctx.fillText(y.toFixed(1), left - 7, sy(y) + 4);
    const colors = { density: '#6bd9ad', re: '#6facfa', im: '#b59afa' };
    for (const field of ['density', 're', 'im']) {
      ctx.beginPath(); ctx.lineWidth = field === 'density' ? 2.7 : 1.8;
      ctx.strokeStyle = colors[field]; ctx.lineJoin = 'round';
      points.forEach((p, i) => i ? ctx.lineTo(sx(p.x), sy(p[field])) : ctx.moveTo(sx(p.x), sy(p[field])));
      ctx.stroke();
    }
  }
  function refresh() {
    // Some browsers round the range maximum a few ulps above 2π.
    const current = Math.max(0, Math.min(2 * Math.PI, Number(tau.value)));
    $('tauValue').textContent = `${current.toFixed(3)}${Math.abs(current - Math.PI) < .0001 ? '  (π)' : ''}`;
    $('timeRatio').textContent = (current / Math.PI).toFixed(2);
    try {
      const s = simulate(input.value, current);
      lastSnapshot = s;
      $('fidelity').textContent = (100 * s.fidelity).toFixed(2) + '%';
      $('energy').textContent = s.energy.toFixed(3);
      fillBars($('logicalBars'), s.logicalProb);
      fillBars($('levelBars'), s.levelProb);
      plot(s.wave); $('error').textContent = '';
    } catch (e) { stop(); $('error').textContent = 'Simulation error: ' + e.message; }
  }
  function setTau(v) { tau.value = String(v); refresh(); }
  function stop() {
    playing = false;
    cancelAnimationFrame(animationFrame);
    animationFrame = null;
    $('play').textContent = '▶ Play Time Evolution';
    $('play').setAttribute('aria-pressed', 'false');
  }
  function animate(t) {
    if (!playing) return;
    if (t - lastFrame > 42) {
      lastFrame = t; const next = Number(tau.value) + 0.045;
      setTau(next > 2 * Math.PI ? 0 : next);
    }
    if (playing) animationFrame = requestAnimationFrame(animate);
  }
  $('zero').addEventListener('click', () => { stop(); setTau(0) });
  $('pi').addEventListener('click', () => { stop(); setTau(Math.PI) });
  $('play').addEventListener('click', () => {
    if (playing) { stop(); return; }
    playing = true;
    $('play').textContent = '⏸ Pause';
    $('play').setAttribute('aria-pressed', 'true');
    lastFrame = 0; animationFrame = requestAnimationFrame(animate);
  });
  input.addEventListener('change', () => { stop(); setTau(0) });
  tau.addEventListener('input', () => { stop(); refresh() });
  window.addEventListener('resize', () => { if (lastSnapshot) plot(lastSnapshot.wave) });
  refresh();
})();
