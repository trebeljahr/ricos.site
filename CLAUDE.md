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
