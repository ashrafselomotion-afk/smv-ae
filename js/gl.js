/* ==========================================================================
   SMV.AE / gl.js
   A single WebGL plane behind the hero frame.

   Why only the hero: a canvas plane has to be pixel-synced to a DOM rect, and
   any element that is pinned or translated by scroll will drift a frame behind
   its caption. The hero frame never moves in layout, so the sync is exact and
   the effect stays smooth. Everything further down the page is composited by
   the browser instead.

   What it does: a slow liquid displacement that follows the pointer, a gentle
   squeeze driven by scroll velocity, and the studio film grade that every other
   image on the page matches in CSS.
   ========================================================================== */

import * as THREE from 'three';

const VERT = /* glsl */`
  varying vec2 vUv;
  void main(){
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FRAG = /* glsl */`
  precision highp float;

  uniform sampler2D uTex;
  uniform vec2  uPlane;
  uniform vec2  uTexSize;
  uniform vec2  uPointer;   // 0..1 inside the frame
  uniform float uPointerOn; // 0 when the pointer left
  uniform float uTime;
  uniform float uVel;       // -1..1 scroll velocity
  uniform float uIn;        // 0..1 entry reveal
  uniform vec3  uPaper;
  uniform vec3  uAccent;
  varying vec2 vUv;

  vec2 cover(vec2 uv){
    float pa = uPlane.x / max(uPlane.y, 1.0);
    float ta = uTexSize.x / max(uTexSize.y, 1.0);
    vec2 r = vec2(min(pa / ta, 1.0), min(ta / pa, 1.0));
    return uv * r + (1.0 - r) * 0.5;
  }

  void main(){
    vec2 uv = vUv;

    // slow breathing drift so the frame is never completely still
    uv.x += sin(uv.y * 2.6 + uTime * 0.16) * 0.0038;
    uv.y += cos(uv.x * 2.2 + uTime * 0.13) * 0.0032;

    // liquid pull toward the pointer, falls off with distance
    vec2 toP = uPointer - vUv;
    float d = length(toP * vec2(uPlane.x / max(uPlane.y, 1.0), 1.0));
    float pull = exp(-d * 3.4) * uPointerOn;
    uv -= toP * pull * 0.085;

    // scroll velocity squeezes the frame vertically, like a camera settling
    uv.y += uVel * (0.5 - vUv.y) * 0.05;

    vec2 tuv = cover(uv);

    // very slight channel spread, only while moving
    float sp = abs(uVel) * 0.006;
    vec3 c;
    c.r = texture2D(uTex, tuv + vec2(sp, 0.0)).r;
    c.g = texture2D(uTex, tuv).g;
    c.b = texture2D(uTex, tuv - vec2(sp, 0.0)).b;

    /* studio grade, matched by --grade in CSS:
       hold most of the colour, lift the blacks toward paper, cool the shadows,
       warm the highlights, then a soft vignette. */
    float lum = dot(c, vec3(0.299, 0.587, 0.114));
    vec3 g = mix(vec3(lum), c, 0.30);   // matches --grade in css
    g = (g - 0.5) * 1.13 + 0.5;
    g = mix(g, uPaper, 0.07);
    g += uAccent * pow(clamp(lum, 0.0, 1.0), 3.4) * 0.075;
    g.b += (1.0 - lum) * 0.022;

    float vig = 1.0 - smoothstep(0.55, 1.22, length((vUv - 0.5) * 2.0));
    g *= mix(0.9, 1.0, vig);

    // reveal wipes up from the bottom edge
    float wipe = smoothstep(0.0, 1.0, uIn * 1.3 - (1.0 - vUv.y) * 0.3);
    gl_FragColor = vec4(mix(uPaper, g, wipe), 1.0);
  }
`;

const toLinearVec3 = (hex) => {
  const n = parseInt(hex.replace('#', ''), 16);
  const lin = (v) => (v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
  return new THREE.Vector3(
    lin(((n >> 16) & 255) / 255),
    lin(((n >> 8) & 255) / 255),
    lin((n & 255) / 255)
  );
};

/**
 * @param {HTMLCanvasElement} canvas  fixed, full viewport, pointer-events none
 * @param {HTMLElement}       frame   the DOM element whose rect the plane fills
 * @param {string}            src     image url
 */
export function createHeroGL({ canvas, frame, src, paper = '#F1F1EF', accent = '#E4381B' }) {
  if (!canvas || !frame || !src) return null;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  } catch (err) {
    return null;
  }
  if (!renderer.getContext()) return null;

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearAlpha(0);

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(0, 1, 1, 0, -100, 100);
  const geometry = new THREE.PlaneGeometry(1, 1, 1, 1);

  const uniforms = {
    uTex: { value: null },
    uPlane: { value: new THREE.Vector2(1, 1) },
    uTexSize: { value: new THREE.Vector2(1, 1) },
    uPointer: { value: new THREE.Vector2(0.5, 0.5) },
    uPointerOn: { value: 0 },
    uTime: { value: 0 },
    uVel: { value: 0 },
    uIn: { value: 0 },
    uPaper: { value: toLinearVec3(paper) },
    uAccent: { value: toLinearVec3(accent) }
  };

  const mesh = new THREE.Mesh(geometry, new THREE.ShaderMaterial({
    vertexShader: VERT, fragmentShader: FRAG, uniforms
  }));
  mesh.visible = false;
  scene.add(mesh);

  new THREE.TextureLoader().load(src, (tex) => {
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.generateMipmaps = false;
    tex.minFilter = THREE.LinearFilter;
    uniforms.uTex.value = tex;
    uniforms.uTexSize.value.set(tex.image.width, tex.image.height);
    frame.classList.add('gl-ready');   // hides the DOM img, keeps its box
  });

  let W = 0, H = 0, running = true, rafId = 0;
  let ptr = { x: 0.5, y: 0.5, on: 0 };
  let vel = 0, velTarget = 0, reveal = 0;

  function resize() {
    // the canvas is the reference, not innerWidth: getBoundingClientRect works in
    // layout pixels, which exclude a classic scrollbar. innerWidth includes it,
    // and the 15px difference shifts the plane off its DOM frame.
    W = canvas.clientWidth || document.documentElement.clientWidth || window.innerWidth;
    H = canvas.clientHeight || document.documentElement.clientHeight || window.innerHeight;
    renderer.setSize(W, H, false);
    camera.left = -W / 2; camera.right = W / 2;
    camera.top = H / 2; camera.bottom = -H / 2;
    camera.updateProjectionMatrix();
  }

  function onMove(e) {
    const r = frame.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    const inside = x >= -0.15 && x <= 1.15 && y >= -0.15 && y <= 1.15;
    ptr.x = Math.max(0, Math.min(1, x));
    ptr.y = Math.max(0, Math.min(1, 1 - y));
    ptr.on = inside ? 1 : 0;
  }

  function frameLoop(t) {
    if (!running) return;
    rafId = requestAnimationFrame(frameLoop);

    const r = frame.getBoundingClientRect();
    const onScreen = r.bottom > -80 && r.top < H + 80 && r.width > 1 && !!uniforms.uTex.value;
    mesh.visible = onScreen;
    if (!onScreen) return;

    mesh.scale.set(r.width, r.height, 1);
    mesh.position.set(r.left + r.width / 2 - W / 2, -(r.top + r.height / 2) + H / 2, 0);

    uniforms.uPlane.value.set(r.width, r.height);
    uniforms.uTime.value = t * 0.001;

    vel += (velTarget - vel) * 0.08;
    velTarget *= 0.9;
    uniforms.uVel.value = vel;

    uniforms.uPointer.value.lerp(new THREE.Vector2(ptr.x, ptr.y), 0.08);
    uniforms.uPointerOn.value += (ptr.on - uniforms.uPointerOn.value) * 0.07;

    reveal += (1 - reveal) * 0.045;
    uniforms.uIn.value = reveal;

    renderer.render(scene, camera);
  }

  resize();
  window.addEventListener('resize', resize, { passive: true });
  window.addEventListener('pointermove', onMove, { passive: true });
  rafId = requestAnimationFrame(frameLoop);

  return {
    uniforms, mesh, camera,   // exposed for diagnostics
    setVelocity(v) { velTarget = Math.max(-1, Math.min(1, v)); },
    resize,
    destroy() {
      running = false;
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onMove);
      if (uniforms.uTex.value) uniforms.uTex.value.dispose();
      mesh.material.dispose();
      geometry.dispose();
      renderer.dispose();
    }
  };
}
