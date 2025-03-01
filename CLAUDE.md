# Development Guidelines for ricos.site

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