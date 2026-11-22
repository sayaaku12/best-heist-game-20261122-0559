// audio.js — one clear job: every sound the game makes, synthesized live
// with WebAudio. No audio files, no network: oscillators and filtered noise
// only. Created lazily on the first user gesture so browsers allow it.

let ctx = null;
let master = null;
let muted = false;
let noiseBuffer = null;

function ensureContext() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = 0.5;
  master.connect(ctx.destination);
  // One second of white noise, reused by every percussive sound.
  noiseBuffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return ctx;
}

/** Unlock audio from a user gesture (click / key press). Safe to call often. */
export function unlockAudio() {
  const c = ensureContext();
  if (c && c.state === 'suspended') c.resume();
}

export function setMuted(m) {
  muted = m;
  if (master) master.gain.value = m ? 0 : 0.5;
}
export function isMuted() {
  return muted;
}

function tone(freq, dur, type, vol, when = 0, slideTo = null) {
  if (muted) return;
  const c = ensureContext();
  if (!c) return;
  const t0 = c.currentTime + when;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo !== null) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(vol, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g);
  g.connect(master);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

function noise(dur, vol, filterFreq, when = 0) {
  if (muted) return;
  const c = ensureContext();
  if (!c || !noiseBuffer) return;
  const t0 = c.currentTime + when;
  const src = c.createBufferSource();
  src.buffer = noiseBuffer;
  const filter = c.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = filterFreq;
  const g = c.createGain();
  g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(filter);
  filter.connect(g);
  g.connect(master);
  src.start(t0);
  src.stop(t0 + dur + 0.02);
}

/** A soft shoe scuff, throttled by the caller to the step cadence. */
export function playFootstep(sneaking) {
  noise(0.07, sneaking ? 0.05 : 0.11, sneaking ? 500 : 900);
}

/** Two-note chime when a gem is lifted. */
export function playGem() {
  tone(880, 0.16, 'sine', 0.22);
  tone(1318, 0.28, 'sine', 0.2, 0.09);
}

/** A bright clink when a coin is tossed. */
export function playCoin() {
  tone(1568, 0.1, 'triangle', 0.2);
  tone(2093, 0.18, 'triangle', 0.16, 0.06);
}

/** Short rising sting when a guard grows suspicious. */
export function playSuspicious() {
  tone(330, 0.22, 'square', 0.1, 0, 466);
}

/** Hard alarm sting when a guard starts the chase. */
export function playAlert() {
  tone(220, 0.16, 'sawtooth', 0.2);
  tone(220, 0.16, 'sawtooth', 0.2, 0.18);
  tone(311, 0.3, 'sawtooth', 0.22, 0.36);
}

/** Low buzz when the thief is caught. */
export function playCaught() {
  tone(180, 0.5, 'sawtooth', 0.25, 0, 70);
  noise(0.4, 0.14, 400);
}

/** Rising arpeggio when a room is cleared. */
export function playLevelClear() {
  [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.24, 'triangle', 0.2, i * 0.11));
}

/** Full win fanfare: two arpeggios, one octave apart. */
export function playWin() {
  [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.3, 'triangle', 0.2, i * 0.1));
  [1047, 1319, 1568, 2093].forEach((f, i) => tone(f, 0.34, 'sine', 0.16, 0.5 + i * 0.1));
}

/** A camera's warning beep when its lens first finds the thief. */
export function playCameraBeep() {
  tone(1200, 0.09, 'square', 0.12);
  tone(1200, 0.09, 'square', 0.12, 0.13);
}

/** The vault door grinding open. */
export function playDoor() {
  noise(0.5, 0.12, 300);
  tone(98, 0.5, 'sine', 0.16, 0, 147);
}
