# Development Guidelines for ricos.site

## Build & Development Commands
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run typecheck` - Run TypeScript type checking
- `npm run lint` - Run linting (through Next.js ESLint integration)
- `npm test` - Run tests (use Vitest for testing)

## Code Style Guidelines
- **TypeScript**: Use TypeScript for all new files with strict typing
- **Components**: Use function components with proper type definitions
- **Imports**: Group imports with React/Next imports first, then external libraries, then internal modules
- **Naming**: Use PascalCase for components, camelCase for functions and variables
- **Exports**: Prefer named exports for components
- **Path Aliases**: Use path aliases defined in tsconfig.json (e.g., @components/*)
- **Error Handling**: Use try/catch for async operations
- **Tailwind**: Use Tailwind CSS for styling with clsx for conditional class names
- **Spacing**: One documented scale, read `docs/spacing.md` before adding any margin, padding or gap. Use the named steps (`mt-para`, `mb-group`, `pb-region`, …), not raw numbers, for spacing decisions. Every content page's `<main>` is `PageMain` from `@components/PostHeader`. `<body>` carries `prose`, so beat the typography plugin's margins with `.flow-*` / `.flush-top` / `not-prose` — never with an `!important` margin. There are zero `!`-important spacing utilities in the codebase; a new one is a bug.
- **React Hooks**: Follow React hooks best practices and create custom hooks when logic is reused
- **Three.js/R3F**: Follow established patterns for 3D components in the /r3f directory

## Project Structure
- `/src/components` - Reusable React components
- `/src/hooks` - Custom React hooks
- `/src/pages` - Next.js pages
- `/src/models` - 3D models and related components
- `/src/lib` - Utility functions and helpers
## Dev Server: Stale CSS
- `@tailwindcss/postcss` rebuilds only when a CSS file's mtime changes, not its content. A checkout or ff-merge that changes `globals.css` and `.tsx` files together could leave the dev server serving old `@theme`/`@utility` rules forever. `src/scripts/dev/tailwindMtimeGuard.cjs` (first plugin in `postcss.config.cjs`) prevents this; keep it before Tailwind.
- Turbopack persists PostCSS output and errors in `.next/dev`, so restarting the dev server does not clear a bad result. If CSS is still stale, or `globals.css` fails with "failed to receive message" (a PostCSS worker was killed), stop the server, delete `.next/dev` and start again.
- A page file deleted or moved while the dev server runs (a checkout or ff-merge counts) can stay routed for `/_next/data/*.json`, the request a client-side `<Link>` navigation makes. Full page loads then work, while in-app navigation hits the deleted module ("CJS module can't be async") or crashes the new page on missing props. Seen 2026-09-28 when `src/pages/needlestack/` became `needlestack-2/`. The fix is the same: stop the server, delete `.next/dev` and start again.

## Needlestack curation (local tooling)
- `src/content/needlestack/needles.json` is the archive: one record per link, written by the scripts in `src/scripts/needles/` and by `/dev/needlestack`. The taxonomy of doors and paths lives in `src/lib/needlestack/taxonomy.ts`; adding a path is a deliberate edit there.
- `pnpm needles:import` (bookmark export + the old needlestack page, idempotent, never overwrites a human answer) → `pnpm needles:classify` or `pnpm needles:batch export|apply` (machine guesses) → `/dev/needlestack` (keyboard triage) → `pnpm needles:skim` (drafts notes for links rated 2+).
- The public rewrite lives at `/needlestack-2` (hub, `/needlestack-2/[door]`, `/needlestack-2/archive`, in `src/pages/needlestack-2/`). `/needlestack` stays the old markdown page, rendered by `src/pages/[id].tsx` with its haystack egg, until the rewrite carries the same links; do not claim that slug from the new pages.
- A needle is only public once it is `status: "reviewed"` with `rating >= 1`. No script may set that; only the triage UI does, one link at a time.
