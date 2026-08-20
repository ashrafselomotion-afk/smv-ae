/* ==========================================================================
   SMV.AE / main.js
   Everything visible is rendered from data/site.json + data/projects.json so
   the whole site stays editable from the admin side (Pages CMS).

   Motion, and the reason each piece exists:
     Lenis            continuous scroll, so the reel and the parallax read as one move
     hero lines       masked reveal, establishes hierarchy on load
     hero track       the character aims where the cursor is: left, at you, right
     statement        a focus pull: lines rise through masks, the accent phrase colours last
     event trail      cursor deals out past events, the section is about coverage
     counters         count up on entry, draws the eye to the claim
     magnetic buttons small lean toward the cursor, feedback on the primary action
     craft list       hover swaps the preview frame, browsing without leaving the page
     work reel        pinned horizontal pan, the work is the content so it gets the motion
     marquee          two rows against each other, solid over outline, breadth at a glance
   All of it collapses under prefers-reduced-motion.
   ========================================================================== */

const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const CAT = { video: 'Video', photo: 'Photo', ai: 'AI', motion: 'Motion', events: 'Events' };

const state = {
  site: null, projects: [], visible: [], caseList: [], caseIndex: -1,
  gl: null, lenis: null, reelTween: null
};

/* ------------------------------------------------------------------ data -- */

async function loadJSON(path) {
  const res = await fetch(`${path}?t=${Date.now()}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`${path} failed: ${res.status}`);
  return res.json();
}

/* --------------------------------------------------------------- helpers -- */

const setText = (el, v) => { if (el && v != null && v !== '') el.textContent = v; };
const esc = (s = '') => String(s).replace(/[&<>"]/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]
));

/** Accepts a Vimeo, YouTube, Google Drive or direct mp4 link. */
function embed(url) {
  if (!url) return null;
  const v = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (v) return { type: 'iframe', src: `https://player.vimeo.com/video/${v[1]}?title=0&byline=0&portrait=0` };
  const y = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]{11})/);
  if (y) return { type: 'iframe', src: `https://www.youtube.com/embed/${y[1]}?rel=0` };
  const g = url.match(/drive\.google\.com\/file\/d\/([\w-]+)/);
  if (g) return { type: 'iframe', src: `https://drive.google.com/file/d/${g[1]}/preview` };
  return { type: 'video', src: url };
}

function mediaNode(url, poster, alt) {
  const e = embed(url);
  if (!e) {
    if (!poster) {
      const p = document.createElement('div');
      p.className = 'modal-still';
      p.textContent = 'Add a video or image in the admin';
      return p;
    }
    const img = document.createElement('img');
    img.src = poster; img.alt = alt || ''; img.loading = 'lazy';
    return img;
  }
  if (e.type === 'iframe') {
    const f = document.createElement('iframe');
    f.src = e.src; f.title = alt || 'Project video'; f.loading = 'lazy';
    f.allow = 'autoplay; fullscreen; picture-in-picture';
    f.setAttribute('allowfullscreen', '');
    return f;
  }
  const vid = document.createElement('video');
  vid.src = e.src; vid.controls = true; vid.playsInline = true;
  if (poster) vid.poster = poster;
  return vid;
}

/* ---------------------------------------------------------------- render -- */

/** The opening image first, then the rest of the background reel. */
function heroSources(site) {
  const out = [];
  if (site?.hero?.image) out.push(site.hero.image);
  (site?.hero?.background || []).forEach((b) => {
    if (b.image && !out.includes(b.image)) out.push(b.image);
  });
  return out;
}

/**
 * The header plays on arrival. Order of preference:
 *   1. a real showreel set in the admin (mp4 or a Vimeo / YouTube / Drive link)
 *   2. the bundled looping placeholder
 *   3. a crossfading stack of work stills
 * Nothing here is decorative, it is the reel behind the name.
 */
function renderHeroMedia(site) {
  const fig = $('[data-hero-media]');
  if (!fig) return;
  const hero = site.hero || {};
  const v = embed(hero.video);

  // a scrub video outranks everything: the visitor's hand plays the reel.
  // needs a direct mp4; hosted players cannot be seeked frame by frame.
  const sc = embed(hero.scrub);
  if (sc && sc.type === 'video') {
    fig.innerHTML = '';
    const el = document.createElement('video');
    el.src = sc.src;
    el.muted = true; el.playsInline = true; el.preload = 'auto';
    el.setAttribute('muted', '');
    el.setAttribute('playsinline', '');
    // no poster: a paused, never-seeked video keeps its poster on top forever,
    // so the reel's own first frame is the opening image
    // no mouse, nothing to scrub: phones get the reel as a plain loop
    const coarse = window.matchMedia('(hover: none), (pointer: coarse)').matches;
    if (coarse && !REDUCED) {
      el.autoplay = true; el.loop = true;
      el.setAttribute('autoplay', ''); el.setAttribute('loop', '');
    }
    fig.appendChild(el);
    fig.dataset.mode = 'scrub';
    if (coarse && !REDUCED) el.play?.().catch(() => {});
    return;
  }

  if (v && v.type === 'video') {
    fig.innerHTML = '';
    const el = document.createElement('video');
    el.src = v.src;
    el.muted = true; el.loop = true; el.autoplay = true; el.playsInline = true;
    el.setAttribute('muted', '');            // iOS wants the attribute, not just the property
    el.setAttribute('playsinline', '');
    if (hero.image) el.poster = hero.image;
    fig.appendChild(el);
    fig.dataset.mode = 'video';
    el.play?.().catch(() => {});             // blocked autoplay leaves the poster showing
    return;
  }

  if (v && v.type === 'iframe') {
    // a hosted player cannot be muted reliably as a background, so it opens in
    // the case view instead and the header keeps the loop
    fig.dataset.hosted = '1';
  }

  if (hero.loop) {
    fig.innerHTML = `<img src="${esc(hero.loop)}" alt="" class="on" fetchpriority="high">`;
    fig.dataset.mode = 'loop';
    return;
  }

  const stills = heroSources(site);
  if (!stills.length) return;
  fig.innerHTML = stills.map((src, i) => `
    <img src="${esc(src)}" alt="${i === 0 ? 'Still from an SMV production' : ''}"
         class="${i === 0 ? 'on' : ''}" ${i === 0 ? 'fetchpriority="high"' : 'loading="lazy"'}>
  `).join('');
  fig.dataset.mode = 'stills';
}

function renderChrome(site) {
  const n = site.brand?.navLabels || {};
  $$('[data-nav]').forEach((el) => setText(el, n[el.dataset.nav]));
  if (site.brand?.name) {
    $('.logo-word').innerHTML = `${esc(site.brand.name)}<span>${esc(site.brand.suffix || '')}</span>`;
  }
  Object.entries(site.hero || {}).forEach(([k, v]) => {
    $$(`[data-hero="${k}"]`).forEach((el) => setText(el, v));
  });

  renderHeroMedia(site);

  setText($('[data-statement]'), site.statement);
  setText($('[data-events-heading]'), site.events?.heading);
  setText($('[data-events-body]'), site.events?.body);
  setText($('[data-craft-eyebrow]'), site.craft?.eyebrow);
  setText($('[data-craft-heading]'), site.craft?.heading);
  setText($('[data-gal-heading]'), site.gallery?.heading);
  setText($('[data-clients-heading]'), site.clientsSection?.heading);
  setText($('[data-clients-note]'), site.clientsSection?.note);

  const c = site.contact || {};
  setText($('[data-contact="heading"]'), c.heading);
  setText($('[data-contact="body"]'), c.body);
  const cta = $('[data-contact-cta]');
  if (cta) { setText(cta, c.cta); if (c.email) cta.href = `mailto:${c.email}`; }
  const mail = $('[data-contact-mail]');
  if (mail && c.email) { mail.textContent = c.email; mail.href = `mailto:${c.email}`; }
  const phone = $('[data-contact-phone]');
  if (phone && c.phone) { phone.textContent = c.phone; phone.href = `tel:${c.phone.replace(/[^\d+]/g, '')}`; }
  const wa = $('[data-contact-wa]');
  if (wa && c.whatsapp) wa.href = `https://wa.me/${c.whatsapp}`;
  const ig = $('[data-contact-ig]');
  if (ig && c.instagram) { ig.textContent = `@${c.instagram}`; ig.href = `https://instagram.com/${c.instagram}`; }
  setText($('[data-contact-loc]'), c.location);
  setText($('[data-foot-copy]'), `${site.brand?.name || 'SMV'}${site.brand?.suffix || ''}, ${new Date().getFullYear()}`);
}

function renderNumbers(list = []) {
  const row = $('[data-numbers]');
  if (!row) return;
  row.innerHTML = list.map((n) => `
    <div class="num rv">
      <b data-count="${Number(n.value) || 0}" data-suffix="${esc(n.suffix || '')}">0${esc(n.suffix || '')}</b>
      <span>${esc(n.label || '')}</span>
    </div>`).join('');
}

function renderCraft(craft) {
  const list = $('[data-craft-list]');
  const preview = $('[data-craft-preview]');
  const items = craft?.items || [];
  if (!list) return;

  list.innerHTML = items.map((it, i) => `
    <li>
      <button class="craft-row" data-craft="${i}" aria-describedby="craft-t-${i}">
        <span class="rn">${String(i + 1).padStart(2, '0')}</span>
        <h3>${esc(it.title || '')}</h3>
        <p id="craft-t-${i}">${esc(it.tagline || '')}</p>
        <figure class="craft-row-shot">
          ${it.image ? `<img src="${esc(it.image)}" alt="${esc(it.title || '')}" loading="lazy">` : ''}
        </figure>
      </button>
    </li>`).join('');

  if (preview) {
    preview.innerHTML = items.map((it, i) => {
      const v = embed(it.video);
      if (v && v.type === 'video') {
        return `<video src="${esc(v.src)}" muted loop playsinline ${i === 0 ? 'class="on"' : ''} poster="${esc(it.image || '')}"></video>`;
      }
      return it.image
        ? `<img src="${esc(it.image)}" alt="${esc(it.title || '')}" loading="lazy" ${i === 0 ? 'class="on"' : ''}>`
        : '';
    }).join('');
  }

  const rows = $$('.craft-row', list);
  const shots = preview ? Array.from(preview.children) : [];
  const activate = (i) => {
    rows.forEach((r, k) => r.classList.toggle('on', k === i));
    shots.forEach((s, k) => {
      s.classList.toggle('on', k === i);
      if (s.tagName === 'VIDEO') { k === i ? s.play().catch(() => {}) : s.pause(); }
    });
  };
  rows.forEach((row, i) => {
    row.addEventListener('pointerenter', () => activate(i));
    row.addEventListener('focus', () => activate(i));
    row.addEventListener('click', () => activate(i));
  });
  activate(0);
}

/** Builds the pool of frames the cursor spawns, plus the touch fallback grid. */
function renderEvents(events) {
  const stage = $('[data-events-stage]');
  const grid = $('[data-events-grid]');
  const items = (events?.images || []).filter((x) => x.image);
  if (!items.length) return;

  if (stage) {
    stage.innerHTML = items.map((it) => `
      <figure><img src="${esc(it.image)}" alt="" loading="lazy"></figure>
    `).join('');
  }
  if (grid) {
    grid.innerHTML = items.map((it) => `
      <li><img src="${esc(it.image)}" alt="${esc(it.caption || '')}" loading="lazy"></li>
    `).join('');
  }
}

/**
 * Cursor trail: every time the pointer has travelled far enough, the next frame
 * in the pool is placed under it, pops in and drifts away. This is the section
 * about covering events, so moving through it deals out past events.
 */
function initEventTrail() {
  const section = $('.events');
  const stage = $('[data-events-stage]');
  if (!section || !stage || REDUCED) return;
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

  const frames = $$('figure', stage);
  if (!frames.length) return;

  let last = null, travelled = 0, i = 0, z = 1;
  const STEP = 150;                       // px of pointer travel between frames

  section.addEventListener('pointermove', (e) => {
    const r = stage.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;

    if (last) travelled += Math.hypot(x - last.x, y - last.y);
    last = { x, y };
    if (travelled < STEP) return;
    travelled = 0;

    const el = frames[i % frames.length];
    i += 1;

    gsap.killTweensOf(el);
    gsap.set(el, {
      x, y, xPercent: -50, yPercent: -50, zIndex: (z += 1),
      opacity: 1, scale: 0.82,
      rotate: gsap.utils.random(-8, 8),
      clipPath: 'inset(0% 0% 100% 0%)'
    });
    gsap.timeline()
      .to(el, { clipPath: 'inset(0% 0% 0% 0%)', scale: 1, duration: 0.55, ease: 'expo.out' })
      .to(el, { opacity: 0, scale: 1.06, duration: 0.7, ease: 'power2.out' }, '+=0.35');
  }, { passive: true });

  section.addEventListener('pointerleave', () => {
    last = null; travelled = 0;
    gsap.to(frames, { opacity: 0, duration: 0.5, ease: 'power2.out', overwrite: true });
  });
}

/** The menu tracks the section under the viewport, so you always know where you are. */
function initScrollSpy() {
  const map = [
    ['#work', '[data-nav="work"]'],
    ['#craft', '[data-nav="studio"]'],
    ['#clients', '[data-nav="clients"]']
  ];
  map.forEach(([sec, link]) => {
    const s = $(sec);
    const a = $(`.nav-links ${link}`);
    if (!s || !a) return;
    ScrollTrigger.create({
      trigger: s,
      start: 'top 55%',
      end: 'bottom 45%',
      onToggle: (self) => a.classList.toggle('on', self.isActive)
    });
  });
}

/** Work frames lean toward the cursor in 3D, so the reel answers the hand. */
function initReelTilt() {
  if (REDUCED) return;
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  $$('.reel-btn').forEach((btn) => {
    const shot = $('.reel-shot', btn);
    if (!shot) return;
    const rx = gsap.quickTo(shot, 'rotationX', { duration: 0.6, ease: 'power3.out' });
    const ry = gsap.quickTo(shot, 'rotationY', { duration: 0.6, ease: 'power3.out' });
    btn.addEventListener('pointermove', (e) => {
      const r = btn.getBoundingClientRect();
      const nx = (e.clientX - r.left) / r.width - 0.5;
      const ny = (e.clientY - r.top) / r.height - 0.5;
      ry(nx * 7);
      rx(ny * -7);
    });
    btn.addEventListener('pointerleave', () => { rx(0); ry(0); });
  });
}

/** Primary buttons lean toward the cursor. Feedback, kept small. */
function initMagnetic() {
  if (REDUCED) return;
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  $$('.btn').forEach((btn) => {
    const xTo = gsap.quickTo(btn, 'x', { duration: 0.5, ease: 'power3.out' });
    const yTo = gsap.quickTo(btn, 'y', { duration: 0.5, ease: 'power3.out' });
    btn.addEventListener('pointermove', (e) => {
      const r = btn.getBoundingClientRect();
      xTo((e.clientX - (r.left + r.width / 2)) * 0.28);
      yTo((e.clientY - (r.top + r.height / 2)) * 0.4);
    });
    btn.addEventListener('pointerleave', () => { xTo(0); yTo(0); });
  });
}

function renderFilters(filters = []) {
  const box = $('[data-filters]');
  if (!box) return;
  box.innerHTML = filters.map((f, i) => `
    <button class="filter" data-filter="${esc(f.key)}" aria-pressed="${i === 0 ? 'true' : 'false'}">${esc(f.label)}</button>
  `).join('');
}

/** The reel alternates a wide frame and a tall frame so the strip has rhythm. */
function renderReel(projects) {
  const track = $('[data-reel]');
  if (!track) return;
  track.innerHTML = projects.map((p, i) => `
    <li class="reel-item ${i % 3 === 1 ? 'tall' : ''}" data-cat="${esc(p.category || '')}" data-i="${i}">
      <button class="reel-btn" data-open="${i}" aria-label="Open case: ${esc(p.title || '')}">
        <div class="reel-shot">
          ${p.image ? `<img src="${esc(p.image)}" alt="${esc(p.title || '')}" loading="${i < 3 ? 'eager' : 'lazy'}">` : ''}
        </div>
        <div class="reel-caption">
          <h3>${esc(p.title || '')}</h3>
          <span class="label">${CAT[p.category] || ''}</span>
        </div>
      </button>
    </li>`).join('');
  setText($('[data-reel-total]'), String(projects.length).padStart(2, '0'));
}

function renderFeatured(projects) {
  const sec = $('#featured');
  const p = projects.find((x) => x.featured);
  if (!sec || !p) return;
  sec.hidden = false;
  const shot = $('[data-feat-shot]', sec);
  if (shot && p.image) shot.innerHTML = `<img src="${esc(p.image)}" alt="${esc(p.title)}" loading="lazy">`;
  setText($('[data-feat-title]', sec), p.title);
  setText($('[data-feat-challenge]', sec), p.challenge || p.description);
  const stats = $('[data-feat-stats]', sec);
  if (stats) {
    stats.innerHTML = (p.stats || []).map((s) => {
      const c = countable(s.value);
      const b = c
        ? `<b data-count="${c.value}" data-prefix="${esc(c.prefix)}" data-suffix="${esc(c.suffix)}">${esc(s.value)}</b>`
        : `<b>${esc(s.value)}</b>`;
      return `<div>${b}<span>${esc(s.label)}</span></div>`;
    }).join('');
  }
  $('[data-feat-open]', sec)?.addEventListener('click', () => {
    const list = state.visible.length ? state.visible : state.projects;
    const i = list.findIndex((x) => x.id === p.id);
    openCase(i >= 0 ? i : 0, list);
  });
}

function renderClients(clients = []) {
  const track = $('[data-mq]');
  const out = $('[data-mq-out]');
  if (!track) return;
  const item = (c) => `<li>${c.logo
    ? `<img src="${esc(c.logo)}" alt="${esc(c.name || '')}">`
    : esc(c.name || '')}</li>`;
  // duplicated once so each row can wrap seamlessly
  const row = clients.map(item).join('');
  track.innerHTML = row + row;
  // the outline row runs the other way, offset so the two never line up
  if (out) {
    const shifted = clients.slice(Math.floor(clients.length / 2))
      .concat(clients.slice(0, Math.floor(clients.length / 2)));
    const rowB = shifted.map(item).join('');
    out.innerHTML = rowB + rowB;
  }
  const count = $('.clients-note b');
  if (count) count.dataset.count = String(clients.length);
}

/* ---------------------------------------------------------------- filter -- */

function applyFilter(key) {
  state.visible = [];
  $$('.reel-item').forEach((el) => {
    const on = key === 'all' || el.dataset.cat === key;
    el.classList.toggle('is-out', !on);
    if (on) state.visible.push(state.projects[Number(el.dataset.i)]);
  });
  const empty = $('[data-reel-empty]');
  if (empty) empty.hidden = state.visible.length > 0;
  setText($('[data-reel-total]'), String(state.visible.length).padStart(2, '0'));
  window.ScrollTrigger?.refresh();
}

/* ------------------------------------------------------------------ case -- */

function openCase(index, list = state.visible) {
  const p = list[index];
  if (!p) return;
  state.caseIndex = index;
  state.caseList = list;

  const m = $('#case');
  const media = $('[data-case-media]', m);
  media.innerHTML = '';
  media.appendChild(mediaNode(p.video, p.image, p.title));
  setText($('[data-case-title]', m), p.title);
  $('[data-case-desc]', m).textContent = p.description || '';
  $('[data-case-client]', m).textContent = p.client || '';
  $('[data-case-year]', m).textContent = p.year || '';
  $('[data-case-cat]', m).textContent = CAT[p.category] || '';
  $('[data-case-count]', m).textContent =
    `${String(index + 1).padStart(2, '0')} of ${String(list.length).padStart(2, '0')}`;

  state.lastFocus = document.activeElement;
  m.hidden = false;
  m.classList.add('open');
  document.body.classList.add('no-scroll');
  state.lenis?.stop();
  $('[data-case-close]', m).focus();
}

function closeCase() {
  const m = $('#case');
  m.classList.remove('open');
  m.hidden = true;
  $('[data-case-media]', m).innerHTML = '';
  document.body.classList.remove('no-scroll');
  state.lenis?.start();
  state.lastFocus?.focus?.();
}

function stepCase(dir) {
  const list = state.caseList.length ? state.caseList : state.visible;
  if (!list.length) return;
  openCase((state.caseIndex + dir + list.length) % list.length, list);
}

/* ---------------------------------------------------------------- motion -- */

function initReveals() {
  const els = $$('.rv');
  if (REDUCED || !('IntersectionObserver' in window)) {
    els.forEach((e) => e.classList.add('in'));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      en.target.classList.add('in');
      io.unobserve(en.target);
    });
  }, { threshold: 0.2, rootMargin: '0px 0px -8% 0px' });
  els.forEach((e) => io.observe(e));
}

/**
 * Every number counts up the first time it is actually on screen.
 * Deliberately on IntersectionObserver rather than ScrollTrigger: two pinned
 * sections sit above these, and a refresh can fire a start-position trigger
 * before the visitor has ever seen the number, so it would already be at its
 * final value by the time they scrolled down.
 */
function initCounters() {
  const els = $$('[data-count]');
  if (!els.length) return;

  const run = (el) => {
    const to = Number(el.dataset.count) || 0;
    const prefix = el.dataset.prefix || '';
    const suffix = el.dataset.suffix || '';
    const obj = { v: 0 };
    gsap.to(obj, {
      v: to, duration: 1.9, ease: 'power2.out',
      onUpdate: () => { el.textContent = `${prefix}${Math.round(obj.v)}${suffix}`; },
      onComplete: () => { el.textContent = `${prefix}${to}${suffix}`; }
    });
  };

  els.forEach((el) => {
    const to = Number(el.dataset.count) || 0;
    const prefix = el.dataset.prefix || '';
    const suffix = el.dataset.suffix || '';
    if (REDUCED) { el.textContent = `${prefix}${to}${suffix}`; return; }
    el.textContent = `${prefix}0${suffix}`;
  });
  if (REDUCED) return;

  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      io.unobserve(en.target);
      run(en.target);
    });
  }, { threshold: 0.6 });

  els.forEach((el) => io.observe(el));
}

/** Splits "48h" into 48 + "h" so mixed values can still animate. */
function countable(raw) {
  const m = String(raw ?? '').match(/^(\D*)(\d+(?:\.\d+)?)(.*)$/);
  if (!m) return null;
  return { prefix: m[1], value: m[2], suffix: m[3] };
}



/** Writes the statement copy and its accent phrase. Split happens later. */
function prepareStatement() {
  const p = $('[data-statement]');
  if (!p) return null;
  const accent = state.site?.statementAccent;
  const full = p.textContent.trim();
  const at = accent ? full.indexOf(accent) : -1;
  if (at >= 0) {
    // the phrase takes its closing punctuation with it, so the full stop is
    // never left sitting in ink at the end of the coloured phrase
    let end = at + accent.length;
    if ('.!?,'.includes(full[end])) end += 1;
    const before = full.slice(0, at).trim();
    const after = full.slice(end).trim();
    p.innerHTML =
      `<span class="st-part st-main">${esc(before)}</span> ` +
      `<span class="st-part hi">${esc(full.slice(at, end))}</span>` +
      (after ? ` <span class="st-part">${esc(after)}</span>` : '');
  } else {
    p.innerHTML = `<span class="st-part st-main">${esc(full)}</span>`;
  }
  return p;
}

function splitLines(p) {
  if (typeof window.SplitText !== 'function') return { lines: [p], revert() {} };
  const s = new SplitText(p, { type: 'lines', linesClass: 'st-line', mask: 'lines' });
  return { lines: s.lines.length ? s.lines : [p], revert: () => s.revert() };
}

/** A disc that replaces the pointer over the work, labelled for what a click does. */
function initViewerCursor() {
  const dot = $('[data-viewer]');
  if (!dot || REDUCED) return;
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

  gsap.set(dot, { xPercent: -50, yPercent: -50, scale: 0.6, opacity: 0 });
  const xTo = gsap.quickTo(dot, 'x', { duration: 0.22, ease: 'power3.out' });
  const yTo = gsap.quickTo(dot, 'y', { duration: 0.22, ease: 'power3.out' });
  let shown = false;

  // no overwrite here: it would kill the quickTo tweens that follow the pointer
  const show = (label) => {
    dot.textContent = label;
    if (shown) return;
    shown = true;
    document.body.classList.add('viewer-on');
    gsap.to(dot, { opacity: 1, scale: 1, duration: 0.32, ease: 'back.out(2)' });
  };
  const hide = () => {
    if (!shown) return;
    shown = false;
    document.body.classList.remove('viewer-on');
    gsap.to(dot, { opacity: 0, scale: 0.6, duration: 0.25, ease: 'power2.out' });
  };

  window.addEventListener('pointermove', (e) => {
    xTo(e.clientX); yTo(e.clientY);
    const btn = e.target.closest?.('.reel-btn');
    if (!btn) { hide(); return; }
    const item = btn.closest('.reel-item');
    const project = state.projects[Number(item?.dataset.i)];
    show(project?.video ? 'Play' : 'View');
  }, { passive: true });

  document.addEventListener('pointerleave', hide);
  window.addEventListener('blur', hide);
  // the disc must not sit over the open case view
  $('#case')?.addEventListener('pointerenter', hide);
}

/**
 * The section after the header, designed as one continuous focus pull: the
 * block settles up from slightly deep, each line rises through its own mask
 * and resolves from blur, and the accent phrase takes its colour last, once
 * the sentence is standing. Scrubbed, so it plays at the reader's pace.
 */
function initStatement() {
  const p = $('[data-statement]');
  if (!p || REDUCED) return;

  let split = null;
  let tl = null;

  const build = () => {
    tl?.scrollTrigger?.kill();
    tl?.kill();
    split?.revert();
    gsap.set(p, { clearProps: 'all' });
    split = splitLines(p);

    tl = gsap.timeline({
      scrollTrigger: {
        trigger: '.statement', start: 'top 78%', end: 'center 42%',
        scrub: 1, invalidateOnRefresh: true
      }
    });
    tl.fromTo(p, { scale: 0.94, y: 44 }, { scale: 1, y: 0, ease: 'power2.out', duration: 1 }, 0)
      .fromTo(split.lines,
        { yPercent: 110, opacity: 0, filter: 'blur(14px)' },
        { yPercent: 0, opacity: 1, filter: 'blur(0px)', stagger: 0.16, ease: 'power3.out', duration: 0.8 }, 0)
      .fromTo('.statement .hi',
        { color: '#16171A' }, { color: '#E4381B', ease: 'none', duration: 0.3 }, 0.72);
  };
  build();

  // line breaks change with the viewport, so the masks have to be rebuilt
  let t;
  window.addEventListener('resize', () => {
    clearTimeout(t);
    t = setTimeout(() => { build(); ScrollTrigger.refresh(); }, 250);
  });
}

/** Pinned horizontal pan. Wrapper pins, inner track slides. */
function initReel() {
  gsap.matchMedia().add('(min-width: 761px) and (prefers-reduced-motion: no-preference)', () => {
    const viewport = $('.reel-viewport');
    const track = $('[data-reel]');
    const bar = $('[data-reel-bar]');
    const count = $('[data-reel-count]');
    if (!viewport || !track) return;

    const distance = () => Math.max(
      1, track.scrollWidth - window.innerWidth + parseFloat(getComputedStyle(track).paddingRight || 0)
    );

    const tween = gsap.to(track, {
      x: () => -distance(),
      ease: 'none',
      scrollTrigger: {
        trigger: viewport,
        start: 'top top',
        end: () => `+=${distance()}`,
        pin: true,
        scrub: 1,
        invalidateOnRefresh: true,
        anticipatePin: 1,
        onUpdate: (self) => {
          if (bar) gsap.set(bar, { scaleX: self.progress });
          if (count) {
            const shown = $$('.reel-item:not(.is-out)').length || 1;
            const n = Math.min(shown, Math.floor(self.progress * shown) + 1);
            count.textContent = String(n).padStart(2, '0');
          }
        }
      }
    });
    state.reelTween = tween;
    return () => {
      tween.scrollTrigger?.kill();
      tween.kill();
      gsap.set(track, { clearProps: 'x' });
    };
  });
}

function initMarquee() {
  if (REDUCED) return;
  const rows = [
    { el: $('[data-mq]'), from: 0, to: -50, dur: 52 },
    { el: $('[data-mq-out]'), from: -50, to: 0, dur: 64 }
  ];
  rows.forEach(({ el, from, to, dur }) => {
    if (!el || !el.children.length) return;
    const loop = gsap.fromTo(el, { xPercent: from },
      { xPercent: to, ease: 'none', duration: dur, repeat: -1 });
    el.addEventListener('pointerenter', () => gsap.to(loop, { timeScale: 0.15, duration: 0.5 }));
    el.addEventListener('pointerleave', () => gsap.to(loop, { timeScale: 1, duration: 0.5 }));
  });
}

function initSmoothScroll() {
  if (REDUCED || typeof Lenis === 'undefined') return null;
  const lenis = new Lenis({ lerp: 0.09, wheelMultiplier: 1, smoothWheel: true });
  lenis.on('scroll', (e) => {
    ScrollTrigger.update();
    state.gl?.setVelocity((e.velocity || 0) / 60);
  });
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);

  $$('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (ev) => {
      const id = a.getAttribute('href');
      if (!id || id === '#') return;
      const target = document.querySelector(id);
      if (!target) return;
      ev.preventDefault();
      lenis.scrollTo(target, { offset: -68 });
    });
  });
  return lenis;
}

/** Plain crossfade through the stills stack when there is no WebGL context. */
/**
 * The typed sentence: 38ms a character after a 600ms breath, with a blinking
 * caret that leaves once the sentence is finished. Reduced motion gets the
 * finished sentence immediately.
 */
function initTypewriter() {
  const out = $('[data-typed]');
  const caret = $('[data-caret]');
  const text = state.site?.hero?.sub || '';
  if (!out || !text) return;
  if (REDUCED) { out.textContent = text; caret?.remove(); return; }
  caret.hidden = false;
  let i = 0;
  setTimeout(() => {
    const iv = setInterval(() => {
      i += 1;
      out.textContent = text.slice(0, i);
      if (i >= text.length) { clearInterval(iv); caret.remove(); }
    }, 38);
  }, 600);
}

/**
 * The pill actions arrive 400ms after load, independent of the typing, as a
 * fade and small rise. Four white pills route into the page; the outline pill
 * carries the email and copies it on click.
 */
function renderPills() {
  const box = $('[data-pills]');
  if (!box) return;
  const pills = state.site?.hero?.pills || [];
  const email = state.site?.contact?.email || '';
  const copyIcon = '<svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.2" aria-hidden="true"><rect x="3.5" y="3.5" width="7" height="7"/><rect x="1" y="1" width="7" height="7"/></svg>';
  box.innerHTML =
    pills.map((p) => `<a class="pill" href="${esc(p.href || '#')}">${esc(p.label || '')}</a>`).join('') +
    (email ? `<button class="pill pill-outline" type="button" data-copy-email>Reach us: <u>${esc(email)}</u>${copyIcon}</button>` : '');
  $('[data-copy-email]', box)?.addEventListener('click', () => {
    navigator.clipboard?.writeText(email).catch(() => {});
  });
  setTimeout(() => box.classList.add('in'), REDUCED ? 0 : 400);
}

/** The burger morphs to a cross and the white menu fades over the page. */
function initMobileMenu() {
  const btn = $('[data-burger]');
  const menu = $('[data-mobile-menu]');
  if (!btn || !menu) return;
  const set = (open) => {
    document.body.classList.toggle('menu-open', open);
    btn.setAttribute('aria-expanded', String(open));
    btn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    menu.setAttribute('aria-hidden', String(!open));
  };
  btn.addEventListener('click', () => set(!document.body.classList.contains('menu-open')));
  $$('a', menu).forEach((a) => a.addEventListener('click', () => set(false)));
}

/**
 * The character tracks the hand. The reel is a camera sweep, and three frames
 * of it are the poses that matter:
 *   0.97s  aiming to the viewer's left
 *   1.45s  aiming straight out of the screen
 *   1.94s  aiming hard to the viewer's right
 * The mouse's position across the viewport is mapped into that segment,
 * anchored on where the character stands, so with the cursor to his left he
 * aims left, in front of him he shoots straight at you, and to his right he
 * swings right. The target eases toward the mapped frame and only one seek is
 * ever in flight, so the motion reads as him following you, not jumping.
 */
function initHeroScrub() {
  const fig = $('[data-hero-media]');
  const video = fig && fig.dataset.mode === 'scrub' ? $('video', fig) : null;
  if (!video || REDUCED) return;
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

  const T_LEFT = 0.97, T_FRONT = 1.45, T_RIGHT = 1.94;
  const ANCHOR = 0.58;          // the character's x, as a fraction of the viewport
  let mapped = T_FRONT;
  let target = T_FRONT;
  let seeking = false;
  let running = false;

  const seekTo = (tm) => { seeking = true; video.currentTime = tm; };

  window.addEventListener('mousemove', (e) => {
    if (!video.duration || Number.isNaN(video.duration)) return;
    const f = e.clientX / window.innerWidth;
    mapped = f < ANCHOR
      ? T_LEFT + (f / ANCHOR) * (T_FRONT - T_LEFT)
      : T_FRONT + ((f - ANCHOR) / (1 - ANCHOR)) * (T_RIGHT - T_FRONT);
    if (!running) { running = true; requestAnimationFrame(follow); }
  }, { passive: true });

  function follow() {
    // ease toward the pointer's frame; stop ticking once settled
    target += (mapped - target) * 0.14;
    target = Math.max(T_LEFT, Math.min(T_RIGHT, target));
    if (!seeking && Math.abs(target - video.currentTime) > 0.02) seekTo(target);
    if (Math.abs(mapped - target) > 0.005 || Math.abs(target - video.currentTime) > 0.02) {
      requestAnimationFrame(follow);
    } else {
      running = false;
    }
  }

  video.addEventListener('seeked', () => { seeking = false; });
  // a src swap (the blob rescue) can strand a seek in flight; clear the flag
  // whenever the media resets so the follow loop can drive the new source
  video.addEventListener('loadstart', () => { seeking = false; });
  video.addEventListener('loadeddata', () => {
    seeking = false;
    target = T_FRONT;
    seekTo(T_FRONT);
  });

  // a host without Range request support serves a video whose seekable range
  // is [0,0], and every seek snaps back to the first frame. fetching the file
  // once and playing it from a blob URL makes it fully seekable anywhere.
  let rescued = false;
  const ensureSeekable = async () => {
    if (rescued) return;
    const ok = video.seekable.length && video.seekable.end(0) >= (video.duration || 0) - 0.1;
    if (ok) { seekTo(T_FRONT); return; }   // open on the front pose
    rescued = true;
    try {
      const res = await fetch(video.currentSrc || video.src);
      const blob = await res.blob();
      video.src = URL.createObjectURL(blob);
      video.load();
    } catch (err) { /* stays unseekable; the header simply holds its poster */ }
  };
  if (video.readyState >= 1) ensureSeekable();
  video.addEventListener('durationchange', ensureSeekable);
}

function heroCrossfade() {
  const fig = $('[data-hero-media]');
  if (!fig || fig.dataset.mode !== 'stills') return;
  const shots = $$('img', fig);
  if (shots.length < 2 || REDUCED) return;
  let i = 0;
  setInterval(() => {
    shots[i].classList.remove('on');
    i = (i + 1) % shots.length;
    shots[i].classList.add('on');
  }, 4600);
}

async function initGL() {
  const canvas = $('#gl');
  const frame = $('[data-hero-media]');
  // the shader only drives the stills stack; a real showreel or the looping
  // placeholder plays as a normal media element instead
  if (frame && frame.dataset.mode !== 'stills') return;
  const sources = heroSources(state.site);
  if (REDUCED || !canvas || !frame || !sources.length) {
    heroCrossfade();
    return;
  }
  try {
    const { createHeroGL } = await import('./gl.js');
    state.gl = createHeroGL({ canvas, frame, sources, paper: '#F1F1EF', accent: '#E4381B' });
    window.__gl = state.gl;
    if (!state.gl) heroCrossfade();   // no WebGL context: the DOM stack cycles instead
  } catch (err) {
    // no WebGL or three.js unavailable: the DOM image stays visible, graded in CSS
    console.warn('Hero WebGL layer unavailable, using the plain image.', err);
  }
}

/* ------------------------------------------------------------------ boot -- */

function wireEvents() {
  $('[data-filters]')?.addEventListener('click', (e) => {
    const btn = e.target.closest('.filter');
    if (!btn) return;
    $$('.filter').forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
    applyFilter(btn.dataset.filter);
  });

  $('[data-reel]')?.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-open]');
    if (!btn) return;
    const project = state.projects[Number(btn.closest('.reel-item').dataset.i)];
    const i = state.visible.indexOf(project);
    openCase(i >= 0 ? i : 0, state.visible);
  });

  $('[data-case-close]')?.addEventListener('click', closeCase);
  $('[data-case-prev]')?.addEventListener('click', () => stepCase(-1));
  $('[data-case-next]')?.addEventListener('click', () => stepCase(1));
  document.addEventListener('keydown', (e) => {
    if ($('#case')?.hidden) return;
    if (e.key === 'Escape') closeCase();
    if (e.key === 'ArrowRight') stepCase(1);
    if (e.key === 'ArrowLeft') stepCase(-1);
  });
}

async function boot() {
  if (window.gsap && window.ScrollTrigger) gsap.registerPlugin(ScrollTrigger);

  let site, projectsDoc;
  try {
    [site, projectsDoc] = await Promise.all([
      loadJSON('data/site.json'), loadJSON('data/projects.json')
    ]);
  } catch (err) {
    console.error('Content failed to load.', err);
    const track = $('[data-reel]');
    if (track) track.innerHTML = '<li class="label">Work could not be loaded. Please refresh.</li>';
    return;
  }

  state.site = site;
  state.projects = projectsDoc.projects || [];
  state.visible = state.projects.slice();

  renderChrome(site);
  renderNumbers(site.numbers);
  renderEvents(site.events);
  renderCraft(site.craft);
  renderFilters(site.gallery?.filters);
  renderReel(state.projects);
  renderFeatured(state.projects);
  renderClients(site.clients);

  renderPills();
  initTypewriter();
  initMobileMenu();

  wireEvents();
  initReveals();

  if (window.gsap) {
    prepareStatement();
    initStatement();
    initEventTrail();
    initMagnetic();
    initViewerCursor();
    initCounters();
    initReel();
    initReelTilt();
    initScrollSpy();
    initMarquee();
    state.lenis = initSmoothScroll();
    window.__lenis = state.lenis;
  }

  initHeroScrub();
  await initGL();
  window.ScrollTrigger?.refresh();

  // images finishing late change the width the pan depends on
  window.addEventListener('load', () => window.ScrollTrigger?.refresh());
}

boot();
