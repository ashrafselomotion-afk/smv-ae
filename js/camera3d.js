/* ==========================================================================
   SMV.AE / camera3d.js
   A cinema camera built from primitives, and a scroll driven move that flies
   the shot into its lens.

   It is modelled on the shape of a modern boxy cinema body (deep rectangular
   housing, top handle, side viewfinder, long barrel with a stepped hood).
   No maker's marks are on it: putting another company's wordmark on SMV's own
   site is not something to ship, so this is the silhouette, unbranded.

   Everything is procedural, so there is no model file to download, nothing to
   license, and the whole rig weighs a few kilobytes.
   ========================================================================== */

import * as THREE from 'three';

const INK = 0x2b2e33;
const INK_SOFT = 0x383c42;
const METAL = 0x8d9197;
const METAL_DARK = 0x4a4d52;
const GLASS = 0x0a0d12;
const ACCENT = 0xe4381b;

/* the front element sits here, everything else is laid out around it */
const FRONT_Z = 1.52;

function mat(color, opts = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.15, ...opts });
}

/** A box with its corners knocked off, which reads far better than a raw cube. */
function bevelBox(w, h, d, m, bevel = 0.03) {
  const g = new THREE.Group();
  const core = new THREE.Mesh(new THREE.BoxGeometry(w, h - bevel * 2, d - bevel * 2), m);
  const capY = new THREE.Mesh(new THREE.BoxGeometry(w - bevel * 2, h, d - bevel * 2), m);
  const capZ = new THREE.Mesh(new THREE.BoxGeometry(w - bevel * 2, h - bevel * 2, d), m);
  g.add(core, capY, capZ);
  return g;
}

function buildCamera() {
  const rig = new THREE.Group();

  const bodyMat = mat(INK, { roughness: 0.62, metalness: 0.22 });
  const softMat = mat(INK_SOFT, { roughness: 0.75, metalness: 0.1 });
  const metalMat = mat(METAL, { roughness: 0.28, metalness: 0.92 });
  const darkMetalMat = mat(METAL_DARK, { roughness: 0.4, metalness: 0.8 });
  const glassMat = new THREE.MeshStandardMaterial({
    color: GLASS, roughness: 0.06, metalness: 0.95
  });
  const accentMat = new THREE.MeshStandardMaterial({
    color: ACCENT, roughness: 0.5, metalness: 0.1,
    emissive: ACCENT, emissiveIntensity: 0.55
  });

  /* ---- body ---- */
  const body = bevelBox(1.72, 1.34, 1.5, bodyMat, 0.05);
  rig.add(body);

  // vented side panel, the ridged block cinema bodies have on the operator side
  for (let i = 0; i < 7; i += 1) {
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.62, 0.12), softMat);
    fin.position.set(-0.87, 0.12, -0.42 + i * 0.14);
    rig.add(fin);
  }

  // rear block: battery and recorder
  const rear = bevelBox(1.34, 1.06, 0.44, softMat, 0.04);
  rear.position.set(0, -0.02, -0.95);
  rig.add(rear);

  // shoulder plate underneath
  const base = bevelBox(1.5, 0.14, 1.9, softMat, 0.03);
  base.position.set(0, -0.72, -0.1);
  rig.add(base);

  /* ---- top handle ---- */
  const handle = bevelBox(0.42, 0.13, 1.36, softMat, 0.03);
  handle.position.set(-0.1, 1.06, 0.06);
  rig.add(handle);
  [-0.42, 0.5].forEach((z) => {
    const riser = bevelBox(0.36, 0.34, 0.2, softMat, 0.03);
    riser.position.set(-0.1, 0.85, z);
    rig.add(riser);
  });
  // accessory rail slots along the handle
  for (let i = 0; i < 5; i += 1) {
    const slot = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.03, 0.07), darkMetalMat);
    slot.position.set(-0.1, 1.13, -0.34 + i * 0.19);
    rig.add(slot);
  }

  /* ---- viewfinder on the operator side ---- */
  const evfArm = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.5, 12), darkMetalMat);
  evfArm.rotation.z = Math.PI / 2;
  evfArm.position.set(-1.06, 0.52, 0.34);
  rig.add(evfArm);
  const evf = bevelBox(0.46, 0.34, 0.5, softMat, 0.03);
  evf.position.set(-1.38, 0.52, 0.34);
  rig.add(evf);
  const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.13, 0.16, 20), mat(0x111214, { roughness: 0.9 }));
  cup.rotation.x = Math.PI / 2;
  cup.position.set(-1.38, 0.52, 0.62);
  rig.add(cup);

  /* ---- side monitor ---- */
  const screenBack = bevelBox(0.9, 0.62, 0.06, softMat, 0.02);
  screenBack.position.set(0.9, 0.12, -0.2);
  screenBack.rotation.y = -0.22;
  rig.add(screenBack);
  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(0.78, 0.5),
    new THREE.MeshStandardMaterial({ color: 0x0d1014, roughness: 0.2, metalness: 0.5 })
  );
  screen.position.set(0.93, 0.12, -0.17);
  screen.rotation.y = -0.22 + Math.PI;
  rig.add(screen);

  /* ---- controls and the tally light ---- */
  [[0.42, 0.7, 0.4], [0.62, 0.7, 0.1], [0.2, 0.7, 0.4]].forEach(([x, y, z]) => {
    const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.05, 16), darkMetalMat);
    knob.position.set(x, y, z);
    rig.add(knob);
  });
  const tally = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.03, 16), accentMat);
  tally.rotation.x = Math.PI / 2;
  tally.position.set(0.55, 0.45, 0.76);
  rig.add(tally);

  /* ---- lens ---- */
  const lens = new THREE.Group();

  const mount = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.44, 0.14, 40), metalMat);
  mount.rotation.x = Math.PI / 2;
  mount.position.z = 0.8;
  lens.add(mount);

  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.43, 0.42, 40), bodyMat);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.z = 1.06;
  lens.add(barrel);

  // focus ring, knurled with fine ribs
  const focus = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.46, 0.24, 40), mat(0x232529, { roughness: 0.5 }));
  focus.rotation.x = Math.PI / 2;
  focus.position.z = 1.2;
  lens.add(focus);
  for (let i = 0; i < 44; i += 1) {
    const a = (i / 44) * Math.PI * 2;
    const rib = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.028, 0.2), darkMetalMat);
    rib.position.set(Math.cos(a) * 0.465, Math.sin(a) * 0.465, 1.2);
    rib.rotation.z = a;
    lens.add(rib);
  }

  // a single accent ring, the one piece of brand colour on the object
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.455, 0.016, 10, 48), accentMat);
  ring.position.z = 1.36;
  lens.add(ring);

  // stepped hood
  const hoodMat = mat(0x1f2226, { roughness: 0.72, metalness: 0.2, side: THREE.DoubleSide });
  const hood = new THREE.Mesh(new THREE.CylinderGeometry(0.63, 0.5, 0.36, 44, 1, true), hoodMat);
  hood.rotation.x = Math.PI / 2;
  hood.position.z = FRONT_Z + 0.16;
  lens.add(hood);

  // collar that ties the hood back to the barrel, without it the hood floats
  const collar = new THREE.Mesh(new THREE.RingGeometry(0.46, 0.5, 44), darkMetalMat);
  collar.material.side = THREE.DoubleSide;
  collar.position.z = FRONT_Z - 0.02;
  lens.add(collar);

  const hoodLip = new THREE.Mesh(new THREE.TorusGeometry(0.63, 0.022, 10, 48), darkMetalMat);
  hoodLip.position.z = FRONT_Z + 0.34;
  lens.add(hoodLip);

  // front element, slightly domed
  const glass = new THREE.Mesh(new THREE.SphereGeometry(0.9, 40, 24, 0, Math.PI * 2, 0, 0.52), glassMat);
  glass.rotation.x = -Math.PI / 2;
  glass.position.z = FRONT_Z - 0.72;
  lens.add(glass);

  const glassRim = new THREE.Mesh(new THREE.TorusGeometry(0.44, 0.02, 10, 48), metalMat);
  glassRim.position.z = FRONT_Z - 0.02;
  lens.add(glassRim);

  /* ---- iris: eight blades that close over the opening ---- */
  const bladeMat = mat(0x141518, { roughness: 0.7, metalness: 0.3 });
  const blades = [];
  const BLADES = 8;
  for (let i = 0; i < BLADES; i += 1) {
    const pivot = new THREE.Object3D();
    pivot.rotation.z = (i / BLADES) * Math.PI * 2;
    // sized to stay inside the barrel: any larger and the corners poke out
    // through the hood and read as loose geometry rather than an iris
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.28, 0.01), bladeMat);
    blade.position.set(0, 0.29, 0);
    blade.rotation.z = 0.42;
    pivot.add(blade);
    pivot.position.z = FRONT_Z - 0.26;
    lens.add(pivot);
    blades.push(pivot);
  }

  rig.add(lens);
  return { rig, blades };
}

/**
 * @param {HTMLCanvasElement} canvas full bleed, pointer-events none
 */
export function createCameraRig({ canvas }) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  } catch (err) {
    return null;
  }
  if (!renderer.getContext()) return null;

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearAlpha(0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const view = new THREE.PerspectiveCamera(42, 1, 0.05, 100);

  const { rig, blades } = buildCamera();
  scene.add(rig);

  /* studio light, aimed to read against a paper background */
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8e8e88, 1.5));
  const key = new THREE.DirectionalLight(0xffffff, 3.2);
  key.position.set(-3.2, 4.6, 4.4);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xffffff, 0.85);
  fill.position.set(4, -1.2, 2.6);
  scene.add(fill);
  const rim = new THREE.DirectionalLight(0xffe9dd, 2.2);
  rim.position.set(1.8, 1.6, -4);
  scene.add(rim);
  const top = new THREE.DirectionalLight(0xffffff, 1.1);
  top.position.set(0.4, 5, -0.6);
  scene.add(top);

  let W = 0, H = 0, running = true, rafId = 0, t0 = 0;
  let progress = 0, shown = 0;

  function resize() {
    W = canvas.clientWidth || window.innerWidth;
    H = canvas.clientHeight || window.innerHeight;
    renderer.setSize(W, H, false);
    view.aspect = W / Math.max(1, H);
    // keep the body in frame on narrow windows
    view.fov = W / H < 1.1 ? 54 : 42;
    view.updateProjectionMatrix();
  }

  const lerp = (a, b, k) => a + (b - a) * k;
  const clamp01 = (v) => Math.max(0, Math.min(1, v));
  const range = (v, a, b) => clamp01((v - a) / (b - a));
  const ease = (v) => v * v * (3 - 2 * v);

  function apply() {
    const p = progress;

    // the shot swings from a three quarter view round to dead on the glass
    const turn = ease(range(p, 0, 0.55));
    rig.rotation.y = lerp(-0.62, 0, turn);
    rig.rotation.x = lerp(0.16, 0, turn);
    rig.position.y = lerp(-0.12, 0, turn);

    // and pushes in, ending just past the front element
    const dolly = ease(range(p, 0.04, 0.78));
    const z = lerp(7.4, FRONT_Z - 0.24, dolly);
    view.position.set(lerp(1.6, 0, turn), lerp(0.95, 0, turn), z);
    // aim at the body first so it is not cropped, drift onto the glass as we close in
    view.lookAt(0, lerp(0.1, 0, turn), lerp(0.15, FRONT_Z, dolly));

    // iris shuts as the glass fills the frame, then punches open as we pass
    const close = ease(range(p, 0.42, 0.66));
    const open = ease(range(p, 0.66, 0.8));
    const shut = close * (1 - open);
    blades.forEach((b, i) => {
      b.rotation.z = (i / blades.length) * Math.PI * 2 + shut * 0.5;
      const blade = b.children[0];
      blade.position.y = lerp(0.29, 0.07, shut);
      blade.rotation.z = lerp(0.42, 0.06, shut);
    });

    // fade the rig out once the viewer is through the glass
    // clear out quickly: the inside of a barrel is a dark frame, and holding it
    // any longer than the punch through reads as a loading screen
    shown = 1 - ease(range(p, 0.68, 0.79));
    rig.visible = shown > 0.01;
    rig.traverse((o) => {
      if (!o.material) return;
      const m = o.material;
      if (m.transparent !== true) { m.transparent = true; }
      m.opacity = shown;
    });
  }

  function loop(t) {
    if (!running) return;
    rafId = requestAnimationFrame(loop);
    if (!t0) t0 = t;
    // a slow idle turn so the object is never completely dead before scrolling
    rig.rotation.z = Math.sin((t - t0) * 0.00035) * 0.012;
    renderer.render(scene, view);
  }

  resize();
  apply();
  window.addEventListener('resize', resize, { passive: true });
  rafId = requestAnimationFrame(loop);

  return {
    setProgress(p) { progress = Math.max(0, Math.min(1, p)); apply(); },
    resize,
    destroy() {
      running = false;
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
      scene.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) o.material.dispose();
      });
      renderer.dispose();
    }
  };
}
