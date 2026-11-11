# ricos.site on Cloudflare Workers

Production is a static export of the Next.js site, served by two Workers on
the `ricos.site` zone. No server and no container run for the site.

| Route | Worker | What |
| --- | --- | --- |
| `ricos.site/*` | `ricos-site-client` (`wrangler.jsonc`) | the files in `out/`, with `_redirects` and `_headers`; no Worker code runs, so these requests are free and unmetered |
| `ricos.site/api/*` | `ricos-site-api` (`workers/api`) | signup, announce signup (CORS for Rico's other sites), confirm link, `/api/quote`, `/api/random-photo`, `/api/emergency`, `/api/kestrel`, old `/api/img/*` links (301 to `assets.ricos.site`) |
| `ricos.site/kestrel/*` | `ricos-site-api` | the first-party Plausible script and events |

Routes are made once with the Cloudflare API, not in the wrangler configs, so
a deploy never changes them and the CI token needs no zone permission.

## Build

`pnpm build` runs `next build` with `output: "export"` (next.config.mjs), then
postbuild: sitemap, feeds, search index, backlinks, link and alt checks, and
`src/scripts/static/finishExport.ts`, which

- copies the postbuild files into `out/`,
- writes `out/projects/rss.xml` (was an API route) and, with `COMMIT_SHA` set,
  `out/version.json` (`{ commit, notes }`),
- writes `out/_redirects` from `src/scripts/createRedirects.js` and
  `out/_headers` from `src/scripts/static/routing.mjs`,
- fails on a file over 25 MiB, over 20,000 files, too many redirect or header
  rules, a redirect that hides a page, or a dev-only page in the export.

Pages that read the request under `next dev` (`/dev/diary*`,
`/computer/demos`, `/piano/demos`) are left out by `exportPathMap`; other
dev-only pages return `notFound` in production and the export skips them.
`next dev` keeps its rewrites, redirects, headers and the Next API routes, so
local development is unchanged.

The API Worker bundles `workers/api/generated/api-data.json` (`pnpm api:data`:
short quotes, gallery photos, the confirm-email template) from the same Notes
checkout. It renders the confirm email without `Handlebars.compile`
(`src/lib/newsletter/confirmEmail.ts`), since Workers may not build code from
strings.

## Local preview

```bash
pnpm build && pnpm api:data && pnpm preview
```

`pnpm preview` (`src/scripts/static/preview.mjs`) runs both Workers under
`wrangler dev --local` behind one port that routes `/api/*` and `/kestrel/*`
like the zone. Secrets for the API Worker come from `workers/api/.dev.vars`
(gitignored).

`node src/scripts/static/parity.mjs <A> <B>` compares two hosts: every sitemap
path plus extras by status, redirect target, title and content type, then the
API answers (validation, CORS, confirm redirect, kestrel, quote, photo).

## Deploy

`.github/workflows/deploy.yml`: build (with Notes `main`), carry the hashed
chunks of the two releases before (`src/scripts/static/carry-static.mjs`,
`/release-assets.json`), upload a version of both Workers, then activate the
API version, then the site version, and poll `/version.json` until it names
this commit and Notes commit. Notes pushes start it through
`workflow_dispatch`.

Rollback: `wrangler versions deploy <older version id>@100%` with the
matching config (`wrangler versions list` shows the tags, one per commit).

## API Worker secrets

Set once per secret with `wrangler secret put <NAME> -c workers/api/wrangler.jsonc`
from `.env.production`: `LISTMONK_URL`, `LISTMONK_API_USER`,
`LISTMONK_API_TOKEN`, `LISTMONK_LIST_ID`, `LISTMONK_COMPUTER_LIST_ID`,
`LISTMONK_ANNOUNCE_LIST_ID`, `LISTMONK_TX_TEMPLATE_ID`, `LISTMONK_FROM`,
`LISTMONK_REPLY_TO`, `NEWSLETTER_TOKEN_SECRET` (must stay the value the site
uses, or mailed confirm links break), `EMERGENCY_PASSWORD`,
`MARCS_PHONE_NUMBER`, `KATRINS_PHONE_NUMBER`, `HOLGERS_PHONE_NUMBER`.

## Behaviour that differs from the Next server

- `/x/` redirects to `/x` with 307 (Cloudflare), not 308.
- `/donate?from=<slug>` and project-site referrers reach `/donate/<slug>`
  after hydration, not with a server redirect.
- `/projects/rss.xml` changes on deploy only; an entry dated ahead appears
  with the next deploy after its date, not on the day by itself.
- Chunks are served `max-age=0, must-revalidate` with an ETag (hatchkit's
  rule: an `immutable` rule would also cache a chunk's 404 for a year).
