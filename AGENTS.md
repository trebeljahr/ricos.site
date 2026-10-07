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

## AI writing destination (2026-09-30)

AI-written plans, research, drafts, reports, and manual QA notes belong in `/Users/rico/projects/ai-work-notes/`; project notes normally use `projects/<project>/`. Search existing folders before adding one. This is a separate local Git repository and Obsidian vault. Keep source code and code-specific technical documentation in their project repositories. Leave Rico's human-written notes in ricos.site untouched. This destination supersedes older instructions allowing AI prose in ricos.site. Do not recreate the old generated-content folder. Stage only task-owned paths in the relevant repository. Existing running sessions must reload these instructions. Uploading personal records requires explicit approval; a private remote alone is not approval.
