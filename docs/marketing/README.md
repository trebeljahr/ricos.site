# Marketing images

Screenshots and GitHub social preview options for ricos.site. The README embeds the screenshots from here. `manifest.json` lists every file with its pixel size, bytes, SHA-256, source and date.

All screenshots are real captures of the live site (https://ricos.site, read-only), taken on 2026-11-06 with headless Playwright Chromium at device scale factor 2.

## Screenshots

| File | Shows | Pixels |
| --- | --- | --- |
| `screenshots/home-dark.jpg` | Home page, dark theme (README hero) | 3200×2000 |
| `screenshots/home-light.jpg` | Home page, light theme | 3200×2000 |
| `screenshots/full-adder-dark.jpg` | `/computer/full-adder`, an editable full adder circuit with its truth table | 3200×2000 |
| `screenshots/die-zoom-dark.jpg` | `/computer/die-zoom`, the labelled Pentium II die | 3200×2000 |
| `screenshots/projects-dark.jpg` | `/projects`, scrolled to the Games cards | 3200×2000 |
| `screenshots/photography-dark.jpg` | `/photography`, the gallery tiles | 3200×2000 |
| `screenshots/home-mobile-dark.jpg` | Home page on a 390×844 phone viewport | 780×1688 |

## Social preview

GitHub's repository card: 1280×640 PNG, under 1 MB, text inside a 64 px margin. All three come from `social-preview/template.html` (`?v=a|b|c`), with the Inter font and the flask icon from `public/favicon/`.

| File | Option |
| --- | --- |
| `social-preview/social-preview-a.png` | A: screenshot-led. Name and one line on the left, the full adder demo on the right, dark navy as in `public/og-default.png`. |
| `social-preview/social-preview-b.png` | B: typographic. Large flask and name, the site's sections as a list. |
| `social-preview/social-preview-c.png` | C: light collage of four real pages (chip zoom, projects, photography, home). |

## Regenerate

Playwright is not a dependency of this repo. `npx` fetches it for one run:

```bash
npx -y playwright@1.64.0 install chromium      # once
npx -y -p playwright@1.64.0 -c 'node docs/marketing/scripts/capture-screenshots.mjs'
npx -y -p playwright@1.64.0 -c 'node docs/marketing/scripts/render-social-preview.mjs'
node docs/marketing/scripts/write-manifest.mjs
```

- `capture-screenshots.mjs --only=home-dark,projects-dark` captures a subset. `BASE_URL=http://127.0.0.1:<port>` captures a local build instead of the live site.
- `render-social-preview.mjs --review=<file.jpg>` also writes a sheet with A, B and C side by side.
- The shot list (page, viewport, theme, scroll target) is in `scripts/shots.mjs`.
