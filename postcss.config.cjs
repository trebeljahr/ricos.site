const path = require("node:path");

module.exports = {
  plugins: {
    // Must run before Tailwind; see the file for why. Absolute path because
    // Turbopack requires plugins from its build dir, and process.cwd() because
    // Turbopack bundles this config with `__dirname` set to "/ROOT".
    [path.join(process.cwd(), "src/scripts/dev/tailwindMtimeGuard.cjs")]: {},
    "@tailwindcss/postcss": {},
  },
};
