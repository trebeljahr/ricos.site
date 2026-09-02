# Vendored KaTeX stylesheet

`katex.min.css` + `fonts/*.woff2` are a copy of `node_modules/katex/dist`, served
directly from `/public` and linked only by pages whose content renders math
(`hasMath` in velite.config.ts → `Layout` → `Meta`).

Why a copy instead of `import "katex/dist/katex.min.css"` in `_app.tsx`:
Next's pages router only allows global CSS imports from `_app`, which put 21KB
of KaTeX rules and `@font-face` blocks into the single global stylesheet loaded
by all ~450 pages, while only 7 of them render any math.

The `woff` and `ttf` sources are stripped from each `@font-face` — every browser
in the `browserslist` in package.json supports woff2.

## Refreshing after a katex upgrade

```bash
cp node_modules/katex/dist/fonts/*.woff2 public/katex/fonts/
python3 -c "
import re, pathlib
src = pathlib.Path('node_modules/katex/dist/katex.min.css').read_text()
out = re.sub(r',url\(fonts/[^)]+\.(?:woff|ttf)\) format\(\"(?:woff|truetype)\"\)', '', src)
pathlib.Path('public/katex/katex.min.css').write_text(out)
"
```
