# json-transformer

A small, chainable, **immutable** JSON transformer for TypeScript/Node.
Build a pipeline of pick/omit/rename/map/defaults/flatten steps once, then
run it against a single object or an array of objects. The input is never
mutated — every step returns a new object. Zero runtime dependencies.

## Install

Copy `src/index.ts` into your project, or build this repo (`npm run build`)
and depend on the compiled `dist/`.

## Quickstart

```ts
import { transform } from 'json-transformer';

const pipeline = transform()
  .omit(['internal_id'])
  .rename({ 'user.name': 'user.fullName' })
  .map('user.email', (e) => String(e).toLowerCase())
  .defaults({ 'user.address.country': 'UK' });

const result = pipeline.run(input);       // single object
const results = pipeline.runMany(inputs); // array of objects
```

The same `pipeline` object can be reused across many inputs — building the
chain does no work; `.run()`/`.runMany()` is what executes it.

## API

All methods return a new `JSONTransformer` (the chain is immutable too) and
accept dot-notation paths (`'user.address.city'`) for nested access.

- `transform()` — start a new empty chain.
- `.pick(paths: string[])` — keep only these dot-paths, drop everything else.
- `.omit(paths: string[])` — drop these dot-paths, keep everything else.
- `.rename(mapping: Record<string, string>)` — move a value from one
  dot-path to another (`{ 'old.path': 'new.path' }`); the old key is removed.
- `.map(path: string, fn: (value) => value)` — replace the value at a
  dot-path with `fn(value)`. No-op if the path is absent.
- `.defaults(values: Record<string, unknown>)` — set dot-paths to a default
  only where currently absent.
- `.flatten()` — nested objects to dot-notation keys:
  `{ a: { b: 1 } }` → `{ 'a.b': 1 }`.
- `.unflatten()` — the inverse of `.flatten()`.
- `.pipe(fn: (obj) => obj)` — drop in a custom step.
- `.run(input: object)` — execute the chain on one object.
- `.runMany(inputs: object[])` — execute the chain on each object in an array.

## Scope and limits

- Operates on plain JSON-shaped objects (`Record<string, unknown>`); arrays
  are treated as leaf values by `pick`/`flatten`/`unflatten`, not recursed
  into by dot-path (no `items.0.name`-style indexing).
- `flatten()`/`unflatten()` use `.` as the path separator; keys that
  legitimately contain a literal `.` will collide with nested paths.
- Not a validation or schema library — pair with a validator if you need to
  enforce shape as well as reshape it.

Sponsored by [Ferrow](https://ferrow.ai)

---
Part of the [ferrow-toolkit](https://github.com/FerrowAI/ferrow-toolkit) collection · Sponsored by [Ferrow](https://ferrow.ai)
