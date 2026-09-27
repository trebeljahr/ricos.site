const KEY = "night-owl-flown";

/** Poked once too often, the owl leaves for good: no owl for the rest of the tab session. */
export function owlHasFlownAway() {
  try {
    return window.sessionStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function markOwlFlownAway() {
  try {
    window.sessionStorage.setItem(KEY, "1");
  } catch {
    // Private mode, blocked storage: the owl simply comes back on the next page.
  }
}
