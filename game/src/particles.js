// Salmon Song — splash droplets and rising bubbles. Pure numbers in,
// pure numbers out; render.js decides how they look.
export function spawnSplash(particles, x, y, count) {
  for (let i = 0; i < count; i += 1) {
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * 2.2;
    const speed = 60 + Math.random() * 220;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.5 + Math.random() * 0.4,
      maxLife: 0.9,
      size: 2 + Math.random() * 4,
    });
  }
}

export function spawnBubbles(bubbles, x, y, count) {
  for (let i = 0; i < count; i += 1) {
    bubbles.push({
      x: x + (Math.random() - 0.5) * 30,
      y: y + (Math.random() - 0.5) * 20,
      r: 2 + Math.random() * 5,
      vy: -(20 + Math.random() * 30),
      life: 1.6,
    });
  }
}

export function updateSplashes(particles, dt) {
  for (const p of particles) {
    p.vy += 520 * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.life -= dt;
  }
  for (let i = particles.length - 1; i >= 0; i -= 1) {
    if (particles[i].life <= 0) particles.splice(i, 1);
  }
}

export function updateBubbles(bubbles, dt) {
  for (const b of bubbles) {
    b.y += b.vy * dt;
    b.x += Math.sin(b.life * 6) * 12 * dt;
    b.life -= dt;
  }
  for (let i = bubbles.length - 1; i >= 0; i -= 1) {
    if (bubbles[i].life <= 0) bubbles.splice(i, 1);
  }
}
