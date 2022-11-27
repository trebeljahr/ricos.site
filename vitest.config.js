import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  passSuitesWithNoTests: "all",
  plugins: [tsconfigPaths()],
});
