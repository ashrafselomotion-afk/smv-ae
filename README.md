# SMV.AE

One page site for SMV, a media production house in the UAE. Bright, gallery led,
built to be edited without touching code.

Live site: https://smv.ae (also served at the GitHub Pages URL for this repo)

## Editing the site

Everything you see on the page comes from two files, and you edit both through a
visual admin, not in code.

1. Open https://app.pagescms.org and sign in with GitHub.
2. Authorise it for this repository once.
3. You get two screens: **Site text and media** and **Work**.

Saving in the admin commits to `main`, and the live site updates a minute later.

What you can change:

| Screen | Covers |
| --- | --- |
| Site text and media | Logo, menu labels, the opening headline and image or video, the big statement, the full width photograph, the five disciplines, the numbers band, the client list, all contact details |
| Work | Every project: title, client, year, category, cover image, case video, description, and which one is the featured case |

Videos accept a Vimeo, YouTube, Google Drive or direct mp4 link. Paste the normal
share link and the site works out the rest.

## Placeholder media

Every file in `assets/uploads` starting with `placeholder-` is temporary stock
photography, used so the layout could be designed and reviewed. **All of it is
meant to be replaced with real SMV work** through the admin. The client names in
`data/site.json` are real; the project titles and client labels in
`data/projects.json` are stand ins.

Client logos: each client has an optional logo field. Upload a logo and it
replaces the name in the scrolling roster. Until then the name is shown as type.

## How it is built

No build step and no dependencies to install. Plain HTML, CSS and JavaScript
modules, so it can be opened straight from disk or served by any static host.

```
index.html          markup and section order
css/main.css        design tokens, layout, motion fallbacks
css/fonts.css       self hosted Archivo and Geist Mono
js/main.js          renders every section from the JSON, wires the motion
js/gl.js            the WebGL frame behind the opening image
data/site.json      all site copy and media
data/projects.json  the work
.pages.yml          defines the admin screens
```

Libraries come from a CDN at runtime: GSAP with ScrollTrigger for the scroll
choreography, Lenis for continuous scrolling, three.js for the opening frame.

### Design decisions worth knowing

- **Light theme only.** The palette is paper `#F1F1EF`, ink `#16171A`, and a
  single vermilion accent. The accent carries fills, marks and large type;
  `--accent-deep` is the only red used on small text, because it is the only one
  that passes contrast. Buttons are ink with paper text.
- **One grade on every image.** `--grade` in the CSS holds all media at low
  saturation so a mixed set reads as one gallery, and colour returns on hover.
  The opening frame's shader matches the same numbers. If you ever want fuller
  colour everywhere, raise the saturation in `--grade` and the `mix()` value in
  `js/gl.js`.
- **Square corners everywhere.** No rounded corners anywhere, on purpose.
- **The header plays, and the scroll goes into a lens.** A looping placeholder
  built from the work stills sits behind the headline. Set a showreel link in
  the admin and it becomes a real video element instead. Replace
  `placeholder-header-loop.webp` with a compressed mp4 when you have one.
  Scrolling does not pull back, it pushes in: the footage drives toward the
  viewer while an eight bladed aperture closes over it down to the opening,
  the frame behind that opening changes, then the blades open again and the
  statement is what comes back out, landing on the same centred axis. The
  header and the statement are one pinned stage for this reason. Below 760px,
  and under reduced motion, they are simply two stacked sections.
- **The work pans sideways.** The work section pins and scrolls horizontally on
  screens wider than 760px. Below that, and for anyone who prefers reduced
  motion, it unrolls into a normal vertical list.
- **WebGL is limited to the opening frame.** A canvas plane has to be pixel
  synced to a DOM box, and anything that moves with scroll drifts a frame behind
  its caption. The opening frame never moves in layout, so the effect stays
  exact. If WebGL is unavailable the plain image is shown, graded in CSS.
- **Reduced motion is honoured.** Smooth scroll, the pan, the parallax, the
  marquee and the WebGL frame all switch off for anyone who asks for less motion.

## Running it locally

```bash
python3 -m http.server 4188 --directory .
```

Then open http://localhost:4188. If you change CSS or JS, bump the `?v=` number
on the `main.css` and `main.js` tags in `index.html` so browsers pick it up.

## Still to do

- Replace the placeholder photography with real work, and the header loop with
  a real showreel (the loop is 3 MB, a compressed mp4 will be lighter).
- Real project titles, client names and case videos.
- Confirm the phone number, WhatsApp number and Instagram handle in the admin.
- Point the `smv.ae` DNS at GitHub Pages (the `CNAME` file is already set).
