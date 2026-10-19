import * as THREE from 'three';
import { mulberry32 } from './textures.js';

export const FONT = {
  serif: "'Playfair Display', Georgia, serif",
  body: "'Crimson Text', Georgia, serif",
  type: "'Special Elite', 'Courier New', monospace",
  mono: "'Share Tech Mono', Consolas, monospace",
};

const D2R = Math.PI / 180;
const TAU = Math.PI * 2;

/* ── drawing helpers (all in a 200×200 dial space) ── */
function polar(r, a, cx = 100, cy = 100) {
  const t = (a - 90) * D2R;
  return [cx + r * Math.cos(t), cy + r * Math.sin(t)];
}
function disc(c, x, y, r, fill) {
  c.beginPath(); c.arc(x, y, r, 0, TAU); c.fillStyle = fill; c.fill();
}
function ring(c, x, y, r, stroke, w) {
  c.beginPath(); c.arc(x, y, r, 0, TAU); c.strokeStyle = stroke; c.lineWidth = w; c.stroke();
}
function tick(c, a, r1, r2, color, w) {
  const [x1, y1] = polar(r1, a), [x2, y2] = polar(r2, a);
  c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2);
  c.strokeStyle = color; c.lineWidth = w; c.lineCap = 'butt'; c.stroke();
}
function txt(c, str, x, y, o = {}) {
  c.save();
  c.translate(x, y);
  if (o.rot) c.rotate(o.rot * D2R);
  if (o.mirror) c.scale(-1, 1);
  c.font = `${o.style || ''} ${o.weight || 400} ${o.size || 12}px ${o.font || FONT.serif}`;
  c.fillStyle = o.color || '#222';
  c.textAlign = o.align || 'center';
  c.textBaseline = 'middle';
  if ('letterSpacing' in c) c.letterSpacing = `${o.spacing || 0}px`;
  c.globalAlpha = o.alpha ?? 1;
  c.fillText(str, 0, 0);
  c.restore();
}
function txtAt(c, str, a, r, o) {
  const [x, y] = polar(r, a);
  txt(c, str, x, y, o);
}
function shadowed(c, fn, depth = 1) {
  const k = c._k || 1;
  c.save();
  c.shadowColor = 'rgba(0,0,0,0.4)';
  c.shadowBlur = 2.5 * k * depth;
  c.shadowOffsetX = 1 * k * depth;
  c.shadowOffsetY = 1.8 * k * depth;
  fn();
  c.restore();
}
function hand(c, a, len, w, color, o = {}) {
  const tail = o.tail ?? 12;
  shadowed(c, () => {
    c.translate(100, 100);
    c.rotate(a * D2R);
    c.fillStyle = color; c.strokeStyle = color;
    c.beginPath();
    if (o.shape === 'line') {
      c.lineWidth = w; c.lineCap = 'round';
      c.moveTo(0, tail); c.lineTo(0, -len); c.stroke();
    } else if (o.shape === 'leaf') {
      c.moveTo(0, tail);
      c.quadraticCurveTo(w, -len * 0.35, 0, -len);
      c.quadraticCurveTo(-w, -len * 0.35, 0, tail);
      c.fill();
    } else {
      c.moveTo(-w / 2, tail);
      c.lineTo(-w * 0.32, -len + w * 0.4);
      c.lineTo(0, -len);
      c.lineTo(w * 0.32, -len + w * 0.4);
      c.lineTo(w / 2, tail);
      c.closePath(); c.fill();
    }
  }, o.depth ?? 1);
}
function pin(c, r, c1, c2) {
  shadowed(c, () => disc(c, 100, 100, r, c1));
  if (c2) disc(c, 100, 100, r * 0.45, c2);
}
function radialFill(c, stops, fx = 100, fy = 100) {
  const g = c.createRadialGradient(fx, fy, 0, 100, 100, 110);
  stops.forEach(([o, col]) => g.addColorStop(o, col));
  c.fillStyle = g; c.fillRect(0, 0, 200, 200);
}
function tentacle(c, ang, len, w, phase, amp, color, suck) {
  const steps = 30, dir = (ang - 90) * D2R;
  const dx = Math.cos(dir), dy = Math.sin(dir), px = -dy, py = dx;
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const s = i / steps;
    const off = Math.sin(s * Math.PI * 1.6 + phase) * amp * s;
    pts.push([100 + dx * len * s + px * off, 100 + dy * len * s + py * off, w * (1 - s * 0.85)]);
  }
  shadowed(c, () => {
    c.beginPath();
    for (const [x, y, r] of pts) { c.moveTo(x + r, y); c.arc(x, y, r, 0, TAU); }
    c.fillStyle = color; c.fill();
  }, 0.8);
  if (suck) {
    c.beginPath();
    for (let i = 4; i < steps; i += 3) {
      const [x, y, r] = pts[i], sx = x + px * r * 0.45, sy = y + py * r * 0.45, sr = r * 0.32;
      c.moveTo(sx + sr, sy); c.arc(sx, sy, sr, 0, TAU);
    }
    c.fillStyle = suck; c.fill();
  }
}

// A brass pendulum pivoting at the dial centre: thin rod, small counterweight, weighted bob.
function pendulum(c, a, len, bob) {
  shadowed(c, () => {
    c.translate(100, 100); c.rotate(a * D2R);
    c.strokeStyle = '#5a4018'; c.lineWidth = 1.6; c.lineCap = 'round';
    c.beginPath(); c.moveTo(0, 9); c.lineTo(0, -len + bob * 0.6); c.stroke();
    c.fillStyle = '#9a7228'; c.beginPath(); c.arc(0, 9, 2.6, 0, TAU); c.fill();
    const g = c.createRadialGradient(-bob * 0.35, -len - bob * 0.35, bob * 0.1, 0, -len, bob);
    g.addColorStop(0, '#fff1b8'); g.addColorStop(0.45, '#d4a640'); g.addColorStop(1, '#7a5410');
    c.fillStyle = g; c.beginPath(); c.arc(0, -len, bob, 0, TAU); c.fill();
  });
  c.save(); c.translate(100, 100); c.rotate(a * D2R);
  c.strokeStyle = 'rgba(90,60,10,0.6)'; c.lineWidth = 0.6;
  c.beginPath(); c.arc(0, -len, bob * 0.62, 0, TAU); c.stroke();
  c.restore();
}

// phase: 0 = new, 0.25 = first quarter, 0.5 = full, 0.75 = last quarter.
function moon(c, x, y, r, phase) {
  const dark = '#28304e', lit = '#f3e3a6';
  disc(c, x, y, r, dark);
  c.beginPath(); c.arc(x, y, r, -Math.PI / 2, Math.PI / 2, phase >= 0.5); c.closePath();
  c.fillStyle = lit; c.fill();
  const k = Math.cos(phase * TAU);
  c.beginPath(); c.ellipse(x, y, Math.abs(k) * r, r, 0, 0, TAU);
  c.fillStyle = k > 0 ? dark : lit; c.fill();
}

// Days since the new moon of 2000-01-06 18:14 UTC, folded into one synodic month.
function moonPhase(now) {
  const SYNODIC = 29.530588;
  return ((((now / 86400000 - 10962.76) % SYNODIC) + SYNODIC) % SYNODIC) / SYNODIC;
}

const RANSOM_FONTS = [
  (s) => `900 ${s}px ${FONT.serif}`,
  (s) => `italic 400 ${s}px ${FONT.serif}`,
  (s) => `${s}px ${FONT.type}`,
  (s) => `${s}px ${FONT.mono}`,
  (s) => `italic 600 ${s}px ${FONT.body}`,
  (s) => `${s}px Impact, 'Arial Black', sans-serif`,
  (s) => `bold ${s}px 'Courier New', monospace`,
  (s) => `bold ${s}px Georgia, serif`,
];
const RANSOM_PAPERS = [
  ['#fbfaf5', '#111111'], ['#f4e7b0', '#1a1a1a'], ['#151515', '#f5f5f0'], ['#f6c6d0', '#7a0f2a'],
  ['#e8e3d3', '#b3121e'], ['#cfe3f0', '#123b6b'], ['#ffffff', '#c41e1e'], ['#2b2b2b', '#f2d14b'],
];
const ransomCache = new Map();

// Scatter numerals 1–12 across the dial without overlaps; fixed for a given seed.
function ransomLayout(seed) {
  if (ransomCache.has(seed)) return ransomCache.get(seed);
  const r = mulberry32(seed * 7907 + 12);
  const placed = [];
  for (let n = 1; n <= 12; n++) {
    let best = null;
    for (let tries = 0, gap = 32; tries < 400; tries++) {
      if (tries % 100 === 99) gap -= 4;
      const rad = Math.sqrt(26 * 26 + r() * (78 * 78 - 26 * 26)), ang = r() * 360;
      const [x, y] = polar(rad, ang);
      if (placed.every((p) => Math.hypot(p.x - x, p.y - y) >= gap)) { best = { x, y }; break; }
    }
    best ??= { x: 100 + (r() - 0.5) * 120, y: 100 + (r() - 0.5) * 120 };
    placed.push({
      n, ...best,
      size: 15 + r() * 10,
      rot: (r() - 0.5) * 60,
      font: RANSOM_FONTS[Math.floor(r() * RANSOM_FONTS.length)],
      paper: RANSOM_PAPERS[Math.floor(r() * RANSOM_PAPERS.length)],
      skew: (r() - 0.5) * 8,
    });
  }
  ransomCache.set(seed, placed);
  return placed;
}

function aimHand(c, from, to, f, w, color) {
  const x = from.x + (to.x - from.x) * f, y = from.y + (to.y - from.y) * f;
  const angle = Math.atan2(x - 100, -(y - 100)) / D2R;
  const len = Math.max(18, Math.hypot(x - 100, y - 100) - 9);
  hand(c, angle, len, w, color);
}

export function timeInfo(now) {
  const d = new Date(now);
  const h = d.getHours(), m = d.getMinutes(), s = d.getSeconds(), ms = d.getMilliseconds();
  return {
    now, date: d, h, m, s, ms,
    hA: (h % 12) * 30 + m * 0.5 + s / 120,
    mA: m * 6 + s * 0.1,
    sA: s * 6,
    sSmooth: s * 6 + ms * 0.006,
  };
}

function corporateCountdown(d) {
  const names = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  const day = d.getDay();
  if (day === 0 || day === 6 || (day === 5 && d.getHours() >= 17)) return { weekend: true, day: names[day] };
  const target = new Date(d);
  target.setDate(d.getDate() + (5 - day));
  target.setHours(17, 0, 0, 0);
  let s = Math.max(0, Math.floor((target - d) / 1000));
  const hh = Math.floor(s / 3600); s %= 3600;
  const mm = Math.floor(s / 60), ss = s % 60;
  const p = (n) => String(n).padStart(2, '0');
  return { weekend: false, day: names[day], text: `${p(hh)}:${p(mm)}:${p(ss)}` };
}

const DRUNK_POS = [
  [155, 110, 12], [75, 45, -8], [130, 165, 20], [40, 80, -15], [165, 60, 5], [55, 150, -25],
  [120, 40, 30], [45, 120, -5], [150, 145, -18], [80, 165, 10], [130, 80, 90], [95, 30, -3],
];
const MOODS = ['SERENE', 'ANXIOUS', 'HUNGRY', 'SMUG', 'EXISTENTIAL', 'VIBING', 'UNDERSLEPT', 'PETTY', 'NOSTALGIC'];

/* ── The collection ── */
export const FACES = [
  {
    id: 'procrastinator', name: 'The Procrastinator', model: 'P-2MRW', tagline: "There's Always Tomorrow",
    story: "Found in the desk drawer of a man who was \"going to start his novel any day now\" for 47 years. The hands are permanently frozen between the 3 and the 4, perpetually stuck between \"I should start\" and \"maybe after lunch.\" Every seven seconds the second hand musters the energy to advance one tick, then thinks better of it. The warranty card was never filled out.",
    specs: ['STATIC', 'CERTIFIED UNMOTIVATED', 'YEAR: EVENTUALLY'],
    movement: 'Manual wind (never wound)',
    draw(c, t) {
      radialFill(c, [[0, '#fdf9ef'], [1, '#e4d9bf']], 90, 80);
      ring(c, 100, 100, 90, '#3d2b1f', 0.8); ring(c, 100, 100, 84, '#3d2b1f', 0.8);
      for (let i = 0; i < 60; i++) tick(c, i * 6, 84, 90, '#3d2b1f', i % 5 ? 0.5 : 1.4);
      for (let n = 1; n <= 12; n++) {
        if (n % 3 === 0) txtAt(c, String(n), n * 30, 69, { size: 22, weight: 700, color: '#2c1810' });
        else { const [x, y] = polar(72, n * 30); disc(c, x, y, 1.8, '#2c1810'); }
      }
      txt(c, 'Procrastinator', 100, 62, { size: 10, style: 'italic', color: '#5a4030' });
      txt(c, 'LATER', 100, 128, { size: 9, font: FONT.type, color: '#8a4a2a', spacing: 3 });
      txt(c, 'AUTOMATIC · EVENTUALLY', 100, 140, { size: 5, font: FONT.mono, color: '#9a8a70', spacing: 1 });
      hand(c, 105, 44, 7, '#2c1810', { shape: 'leaf' });
      hand(c, 180, 66, 4.5, '#2c1810', { shape: 'leaf' });
      hand(c, t.s % 7 === 0 ? 6 : 0, 72, 1, '#a8322a', { shape: 'line', tail: 18 });
      pin(c, 4, '#2c1810', '#c4a35a');
    },
  },
  {
    id: 'existentialist', name: 'The Existentialist', model: '∅-001', tagline: 'Time Is A Flat Circle',
    story: "Commissioned by a philosophy professor who wanted \"a watch that tells the real time.\" The watchmaker delivered this. Instead of numbers, the dial asks unanswerable questions, and the hands move at one tenth of the speed they feel is expected of them. Three previous owners returned it, citing \"an uncomfortable awareness of mortality.\" The fourth simply nodded and said, \"Yes.\"",
    specs: ['LIVE (BARELY)', 'VOID-CERTIFIED', 'MEANING: NOT INCLUDED'],
    movement: 'Calibre ∅, runs at 10% of its will to live',
    draw(c, t) {
      radialFill(c, [[0, '#1d1d1d'], [1, '#050505']]);
      for (let r = 8; r < 92; r += 3) ring(c, 100, 100, r, 'rgba(255,255,255,0.03)', 0.6);
      for (let i = 0; i < 12; i++) tick(c, i * 30, 86, 93, '#555', 1);
      [['WHY?', 0], ['HOW?', 90], ['WHEN?', 180], ['WHO?', 270]]
        .forEach(([s, a]) => txtAt(c, s, a, 70, { size: 12, font: FONT.mono, color: '#a0a0a0', spacing: 1 }));
      txt(c, 'TIME IS A FLAT CIRCLE', 100, 56, { size: 5, font: FONT.mono, color: '#5a5a5a', spacing: 1.5 });
      txt(c, '∅', 100, 134, { size: 18, color: '#6a6a6a' });
      hand(c, t.hA * 0.1, 40, 3, '#b8b8b8');
      hand(c, t.mA * 0.1, 60, 2, '#b8b8b8');
      hand(c, t.sSmooth * 0.1, 68, 0.8, '#777', { shape: 'line', tail: 14 });
      pin(c, 3, '#888');
    },
  },
  {
    id: 'whiskers', name: 'Señor Whiskers', model: 'MEOW-7', tagline: 'Every Hour Is Nap Hour',
    story: "Created by a watchmaker whose 23 cats kept walking across his workbench. He gave up fighting it and embraced the chaos. The hour markers are paw prints, and the eyes follow the second hand around the dial like it owes them money. At exactly 3 AM the case emits a faint purr that no engineer has been able to explain or silence. It is the only watch cats will voluntarily stare at.",
    specs: ['LIVE', 'CAT-APPROVED', 'PURRS AT 3AM'],
    movement: 'Purr-driven automatic',
    pinion: false,
    draw(c, t) {
      radialFill(c, [[0, '#fff8ec'], [1, '#efd8ba']]);
      const ear = (sx) => {
        c.beginPath(); c.moveTo(100 + sx * 28, 42); c.lineTo(100 + sx * 50, 14); c.lineTo(100 + sx * 60, 50); c.closePath();
        c.fillStyle = '#f0c79a'; c.fill();
        c.beginPath(); c.moveTo(100 + sx * 34, 42); c.lineTo(100 + sx * 49, 22); c.lineTo(100 + sx * 55, 45); c.closePath();
        c.fillStyle = '#f3a3a3'; c.fill();
      };
      ear(-1); ear(1);
      for (let i = 0; i < 12; i++) {
        const a = i * 30, [x, y] = polar(82, a);
        c.save(); c.translate(x, y); c.rotate(a * D2R);
        disc(c, 0, 1.5, 3.6, '#d99a6a');
        [-4.2, -1.4, 1.4, 4.2].forEach((dx, j) => disc(c, dx, -3.4 - (j === 1 || j === 2 ? 1.2 : 0), 1.6, '#d99a6a'));
        c.restore();
      }
      const ex = Math.sin(t.sSmooth * D2R) * 4, ey = -Math.cos(t.sSmooth * D2R) * 3;
      for (const sx of [-1, 1]) {
        const cx = 100 + sx * 25, cy = 80;
        c.beginPath(); c.ellipse(cx, cy, 12, 14, 0, 0, TAU);
        c.fillStyle = '#8fd36b'; c.fill(); c.lineWidth = 2; c.strokeStyle = '#3b2a1a'; c.stroke();
        c.beginPath(); c.ellipse(cx + ex, cy + ey, 2.6, 10, 0, 0, TAU); c.fillStyle = '#111'; c.fill();
        disc(c, cx + ex + 3, cy + ey - 5, 1.8, 'rgba(255,255,255,0.85)');
      }
      c.beginPath(); c.moveTo(94, 104); c.lineTo(106, 104); c.lineTo(100, 111); c.closePath();
      c.fillStyle = '#e98f9a'; c.fill();
      c.beginPath();
      c.moveTo(100, 111); c.quadraticCurveTo(100, 118, 93, 118);
      c.moveTo(100, 111); c.quadraticCurveTo(100, 118, 107, 118);
      c.strokeStyle = '#7a5040'; c.lineWidth = 1.4; c.stroke();
      c.strokeStyle = 'rgba(90,60,40,0.7)'; c.lineWidth = 0.8;
      for (const sx of [-1, 1]) for (const k of [-1, 0, 1]) {
        c.beginPath(); c.moveTo(100 + sx * 12, 112 + k * 3);
        c.quadraticCurveTo(100 + sx * 30, 108 + k * 5, 100 + sx * 48, 104 + k * 9); c.stroke();
      }
      txt(c, 'MEOW-7', 100, 150, { size: 6, font: FONT.mono, color: '#b08860', spacing: 2 });
      hand(c, t.hA, 40, 6, '#5a3c28', { shape: 'leaf' });
      hand(c, t.mA, 62, 4, '#5a3c28', { shape: 'leaf' });
      hand(c, t.sA, 62, 1, '#d0607a', { shape: 'line', tail: 10 });
      const [yx, yy] = polar(66, t.sA);
      shadowed(c, () => disc(c, yx, yy, 5, '#d0607a'));
      c.strokeStyle = 'rgba(255,255,255,0.55)'; c.lineWidth = 0.6;
      c.beginPath(); c.arc(yx, yy, 3.4, 0.3, 2.5); c.stroke();
      pin(c, 4, '#5a3c28', '#e98f9a');
    },
  },
  {
    id: 'backwards', name: 'Backwards Benjamin', model: 'REV-1799', tagline: 'He Who Controls The Past...',
    story: "Rumored to be built by a clockmaker who deeply regretted something and wanted time to go the other way. The numerals run counter-clockwise, they are printed mirror-image, and the hands sweep backwards. It tells perfect time if you hold it up to a mirror. Several owners report that Mondays feel like Fridays while wearing it, though this has not been scientifically verified. Or has it? Time is confusing now.",
    specs: ['LIVE (REVERSED)', 'MIRROR-COMPATIBLE', 'REGRET-POWERED'],
    movement: 'Counter-clockwise quartz, regret-powered',
    draw(c, t) {
      radialFill(c, [[0, '#ffffff'], [1, '#dedede']]);
      for (let i = 0; i < 60; i++) tick(c, i * 6, i % 5 ? 87 : 82, 92, '#222', i % 5 ? 0.5 : 1.6);
      for (let n = 1; n <= 12; n++) {
        txtAt(c, String(n), (360 - n * 30) % 360, 70, { size: 16, weight: 700, color: '#1d1d1d', mirror: true });
      }
      txt(c, 'BENJAMIN', 100, 60, { size: 9, spacing: 2, color: '#333', mirror: true });
      txt(c, 'REVERSE · 1799', 100, 140, { size: 5, font: FONT.mono, color: '#888', spacing: 1, mirror: true });
      hand(c, 360 - t.hA, 44, 5, '#1a1a1a');
      hand(c, 360 - t.mA, 66, 3.4, '#1a1a1a');
      hand(c, 360 - t.sA, 74, 1, '#c41e1e', { shape: 'line', tail: 18 });
      pin(c, 4, '#1a1a1a', '#c41e1e');
    },
  },
  {
    id: 'dali', name: 'The Dalí', model: 'MELT-1931', tagline: 'Persistence of Memory Loss',
    shape: 'melted', static: true, pinion: false,
    story: "The final creation of a Spanish watchmaker who left it on a radiator and thought \"actually, this is better.\" The case itself is slowly sliding off the cushion. This is not a defect. Each watch ships with a certificate that reads: \"Time is an illusion, but your warranty is not (90 days).\" The ants are included at no extra charge. They were not part of the original design.",
    specs: ['STATIC', 'HEAT-DAMAGED', 'SURREALIST-APPROVED'],
    movement: 'Thermal sag escapement',
    draw(c) {
      const sky = c.createLinearGradient(0, 0, 0, 200);
      sky.addColorStop(0, '#f6e7bf'); sky.addColorStop(0.55, '#e7c88c');
      sky.addColorStop(0.62, '#b38a4c'); sky.addColorStop(1, '#6d4a24');
      c.fillStyle = sky; c.fillRect(0, 0, 200, 200);
      c.beginPath(); c.moveTo(130, 124); c.lineTo(150, 96); c.lineTo(170, 92); c.lineTo(186, 100);
      c.lineTo(200, 104); c.lineTo(200, 124); c.closePath(); c.fillStyle = '#8a5a2c'; c.fill();
      c.fillStyle = 'rgba(90,120,140,0.35)'; c.fillRect(0, 118, 200, 6);
      c.strokeStyle = 'rgba(70,45,15,0.6)'; c.lineWidth = 0.8; c.beginPath();
      for (let a = 0; a <= 360; a += 4) {
        const rr = 88 + Math.sin(a * D2R * 3) * 2 + (a > 60 && a < 200 ? ((a - 60) / 140) * 6 : 0);
        const [x, y] = polar(rr, a);
        const yy = y + (y > 100 ? (y - 100) * 0.08 : 0);
        if (a) c.lineTo(x, yy); else c.moveTo(x, yy);
      }
      c.stroke();
      const r = mulberry32(1931);
      for (let n = 1; n <= 12; n++) {
        const [x, y] = polar(70, n * 30), stretch = 1.2 + r() * 0.9;
        c.save(); c.translate(x, y); c.rotate((r() - 0.5) * 0.5); c.scale(1, stretch);
        txt(c, String(n), 0, 0, { size: 14, style: 'italic', color: '#4a2f10' });
        c.restore();
        const dl = 4 + r() * 10, by = y + 6 * stretch;
        c.beginPath(); c.moveTo(x - 1.4, by);
        c.quadraticCurveTo(x - 1, by + dl, x, by + dl + 2);
        c.quadraticCurveTo(x + 1, by + dl, x + 1.4, by);
        c.fillStyle = '#4a2f10'; c.fill();
      }
      shadowed(c, () => {
        c.strokeStyle = '#3a240c'; c.lineCap = 'round';
        c.lineWidth = 5; c.beginPath(); c.moveTo(100, 100);
        c.bezierCurveTo(96, 84, 104, 72, 99, 60); c.quadraticCurveTo(95, 52, 92, 64); c.stroke();
        c.lineWidth = 3; c.beginPath(); c.moveTo(100, 100);
        c.bezierCurveTo(120, 88, 134, 78, 142, 84); c.quadraticCurveTo(149, 90, 145, 110);
        c.quadraticCurveTo(144, 118, 141, 122); c.stroke();
      });
      pin(c, 4, '#3a240c');
      const ar = mulberry32(7);
      for (let i = 0; i < 8; i++) {
        const ax = 118 + ar() * 30, ay = 128 + ar() * 26, ang = ar() * TAU;
        c.save(); c.translate(ax, ay); c.rotate(ang); c.fillStyle = '#1a0e04';
        [[-3, 1.6, 1.1], [0, 1.3, 0.9], [2.8, 2, 1.3]].forEach(([dx, rx, ry]) => {
          c.beginPath(); c.ellipse(dx, 0, rx, ry, 0, 0, TAU); c.fill();
        });
        c.strokeStyle = '#1a0e04'; c.lineWidth = 0.4;
        for (const k of [-1, 0, 1]) {
          c.beginPath(); c.moveTo(k * 1.2, -0.6); c.lineTo(k * 1.8, -2.4);
          c.moveTo(k * 1.2, 0.6); c.lineTo(k * 1.8, 2.4); c.stroke();
        }
        c.restore();
      }
      txt(c, 'Dalí', 62, 150, { size: 11, style: 'italic', color: 'rgba(40,20,5,0.7)', rot: -12 });
    },
  },
  {
    id: 'pizza', name: 'Pizza Time', model: 'XL-CHEESE', tagline: 'A Slice Of Every Moment',
    pinion: false,
    story: "Born at 2 AM in a pizzeria when a desperate customer asked \"what time is it?\" and the owner pointed at a pizza and said \"pepperoni past mushroom.\" He received a $3M grant from the Italian Horological Society the next day. (The Society denies this.) The watch smells faintly of oregano. This is not a defect. It is not a feature either. Nobody knows why.",
    specs: ['LIVE', 'EXTRA CHEESE', 'OREGANO-SCENTED'],
    movement: 'Mozzarella-damped quartz',
    draw(c, t) {
      const r = mulberry32(42);
      const crust = c.createRadialGradient(100, 100, 78, 100, 100, 104);
      crust.addColorStop(0, '#ecbd6c'); crust.addColorStop(0.6, '#c98a3a'); crust.addColorStop(1, '#8f5a22');
      c.fillStyle = crust; c.fillRect(0, 0, 200, 200);
      for (let i = 0; i < 30; i++) { const [x, y] = polar(90 + r() * 8, r() * 360); disc(c, x, y, 0.8 + r() * 1.6, 'rgba(70,35,10,0.45)'); }
      disc(c, 100, 100, 86, '#b7381f');
      for (let i = 0; i < 55; i++) {
        const [x, y] = polar(Math.sqrt(r()) * 80, r() * 360);
        c.beginPath(); c.ellipse(x, y, 6 + r() * 10, 5 + r() * 8, r() * 3, 0, TAU);
        c.fillStyle = `rgba(${(240 + r() * 15) | 0},${(196 + r() * 30) | 0},${(80 + r() * 40) | 0},0.82)`; c.fill();
      }
      for (let i = 0; i < 25; i++) { const [x, y] = polar(Math.sqrt(r()) * 80, r() * 360); disc(c, x, y, 1 + r() * 2.5, 'rgba(190,120,40,0.35)'); }
      c.strokeStyle = 'rgba(90,30,10,0.45)'; c.lineWidth = 1;
      for (let i = 0; i < 12; i++) { const [x, y] = polar(88, i * 30 + 15); c.beginPath(); c.moveTo(100, 100); c.lineTo(x, y); c.stroke(); }
      for (let i = 0; i < 12; i++) {
        const [x, y] = polar(70, i * 30);
        shadowed(c, () => {
          const g = c.createRadialGradient(x - 2, y - 2, 1, x, y, 9);
          g.addColorStop(0, '#c9442c'); g.addColorStop(1, '#7e1f12');
          c.fillStyle = g; c.beginPath(); c.arc(x, y, 8.5, 0, TAU); c.fill();
        }, 0.5);
        for (let k = 0; k < 4; k++) disc(c, x + (r() - 0.5) * 9, y + (r() - 0.5) * 9, 0.9 + r(), 'rgba(60,10,5,0.5)');
      }
      for (const [x, y, a] of [[66, 120, 0.6], [132, 74, -0.9], [120, 140, 2.2]]) {
        c.save(); c.translate(x, y); c.rotate(a);
        c.beginPath(); c.ellipse(0, 0, 9, 4.5, 0, 0, TAU); c.fillStyle = '#2f7a2f'; c.fill();
        c.strokeStyle = 'rgba(180,230,160,0.6)'; c.lineWidth = 0.6;
        c.beginPath(); c.moveTo(-8, 0); c.lineTo(8, 0); c.stroke();
        c.restore();
      }
      shadowed(c, () => { c.fillStyle = '#fbf6ea'; c.beginPath(); c.roundRect(72, 122, 56, 12, 2); c.fill(); }, 0.5);
      txt(c, 'PIZZA TIME', 100, 128.5, { size: 7, font: FONT.type, color: '#a3261a', spacing: 1 });
      hand(c, t.hA, 42, 7, '#3b1a0e');
      hand(c, t.mA, 64, 4.5, '#3b1a0e');
      hand(c, t.sA, 70, 1.2, '#2e7d32', { shape: 'line', tail: 16 });
      const [ox, oy] = polar(72, t.sA);
      shadowed(c, () => disc(c, ox, oy, 3.4, '#2b2b1a')); disc(c, ox, oy, 1.3, '#7a2a1a');
      pin(c, 5, '#1f1f14', '#6d6d3a');
    },
  },
  {
    id: 'nihilist', name: 'The Nihilist', model: 'NULL', tagline: '...',
    animated: true, pinion: false,
    story: "No hands. No numbers. No markings of any kind. It was submitted anonymously to the World Watch Awards and won \"Best Minimalist Design\" before the judges realized it did not tell time at all. The creator was asked for comment and replied \"Exactly,\" then walked out of the ceremony. Occasionally, if you stare long enough, the dial asks a question. Nobody has answered it.",
    specs: ['NOTHING', 'ALSO NOTHING', 'SEE ABOVE'],
    movement: 'None. Why would there be?',
    draw(c, t) {
      radialFill(c, [[0, '#141414'], [1, '#030303']]);
      const fade = (p) => (p < 0.4 ? 0 : p < 0.5 ? (p - 0.4) / 0.1 : p < 0.7 ? 1 : p < 0.82 ? 1 - (p - 0.7) / 0.12 : 0);
      txt(c, '...', 100, 94, { size: 30, color: '#808080', alpha: fade((t.now / 5000) % 1) * 0.6 });
      txt(c, 'why?', 100, 130, { size: 12, style: 'italic', font: FONT.body, color: '#6a6a6a', alpha: fade(((t.now + 2000) / 7000) % 1) * 0.55 });
    },
  },
  {
    id: 'corporate', name: 'Corporate Countdown', model: '9TO5-∞', tagline: 'Freedom Is A Construct',
    shape: 'rect', metals: ['resin', 'resin', 'steel', 'pvd'],
    story: "Standard issue at a company where employees were \"empowered to manage their own time.\" The LCD shows hours, minutes, and seconds until 5 PM on Friday. On weekends it gives up and shrugs. It was recalled after HR flagged it for \"excessive accuracy in depicting workplace sentiment.\" Seventeen units were never returned. HR is still looking.",
    specs: ['LIVE', 'SOUL-CRUSHING', 'HR-DISAPPROVED'],
    movement: 'Corporate quartz, 9-to-5 regulated',
    draw(c, t) {
      c.fillStyle = '#141416'; c.fillRect(0, 0, 200, 200);
      txt(c, 'CORP-TIME™', 100, 22, { size: 10, font: FONT.mono, color: '#d6d6d6', spacing: 3 });
      txt(c, 'ILLUMINATOR · REGRET RESIST', 100, 33, { size: 5, font: FONT.mono, color: '#e0603c', spacing: 1 });
      [['LIGHT', 24, 10], ['MODE', 24, 190], ['START', 176, 10], ['RESET', 176, 190]]
        .forEach(([s, x, y]) => txt(c, s, x, y, { size: 4.5, font: FONT.mono, color: '#8a8a8a' }));
      c.fillStyle = '#060606'; c.beginPath(); c.roundRect(16, 44, 168, 112, 10); c.fill();
      const lcd = c.createLinearGradient(0, 48, 0, 152);
      lcd.addColorStop(0, '#c6d0b2'); lcd.addColorStop(1, '#98a484');
      c.fillStyle = lcd; c.beginPath(); c.roundRect(20, 48, 160, 104, 8); c.fill();
      const sh = c.createLinearGradient(0, 48, 0, 64);
      sh.addColorStop(0, 'rgba(0,0,0,0.28)'); sh.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = sh; c.fillRect(20, 48, 160, 16);
      const ink = '#1c2418', cd = corporateCountdown(t.date);
      txt(c, cd.day, 30, 63, { size: 9, font: FONT.mono, color: ink, align: 'left' });
      txt(c, '→ FRI 17:00', 170, 63, { size: 7, font: FONT.mono, color: ink, align: 'right' });
      if (cd.weekend) {
        txt(c, '¯\\_(ツ)_/¯', 100, 96, { size: 20, color: ink });
        txt(c, 'THIS IS TEMPORARY', 100, 130, { size: 7, font: FONT.mono, color: ink, spacing: 1.5 });
      } else {
        txt(c, '88:88:88', 100, 96, { size: 26, font: FONT.mono, color: ink, alpha: 0.08 });
        txt(c, cd.text, 100, 96, { size: 26, font: FONT.mono, color: ink });
        txt(c, 'UNTIL FREEDOM', 100, 130, { size: 7, font: FONT.mono, color: ink, spacing: 2 });
      }
      txt(c, 'WATER RESIST · SOUL NOT INCLUDED', 100, 170, { size: 5, font: FONT.mono, color: '#7a7a7a', spacing: 0.8 });
      txt(c, '9TO5-∞', 100, 181, { size: 6, font: FONT.mono, color: '#bdbdbd', spacing: 2 });
    },
  },
  {
    id: 'eye', name: 'The All-Seeing Eye', model: 'EYE-1', tagline: 'It Watches You Back',
    animated: true, pinion: false, metals: ['bronze', 'gold', 'pvd', 'steel'],
    story: "Retrieved from an abandoned observatory in 1923. The iris is the clock: it rotates with the hours while the pupil breathes in and out with the seconds. Former owners all report the same thing, that the eye follows you around the room. The current owner says \"We have an understanding.\" It has never been late. It has also never blinked.",
    specs: ['LIVE', 'SENTIENT (UNCONFIRMED)', 'BLINK-FREE SINCE 1923'],
    movement: 'Unblinking optic movement',
    draw(c, t) {
      radialFill(c, [[0, '#4a2418'], [1, '#160805']]);
      for (let i = 0; i < 12; i++) { const [x, y] = polar(93, i * 30); disc(c, x, y, 1.6, '#a8862e'); }
      const almond = () => {
        c.beginPath(); c.moveTo(8, 100);
        c.quadraticCurveTo(100, 14, 192, 100); c.quadraticCurveTo(100, 186, 8, 100); c.closePath();
      };
      c.save(); almond(); c.clip();
      const sg = c.createRadialGradient(100, 100, 30, 100, 100, 95);
      sg.addColorStop(0, '#f6efe4'); sg.addColorStop(1, '#cfb39c');
      c.fillStyle = sg; c.fillRect(0, 0, 200, 200);
      const vr = mulberry32(1923);
      c.strokeStyle = 'rgba(170,40,40,0.4)'; c.lineWidth = 0.6;
      for (let i = 0; i < 14; i++) {
        const left = vr() < 0.5;
        let x = left ? 12 + vr() * 20 : 188 - vr() * 20, y = 92 + vr() * 16;
        c.beginPath(); c.moveTo(x, y);
        for (let k = 0; k < 6; k++) { x += (left ? 1 : -1) * (4 + vr() * 4); y += (vr() - 0.5) * 7; c.lineTo(x, y); }
        c.stroke();
      }
      c.save(); c.translate(100, 100); c.rotate(t.hA * D2R);
      const ig = c.createRadialGradient(0, 0, 10, 0, 0, 42);
      ig.addColorStop(0, '#f0b84a'); ig.addColorStop(0.45, '#b07818'); ig.addColorStop(1, '#3a2206');
      c.fillStyle = ig; c.beginPath(); c.arc(0, 0, 42, 0, TAU); c.fill();
      for (let i = 0; i < 90; i++) {
        const a = i * 4 * D2R;
        c.strokeStyle = i % 3 ? 'rgba(255,214,120,0.25)' : 'rgba(60,30,0,0.35)';
        c.lineWidth = 0.8; c.beginPath();
        c.moveTo(Math.cos(a) * 15, Math.sin(a) * 15);
        c.lineTo(Math.cos(a + 0.06) * 40, Math.sin(a + 0.06) * 40); c.stroke();
      }
      c.restore();
      ring(c, 100, 100, 24, 'rgba(90,50,5,0.45)', 2);
      ring(c, 100, 100, 41.5, '#1e1004', 3);
      disc(c, 100, 100, 15 + Math.sin(t.now / 650) * 3.5, '#050302');
      hand(c, t.hA, 30, 2.4, '#e8c76a', { shape: 'line', tail: 6 });
      hand(c, t.mA, 44, 1.6, '#e8c76a', { shape: 'line', tail: 6 });
      disc(c, 116, 84, 7, 'rgba(255,255,255,0.8)');
      disc(c, 86, 116, 2.6, 'rgba(255,255,255,0.35)');
      const ls = c.createLinearGradient(0, 40, 0, 84);
      ls.addColorStop(0, 'rgba(40,10,5,0.6)'); ls.addColorStop(1, 'rgba(40,10,5,0)');
      c.fillStyle = ls; c.fillRect(0, 0, 200, 90);
      c.restore();
      c.strokeStyle = '#120604'; c.lineWidth = 2.4; almond(); c.stroke();
      c.lineWidth = 1.2;
      for (let i = 1; i < 14; i++) {
        const s = i / 14;
        const x = (1 - s) * (1 - s) * 8 + 2 * (1 - s) * s * 100 + s * s * 192;
        const y = (1 - s) * (1 - s) * 100 + 2 * (1 - s) * s * 14 + s * s * 100;
        const ang = Math.atan2(y - 100, x - 100);
        c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(ang) * 8, y + Math.sin(ang) * 8 - 3); c.stroke();
      }
    },
  },
  {
    id: 'binary', name: 'The Binary', model: '0b101010', tagline: 'There Are 10 Types Of People...',
    shape: 'rect', glow: 0.9, metals: ['pvd', 'resin', 'titanium', 'steel'],
    story: "Built for a programmer who called traditional watches \"criminally inefficient in their data representation.\" Three columns of LEDs show hours, minutes, and seconds in binary. The creator insists it is perfectly readable. He wears a normal watch on his other wrist. When asked about this he said \"that one is for talking to humans.\" He does not talk to many humans.",
    specs: ['LIVE', '6-BIT PRECISION', 'HUMAN-INCOMPATIBLE'],
    movement: '6-bit ripple counter',
    draw(c, t) {
      const bg = c.createLinearGradient(0, 0, 0, 200);
      bg.addColorStop(0, '#17181b'); bg.addColorStop(1, '#0a0b0d');
      c.fillStyle = bg; c.fillRect(0, 0, 200, 200);
      txt(c, '0b101010', 100, 16, { size: 7, font: FONT.mono, color: '#4b8bd6', spacing: 2 });
      const cols = [[60, 'HR', '#ff5a3c', t.h], [100, 'MIN', '#5cff7a', t.m], [140, 'SEC', '#4aa8ff', t.s]];
      cols.forEach(([x, l]) => txt(c, l, x, 32, { size: 7, font: FONT.mono, color: '#6a6a6a', spacing: 1 }));
      const w = [32, 16, 8, 4, 2, 1];
      for (let row = 0; row < 6; row++) {
        const y = 50 + row * 22;
        txt(c, String(w[row]), 24, y, { size: 7, font: FONT.mono, color: '#454545' });
        for (const [x, , col, val] of cols) {
          disc(c, x, y, 9, '#060606'); ring(c, x, y, 9, '#2a2a2a', 1);
          if ((val >> (5 - row)) & 1) {
            c.save(); c.shadowColor = col; c.shadowBlur = 12 * c._k;
            const g = c.createRadialGradient(x - 2, y - 2, 0.5, x, y, 7);
            g.addColorStop(0, '#ffffff'); g.addColorStop(0.35, col); g.addColorStop(1, col);
            c.fillStyle = g; c.beginPath(); c.arc(x, y, 6.5, 0, TAU); c.fill();
            c.restore();
          } else {
            disc(c, x, y, 6.5, '#1b1e1b'); disc(c, x - 2, y - 2, 1.6, 'rgba(255,255,255,0.06)');
          }
        }
      }
      txt(c, 'HUMAN-INCOMPATIBLE', 100, 186, { size: 5, font: FONT.mono, color: '#3d3d3d', spacing: 1.5 });
    },
  },
  {
    id: 'drunk', name: 'The Drunk', model: 'ABV-40%', tagline: "It's 5 O'Clock Somewhere",
    animated: true,
    story: "Every numeral has slid to the wrong position, as if the watch had a few too many martinis. The 3 is where the 7 should be. The 11 is lying on its side. The 9 appears to be napping near the 4. The hands do point at the correct time, they just can't stand still while doing it. There is a wine ring on the dial. Comes with a complimentary aspirin.",
    specs: ['LIVE (WOBBLY)', 'PROOF: 40%', 'ASPIRIN INCLUDED'],
    movement: 'Tipsy-balance automatic',
    draw(c, t) {
      radialFill(c, [[0, '#fdf5da'], [1, '#e8d6a2']]);
      for (let i = 0; i < 12; i++) tick(c, i * 30, 84, 92, '#b9a37a', 1.4);
      c.save(); c.strokeStyle = 'rgba(120,30,50,0.28)'; c.lineWidth = 3;
      c.beginPath(); c.ellipse(138, 128, 20, 18, 0.3, 0.2, Math.PI * 1.85); c.stroke(); c.restore();
      DRUNK_POS.forEach(([x, y, rot], i) => txt(c, String(i + 1), x, y, { size: 16, weight: 700, color: '#7a5a2a', rot }));
      txt(c, 'ABV 40%', 100, 62, { size: 5.5, font: FONT.mono, color: '#a08a60', spacing: 1.5 });
      if (Math.floor(t.now / 2600) % 3 === 0) txt(c, 'hic!', 158, 34, { size: 8, font: FONT.type, color: '#a0522d', rot: -15 });
      const wob = Math.sin(t.now / 300) * 3 + Math.sin(t.now / 170) * 1.5;
      hand(c, t.hA + wob, 42, 5, '#5a4020');
      hand(c, t.mA - wob * 1.3, 62, 3.2, '#5a4020');
      hand(c, t.sSmooth + wob * 2, 70, 1, '#c41e1e', { shape: 'line', tail: 16 });
      pin(c, 4, '#5a4020');
    },
  },
  {
    id: 'sundial', name: 'The Sundial Deluxe', model: 'SUN-BC', tagline: 'Works 50% Of The Day',
    static: true, gnomon: true, noCrystal: true, pinion: false, metals: ['bronze', 'gold', 'steel', 'bronze'],
    story: "A luxury sundial crammed into wristwatch form, with a genuine brass gnomon standing proud of the dial. There is no crystal, because glass would get in the way of the sun. It is calibrated for Greenwich, England, and only Greenwich, England. In this drawer, the desk lamp casts a perfectly accurate shadow for a time that does not exist. The engraving on the back reads: \"Not for indoor use, nighttime, clouds, winter, tunnels, or left-handed people.\"",
    specs: ['STATIC', 'SUN-DEPENDENT', 'GREENWICH ONLY'],
    movement: 'Solar (literally)',
    draw(c) {
      radialFill(c, [[0, '#ecdcb4'], [1, '#b69860']]);
      ring(c, 100, 100, 92, '#5a4520', 1); ring(c, 100, 100, 88, '#5a4520', 0.6);
      ring(c, 100, 100, 62, '#5a4520', 0.6); ring(c, 100, 100, 22, '#5a4520', 0.6);
      for (let i = 0; i < 24; i++) tick(c, i * 15, 22, 88, 'rgba(70,52,20,0.55)', i % 2 ? 0.4 : 0.9);
      ['XII', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI']
        .forEach((s, i) => txtAt(c, s, i * 30, 76, { size: 11, weight: 700, color: '#3e2e10' }));
      txt(c, 'LUX ET UMBRA', 100, 128, { size: 6, style: 'italic', color: '#4a3818', spacing: 1.5 });
      c.fillStyle = 'rgba(60,40,10,0.12)'; c.beginPath(); c.roundRect(68, 143, 64, 15, 3); c.fill();
      txt(c, '⚠ NO SIGNAL', 100, 150.5, { size: 6.5, font: FONT.mono, color: '#7a3a18', spacing: 1 });
      txt(c, 'GREENWICH ONLY', 100, 168, { size: 4.5, font: FONT.mono, color: '#5a4520', spacing: 1.5 });
    },
  },
  {
    id: 'optimist', name: 'The Optimist', model: 'TGIF-∞', tagline: 'Permanently Happy Hour',
    animated: true, metals: ['gold', 'gold', 'rose', 'steel'],
    story: "Both hands have been carefully, lovingly, permanently welded at 5:00 PM. You can see the weld beads. The second hand still works but only swings between the 11 and the 1, like a tiny golden metronome of denial. Owners report increased happiness, mild delusion, and a complete inability to make morning meetings. Side effects include smiling at strangers and buying rounds for no reason.",
    specs: ['SEMI-LIVE', 'WELDED AT 5PM', 'JOY: MANDATORY'],
    movement: 'Welded, with denial-wound seconds',
    draw(c, t) {
      radialFill(c, [[0, '#fff6d6'], [0.7, '#f5d77a'], [1, '#d6a536']]);
      for (let i = 0; i < 72; i++) {
        c.save(); c.translate(100, 100); c.rotate(i * 5 * D2R);
        c.fillStyle = i % 2 ? 'rgba(255,255,255,0.12)' : 'rgba(160,110,10,0.06)';
        c.beginPath(); c.moveTo(0, 0); c.lineTo(-4, -110); c.lineTo(4, -110); c.closePath(); c.fill();
        c.restore();
      }
      for (let i = 0; i < 60; i++) tick(c, i * 6, i % 5 ? 88 : 83, 92, '#9a6a00', i % 5 ? 0.5 : 1.6);
      for (let n = 1; n <= 12; n++) {
        const five = n === 5;
        txtAt(c, String(n), n * 30, 71, { size: five ? 20 : 13, weight: five ? 900 : 400, color: five ? '#9a6200' : '#8a6a2a' });
      }
      const [mx, my] = polar(50, 150);
      c.save(); c.translate(mx, my); c.strokeStyle = '#9a6200'; c.lineWidth = 1; c.beginPath();
      c.moveTo(-5, -5); c.lineTo(5, -5); c.lineTo(0, 1); c.closePath(); c.moveTo(0, 1); c.lineTo(0, 7);
      c.moveTo(-3, 7); c.lineTo(3, 7); c.stroke(); disc(c, 1.5, -3.5, 1.3, '#5a7a20'); c.restore();
      txt(c, 'HAPPY HOUR', 100, 62, { size: 7, font: FONT.type, color: '#9a6200', spacing: 2 });
      txt(c, 'TGIF-∞', 100, 140, { size: 5, font: FONT.mono, color: '#8a6a2a', spacing: 2 });
      hand(c, 150, 44, 7, '#a8780a', { shape: 'leaf' });
      hand(c, 0, 64, 4.5, '#a8780a', { shape: 'leaf' });
      const wr = mulberry32(17);
      const weld = (cx, cy, n) => { for (let k = 0; k < n; k++) disc(c, cx + (wr() - 0.5) * 8, cy + (wr() - 0.5) * 8, 1.2 + wr() * 1.8, `rgba(${110 + wr() * 40},${110 + wr() * 40},${110 + wr() * 40},0.9)`); };
      const [wx, wy] = polar(44, 150);
      weld(wx, wy, 6);
      hand(c, 30 * Math.sin(t.now / 450), 70, 1, '#c0392b', { shape: 'line', tail: 16 });
      weld(100, 100, 8);
      pin(c, 4, '#a8780a', '#ffd700');
    },
  },
  {
    id: 'tentacle', name: 'Tentacle Chronograph', model: 'KRAKEN-8', tagline: 'From The Depths Of Time',
    animated: true, chrono: true, pinion: false, metals: ['bronze', 'bronze', 'titanium', 'steel'],
    story: "Recovered from a sunken ship in 1887, still ticking. Three of the eight tentacles serve as hour, minute, and seconds hands. The other five \"seem to be reaching for something.\" Marine biologists confirm the tentacles move independently. Horologists confirm this is mechanically impossible. Both parties have agreed to stop discussing it. The chronograph pushers have never been pressed. Nobody wants to find out what they start.",
    specs: ['LIVE', 'DEPTH RATING: ∞', 'TENTACLES: AUTONOMOUS'],
    movement: 'Hand-wound by tentacles (not ours)',
    draw(c, t) {
      radialFill(c, [[0, '#145450'], [0.6, '#0b2e2e'], [1, '#041314']], 100, 60);
      c.save(); c.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 5; i++) {
        const x0 = 40 + i * 30 + Math.sin(t.now / 3000 + i) * 6;
        const g = c.createLinearGradient(0, 0, 0, 200);
        g.addColorStop(0, 'rgba(140,230,210,0.10)'); g.addColorStop(1, 'rgba(140,230,210,0)');
        c.fillStyle = g; c.beginPath();
        c.moveTo(x0 - 4, 0); c.lineTo(x0 + 6, 0); c.lineTo(x0 + 30, 200); c.lineTo(x0 + 10, 200); c.closePath(); c.fill();
      }
      c.restore();
      for (let i = 0; i < 12; i++) {
        const [x, y] = polar(82, i * 30), r = i % 3 === 0 ? 5 : 3.2;
        ring(c, x, y, r, 'rgba(170,240,225,0.6)', 1.1);
        disc(c, x - r * 0.35, y - r * 0.35, r * 0.28, 'rgba(220,255,250,0.6)');
      }
      for (let i = 0; i < 7; i++) {
        const p = (t.now / 4000 + i / 7) % 1;
        ring(c, 30 + i * 23 + Math.sin(p * 12 + i) * 3, 190 - p * 180, 1.2 + (i % 3) * 0.6, `rgba(190,250,240,${0.5 * (1 - p)})`, 0.7);
      }
      const ph = t.now / 700;
      [[130, 24], [165, 28], [200, 30], [235, 28], [270, 24]]
        .forEach(([a, l], i) => tentacle(c, a, l, 4.2, ph + i * 1.3, 5, '#b9472f', '#f2b39a'));
      tentacle(c, t.hA, 44, 6.5, ph * 0.8, 4, '#d75a3a', '#ffc9a8');
      tentacle(c, t.mA, 64, 5, ph * 1.1 + 2, 5, '#e2683f', '#ffd2b4');
      tentacle(c, t.sSmooth, 76, 3.4, ph * 1.6 + 4, 6, '#f07a4a', '#ffd9c0');
      shadowed(c, () => {
        const g = c.createRadialGradient(94, 84, 3, 100, 92, 24);
        g.addColorStop(0, '#f08a63'); g.addColorStop(1, '#a83a24');
        c.fillStyle = g; c.beginPath(); c.ellipse(100, 90, 17, 21, 0, 0, TAU); c.fill();
      });
      [[94, 80, 1.6], [106, 76, 1.2], [101, 84, 1]].forEach(([x, y, r]) => disc(c, x, y, r, 'rgba(120,30,15,0.5)'));
      for (const sx of [-1, 1]) {
        disc(c, 100 + sx * 7, 98, 4.4, '#f6e6c8');
        c.fillStyle = '#120804'; c.fillRect(100 + sx * 7 - 3, 97, 6, 2);
      }
    },
  },
  {
    id: 'gaslighter', name: 'The Gaslighter', model: 'TRUST-ME', tagline: "You're Remembering It Wrong",
    animated: true,
    story: "Donated by a man who swore it had always been in his family. (It had not.) Every few seconds the hands calmly glide to a completely different time, and the dial insists in small polite capitals that it has always been this time. Curators who disagree find their notes have been quietly edited. The second hand is perfectly accurate, which is somehow the most upsetting part.",
    specs: ['LIVE (DISPUTED)', 'MEMORY: EDITED', "YOU'RE OVERREACTING"],
    movement: 'Plausibly deniable quartz',
    draw(c, t) {
      radialFill(c, [[0, '#26375e'], [1, '#0b1124']], 100, 80);
      for (let i = 0; i < 90; i++) {
        c.save(); c.translate(100, 100); c.rotate(i * 4 * D2R);
        c.fillStyle = i % 2 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)';
        c.beginPath(); c.moveTo(0, 0); c.lineTo(-3.6, -110); c.lineTo(3.6, -110); c.closePath(); c.fill();
        c.restore();
      }
      for (let i = 0; i < 12; i++) {
        c.save(); c.translate(100, 100); c.rotate(i * 30 * D2R);
        shadowed(c, () => {
          const g = c.createLinearGradient(-2.5, 0, 2.5, 0);
          g.addColorStop(0, '#9fa3ad'); g.addColorStop(0.5, '#f6f7fa'); g.addColorStop(1, '#8a8e98');
          c.fillStyle = g;
          if (i === 0) { c.fillRect(-6, -90, 4, 17); c.fillRect(2, -90, 4, 17); } else c.fillRect(-2, -90, 4, 15);
        }, 0.6);
        c.restore();
      }
      txt(c, 'TRUST ME', 100, 60, { size: 10, color: '#dde1ea', spacing: 3 });
      txt(c, 'GASLIGHT CHRONOMETER', 100, 70, { size: 4.5, font: FONT.mono, color: '#8a93ad', spacing: 1 });
      txt(c, 'IT HAS ALWAYS BEEN THIS TIME', 100, 142, { size: 4.6, font: FONT.mono, color: '#b0b8cc', spacing: 0.8 });
      const P = 5000, k = Math.floor(t.now / P), f = Math.min(1, (t.now % P) / 700), e = 1 - Math.pow(1 - f, 3);
      const tgt = (i) => { const r = mulberry32(i * 31 + 5); return [r() * 360, r() * 360]; };
      const [h0, m0] = tgt(k - 1), [h1, m1] = tgt(k);
      hand(c, h0 + (h1 - h0) * e, 44, 6, '#e8eaf0');
      hand(c, m0 + (m1 - m0) * e, 64, 4, '#e8eaf0');
      hand(c, t.sA, 72, 1, '#e0603c', { shape: 'line', tail: 18 });
      pin(c, 4, '#c8ccd6', '#e0603c');
    },
  },
  {
    id: 'snooze', name: 'The Snooze Button', model: 'ZZZ-5', tagline: 'Five More Minutes, Forever',
    animated: true,
    story: "Designed by a sleep-deprived engineer who wanted a watch that understood him. Every numeral reads 5, because every time is \"five more minutes.\" The hands run exactly five minutes slow, so the wearer arrives late with a perfectly clear conscience. The crescent moon on the dial has not woken up since 1994. The little Z's are real. Please do not disturb them.",
    specs: ['LIVE (−5 MIN)', 'ALL NUMBERS: 5', 'ALARM: DISABLED'],
    movement: 'Snooze-regulated, five minutes behind forever',
    draw(c, t) {
      const g = c.createLinearGradient(0, 0, 0, 200);
      g.addColorStop(0, '#19214c'); g.addColorStop(1, '#3a3f7a');
      c.fillStyle = g; c.fillRect(0, 0, 200, 200);
      const r = mulberry32(55);
      for (let i = 0; i < 40; i++) {
        const x = r() * 200, y = r() * 200, rad = 0.4 + r() * 0.9;
        disc(c, x, y, rad, `rgba(255,250,220,${0.5 * (0.4 + 0.6 * Math.abs(Math.sin(t.now / 900 + i)))})`);
      }
      c.save();
      c.beginPath(); c.rect(0, 0, 200, 200); c.moveTo(121, 56); c.arc(108, 56, 13, 0, TAU); c.clip('evenodd');
      shadowed(c, () => disc(c, 100, 62, 15, '#f5e6b8'));
      c.restore();
      for (let i = 0; i < 12; i++) txtAt(c, '5', i * 30 || 360, 76, { size: 14, color: '#f5e6b8' });
      txt(c, '5 MORE MINUTES', 100, 138, { size: 6, font: FONT.type, color: '#cfc4a0', spacing: 1.5 });
      txt(c, 'ZZZ-5', 100, 150, { size: 5, font: FONT.mono, color: '#8d8fb8', spacing: 2 });
      for (let i = 0; i < 3; i++) {
        const p = (t.now / 2500 + i / 3) % 1;
        txt(c, 'z', 116 + p * 30 + Math.sin(p * 6) * 3, 52 - p * 34, { size: 6 + p * 8, font: FONT.type, color: '#f5e6b8', alpha: Math.sin(p * Math.PI) });
      }
      hand(c, t.hA - 2.5, 42, 6, '#f5e6b8', { shape: 'leaf' });
      hand(c, t.mA - 30, 64, 4, '#f5e6b8', { shape: 'leaf' });
      hand(c, t.sA, 70, 1, '#e48a7a', { shape: 'line', tail: 14 });
      pin(c, 4, '#f5e6b8', '#e48a7a');
    },
  },
  {
    id: 'pi', name: 'The Irrational', model: 'π-3.14159', tagline: 'Never Quite Gets There',
    story: "Commissioned by a mathematics department that could not agree on a rounding policy. The hour markers are the first twelve digits of π, written in chalk. The second hand advances by an irrational angle every tick, so it never lands in the same place twice. The hours and minutes are accurate, which the department calls \"a rational compromise.\" The chalk has never been wiped.",
    specs: ['LIVE (IRRATIONAL)', 'NEVER REPEATS', 'CHALK-BASED'],
    movement: 'Irrational escapement, 3.14159… beats',
    draw(c, t) {
      radialFill(c, [[0, '#365b46'], [1, '#1c3326']]);
      const r = mulberry32(314);
      for (let i = 0; i < 50; i++) {
        c.fillStyle = `rgba(255,255,255,${0.02 + r() * 0.03})`;
        c.beginPath(); c.ellipse(r() * 200, r() * 200, 10 + r() * 30, 3 + r() * 8, r() * 3, 0, TAU); c.fill();
      }
      ring(c, 100, 100, 88, 'rgba(240,244,236,0.5)', 1.2);
      [3, 1, 4, 1, 5, 9, 2, 6, 5, 3, 5, 8].forEach((d, i) =>
        txtAt(c, String(d), i * 30 || 360, 72, { size: 18, font: FONT.type, color: 'rgba(242,245,238,0.92)' }));
      txt(c, 'e^iπ + 1 = 0', 100, 58, { size: 7, font: FONT.type, color: 'rgba(242,245,238,0.7)' });
      txt(c, 'π ≈ 3.14159265358979…', 100, 140, { size: 5.5, font: FONT.type, color: 'rgba(242,245,238,0.6)' });
      txt(c, 'NEVER QUITE GETS THERE', 100, 151, { size: 4.5, font: FONT.mono, color: 'rgba(242,245,238,0.45)', spacing: 1 });
      hand(c, t.hA, 42, 3.4, 'rgba(245,245,238,0.95)', { shape: 'line', tail: 8 });
      hand(c, t.mA, 62, 2.4, 'rgba(245,245,238,0.95)', { shape: 'line', tail: 8 });
      hand(c, (Math.floor(t.now / 1000) * 2 * Math.PI) % 360, 70, 1, '#f0d060', { shape: 'line', tail: 14 });
      pin(c, 3.5, '#e8e8e0');
    },
  },
  {
    id: 'mood', name: 'Mood Ring Chronometer', model: 'FEEL-70s', tagline: 'It Knows How You Feel (Badly)',
    animated: true, glow: 0.12,
    story: "A 1970s mood ring saw a wristwatch across a crowded disco and simply decided. The liquid-crystal dial drifts through every colour of the human condition and announces your current feelings in block capitals, whether you agree or not. It has been wrong about every single person it has ever met, but always with total confidence.",
    specs: ['LIVE', 'FEELINGS: ASSIGNED', 'ACCURACY: 0%'],
    movement: 'Thermochromic liquid crystal over quartz',
    draw(c, t) {
      const h = (t.now / 90) % 360;
      const g = c.createRadialGradient(80, 80, 5, 100, 100, 110);
      g.addColorStop(0, `hsl(${h},85%,62%)`);
      g.addColorStop(0.55, `hsl(${(h + 50) % 360},75%,40%)`);
      g.addColorStop(1, `hsl(${(h + 110) % 360},70%,18%)`);
      c.fillStyle = g; c.fillRect(0, 0, 200, 200);
      for (let i = 0; i < 4; i++) {
        const a = t.now / 2600 + i * 1.7, x = 100 + Math.cos(a) * 40, y = 100 + Math.sin(a * 1.3) * 40;
        const bg = c.createRadialGradient(x, y, 0, x, y, 50);
        bg.addColorStop(0, `hsla(${(h + i * 70) % 360},90%,60%,0.45)`);
        bg.addColorStop(1, `hsla(${(h + i * 70) % 360},90%,60%,0)`);
        c.fillStyle = bg; c.fillRect(0, 0, 200, 200);
      }
      for (let i = 0; i < 12; i++) {
        c.save(); c.translate(100, 100); c.rotate(i * 30 * D2R);
        shadowed(c, () => { c.fillStyle = '#f2f2f5'; c.fillRect(-1.8, -90, 3.6, i % 3 ? 12 : 18); }, 0.6);
        c.restore();
      }
      txt(c, 'FEEL-70s', 100, 60, { size: 6, font: FONT.mono, color: 'rgba(255,255,255,0.75)', spacing: 2 });
      txt(c, 'YOU ARE FEELING', 100, 124, { size: 4.5, font: FONT.mono, color: 'rgba(255,255,255,0.7)', spacing: 1 });
      txt(c, MOODS[Math.floor(t.now / 6000) % MOODS.length], 100, 134, { size: 9, font: FONT.type, color: '#fff', spacing: 2 });
      hand(c, t.hA, 44, 5.5, '#ececf0');
      hand(c, t.mA, 64, 3.8, '#ececf0');
      hand(c, t.sSmooth, 72, 1, '#1a1a1a', { shape: 'line', tail: 16 });
      pin(c, 4, '#ececf0', '#1a1a1a');
    },
  },
  {
    id: 'pendulum', name: 'The Grandfather Paradox', model: 'GF-1789', tagline: 'Correct, On Average',
    animated: true, metals: ['gold', 'bronze', 'rose', 'steel'],
    story: "An apprentice clockmaker was ordered to shrink his master's grandfather clock into a wristwatch, and flatly refused to leave out the pendulums. So he hung one from each hand. Both hands now swing a full 45° either side of the real time: the hour hand drifts lazily across three hours, while the minute hand ticks back and forth across fifteen minutes at twice the pace. The watch is therefore perfectly accurate, on average. There is no second hand; the apprentice felt the pendulums were already doing enough. The moon phase in the arch is the only thing on the dial that is ever exactly right.",
    specs: ['LIVE (ON AVERAGE)', '±1½ HOURS', 'MOON PHASE: ACTUALLY ACCURATE'],
    movement: 'Twin free-swinging pendulums, gravity sold separately',
    draw(c, t) {
      radialFill(c, [[0, '#fbf5e4'], [0.8, '#eee2c4'], [1, '#d6c49c']], 90, 80);
      ring(c, 100, 100, 93, '#b08d48', 1.2);
      ring(c, 100, 100, 86, '#b08d48', 0.6);
      ring(c, 100, 100, 62, '#b08d48', 0.6);
      for (let i = 0; i < 60; i++) tick(c, i * 6, 86, 93, '#3a2a14', i % 5 ? 0.5 : 1.4);
      ['XII', 'I', 'II', 'III', 'IIII', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI']
        .forEach((s, i) => txtAt(c, s, i * 30, 74, { size: 11.5, weight: 700, color: '#2a1d0e', rot: i * 30 }));

      // Painted moon-phase arch
      const ax = 100, ay = 68, R = 22;
      c.save();
      c.beginPath(); c.arc(ax, ay, R, Math.PI, 0); c.closePath(); c.clip();
      const sky = c.createLinearGradient(0, ay - R, 0, ay);
      sky.addColorStop(0, '#16244f'); sky.addColorStop(1, '#2f4a8a');
      c.fillStyle = sky; c.fillRect(ax - R, ay - R, 2 * R, R);
      const sr = mulberry32(1789);
      for (let i = 0; i < 14; i++) disc(c, ax - R + sr() * 2 * R, ay - R + sr() * R, 0.4 + sr() * 0.6, 'rgba(255,245,210,0.8)');
      moon(c, ax, ay - 10, 8.5, moonPhase(t.now));
      c.restore();
      c.beginPath(); c.arc(ax, ay, R, Math.PI, 0); c.lineTo(ax - R, ay);
      c.strokeStyle = '#b08d48'; c.lineWidth = 1.2; c.stroke();

      txt(c, 'Pendulum & Sons', 100, 127, { size: 8, style: 'italic', color: '#4a3518' });
      txt(c, 'LONDON · 1789', 100, 137, { size: 4.6, color: '#6a5232', spacing: 2 });

      // Each hand swings ±45° around its true angle; hour every 3s, minute every 1.5s.
      const hourSwing = t.hA + 45 * Math.sin((t.now / 6000) * TAU);
      const minuteSwing = t.mA + 45 * Math.sin((t.now / 3000) * TAU + 1.3);
      pendulum(c, hourSwing, 40, 6.5);
      pendulum(c, minuteSwing, 60, 8);
      pin(c, 4, '#8a6420', '#e8c770');
    },
  },
  {
    id: 'ransom', name: 'The Ransom Note', model: 'RNSM-12', tagline: 'Your Numbers Are Safe. For Now.',
    perWatch: true,
    story: "One Monday the watchmaker arrived to find every numeral missing from his workbench, and a note made of magazine clippings: \"WE HAVE THE NUMBERS.\" They were returned a week later, glued back wherever the kidnappers felt like it, each one cut from a different publication. Every one of these watches came back differently, so no two are alike. The hands have since learned to stretch and point straight at whichever numeral they need: the short black hand finds the hour, the long red hand finds the five-minute mark. Nobody ever paid the ransom. Nobody is sure what was demanded.",
    specs: ['LIVE (IF YOU CAN FIND IT)', 'NO TWO ALIKE', 'NUMERALS: RETURNED, MOSTLY'],
    movement: 'Telescoping hands, hostage-grade quartz',
    draw(c, t, seed) {
      radialFill(c, [[0, '#ece7da'], [1, '#cfc8b6']], 90, 80);
      const nr = mulberry32(seed * 31 + 3);
      c.fillStyle = 'rgba(40,35,30,0.13)';
      for (let y = 22; y < 182; y += 5) {
        for (const x0 of [18, 104]) {
          if (nr() < 0.12) continue;
          c.fillRect(x0, y, 40 + nr() * 38, 1.6);
        }
      }
      c.fillStyle = 'rgba(40,35,30,0.35)';
      c.fillRect(18, 12, 164, 4);
      txt(c, 'TIME HELD HOSTAGE', 100, 190, { size: 5, font: FONT.mono, color: 'rgba(60,50,40,0.6)', spacing: 1.5 });

      const nums = ransomLayout(seed);
      for (const p of nums) {
        c.save();
        c.translate(p.x, p.y);
        c.rotate(p.rot * D2R);
        c.font = p.font(p.size);
        const w = c.measureText(String(p.n)).width + 7, h = p.size * 0.95;
        shadowed(c, () => {
          c.fillStyle = p.paper[0];
          c.beginPath();
          c.moveTo(-w / 2, -h / 2 + p.skew * 0.2); c.lineTo(w / 2, -h / 2);
          c.lineTo(w / 2 + 1, h / 2 - p.skew * 0.2); c.lineTo(-w / 2 - 1, h / 2);
          c.closePath(); c.fill();
        }, 0.6);
        c.fillStyle = p.paper[1];
        c.textAlign = 'center'; c.textBaseline = 'middle';
        c.fillText(String(p.n), 0, p.size * 0.04);
        c.restore();
      }

      const at = (n) => nums[(n + 11) % 12];
      const h12 = t.h % 12 || 12;
      aimHand(c, at(h12), at(h12 % 12 + 1), (t.m + t.s / 60) / 60, 5.5, '#141414');
      const m5 = Math.floor(t.m / 5) || 12;
      aimHand(c, at(m5), at(m5 % 12 + 1), ((t.m % 5) + t.s / 60) / 5, 3.4, '#c41e1e');
      pin(c, 4.5, '#141414', '#c41e1e');
    },
  },
];

function vignette(c, shape) {
  const g = shape === 'rect'
    ? c.createRadialGradient(100, 100, 95, 100, 100, 150)
    : c.createRadialGradient(100, 100, 74, 100, 100, 101);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, shape === 'rect' ? 'rgba(0,0,0,0.35)' : 'rgba(0,0,0,0.32)');
  c.fillStyle = g; c.fillRect(0, 0, 200, 200);
}

export class FaceTexture {
  // seed only matters for faces marked perWatch, which lay themselves out differently per exhibit.
  constructor(face, size, anisotropy = 8, seed = 0) {
    this.face = face;
    this.size = size;
    this.seed = seed;
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.canvas.height = size;
    this.ctx = this.canvas.getContext('2d');
    this.ctx._k = size / 200;
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.texture.anisotropy = anisotropy;
    this.lastSec = -1;
    this.lastDraw = -Infinity;
    this.drawn = false;
  }

  // Animated faces redraw at ~30fps; ticking faces once per second; static faces once.
  update(now, force = false) {
    const f = this.face, sec = Math.floor(now / 1000);
    if (!force) {
      if (f.static && this.drawn) return;
      if (f.animated) { if (now - this.lastDraw < 33) return; }
      else if (sec === this.lastSec) return;
    }
    this.lastSec = sec; this.lastDraw = now; this.drawn = true;
    const c = this.ctx, k = this.size / 200;
    c.setTransform(k, 0, 0, k, 0, 0);
    c.clearRect(0, 0, 200, 200);
    c.save(); f.draw(c, timeInfo(now), this.seed); c.restore();
    vignette(c, f.shape);
    this.texture.needsUpdate = true;
  }

  dispose() { this.texture.dispose(); }
}
