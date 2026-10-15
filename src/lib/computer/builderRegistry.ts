// Several circuit builders may share one page. Keyboard shortcuts listen on
// the window, so each builder asks here whether a key press is its own: the
// press came from inside it, or it is the builder the reader used last, or it
// is the only one. Browser storage keys are claimed the same way, so two
// builders never overwrite each other's saved circuit.

const mounted = new Set<symbol>();
let active: symbol | null = null;
const storageOwners = new Map<string, symbol>();

/** Registers a mounted builder; returns the cleanup for its unmount. */
export function registerBuilder(id: symbol) {
  mounted.add(id);
  return () => {
    mounted.delete(id);
    if (active === id) active = null;
    for (const [key, owner] of storageOwners) if (owner === id) storageOwners.delete(key);
  };
}

/** Marks the builder the reader pointed at or focused last. */
export function activateBuilder(id: symbol) {
  active = id;
}

/** Whether a window key event belongs to builder `id`, whose root element is `root`. */
export function ownsKeyEvent(id: symbol, root: HTMLElement | null, target: EventTarget | null) {
  if (root && target instanceof Node && root.contains(target)) return true;
  if (target instanceof Element && target.closest("[data-logic-builder]")) return false;
  if (active && mounted.has(active)) return active === id;
  return mounted.size === 1 && mounted.has(id);
}

/**
 * Claims a browser storage key for one builder. The first builder to ask owns
 * it until it unmounts; later ones get false and should not save.
 */
export function claimStorage(key: string, id: symbol) {
  const owner = storageOwners.get(key);
  if (owner && owner !== id && mounted.has(owner)) return false;
  storageOwners.set(key, id);
  return true;
}
