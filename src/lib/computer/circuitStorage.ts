// Large circuits repeat modules, nodes and wires many times. Share those
// objects across solutions and drafts to fit browser storage.
type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
const FORMAT = "ricos-circuit-pool-v1";
const COMPACT_AT = 256 * 1024;

export function stringifyCircuitStorage(value: unknown): string {
  const plain = JSON.stringify(value);
  if (plain.length < COMPACT_AT) return plain;
  const pool: Json[] = [];
  const known = new Map<string, number>();
  const encodedObjects = new WeakMap<object, Json>();
  const encode = (item: Json): Json => {
    if (item === null || typeof item !== "object") return item;
    const previous = encodedObjects.get(item);
    if (previous !== undefined) return previous;
    if (Array.isArray(item)) {
      const array = item.map((child) => (child === undefined ? null : encode(child)));
      encodedObjects.set(item, array);
      return array;
    }
    const encoded = Object.fromEntries(
      Object.entries(item)
        .filter(([, child]) => child !== undefined)
        .map(([key, child]) => [key, encode(child)]),
    );
    const signature = JSON.stringify(encoded);
    if (signature.length < 48) {
      encodedObjects.set(item, encoded);
      return encoded;
    }
    let index = known.get(signature);
    if (index === undefined) {
      index = pool.length;
      known.set(signature, index);
      pool.push(encoded);
    }
    const reference = { $circuit: index };
    encodedObjects.set(item, reference);
    return reference;
  };
  const data = encode(value as Json);
  const compact = JSON.stringify({ format: FORMAT, data, pool });
  return compact.length < plain.length ? compact : plain;
}

/** Reads both the original JSON saves and pooled circuits. Never executes saved data. */
export function parseCircuitStorage(raw: string): unknown {
  const value = JSON.parse(raw);
  if (value?.format !== FORMAT) return value;
  if (!Array.isArray(value.pool)) throw new Error("Invalid circuit pool");
  const pool: Json[] = value.pool;
  const restored = new Map<number, Json>();
  const decode = (item: Json, limit: number): Json => {
    if (Array.isArray(item)) return item.map((child) => decode(child, limit));
    if (item === null || typeof item !== "object") return item;
    if (Object.hasOwn(item, "$circuit")) {
      const index = item.$circuit;
      // References point only backwards in the pool, so cycles cannot expand.
      if (typeof index !== "number" || !Number.isInteger(index) || index < 0 || index >= limit)
        throw new Error("Invalid circuit reference");
      if (!restored.has(index)) restored.set(index, decode(pool[index], index));
      return restored.get(index)!;
    }
    return Object.fromEntries(
      Object.entries(item).map(([key, child]) => [key, decode(child, limit)]),
    );
  };
  return decode(value.data, pool.length);
}
