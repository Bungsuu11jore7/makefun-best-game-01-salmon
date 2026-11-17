// Salmon Song — the river, the salmon and the rules. One step advances
// the whole world by dt seconds; the renderer only draws what is here.
import {
  VIEW_W, VIEW_H, WATER_TOP, WATER_BOTTOM, SALMON_X, RIVER_LENGTH,
  TOTAL_DISTANCE, MAX_LIVES, MAX_STAMINA, LEAP_STAMINA_COST,
  SWIM_STAMINA_DRAIN, EDDY_STAMINA_REGEN, IDLE_STAMINA_REGEN,
  FLY_STAMINA, FLY_SCORE, ROCK_HIT_INVULN, HERON_TELEGRAPH,
  LEAP_AIR_TIME, WIN_TIME_BONUS_PER_SECOND,
} from './config.js';
import { makeRng, rangeRandom } from './rng.js';
import { RIVERS, riverForDistance } from './levels.js';
import { spawnSplash, spawnBubbles, updateSplashes, updateBubbles } from './particles.js';

export const EVENT_NONE = 0;
export const EVENT_HIT = 1;
export const EVENT_EAT = 2;
export const EVENT_GAME_OVER = 4;
export const EVENT_WIN = 8;
export const EVENT_RIVER = 16;
export const EVENT_LEAP = 32;

export function createWorld(seed) {
  const world = {
    seed,
    rng: makeRng(seed),
    screen: 'title',
    time: 0,
    distance: 0,
    riverIndex: 0,
    stamina: MAX_STAMINA,
    lives: MAX_LIVES,
    fliesEaten: 0,
    score: 0,
    best: 0,
    shake: 0,
    flash: 0,
    salmon: freshSalmon(),
    rocks: [],
    falls: [],
    flies: [],
    herons: [],
    bears: [],
    eddies: [],
    particles: [],
    bubbles: [],
    spawnRockIn: 1.2,
    spawnFlyIn: 0.8,
    spawnHeronIn: 5,
    spawnBearIn: 5,
    spawnEddyIn: 3,
    fallsSpawned: [],
    heronWarned: false,
    message: '',
    messageT: 0,
  };
  return world;
}

function freshSalmon() {
  return {
    x: SALMON_X,
    y: (WATER_TOP + WATER_BOTTOM) / 2,
    targetX: SALMON_X,
    targetY: (WATER_TOP + WATER_BOTTOM) / 2,
    leapT: 0,
    leaping: false,
    diving: false,
    invuln: 0,
    wag: 0,
    facing: 1,
  };
}

export function startGame(world) {
  const seed = world.seed;
  const best = world.best;
  const fresh = createWorld(seed);
  fresh.best = best;
  Object.assign(world, fresh);
  world.screen = 'play';
  world.rng = makeRng(seed);
  showMessage(world, 'Swim home! Follow the river up.');
}

export function showMessage(world, text) {
  world.message = text;
  world.messageT = 2.6;
}

function currentRiver(world) {
  return RIVERS[world.riverIndex];
}

function spawnRock(world, river) {
  const y = rangeRandom(world.rng, WATER_TOP + 70, WATER_BOTTOM - 60);
  world.rocks.push({
    x: VIEW_W + 60,
    y,
    r: rangeRandom(world.rng, 26, 46),
    kind: world.rng() < 0.3 ? 'log' : 'rock',
    spin: rangeRandom(world.rng, -0.4, 0.4),
  });
}

function spawnFly(world, river) {
  const high = world.rng() < 0.35;
  world.flies.push({
    x: VIEW_W + 40,
    y: high
      ? rangeRandom(world.rng, WATER_TOP - 70, WATER_TOP - 10)
      : rangeRandom(world.rng, WATER_TOP + 50, WATER_BOTTOM - 120),
    high,
    bob: rangeRandom(world.rng, 0, 6.28),
    vx: rangeRandom(world.rng, 40, 90),
  });
}

function spawnHeron(world) {
  world.herons.push({
    x: world.salmon.x + rangeRandom(world.rng, -40, 120),
    y: WATER_TOP - 30,
    t: 0,
    state: 'shadow',
    struck: false,
  });
}

function spawnBear(world) {
  const top = world.rng() < 0.5;
  world.bears.push({
    x: VIEW_W + 80,
    top,
    y: top ? WATER_TOP + 20 : WATER_BOTTOM - 20,
    t: 0,
    state: 'warn',
    swiped: false,
  });
}

function spawnEddy(world) {
  world.eddies.push({
    x: VIEW_W + 60,
    y: rangeRandom(world.rng, WATER_TOP + 90, WATER_BOTTOM - 90),
    r: rangeRandom(world.rng, 70, 110),
  });
}

function spawnFallsWall(world, atDistance) {
  world.falls.push({ x: VIEW_W + 80, atDistance, passed: false });
}

// One hit: lose a life, splash, shake, brief invulnerability.
function takeHit(world, why) {
  const salmon = world.salmon;
  if (salmon.invuln > 0 || world.screen !== 'play') return EVENT_NONE;
  world.lives -= 1;
  salmon.invuln = ROCK_HIT_INVULN;
  world.shake = 14;
  world.flash = 0.35;
  spawnSplash(world.particles, salmon.x, salmon.y, 26);
  showMessage(world, why);
  if (world.lives <= 0) {
    world.screen = 'over';
    world.score = Math.floor(world.distance) + world.fliesEaten * FLY_SCORE;
    world.best = Math.max(world.best, world.score);
    return EVENT_HIT | EVENT_GAME_OVER;
  }
  return EVENT_HIT;
}

export function leapHeight(salmon) {
  if (!salmon.leaping) return 0;
  const p = 1 - salmon.leapT / LEAP_AIR_TIME;
  // The arc never lifts the salmon above the HUD bar (y ~ 85).
  return Math.min(Math.sin(p * Math.PI) * 190, Math.max(0, salmon.y - 85));
}

// Advance the world one frame. `input` is { pointerX, pointerY,
// pointerActive, leapPressed, diveHeld }. Returns an event bitmask.
export function stepWorld(world, dt, input) {
  world.time += dt;
  if (world.shake > 0) world.shake = Math.max(0, world.shake - dt * 30);
  if (world.flash > 0) world.flash = Math.max(0, world.flash - dt);
  if (world.messageT > 0) world.messageT -= dt;
  updateParticles(world, dt);
  if (world.screen !== 'play') return EVENT_NONE;

  const river = currentRiver(world);
  const salmon = world.salmon;
  let events = EVENT_NONE;

  // --- steering: the salmon follows the pointer with lag ---
  if (input.pointerActive) {
    salmon.targetX = Math.max(200, Math.min(560, input.pointerX));
    salmon.targetY = Math.max(WATER_TOP + 46, Math.min(WATER_BOTTOM - 30, input.pointerY));
  }
  const lag = 1 - Math.pow(0.0015, dt);
  salmon.x += (salmon.targetX - salmon.x) * lag;
  const diveTarget = input.diveHeld ? WATER_BOTTOM - 46 : salmon.targetY;
  salmon.y += (diveTarget - salmon.y) * (input.diveHeld ? 1 - Math.pow(0.0005, dt) : lag);
  salmon.diving = input.diveHeld;
  salmon.wag += dt * (6 + Math.abs(salmon.targetY - salmon.y) * 0.02);
  if (salmon.invuln > 0) salmon.invuln -= dt;

  // --- leap ---
  if (input.leapPressed && !salmon.leaping && world.stamina >= LEAP_STAMINA_COST) {
    salmon.leaping = true;
    salmon.leapT = LEAP_AIR_TIME;
    world.stamina -= LEAP_STAMINA_COST;
    spawnSplash(world.particles, salmon.x, salmon.y, 14);
    events |= EVENT_LEAP;
  }
  if (salmon.leaping) {
    salmon.leapT -= dt;
    if (salmon.leapT <= 0) {
      salmon.leaping = false;
      spawnSplash(world.particles, salmon.x, salmon.y, 18);
    }
  }

  // --- upstream progress: swim against the current ---
  const tired = world.stamina <= 0;
  const speed = river.swimSpeed * (tired ? 0.45 : 1) - river.current;
  world.distance += Math.max(0, speed) * dt;
  world.stamina = Math.max(0, world.stamina - SWIM_STAMINA_DRAIN * dt);
  const inEddy = world.eddies.some((e) => {
    const dx = salmon.x - e.x;
    const dy = salmon.y - e.y;
    return dx * dx + dy * dy < e.r * e.r;
  });
  if (inEddy) {
    world.stamina = Math.min(MAX_STAMINA, world.stamina + EDDY_STAMINA_REGEN * dt);
    if (world.rng() < dt * 6) spawnBubbles(world.bubbles, salmon.x, salmon.y, 1);
  } else {
    world.stamina = Math.min(MAX_STAMINA, world.stamina + IDLE_STAMINA_REGEN * dt * 0.4);
  }

  // --- river changes and the falls ---
  const nextRiver = riverForDistance(world.distance).index;
  if (nextRiver !== world.riverIndex) {
    world.riverIndex = nextRiver;
    showMessage(world, `${RIVERS[nextRiver].name} — ${RIVERS[nextRiver].tagline}`);
    events |= EVENT_RIVER;
  }
  const riverNow = currentRiver(world);
  for (const at of riverNow.fallsAt) {
    const abs = 2000 + at;
    if (world.distance >= abs - 260 && !world.fallsSpawned.includes(abs)) {
      world.fallsSpawned.push(abs);
      spawnFallsWall(world, abs);
    }
  }

  // --- spawns ---
  world.spawnRockIn -= dt;
  if (world.spawnRockIn <= 0) {
    spawnRock(world, riverNow);
    world.spawnRockIn = riverNow.rockGap * (0.75 + world.rng() * 0.5);
  }
  world.spawnFlyIn -= dt;
  if (world.spawnFlyIn <= 0) {
    spawnFly(world, riverNow);
    world.spawnFlyIn = riverNow.flyEvery * (0.7 + world.rng() * 0.6);
  }
  world.spawnEddyIn -= dt;
  if (world.spawnEddyIn <= 0) {
    spawnEddy(world);
    world.spawnEddyIn = riverNow.eddyEvery * (0.8 + world.rng() * 0.4);
  }
  if (riverNow.heronEvery < 100) {
    world.spawnHeronIn -= dt;
    if (world.spawnHeronIn <= 0) {
      spawnHeron(world);
      world.spawnHeronIn = riverNow.heronEvery * (0.8 + world.rng() * 0.4);
    }
  }
  if (riverNow.bearEvery < 100) {
    world.spawnBearIn -= dt;
    if (world.spawnBearIn <= 0) {
      spawnBear(world);
      world.spawnBearIn = riverNow.bearEvery * (0.8 + world.rng() * 0.4);
    }
  }

  // --- move the world past the salmon ---
  const scroll = riverNow.rockSpeed;
  moveLeft(world.rocks, scroll, dt);
  moveLeft(world.flies, 150, dt);
  moveLeft(world.eddies, scroll * 0.7, dt);
  moveLeft(world.falls, scroll, dt);
  for (const f of world.flies) f.bob += dt * 3;
  for (const b of world.bears) b.x -= scroll * 0.9 * dt;

  // --- flies: eat them ---
  const salmonY = salmon.y - leapHeight(salmon);
  for (const fly of world.flies) {
    const flyY = fly.y + Math.sin(fly.bob) * 8;
    const dx = fly.x - salmon.x;
    const dy = flyY - salmonY;
    if (dx * dx + dy * dy < 42 * 42) {
      fly.eaten = true;
      world.fliesEaten += 1;
      world.stamina = Math.min(MAX_STAMINA, world.stamina + FLY_STAMINA);
      spawnSplash(world.particles, fly.x, flyY, 6);
      events |= EVENT_EAT;
    }
  }
  world.flies = world.flies.filter((f) => !f.eaten && f.x > -60);

  // --- rocks: leap them or take the hit ---
  for (const rock of world.rocks) {
    const dx = rock.x - salmon.x;
    const dy = rock.y - salmon.y;
    const reach = rock.r + 26;
    if (!salmon.leaping && dx * dx + dy * dy < reach * reach) {
      rock.hit = true;
      events |= takeHit(world, 'A rock! Leap or steer around it.');
    }
  }
  world.rocks = world.rocks.filter((r) => !r.hit && r.x > -80);

  // --- falls walls: only a leap clears them ---
  for (const wall of world.falls) {
    if (!wall.passed && Math.abs(wall.x - salmon.x) < 46) {
      if (leapHeight(salmon) > 80) {
        wall.passed = true;
        showMessage(world, 'Over the falls! Beautiful leap.');
      } else {
        wall.passed = true;
        world.distance = Math.max(0, world.distance - 90);
        events |= takeHit(world, 'The falls! Leap over them with SPACE.');
      }
    }
  }
  world.falls = world.falls.filter((f) => f.x > -120);

  // --- herons: dive when the shadow is on you ---
  for (const heron of world.herons) {
    heron.t += dt;
    if (heron.state === 'shadow' && heron.t >= HERON_TELEGRAPH) {
      heron.state = 'strike';
      heron.struck = true;
      const deep = salmon.y > WATER_BOTTOM - 110;
      const dodged = deep || Math.abs(salmon.x - heron.x) > 80;
      if (!dodged && !salmon.leaping) {
        events |= takeHit(world, 'The heron got you! Dive when its shadow appears.');
      }
      spawnSplash(world.particles, heron.x, salmon.y, 16);
    }
    if (heron.t > HERON_TELEGRAPH + 0.7) heron.gone = true;
  }
  world.herons = world.herons.filter((h) => !h.gone);

  // --- bears: stay out of the swipe zone ---
  for (const bear of world.bears) {
    bear.t += dt;
    if (bear.state === 'warn' && bear.t >= 0.7) {
      bear.state = 'swipe';
      const inZone = bear.top ? salmon.y < WATER_TOP + 130 : salmon.y > WATER_BOTTOM - 130;
      const close = Math.abs(bear.x - salmon.x) < 110;
      if (inZone && close && !salmon.leaping) {
        events |= takeHit(world, 'A bear swipe! Keep to the middle of the river.');
      }
    }
    if (bear.t > 1.6) bear.gone = true;
  }
  world.bears = world.bears.filter((b) => !b.gone && b.x > -120);

  // --- win ---
  if (world.distance >= TOTAL_DISTANCE) {
    world.distance = TOTAL_DISTANCE;
    world.screen = 'win';
    const timeBonus = Math.max(0, Math.floor(90 - world.time)) * WIN_TIME_BONUS_PER_SECOND;
    world.score = Math.floor(world.distance) + world.fliesEaten * FLY_SCORE + timeBonus;
    world.best = Math.max(world.best, world.score);
    return events | EVENT_WIN;
  }
  return events;
}

function moveLeft(list, speed, dt) {
  for (const item of list) item.x -= speed * dt;
}

function updateParticles(world, dt) {
  updateSplashes(world.particles, dt);
  updateBubbles(world.bubbles, dt);
}
