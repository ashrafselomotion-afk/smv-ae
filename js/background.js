/* ————————————————————————————————
   SMV.AE — background.js
   One continuous WebGL world behind the whole page.
   A single particle system morphs through 10 formations,
   driven by the page's scrubbed scenes (main.js writes
   window.__chapterTarget from ScrollTriggers):

   0 chaos       — scattered noise (the unframed world)
   1 hero        — lens aperture ring (the moment, framed)
   2 statement   — dust field
   3 videography — flowing wave sheet
   4 photography — sensor grid + frame
   5 ai          — neural cluster
   6 motion      — double helix
   7 gov events  — concentric rings (radar)
   8 work → …    — deep dim starfield (content-first)
   9 contact     — golden burst ring (echo of the hero)

   Interactivity: cursor repulsion, press-&-hold vortex that
   pulls particles in, release shockwave (fling), scroll-velocity
   turbulence, per-chapter color & camera journey.
   ———————————————————————————————— */

import * as THREE from 'three';

// per-chapter look: colors, group tilt, camera distance, brightness, drift, point size
const CFG = [
  { a: '#d8d4ca', b: '#8f8a7d', rx: -0.20, z: 5.4, dim: 0.70, noise: 0.160, size: 0.90 }, // chaos
  { a: '#f0ece1', b: '#c9a227', rx: -0.42, z: 4.2, dim: 1.00, noise: 0.050, size: 1.00 }, // ring
  { a: '#e8e4da', b: '#9a9486', rx: -0.20, z: 5.0, dim: 0.85, noise: 0.090, size: 0.90 }, // dust
  { a: '#f0e6d0', b: '#d98e2b', rx: -0.95, z: 4.4, dim: 1.00, noise: 0.070, size: 1.00 }, // wave
  { a: '#dfe8f0', b: '#6d9bd4', rx: -0.08, z: 4.5, dim: 1.00, noise: 0.020, size: 0.95 }, // sensor
  { a: '#e6dcf5', b: '#9a6cf5', rx: -0.25, z: 4.1, dim: 1.00, noise: 0.080, size: 1.05 }, // neural
  { a: '#d9f0e6', b: '#37c495', rx: -0.15, z: 4.4, dim: 1.00, noise: 0.050, size: 1.00 }, // helix
  { a: '#f2ded2', b: '#e05a3a', rx: -1.05, z: 4.5, dim: 1.00, noise: 0.040, size: 1.00 }, // radar
  { a: '#b8b4ab', b: '#7c786e', rx:  0.00, z: 5.2, dim: 0.42, noise: 0.030, size: 0.70 }, // stars
  { a: '#fff3d6', b: '#e9bb3f', rx: -0.35, z: 3.9, dim: 1.15, noise: 0.050, size: 1.10 }, // burst
];

const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;

function buildFormations(N) {
  const F = Array.from({ length: 10 }, () => new Float32Array(N * 3));
  const put = (f, i, x, y, z) => { f[i * 3] = x; f[i * 3 + 1] = y; f[i * 3 + 2] = z; };

  // neural centers (formation 5)
  const centers = Array.from({ length: 24 }, () => {
    const a = Math.random() * Math.PI * 2, r = Math.random() * 1.9;
    return [Math.cos(a) * r * 1.25, Math.sin(a) * r * 0.85, gauss() * 0.6];
  });

  const gridCols = Math.round(Math.sqrt(N * 0.82 * (3.6 / 2.2)));
  const gridRows = Math.ceil((N * 0.82) / gridCols);

  for (let i = 0; i < N; i++) {
    const a = Math.random() * Math.PI * 2;

    // 0 — chaos: wide unstructured cloud
    put(F[0], i, (Math.random() - 0.5) * 7.5, (Math.random() - 0.5) * 4.6, (Math.random() - 0.5) * 3.2);

    // 1 — aperture ring + ambient disc
    if (Math.random() < 0.45) put(F[1], i, Math.cos(a) * (1.45 + gauss() * 0.05), Math.sin(a) * (1.45 + gauss() * 0.05), gauss() * 0.02);
    else { const r = 2.6 * Math.sqrt(Math.random()); put(F[1], i, Math.cos(a) * r, Math.sin(a) * r, gauss() * 0.18 * (r / 2.6)); }

    // 2 — dust field
    put(F[2], i, gauss() * 2.9, gauss() * 1.8, gauss() * 1.4);

    // 3 — flowing wave sheet
    { const x = (Math.random() - 0.5) * 6.4, z = (Math.random() - 0.5) * 3.2;
      put(F[3], i, x, Math.sin(x * 1.8 + z) * 0.35 + Math.sin(x * 0.7) * 0.2 + gauss() * 0.04, z); }

    // 4 — sensor grid + frame border
    if (i < gridCols * gridRows && i < N * 0.82) {
      const u = (i % gridCols) / (gridCols - 1), v = Math.floor(i / gridCols) / (gridRows - 1);
      put(F[4], i, (u - 0.5) * 3.6, (v - 0.5) * 2.2, gauss() * 0.02);
    } else {
      const t = Math.random() * 2 * (3.9 + 2.5), W = 3.9, H = 2.5;
      let x, y;
      if (t < W) { x = t - W / 2; y = -H / 2; }
      else if (t < W + H) { x = W / 2; y = t - W - H / 2; }
      else if (t < W * 2 + H) { x = t - W - H - W / 2; y = H / 2; }
      else { x = -W / 2; y = t - W * 2 - H - H / 2; }
      put(F[4], i, x + gauss() * 0.015, y + gauss() * 0.015, gauss() * 0.015);
    }

    // 5 — neural cluster
    if (Math.random() < 0.7) { const c = centers[(Math.random() * centers.length) | 0];
      put(F[5], i, c[0] + gauss() * 0.22, c[1] + gauss() * 0.22, c[2] + gauss() * 0.22); }
    else { const th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1);
      put(F[5], i, Math.sin(ph) * Math.cos(th) * 2.6, Math.sin(ph) * Math.sin(th) * 1.7, Math.cos(ph) * 1.2); }

    // 6 — double helix
    { const x = (Math.random() - 0.5) * 4.6, ang = x * 2.4 + (i % 2) * Math.PI;
      put(F[6], i, x, Math.cos(ang) * 0.9 + gauss() * 0.05, Math.sin(ang) * 0.9 + gauss() * 0.05); }

    // 7 — concentric rings
    { const ri = i % 5, r = 0.7 + ri * 0.45;
      put(F[7], i, Math.cos(a) * r + gauss() * 0.03, Math.sin(a) * r + gauss() * 0.03, (ri - 2) * 0.12); }

    // 8 — deep starfield, center kept clear for content
    { let x = (Math.random() - 0.5) * 9, y = (Math.random() - 0.5) * 5.5;
      if (Math.hypot(x, y) < 1.5) { x *= 2.4; y *= 2.4; }
      put(F[8], i, x, y, (Math.random() - 0.5) * 10 - 1); }

    // 9 — burst ring + spokes
    if (Math.random() < 0.65) put(F[9], i, Math.cos(a) * (1.3 + gauss() * 0.05), Math.sin(a) * (1.3 + gauss() * 0.05), gauss() * 0.02);
    else { const sp = ((Math.random() * 24) | 0) / 24 * Math.PI * 2, d = 1.35 + Math.random() * 1.7;
      put(F[9], i, Math.cos(sp) * d, Math.sin(sp) * d, gauss() * 0.05); }
  }
  return F;
}

export function initBackground(canvas) {
  const prefersReduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true, powerPreference: 'high-performance', preserveDrawingBuffer: true });
  const DPR = Math.min(devicePixelRatio || 1, 2);
  renderer.setPixelRatio(DPR);
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 30);
  camera.position.z = 5.4;

  const group = new THREE.Group();
  group.rotation.x = CFG[0].rx;
  scene.add(group);

  const mobile = innerWidth < 768;
  const N = mobile ? 7000 : 16000;
  const F = buildFormations(N);

  const rand = new Float32Array(N * 3);
  const scale = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    rand[i * 3] = Math.random(); rand[i * 3 + 1] = Math.random(); rand[i * 3 + 2] = Math.random();
    scale[i] = 0.4 + Math.random() * 0.9;
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(F[0], 3));
  for (let k = 1; k <= 9; k++) geo.setAttribute('aT' + k, new THREE.BufferAttribute(F[k], 3));
  geo.setAttribute('aRand', new THREE.BufferAttribute(rand, 3));
  geo.setAttribute('aScale', new THREE.BufferAttribute(scale, 1));

  const uniforms = {
    uTime:    { value: 0 },
    uSize:    { value: 9 * DPR },
    uSizeMul: { value: 1 },
    uChapter: { value: 0 },
    uNoise:   { value: CFG[0].noise },
    uDim:     { value: CFG[0].dim },
    uColorA:  { value: new THREE.Color(CFG[0].a) },
    uColorB:  { value: new THREE.Color(CFG[0].b) },
    uMouse:   { value: new THREE.Vector3(99, 99, 0) },
    uMouseF:  { value: 0.18 },
    uHold:    { value: 0 },
    uBurst:   { value: new THREE.Vector3(0, 0, 0) },
    uBurstT:  { value: 100 },
  };

  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms,
    vertexShader: /* glsl */`
      attribute vec3 aT1; attribute vec3 aT2; attribute vec3 aT3; attribute vec3 aT4;
      attribute vec3 aT5; attribute vec3 aT6; attribute vec3 aT7; attribute vec3 aT8; attribute vec3 aT9;
      attribute vec3 aRand;
      attribute float aScale;
      uniform float uTime, uChapter, uSize, uSizeMul, uNoise, uMouseF, uHold, uBurstT;
      uniform vec3 uMouse, uBurst;
      varying float vMix;
      void main() {
        float ch = clamp(uChapter, 0.0, 9.0);
        float fi = floor(ch);
        // staggered per-particle arrival — swarms, not lockstep
        float lt = clamp((fract(ch) - aRand.x * 0.3) / 0.7, 0.0, 1.0);
        lt = lt * lt * (3.0 - 2.0 * lt);
        vec3 A, B;
        if      (fi < 0.5) { A = position; B = aT1; }
        else if (fi < 1.5) { A = aT1; B = aT2; }
        else if (fi < 2.5) { A = aT2; B = aT3; }
        else if (fi < 3.5) { A = aT3; B = aT4; }
        else if (fi < 4.5) { A = aT4; B = aT5; }
        else if (fi < 5.5) { A = aT5; B = aT6; }
        else if (fi < 6.5) { A = aT6; B = aT7; }
        else if (fi < 7.5) { A = aT7; B = aT8; }
        else if (fi < 8.5) { A = aT8; B = aT9; }
        else               { A = aT9; B = aT9; }
        vec3 p = mix(A, B, lt);

        // ambient drift (amplitude = chapter noise + scroll turbulence)
        float t = uTime * 0.4;
        float amp = uNoise * (0.4 + 0.6 * aRand.z);
        p.x += sin(t + aRand.x * 6.28318 + p.y * 1.4) * amp;
        p.y += cos(t * 0.8 + aRand.y * 6.28318 + p.x * 1.4) * amp;
        p.z += sin(t * 0.6 + aRand.z * 6.28318) * amp * 1.6;

        vec3 dm = p - uMouse;
        float md = length(dm);
        vec3 dir = normalize(dm + 0.001);

        // press-&-hold: vortex — pull in + swirl around the cursor
        float hf = uHold * exp(-md * md * 0.8);
        p -= dir * hf * 0.65;
        p += normalize(cross(vec3(0.0, 0.0, 1.0), dm) + 0.001) * hf * 0.5;

        // cursor repulsion (eases off while holding)
        p += dir * uMouseF * (1.0 - uHold) * exp(-md * md * 2.2);

        // release shockwave
        float bd = length(p - uBurst);
        float w = exp(-pow(bd - uBurstT * 2.4, 2.0) * 7.0) * exp(-uBurstT * 1.1);
        p += normalize(p - uBurst + 0.001) * w * 0.6;

        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = uSize * uSizeMul * aScale / (-mv.z);
        vMix = aRand.y;
      }`,
    fragmentShader: /* glsl */`
      precision mediump float;
      uniform vec3 uColorA, uColorB;
      uniform float uDim;
      varying float vMix;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.05, d);
        vec3 col = mix(uColorA, uColorB, vMix * 0.85);
        gl_FragColor = vec4(col, a * 0.85 * uDim);
      }`,
  });

  group.add(new THREE.Points(geo, mat));

  /* —— chapter target: written by main.js scene ScrollTriggers —— */
  const targetChapter = () => Math.min(Math.max(window.__chapterTarget ?? 0, 0), 9);

  /* —— pointer —— */
  let tmx = 0, tmy = 0, mx = 0, my = 0, pmx = 0, pmy = 0;
  let holding = false, holdF = 0;
  const mouseLocal = new THREE.Vector3();

  function ndcToLocal(nx, ny, out) {
    const v = new THREE.Vector3(nx, ny, 0.5).unproject(camera);
    const dir = v.sub(camera.position).normalize();
    const t = -camera.position.z / (dir.z || -1e-4);
    out.copy(camera.position).addScaledVector(dir, Math.max(t, 0));
    group.worldToLocal(out);
  }

  addEventListener('pointermove', e => {
    tmx = (e.clientX / innerWidth) * 2 - 1;
    tmy = -((e.clientY / innerHeight) * 2 - 1);
  });

  let burstStart = -100;
  addEventListener('pointerdown', e => {
    tmx = (e.clientX / innerWidth) * 2 - 1;
    tmy = -((e.clientY / innerHeight) * 2 - 1);
    if (e.pointerType === 'mouse') holding = true; // touch scrolls, so no hold-vortex there
  });
  const release = e => {
    holding = false;
    burstStart = clock.getElapsedTime();
    ndcToLocal((e.clientX / innerWidth) * 2 - 1, -((e.clientY / innerHeight) * 2 - 1), uniforms.uBurst.value);
  };
  addEventListener('pointerup', release);
  addEventListener('pointercancel', () => { holding = false; });

  function updateMouseWorld() {
    ndcToLocal(mx, my, mouseLocal);
    uniforms.uMouse.value.copy(mouseLocal);
  }

  /* —— resize —— */
  function resize() {
    renderer.setSize(innerWidth, innerHeight, false);
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
  }
  resize();
  addEventListener('resize', resize);

  /* —— render loop —— */
  const cA = CFG.map(c => new THREE.Color(c.a));
  const cB = CFG.map(c => new THREE.Color(c.b));
  const clock = new THREE.Clock();
  let chapter = 0, lastScroll = scrollY, vel = 0;

  if (prefersReduced) {
    uniforms.uChapter.value = 1; // hold the formed ring, statically
    uniforms.uDim.value = 0.6;
    renderer.render(scene, camera);
    return;
  }

  // debug hook (harmless in production; step/snap allow rendering while rAF is throttled)
  window.__bgDebug = {
    uniforms,
    chapter: () => chapter,
    target: () => targetChapter(),
    snap: () => { chapter = targetChapter(); },
    step: () => tick(),
  };

  renderer.setAnimationLoop(tick);

  function tick() {
    const t = clock.getElapsedTime();
    uniforms.uTime.value = t;

    // chapter drift toward the scene-driven target
    chapter += (targetChapter() - chapter) * 0.07;
    uniforms.uChapter.value = chapter;

    // scroll velocity → turbulence + size flare
    const dv = scrollY - lastScroll; lastScroll = scrollY;
    vel += (dv - vel) * 0.12;
    const speed = Math.min(Math.abs(vel) * 0.0006, 0.22);

    // per-chapter config, eased between stops
    const i0 = Math.min(Math.floor(chapter), CFG.length - 1);
    const i1 = Math.min(i0 + 1, CFG.length - 1);
    let f = chapter - i0; f = f * f * (3 - 2 * f);
    const L = (a, b) => a + (b - a) * f;
    uniforms.uColorA.value.lerpColors(cA[i0], cA[i1], f);
    uniforms.uColorB.value.lerpColors(cB[i0], cB[i1], f);
    uniforms.uDim.value = L(CFG[i0].dim, CFG[i1].dim);
    uniforms.uNoise.value = L(CFG[i0].noise, CFG[i1].noise) + speed;
    uniforms.uSizeMul.value = L(CFG[i0].size, CFG[i1].size) + speed * 1.4;

    // hold-vortex ease in/out
    holdF += ((holding ? 1 : 0) - holdF) * 0.08;
    uniforms.uHold.value = holdF;

    // camera + group journey
    camera.position.z += (L(CFG[i0].z, CFG[i1].z) - camera.position.z) * 0.05;
    mx += (tmx - mx) * 0.05;
    my += (tmy - my) * 0.05;
    group.rotation.z = t * 0.03 + holdF * t * 0.05; // the world spins a little faster while held
    group.rotation.y = mx * 0.22;
    group.rotation.x += (L(CFG[i0].rx, CFG[i1].rx) - my * 0.12 - group.rotation.x) * 0.05;
    group.updateMatrixWorld();

    // pointer force scales with cursor speed
    const pspd = Math.hypot(mx - pmx, my - pmy); pmx = mx; pmy = my;
    uniforms.uMouseF.value = 0.16 + Math.min(pspd * 8, 0.4);
    updateMouseWorld();

    uniforms.uBurstT.value = Math.min(t - burstStart, 100);

    renderer.render(scene, camera);
  }
}
