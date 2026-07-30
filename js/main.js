/* ==========================================================================
   SMV.AE / main.js
   Everything visible is rendered from data/site.json + data/projects.json so
   the whole site stays editable from the admin side (Pages CMS).

   Motion, and the reason each piece exists:
     Lenis            continuous scroll, so the reel and the parallax read as one move
     hero lines       masked reveal, establishes hierarchy on load
     statement        words darken as they are read, ties pace to scroll
     full bleed       slow parallax, a breath between two dense sections
     counters         count up on entry, draws the eye to the claim
     craft list       hover swaps the preview frame, browsing without leaving the page
     work reel        pinned horizontal pan, the work is the content so it gets the motion
     marquee          breadth of the client list, no individual attention needed
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

function renderChrome(site) {
  const n = site.brand?.navLabels || {};
  $$('[data-nav]').forEach((el) => setText(el, n[el.dataset.nav]));
  if (site.brand?.name) {
    $('.logo').innerHTML = `${esc(site.brand.name)}<span>${esc(site.brand.suffix || '')}</span>`;
  }
  Object.entries(site.hero || {}).forEach(([k, v]) => {
    $$(`[data-hero="${k}"]`).forEach((el) => setText(el, v));
  });

  const heroFig = $('[data-hero-media]');
  const heroVid = embed(site.hero?.video);
  if (heroFig && heroVid && heroVid.type === 'video') {
    heroFig.innerHTML = '';
    const v = document.createElement('video');
    v.src = heroVid.src; v.muted = true; v.loop = true; v.autoplay = true;
    v.playsInline = true; v.poster = site.hero.image || '';
    heroFig.appendChild(v);
    heroFig.dataset.video = '1';
  } else if (heroFig && site.hero?.image) {
    const img = $('img', heroFig);
    if (img) img.src = site.hero.image;
  }

  const bleed = $('[data-bleed] img');
  if (bleed && site.interlude?.image) bleed.src = site.interlude.image;

  setText($('[data-statement]'), site.statement);
  setText($('[data-craft-eyebrow]'), site.craft?.eyebrow);
  setText($('[data-craft-heading]'), site.craft?.heading);
  setText($('[data-gal-heading]'), site.gallery?.heading);
  setText($('[data-clients-eyebrow]'), site.clientsSection?.eyebrow);
  setText($('[data-clients-heading]'), site.clientsSection?.heading);

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
    stats.innerHTML = (p.stats || [])
      .map((s) => `<div><b>${esc(s.value)}</b><span>${esc(s.label)}</span></div>`).join('');
  }
  $('[data-feat-open]', sec)?.addEventListener('click', () => {
    const list = state.visible.length ? state.visible : state.projects;
    const i = list.findIndex((x) => x.id === p.id);
    openCase(i >= 0 ? i : 0, list);
  });
}

function renderClients(clients = []) {
  const track = $('[data-mq]');
  if (!track) return;
  const item = (c) => `<li>${c.logo
    ? `<img src="${esc(c.logo)}" alt="${esc(c.name || '')}">`
    : esc(c.name || '')}</li>`;
  // duplicated once so the loop wraps seamlessly
  track.innerHTML = clients.map(item).join('') + clients.map(item).join('');
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

function initCounters() {
  $$('[data-count]').forEach((el) => {
    const to = Number(el.dataset.count) || 0;
    const suffix = el.dataset.suffix || '';
    if (REDUCED) { el.textContent = `${to}${suffix}`; return; }
    const obj = { v: 0 };
    ScrollTrigger.create({
      trigger: el, start: 'top 88%', once: true,
      onEnter: () => gsap.to(obj, {
        v: to, duration: 1.6, ease: 'power2.out',
        onUpdate: () => { el.textContent = `${Math.round(obj.v)}${suffix}`; }
      })
    });
  });
}

function initHero() {
  if (REDUCED) return;
  gsap.timeline({ defaults: { ease: 'expo.out' } })
    .from('.hero-title .ln i', { yPercent: 112, duration: 1.15, stagger: 0.08 })
    .from('.hero-sub, .hero-actions', { y: 18, opacity: 0, duration: 0.9, stagger: 0.08 }, 0.32);
}

function initStatement() {
  const p = $('[data-statement]');
  if (!p) return;
  const words = p.textContent.trim().split(/\s+/);
  p.innerHTML = words.map((w) => `<span class="w">${esc(w)}</span>`).join(' ');
  if (REDUCED) return;
  const spans = $$('.w', p);
  ScrollTrigger.create({
    trigger: p, start: 'top 82%', end: 'bottom 58%', scrub: true,
    onUpdate: (self) => {
      const n = Math.round(self.progress * spans.length);
      spans.forEach((s, i) => s.classList.toggle('on', i < n));
    }
  });
}

function initBleed() {
  if (REDUCED) return;
  const img = $('[data-bleed] img');
  if (!img) return;
  gsap.fromTo(img, { yPercent: -14 }, {
    yPercent: 0, ease: 'none',
    scrollTrigger: { trigger: '[data-bleed]', start: 'top bottom', end: 'bottom top', scrub: true }
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
  const track = $('[data-mq]');
  if (!track || REDUCED || !track.children.length) return;
  const loop = gsap.to(track, { xPercent: -50, ease: 'none', duration: 48, repeat: -1 });
  track.addEventListener('pointerenter', () => gsap.to(loop, { timeScale: 0.2, duration: 0.5 }));
  track.addEventListener('pointerleave', () => gsap.to(loop, { timeScale: 1, duration: 0.5 }));
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

async function initGL() {
  const canvas = $('#gl');
  const frame = $('[data-hero-media]');
  const src = state.site?.hero?.image;
  if (REDUCED || !canvas || !frame || !src || frame.dataset.video === '1') return;
  try {
    const { createHeroGL } = await import('./gl.js');
    state.gl = createHeroGL({ canvas, frame, src, paper: '#F1F1EF', accent: '#E4381B' });
    window.__gl = state.gl;
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
  renderCraft(site.craft);
  renderFilters(site.gallery?.filters);
  renderReel(state.projects);
  renderFeatured(state.projects);
  renderClients(site.clients);

  wireEvents();
  initReveals();

  if (window.gsap) {
    initHero();
    initStatement();
    initBleed();
    initCounters();
    initReel();
    initMarquee();
    state.lenis = initSmoothScroll();
  }

  await initGL();
  window.ScrollTrigger?.refresh();

  // images finishing late change the width the pan depends on
  window.addEventListener('load', () => window.ScrollTrigger?.refresh());
}

boot();
