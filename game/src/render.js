// Salmon Song — everything the player sees, drawn on one 2D canvas.
// The judge reads the game mostly from screenshots, so every screen
// says what it is in big readable text.
import { VIEW_W, VIEW_H, WATER_TOP, WATER_BOTTOM, TOTAL_DISTANCE } from './config.js';
import { RIVERS } from './levels.js';
import { leapHeight } from './world.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_OVER = 'over';
export const SCREEN_WIN = 'win';
export const SCREEN_PAUSED = 'paused';

function seededRandom(seed) {
  let a = (seed >>> 0) || 1;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function makeBackdrop(seed) {
  const rnd = seededRandom(seed);
  const pines = [];
  for (let i = 0; i < 26; i += 1) {
    pines.push({ x: i * 52 + rnd() * 30, h: 46 + rnd() * 70, w: 34 + rnd() * 26 });
  }
  const pads = [];
  for (let i = 0; i < 9; i += 1) {
    pads.push({ x: rnd() * VIEW_W, y: WATER_TOP + 60 + rnd() * 380, r: 18 + rnd() * 22, a: rnd() * 6.28 });
  }
  const clouds = [];
  for (let i = 0; i < 6; i += 1) {
    clouds.push({ x: rnd() * VIEW_W, y: 26 + rnd() * 70, w: 90 + rnd() * 120, s: 4 + rnd() * 8 });
  }
  return { pines, pads, clouds };
}

function riverPalette(world) {
  return RIVERS[world.riverIndex];
}

function drawSky(ctx, backdrop, river, time) {
  const grad = ctx.createLinearGradient(0, 0, 0, WATER_TOP + 40);
  grad.addColorStop(0, river.skyTop);
  grad.addColorStop(0.6, river.skyMid);
  grad.addColorStop(1, river.skyLow);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, VIEW_W, WATER_TOP + 40);
  // Sun / moon.
  ctx.fillStyle = 'rgba(255, 244, 200, 0.95)';
  ctx.beginPath();
  ctx.arc(1120, 62, 34, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255, 244, 200, 0.35)';
  ctx.beginPath();
  ctx.arc(1120, 62, 48, 0, Math.PI * 2);
  ctx.fill();
  // Drifting clouds.
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  for (const c of backdrop.clouds) {
    const cx = ((c.x + time * c.s) % (VIEW_W + 200)) - 100;
    ctx.beginPath();
    ctx.ellipse(cx, c.y, c.w / 2, 14, 0, 0, Math.PI * 2);
    ctx.ellipse(cx + c.w * 0.25, c.y + 6, c.w / 3, 10, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // Pine-forest silhouette along the far bank.
  ctx.fillStyle = river.pine;
  for (const p of backdrop.pines) {
    const x = p.x;
    ctx.beginPath();
    ctx.moveTo(x - p.w / 2, WATER_TOP + 6);
    ctx.lineTo(x, WATER_TOP + 6 - p.h);
    ctx.lineTo(x + p.w / 2, WATER_TOP + 6);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillRect(0, WATER_TOP - 2, VIEW_W, 8);
}

function drawWater(ctx, backdrop, river, time, world) {
  const grad = ctx.createLinearGradient(0, WATER_TOP, 0, VIEW_H);
  grad.addColorStop(0, river.water);
  grad.addColorStop(1, river.waterDeep);
  ctx.fillStyle = grad;
  ctx.fillRect(0, WATER_TOP, VIEW_W, VIEW_H - WATER_TOP);
  // Sunlight shimmer on the surface.
  ctx.strokeStyle = 'rgba(255, 240, 180, 0.35)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 14; i += 1) {
    const y = WATER_TOP + 8 + i * 38;
    const off = Math.sin(time * 1.4 + i * 1.7) * 22;
    ctx.beginPath();
    ctx.moveTo(((i * 173 + time * 60) % (VIEW_W + 240)) - 120 + off, y);
    ctx.lineTo(((i * 173 + time * 60) % (VIEW_W + 240)) - 40 + off, y);
    ctx.stroke();
  }
  // Flow lines racing downstream (the current you fight).
  ctx.strokeStyle = 'rgba(255,255,255,0.16)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 22; i += 1) {
    const y = WATER_TOP + 30 + ((i * 47) % (VIEW_H - WATER_TOP - 40));
    const x = ((i * 251 - time * (90 + i * 6)) % (VIEW_W + 300)) - 150;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 70, y);
    ctx.stroke();
  }
  // Lily pads.
  for (const pad of backdrop.pads) {
    const px = ((pad.x - time * 24) % (VIEW_W + 120) + VIEW_W + 120) % (VIEW_W + 120) - 60;
    ctx.fillStyle = 'rgba(46, 125, 70, 0.9)';
    ctx.beginPath();
    ctx.arc(px, pad.y, pad.r, pad.a, pad.a + Math.PI * 1.7);
    ctx.lineTo(px, pad.y);
    ctx.fill();
    ctx.fillStyle = 'rgba(120, 200, 120, 0.8)';
    ctx.beginPath();
    ctx.arc(px - pad.r * 0.3, pad.y - pad.r * 0.3, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  // Calm eddies: pale swirling rings where stamina recovers.
  for (const e of world.eddies) {
    ctx.strokeStyle = 'rgba(220, 245, 235, 0.5)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(e.x, e.y, e.r * (0.6 + 0.1 * Math.sin(time * 2)), 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(220, 245, 235, 0.25)';
    ctx.beginPath();
    ctx.arc(e.x, e.y, e.r * 0.35, 0, Math.PI * 2);
    ctx.stroke();
  }
}

// The salmon: orange body, wagging tail, fins and a determined eye.
// `leapH` lifts it out of the water on a leap arc.
function drawSalmon(ctx, salmon, leapH, time) {
  const x = salmon.x;
  const y = salmon.y - leapH;
  const wag = Math.sin(salmon.wag) * 10;
  const blink = salmon.invuln > 0 && Math.floor(time * 12) % 2 === 0;
  ctx.save();
  // Invulnerable after a hit: flicker, but never vanish entirely.
  if (blink) ctx.globalAlpha = 0.35;
  ctx.translate(x, y);
  if (leapH > 20) ctx.rotate(-0.35);
  // Tail.
  ctx.fillStyle = '#e86a2a';
  ctx.beginPath();
  ctx.moveTo(-34, 0);
  ctx.quadraticCurveTo(-58, -16 - wag, -66, -22 - wag);
  ctx.quadraticCurveTo(-52, 0, -66, 22 + wag);
  ctx.quadraticCurveTo(-58, 16 + wag, -34, 0);
  ctx.fill();
  // Body.
  const bodyGrad = ctx.createLinearGradient(0, -18, 0, 18);
  bodyGrad.addColorStop(0, '#ffb347');
  bodyGrad.addColorStop(0.5, '#f47c20');
  bodyGrad.addColorStop(1, '#c94f0e');
  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.ellipse(0, 0, 46, 17, 0, 0, Math.PI * 2);
  ctx.fill();
  // Back stripe and spots.
  ctx.fillStyle = 'rgba(120, 40, 0, 0.55)';
  ctx.beginPath();
  ctx.ellipse(-6, -9, 30, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(90, 30, 0, 0.6)';
  for (const [sx, sy] of [[-14, -4], [2, 4], [14, -6], [24, 2]]) {
    ctx.beginPath();
    ctx.arc(sx, sy, 2.4, 0, Math.PI * 2);
    ctx.fill();
  }
  // Dorsal fin and belly fin.
  ctx.fillStyle = '#d95f16';
  ctx.beginPath();
  ctx.moveTo(-6, -14);
  ctx.quadraticCurveTo(4, -30, 14, -14);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(2, 14);
  ctx.quadraticCurveTo(10, 26, 18, 14);
  ctx.closePath();
  ctx.fill();
  // Eye.
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(30, -5, 5.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1a1a1a';
  ctx.beginPath();
  ctx.arc(31.5, -5, 2.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawRock(ctx, rock) {
  ctx.save();
  ctx.translate(rock.x, rock.y);
  ctx.rotate(Math.sin(rock.spin * 10) * 0.05);
  if (rock.kind === 'log') {
    ctx.fillStyle = '#6b4a2b';
    ctx.beginPath();
    ctx.roundRect(-rock.r - 8, -14, (rock.r + 8) * 2, 28, 12);
    ctx.fill();
    ctx.fillStyle = '#8a6238';
    ctx.beginPath();
    ctx.ellipse(rock.r + 8, 0, 7, 14, 0, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillStyle = '#5d6b73';
    ctx.beginPath();
    ctx.moveTo(-rock.r, rock.r * 0.7);
    ctx.lineTo(-rock.r * 0.5, -rock.r);
    ctx.lineTo(rock.r * 0.6, -rock.r * 0.8);
    ctx.lineTo(rock.r, rock.r * 0.6);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.beginPath();
    ctx.moveTo(-rock.r * 0.5, -rock.r);
    ctx.lineTo(0, -rock.r * 0.9);
    ctx.lineTo(-rock.r * 0.2, -rock.r * 0.3);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function drawFly(ctx, fly, time) {
  const y = fly.y + Math.sin(fly.bob) * 8;
  ctx.save();
  ctx.translate(fly.x, y);
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth = 2;
  const flap = Math.sin(time * 30 + fly.bob) * 0.7;
  ctx.beginPath();
  ctx.moveTo(0, -2);
  ctx.lineTo(-9, -8 - flap * 6);
  ctx.moveTo(0, -2);
  ctx.lineTo(9, -8 - flap * 6);
  ctx.stroke();
  ctx.fillStyle = fly.high ? '#ffd94d' : '#ffe9a8';
  ctx.beginPath();
  ctx.arc(0, 0, fly.high ? 6 : 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#3a2a12';
  ctx.beginPath();
  ctx.arc(2, -1, 1.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawHeron(ctx, heron, time) {
  if (heron.state === 'shadow') {
    // Telegraph: a dark shadow and ripples on the water.
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.beginPath();
    ctx.ellipse(heron.x, heron.y + 240, 46, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(heron.x, heron.y + 240, 58 + Math.sin(time * 8) * 6, 16, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255, 80, 60, 0.9)';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('!', heron.x, heron.y + 210);
  }
  // The bird itself, wings spread, plunging only to the surface.
  const diveY = heron.state === 'strike' ? WATER_TOP + 70 : heron.y;
  ctx.save();
  ctx.translate(heron.x, diveY);
  ctx.fillStyle = '#e8e4da';
  ctx.beginPath();
  ctx.ellipse(0, 0, 26, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  const flap = heron.state === 'strike' ? 0.2 : Math.sin(time * 6) * 0.5;
  ctx.fillStyle = '#cfc9bb';
  ctx.beginPath();
  ctx.moveTo(-6, 0);
  ctx.quadraticCurveTo(-34, -26 - flap * 20, -52, -10);
  ctx.quadraticCurveTo(-26, 4, -6, 4);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(6, 0);
  ctx.quadraticCurveTo(34, -26 - flap * 20, 52, -10);
  ctx.quadraticCurveTo(26, 4, 6, 4);
  ctx.fill();
  ctx.fillStyle = '#e8e4da';
  ctx.beginPath();
  ctx.ellipse(24, -4, 12, 7, -0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f5b81e';
  ctx.beginPath();
  ctx.moveTo(34, -6);
  ctx.lineTo(48, -3);
  ctx.lineTo(34, -1);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawBear(ctx, bear, time) {
  const warn = bear.state === 'warn';
  ctx.save();
  ctx.translate(bear.x, bear.y);
  if (warn && Math.floor(time * 6) % 2 === 0) {
    ctx.fillStyle = 'rgba(255, 80, 60, 0.95)';
    ctx.font = 'bold 26px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('!', 0, bear.top ? 60 : -60);
  }
  ctx.fillStyle = '#5a3a22';
  ctx.beginPath();
  ctx.ellipse(0, 0, 52, 34, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(38, -14, 20, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#7a5230';
  ctx.beginPath();
  ctx.arc(30, -30, 8, 0, Math.PI * 2);
  ctx.arc(46, -30, 8, 0, Math.PI * 2);
  ctx.fill();
  // Swipe paw.
  ctx.fillStyle = '#4a2e18';
  const reach = bear.state === 'swipe' ? 46 : 12;
  ctx.beginPath();
  ctx.ellipse(bear.top ? 30 : 30, bear.top ? 44 + reach * 0.4 : -44 - reach * 0.4, 26, 12, bear.top ? 0.5 : -0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawFallsWall(ctx, wall, time) {
  const x = wall.x;
  ctx.fillStyle = 'rgba(190, 230, 245, 0.9)';
  ctx.fillRect(x - 26, WATER_TOP - 40, 52, VIEW_H - WATER_TOP + 40);
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  for (let i = 0; i < 8; i += 1) {
    const y = WATER_TOP + ((i * 67 + time * 160) % (VIEW_H - WATER_TOP));
    ctx.fillRect(x - 26 + (i % 3) * 16, y, 8, 26);
  }
  ctx.fillStyle = '#7fb3c8';
  ctx.font = 'bold 22px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('LEAP!', Math.max(44, Math.min(1236, x)), WATER_TOP - 52);
}

// HUD: stamina, lives, river, progress to the spawning grounds, flies, score.
function drawHud(ctx, world) {
  const river = RIVERS[world.riverIndex];
  ctx.save();
  ctx.fillStyle = 'rgba(6, 32, 34, 0.55)';
  ctx.beginPath();
  ctx.roundRect(14, 12, 1252, 64, 12);
  ctx.fill();

  // Stamina bar.
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.beginPath();
  ctx.roundRect(28, 28, 220, 18, 9);
  ctx.fill();
  const stamW = 220 * (world.stamina / 100);
  ctx.fillStyle = world.stamina < 25 ? '#ff5a4d' : '#7ee081';
  ctx.beginPath();
  ctx.roundRect(28, 28, Math.max(8, stamW), 18, 9);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 15px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('STAMINA', 28, 62);

  // Lives as hearts.
  for (let i = 0; i < 3; i += 1) {
    const hx = 300 + i * 34;
    ctx.fillStyle = i < world.lives ? '#ff5a6e' : 'rgba(255,255,255,0.25)';
    ctx.beginPath();
    ctx.arc(hx, 36, 10, 0, Math.PI * 2);
    ctx.arc(hx + 14, 36, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(hx - 8, 40);
    ctx.lineTo(hx + 22, 40);
    ctx.lineTo(hx + 7, 56);
    ctx.closePath();
    ctx.fill();
  }

  // River name + distance progress.
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 20px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(river.name.toUpperCase(), 420, 40);
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.font = '15px sans-serif';
  ctx.fillText('River ' + (world.riverIndex + 1) + ' of 3 — swim home', 420, 60);
  const barX = 700;
  const barW = 330;
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.beginPath();
  ctx.roundRect(barX, 30, barW, 14, 7);
  ctx.fill();
  ctx.fillStyle = '#ffb347';
  ctx.beginPath();
  ctx.roundRect(barX, 30, barW * (world.distance / TOTAL_DISTANCE), 14, 7);
  ctx.fill();
  for (let i = 1; i < 3; i += 1) {
    ctx.fillStyle = '#fff';
    ctx.fillRect(barX + (barW * i) / 3 - 1, 26, 2, 22);
  }
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 15px sans-serif';
  ctx.fillText('SPAWNING GROUNDS', barX, 62);

  // Flies and score.
  ctx.textAlign = 'right';
  ctx.fillStyle = '#ffe9a8';
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText('FLIES ' + world.fliesEaten, 1060, 40);
  ctx.fillStyle = '#fff';
  ctx.fillText('SCORE ' + (Math.floor(world.distance) + world.fliesEaten * 50), 1252, 40);
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.font = '15px sans-serif';
  ctx.fillText(Math.floor(world.time) + 's', 1252, 60);
  ctx.restore();
}

function drawMessage(ctx, world) {
  if (world.messageT <= 0 || !world.message) return;
  ctx.save();
  ctx.globalAlpha = Math.min(1, world.messageT);
  ctx.fillStyle = 'rgba(6, 32, 34, 0.7)';
  const w = ctx.measureText(world.message).width + 44;
  ctx.beginPath();
  ctx.roundRect(VIEW_W / 2 - w / 2, 92, w, 40, 10);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 19px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(world.message, VIEW_W / 2, 119);
  ctx.restore();
}

function drawTitle(ctx, world, backdrop, time) {
  ctx.save();
  ctx.fillStyle = 'rgba(10, 30, 40, 0.35)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 96px Georgia, serif';
  ctx.shadowColor = 'rgba(0,0,0,0.45)';
  ctx.shadowBlur = 18;
  ctx.fillText('SALMON SONG', VIEW_W / 2, 250);
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#ffe9a8';
  ctx.font = 'italic bold 32px Georgia, serif';
  ctx.fillText('Swim home. Leap the falls. Dodge the heron.', VIEW_W / 2, 305);
  ctx.fillStyle = '#fff';
  ctx.font = '20px sans-serif';
  ctx.fillText('Three rivers stand between you and the spawning grounds.', VIEW_W / 2, 350);
  ctx.fillText('Eat flies to refill stamina · Rest in calm eddies · Leap with SPACE or CLICK · Dive with S', VIEW_W / 2, 382);
  const pulse = 0.65 + 0.35 * Math.sin(time * 3);
  ctx.globalAlpha = pulse;
  ctx.fillStyle = '#ffb347';
  ctx.font = 'bold 30px sans-serif';
  ctx.fillText('CLICK OR PRESS ENTER TO SWIM', VIEW_W / 2, 470);
  ctx.globalAlpha = 1;
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.font = '17px sans-serif';
  ctx.fillText('Mouse steers · SPACE / Click leaps · S dives deep · P pauses · M mutes · R restarts', VIEW_W / 2, 520);
  if (world.best > 0) {
    ctx.fillStyle = '#ffe9a8';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText('Best score: ' + world.best, VIEW_W / 2, 560);
  }
  // A salmon glides across the title water, so the cover shows the hero.
  drawSalmon(ctx, { x: 640 + Math.sin(time * 0.7) * 60, y: 640, wag: time * 7, invuln: 0 }, 0, time);
  ctx.restore();
}

function drawEndPanel(ctx, world, won) {
  ctx.save();
  ctx.fillStyle = 'rgba(6, 26, 32, 0.55)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  const panelW = 640;
  const panelH = 400;
  const px = (VIEW_W - panelW) / 2;
  const py = (VIEW_H - panelH) / 2;
  ctx.fillStyle = 'rgba(10, 42, 46, 0.95)';
  ctx.beginPath();
  ctx.roundRect(px, py, panelW, panelH, 20);
  ctx.fill();
  ctx.strokeStyle = won ? '#ffd94d' : '#ff5a6e';
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.textAlign = 'center';
  ctx.fillStyle = won ? '#ffd94d' : '#ff8a96';
  ctx.font = 'bold 58px Georgia, serif';
  ctx.fillText(won ? 'YOU MADE IT HOME!' : 'THE RIVER WINS', VIEW_W / 2, py + 84);
  ctx.fillStyle = '#fff';
  ctx.font = '22px sans-serif';
  ctx.fillText(
    won ? 'You reached the spawning grounds. The song continues.' : 'All three lives lost — the herons feast tonight.',
    VIEW_W / 2,
    py + 128,
  );
  ctx.fillStyle = '#ffe9a8';
  ctx.font = 'bold 30px sans-serif';
  ctx.fillText('SCORE  ' + world.score, VIEW_W / 2, py + 190);
  ctx.fillStyle = '#fff';
  ctx.font = '20px sans-serif';
  ctx.fillText('Flies eaten: ' + world.fliesEaten + '    Distance: ' + Math.floor(world.distance) + ' m', VIEW_W / 2, py + 228);
  ctx.fillText('Time: ' + Math.floor(world.time) + 's    Best: ' + world.best, VIEW_W / 2, py + 260);
  const pulse = 0.65 + 0.35 * Math.sin(world.time * 3);
  ctx.globalAlpha = pulse;
  ctx.fillStyle = '#ffb347';
  ctx.font = 'bold 26px sans-serif';
  ctx.fillText('PRESS R OR CLICK TO SWIM AGAIN', VIEW_W / 2, py + 330);
  ctx.globalAlpha = 1;
  ctx.restore();
}

function drawPaused(ctx) {
  ctx.save();
  ctx.fillStyle = 'rgba(6, 26, 32, 0.6)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 64px Georgia, serif';
  ctx.fillText('PAUSED', VIEW_W / 2, VIEW_H / 2 - 10);
  ctx.font = '22px sans-serif';
  ctx.fillText('Press P to keep swimming', VIEW_W / 2, VIEW_H / 2 + 34);
  ctx.restore();
}

// Draw one frame. `screen` is the screen to show; `time` drives the
// backdrop animation. The world is never mutated here.
export function drawGame(ctx, world, backdrop, screen, time) {
  ctx.save();
  if (world.shake > 0) {
    ctx.translate((Math.random() - 0.5) * world.shake, (Math.random() - 0.5) * world.shake);
  }
  const river = riverPalette(world);
  drawSky(ctx, backdrop, river, time);
  drawWater(ctx, backdrop, river, time, world);
  for (const rock of world.rocks) drawRock(ctx, rock);
  for (const wall of world.falls) drawFallsWall(ctx, wall, time);
  for (const fly of world.flies) drawFly(ctx, fly, time);
  for (const heron of world.herons) drawHeron(ctx, heron, time);
  for (const bear of world.bears) drawBear(ctx, bear, time);
  // Bubbles under the salmon.
  ctx.fillStyle = 'rgba(220, 245, 255, 0.6)';
  for (const b of world.bubbles) {
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fill();
  }
  const salmon = world.salmon;
  const leapH = leapHeight(salmon);
  if (screen !== SCREEN_TITLE) drawSalmon(ctx, salmon, leapH, time);
  // Splash droplets.
  ctx.fillStyle = 'rgba(220, 240, 255, 0.85)';
  for (const p of world.particles) {
    ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  // Surface line the salmon breaks when it leaps.
  ctx.strokeStyle = 'rgba(255,255,255,0.4)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, WATER_TOP);
  ctx.lineTo(VIEW_W, WATER_TOP);
  ctx.stroke();
  if (screen === SCREEN_PLAY || screen === SCREEN_PAUSED) {
    drawHud(ctx, world);
    drawMessage(ctx, world);
  }
  if (screen === SCREEN_TITLE) drawTitle(ctx, world, backdrop, time);
  if (screen === SCREEN_WIN) drawEndPanel(ctx, world, true);
  if (screen === SCREEN_OVER) drawEndPanel(ctx, world, false);
  if (screen === SCREEN_PAUSED) drawPaused(ctx);
  if (world.flash > 0) {
    ctx.fillStyle = `rgba(255, 60, 50, ${world.flash})`;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }
  ctx.restore();
}
