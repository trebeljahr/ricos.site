import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig({
  passSuitesWithNoTests: "all",
  plugins: [tsconfigPaths()],
  environment: "node",
});
