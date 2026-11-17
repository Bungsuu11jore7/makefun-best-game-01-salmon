// Salmon Song — deterministic screenshot scenes behind
// ?shot=start|play|rapids|end. Each scene plays the real rules forward
// from a fresh world with a fixed seed, steered by a simple autopilot,
// so the frame is what a real game looks like and the same seed always
// gives the same frame.
import { startGame, stepWorld, EVENT_GAME_OVER, EVENT_WIN } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';
import { WATER_TOP, WATER_BOTTOM } from './config.js';
import { riverForDistance } from './levels.js';

const STEP = 1 / 60;
const START_SECONDS = 5;
const PLAY_SECONDS = 10;
const RAPIDS_SECONDS = 14;
const END_LIMIT_SECONDS = 600;

function blankInput() {
  return { pointerX: 330, pointerY: 420, pointerActive: false, leapPressed: false, diveHeld: false };
}

function clampY(y) {
  return Math.max(WATER_TOP + 46, Math.min(WATER_BOTTOM - 30, y));
}

// The good pilot: chases the nearest fly, leaps rocks and falls walls,
// and dives when a heron shadow sits overhead. Exported so a plain
// Node run can drive the same pilot and prove the game is winnable.
export function goodPilot(world) {
  const input = blankInput();
  const salmon = world.salmon;
  const river = riverForDistance(world.distance);
  input.pointerActive = true;
  input.pointerX = salmon.x;
  let targetY = 420;
  let nearestFly = null;
  let nearestDx = Infinity;
  for (const fly of world.flies) {
    const dx = fly.x - salmon.x;
    if (dx > -20 && dx < 520 && dx < nearestDx) {
      nearestDx = dx;
      nearestFly = fly;
    }
  }
  // Swim toward the nearest fly to eat it — unless a rock is bearing
  // down, in which case steer for the safest lane. The threat window is
  // wide on purpose: the salmon must start dodging long before the rock
  // is on top of it, and never chase a fly through a rock's lane.
  const nearRocks = world.rocks.filter((rock) => {
    const dx = rock.x - salmon.x;
    return dx > -50 && dx < 520;
  });
  if (nearRocks.length > 0) {
    const lanes = [250, 420, 590];
    let bestLane = 420;
    let bestScore = -Infinity;
    for (const lane of lanes) {
      let clearance = Infinity;
      for (const rock of nearRocks) {
        clearance = Math.min(clearance, Math.abs(rock.y - lane) - rock.r);
      }
      const score = clearance - Math.abs(lane - salmon.y) * 0.15;
      if (score > bestScore) {
        bestScore = score;
        bestLane = lane;
      }
    }
    targetY = clampY(bestLane);
    input.pointerX = salmon.x;
  } else if (nearestFly) {
    targetY = clampY(nearestFly.y);
    input.pointerX = Math.max(200, Math.min(420, nearestFly.x));
  }
  // Bears guard the banks: stay mid-river when one is close.
  for (const bear of world.bears) {
    if (bear.x - salmon.x > -40 && bear.x - salmon.x < 220) targetY = 420;
  }
  // Dive when a heron shadow is overhead.
  let diving = false;
  for (const heron of world.herons) {
    if (heron.state === 'shadow' && Math.abs(heron.x - salmon.x) < 130) diving = true;
  }
  input.diveHeld = diving;
  if (diving) targetY = WATER_BOTTOM - 60;
  input.pointerY = targetY;
  // Leap: a rock just ahead at our depth — timed so the rock arrives
  // while the leap is still in the air (the window scales with the
  // river's rock speed) — a falls wall at leap-peak range, or a high fly.
  let leap = false;
  if (!salmon.leaping) {
    const leapReach = river.rockSpeed * 0.7;
    for (const rock of world.rocks) {
      const dx = rock.x - salmon.x;
      if (dx > 20 && dx < leapReach && Math.abs(rock.y - salmon.y) < 70) leap = true;
    }
    for (const wall of world.falls) {
      const dx = wall.x - salmon.x;
      if (dx > 40 && dx < 140) leap = true;
    }
    if (nearestFly && nearestFly.high && nearestDx > 20 && nearestDx < 160) leap = true;
  }
  input.leapPressed = leap;
  return input;
}

// The hurried pilot: swims straight up the middle, never leaps, never
// dives — so the rocks catch it, as a rushed player is caught.
function hurriedPilot(world) {
  const input = blankInput();
  input.pointerActive = true;
  input.pointerX = world.salmon.x;
  input.pointerY = 420;
  return input;
}

function runPilot(world, pilot, seconds) {
  let simTime = 0;
  for (let i = 0; i < seconds / STEP; i += 1) {
    const event = stepWorld(world, STEP, pilot(world));
    simTime += STEP;
    if (event & EVENT_GAME_OVER) break;
    if (event & EVENT_WIN) break;
  }
  return simTime;
}

/**
 * Set `world` to the named scene (start, play, rapids or end; any other
 * name is start) and return the screen to draw, the best score to show
 * and the clock time for the backdrop animation.
 */
export function stageShot(name, world, seed) {
  startGame(world);
  if (name !== 'play' && name !== 'rapids' && name !== 'end') {
    for (let i = 0; i < START_SECONDS / STEP; i += 1) {
      stepWorld(world, STEP, blankInput());
    }
    return { screen: SCREEN_TITLE, best: 2450, time: 5 };
  }
  if (name === 'rapids') {
    // Start mid-run in river 2, where the current is fast and herons hunt.
    world.distance = 1150;
    world.riverIndex = 1;
    world.spawnHeronIn = 1.5;
    world.spawnRockIn = 0.6;
    const simTime = runPilot(world, goodPilot, RAPIDS_SECONDS);
    // Guarantee a heron telegraph is visible in the frame: if none is
    // hunting right now, stage one's shadow over the salmon.
    if (world.herons.length === 0) {
      world.herons.push({ x: world.salmon.x + 60, y: WATER_TOP - 30, t: 0.4, state: 'shadow', struck: false });
    }
    const over = world.lives === 0;
    const won = world.screen === 'win';
    return {
      screen: over ? SCREEN_OVER : won ? SCREEN_WIN : SCREEN_PLAY,
      best: Math.max(2450, world.score),
      time: simTime,
    };
  }
  if (name === 'end') {
    const simTime = runPilot(world, hurriedPilot, END_LIMIT_SECONDS);
    if (world.screen === 'play') {
      // The pilot somehow survived: end the run on the results screen.
      world.lives = 0;
      world.screen = 'over';
      world.score = Math.floor(world.distance) + world.fliesEaten * 50;
    }
    return {
      screen: SCREEN_OVER,
      best: Math.max(2450, world.score),
      time: simTime,
    };
  }
  const simTime = runPilot(world, goodPilot, PLAY_SECONDS);
  const over = world.lives === 0;
  const won = world.screen === 'win';
  return {
    screen: over ? SCREEN_OVER : won ? SCREEN_WIN : SCREEN_PLAY,
    best: Math.max(2450, world.score),
    time: simTime,
  };
}
