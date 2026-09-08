/**
 * Deterministic PRNG for parity tests.
 *
 * The planner is intentionally non-deterministic (it calls `Math.random()` for
 * score jitter and weighted selection). To compare the vendored mobile engine
 * against canonical vectors produced by the WEB engine, both sides replace
 * `Math.random` with the SAME seeded sequence for the duration of a run.
 *
 * `mulberry32` is a well-known 32-bit generator: tiny, fast, no state beyond one
 * integer, identical output on any JS engine. Used by BOTH the vector generator
 * (`scripts`/scratchpad, against web `src/lib/mealPlanner.ts`) and
 * `mealPlanner.parity.test.ts` (against the vendored copy).
 */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function next(): number {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Swap `Math.random` for a `mulberry32(seed)` sequence and return a restore
 * function. Always call the restore in a `finally`.
 */
export function installSeededRandom(seed: number): () => void {
  const original = Math.random;
  Math.random = mulberry32(seed);
  return () => {
    Math.random = original;
  };
}
