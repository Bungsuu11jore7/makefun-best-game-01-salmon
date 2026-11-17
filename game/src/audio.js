// Salmon Song — all sound is synthesized with WebAudio. No audio
// files, nothing fetched: river noise, splashes, blips and a win tune.
let audioCtx = null;
let muted = false;
let ambienceStarted = false;

function ensureContext() {
  if (audioCtx) return audioCtx;
  try {
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return null;
    audioCtx = new Ctor();
  } catch {
    return null;
  }
  return audioCtx;
}

export function isMuted() {
  return muted;
}

export function toggleMute() {
  muted = !muted;
  if (audioCtx && audioCtx.destination) {
    audioCtx.destination.gain = muted ? 0 : 1;
  }
  return muted;
}

// Start the river ambience (filtered noise, looped). Call from a user
// gesture; safe to call again — it starts once.
export function startAmbience() {
  const ctx = ensureContext();
  if (!ctx || ambienceStarted) return;
  ambienceStarted = true;
  try {
    const length = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 420;
    const gain = ctx.createGain();
    gain.gain.value = 0.05;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.13;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.02;
    lfo.connect(lfoGain);
    lfoGain.connect(gain.gain);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start();
    lfo.start();
  } catch {
    // Sound is garnish: a failure here must never stop the game.
  }
}

function tone(freq, dur, type, vol, slideTo) {
  if (muted) return;
  const ctx = ensureContext();
  if (!ctx) return;
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, ctx.currentTime + dur);
    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + dur);
  } catch {
    // ignore
  }
}

function noiseBurst(dur, vol, freq) {
  if (muted) return;
  const ctx = ensureContext();
  if (!ctx) return;
  try {
    const length = Math.floor(ctx.sampleRate * dur);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = freq;
    const gain = ctx.createGain();
    gain.gain.value = vol;
    src.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    src.start();
  } catch {
    // ignore
  }
}

export function playSplash() {
  noiseBurst(0.25, 0.5, 900);
}

export function playWhoosh() {
  noiseBurst(0.3, 0.35, 2400);
  tone(300, 0.25, 'sine', 0.12, 900);
}

export function playEat() {
  tone(880, 0.09, 'sine', 0.22, 1320);
}

export function playHit() {
  tone(140, 0.3, 'sawtooth', 0.3, 60);
  noiseBurst(0.2, 0.4, 300);
}

export function playWin() {
  const notes = [523, 659, 784, 1047, 1319];
  notes.forEach((freq, i) => {
    setTimeout(() => tone(freq, 0.5, 'triangle', 0.25), i * 130);
  });
}

export function playRiverChange() {
  tone(392, 0.2, 'triangle', 0.2, 523);
  setTimeout(() => tone(523, 0.3, 'triangle', 0.2, 784), 120);
}
