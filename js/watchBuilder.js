import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import * as TX from './textures.js';

// Units are centimetres. Watch-local origin = centre of the case back; dial faces +y; 12 o'clock is -z.
export const LAYOUT = { CW: 7.6, D: 8.2, DIV: 0.4, DIV_H: 2.6, WALL: 1.2, WALL_H: 5.2 };
export const PILLOW = { a: 3.4, b: 1.6, cy: 1.6 };
export const HEAD_Y = 3.02;

export const METALS = {
  steel: { name: 'Stainless Steel', short: 'Steel', color: 0xd6d8dc, rough: 0.3, polish: 0.08 },
  gold: { name: '18k Yellow Gold', short: 'Gold', color: 0xf5c46a, rough: 0.26, polish: 0.1 },
  rose: { name: '18k Rose Gold', short: 'Rose Gold', color: 0xf2b39a, rough: 0.26, polish: 0.1 },
  pvd: { name: 'Black PVD Steel', short: 'Black PVD', color: 0x2c2c30, rough: 0.34, polish: 0.16 },
  bronze: { name: 'Aged Bronze', short: 'Bronze', color: 0xb27c4c, rough: 0.48, polish: 0.28 },
  titanium: { name: 'Grade 5 Titanium', short: 'Titanium', color: 0x9da1a8, rough: 0.38, polish: 0.16 },
  resin: { name: 'Matte Black Resin', short: 'Resin', color: 0x1b1b1d, rough: 0.6, polish: 0.42, nonMetal: true },
};
export const LEATHERS = {
  cognac: { name: 'Cognac Calfskin', color: '#8b4a20', thread: '#efe1c4' },
  black: { name: 'Black Calfskin', color: '#1f1c1b', thread: '#d9d2c4' },
  chocolate: { name: 'Chocolate Leather', color: '#3d2416', thread: '#c9a27a' },
  tan: { name: 'Saddle Tan Leather', color: '#b37a42', thread: '#3a2416' },
  oxblood: { name: 'Oxblood Leather', color: '#5c1a1d', thread: '#e2cfb8' },
  navy: { name: 'Navy Suede', color: '#26304b', thread: '#c9c2b0' },
};
export const SILICONES = {
  orange: { name: 'Signal Orange Rubber', color: 0xe2592a },
  black: { name: 'Black Rubber', color: 0x1c1c1e },
  teal: { name: 'Lagoon Teal Rubber', color: 0x18848a },
  yellow: { name: 'Taxi Yellow Rubber', color: 0xf0bd26 },
  white: { name: 'Arctic White Rubber', color: 0xe6e6e2 },
  pink: { name: 'Bubblegum Rubber', color: 0xe7739f },
  olive: { name: 'Olive Rubber', color: 0x56633a },
};
export const NATOS = {
  bond: { name: '"Bond" Striped NATO', stripes: ['#1b1b1d', '#6f6f72', '#1b1b1d', '#6f6f72', '#1b1b1d'] },
  regimental: { name: 'Regimental NATO', stripes: ['#1d2950', '#7d1a22', '#1d2950'] },
  olive: { name: 'Olive Drab NATO', stripes: ['#4a5230'] },
  sunset: { name: 'Sunset NATO', stripes: ['#e3732e', '#f0c040', '#e3732e'] },
  mint: { name: 'Mint Stripe NATO', stripes: ['#1f3a33', '#bfe3cf', '#1f3a33'] },
};
export const INSERTS = {
  black: 'black ceramic insert', blue: 'blue ceramic insert', pepsi: '"Pepsi" aluminium insert',
  green: 'green ceramic insert', rootbeer: '"Root Beer" insert',
};

const ATTACH = { round: { z: 2.12, y: 0.42, w: 1.82 }, rect: { z: 1.75, y: 0.4, w: 2.3 } };
const STRAP_DIMS = {
  leather: { t: 0.3, taper: 0.14, round: 0.35 },
  silicone: { t: 0.38, taper: 0.1, round: 0.6 },
  nato: { t: 0.1, taper: 0, round: 0.15 },
  milanese: { t: 0.13, taper: 0, round: 0.25 },
};

const geoCache = new Map(), matCache = new Map();
const cached = (map, key, fn) => { if (!map.has(key)) map.set(key, fn()); return map.get(key); };
const v2 = (pts) => pts.map(([x, y]) => new THREE.Vector2(x, y));
const merge = (geos) => mergeGeometries(geos.map((g) => (g.index ? g.toNonIndexed() : g)));

/* ── geometry ── */
function knurl(geo, n, depth, minR) {
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i), r = Math.hypot(x, z);
    if (r < minR) continue;
    const f = 1 - depth * (0.5 + 0.5 * Math.cos(Math.atan2(z, x) * n));
    p.setX(i, x * f); p.setZ(i, z * f);
  }
  geo.computeVertexNormals();
  return geo;
}

function melt(src) {
  const g = src.clone(), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const t = THREE.MathUtils.smoothstep(x, -0.4, 2.3), tt = t * t;
    y -= 0.42 * tt + 0.08 * tt * Math.sin(z * 3);
    x += 0.38 * tt;
    z *= 1 + 0.12 * tt;
    p.setXYZ(i, x, y, z);
  }
  g.computeVertexNormals();
  return g;
}

function roundCaseGeo(chrono) {
  const body = new THREE.LatheGeometry(v2([
    [0, 0.03], [1.45, 0], [1.68, 0.04], [1.78, 0.13], [1.9, 0.18], [1.98, 0.3],
    [2.03, 0.48], [2.02, 0.68], [1.97, 0.8], [1.9, 0.86], [1.6, 0.88],
  ]), 128);
  const parts = [body];
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const lug = new RoundedBoxGeometry(0.48, 0.46, 1.0, 3, 0.16);
    lug.rotateX(sz * 0.16);
    lug.translate(sx * 1.14, 0.5, sz * 1.95);
    parts.push(lug);
  }
  const crown = knurl(new THREE.CylinderGeometry(0.28, 0.28, 0.34, 48, 1), 24, 0.08, 0.2);
  crown.rotateZ(Math.PI / 2); crown.translate(2.24, 0.5, 0);
  const stem = new THREE.CylinderGeometry(0.11, 0.11, 0.32, 16);
  stem.rotateZ(Math.PI / 2); stem.translate(2.04, 0.5, 0);
  parts.push(crown, stem);
  if (chrono) {
    for (const s of [-1, 1]) {
      const pusher = new THREE.CylinderGeometry(0.17, 0.17, 0.42, 24);
      pusher.rotateZ(Math.PI / 2); pusher.translate(2.12, 0.5, 0); pusher.rotateY(s * 0.72);
      const neck = new THREE.CylinderGeometry(0.09, 0.09, 0.3, 12);
      neck.rotateZ(Math.PI / 2); neck.translate(1.95, 0.5, 0); neck.rotateY(s * 0.72);
      parts.push(pusher, neck);
    }
  }
  return merge(parts);
}

function rectCaseGeo() {
  const body = new RoundedBoxGeometry(3.7, 0.95, 4.1, 4, 0.36);
  body.translate(0, 0.475, 0);
  const parts = [body];
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const p = new THREE.CylinderGeometry(0.15, 0.15, 0.3, 16);
    p.rotateZ(Math.PI / 2); p.translate(sx * 1.9, 0.5, sz * 1.05);
    parts.push(p);
  }
  return merge(parts);
}

function caseGeo(shape, chrono) {
  return cached(geoCache, `case:${shape}:${chrono}`, () => {
    if (shape === 'rect') return rectCaseGeo();
    if (shape === 'melted') return melt(roundCaseGeo(false));
    return roundCaseGeo(chrono);
  });
}

function roundedRect(w, h, r, path = new THREE.Shape()) {
  const x = -w / 2, y = -h / 2;
  path.moveTo(x + r, y);
  path.lineTo(x + w - r, y); path.quadraticCurveTo(x + w, y, x + w, y + r);
  path.lineTo(x + w, y + h - r); path.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  path.lineTo(x + r, y + h); path.quadraticCurveTo(x, y + h, x, y + h - r);
  path.lineTo(x, y + r); path.quadraticCurveTo(x, y, x + r, y);
  return path;
}

function bezelGeo(type) {
  return cached(geoCache, `bezel:${type}`, () => {
    if (type === 'rect') {
      const shape = roundedRect(3.5, 3.9, 0.42);
      shape.holes.push(roundedRect(2.96, 2.96, 0.24, new THREE.Path()));
      const g = new THREE.ExtrudeGeometry(shape, { depth: 0.08, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.04, bevelSegments: 3, curveSegments: 10 });
      g.rotateX(-Math.PI / 2); g.translate(0, 0.93, 0);
      return g;
    }
    if (type === 'melted') return melt(bezelGeo('polished'));
    const diver = type === 'diver';
    // Profile runs outer-bottom → over the top → inner wall so normals face outward.
    const prof = diver
      ? [[1.9, 0.86], [1.99, 0.9], [2.02, 0.98], [2.0, 1.06], [1.93, 1.12], [1.62, 1.12], [1.58, 1.05], [1.57, 0.92]]
      : [[1.9, 0.86], [1.97, 0.92], [1.96, 1.02], [1.88, 1.1], [1.72, 1.12], [1.62, 1.06], [1.58, 0.92]];
    const g = new THREE.LatheGeometry(v2(prof), type === 'polished' ? 128 : 360);
    if (type !== 'polished') {
      const p = g.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i), y = p.getY(i), z = p.getZ(i), r = Math.hypot(x, z), a = Math.atan2(z, x);
        let f = 1;
        if (type === 'fluted' && r > 1.7 && y > 0.94) f = 1 - 0.028 * (0.5 + 0.5 * Math.cos(a * 60)) * Math.min(1, (y - 0.94) / 0.12);
        if (diver && r > 1.95 && y > 0.9 && y < 1.1) f = 1 - 0.014 * (0.5 + 0.5 * Math.cos(a * 120));
        p.setX(i, x * f); p.setZ(i, z * f);
      }
      g.computeVertexNormals();
    }
    return g;
  });
}

const insertGeo = () => cached(geoCache, 'insert', () => new THREE.RingGeometry(1.63, 1.9, 128).rotateX(-Math.PI / 2).translate(0, 1.123, 0));

function dialGeo(shape) {
  return cached(geoCache, `dial:${shape}`, () => {
    if (shape === 'rect') return new THREE.PlaneGeometry(2.98, 2.98).rotateX(-Math.PI / 2).translate(0, 0.97, 0);
    const round = new THREE.CircleGeometry(1.6, 96).rotateX(-Math.PI / 2).translate(0, 0.9, 0);
    return shape === 'melted' ? melt(round) : round;
  });
}


const pinionGeo = () => cached(geoCache, 'pinion', () => new THREE.CylinderGeometry(0.085, 0.085, 0.07, 24).translate(0, 0.935, 0));

function gnomonGeo() {
  return cached(geoCache, 'gnomon', () => {
    const s = new THREE.Shape();
    s.moveTo(0, 0); s.lineTo(1.35, 0); s.lineTo(0, 0.75); s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.07, bevelEnabled: false });
    g.translate(0, 0, -0.035); g.rotateY(Math.PI / 2); g.translate(0, 0.9, 0);
    return g;
  });
}

const hitGeo = () => cached(geoCache, 'hit', () => new THREE.CylinderGeometry(2.5, 2.5, 1.8, 12).translate(0, 0.6, 0));

export const pillowGeo = (len) => cached(geoCache, `pillow:${len}`, () => {
  const g = new THREE.CapsuleGeometry(1, len, 12, 48);
  g.rotateZ(Math.PI / 2);
  g.scale(1, PILLOW.b, PILLOW.a);
  return g;
});

// Centre-line of a strap leaving the lugs and wrapping around the cushion, in the watch's (z, y) plane.
function strapPath(at, off) {
  return cached(geoCache, `path:${at.z}:${at.y}:${off}`, () => {
    const cy = PILLOW.cy - HEAD_Y, A = PILLOW.a + off, B = PILLOW.b + off;
    const z1 = Math.min(at.z + 0.55, A * 0.96), phi1 = Math.asin(z1 / A);
    const e1 = new THREE.Vector2(A * Math.sin(phi1), cy + B * Math.cos(phi1));
    const tan1 = new THREE.Vector2(A * Math.cos(phi1), -B * Math.sin(phi1)).normalize();
    const p0 = new THREE.Vector2(at.z, at.y), d = p0.distanceTo(e1);
    const curve = new THREE.CubicBezierCurve(
      p0, p0.clone().add(new THREE.Vector2(d * 0.45, 0)), e1.clone().addScaledVector(tan1, -d * 0.45), e1);
    const pts = curve.getPoints(20);
    const phiEnd = Math.PI * 0.94, n = 48;
    for (let i = 1; i <= n; i++) {
      const phi = phi1 + ((phiEnd - phi1) * i) / n;
      pts.push(new THREE.Vector2(A * Math.sin(phi), cy + B * Math.cos(phi)));
    }
    const lens = [0];
    for (let i = 1; i < pts.length; i++) lens.push(lens[i - 1] + pts[i].distanceTo(pts[i - 1]));
    const tans = pts.map((_, i) => pts[Math.min(pts.length - 1, i + 1)].clone().sub(pts[Math.max(0, i - 1)]).normalize());
    const total = lens[lens.length - 1];
    function at_(s) {
      s = Math.max(0, Math.min(total, s));
      let lo = 0, hi = lens.length - 1;
      while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (lens[mid] <= s) lo = mid; else hi = mid; }
      const f = (s - lens[lo]) / Math.max(1e-6, lens[hi] - lens[lo]);
      const p = pts[lo].clone().lerp(pts[hi], f);
      const t = tans[lo].clone().lerp(tans[hi], f).normalize();
      return { p, t, n: new THREE.Vector2(-t.y, t.x) };
    }
    return { total, at: at_ };
  });
}

function strapGeo(kind, attachKey) {
  return cached(geoCache, `strap:${kind}:${attachKey}`, () => {
    const at = ATTACH[attachKey], dims = STRAP_DIMS[kind], w = at.w;
    const path = strapPath(at, dims.t / 2), L = path.total - 0.05;
    const g = new THREE.BoxGeometry(w, dims.t, L, 6, 1, 110);
    const pos = g.attributes.position, uv = g.attributes.uv;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), s = pos.getZ(i) + L / 2;
      const { p, n } = path.at(s);
      const yy = y * (1 - dims.round * Math.pow(Math.abs(x) / (w / 2), 4));
      pos.setXYZ(i, x * (1 - (dims.taper * s) / L), p.y + n.y * yy, p.x + n.x * yy);
      uv.setXY(i, x / w + 0.5, s / L);
    }
    g.computeVertexNormals();
    return merge([g, g.clone().rotateY(Math.PI)]);
  });
}

function braceletGeo(attachKey) {
  return cached(geoCache, `bracelet:${attachKey}`, () => {
    const at = ATTACH[attachKey], path = strapPath(at, 0.19), sx = at.w / 1.86;
    const cBase = new RoundedBoxGeometry(0.7 * sx, 0.36, 0.56, 2, 0.1);
    const oBase = new RoundedBoxGeometry(0.52 * sx, 0.33, 0.56, 2, 0.1);
    const center = [], outer = [];
    const X = new THREE.Vector3(1, 0, 0), Y = new THREE.Vector3(), Z = new THREE.Vector3(), m = new THREE.Matrix4();
    for (let s = 0.3; s < path.total - 0.3; s += 0.6) {
      const { p, t, n } = path.at(s);
      Y.set(0, n.y, n.x); Z.set(0, t.y, t.x);
      m.makeBasis(X, Y, Z).setPosition(0, p.y, p.x);
      center.push(cBase.clone().applyMatrix4(m));
      for (const k of [-1, 1]) outer.push(oBase.clone().translate(k * 0.64 * sx, 0, 0).applyMatrix4(m));
    }
    const both = (arr) => { const g = mergeGeometries(arr); return merge([g, g.clone().rotateY(Math.PI)]); };
    return { center: both(center), outer: both(outer) };
  });
}

/* ── materials ── */
export function metalMat(key, polished) {
  return cached(matCache, `metal:${key}:${polished}`, () => {
    const m = METALS[key];
    return new THREE.MeshPhysicalMaterial({
      color: m.color,
      metalness: m.nonMetal ? 0 : 1,
      roughness: polished ? m.polish : m.rough,
      roughnessMap: polished ? null : TX.brushed(),
      clearcoat: m.nonMetal ? 0.25 : 0,
      clearcoatRoughness: 0.4,
    });
  });
}

const brassMat = () => cached(matCache, 'brass', () => new THREE.MeshPhysicalMaterial({ color: 0xd2a650, metalness: 1, roughness: 0.28 }));
const hitMat = () => cached(matCache, 'hit', () => new THREE.MeshBasicMaterial({ visible: false }));
const insertMat = (key) => cached(matCache, `insert:${key}`, () => new THREE.MeshPhysicalMaterial({
  map: TX.diverInsert(key), roughness: 0.18, metalness: 0.1, clearcoat: 1, clearcoatRoughness: 0.08,
}));

function strapMat(kind, key) {
  return cached(matCache, `strap:${kind}:${key}`, () => {
    if (kind === 'leather') {
      const l = LEATHERS[key];
      return new THREE.MeshStandardMaterial({ map: TX.leather(l.color, l.thread), bumpMap: TX.leatherBump(), bumpScale: 1.5, roughness: key === 'navy' ? 0.85 : 0.55 });
    }
    if (kind === 'silicone') {
      return new THREE.MeshPhysicalMaterial({ color: SILICONES[key].color, roughness: 0.55, bumpMap: TX.ribs(), bumpScale: 1.2, clearcoat: 0.2, clearcoatRoughness: 0.5 });
    }
    if (kind === 'nato') {
      return new THREE.MeshStandardMaterial({ map: TX.nato(key, NATOS[key].stripes), bumpMap: TX.weave(), bumpScale: 1, roughness: 0.9 });
    }
    return new THREE.MeshPhysicalMaterial({ color: METALS[key].color, metalness: 1, roughness: 0.3, map: TX.milaneseMap(), bumpMap: TX.milaneseBump(), bumpScale: 2 });
  });
}

/* ── assembly ── */
export function buildWatch(cfg, dialMat) {
  const g = new THREE.Group();
  const add = (geo, mat, cast = true, receive = true) => {
    const m = new THREE.Mesh(geo, mat);
    m.castShadow = cast; m.receiveShadow = receive;
    g.add(m);
    return m;
  };
  const { shape } = cfg, rect = shape === 'rect', melted = shape === 'melted';
  const attachKey = rect ? 'rect' : 'round';
  const shinyCase = cfg.metal === 'gold' || cfg.metal === 'rose';

  add(caseGeo(shape, cfg.chrono), metalMat(cfg.metal, shinyCase));
  add(bezelGeo(rect ? 'rect' : melted ? 'melted' : cfg.bezel), metalMat(cfg.metal, true));
  if (cfg.bezel === 'diver' && !rect && !melted) add(insertGeo(), insertMat(cfg.insert), false);
  const dial = add(dialGeo(shape), dialMat, false, true);
  if (cfg.pinion) add(pinionGeo(), metalMat(cfg.metal === 'resin' ? 'steel' : cfg.metal, true), false, false);
  if (cfg.gnomon) add(gnomonGeo(), brassMat());

  const s = cfg.strap;
  if (s.kind === 'bracelet') {
    const b = braceletGeo(attachKey);
    add(b.center, metalMat(s.key, true));
    add(b.outer, metalMat(s.key, false));
  } else {
    add(strapGeo(s.kind, attachKey), strapMat(s.kind, s.key));
  }

  const hit = new THREE.Mesh(hitGeo(), hitMat());
  g.add(hit);
  g.userData.dial = dial;
  g.userData.hit = hit;
  return g;
}

export function strapName(s) {
  switch (s.kind) {
    case 'leather': return LEATHERS[s.key].name;
    case 'silicone': return SILICONES[s.key].name;
    case 'nato': return NATOS[s.key].name;
    case 'milanese': return `${METALS[s.key].short} Milanese Mesh`;
    default: return `${METALS[s.key].short} Link Bracelet`;
  }
}

export function describe(cfg) {
  const m = METALS[cfg.metal];
  const size = cfg.shape === 'rect' ? '37 × 41 mm' : '40 mm';
  const bezel = cfg.shape === 'rect' ? 'Integrated frame'
    : cfg.shape === 'melted' ? 'Smooth, drooping'
      : cfg.bezel === 'diver' ? `Diver, ${INSERTS[cfg.insert]}`
        : cfg.bezel === 'fluted' ? 'Fluted, polished' : 'Smooth, polished';
  return [
    ['Case', `${size} ${m.name}${cfg.shape === 'melted' ? ' (partially liquid)' : ''}`],
    ['Bezel', bezel],
    ['Crystal', cfg.noCrystal ? 'None. Requires direct sunlight.' : 'Perfectly anti-reflective sapphire (allegedly)'],
    ['Strap', strapName(cfg.strap)],
    ['Movement', cfg.face.movement],
  ];
}
