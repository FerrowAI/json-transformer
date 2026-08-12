/**
 * json-transformer — a small, immutable, chainable JSON transformation
 * pipeline: pick/omit (dot-paths), rename, map, defaults, and
 * flatten/unflatten (dot notation). Works on a single object or an array
 * of objects; never mutates the input.
 */

export type Json = Record<string, unknown>;

type Step = (obj: Json) => Json;

function isPlainObject(v: unknown): v is Json {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function deepClone<T>(v: T): T {
  if (Array.isArray(v)) return v.map((x) => deepClone(x)) as unknown as T;
  if (isPlainObject(v)) {
    const out: Json = {};
    for (const k of Object.keys(v)) out[k] = deepClone((v as Json)[k]);
    return out as unknown as T;
  }
  return v;
}

function splitPath(path: string): string[] {
  return path.split('.').filter((p) => p.length > 0);
}

function getPath(obj: Json, path: string): unknown {
  const parts = splitPath(path);
  let cur: unknown = obj;
  for (const p of parts) {
    if (!isPlainObject(cur)) return undefined;
    cur = cur[p];
  }
  return cur;
}

function setPath(obj: Json, path: string, value: unknown): Json {
  const parts = splitPath(path);
  if (parts.length === 0) return obj;
  const root: Json = deepClone(obj);
  let cur: Json = root;
  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i];
    const next = cur[key];
    cur[key] = isPlainObject(next) ? next : {};
    cur = cur[key] as Json;
  }
  cur[parts[parts.length - 1]] = value;
  return root;
}

function deletePath(obj: Json, path: string): Json {
  const parts = splitPath(path);
  if (parts.length === 0) return obj;
  const root: Json = deepClone(obj);
  let cur: Json = root;
  for (let i = 0; i < parts.length - 1; i++) {
    const next = cur[parts[i]];
    if (!isPlainObject(next)) return root; // path doesn't exist, nothing to delete
    cur = next;
  }
  delete cur[parts[parts.length - 1]];
  return root;
}

function hasPath(obj: Json, path: string): boolean {
  const parts = splitPath(path);
  let cur: unknown = obj;
  for (const p of parts) {
    if (!isPlainObject(cur) || !(p in cur)) return false;
    cur = cur[p];
  }
  return true;
}

/**
 * Chainable, immutable transformer. Each method returns a new
 * JSONTransformer instance with the step appended; nothing runs until
 * `.run()` (or `.runMany()`) is called. The input object(s) are never
 * mutated.
 */
export class JSONTransformer {
  private readonly steps: Step[];

  constructor(steps: Step[] = []) {
    this.steps = steps;
  }

  private extend(step: Step): JSONTransformer {
    return new JSONTransformer([...this.steps, step]);
  }

  /** Keep only the given dot-paths (others are dropped). */
  pick(paths: string[]): JSONTransformer {
    return this.extend((obj) => {
      let out: Json = {};
      for (const path of paths) {
        if (hasPath(obj, path)) {
          out = setPath(out, path, getPath(obj, path));
        }
      }
      return out;
    });
  }

  /** Drop the given dot-paths, keeping everything else. */
  omit(paths: string[]): JSONTransformer {
    return this.extend((obj) => {
      let out = obj;
      for (const path of paths) out = deletePath(out, path);
      return out;
    });
  }

  /** Rename dot-paths: { 'old.path': 'new.path' }. Original key is removed. */
  rename(mapping: Record<string, string>): JSONTransformer {
    return this.extend((obj) => {
      let out = obj;
      for (const [from, to] of Object.entries(mapping)) {
        if (!hasPath(out, from)) continue;
        const value = getPath(out, from);
        out = deletePath(out, from);
        out = setPath(out, to, value);
      }
      return out;
    });
  }

  /** Apply fn to the value at a dot-path, replacing it with the result. No-op if path is absent. */
  map(path: string, fn: (value: unknown) => unknown): JSONTransformer {
    return this.extend((obj) => {
      if (!hasPath(obj, path)) return obj;
      return setPath(obj, path, fn(getPath(obj, path)));
    });
  }

  /** Set dot-paths to a default value only where currently absent. */
  defaults(values: Record<string, unknown>): JSONTransformer {
    return this.extend((obj) => {
      let out = obj;
      for (const [path, value] of Object.entries(values)) {
        if (!hasPath(out, path)) out = setPath(out, path, value);
      }
      return out;
    });
  }

  /** Flatten nested objects into dot-notation keys, e.g. { a: { b: 1 } } -> { 'a.b': 1 }. Arrays are kept as leaf values. */
  flatten(): JSONTransformer {
    return this.extend((obj) => flattenObject(obj));
  }

  /** Inverse of flatten(): { 'a.b': 1 } -> { a: { b: 1 } }. */
  unflatten(): JSONTransformer {
    return this.extend((obj) => unflattenObject(obj));
  }

  /** Insert a custom step function into the chain. */
  pipe(fn: (obj: Json) => Json): JSONTransformer {
    return this.extend(fn);
  }

  /** Run the chain against a single object, returning a new transformed object. */
  run(input: Json): Json {
    let cur: Json = deepClone(input);
    for (const step of this.steps) cur = step(cur);
    return cur;
  }

  /** Run the chain against each object in an array. */
  runMany(inputs: Json[]): Json[] {
    return inputs.map((i) => this.run(i));
  }
}

function flattenObject(obj: Json, prefix = ''): Json {
  const out: Json = {};
  for (const key of Object.keys(obj)) {
    const value = obj[key];
    const path = prefix ? `${prefix}.${key}` : key;
    if (isPlainObject(value) && Object.keys(value).length > 0) {
      Object.assign(out, flattenObject(value, path));
    } else {
      out[path] = value;
    }
  }
  return out;
}

function unflattenObject(obj: Json): Json {
  let out: Json = {};
  for (const key of Object.keys(obj)) {
    out = setPath(out, key, obj[key]);
  }
  return out;
}

/** Start a new transformer chain. */
export function transform(): JSONTransformer {
  return new JSONTransformer();
}

export default JSONTransformer;
