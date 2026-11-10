// "WHAT IF... you could be invisible" — PS1-style short, rendered frame-by-frame.
// window.renderFrame(t) draws the frame at time t (seconds) and returns RGBA bytes (base64).
import * as THREE from 'three';

const W = 270, H = 480;                // internal PS1-ish resolution (upscaled 4x → 1080x1920)
const TL = await (await fetch('./timeline.json')).json();
THREE.ColorManagement.enabled = false;

const glCanvas = document.getElementById('gl');
const out = document.getElementById('out');
out.width = W; out.height = H;
const octx = out.getContext('2d', { willReadFrequently: true });
const renderer = new THREE.WebGLRenderer({ canvas: glCanvas, antialias: false, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.setSize(W, H, false);
renderer.outputColorSpace = THREE.LinearSRGBColorSpace;

// ---------- helpers ----------
function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;
const hash = (n) => { const s = Math.sin(n * 127.1) * 43758.5453; return s - Math.floor(s); };

function tex(w, h, draw, rep = [1, 1]) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'); draw(g, w, h);
  const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false;
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep[0], rep[1]);
  return t;
}
function noiseFill(g, w, h, base, amt, seed) {
  const r = rng(seed); const img = g.getImageData(0, 0, w, h);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (r() - 0.5) * amt;
    img.data[i] = clamp(base[0] + n, 0, 255); img.data[i + 1] = clamp(base[1] + n, 0, 255); img.data[i + 2] = clamp(base[2] + n, 0, 255); img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
}

// PS1 shader patch: vertex snapping to the low-res pixel grid + affine (non-perspective) texture mapping.
function ps1(m) {
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uSnap = { value: new THREE.Vector2(W / 2.5, H / 2.5) };
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nuniform vec2 uSnap;\nvarying float vAffW;')
      .replace('#include <project_vertex>', `#include <project_vertex>
        { vec4 sp = gl_Position; sp.xy = floor(sp.xy / sp.w * uSnap + 0.5) / uSnap * sp.w; gl_Position = sp; }
        vAffW = gl_Position.w;
        #ifdef USE_MAP
          vMapUv *= vAffW;
        #endif`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vAffW;')
      .replace('#include <map_fragment>', `#ifdef USE_MAP
          diffuseColor *= texture2D(map, vMapUv / vAffW);
        #endif`);
  };
  return m;
}
const lam = (o) => ps1(new THREE.MeshLambertMaterial(o));
const bas = (o) => ps1(new THREE.MeshBasicMaterial(o));
function box(w, h, d, mat, x = 0, y = 0, z = 0, parent) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); if (parent) parent.add(m); return m;
}
function plane(w, h, mat, segs = 6) { return new THREE.Mesh(new THREE.PlaneGeometry(w, h, segs, segs), mat); }

// ---------- textures ----------
const T = {};
T.asphalt = (rep) => tex(32, 32, (g, w, h) => { noiseFill(g, w, h, [58, 58, 62], 30, 1); }, rep);
T.concrete = (rep, seed = 2) => tex(32, 32, (g, w, h) => { noiseFill(g, w, h, [120, 118, 112], 26, seed); g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(0, 0, w, 1); g.fillRect(0, 0, 1, h); }, rep);
T.facade = (night, seed, rep) => tex(32, 32, (g, w, h) => {
  noiseFill(g, w, h, night ? [70, 68, 74] : [150, 140, 128], 20, seed);
  const r = rng(seed + 7);
  for (let yy = 0; yy < 2; yy++) for (let xx = 0; xx < 2; xx++) {
    const lit = night && r() < 0.35;
    g.fillStyle = night ? (lit ? '#e8c66a' : '#141826') : '#3d4f63'; g.fillRect(xx * 16 + 4, yy * 16 + 4, 9, 10);
    g.fillStyle = 'rgba(0,0,0,.5)'; g.fillRect(xx * 16 + 4, yy * 16 + 14, 9, 1);
    if (!night) { g.fillStyle = 'rgba(255,255,255,.25)'; g.fillRect(xx * 16 + 5, yy * 16 + 5, 2, 4); }
  }
}, rep);
T.facadeGlow = (seed, rep) => tex(32, 32, (g) => {
  g.fillStyle = '#000'; g.fillRect(0, 0, 32, 32); const r = rng(seed + 7);
  for (let yy = 0; yy < 2; yy++) for (let xx = 0; xx < 2; xx++) if (r() < 0.35) { g.fillStyle = '#c9a050'; g.fillRect(xx * 16 + 4, yy * 16 + 4, 9, 10); }
}, rep);
T.wallpaper = (rep, base = [92, 110, 84]) => tex(32, 32, (g, w, h) => {
  noiseFill(g, w, h, base, 14, 3);
  g.fillStyle = 'rgba(0,0,0,.18)'; for (let x = 0; x < w; x += 8) g.fillRect(x, 0, 2, h);
  g.fillStyle = 'rgba(255,240,200,.15)'; for (let y = 4; y < h; y += 8) for (let x = 4; x < w; x += 8) g.fillRect(x + ((y / 8) % 2) * 2, y, 2, 2);
  g.fillStyle = 'rgba(40,30,10,.25)'; g.fillRect(20, 18, 6, 12);
}, rep);
T.wood = (rep) => tex(32, 32, (g, w, h) => {
  noiseFill(g, w, h, [104, 70, 44], 18, 4);
  g.fillStyle = 'rgba(0,0,0,.35)'; for (let y = 0; y < h; y += 8) g.fillRect(0, y, w, 1);
  g.fillStyle = 'rgba(0,0,0,.2)'; for (let y = 0; y < h; y += 8) g.fillRect((y * 5) % w, y, 1, 8);
}, rep);
T.tiles = (rep) => tex(32, 32, (g, w, h) => {
  noiseFill(g, w, h, [196, 204, 200], 12, 5);
  g.fillStyle = '#7d8580'; for (let i = 0; i < 32; i += 8) { g.fillRect(i, 0, 1, 32); g.fillRect(0, i, 32, 1); }
  g.fillStyle = 'rgba(90,80,40,.25)'; g.fillRect(9, 17, 6, 6);
}, rep);
T.blanket = (rep) => tex(32, 32, (g) => {
  g.fillStyle = '#5a2a2e'; g.fillRect(0, 0, 32, 32);
  g.fillStyle = 'rgba(30,40,70,.6)'; for (let i = 0; i < 32; i += 8) { g.fillRect(i, 0, 3, 32); g.fillRect(0, i, 32, 3); }
  g.fillStyle = 'rgba(220,200,150,.25)'; for (let i = 4; i < 32; i += 8) { g.fillRect(i, 0, 1, 32); g.fillRect(0, i, 32, 1); }
}, rep);
T.stripes = (rep) => tex(16, 16, (g) => { g.fillStyle = '#7e8fa8'; g.fillRect(0, 0, 16, 16); g.fillStyle = '#3e4c68'; for (let x = 0; x < 16; x += 4) g.fillRect(x, 0, 2, 16); }, rep);
T.dust = (rep) => tex(64, 64, (g, w, h) => {
  noiseFill(g, w, h, [104, 98, 88], 22, 6); const r = rng(9);
  for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(${r() < .5 ? '40,35,30' : '170,160,140'},.3)`; g.fillRect(r() * w | 0, r() * h | 0, 1 + r() * 3 | 0, 1 + r() * 3 | 0); }
}, rep);
T.door = () => tex(16, 32, (g, w, h) => {
  noiseFill(g, w, h, [86, 60, 42], 16, 8); g.fillStyle = 'rgba(0,0,0,.35)';
  g.fillRect(2, 3, 12, 10); g.fillRect(2, 17, 12, 12); g.fillStyle = '#c8b060'; g.fillRect(12, 16, 2, 2);
  g.fillStyle = '#e8e0c0'; g.fillRect(6, 1, 4, 2);
});
T.footprint = () => tex(16, 32, (g) => {
  g.clearRect(0, 0, 16, 32); g.fillStyle = 'rgba(20,14,10,.85)';
  g.beginPath(); g.ellipse(8, 20, 5, 9, 0, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.ellipse(8, 8, 4, 3, 0, 0, Math.PI * 2); g.fill();
  [[3, 3], [6, 1.5], [9, 1.5], [12, 2.5], [14, 4.5]].forEach(([x, y]) => { g.beginPath(); g.arc(x, y + 1, 1.3, 0, 7); g.fill(); });
});
T.moon = () => tex(16, 16, (g) => { g.fillStyle = '#0b1020'; g.fillRect(0, 0, 16, 16); g.fillStyle = '#5a6f9a'; g.fillRect(1, 1, 14, 14); g.fillStyle = '#20283d'; g.fillRect(7, 1, 1, 14); g.fillRect(1, 7, 14, 1); });
T.poster = () => tex(16, 24, (g) => { noiseFill(g, 16, 24, [170, 60, 50], 20, 11); g.fillStyle = '#e8d8a0'; g.fillRect(3, 3, 10, 2); g.fillStyle = '#201818'; g.fillRect(5, 8, 6, 10); });

// ---------- low-poly person ----------
function person(pal, seed = 1) {
  const r = rng(seed); const g = new THREE.Group();
  const skin = lam({ color: pal.skin ?? 0xc89a7a }), shirt = lam({ color: pal.shirt }), pants = lam({ color: pal.pants }), hair = lam({ color: pal.hair ?? 0x2a1d14 });
  const s = 0.92 + r() * 0.16; g.scale.setScalar(s);
  const legs = [], arms = [];
  for (const sx of [-1, 1]) {
    const hip = new THREE.Group(); hip.position.set(sx * 0.12, 0.88, 0); g.add(hip);
    box(0.17, 0.86, 0.2, pants, 0, -0.43, 0, hip); box(0.18, 0.08, 0.28, lam({ color: 0x1a1a1a }), 0, -0.86, 0.04, hip); legs.push(hip);
    const sh = new THREE.Group(); sh.position.set(sx * 0.33, 1.5, 0); g.add(sh);
    box(0.13, 0.6, 0.15, shirt, 0, -0.28, 0, sh); box(0.11, 0.12, 0.12, skin, 0, -0.64, 0, sh); arms.push(sh);
  }
  box(0.52, 0.66, 0.28, shirt, 0, 1.22, 0, g);
  const head = new THREE.Group(); head.position.set(0, 1.72, 0); g.add(head);
  box(0.26, 0.3, 0.27, skin, 0, 0.02, 0, head); box(0.28, 0.1, 0.29, hair, 0, 0.17, -0.01, head); box(0.28, 0.24, 0.08, hair, 0, 0.06, -0.12, head);
  g.userData = { legs, arms, head, phase: r() * 6.28 };
  g.walk = (p, amp = 0.5) => { legs[0].rotation.x = Math.sin(p) * amp; legs[1].rotation.x = -Math.sin(p) * amp; arms[0].rotation.x = -Math.sin(p) * amp * 0.8; arms[1].rotation.x = Math.sin(p) * amp * 0.8; };
  return g;
}

// ---------- scenes ----------
const S = {};

// 1. Night exterior with rain
S.exterior = (() => {
  const sc = new THREE.Scene(); sc.background = new THREE.Color(0x0c1222); sc.fog = new THREE.Fog(0x0c1222, 10, 60);
  const cam = new THREE.PerspectiveCamera(60, W / H, 0.1, 80);
  sc.add(new THREE.HemisphereLight(0x6a7ab8, 0x141420, 1.3));
  const moon = new THREE.DirectionalLight(0x90a0d0, 1.1); moon.position.set(-3, 10, 6); sc.add(moon);
  const ground = plane(60, 60, lam({ map: T.asphalt([20, 20]) }), 12); ground.rotation.x = -Math.PI / 2; sc.add(ground);
  const walk = plane(60, 3, lam({ map: T.concrete([30, 2]) }), 10); walk.rotation.x = -Math.PI / 2; walk.position.set(0, 0.02, -8); sc.add(walk);
  const bld = (x, z, w, h, d, seed) => {
    const m = lam({ map: T.facade(true, seed, [w / 3, h / 3]), emissive: 0xffffff, emissiveMap: T.facadeGlow(seed, [w / 3, h / 3]) });
    box(w, h, d, m, x, h / 2, z, sc);
  };
  bld(0, -16, 14, 21, 10, 3); bld(-14, -18, 10, 15, 10, 5); bld(14, -19, 11, 27, 10, 6); bld(-24, -10, 8, 9, 10, 9);
  // the window we push into
  const win = box(1.4, 1.5, 0.05, bas({ color: 0xe0b060 }), 1.5, 7.5, -10.97, sc);
  box(0.08, 1.5, 0.08, bas({ color: 0x302010 }), 1.5, 7.5, -10.92, sc); box(1.4, 0.08, 0.08, bas({ color: 0x302010 }), 1.5, 7.5, -10.92, sc);
  // street lamp
  box(0.12, 5, 0.12, lam({ color: 0x303034 }), -3, 2.5, -7, sc); box(1.2, 0.1, 0.1, lam({ color: 0x303034 }), -2.5, 5, -7, sc);
  box(0.4, 0.15, 0.3, bas({ color: 0xffc070 }), -2, 4.92, -7, sc);
  const lamp = new THREE.PointLight(0xffa850, 3, 14, 1.2); lamp.position.set(-2, 4.6, -7); sc.add(lamp);
  // rain
  const N = 1400, pos = new Float32Array(N * 3), seeds = []; const r = rng(42);
  for (let i = 0; i < N; i++) seeds.push([r() * 24 - 12, r() * 14, r() * 24 - 18, r()]);
  const rg = new THREE.BufferGeometry(); rg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const rain = new THREE.Points(rg, new THREE.PointsMaterial({ color: 0x8090b0, size: 1, sizeAttenuation: false })); rain.frustumCulled = false; sc.add(rain);
  return {
    sc, cam, update(t) {
      const k = smooth(0, 4.6, t);
      cam.position.set(lerp(0, 1.2, k), lerp(1.6, 6.2, k), lerp(9, -2, k * 0.85));
      cam.lookAt(lerp(0, 1.5, k), lerp(6, 7.4, k), -11);
      for (let i = 0; i < N; i++) { const s = seeds[i]; pos[i * 3] = s[0] + cam.position.x; pos[i * 3 + 1] = 14 - ((s[1] + t * 11) % 14); pos[i * 3 + 2] = s[2] + cam.position.z; }
      rg.attributes.position.needsUpdate = true;
      lamp.intensity = 3 + Math.sin(t * 40) * 0.15;
    }
  };
})();

// 2. Bedroom, first-person: your hands fade away
S.bedroom = (() => {
  const sc = new THREE.Scene(); sc.background = new THREE.Color(0x05060a); sc.fog = new THREE.Fog(0x05060a, 3, 9);
  const cam = new THREE.PerspectiveCamera(62, W / H, 0.05, 30); sc.add(cam);
  sc.add(new THREE.AmbientLight(0x5a64a0, 0.9));
  const lampL = new THREE.PointLight(0xffb060, 2.2, 5, 1.3); lampL.position.set(-1.1, 1.0, -1.0); sc.add(lampL);
  const moonL = new THREE.PointLight(0x6080d0, 1.6, 6, 1); moonL.position.set(1.4, 1.8, -2.2); sc.add(moonL);
  const wall = lam({ map: T.wallpaper([3, 2], [84, 92, 120]) });
  const floor = plane(5, 5, lam({ map: T.wood([5, 5]) })); floor.rotation.x = -Math.PI / 2; sc.add(floor);
  const back = plane(5, 3, wall); back.position.set(0, 1.5, -2.5); sc.add(back);
  const left = plane(5, 3, wall); left.rotation.y = Math.PI / 2; left.position.set(-2.5, 1.5, 0); sc.add(left);
  const right = plane(5, 3, wall); right.rotation.y = -Math.PI / 2; right.position.set(2.5, 1.5, 0); sc.add(right);
  // window with moon
  box(1.1, 1.2, 0.02, bas({ map: T.moon() }), 1.2, 1.7, -2.48, sc);
  // poster, bed, nightstand + lamp
  box(0.5, 0.75, 0.02, lam({ map: T.poster() }), -0.6, 1.8, -2.48, sc);
  box(1.6, 0.45, 2.6, lam({ color: 0x4a3020 }), 0, 0.22, -0.4, sc);
  box(1.55, 0.18, 2.4, lam({ map: T.blanket([2, 3]) }), 0, 0.53, -0.5, sc);
  box(1.6, 1.0, 0.1, lam({ map: T.wood([1, 1]) }), 0, 0.5, -1.75, sc);
  box(0.5, 0.55, 0.45, lam({ map: T.wood([1, 1]) }), -1.15, 0.28, -1.2, sc);
  box(0.16, 0.25, 0.16, bas({ color: 0xffd090 }), -1.15, 0.7, -1.2, sc);
  // hands attached to camera
  const skin = lam({ color: 0xd4a888, transparent: true }), sleeve = lam({ map: T.stripes([1, 2]), transparent: true });
  const mats = [skin, sleeve]; const hands = new THREE.Group(); cam.add(hands);
  const handL = new THREE.PointLight(0xffc890, 1.4, 1.5, 1); handL.position.set(-0.3, 0.25, -0.1); cam.add(handL);
  for (const sx of [-1, 1]) {
    const h = new THREE.Group(); h.position.set(sx * 0.075, -0.12, -0.46); h.rotation.set(-0.45, sx * 0.3, sx * 0.3); hands.add(h);
    box(0.09, 0.07, 0.38, sleeve, 0, 0, 0.25, h);
    box(0.1, 0.035, 0.11, skin, 0, 0, 0.0, h);
    for (let f = 0; f < 4; f++) box(0.018, 0.022, 0.07, skin, -0.035 + f * 0.023, 0, -0.085 + Math.abs(f - 1.5) * 0.008, h);
    box(0.02, 0.022, 0.06, skin, sx * -0.055, 0, -0.02, h).rotation.y = sx * 0.6;
  }
  return {
    sc, cam, update(t, lt) {
      const breathe = Math.sin(t * 1.4) * 0.01;
      cam.position.set(0, 1.25 + breathe, 0.75); cam.rotation.set(-0.5 + lt * 0.015, 0, 0);
      hands.position.y = Math.sin(t * 1.4 + 1) * 0.008;
      hands.rotation.x = smooth(0, 2, lt) * 0.12;
      // fade: flicker then gone
      let op = 1 - smooth(2.6, 4.6, lt);
      if (lt > 2.2 && lt < 4.8) op *= (hash(Math.floor(t * 18)) > 0.25 ? 1 : 0.35);
      mats.forEach(m => { m.opacity = op; m.depthWrite = op > 0.95; });
      hands.visible = op > 0.01;
      lampL.intensity = 2.2 + Math.sin(t * 7) * 0.08;
    }
  };
})();

// 3. Bathroom: empty mirror, floating toothbrush
S.bathroom = (() => {
  const sc = new THREE.Scene(); sc.background = new THREE.Color(0x0a0c0c); sc.fog = new THREE.Fog(0x0a0c0c, 4, 12);
  const cam = new THREE.PerspectiveCamera(58, W / H, 0.05, 30);
  sc.add(new THREE.AmbientLight(0x707a78, 0.35));
  const MX = 0.7, MY0 = 1.05, MY1 = 2.05;
  const tileM = lam({ map: T.tiles([4, 3]) }), floorM = lam({ map: T.tiles([4, 4]) }), wallUp = lam({ map: T.wallpaper([3, 1], [150, 160, 150]) });
  const brushes = [];
  function room(g, real) {
    const L = new THREE.PointLight(0xe8f0e0, 2.4, 7, 1.1); L.position.set(0, 2.45, 1.5); g.add(L);
    const fl = plane(3, 3, floorM); fl.rotation.x = -Math.PI / 2; fl.position.set(0, 0, 1.5); g.add(fl);
    const ce = plane(3, 3, lam({ color: 0x8a8f88 })); ce.rotation.x = Math.PI / 2; ce.position.set(0, 2.6, 1.5); g.add(ce);
    for (const sx of [-1, 1]) { const w = plane(3, 2.6, tileM); w.rotation.y = -sx * Math.PI / 2; w.position.set(sx * 1.5, 1.3, 1.5); g.add(w); }
    const fw = plane(3, 2.6, tileM); fw.rotation.y = Math.PI; fw.position.set(0, 1.3, 3); g.add(fw);
    box(0.7, 1.9, 0.05, lam({ map: T.door() }), 0.6, 0.95, 2.97, g);
    if (real) { // back wall with a hole for the mirror
      const bw = (w, h, x, y) => { const p = plane(w, h, tileM, 3); p.position.set(x, y, 0); g.add(p); };
      bw(1.5 - MX, 2.6, -(1.5 + MX) / 2, 1.3); bw(1.5 - MX, 2.6, (1.5 + MX) / 2, 1.3);
      bw(2 * MX, MY0, 0, MY0 / 2); bw(2 * MX, 2.6 - MY1, 0, (2.6 + MY1) / 2);
    }
    // sink + shelf + glass
    box(0.9, 0.12, 0.5, lam({ color: 0xdfe4e0 }), 0, 0.85, 0.27, g); box(0.25, 0.8, 0.25, lam({ color: 0xcfd4d0 }), 0, 0.42, 0.2, g);
    box(0.05, 0.12, 0.05, lam({ color: 0x909890 }), 0, 0.97, 0.08, g);
    box(0.8, 0.03, 0.14, lam({ color: 0xc0c4c0 }), 0, 1.0, 0.07, g);
    box(0.07, 0.11, 0.07, lam({ color: 0x80a0b0 }), 0.3, 1.07, 0.07, g);
    box(0.12, 0.08, 0.08, lam({ color: 0xc04040 }), -0.28, 1.06, 0.07, g);
    // towel on the side wall
    box(0.04, 0.6, 0.4, lam({ color: 0x406a8a }), -1.46, 1.3, 1.2, g);
    // toothbrush (held by nobody)
    const tb = new THREE.Group(); g.add(tb);
    box(0.035, 0.035, 0.26, lam({ color: 0x3ab0e0 }), 0, 0, 0, tb); box(0.04, 0.05, 0.06, lam({ color: 0xffffff }), 0, 0.03, -0.11, tb);
    brushes.push(tb);
  }
  room(sc, true);
  const refl = new THREE.Group(); refl.scale.z = -1; sc.add(refl); room(refl, false);
  box(2 * MX + 0.1, 0.06, 0.06, lam({ color: 0x8a8a80 }), 0, MY0, 0.02, sc); box(2 * MX + 0.1, 0.06, 0.06, lam({ color: 0x8a8a80 }), 0, MY1, 0.02, sc);
  box(0.06, MY1 - MY0, 0.06, lam({ color: 0x8a8a80 }), -MX, (MY0 + MY1) / 2, 0.02, sc); box(0.06, MY1 - MY0, 0.06, lam({ color: 0x8a8a80 }), MX, (MY0 + MY1) / 2, 0.02, sc);
  const glass = plane(2 * MX, MY1 - MY0, new THREE.MeshBasicMaterial({ color: 0x9fc0c0, transparent: true, opacity: 0.12, depthWrite: false }), 1);
  glass.position.set(0, (MY0 + MY1) / 2, 0.005); sc.add(glass);
  return {
    sc, cam, update(t, lt) {
      const k = smooth(0, 5.2, lt);
      cam.position.set(lerp(0.6, 0.42, k), 1.62, lerp(2.8, 2.25, k)); cam.lookAt(-0.05, 1.45, 0);
      brushes.forEach(b => { b.position.set(-0.05 + Math.sin(lt * 9) * 0.035, 1.52 + Math.sin(lt * 1.3) * 0.01, 1.05); b.rotation.set(0.1, Math.PI / 2 + 0.25 + Math.sin(lt * 9) * 0.08, 0); });
      if (lt > 3.5) brushes.forEach(b => { b.position.y = 1.52 - smooth(3.5, 4.2, lt) * 0.66; b.position.z = 1.05 - smooth(3.5, 4.2, lt) * 0.6; b.rotation.z = smooth(3.5, 4.2, lt) * 1.2; });
    }
  };
})();

// 4+5. Street: walking through the crowd, then the world dims
S.street = (() => {
  const sc = new THREE.Scene(); const sky = new THREE.Color(0x9aa6b4); sc.background = sky; sc.fog = new THREE.Fog(0x9aa6b4, 10, 55);
  const cam = new THREE.PerspectiveCamera(62, W / H, 0.1, 90);
  const hemi = new THREE.HemisphereLight(0xdde4f0, 0x6a6458, 1.0); sc.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff0d8, 0.9); sun.position.set(4, 10, 3); sc.add(sun);
  const gr = plane(14, 200, lam({ map: T.concrete([8, 110], 12) }), 20); gr.rotation.x = -Math.PI / 2; gr.position.z = -60; sc.add(gr);
  const r = rng(77);
  for (const sx of [-1, 1]) for (let z = 20, i = 0; z > -150; i++) {
    const d = 6 + r() * 6, h = 8 + r() * 14, seed = 20 + i * 2 + (sx > 0 ? 1 : 0);
    box(6, h, d, lam({ map: T.facade(false, seed, [2, h / 3]) }), sx * 10, h / 2, z - d / 2, sc);
    if (r() < 0.5) box(0.8, 0.5, 2.4, lam({ color: [0xa03030, 0x306a50, 0x404880][i % 3] }), sx * 6.8, 3, z - d / 2, sc); // awnings
    z -= d + 0.2;
  }
  for (let z = 10; z > -150; z -= 9) { box(0.1, 3.2, 0.1, lam({ color: 0x2c2c30 }), 5.6, 1.6, z, sc); box(0.3, 0.2, 0.3, lam({ color: 0x444448 }), 5.6, 3.2, z, sc); }
  const pals = [[0x7a2a2a, 0x22263a], [0x30506a, 0x3a3228], [0xb09050, 0x2a2a2a], [0x4a6a3a, 0x50443a], [0x6a6a70, 0x1c1c28], [0xa04a6a, 0x303046], [0x2a2a2a, 0x5a5048]];
  const crowd = [];
  for (let i = 0; i < 26; i++) {
    const p = pals[i % pals.length]; const g = person({ shirt: p[0], pants: p[1], hair: [0x2a1d14, 0x5a3a20, 0x111111, 0x8a7a60][i % 4], skin: [0xc89a7a, 0x8a5a3a, 0xe0b090][i % 3] }, 100 + i);
    const dir = i % 3 === 0 ? -1 : 1; // +1 walks toward camera
    g.userData.dir = dir; g.userData.x = (r() * 2 - 1) * 3.2; g.userData.z0 = -6 - r() * 70; g.userData.v = 1.0 + r() * 0.5;
    if (i < 4) { g.userData.x = [0.05, -0.6, 0.5, -0.2][i]; g.userData.z0 = [-14, -22, -31, -40][i]; g.userData.dir = 1; }
    g.rotation.y = dir > 0 ? 0 : Math.PI; sc.add(g); crowd.push(g);
  }
  const base = { sky: sky.clone(), hemi: hemi.intensity, sun: sun.intensity };
  return {
    sc, cam, crowd, update(t, lt, dim = 0) {
      const camZ = -lt * 1.35;
      const bob = Math.sin(lt * 7.2) * 0.035 * (1 - dim * 0.6);
      cam.position.set(Math.sin(lt * 3.6) * 0.03, 1.62 + bob, camZ);
      cam.lookAt(Math.sin(lt * 0.4) * 0.6, 1.55 - dim * 0.25, camZ - 10);
      for (const g of crowd) {
        const u = g.userData; const z = u.z0 + u.dir * u.v * lt;
        g.position.set(u.x, 0, z); g.walk(lt * u.v * 5.2 + u.phase, 0.5);
        g.userData.head.rotation.y = 0; // nobody looks
      }
      const c = base.sky.clone().lerp(new THREE.Color(0x15161a), dim); sc.background = c; sc.fog.color = c;
      sc.fog.near = lerp(10, 0.5, dim); sc.fog.far = lerp(55, 7, dim);
      hemi.intensity = lerp(base.hemi, 0.25, dim); sun.intensity = lerp(base.sun, 0.05, dim);
    }
  };
})();

// 6–9. Corridor: flicker, footprints, eyes
S.corridor = (() => {
  const sc = new THREE.Scene(); sc.background = new THREE.Color(0x020203); sc.fog = new THREE.Fog(0x020203, 2.5, 20);
  const cam = new THREE.PerspectiveCamera(62, W / H, 0.05, 40);
  const amb = new THREE.AmbientLight(0x404a5a, 0.9); sc.add(amb);
  const LEN = 30;
  const fl = plane(2.4, LEN, lam({ map: T.dust([3, 30]) }), 24); fl.rotation.x = -Math.PI / 2; fl.position.z = -LEN / 2 + 2; sc.add(fl);
  const ce = plane(2.4, LEN, lam({ map: T.concrete([3, 30], 31) }), 24); ce.rotation.x = Math.PI / 2; ce.position.set(0, 2.7, -LEN / 2 + 2); sc.add(ce);
  const wm = lam({ map: T.wallpaper([20, 2], [78, 86, 62]) });
  for (const sx of [-1, 1]) { const w = plane(LEN, 2.7, wm, 24); w.rotation.y = -sx * Math.PI / 2; w.position.set(sx * 1.2, 1.35, -LEN / 2 + 2); sc.add(w); }
  const endW = plane(2.4, 2.7, wm, 2); endW.position.set(0, 1.35, -LEN + 2); sc.add(endW);
  const dm = lam({ map: T.door() });
  for (let z = -1.5, i = 0; z > -LEN + 3; z -= 3.3, i++) box(0.05, 2.0, 0.9, dm, (i % 2 ? 1 : -1) * 1.17, 1.0, z, sc);
  const lamps = [];
  for (let i = 0; i < 4; i++) {
    const z = -1 - i * 5.5; const fx = box(0.5, 0.06, 0.16, bas({ color: 0xd8e0c8 }), 0, 2.66, z, sc);
    const L = new THREE.PointLight(0xc8d8b0, 3.0, 8, 1.1); L.position.set(0, 2.4, z); sc.add(L); lamps.push({ L, fx, z });
  }
  // footprints approaching
  const fpTex = T.footprint(); const prints = [];
  for (let i = 0; i < 10; i++) {
    const m = new THREE.MeshBasicMaterial({ map: fpTex, transparent: true, opacity: 0, depthWrite: false });
    const p = new THREE.Mesh(new THREE.PlaneGeometry(0.13, 0.28), m); p.rotation.x = -Math.PI / 2;
    p.position.set((i % 2 ? 0.14 : -0.14), 0.006, -5.4 + i * 0.55); sc.add(p); prints.push(p);
  }
  const dustN = 120, dpos = new Float32Array(dustN * 3); const dg = new THREE.BufferGeometry(); dg.setAttribute('position', new THREE.BufferAttribute(dpos, 3));
  const dust = new THREE.Points(dg, new THREE.PointsMaterial({ color: 0xa09888, size: 1, sizeAttenuation: false })); dust.frustumCulled = false; sc.add(dust);
  // the watchers: barely visible silhouettes + glowing eyes
  const watchers = []; const r = rng(5);
  const darkM = lam({ color: 0x0c0c0e, transparent: true, opacity: 0.0 });
  const eyeM = new THREE.MeshBasicMaterial({ color: 0xf4f4e8, fog: false });
  for (let i = 0; i < 26; i++) {
    const g = new THREE.Group(); const body = person({ shirt: 0x0c0c0e, pants: 0x0c0c0e, hair: 0x0c0c0e, skin: 0x0c0c0e }, 300 + i);
    body.traverse(o => { if (o.isMesh) o.material = darkM; }); g.add(body);
    const eyes = new THREE.Group(); eyes.position.set(0, 1.74, 0.14); g.add(eyes);
    box(0.065, 0.03, 0.01, eyeM, -0.065, 0, 0, eyes); box(0.065, 0.03, 0.01, eyeM, 0.065, 0, 0, eyes);
    let x, z;
    if (i < 3) { x = [0.35, -0.5, 0.0][i]; z = [-2.6, -3.6, -1.7][i]; }
    else { x = (r() * 2 - 1) * 0.9; z = -2 - r() * 18; }
    g.position.set(x, -0.05 + r() * 0.1, z); g.userData = { appear: 0.4 + i * 0.27 + r() * 0.3, eyes, blink: r() * 10, vanish: 0.25 + r() * 1.4, body };
    g.visible = false; sc.add(g); watchers.push(g);
  }
  return {
    sc, cam, update(t, phase, lt) {
      // flicker lights (die out in the eyes phase)
      const off = phase === 'eyes' ? smooth(0, 1.0, lt) : phase === 'ending' ? 1 : 0;
      lamps.forEach((l, i) => {
        const f = hash(Math.floor(t * 14) + i * 31); let on = f > 0.18 ? 1 : 0.08;
        if (i === 1 && hash(Math.floor(t * 6) + 9) < 0.35) on = 0.05;
        const v = on * (1 - off); l.L.intensity = 3.0 * v; l.fx.material.color.setScalar(0.1 + 0.75 * v);
      });
      amb.intensity = 0.9 * (1 - off * 0.9);
      watchers.forEach(w => { w.visible = false; });
      prints.forEach(p => { p.material.opacity = 0; });
      dpos.fill(-100);
      if (phase === 'corridor') {
        cam.position.set(0, 1.62 + Math.sin(t * 1.2) * 0.01, 1.5 - lt * 0.12);
        cam.lookAt(Math.sin(lt * 0.5) * 0.25, 1.5, -10);
        sc.fog.far = 16;
      } else if (phase === 'footprints') {
        cam.position.set(0, 1.62, 0.3); cam.lookAt(0, 0, -2.6 + smooth(0, 4.8, lt) * 1.6);
        prints.forEach((p, i) => {
          const a = 0.2 + i * 0.42; const o = smooth(a, a + 0.08, lt); p.material.opacity = o * 0.85;
          if (lt > a && lt < a + 0.6) for (let d = 0; d < 12; d++) { const k = i * 12 + d; if (k >= dustN) break; const e = (lt - a) / 0.6; dpos[k * 3] = p.position.x + (hash(k) - 0.5) * 0.3 * e; dpos[k * 3 + 1] = 0.02 + hash(k + 5) * 0.12 * e; dpos[k * 3 + 2] = p.position.z + (hash(k + 9) - 0.5) * 0.3 * e; }
        });
        dg.attributes.position.needsUpdate = true;
      } else if (phase === 'eyes' || phase === 'ending') {
        prints.forEach(p => { p.material.opacity = 0.85; });
        const tt = phase === 'eyes' ? lt : 9.2 + lt;
        cam.position.set(0, 1.62, 0.3);
        const yaw = Math.sin(tt * 0.35) * 0.35, pitch = 0.02;
        cam.lookAt(Math.sin(yaw) * 5, 1.62 + pitch * 5, 0.3 - Math.cos(yaw) * 5);
        const look = smooth(6.0, 6.8, tt);            // "они видят тебя": all turn toward you
        darkM.opacity = 0.35 * smooth(3, 7, tt);
        watchers.forEach(w => {
          const u = w.userData; if (tt < u.appear) return;
          if (phase === 'ending' && lt > 0.6 + u.vanish) return; // eyes go out one by one
          w.visible = true;
          const targetYaw = Math.atan2(cam.position.x - w.position.x, cam.position.z - w.position.z);
          const idle = Math.sin(tt * 0.6 + u.blink) * 0.6;
          w.rotation.y = lerp(idle, targetYaw, look);
          const bl = ((tt + u.blink) % 3.7) < 0.12 ? 0.1 : 1;
          const pop = smooth(u.appear, u.appear + 0.15, tt);
          u.eyes.scale.set(1, bl * pop * (1 + look * 0.4), 1);
          if (look > 0) w.position.z += 0; // keep
        });
      }
    }
  };
})();

// ---------- text ----------
const tcan = document.createElement('canvas'); tcan.width = W; tcan.height = H; const tctx = tcan.getContext('2d', { willReadFrequently: true });
function wrap(str, font, maxW) {
  tctx.font = font; const words = str.split(' '); const lines = []; let cur = '';
  for (const w of words) { const nx = cur ? cur + ' ' + w : w; if (tctx.measureText(nx).width > maxW && cur) { lines.push(cur); cur = w; } else cur = nx; }
  if (cur) lines.push(cur); return lines;
}
// draw text crisp (alpha-thresholded) with a 1px black outline, straight into imageData
function stamp(img, items) {
  tctx.clearRect(0, 0, W, H);
  const colors = [];
  items.forEach((it, idx) => {
    tctx.font = it.font; tctx.textAlign = 'center'; tctx.textBaseline = 'middle';
    const lines = wrap(it.text, it.font, it.maxW ?? W - 24);
    lines.forEach((ln, i) => {
      tctx.fillStyle = `rgb(${idx + 1},0,0)`;
      tctx.fillText(ln, W / 2 + (it.dx ?? 0), it.y + (i - (lines.length - 1) / 2) * it.lh);
    });
    colors.push(it);
  });
  const td = tctx.getImageData(0, 0, W, H).data; const d = img.data;
  const mask = new Int16Array(W * H).fill(-1);
  for (let i = 0; i < W * H; i++) if (td[i * 4 + 3] > 110) mask[i] = Math.max(0, Math.min(items.length - 1, Math.round(td[i * 4] * 255 / td[i * 4 + 3]) - 1));
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x; const m = mask[i];
    if (m >= 0) {
      const it = items[m]; const a = it.alpha ?? 1; const c = it.color;
      d[i * 4] = lerp(d[i * 4], c[0], a); d[i * 4 + 1] = lerp(d[i * 4 + 1], c[1], a); d[i * 4 + 2] = lerp(d[i * 4 + 2], c[2], a);
    } else {
      let nb = -1;
      for (let oy = -1; oy <= 1 && nb < 0; oy++) for (let ox = -1; ox <= 1; ox++) { const xx = x + ox, yy = y + oy; if (xx >= 0 && yy >= 0 && xx < W && yy < H && mask[yy * W + xx] >= 0) { nb = mask[yy * W + xx]; break; } }
      if (nb >= 0) { const a = items[nb].alpha ?? 1; d[i * 4] *= 1 - a; d[i * 4 + 1] *= 1 - a; d[i * 4 + 2] *= 1 - a; }
    }
  }
}

// ---------- post (pixelate / grade / dither to 15-bit) ----------
const small = document.createElement('canvas'); const sctx = small.getContext('2d');
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
function post(p) {
  octx.imageSmoothingEnabled = false;
  if (p.pix > 1.01) {
    const sw = Math.max(8, Math.round(W / p.pix)), sh = Math.max(8, Math.round(H / p.pix));
    small.width = sw; small.height = sh; sctx.imageSmoothingEnabled = true; sctx.drawImage(glCanvas, 0, 0, sw, sh);
    octx.drawImage(small, 0, 0, W, H);
  } else octx.drawImage(glCanvas, 0, 0);
  const img = octx.getImageData(0, 0, W, H); const d = img.data;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4;
    let r = d[i], g = d[i + 1], b = d[i + 2];
    const l = 0.3 * r + 0.59 * g + 0.11 * b;
    r = lerp(r, l, p.desat); g = lerp(g, l, p.desat); b = lerp(b, l, p.desat);
    const dx = (x - W / 2) / W, dy = (y - H / 2) / H; const vig = 1 - p.vig * (dx * dx + dy * dy) * 2.6;
    const k = p.bright * vig;
    const dth = (BAYER[(y & 3) * 4 + (x & 3)] / 16 - 0.5) * 9;
    d[i] = clamp(Math.round((r * k + dth) / 8) * 8, 0, 255); d[i + 1] = clamp(Math.round((g * k + dth) / 8) * 8, 0, 255); d[i + 2] = clamp(Math.round((b * k + dth) / 8) * 8, 0, 255);
  }
  return img;
}

// ---------- frame ----------
function sceneAt(t) { for (const s of TL.scenes) if (t >= s[1] && t < s[2]) return s; return TL.scenes[TL.scenes.length - 1]; }
const SUBFONT = 'bold 12px "DejaVu Sans"';

window.renderFrame = (t) => {
  const [name, st, en] = sceneAt(t); const lt = t - st;
  let target, p = { pix: 1, desat: 0.08, bright: 1, vig: 0.6 };
  if (name === 'exterior') { S.exterior.update(t); target = S.exterior; }
  else if (name === 'bedroom') { S.bedroom.update(t, lt); target = S.bedroom; }
  else if (name === 'bathroom') { S.bathroom.update(t, lt); target = S.bathroom; }
  else if (name === 'street') { S.street.update(t, lt, 0); target = S.street; }
  else if (name === 'dimming') {
    const k = smooth(0.5, 9.5, lt); S.street.update(t, lt + (22.6 - 15.2), k); target = S.street;
    p.pix = 1 + k * 4.5; p.desat = 0.08 + k * 0.8; p.bright = 1 - k * 0.55; p.vig = 0.6 + k * 1.4;
  }
  else { S.corridor.update(t, name, lt); target = S.corridor; p.desat = 0.25; p.vig = 0.9; if (name === 'footprints') p.bright = 1.3;
    if (name === 'corridor') { p.pix = 2.2 - smooth(0, 2, lt) * 0.8; }
  }
  // fades at scene edges (street→dimming and eyes→ending are continuous)
  const cont = { street: [1, 0], dimming: [0, 1], eyes: [1, 0], ending: [0, 1] }[name] ?? [1, 1];
  let fade = Math.min(cont[1] ? 1 : smooth(0, 0.35, lt), cont[0] ? 1 : smooth(0, 0.35, en - t));
  if (name === 'dimming') fade = smooth(0, 0.6, en - t);
  if (name === 'ending' && lt > 2.6) fade = 0;
  p.bright *= fade;
  renderer.render(target.sc, target.cam);
  const img = post(p);
  // text overlays
  const items = [];
  if (name === 'exterior') {
    const a = smooth(0.2, 0.9, t) * (1 - smooth(3.9, 4.4, t));
    const glitch = hash(Math.floor(t * 20)) > 0.9 ? 2 : 0;
    if (a > 0.02) {
      items.push({ text: 'WHAT IF...', font: 'bold 34px "DejaVu Serif"', y: 120, lh: 36, color: [232, 226, 210], alpha: a, dx: glitch });
      items.push({ text: 'you could be invisible', font: 'italic 12px "DejaVu Serif"', y: 150, lh: 14, color: [190, 60, 50], alpha: a });
    }
  }
  if (name === 'ending' && lt > 2.8) {
    const a = smooth(2.8, 3.6, lt);
    items.push({ text: 'WHAT IF...?', font: 'bold 32px "DejaVu Serif"', y: H / 2 - 20, lh: 34, color: [232, 226, 210], alpha: a });
    items.push({ text: 'ability: invisibility', font: 'italic 12px "DejaVu Serif"', y: H / 2 + 12, lh: 14, color: [190, 60, 50], alpha: smooth(3.4, 4.2, lt) });
    items.push({ text: 'they are still watching', font: '10px "DejaVu Sans Mono"', y: H - 60, lh: 12, color: [120, 120, 120], alpha: smooth(4.2, 5.0, lt) * (hash(Math.floor(t * 8)) > 0.15 ? 1 : 0.3) });
  }
  let sub = null; for (const s of TL.subs) if (t >= s.start && t < s.end) sub = s;
  if (sub) items.push({ text: sub.text, font: SUBFONT, y: H - 92, lh: 15, color: [250, 244, 220], maxW: W - 36 });
  if (items.length) stamp(img, items);
  octx.putImageData(img, 0, 0);
  // return RGBA as base64
  const bytes = new Uint8Array(img.data.buffer); let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(s);
};
window.S = S; window.filmReady = true;
