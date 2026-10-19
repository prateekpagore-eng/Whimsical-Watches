import * as THREE from 'three';

let ANISO = 8;
export function setAnisotropy(a) { ANISO = a; }

export function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const cache = new Map();
function once(key, fn) {
  if (!cache.has(key)) cache.set(key, fn());
  return cache.get(key);
}

export function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

// Upscaling a tiny random canvas with smoothing gives cheap value noise.
function noise(ctx, w, h, nx, ny, alpha, rnd, mode = 'source-over') {
  const s = makeCanvas(nx, ny), sc = s.getContext('2d');
  const img = sc.createImageData(nx, ny);
  for (let i = 0; i < nx * ny; i++) {
    const v = (rnd() * 255) | 0;
    img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v;
    img.data[i * 4 + 3] = 255;
  }
  sc.putImageData(img, 0, 0);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.globalCompositeOperation = mode;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(s, 0, 0, w, h);
  ctx.restore();
}

function speckle(ctx, w, h, amount, rnd) {
  const img = ctx.getImageData(0, 0, w, h), d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (rnd() - 0.5) * amount;
    d[i] += n; d[i + 1] += n; d[i + 2] += n;
  }
  ctx.putImageData(img, 0, 0);
}

function toTexture(canvas, { color = true, repeat = null, rotate = false } = {}) {
  const t = new THREE.CanvasTexture(canvas);
  if (color) t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeat[0], repeat[1]);
  }
  if (rotate) { t.center.set(0.5, 0.5); t.rotation = Math.PI / 2; }
  t.anisotropy = ANISO;
  return t;
}

/* ── Wood ── */
function woodCanvas() {
  return once('woodCanvas', () => {
    const w = 1024, h = 256, c = makeCanvas(w, h), x = c.getContext('2d'), r = mulberry32(11);
    x.fillStyle = '#4b2b18'; x.fillRect(0, 0, w, h);
    noise(x, w, h, 3, 40, 0.65, r, 'overlay');
    noise(x, w, h, 8, 120, 0.45, r, 'overlay');
    noise(x, w, h, 2, 6, 0.4, r, 'soft-light');
    for (let i = 0; i < 90; i++) {
      const y0 = r() * h, amp = 2 + r() * 7, f = 0.002 + r() * 0.006, ph = r() * 6;
      x.beginPath();
      for (let px = 0; px <= w; px += 8) {
        const y = y0 + Math.sin(px * f + ph) * amp + Math.sin(px * f * 3.1 + ph) * amp * 0.25;
        if (px) x.lineTo(px, y); else x.moveTo(px, y);
      }
      x.strokeStyle = r() < 0.6 ? `rgba(25,10,3,${0.12 + r() * 0.2})` : `rgba(140,85,45,${0.08 + r() * 0.14})`;
      x.lineWidth = 0.6 + r() * 1.8;
      x.stroke();
    }
    speckle(x, w, h, 12, r);
    return c;
  });
}
export const wood = (rotate = false, repeat = null) =>
  once(`wood:${rotate}:${repeat}`, () => toTexture(woodCanvas(), { rotate, repeat }));

/* ── Velvet ── */
export const velvet = (rep) => once(`velvet:${rep}`, () => {
  const s = 256, c = makeCanvas(s, s), x = c.getContext('2d'), r = mulberry32(3);
  x.fillStyle = '#dadada'; x.fillRect(0, 0, s, s);
  noise(x, s, s, 16, 16, 0.25, r, 'overlay');
  noise(x, s, s, 64, 64, 0.2, r, 'overlay');
  speckle(x, s, s, 40, r);
  return toTexture(c, { repeat: [rep, rep] });
});

/* ── Brushed metal (roughness) ── */
export const brushed = () => once('brushed', () => {
  const s = 512, c = makeCanvas(s, s), x = c.getContext('2d'), r = mulberry32(5);
  x.fillStyle = '#c8c8c8'; x.fillRect(0, 0, s, s);
  for (let i = 0; i < 2600; i++) {
    const y = r() * s, len = 40 + r() * 400, x0 = r() * s, g = (130 + r() * 125) | 0;
    x.strokeStyle = `rgba(${g},${g},${g},${0.15 + r() * 0.3})`;
    x.lineWidth = 0.5 + r() * 1.2;
    x.beginPath(); x.moveTo(x0, y); x.lineTo(x0 + len, y); x.stroke();
  }
  return toTexture(c, { color: false, repeat: [2, 1] });
});

/* ── Leather ── */
function grainCanvas() {
  return once('grainCanvas', () => {
    const s = 256, c = makeCanvas(s, s), x = c.getContext('2d'), r = mulberry32(21);
    x.fillStyle = '#808080'; x.fillRect(0, 0, s, s);
    for (let i = 0; i < 1800; i++) {
      const px = r() * s, py = r() * s, rad = 1.5 + r() * 3.5;
      const g = x.createRadialGradient(px - rad * 0.3, py - rad * 0.3, 0, px, py, rad);
      g.addColorStop(0, 'rgba(200,200,200,0.55)');
      g.addColorStop(1, 'rgba(40,40,40,0)');
      x.fillStyle = g;
      x.beginPath(); x.arc(px, py, rad, 0, Math.PI * 2); x.fill();
    }
    noise(x, s, s, 32, 32, 0.25, r, 'overlay');
    speckle(x, s, s, 30, r);
    return c;
  });
}
export const leatherBump = () => once('leatherBump', () => toTexture(grainCanvas(), { color: false, repeat: [1, 4] }));

export const leather = (color, thread) => once(`leather:${color}:${thread}`, () => {
  const w = 256, h = 1024, c = makeCanvas(w, h), x = c.getContext('2d'), r = mulberry32(99);
  x.fillStyle = color; x.fillRect(0, 0, w, h);
  const grain = grainCanvas();
  x.save(); x.globalCompositeOperation = 'overlay'; x.globalAlpha = 0.55;
  for (let y = 0; y < h; y += 256) x.drawImage(grain, 0, y, 256, 256);
  x.restore();
  noise(x, w, h, 3, 14, 0.2, r, 'overlay');
  const edge = (x0, dir) => {
    const g = x.createLinearGradient(x0, 0, x0 + dir * 24, 0);
    g.addColorStop(0, 'rgba(0,0,0,0.7)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g; x.fillRect(Math.min(x0, x0 + dir * 24), 0, 24, h);
  };
  edge(0, 1); edge(w, -1);
  x.lineCap = 'round';
  for (const sx of [30, w - 30]) {
    for (let y = 26; y < h - 10; y += 21) {
      x.strokeStyle = 'rgba(0,0,0,0.4)'; x.lineWidth = 4.5;
      x.beginPath(); x.moveTo(sx + 1.5, y + 1.5); x.lineTo(sx + 1.5, y + 13.5); x.stroke();
      x.strokeStyle = thread; x.lineWidth = 3.2;
      x.beginPath(); x.moveTo(sx, y); x.lineTo(sx, y + 12); x.stroke();
    }
  }
  return toTexture(c);
});

/* ── Rubber ribs ── */
export const ribs = () => once('ribs', () => {
  const w = 32, h = 256, c = makeCanvas(w, h), x = c.getContext('2d');
  for (let y = 0; y < h; y += 16) {
    const g = x.createLinearGradient(0, y, 0, y + 16);
    g.addColorStop(0, '#9a9a9a'); g.addColorStop(0.5, '#d8d8d8');
    g.addColorStop(0.8, '#6a6a6a'); g.addColorStop(1, '#9a9a9a');
    x.fillStyle = g; x.fillRect(0, y, w, 16);
  }
  return toTexture(c, { color: false, repeat: [1, 3] });
});

/* ── Nylon NATO ── */
export const weave = () => once('weave', () => {
  const s = 32, c = makeCanvas(s, s), x = c.getContext('2d');
  x.fillStyle = '#808080'; x.fillRect(0, 0, s, s);
  for (let i = 0; i < s; i += 4) {
    x.fillStyle = 'rgba(255,255,255,0.35)'; x.fillRect(0, i, s, 2);
    x.fillStyle = 'rgba(0,0,0,0.25)'; x.fillRect(i, 0, 1, s);
  }
  return toTexture(c, { color: false, repeat: [10, 40] });
});

export const nato = (key, stripes) => once(`nato:${key}`, () => {
  const w = 128, h = 64, c = makeCanvas(w, h), x = c.getContext('2d');
  const n = stripes.length;
  stripes.forEach((col, i) => {
    x.fillStyle = col;
    x.fillRect(Math.floor((i * w) / n), 0, Math.ceil(w / n) + 1, h);
  });
  for (let y = 0; y < h; y += 2) { x.fillStyle = 'rgba(0,0,0,0.13)'; x.fillRect(0, y, w, 1); }
  for (let xx = 0; xx < w; xx += 3) { x.fillStyle = 'rgba(255,255,255,0.05)'; x.fillRect(xx, 0, 1, h); }
  const g = x.createLinearGradient(0, 0, w, 0);
  g.addColorStop(0, 'rgba(0,0,0,0.45)'); g.addColorStop(0.07, 'rgba(0,0,0,0)');
  g.addColorStop(0.93, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.45)');
  x.fillStyle = g; x.fillRect(0, 0, w, h);
  return toTexture(c, { repeat: [1, 16] });
});

/* ── Milanese mesh ── */
function milaneseCanvas() {
  return once('milaneseCanvas', () => {
    const s = 64, c = makeCanvas(s, s), x = c.getContext('2d');
    x.fillStyle = '#3a3a3a'; x.fillRect(0, 0, s, s);
    for (let y = 0; y < s; y += 8) {
      for (let xx = -8; xx < s + 8; xx += 8) {
        x.save();
        x.translate(xx + ((y / 8) % 2) * 4, y + 4);
        x.rotate(-0.7);
        const g = x.createLinearGradient(0, -2.5, 0, 2.5);
        g.addColorStop(0, '#f2f2f2'); g.addColorStop(1, '#6a6a6a');
        x.fillStyle = g;
        x.beginPath(); x.ellipse(0, 0, 5, 2.2, 0, 0, Math.PI * 2); x.fill();
        x.restore();
      }
    }
    return c;
  });
}
export const milaneseMap = () => once('milaneseMap', () => toTexture(milaneseCanvas(), { repeat: [12, 46] }));
export const milaneseBump = () => once('milaneseBump', () => toTexture(milaneseCanvas(), { color: false, repeat: [12, 46] }));

/* ── Diver bezel insert ── */
export const INSERT_COLORS = {
  black: ['#141416', '#141416', '#ece8dc'],
  blue: ['#122a62', '#122a62', '#ece8dc'],
  pepsi: ['#a3202a', '#14306e', '#ece8dc'],
  green: ['#0f4a2c', '#0f4a2c', '#e8dcb0'],
  rootbeer: ['#6a2a1c', '#1a1412', '#e3c58a'],
};
export const diverInsert = (key) => once(`insert:${key}`, () => {
  const S = 512, c = makeCanvas(S, S), x = c.getContext('2d');
  const [top, bottom, ink] = INSERT_COLORS[key];
  const cx = S / 2, R = S / 2, r0 = R * (1.63 / 1.9), mid = (R + r0) / 2;
  x.fillStyle = top; x.fillRect(0, 0, S, S / 2);
  x.fillStyle = bottom; x.fillRect(0, S / 2, S, S / 2);
  const pt = (r, a) => [cx + Math.sin(a) * r, cx - Math.cos(a) * r];
  x.strokeStyle = ink; x.lineCap = 'butt';
  for (let i = 1; i < 60; i++) {
    const a = (i * 6 * Math.PI) / 180;
    const major = i % 5 === 0;
    if (!major && i > 15) continue;
    x.lineWidth = major ? 5 : 2.5;
    const [x1, y1] = pt(R - 10, a), [x2, y2] = pt(major ? r0 + 14 : R - 22, a);
    if (major && i % 10 === 0) continue;
    x.beginPath(); x.moveTo(x1, y1); x.lineTo(x2, y2); x.stroke();
  }
  x.fillStyle = ink;
  x.font = '600 26px "Share Tech Mono", monospace';
  x.textAlign = 'center'; x.textBaseline = 'middle';
  for (let n = 10; n < 60; n += 10) {
    const a = (n * 6 * Math.PI) / 180, [px, py] = pt(mid, a);
    x.save(); x.translate(px, py); x.rotate(a); x.fillText(String(n), 0, 0); x.restore();
  }
  x.beginPath();
  const [ax, ay] = pt(r0 + 6, 0);
  x.moveTo(ax, ay); x.lineTo(cx - 15, cx - (R - 8)); x.lineTo(cx + 15, cx - (R - 8)); x.closePath();
  x.fill();
  x.fillStyle = '#f4f9ee';
  x.beginPath(); x.arc(cx, cx - (R - 22), 5, 0, Math.PI * 2); x.fill();
  return toTexture(c);
});

/* ── Brass plaque for the drawer front ── */
export function plaque(planeW, planeH, squash) {
  const W = 2048, H = 512, c = makeCanvas(W, H), x = c.getContext('2d'), r = mulberry32(1887);
  const g = x.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#e0bd72'); g.addColorStop(0.5, '#a97f38'); g.addColorStop(1, '#cfa858');
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  for (let i = 0; i < 1500; i++) {
    const y = r() * H, x0 = r() * W, len = 60 + r() * 500, v = (r() * 255) | 0;
    x.strokeStyle = `rgba(${v},${v * 0.85},${v * 0.5},${0.05 + r() * 0.08})`;
    x.lineWidth = 1 + r() * 2;
    x.beginPath(); x.moveTo(x0, y); x.lineTo(x0 + len, y); x.stroke();
  }
  x.lineWidth = 10; x.strokeStyle = 'rgba(60,40,10,0.55)'; x.strokeRect(22, 22, W - 44, H - 44);
  x.lineWidth = 3; x.strokeStyle = 'rgba(255,235,180,0.5)'; x.strokeRect(36, 36, W - 72, H - 72);
  for (const [sx, sy] of [[70, 70], [W - 70, 70], [70, H - 70], [W - 70, H - 70]]) {
    const sg = x.createRadialGradient(sx - 6, sy - 6, 2, sx, sy, 20);
    sg.addColorStop(0, '#f6dc9a'); sg.addColorStop(1, '#6d4f1c');
    x.fillStyle = sg; x.beginPath(); x.arc(sx, sy, 18, 0, Math.PI * 2); x.fill();
    x.strokeStyle = 'rgba(40,25,5,0.8)'; x.lineWidth = 4;
    x.beginPath(); x.moveTo(sx - 12, sy - 4); x.lineTo(sx + 12, sy + 4); x.stroke();
  }
  // The plaque is viewed obliquely, so text is pre-stretched to read naturally.
  const apparentAspect = planeW / (planeH * squash);
  const sx = (W / H) / apparentAspect;
  const engrave = (text, font, y) => {
    x.save();
    x.translate(W / 2, y);
    x.font = font;
    const tw = x.measureText(text).width;
    const fit = Math.min(1, (W * 0.86) / (tw * sx));
    x.scale(sx * fit, 1);
    x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillStyle = 'rgba(255,238,190,0.7)'; x.fillText(text, 0, 3);
    x.fillStyle = '#3a2508'; x.fillText(text, 0, 0);
    x.restore();
  };
  engrave('THE CABINET OF HOROLOGICAL CURIOSITIES', '900 230px "Playfair Display", serif', H * 0.4);
  engrave('EST. 1887  ·  DRAWER Nº 1 OF ∞  ·  PLEASE DO NOT WIND THE EXHIBITS', '92px "Special Elite", monospace', H * 0.78);
  return toTexture(c);
}
