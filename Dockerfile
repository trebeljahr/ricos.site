# syntax=docker/dockerfile:1
#
# Production image for ricos.site, for Coolify (the hatchkit setup). Based on
# hatchkit's Dockerfile.nextjs template, with three changes for this repo:
#
#   1. The runtime runs Next's standalone server (`output: "standalone"` in
#      next.config.mjs), not `next start`. `next start` loads next.config.mjs
#      at runtime, which imports src/scripts/createRedirects.js and pulls in
#      the full node_modules tree. The standalone trace also keeps
#      Notes/texts out of the image (outputFileTracingExcludes).
#   2. The build needs the Notes submodule checked out in the build context
#      (CI: actions/checkout with `submodules: recursive`). Notes/assets is
#      not in git and Notes/texts is excluded by .dockerignore: images come
#      from the CDN, and private writing never enters the build.
#   3. `pnpm build` runs prebuild (metadata backfill, photography colours,
#      alt sync) and postbuild (sitemap, RSS, search index, backlinks, link
#      and alt checks). All of them work without Notes/assets.
#
# dotenvx decrypts the committed, encrypted .env.production twice: at build
# time from the `dotenvx_private_key` BuildKit secret (so NEXT_PUBLIC_* values
# are inlined into the client bundle), and at runtime from
# DOTENV_PRIVATE_KEY_PRODUCTION in the container env (set by Coolify).
#
# bookworm-slim, not alpine: sharp (used by /api/img) ships glibc binaries.
ARG NODE_VERSION=24

# ---------------------------------------------------------------------------
# Build
# ---------------------------------------------------------------------------
FROM node:${NODE_VERSION}-bookworm-slim AS build
WORKDIR /app

RUN corepack enable

# patches/ is read by pnpm install (patchedDependencies). .npmrc sets
# shamefully-hoist, which scripts rely on: they import sharp, which only
# arrives as a dependency of next.
COPY package.json pnpm-lock.yaml .npmrc ./
COPY patches ./patches
RUN HUSKY=0 pnpm install --frozen-lockfile

COPY . .

RUN test -d src/content/Notes/posts || { \
      echo "ERROR: src/content/Notes is empty. Check out the Notes submodule before building (git submodule update --init src/content/Notes)." >&2; \
      exit 1; \
    }

# Split from the build step so this message only shows when the secret is
# actually missing (BuildKit prints the whole RUN body on any failure).
RUN --mount=type=secret,id=dotenvx_private_key,env=DOTENV_PRIVATE_KEY_PRODUCTION \
    test -n "$DOTENV_PRIVATE_KEY_PRODUCTION" || { \
      echo "ERROR: dotenvx_private_key build secret not supplied. CI passes it from the GitHub Actions secret DOTENV_PRIVATE_KEY_PRODUCTION." >&2; \
      exit 1; \
    }

# One id per build. Next compares it on every client navigation, so a tab
# still running the previous deploy does a full reload instead of mixing
# chunks from two builds.
ARG COMMIT_SHA
ENV NEXT_DEPLOYMENT_ID=${COMMIT_SHA}
ENV NEXT_TELEMETRY_DISABLED=1
# The site build peaks well above Node's default heap.
ENV NODE_OPTIONS=--max-old-space-size=6144
RUN --mount=type=secret,id=dotenvx_private_key,env=DOTENV_PRIVATE_KEY_PRODUCTION \
    pnpm dlx @dotenvx/dotenvx@1.64.0 run -f .env.production -- pnpm build

# /version.json lets the deploy job ask the running container which commit it
# serves, instead of trusting that Coolify swapped it.
RUN printf '{"commit":"%s"}\n' "$COMMIT_SHA" > public/version.json

# ---------------------------------------------------------------------------
# Runtime: node .next/standalone/server.js on PORT=3000
# ---------------------------------------------------------------------------
FROM node:${NODE_VERSION}-bookworm-slim AS runtime
WORKDIR /app

# curl for Coolify's health probe, which runs `curl … || wget …` inside the
# container; bookworm-slim ships neither. Without it every deploy rolls back.
RUN apt-get update \
  && apt-get install -y --no-install-recommends curl \
  && rm -rf /var/lib/apt/lists/*

# dotenvx in its own prefix: the standalone output writes the app's
# package.json into /app, and the trace does not include CLI-only packages.
# Pinned to the version the build stage runs.
RUN npm install --prefix /opt/dotenvx --no-audit --no-fund @dotenvx/dotenvx@1.64.0

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

# Standalone output: server.js plus the traced node_modules. public/ and
# .next/static are not part of the trace and are copied next to it, as Next's
# standalone docs describe.
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public
COPY --from=build /app/.env.production ./.env.production

# Shutdown drain, from hatchkit: on SIGTERM the health probe fails first, so
# Traefik drops this container, then requests in flight finish.
COPY docker/drain.cjs /usr/local/lib/drain.cjs
COPY --chmod=755 docker/drain-entrypoint.sh /usr/local/bin/drain-entrypoint
ENV SHUTDOWN_DRAIN_SECONDS=20
ENTRYPOINT ["/usr/local/bin/drain-entrypoint"]

USER node
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=5 \
  CMD node -e "require('http').get('http://127.0.0.1:3000/',r=>{process.exit(r.statusCode<400?0:1)}).on('error',()=>process.exit(1))"

CMD ["/opt/dotenvx/node_modules/.bin/dotenvx", "run", "-f", ".env.production", "--", "node", "--require", "/usr/local/lib/drain.cjs", "server.js"]
