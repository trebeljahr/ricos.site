import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    // Sibling git worktrees live under .claude/worktrees/**, so a plain glob
    // picks up other branches' tests. Keep the suite to this checkout only.
    exclude: [...configDefaults.exclude, "**/.claude/**"],
    // The circuit simulator tests take a few seconds each on an idle machine
    // and blow past the 5 s default when other dev servers and agents share
    // the CPU. Benchmarks with timing assertions run only with BENCH=1.
    testTimeout: 20000,
    // Node 25+ ships a global localStorage that, without --localstorage-file,
    // is undefined and shadows jsdom's window.localStorage. Turn it off in the
    // test workers so jsdom tests get jsdom's per-file storage.
    execArgv: ["--no-experimental-webstorage"],
  },
});
