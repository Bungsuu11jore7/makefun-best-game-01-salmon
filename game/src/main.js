// Salmon Song — boot and game loop. The canvas is fixed at 1280x720
// and scaled by CSS; the loop steps the world at a fixed 1/60 and draws
// every frame. With ?shot=start|play|rapids|end it stages one
// deterministic scene instead, for screenshots.
import { VIEW_W, VIEW_H } from './config.js';
import { createWorld, startGame, stepWorld, EVENT_EAT, EVENT_GAME_OVER, EVENT_HIT, EVENT_LEAP, EVENT_RIVER, EVENT_WIN } from './world.js';
import { drawGame, makeBackdrop } from './render.js';
import { createInput, attachInput, clearEdgeFlags } from './input.js';
import {
  startAmbience, playWhoosh, playEat, playHit, playWin,
  playRiverChange, toggleMute,
} from './audio.js';
import { stageShot } from './shots.js';

const canvas = document.getElementById('game');
const statusEl = document.getElementById('status');
const ctx = canvas.getContext('2d');
const params = new URLSearchParams(window.location.search);
const seed = Number(params.get('seed') || '1') || 1;
const shotName = params.get('shot');
const world = createWorld(seed);
const backdrop = makeBackdrop(seed);
const input = createInput();
attachInput(canvas, input);

let screen = 'title';
let lastTime = performance.now();
let best = 0;

function announce(text) {
  if (statusEl) statusEl.textContent = text;
}

function handleEvents(events) {
  if (events & EVENT_EAT) playEat();
  if (events & EVENT_LEAP) playWhoosh();
  if (events & EVENT_HIT) playHit();
  if (events & EVENT_RIVER) playRiverChange();
  if (events & EVENT_WIN) {
    playWin();
    best = Math.max(best, world.best);
    announce('You made it home! Score ' + world.score + '. Press R to swim again.');
  }
  if (events & EVENT_GAME_OVER) {
    best = Math.max(best, world.best);
    announce('The river wins. Score ' + world.score + '. Press R to swim again.');
  }
}

function beginPlay() {
  startGame(world);
  world.best = best;
  screen = 'play';
  startAmbience();
  announce('Swimming! Mouse steers, Space leaps, S dives.');
}

// Screenshot mode: stage the scene once and draw one frame. The canvas
// is pinned to exactly 1280x720 here: headless Chrome's viewport is
// shorter than its window, and a 100%-sized canvas would leave a bare
// strip at the bottom of the shot. Real play keeps the responsive size.
if (shotName) {
  canvas.style.width = '1280px';
  canvas.style.height = '720px';
  const staged = stageShot(shotName, world, seed);
  screen = staged.screen;
  best = staged.best;
  world.best = staged.best;
  drawGame(ctx, world, backdrop, screen, staged.time);
  announce('Salmon Song screenshot: ' + shotName);
} else {
  const STEP = 1 / 60;
  let accumulator = 0;
  function frame(now) {
    const dt = Math.min(0.1, (now - lastTime) / 1000);
    lastTime = now;
    if (input.mutePressed) toggleMute();
    if (input.pausePressed && screen === 'play') {
      screen = 'paused';
      announce('Paused. Press P to keep swimming.');
    } else if (input.pausePressed && screen === 'paused') {
      screen = 'play';
    }
    if (input.restartPressed && screen !== 'title') beginPlay();
    if (input.startPressed) {
      if (screen === 'title') beginPlay();
      else if (screen === 'win' || screen === 'over') beginPlay();
    }
    if (screen === 'play') {
      accumulator += dt;
      while (accumulator >= STEP) {
        const events = stepWorld(world, STEP, input);
        handleEvents(events);
        if (world.screen === 'win') screen = 'win';
        else if (world.screen === 'over') screen = 'over';
        accumulator -= STEP;
        if (screen !== 'play') break;
      }
    }
    drawGame(ctx, world, backdrop, screen, world.time);
    clearEdgeFlags(input);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
