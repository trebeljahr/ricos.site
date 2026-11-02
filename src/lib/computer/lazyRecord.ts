/**
 * A record whose values build on first read and stay built. `Object.keys` builds
 * nothing; a spread, `Object.values` or `Object.entries` builds them all.
 */
export function lazyRecord<T>(builders: Record<string, () => T>): Record<string, T> {
  const record: Record<string, T> = {};
  for (const [key, build] of Object.entries(builders)) {
    let built: { value: T } | undefined;
    Object.defineProperty(record, key, {
      enumerable: true,
      get() {
        built ??= { value: build() };
        return built.value;
      },
    });
  }
  return record;
}
