/* ————————————————————————————————
   SMV.AE — main.js
   Scrub-driven scenes (weedensenteret-style): scroll plays the
   story forward and backward. The continuous particle world
   (js/background.js) follows via window.__chapterTarget.
   ———————————————————————————————— */

const qs  = (s, c = document) => c.querySelector(s);
const qsa = (s, c = document) => [...c.querySelectorAll(s)];
const prefersReduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const isTouch = matchMedia('(pointer: coarse)').matches;

const CATS = { video: 'Video', photo: 'Photo', ai: 'AI', motion: 'Motion', events: 'Events' };

let SITE = null;
let PROJECTS = [];
let lenis = null;
let visible = [];      // ids of currently visible (filtered) cards
let modalOpen = false;
let currentId = null;

const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const pad2 = n => String(n).padStart(2, '0');

// Placeholder art: seeded duotone gradient fields — replaced by real media via admin.
const grad = (hue = 40, spread = 42) =>
  `background-image:radial-gradient(90% 75% at 72% 22%,hsla(${hue},52%,30%,.55),transparent 62%),` +
  `radial-gradient(70% 60% at 22% 78%,hsla(${(hue + spread) % 360},46%,22%,.5),transparent 65%);` +
  `background-color:#0b0b0d`;

init();

async function init() {
  document.documentElement.classList.add('js');
  if (prefersReduced) document.documentElement.classList.add('reduced');
  if (location.protocol === 'file:') { fileNotice(); return; }
  history.scrollRestoration = 'manual'; // the journey starts at the top
  scrollTo(0, 0);

  await loadData();
  applySite();
  renderDisciplines();
  renderWork();
  renderFeatured();
  renderNumbers();
  renderClients();
  renderProcess();
  renderContact();

  setupScroll();
  setupLoader();
  setupCursor();
  setupBackground();
  setupScenes();
  setupRail();
  setupFilters();
  setupModal();
  setupCounters();
  setupMagnetic();

  addEventListener('load', () => ScrollTrigger.refresh());
  document.fonts?.ready.then(() => ScrollTrigger.refresh());

  // Chrome restores scroll only once the JS-rendered content gives the page
  // its full height — after our early reset. Pin the journey to the top.
  const toTop = () => { scrollTo(0, 0); lenis?.scrollTo(0, { immediate: true, force: true }); };
  toTop();
  addEventListener('load', toTop, { once: true });
  setTimeout(toTop, 300);
}

async function loadData() {
  try {
    const [s, p] = await Promise.all([
      fetch('data/site.json').then(r => r.json()),
      fetch('data/projects.json').then(r => r.json()),
    ]);
    SITE = s;
    PROJECTS = p.projects || [];
  } catch (e) {
    console.warn('SMV: content failed to load', e);
  }
}

/* ————— render ————— */

function applySite() {
  if (!SITE) return;
  qs('#hl1').textContent = SITE.hero.line1;
  qs('#hl2').textContent = SITE.hero.line2;
  qs('.hero-sub').textContent = SITE.hero.sub;
  qs('.statement-text').textContent = SITE.statement;
}

function renderDisciplines() {
  const wrap = qs('#disc-slides');
  if (!SITE?.disciplines?.length) { qs('#disciplines').hidden = true; return; }
  wrap.innerHTML = SITE.disciplines.map((d, i) => `
    <div class="disc-slide">
      ${d.clip
        ? `<div class="panel-media"><video src="${esc(d.clip)}" muted loop playsinline preload="none"></video></div>`
        : ''}
      <div class="panel-inner">
        <span class="panel-kicker">What we do — ${pad2(i + 1)} / ${pad2(SITE.disciplines.length)}</span>
        <h3 class="panel-title">${esc(d.title)}</h3>
        <p class="panel-tag">${esc(d.tagline)}</p>
      </div>
      ${d.clip ? '' : '<span class="ph-tag">3-sec clip placeholder — set in admin</span>'}
    </div>`).join('');
}

function renderWork() {
  const g = qs('#work-grid');
  if (!PROJECTS.length) { qs('#work').hidden = true; return; }
  g.innerHTML = PROJECTS.map((p, i) => `
    <article class="card ${p.size || 'sp6'} cat-${p.category}" data-id="${esc(p.id)}"
             data-cursor="VIEW" tabindex="0" role="button" aria-label="Open case: ${esc(p.title)}">
      <div class="card-media" style="${p.image ? `background-image:url('${esc(p.image)}')` : grad(p.hue)}">
        <span class="card-num">${pad2(i + 1)}</span>
      </div>
      <div class="card-info">
        <h4>${esc(p.title)}</h4>
        <span>${CATS[p.category] || ''} · ${esc(p.year)}</span>
      </div>
    </article>`).join('');
  visible = PROJECTS.map(p => p.id);
}

function renderFeatured() {
  const sec = qs('#featured');
  const p = PROJECTS.find(x => x.featured);
  if (!p) { sec.hidden = true; return; }
  sec.innerHTML = `
    <div class="featured-media" style="${p.image ? `background-image:url('${esc(p.image)}')` : grad(p.hue, 60)}"></div>
    <div class="featured-scrim"></div>
    <div class="featured-body">
      <span class="eyebrow">05 — Featured case · ${CATS[p.category] || ''}</span>
      <h3 class="featured-title">${esc(p.title)}</h3>
      <p class="featured-challenge">${esc(p.challenge || p.description)}</p>
      <ul class="featured-stats">
        ${(p.stats || []).map(s => `<li><strong>${esc(s.value)}</strong><span>${esc(s.label)}</span></li>`).join('')}
      </ul>
      <button class="btn-line" data-open="${esc(p.id)}">View case</button>
    </div>`;
}

function renderNumbers() {
  const row = qs('#numbers-row');
  if (!SITE?.numbers?.length) { qs('#numbers').hidden = true; return; }
  row.innerHTML = SITE.numbers.map(n => `
    <div class="num">
      <span class="num-v" data-count="${n.value}">0</span><span class="num-s">${esc(n.suffix)}</span>
      <span class="num-l">${esc(n.label)}</span>
    </div>`).join('');
}

function renderClients() {
  if (!SITE?.clients?.length) { qs('#clients').hidden = true; return; }
  const list = SITE.clients;
  const half = Math.ceil(list.length / 2);
  const rows = [[qs('#mq-a'), list.slice(0, half)], [qs('#mq-b'), list.slice(half)]];
  rows.forEach(([track, names]) => {
    if (!names.length) { track.parentElement.hidden = true; return; }
    const items = [...names, ...names];
    track.innerHTML = items.map(c => `<span class="mq-item">${esc(c)}</span><span class="mq-dot">✦</span>`).join('');
  });
}

function renderProcess() {
  const row = qs('#process-row');
  if (!SITE?.process?.length) { qs('#process').hidden = true; return; }
  row.innerHTML = SITE.process.map((s, i) => `
    <div class="step">
      <span class="step-i">${pad2(i + 1)}</span>
      <h3>${esc(s.title)}</h3>
      <p>${esc(s.text)}</p>
    </div>`).join('');
}

function renderContact() {
  if (!SITE?.contact) return;
  const c = SITE.contact;
  qs('#contact-headline').innerHTML = c.headline.split('\n')
    .map(l => `<span class="contact-line">${esc(l)}</span>`).join('');
  const em = qs('#contact-email');
  em.textContent = c.email;
  em.href = `mailto:${c.email}`;
  qs('#contact-meta').innerHTML = `
    <a href="tel:${esc(c.phone.replace(/\s/g, ''))}">${esc(c.phone)}</a>
    <a href="https://wa.me/${esc(c.whatsapp)}" target="_blank" rel="noopener">WhatsApp</a>
    <a href="https://instagram.com/${esc(c.instagram)}" target="_blank" rel="noopener">@${esc(c.instagram)}</a>
    <span>${esc(c.location)}</span>`;
  qs('#foot-copy').textContent = `© ${new Date().getFullYear()} SMV Media Production`;
  qs('#foot-loc').textContent = c.location;
}

/* ————— scroll / smooth ————— */

function setupScroll() {
  gsap.registerPlugin(ScrollTrigger, Flip);

  if (!prefersReduced && typeof Lenis !== 'undefined') {
    lenis = new Lenis({ lerp: 0.09 });
    window.lenis = lenis;
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(t => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    lenis.stop(); // released when loader exits
  }

  qsa('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
    const t = qs(a.getAttribute('href'));
    if (!t) return;
    e.preventDefault();
    lenis ? lenis.scrollTo(t, { duration: 1.4 }) : t.scrollIntoView({ behavior: 'smooth' });
  }));

  const nav = qs('#nav');
  let last = 0;
  const onScroll = y => { nav.classList.toggle('nav-hidden', y > last && y > 140); last = y; };
  if (lenis) lenis.on('scroll', ({ scroll }) => onScroll(scroll));
  else addEventListener('scroll', () => onScroll(scrollY), { passive: true });
}

/* ————— loader (portfolio-style: count + rotating quips) ————— */

const QUIPS = [
  'Framing the moment…',
  'Aligning 16,000 particles…',
  'Rolling cameras…',
  'Color grading the night…',
  'Charging the gold…',
];

function setupLoader() {
  const loader = qs('#loader');
  const count = qs('.loader-count');
  const quip = qs('#load-quip');

  qsa('.hero-title .line').forEach(l => {
    l.innerHTML = `<span class="line-inner">${l.innerHTML}</span>`;
  });

  // reduced motion, or loaded in a background tab (rAF is throttled there,
  // the timeline would play stale on return) — skip straight to the site
  if (prefersReduced || document.hidden) {
    loader.remove();
    document.body.classList.remove('is-loading');
    lenis?.start();
    return;
  }

  let qi = 0;
  const quipTimer = setInterval(() => {
    qi = (qi + 1) % QUIPS.length;
    quip.textContent = QUIPS[qi];
  }, 650);

  const o = { v: 0 };
  gsap.timeline()
    .to(o, {
      v: 100, duration: 1.4, ease: 'power2.inOut',
      onUpdate: () => count.textContent = String(Math.round(o.v)).padStart(3, '0'),
    })
    .to(loader, { yPercent: -100, duration: .9, ease: 'power4.inOut' }, '+=.1')
    .from('.hero-ui', { opacity: 0, duration: 1, ease: 'power2.out' }, '-=.4')
    .from(['.scroll-cue', '.hero-tag', '#hero .scrubmeter'], { opacity: 0, y: 18, duration: .7, stagger: .08 }, '-=.6')
    .add(() => {
      clearInterval(quipTimer);
      document.body.classList.remove('is-loading');
      lenis?.start();
      loader.remove();
    });
}

/* ————— continuous background world / reel ————— */

function setupBackground() {
  const reel = SITE?.hero?.reel;
  if (reel) {
    const v = qs('#reel');
    v.src = reel;
    v.hidden = false;
    v.play?.().catch(() => {});
    qs('.hero-tag')?.remove();
  }
  import('./background.js?v=3')
    .then(m => m.initBackground(qs('#gl')))
    .catch(e => console.warn('SMV: WebGL unavailable, static fallback', e));
}

/* ————— scrubbed scenes + chapter driver ————— */

const setCh = v => { window.__chapterTarget = v; };

function setupScenes() {
  if (prefersReduced) { setCh(1); return; } // static ring; content flows normally

  /* — chapter driver: maps each scene's scrub to a formation range.
       Every trigger reports its progress into a slot; the chapter is
       derived from the furthest scene actually entered (so a refresh,
       where ALL triggers fire, can't let a later scene overwrite an
       earlier one). — */
  const DRIVERS = [
    ['#hero', 'top top', '55% top', p => p],                      // 0 chaos → 1 ring
    ['#statement', 'top 95%', 'top 35%', p => 1 + p],             // → 2 dust
    ['#disciplines', 'top 55%', 'bottom bottom', p => 2 + p * 5], // → 7 radar (through 5 crafts)
    ['#work', 'top 75%', 'top 15%', p => 7 + p],                  // → 8 starfield
    ['#contact', 'top 85%', 'bottom bottom', p => 8 + p],         // → 9 burst
  ];
  const slots = DRIVERS.map(() => 0);
  const derive = () => {
    for (let i = slots.length - 1; i >= 0; i--) if (slots[i] > 0) return DRIVERS[i][3](slots[i]);
    return 0;
  };
  DRIVERS.forEach(([trigger, start, end], i) =>
    ScrollTrigger.create({ trigger, start, end, onUpdate: self => { slots[i] = self.progress; setCh(derive()); } }));

  /* — hero: scroll assembles the frame — */
  const heroPct = qs('#heroPct'), heroRing = qs('#heroRing');
  gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: {
      trigger: '#hero', start: 'top top', end: 'bottom bottom', scrub: true,
      onUpdate: self => {
        const pp = Math.round(self.progress * 100);
        heroPct.textContent = pad2(pp);
        heroRing.style.setProperty('--p', pp + '%');
      },
    },
  })
    .fromTo('.hero-title .line-inner',
      { letterSpacing: '0.32em', opacity: 0.22, filter: 'blur(2px)' },
      { letterSpacing: '0em', opacity: 1, filter: 'blur(0px)', duration: 4.5, stagger: 0.6, ease: 'power2.out' }, 0)
    .fromTo('.hero-sub', { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 1.6 }, 3)
    .to('.scroll-cue', { opacity: 0, duration: 1 }, 6.2)
    .to('.hero-ui', { opacity: 0, y: -70, duration: 2.4, ease: 'power2.in' }, 7.4); // total 10

  /* — disciplines: one pinned sequence, five slides — */
  const slides = qsa('.disc-slide');
  if (slides.length) {
    const discNum = qs('#disc-num'), discIdx = qs('#disc-idx');
    const discPct = qs('#discPct'), discRing = qs('#discRing');
    const tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: {
        trigger: '#disciplines', start: 'top top', end: 'bottom bottom', scrub: true,
        onUpdate: self => {
          const p = self.progress;
          const idx = Math.min(slides.length - 1, Math.floor(p * slides.length * 0.9999));
          discNum.textContent = pad2(idx + 1);
          discIdx.textContent = pad2(idx + 1);
          const pp = Math.round(p * 100);
          discPct.textContent = pad2(pp);
          discRing.style.setProperty('--p', pp + '%');
        },
      },
    });
    gsap.set(slides[0], { autoAlpha: 1 }); // slide 1 is already on stage when the sequence pins
    slides.forEach((s, i) => {
      if (i > 0) tl.fromTo(s, { autoAlpha: 0, y: 90 }, { autoAlpha: 1, y: 0, duration: .8, ease: 'power3.out' }, i * 2);
      if (i < slides.length - 1) tl.to(s, { autoAlpha: 0, y: -90, duration: .8, ease: 'power3.in' }, i * 2 + 1.55);
    });
    // play a slide's clip only while its slide is on screen
    qsa('.disc-slide video').forEach(v => {
      new IntersectionObserver(([e]) => { e.isIntersecting ? v.play?.().catch(() => {}) : v.pause?.(); }).observe(v);
    });
  }

  /* — statement: word-by-word focus — */
  const st = qs('.statement-text');
  st.innerHTML = st.textContent.trim().split(/\s+/).map(w => `<span class="w">${w}</span>`).join(' ');
  gsap.fromTo('.statement-text .w', { opacity: .13 }, {
    opacity: 1, stagger: .06, ease: 'none',
    scrollTrigger: { trigger: '#statement', start: 'top 72%', end: 'center 42%', scrub: true },
  });

  /* — section heads — */
  qsa('.sec-head').forEach(h => gsap.from(h, {
    y: 40, opacity: 0, duration: 1, ease: 'power3.out',
    scrollTrigger: { trigger: h, start: 'top 85%', once: true },
  }));

  /* — work cards — */
  gsap.set('.card', { y: 50, opacity: 0 });
  ScrollTrigger.batch('.card', {
    start: 'top 92%', once: true,
    onEnter: b => gsap.to(b, {
      y: 0, opacity: 1, duration: .9, stagger: .07, ease: 'power3.out',
      onComplete: () => gsap.set(b, { clearProps: 'transform,opacity' }),
    }),
  });

  /* — featured parallax — */
  const fm = qs('.featured-media');
  if (fm) gsap.fromTo(fm, { scale: 1.14 }, {
    scale: 1, ease: 'none',
    scrollTrigger: { trigger: '#featured', start: 'top bottom', end: 'bottom top', scrub: true },
  });

  /* — contact headline reveal — */
  qsa('.contact-line').forEach(l => {
    l.innerHTML = `<span class="line-inner">${l.innerHTML}</span>`;
  });
  gsap.from('.contact-line .line-inner', {
    yPercent: 112, duration: 1.1, stagger: .1, ease: 'power4.out',
    scrollTrigger: { trigger: '#contact', start: 'top 62%', once: true },
  });
}

/* ————— chapter rail ————— */

function setupRail() {
  const links = qsa('#rail a');
  if (!links.length) return;
  const targets = links.map(a => qs(a.getAttribute('href'))).filter(Boolean);
  const update = () => {
    const mid = innerHeight * 0.45;
    let active = 0;
    targets.forEach((t, i) => { if (t.getBoundingClientRect().top <= mid) active = i; });
    links.forEach((a, i) => a.classList.toggle('on', i === active));
  };
  if (lenis) lenis.on('scroll', update);
  else addEventListener('scroll', update, { passive: true });
  update();
}

/* ————— counters ————— */

function setupCounters() {
  qsa('[data-count]').forEach(el => {
    const end = +el.dataset.count || 0;
    ScrollTrigger.create({
      trigger: el, start: 'top 85%', once: true,
      onEnter: () => {
        const o = { v: 0 };
        gsap.to(o, {
          v: end, duration: 1.8, ease: 'power2.out',
          onUpdate: () => el.textContent = Math.round(o.v),
        });
      },
    });
  });
}

/* ————— filters (FLIP) ————— */

function setupFilters() {
  const btns = qsa('.filter-btn');
  btns.forEach(b => b.addEventListener('click', () => {
    btns.forEach(x => x.classList.toggle('active', x === b));
    const f = b.dataset.filter;
    const cards = qsa('.card');
    const state = Flip.getState(cards);
    cards.forEach(c => {
      const show = f === 'all' || c.classList.contains('cat-' + f);
      c.classList.toggle('is-hidden', !show);
    });
    visible = cards.filter(c => !c.classList.contains('is-hidden')).map(c => c.dataset.id);
    Flip.from(state, {
      duration: .7, ease: 'power3.inOut', stagger: .015, absolute: true,
      onEnter:  els => gsap.fromTo(els, { opacity: 0, scale: .92 }, { opacity: 1, scale: 1, duration: .5 }),
      onLeave:  els => gsap.to(els, { opacity: 0, scale: .92, duration: .4 }),
      onComplete: () => ScrollTrigger.refresh(),
    });
  }));
}

/* ————— case modal (embeds: Vimeo / YouTube / Drive / mp4 — same as the portfolio CMS) ————— */

function caseEmbed(src) {
  src = (src || '').trim();
  if (!src) return null;
  const iframe = u => `<iframe src="${u}" loading="lazy" allow="autoplay; encrypted-media; fullscreen" allowfullscreen></iframe>`;
  const drive = src.match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?[^"']*id=)([\w-]{20,})/);
  if (drive) return iframe(`https://drive.google.com/file/d/${drive[1]}/preview`);
  const vm = src.match(/vimeo\.com\/(?:video\/)?(\d{6,})/);
  if (vm) return iframe(`https://player.vimeo.com/video/${vm[1]}?autoplay=1&muted=1&loop=1`);
  const yt = src.match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([\w-]{11})/);
  if (yt) return iframe(`https://www.youtube-nocookie.com/embed/${yt[1]}?autoplay=1&mute=1&loop=1&playlist=${yt[1]}&controls=1&modestbranding=1&playsinline=1&rel=0`);
  if (/\.(mp4|webm|mov|m4v)(\?|#|$)/i.test(src)) return `<video src="${esc(src)}" autoplay muted loop playsinline controls></video>`;
  return null;
}

function setupModal() {
  document.addEventListener('click', e => {
    const card = e.target.closest('.card');
    if (card) { openCase(card.dataset.id); return; }
    const open = e.target.closest('[data-open]');
    if (open) { openCase(open.dataset.open); return; }
    if (e.target.closest('[data-close]')) closeCase();
    if (e.target.closest('[data-next]')) stepCase(1);
    if (e.target.closest('[data-prev]')) stepCase(-1);
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && modalOpen) closeCase();
    if ((e.key === 'Enter' || e.key === ' ') && document.activeElement?.classList?.contains('card')) {
      e.preventDefault();
      openCase(document.activeElement.dataset.id);
    }
  });
}

function populateCase(p) {
  qs('.cm-title').textContent = p.title;
  qs('.cm-desc').textContent = p.description || '';
  qs('.cm-client').textContent = p.client || '—';
  qs('.cm-year').textContent = p.year || '—';
  qs('.cm-cat').textContent = CATS[p.category] || '—';
  const media = qs('.cm-media');
  const embed = caseEmbed(p.video);
  if (embed) {
    media.style.cssText = 'background:#000';
    media.innerHTML = embed;
  } else {
    media.style.cssText = p.image ? `background-image:url('${p.image}')` : grad(p.hue, 60);
    media.innerHTML = '<span class="ph-tag">final media pending — placeholder frame</span>';
  }
  const idx = Math.max(visible.indexOf(p.id), 0);
  qs('.cm-count').textContent = `${pad2(idx + 1)} / ${pad2(visible.length)}`;
}

function openCase(id) {
  const p = PROJECTS.find(x => x.id === id);
  if (!p) return;
  currentId = id;
  const modal = qs('#case-modal');

  if (modalOpen) { // switching inside the modal — crossfade content only
    gsap.fromTo('.cm-media, .cm-body', { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: .5, ease: 'power3.out' });
    populateCase(p);
    modal.scrollTop = 0;
    return;
  }

  populateCase(p);
  modal.classList.add('open');
  modal.scrollTop = 0;
  gsap.fromTo(modal, { yPercent: 100 }, { yPercent: 0, duration: .75, ease: 'power4.out' });
  gsap.from(['.cm-media', '.cm-title', '.cm-meta', '.cm-desc'], {
    y: 40, opacity: 0, duration: .7, stagger: .06, delay: .2, ease: 'power3.out',
  });
  lenis?.stop();
  modalOpen = true;
  document.body.classList.add('modal-open');
}

function closeCase() {
  const modal = qs('#case-modal');
  qs('.cm-media').innerHTML = ''; // stop any playing embed
  gsap.to(modal, {
    yPercent: 100, duration: .6, ease: 'power3.in',
    onComplete: () => { modal.classList.remove('open'); gsap.set(modal, { clearProps: 'transform' }); },
  });
  lenis?.start();
  modalOpen = false;
  document.body.classList.remove('modal-open');
}

function stepCase(dir) {
  if (!visible.length) return;
  let i = visible.indexOf(currentId);
  i = (i + dir + visible.length) % visible.length;
  openCase(visible[i]);
}

/* ————— cursor ————— */

function setupCursor() {
  if (isTouch || prefersReduced) return;
  document.body.classList.add('has-cursor');
  const cur = qs('#cursor');
  const label = qs('#cursor-label');
  let x = innerWidth / 2, y = innerHeight / 2, tx = x, ty = y;
  addEventListener('mousemove', e => { tx = e.clientX; ty = e.clientY; });
  gsap.ticker.add(() => {
    x += (tx - x) * .17;
    y += (ty - y) * .17;
    cur.style.transform = `translate(${x}px,${y}px)`;
  });
  document.addEventListener('mouseover', e => {
    const t = e.target.closest?.('[data-cursor],a,button,.card');
    cur.classList.remove('is-active', 'is-view');
    label.textContent = '';
    if (!t) return;
    const v = t.getAttribute('data-cursor');
    if (v) { cur.classList.add('is-view'); label.textContent = v; }
    else cur.classList.add('is-active');
  });
  // hold feedback: the cursor ring tightens while the vortex is charging
  addEventListener('pointerdown', e => { if (e.pointerType === 'mouse') cur.classList.add('is-hold'); });
  addEventListener('pointerup', () => cur.classList.remove('is-hold'));
  addEventListener('pointercancel', () => cur.classList.remove('is-hold'));
}

/* ————— magnetic elements ————— */

function setupMagnetic() {
  if (isTouch || prefersReduced) return;
  qsa('.magnetic').forEach(el => {
    el.addEventListener('mousemove', e => {
      const r = el.getBoundingClientRect();
      gsap.to(el, {
        x: (e.clientX - r.left - r.width / 2) * .25,
        y: (e.clientY - r.top - r.height / 2) * .25,
        duration: .4,
      });
    });
    el.addEventListener('mouseleave', () =>
      gsap.to(el, { x: 0, y: 0, duration: .6, ease: 'elastic.out(1,.4)' }));
  });
}

/* ————— file:// notice ————— */

function fileNotice() {
  const d = document.createElement('div');
  d.className = 'file-notice';
  d.innerHTML = 'This site loads its content over HTTP.<br>Run a local server — see README.md<br><code>python3 -m http.server 4173</code>';
  document.body.appendChild(d);
  document.body.classList.remove('is-loading');
}
