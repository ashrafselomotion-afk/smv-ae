# SMV.AE — Media Production

Single-page site for SMV, a UAE media production house. Static, build-free:
Three.js (continuous particle world), GSAP + ScrollTrigger + Flip (scrubbed scenes, filters), Lenis (smooth scroll).
All content is data-driven from `data/*.json` and editable through Pages CMS.

The experience is **scrub-driven** (weedensenteret-style): scroll plays the story
forward and backward. The hero assembles chaos into a golden aperture ring; the five
disciplines are one pinned sequence with an index ticker and scrub-meter; a chapter
rail on the right tracks and jumps between sections. Press-and-hold anywhere pulls
the particles into a vortex around the cursor — release flings them out (hki-style).

When editing JS/CSS, bump the `?v=N` query in index.html (and the background.js
import in main.js) so browsers pick up the new files.

## Run locally

```bash
cd smv-ae
python3 -m http.server 4173
# → http://localhost:4173
```

(Any static server works. Opening `index.html` directly via `file://` won't load the JSON content.)

## Structure

```
index.html          all sections (hero → contact) + case modal
css/main.css        design system, layout, motion styles
js/main.js          rendering from JSON, GSAP/Lenis choreography, filters, modal, cursor
js/background.js    Three.js continuous background world — one particle system
                    morphing through 9 formations tied to scroll (ring → dust →
                    wave → sensor → neural → helix → rings → starfield → burst),
                    with cursor repulsion and click shockwaves
data/site.json      hero copy, statement, disciplines, numbers, clients, process, contact
data/projects.json  the work grid + featured case
.pages.yml          Pages CMS admin configuration
404.html            custom 404 (GitHub Pages picks it up automatically)
CNAME               smv.ae custom domain for GitHub Pages
```

## Placeholders to replace (all editable in admin — no code needed)

| What | Where in admin | Notes |
|---|---|---|
| Showreel (15–20s, muted mp4) | Site Settings → Hero → reel | Plays behind the headline; WebGL particles stay on top |
| 5 discipline clips (~3s mp4 each) | Site Settings → What We Do → clip | Gradient placeholder shows until set |
| 12 project thumbnails | Projects → image | Gradient placeholder + index number until set |
| Project titles / clients / years | Projects | Current entries are realistic placeholders |
| Case videos | Projects → video | Paste a Vimeo, YouTube, Google Drive or mp4 link — same as the portfolio CMS |
| Numbers (400+ / 120+ / 60+) | Site Settings → Numbers | Only "10 Years" is real — fill the rest |
| Client names | Site Settings → Clients | Pre-filled with the real client roster from the portfolio — edit freely |
| Email / phone / WhatsApp / Instagram | Site Settings → Contact | Currently `hello@smv.ae` and dummy numbers |

## Admin (Pages CMS)

The admin is defined by `.pages.yml` — same system as the portfolio site.

1. Push this folder to a GitHub repo.
2. Go to **https://app.pagescms.org** → sign in with GitHub → select the repo.
3. You get a visual editor for **Site Settings** and **Projects**, with image upload
   (files land in `assets/uploads/`). Every save is a commit → GitHub Pages redeploys.

## Deploy to GitHub Pages (free) + smv.ae domain

```bash
cd smv-ae
git init && git add -A && git commit -m "SMV.AE site"
gh repo create smv-ae --public --source=. --push
gh api repos/{owner}/smv-ae/pages -X POST -f "source[branch]=main" -f "source[path]=/"
```

Then point the domain (at your registrar for smv.ae):

- Apex `smv.ae` → **A records**: `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
- `www.smv.ae` → **CNAME**: `<github-username>.github.io`

The `CNAME` file in the repo already contains `smv.ae`. In the repo's
Pages settings, tick **Enforce HTTPS** once the certificate is issued (can take ~30 min after DNS).

## Notes

- **Performance**: particle count halves on mobile; the WebGL loop pauses when the hero is off-screen; discipline clips should be short, muted, compressed mp4s (H.264, ~1080p, <3 MB each).
- **Accessibility**: honors `prefers-reduced-motion` (no smooth-scroll hijack, no loader, static hero), keyboard-openable cases, focus styles.
- **Adding a project**: Projects → add item → give it a unique `id` (p13, p14, …), pick a category and grid size. Exactly one project should have **Featured** on.
