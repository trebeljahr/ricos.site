/**
 * Resolves when the browser has nothing better to do. For code that can wait,
 * like an easter egg in its resting state, so that it does not compete with the
 * page's own JavaScript for bandwidth and the main thread during hydration.
 */
export const whenIdle = () =>
  new Promise<void>((resolve) => {
    if (typeof requestIdleCallback === "function") {
      requestIdleCallback(() => resolve(), { timeout: 2000 });
    } else {
      setTimeout(resolve, 200);
    }
  });
