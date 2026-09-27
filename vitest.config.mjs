import tsconfigPaths from "vite-tsconfig-paths";
import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  passSuitesWithNoTests: "all",
  plugins: [tsconfigPaths()],
  environment: "node",
  test: {
    // Sibling git worktrees live under .claude/worktrees/**, so a plain glob
    // picks up other branches' tests. Keep the suite to this checkout only.
    exclude: [...configDefaults.exclude, "**/.claude/**"],
  },
});
