// Salmon Song — seeded random numbers (mulberry32). Every spawn, fly
// and heron strike draws from here, so a fixed seed replays the same river.
export function makeRng(seed) {
  let a = (seed >>> 0) || 1;
  return function nextRandom() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pickFrom(rng, list) {
  return list[Math.floor(rng() * list.length)];
}

export function rangeRandom(rng, low, high) {
  return low + rng() * (high - low);
}
