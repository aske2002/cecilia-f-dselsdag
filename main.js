import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { config } from './config.js';

// ── Renderer ──────────────────────────────────────────────────────────
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.4;
document.body.prepend(renderer.domElement);
const canvas = renderer.domElement;

// ── Scene & Camera ────────────────────────────────────────────────────
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0d0d1a);
scene.fog = new THREE.FogExp2(0x0d0d1a, 0.05);

const camera = new THREE.PerspectiveCamera(
  75, window.innerWidth / window.innerHeight, 0.05, 60
);
camera.position.set(
  config.start.x,
  config.bounds.floorY + config.cameraHeight,
  config.start.z
);

// ── Lighting ──────────────────────────────────────────────────────────
scene.add(new THREE.AmbientLight(0xfff0f8, 0.9));
const sun = new THREE.DirectionalLight(0xffd9f0, 1.0);
sun.position.set(3, 8, 4);
sun.castShadow = true;
sun.shadow.mapSize.setScalar(1024);
sun.shadow.camera.near = 0.1;
sun.shadow.camera.far  = 20;
scene.add(sun);

// ── Game state ────────────────────────────────────────────────────────
// Progression: 'find_card' → 'find_gift' (increments giftIndex) → 'celebrate'
let state      = 'find_card';
let giftIndex  = 0;

// ── Camera navigation ─────────────────────────────────────────────────
// walkTarget stores X and Z (as Vector2.x / .y) the camera smoothly walks to
const walkTarget = new THREE.Vector2(config.start.x, config.start.z);
let yaw   = config.start.yaw   ?? 0;
let pitch = config.start.pitch ?? 0;

// Infinite floor plane at floorY used for click-to-move projection
const floorPlane = new THREE.Plane(
  new THREE.Vector3(0, 1, 0), -config.bounds.floorY
);

// ── Interactables registry ────────────────────────────────────────────
// { mesh: THREE.Group, type: 'card'|'gift', index?: number, baseY: number }
const interactables = [];

// ── Build envelope (card) ─────────────────────────────────────────────
function buildEnvelope() {
  const g = new THREE.Group();

  // Main body
  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0xfff8e1, emissive: 0xffe57f, emissiveIntensity: 0.4, roughness: 0.5,
  });
  g.add(new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.22, 0.05), bodyMat));

  // V-shaped flap on top face
  const verts = new Float32Array([
    -0.15,  0.11, 0.028,
     0.15,  0.11, 0.028,
     0.00, -0.01, 0.030,
  ]);
  const flapGeo = new THREE.BufferGeometry();
  flapGeo.setAttribute('position', new THREE.BufferAttribute(verts, 3));
  flapGeo.computeVertexNormals();
  const flapMat = new THREE.MeshStandardMaterial({
    color: 0xffd54f, emissive: 0xffd54f, emissiveIntensity: 0.3, side: THREE.DoubleSide,
  });
  g.add(new THREE.Mesh(flapGeo, flapMat));

  // Glow point light
  const glow = new THREE.PointLight(0xffe082, 2.5, 0.75);
  glow.position.set(0, 0, 0.4);
  g.add(glow);

  return g;
}

// ── Build gift box ────────────────────────────────────────────────────
function buildGiftBox(hexColor) {
  const g = new THREE.Group();
  const s = 0.24;

  const boxMat = new THREE.MeshStandardMaterial({
    color: hexColor, emissive: hexColor, emissiveIntensity: 0.22, roughness: 0.45,
  });
  g.add(new THREE.Mesh(new THREE.BoxGeometry(s, s, s), boxMat));

  const ribMat = new THREE.MeshStandardMaterial({
    color: 0xffd700, emissive: 0xffd700, emissiveIntensity: 0.55, roughness: 0.3,
  });

  // Two ribbon strips crossing over all four sides
  g.add(new THREE.Mesh(new THREE.BoxGeometry(s + 0.02, 0.03, 0.03), ribMat));
  g.add(new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, s + 0.02), ribMat));

  // Bow on top
  const bow = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), ribMat);
  bow.position.y = s / 2 + 0.025;
  g.add(bow);

  // Glow point light with gift colour
  const glow = new THREE.PointLight(hexColor, 2.2, 2.0);
  glow.position.set(0, 0.25, 0);
  g.add(glow);

  return g;
}

// ── Load room.glb ─────────────────────────────────────────────────────
const loader = new GLTFLoader();
loader.load(
  config.roomFile,
  (gltf) => {
    gltf.scene.traverse((n) => {
      if (n.isMesh) { n.castShadow = true; n.receiveShadow = true; }
    });
    scene.add(gltf.scene);

    // Place card (envelope)
    const env = buildEnvelope();
    env.position.set(config.card.position.x, config.card.position.y, config.card.position.z);
    scene.add(env);
    interactables.push({ mesh: env, type: 'card', baseY: config.card.position.y });

    // Place all gift boxes, hidden until unlocked
    config.gifts.forEach((cfg, i) => {
      const box = buildGiftBox(cfg.color);
      box.position.set(cfg.position.x, cfg.position.y, cfg.position.z);
      box.visible = false;
      scene.add(box);
      interactables.push({ mesh: box, type: 'gift', index: i, baseY: cfg.position.y });
    });

    hideLoading();
  },
  ({ loaded, total }) => {
    if (total > 0) {
      document.querySelector('#loading p').textContent =
        `Indlæser… ${Math.round((loaded / total) * 100)} %`;
    }
  },
  (err) => {
    const p = document.querySelector('#loading p');
    p.textContent = '⚠️ Kunne ikke finde assets/room.glb – tjek at filen er lagt der.';
    p.style.color = '#ff8888';
    console.error(err);
  }
);

function hideLoading() {
  const el = document.getElementById('loading');
  el.style.opacity = '0';
  setTimeout(() => { el.style.display = 'none'; }, 800);
}

// ── Pointer input (works for both mouse and touch) ────────────────────
const raycaster = new THREE.Raycaster();
const ndc       = new THREE.Vector2();

let ptrDown   = false;
let dragging  = false;
let dragStart = { x: 0, y: 0 };
let lastPtr   = { x: 0, y: 0 };

canvas.addEventListener('pointerdown', (e) => {
  ptrDown = true; dragging = false;
  dragStart = lastPtr = { x: e.clientX, y: e.clientY };
});

canvas.addEventListener('pointermove', (e) => {
  if (ptrDown) {
    // Dragging → rotate look direction
    if (Math.hypot(e.clientX - dragStart.x, e.clientY - dragStart.y) > 6) {
      dragging = true;
    }
    if (dragging) {
      yaw   -= (e.clientX - lastPtr.x) * 0.005;
      pitch  = THREE.MathUtils.clamp(pitch - (e.clientY - lastPtr.y) * 0.005, -0.55, 0.55);
    }
    lastPtr = { x: e.clientX, y: e.clientY };
  } else {
    // Hover: change cursor when over an interactable
    ndc.set(
      (e.clientX / window.innerWidth)  *  2 - 1,
      (e.clientY / window.innerHeight) * -2 + 1
    );
    raycaster.setFromCamera(ndc, camera);
    const visible = interactables.filter(i => i.mesh.visible).map(i => i.mesh);
    canvas.style.cursor =
      raycaster.intersectObjects(visible, true).length > 0 ? 'pointer' : 'crosshair';
  }
});

canvas.addEventListener('pointerup', (e) => {
  if (!dragging) handleClick(e);
  ptrDown = false; dragging = false;
});

canvas.addEventListener('pointercancel', () => { ptrDown = false; dragging = false; });

// ── Click handling ────────────────────────────────────────────────────
function handleClick(e) {
  // Ignore clicks while an overlay is open
  if (document.querySelector('.overlay.visible')) return;

  ndc.set(
    (e.clientX / window.innerWidth)  *  2 - 1,
    (e.clientY / window.innerHeight) * -2 + 1
  );
  raycaster.setFromCamera(ndc, camera);

  // 1. Check interactables first
  const visible = interactables.filter(i => i.mesh.visible).map(i => i.mesh);
  const hits    = raycaster.intersectObjects(visible, true);
  if (hits.length > 0) {
    // Walk up the object hierarchy to find the registered group
    const item = interactables.find(({ mesh }) => {
      let node = hits[0].object;
      while (node) { if (node === mesh) return true; node = node.parent; }
      return false;
    });
    if (item) { triggerInteraction(item); return; }
  }

  // 2. Project onto floor plane → move camera there
  const floorHit = new THREE.Vector3();
  if (raycaster.ray.intersectPlane(floorPlane, floorHit)) {
    walkTarget.set(
      THREE.MathUtils.clamp(floorHit.x, config.bounds.minX, config.bounds.maxX),
      THREE.MathUtils.clamp(floorHit.z, config.bounds.minZ, config.bounds.maxZ)
    );
  }
}

// ── Game logic ────────────────────────────────────────────────────────
function triggerInteraction(item) {
  if (item.type === 'card' && state === 'find_card') openCard();
  if (item.type === 'gift' && state === 'find_gift' && item.index === giftIndex) openGift(item.index);
}

function setHint(text) {
  const el = document.getElementById('hint');
  el.style.opacity = '0';
  setTimeout(() => { el.textContent = text; el.style.opacity = '1'; }, 300);
}

// — Card —
function openCard() {
  state = 'reading_card';
  document.getElementById('card-message').textContent = config.card.message;
  document.getElementById('card-overlay').classList.add('visible');
}

document.getElementById('card-btn').addEventListener('click', () => {
  document.getElementById('card-overlay').classList.remove('visible');
  interactables.find(i => i.type === 'card').mesh.visible = false;
  giftIndex = 0;
  state = 'find_gift';
  interactables.find(i => i.type === 'gift' && i.index === 0).mesh.visible = true;
  setHint(`Gave 1 af ${config.gifts.length} – find den svævende gavekasse 🎁`);
});

// — Gift clue —
function openGift(index) {
  state = 'reading_clue';
  document.getElementById('gift-label').textContent = `Gave ${index + 1} af ${config.gifts.length}`;
  document.getElementById('clue-message').textContent = config.gifts[index].clue;
  document.getElementById('clue-overlay').classList.add('visible');
}

document.getElementById('clue-btn').addEventListener('click', () => {
  document.getElementById('clue-overlay').classList.remove('visible');
  interactables.find(i => i.type === 'gift' && i.index === giftIndex).mesh.visible = false;
  giftIndex += 1;

  if (giftIndex < config.gifts.length) {
    state = 'find_gift';
    interactables.find(i => i.type === 'gift' && i.index === giftIndex).mesh.visible = true;
    setHint(`Gave ${giftIndex + 1} af ${config.gifts.length} – find den! 🎁`);
  } else {
    celebrate();
  }
});

// — Celebration —
function celebrate() {
  state = 'celebrate';
  document.getElementById('hint').style.opacity = '0';
  document.getElementById('celebrate-message').textContent = config.endMessage;
  document.getElementById('celebrate-overlay').classList.add('visible');
  launchConfetti();
}

// ── Confetti ──────────────────────────────────────────────────────────
function launchConfetti() {
  const cc  = document.getElementById('confetti-canvas');
  const ctx = cc.getContext('2d');
  cc.width  = window.innerWidth;
  cc.height = window.innerHeight;

  const COLORS = ['#ff6b9d', '#6bcbff', '#ffd700', '#98fb98', '#ff8c69', '#da70d6', '#ff6347'];
  const pieces = Array.from({ length: 140 }, () => ({
    x:     Math.random() * cc.width,
    y:    -Math.random() * cc.height,
    w:     Math.random() * 10 + 5,
    h:     Math.random() * 6  + 3,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    vx:   (Math.random() - 0.5) * 2.5,
    vy:    Math.random() * 3.5 + 1.5,
    angle: Math.random() * Math.PI * 2,
    va:   (Math.random() - 0.5) * 0.12,
  }));

  (function draw() {
    ctx.clearRect(0, 0, cc.width, cc.height);
    for (const p of pieces) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
      p.x += p.vx;  p.y += p.vy;  p.angle += p.va;
      if (p.y > cc.height) { p.y = -10; p.x = Math.random() * cc.width; }
    }
    requestAnimationFrame(draw);
  })();
}

// ── Render loop ───────────────────────────────────────────────────────
const clock     = new THREE.Clock();
const _lookDir  = new THREE.Vector3();
const _lookAt   = new THREE.Vector3();
const _camTarget = new THREE.Vector3();

(function animate() {
  requestAnimationFrame(animate);
  const t = clock.getElapsedTime();

  // Smooth camera walk (walkTarget.y holds the Z coordinate)
  _camTarget.set(
    walkTarget.x,
    config.bounds.floorY + config.cameraHeight,
    walkTarget.y
  );
  camera.position.lerp(_camTarget, 0.07);

  // Apply first-person look direction from yaw & pitch
  _lookDir.set(
    Math.sin(yaw) * Math.cos(pitch),
    Math.sin(pitch),
    Math.cos(yaw) * Math.cos(pitch)
  );
  _lookAt.copy(camera.position).addScaledVector(_lookDir, 1);
  camera.lookAt(_lookAt);

  // Bob and slowly spin all visible interactables
  for (const item of interactables) {
    if (!item.mesh.visible) continue;
    item.mesh.position.y = item.baseY + Math.sin(t * 1.8 + item.mesh.id * 1.1) * 0.06;
    item.mesh.rotation.y = t * 0.55;
  }

  renderer.render(scene, camera);
})();

// ── Resize ────────────────────────────────────────────────────────────
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});
