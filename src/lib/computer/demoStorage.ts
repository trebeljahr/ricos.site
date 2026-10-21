/** Stable, separate save slots for editable demos, never the reader's main lab. */
export const demoStorageKey = (...identity: readonly string[]) =>
  `ricos-computer-demo-v1:${identity.map(encodeURIComponent).join(":")}`;
