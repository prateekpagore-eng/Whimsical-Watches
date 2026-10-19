import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { FACES, FaceTexture } from './faces.js';
import * as WB from './watchBuilder.js';
import * as TX from './textures.js';

const { CW, D, DIV, DIV_H, WALL, WALL_H } = WB.LAYOUT;
const $ = (id) => document.getElementById(id);
const pad = (n) => String(n).padStart(4, '0');
const ease = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);

/* ── renderer / scene ── */
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
$('stage').appendChild(renderer.domElement);
const canvas = renderer.domElement;
const ANISO = Math.min(8, renderer.capabilities.getMaxAnisotropy());
TX.setAnisotropy(ANISO);

const BG = 0x0a0605;
const scene = new THREE.Scene();
scene.background = new THREE.Color(BG);
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.6;

// Straight-down view: screen-up is -z, which is 12 o'clock on every watch.
const camera = new THREE.PerspectiveCamera(24, innerWidth / innerHeight, 0.5, 400);
camera.up.set(0, 0, -1);
scene.add(camera);/* ── lights ── */
scene.add(new THREE.HemisphereLight(0xffe4c4, 0x1c100a, 0.45));
const spot = new THREE.SpotLight(0xffe2bf, 3.4, 0, 0.72, 0.8, 0);
spot.castShadow = true;
spot.shadow.mapSize.set(2048, 2048);
spot.shadow.bias = -0.0003;
spot.shadow.normalBias = 0.04;
spot.shadow.camera.near = 15;
spot.shadow.camera.far = 140;
scene.add(spot, spot.target);
// Steeply side-on so its reflection lands on the bezel rim, never across the dial.
const inspectKey = new THREE.DirectionalLight(0xfff3e2, 0);
inspectKey.position.set(-12, 10, -8);
inspectKey.target.position.set(0, 0, -20);
camera.add(inspectKey, inspectKey.target);

/* ── face textures (shared by every watch wearing that face) ── */
const faceTex = new Map(), dialMats = new Map();
for (const f of FACES) {
  const ft = new FaceTexture(f, 512, ANISO);
  faceTex.set(f.id, ft);
  // Lambert is purely diffuse, so lamps can never leave a highlight across a face.
  dialMats.set(f.id, new THREE.MeshLambertMaterial({
    map: ft.texture, color: 0xf2f2f2,
    emissive: f.glow ? 0xffffff : 0x000000, emissiveMap: f.glow ? ft.texture : null, emissiveIntensity: f.glow || 0,
  }));
}

/* ── drawer materials ── */
const M = {
  floor: new THREE.MeshPhysicalMaterial({ color: 0x4a111a, roughness: 1, sheen: 1, sheenRoughness: 0.5, sheenColor: new THREE.Color(0xb85a68), map: TX.velvet(12) }),
  pillow: new THREE.MeshPhysicalMaterial({ color: 0x5c1622, roughness: 0.95, sheen: 1, sheenRoughness: 0.35, sheenColor: new THREE.Color(0xe28a98), map: TX.velvet(3) }),
  woodU: new THREE.MeshPhysicalMaterial({ map: TX.wood(false), roughness: 0.55, clearcoat: 0.18, clearcoatRoughness: 0.35, envMapIntensity: 0.5 }),
  woodV: new THREE.MeshPhysicalMaterial({ map: TX.wood(true), roughness: 0.55, clearcoat: 0.18, clearcoatRoughness: 0.35, envMapIntensity: 0.5 }),
  room: new THREE.MeshStandardMaterial({ map: TX.wood(false, [6, 60]), color: 0x6b5848, roughness: 0.7 }),
};
const wallMats = [M.woodU, M.woodU, M.woodV, M.woodV, M.woodU, M.woodU];

const roomFloor = new THREE.Mesh(new THREE.PlaneGeometry(600, 3000).rotateX(-Math.PI / 2), M.room);
roomFloor.position.set(0, -0.62, 1400);
roomFloor.receiveShadow = true;
scene.add(roomFloor);

/* ── watch configuration (deterministic per exhibit number) ── */
function blockOrder(block) {
  const r = TX.mulberry32(block * 1013 + 77), a = FACES.map((_, i) => i);
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
const orderCache = new Map();
function watchConfig(index) {
  const N = FACES.length, block = Math.floor(index / N);
  if (!orderCache.has(block)) orderCache.set(block, blockOrder(block));
  const face = FACES[orderCache.get(block)[index % N]];
  const r = TX.mulberry32(index * 7919 + 13);
  const pick = (arr) => arr[Math.floor(r() * arr.length)];
  const wpick = (pairs) => {
    let t = r() * pairs.reduce((s, p) => s + p[1], 0);
    for (const [v, w] of pairs) { if ((t -= w) <= 0) return v; }
    return pairs[0][0];
  };
  const shape = face.shape || 'round';
  const metal = pick(face.metals || ['steel', 'steel', 'gold', 'rose', 'pvd', 'bronze', 'titanium']);
  let bezel = shape === 'round' ? wpick([['polished', 5], ['fluted', 2.5], ['diver', 2.5]]) : 'polished';
  if (bezel === 'fluted' && ['pvd', 'bronze', 'resin'].includes(metal)) bezel = 'polished';
  const kind = wpick([['leather', 34], ['silicone', 18], ['bracelet', 20], ['nato', 14], ['milanese', 12]]);
  const metalKey = metal === 'resin' ? 'steel' : metal;
  const key = kind === 'leather' ? pick(Object.keys(WB.LEATHERS))
    : kind === 'silicone' ? pick(Object.keys(WB.SILICONES))
      : kind === 'nato' ? pick(Object.keys(WB.NATOS)) : metalKey;
  return {
    index, face, shape, metal, bezel,
    insert: pick(Object.keys(WB.INSERTS)),
    strap: { kind, key },
    chrono: !!face.chrono, gnomon: !!face.gnomon, noCrystal: !!face.noCrystal,
    pinion: face.pinion !== false && shape === 'round',
    yaw: (r() - 0.5) * 0.08,
  };
}

/* ── layout ── */
let cols = 0, innerW = 0, dist = 40, topReach = 20, bottomReach = 12, scrollMin = 0;
let scroll = 0, scrollTarget = 0;
const G = {};
let front = null;
const rows = new Map();
const instanceFaces = new Set();
let hitTargets = [];
let maxIndex = -1;

function computeLayout() {
  // A page opened in a hidden or minimised window can report a 0×0 viewport; wait for a real size.
  if (!innerWidth || !innerHeight) return;
  const firstLayout = cols === 0;
  const aspect = innerWidth / innerHeight;
  const newCols = aspect > 1.55 ? 4 : aspect > 0.95 ? 3 : 2;
  camera.aspect = aspect;
  camera.fov = aspect < 0.8 ? 30 : 24;
  camera.updateProjectionMatrix();
  const halfV = THREE.MathUtils.degToRad(camera.fov) / 2;
  const hfov = 2 * Math.atan(Math.tan(halfV) * aspect);
  const totalW = newCols * CW + 2 * WALL + 1.2;
  dist = Math.max(24, (totalW / 2 / Math.tan(hfov / 2)) * 1.08);
  topReach = bottomReach = dist * Math.tan(halfV);
  // Start with the far edge of the brass plaque (z ≈ -3.6) about 80px below the top, clear of the header.
  scrollMin = topReach * (1 - 160 / innerHeight) - 3.6;
  renderer.setSize(innerWidth, innerHeight);
  if (newCols !== cols) { cols = newCols; rebuildAll(); }
  if (firstLayout) scroll = scrollTarget = scrollMin;
  scrollTarget = Math.max(scrollMin, scrollTarget);
}

function rebuildAll() {
  if (sel) abortSelection();
  for (const [ri, g] of rows) removeRow(ri, g);
  for (const k of Object.keys(G)) G[k].dispose();
  innerW = cols * CW;
  G.floor = new THREE.PlaneGeometry(innerW, D).rotateX(-Math.PI / 2);
  G.wall = new THREE.BoxGeometry(WALL, WALL_H, D);
  G.cross = new THREE.BoxGeometry(innerW, DIV_H, DIV);
  G.col = new THREE.BoxGeometry(DIV, DIV_H, D);
  buildFront();
}

function buildFront() {
  if (front) {
    scene.remove(front);
    front.traverse((o) => { if (o.isMesh) { o.geometry.dispose(); if (o.material !== M.woodU) { o.material.map?.dispose(); o.material.dispose(); } } });
  }
  front = new THREE.Group();
  const fw = innerW + 2 * WALL;
  const panel = new THREE.Mesh(new THREE.BoxGeometry(fw, WALL_H, 4), M.woodU);
  panel.position.set(0, WALL_H / 2 - 0.6, -2);
  panel.castShadow = panel.receiveShadow = true;
  front.add(panel);
  const pw = Math.min(innerW * 0.88, 26), ph = Math.min(3, pw * 0.15);
  const plaque = new THREE.Mesh(
    new THREE.PlaneGeometry(pw, ph).rotateX(-Math.PI / 2),
    new THREE.MeshPhysicalMaterial({ map: TX.plaque(pw, ph, 1), metalness: 0.75, roughness: 0.38, clearcoat: 0.3 }),
  );
  plaque.position.set(0, WALL_H - 0.6 + 0.01, -2);
  plaque.receiveShadow = true;
  front.add(plaque);
  scene.add(front);
}

function buildRow(ri) {
  const g = new THREE.Group();
  g.position.z = ri * D;
  const mesh = (geo, mat, x, y, z) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.castShadow = m.receiveShadow = true;
    g.add(m);
    return m;
  };
  mesh(G.floor, M.floor, 0, 0, D / 2).castShadow = false;
  for (const s of [-1, 1]) mesh(G.wall, wallMats, s * (innerW / 2 + WALL / 2), WALL_H / 2 - 0.6, D / 2);
  if (ri > 0) mesh(G.cross, M.woodU, 0, DIV_H / 2, 0);
  for (let c = 1; c < cols; c++) mesh(G.col, wallMats, -innerW / 2 + c * CW, DIV_H / 2, D / 2);
  const pillowGeo = WB.pillowGeo(+(CW - DIV - 2.4).toFixed(2));
  g.userData.hits = [];
  g.userData.ownFaces = [];
  for (let c = 0; c < cols; c++) {
    const cx = -innerW / 2 + (c + 0.5) * CW;
    mesh(pillowGeo, M.pillow, cx, WB.PILLOW.cy, D / 2);
    const cfg = watchConfig(ri * cols + c);
    let dialMat = dialMats.get(cfg.face.id);
    if (cfg.face.perWatch) {
      const ft = new FaceTexture(cfg.face, 512, ANISO, cfg.index);
      ft.update(Date.now(), true);
      dialMat = dialMat.clone();
      dialMat.map = ft.texture;
      if (dialMat.emissiveMap) dialMat.emissiveMap = ft.texture;
      g.userData.ownFaces.push({ ft, mat: dialMat });
      instanceFaces.add(ft);
    }
    const w = WB.buildWatch(cfg, dialMat);
    w.position.set(cx, WB.HEAD_Y, D / 2);
    w.rotation.y = cfg.yaw;
    w.userData.cfg = cfg;
    w.userData.lift = 0;
    g.add(w);
    g.userData.hits.push(w.userData.hit);
    maxIndex = Math.max(maxIndex, cfg.index);
  }
  scene.add(g);
  return g;
}

function removeRow(ri, g) {
  scene.remove(g);
  rows.delete(ri);
  for (const { ft, mat } of g.userData.ownFaces) {
    instanceFaces.delete(ft);
    ft.dispose();
    mat.dispose();
  }
}

function ensureRows() {
  const first = Math.max(0, Math.floor((scroll - topReach - 8) / D));
  const last = Math.floor((scroll + bottomReach + 8) / D);
  let changed = false;
  for (const [ri, g] of rows) {
    if (ri < first || ri > last) { removeRow(ri, g); changed = true; }
  }
  for (let ri = first; ri <= last; ri++) {
    if (!rows.has(ri)) { rows.set(ri, buildRow(ri)); changed = true; }
  }
  if (changed) {
    hitTargets = [...rows.values()].flatMap((g) => g.userData.hits);
    $('count').textContent = pad(maxIndex + 1);
  }
}

/* ── camera ── */
const target = new THREE.Vector3();
function updateCamera() {
  target.set(0, 2.2, scroll);
  camera.position.set(0, target.y + dist, scroll);
  camera.lookAt(target);
  // Lamp sits well off to the upper-left so its reflection never bounces straight into the overhead camera.
  spot.position.set(-26, 44, scroll - 22);
  spot.target.position.set(0, 0, scroll);
}

/* ── hover ── */
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let pointerOnCanvas = false;
let hovered = null;
const lifting = new Set();
const tooltip = $('tooltip');

function pickWatch() {
  raycaster.setFromCamera(pointer, camera);
  const hit = raycaster.intersectObjects(hitTargets, false)[0];
  return hit ? hit.object.parent : null;
}

function setHover(g) {
  if (g === hovered) return;
  if (hovered) hovered.userData.liftTarget = 0;
  hovered = g;
  document.body.classList.toggle('hovering', !!g);
  if (!g) { tooltip.classList.remove('show'); return; }
  g.userData.liftTarget = 0.3;
  lifting.add(g);
  const cfg = g.userData.cfg;
  $('ttNo').textContent = `Exhibit Nº ${pad(cfg.index + 1)}`;
  $('ttName').textContent = cfg.face.name;
  $('ttMeta').textContent = `${WB.METALS[cfg.metal].short} · ${WB.strapName(cfg.strap)}`;
  tooltip.classList.add('show');
}

/* ── inspection ── */
const backdrop = new THREE.Mesh(
  new THREE.PlaneGeometry(1, 1),
  new THREE.MeshBasicMaterial({ color: 0x050302, transparent: true, opacity: 0, depthWrite: false, fog: false }),
);
backdrop.visible = false;
camera.add(backdrop);

const qBase = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2);
let sel = null, hiTex = null;

function selLayout() {
  const vh = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2), a = camera.aspect;
  // Seen face-on, the watch with its curled strap is about 7.6 units tall and 5 wide.
  if (innerWidth < 760) {
    const d = Math.max(7.6 / (0.45 * vh), 5 / (0.86 * vh * a));
    return { d, x: 0, y: 0.24 * vh * d };
  }
  const d = Math.max(7.6 / (0.86 * vh), 5 / (0.5 * vh * a));
  return { d, x: -0.2 * vh * d * a, y: 0 };
}

function selTarget() {
  const L = selLayout();
  const q = camera.quaternion.clone().multiply(qBase);
  const center = new THREE.Vector3(L.x, L.y, -L.d).applyMatrix4(camera.matrixWorld);
  const pivot = new THREE.Vector3(0, 0.55, 0).applyQuaternion(q);
  return { pos: center.sub(pivot), quat: q, L };
}

function openSelection(group) {
  setHover(null);
  lifting.delete(group);
  group.userData.lift = 0;
  sel = {
    group, cfg: group.userData.cfg, parent: group.parent,
    localPos: group.position.clone().setY(WB.HEAD_Y), localQuat: group.quaternion.clone(),
    phase: 'in', t: 0,
  };
  scene.attach(group);
  sel.startPos = group.position.clone();
  sel.startQuat = group.quaternion.clone();

  hiTex = new FaceTexture(sel.cfg.face, 1024, ANISO, sel.cfg.index);
  hiTex.update(Date.now(), true);
  const dial = group.userData.dial;
  sel.dialMat = dial.material;
  const m = dial.material.clone();
  m.map = hiTex.texture;
  if (m.emissiveMap) m.emissiveMap = hiTex.texture;
  dial.material = m;

  fillPanel(sel.cfg);
  $('panel').classList.add('open');
  $('panel').setAttribute('aria-hidden', 'false');
  document.body.classList.add('inspecting');
}

function closeSelection() {
  if (!sel || sel.phase === 'out') return;
  sel.phase = 'out';
  sel.t = 0;
  sel.startPos = sel.group.position.clone();
  sel.startQuat = sel.group.quaternion.clone();
  $('panel').classList.remove('open');
  $('panel').setAttribute('aria-hidden', 'true');
  document.body.classList.remove('inspecting');
}

function finishClose() {
  const { group, parent, localPos, localQuat } = sel;
  parent.add(group);
  group.position.copy(localPos);
  group.quaternion.copy(localQuat);
  group.userData.dial.material.dispose();
  group.userData.dial.material = sel.dialMat;
  hiTex.dispose();
  hiTex = null;
  sel = null;
}

// Put the current watch straight back (hidden behind the backdrop) and lift out its neighbour,
// scrolling the drawer underneath if that neighbour's row isn't built yet.
function switchExhibit(delta) {
  if (!sel || sel.phase === 'out') return;
  const index = sel.cfg.index + delta;
  if (index < 0) return;
  finishClose();
  const ri = Math.floor(index / cols), rowZ = ri * D + D / 2;
  if (rowZ < scroll - topReach + 3 || rowZ > scroll + bottomReach - 3) {
    scroll = scrollTarget = clampScroll(rowZ);
  }
  updateCamera();
  ensureRows();
  const next = rows.get(ri)?.children.find((o) => o.userData.cfg?.index === index);
  if (next) openSelection(next);
}

function abortSelection() {
  if (sel.phase !== 'out') closeSelection();
  finishClose();
}

function updateSelection(dt) {
  const wantDark = sel && sel.phase !== 'out';
  const mat = backdrop.material;
  mat.opacity += ((wantDark ? 0.86 : 0) - mat.opacity) * (1 - Math.exp(-dt * 6));
  backdrop.visible = mat.opacity > 0.002;
  inspectKey.intensity += ((wantDark ? 2.2 : 0) - inspectKey.intensity) * (1 - Math.exp(-dt * 6));
  if (!sel) return;

  sel.t += dt;
  const g = sel.group;
  if (sel.phase === 'out') {
    sel.parent.updateMatrixWorld();
    const pos = sel.localPos.clone().applyMatrix4(sel.parent.matrixWorld);
    const quat = sel.parent.getWorldQuaternion(new THREE.Quaternion()).multiply(sel.localQuat);
    const k = ease(Math.min(1, sel.t / 0.75));
    g.position.lerpVectors(sel.startPos, pos, k);
    g.position.y += Math.sin(k * Math.PI) * 2;
    g.quaternion.slerpQuaternions(sel.startQuat, quat, k);
    if (k >= 1) finishClose();
    return;
  }
  const tp = selTarget();
  backdrop.position.set(0, 0, -(tp.L.d + 8));
  const vh = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) * (tp.L.d + 8);
  backdrop.scale.set(vh * camera.aspect * 1.3, vh * 1.3, 1);
  if (sel.phase === 'in') {
    const k = ease(Math.min(1, sel.t / 0.9));
    g.position.lerpVectors(sel.startPos, tp.pos, k);
    g.position.y += Math.sin(k * Math.PI) * 3;
    g.quaternion.slerpQuaternions(sel.startQuat, tp.quat, k);
    if (k >= 1) sel.phase = 'shown';
  } else {
    const a = 1 - Math.exp(-dt * 10);
    g.position.lerp(tp.pos, a);
    g.quaternion.slerp(tp.quat, a);
  }
}

function fillPanel(cfg) {
  const f = cfg.face;
  $('pExhibit').textContent = `Exhibit Nº ${pad(cfg.index + 1)}`;
  $('pName').textContent = f.name;
  $('pTagline').textContent = `“${f.tagline}”`;
  $('pModel').textContent = `Model ${f.model}`;
  $('pStory').textContent = f.story;
  const specs = $('pSpecs');
  specs.replaceChildren(...WB.describe(cfg).map(([k, v]) => {
    const row = document.createElement('div');
    const dt = document.createElement('dt'); dt.textContent = k;
    const dd = document.createElement('dd'); dd.textContent = v;
    row.append(dt, dd);
    return row;
  }));
  $('pTags').replaceChildren(...f.specs.map((s) => {
    const span = document.createElement('span'); span.className = 'tag'; span.textContent = s;
    return span;
  }));
  $('prevBtn').disabled = cfg.index === 0;
  $('prevLabel').textContent = cfg.index === 0 ? 'First exhibit' : `Nº ${pad(cfg.index)}`;
  $('nextLabel').textContent = `Nº ${pad(cfg.index + 2)}`;
  $('panel').scrollTop = 0;
}

/* ── input ── */
const clampScroll = (v) => Math.max(scrollMin, v);
let hintHidden = false;
function hideHint() {
  if (hintHidden) return;
  hintHidden = true;
  $('hint').classList.add('hidden');
}

function setPointer(e) {
  pointer.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
}

let down = null;
canvas.addEventListener('pointerdown', (e) => {
  setPointer(e);
  let onWatch = false;
  if (sel) {
    raycaster.setFromCamera(pointer, camera);
    onWatch = raycaster.intersectObject(sel.group.userData.hit, false).length > 0;
  }
  down = { lastX: e.clientX, lastY: e.clientY, moved: 0, onWatch };
  canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove', (e) => {
  setPointer(e);
  pointerOnCanvas = true;
  tooltip.style.transform = `translate(${e.clientX + 18}px, ${e.clientY + 18}px)`;
  if (!down) return;
  const dx = e.clientX - down.lastX, dy = e.clientY - down.lastY;
  down.lastX = e.clientX; down.lastY = e.clientY;
  down.moved += Math.abs(dx) + Math.abs(dy);
  if (!sel && down.moved > 6) {
    scrollTarget = clampScroll(scrollTarget - dy * 0.06);
    setHover(null);
    hideHint();
  }
});
canvas.addEventListener('pointerup', (e) => {
  if (!down) return;
  const click = down.moved < 8, wasOnWatch = down.onWatch;
  down = null;
  if (!click) return;
  if (sel) { if (!wasOnWatch) closeSelection(); return; }
  setPointer(e);
  const w = pickWatch();
  if (w) openSelection(w);
});
canvas.addEventListener('pointerleave', () => { pointerOnCanvas = false; setHover(null); });

addEventListener('wheel', (e) => {
  if (sel) return;
  e.preventDefault();
  let d = e.deltaY;
  if (e.deltaMode === 1) d *= 16; else if (e.deltaMode === 2) d *= innerHeight;
  scrollTarget = clampScroll(scrollTarget + d * 0.022);
  setHover(null);
  hideHint();
}, { passive: false });

addEventListener('keydown', (e) => {
  if (e.key === 'Escape') { closeSelection(); return; }
  if (sel) {
    if (e.key === 'ArrowRight') { switchExhibit(1); e.preventDefault(); }
    if (e.key === 'ArrowLeft') { switchExhibit(-1); e.preventDefault(); }
    return;
  }
  if (['ArrowDown', 'PageDown', ' '].includes(e.key)) { scrollTarget = clampScroll(scrollTarget + D); hideHint(); e.preventDefault(); }
  if (['ArrowUp', 'PageUp'].includes(e.key)) { scrollTarget = clampScroll(scrollTarget - D); e.preventDefault(); }
  if (e.key === 'Home') scrollTarget = scrollMin;
});
$('close').addEventListener('click', closeSelection);
$('prevBtn').addEventListener('click', () => switchExhibit(-1));
$('nextBtn').addEventListener('click', () => switchExhibit(1));
addEventListener('resize', computeLayout);

/* ── loop ── */
const clock = new THREE.Clock();
function frame() {
  const dt = Math.min(clock.getDelta(), 0.05);
  const now = Date.now();

  if (!cols) {
    computeLayout();
    requestAnimationFrame(frame);
    return;
  }

  for (const ft of faceTex.values()) if (!ft.face.perWatch) ft.update(now);
  for (const ft of instanceFaces) ft.update(now);
  if (hiTex) hiTex.update(now);

  if (!sel) {
    scroll += (scrollTarget - scroll) * (1 - Math.exp(-dt * 6));
  }
  updateCamera();
  ensureRows();

  // Re-pick every frame: scrolling eases on after the mouse stops moving.
  if (!sel && !down) setHover(pointerOnCanvas ? pickWatch() : null);
  if (hovered && !hovered.parent) setHover(null);

  for (const g of lifting) {
    if (sel && g === sel.group) { lifting.delete(g); continue; }
    const u = g.userData;
    u.lift += ((u.liftTarget || 0) - u.lift) * (1 - Math.exp(-dt * 10));
    g.position.y = WB.HEAD_Y + u.lift;
    if (!u.liftTarget && u.lift < 0.002) { u.lift = 0; g.position.y = WB.HEAD_Y; lifting.delete(g); }
  }

  updateSelection(dt);
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

async function init() {
  const fonts = [
    '700 20px "Playfair Display"', '900 20px "Playfair Display"', 'italic 20px "Playfair Display"',
    '20px "Special Elite"', '20px "Share Tech Mono"', '20px "Crimson Text"', 'italic 20px "Crimson Text"',
  ];
  await Promise.race([
    Promise.all(fonts.map((f) => document.fonts.load(f))),
    new Promise((r) => setTimeout(r, 3000)),
  ]);
  const now = Date.now();
  for (const ft of faceTex.values()) ft.update(now, true);
  computeLayout();
  requestAnimationFrame(() => {
    frame();
    setTimeout(() => $('loader').classList.add('done'), 150);
  });
}
init();
