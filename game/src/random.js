// random.js — one clear job: deterministic numbers and geometry helpers.
// The game never calls Math.random for gameplay; every run from the same seed
// plays the same way, so screenshots and tests are reproducible.

/** mulberry32: a tiny seeded PRNG. Seed once, get the same stream every run. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const dist = (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay);

/** Smallest signed turn from angle a to angle b, in (-PI, PI]. */
export function angleDelta(a, b) {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d <= -Math.PI) d += Math.PI * 2;
  return d;
}

/** True when (px,py) sits inside rect r (inclusive of its edges). */
export function pointInRect(px, py, r) {
  return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
}

/**
 * Push a circle (cx,cy,r) out of an axis-aligned rect, in place.
 * Returns true when the circle overlapped the rect.
 */
export function resolveCircleRect(body, r) {
  const nx = clamp(body.x, r.x, r.x + r.w);
  const ny = clamp(body.y, r.y, r.y + r.h);
  const dx = body.x - nx;
  const dy = body.y - ny;
  const d2 = dx * dx + dy * dy;
  if (d2 >= body.r * body.r) return false;
  if (d2 === 0) {
    // Centre inside the rect: push out along the shallowest side.
    const left = body.x - r.x;
    const right = r.x + r.w - body.x;
    const top = body.y - r.y;
    const bottom = r.y + r.h - body.y;
    const m = Math.min(left, right, top, bottom);
    if (m === left) body.x = r.x - body.r;
    else if (m === right) body.x = r.x + r.w + body.r;
    else if (m === top) body.y = r.y - body.r;
    else body.y = r.y + r.h + body.r;
    return true;
  }
  const d = Math.sqrt(d2);
  body.x = nx + (dx / d) * body.r;
  body.y = ny + (dy / d) * body.r;
  return true;
}

/** True when segment (ax,ay)-(bx,by) touches rect r (edges count). */
export function segmentHitsRect(ax, ay, bx, by, r) {
  if (pointInRect(ax, ay, r) || pointInRect(bx, by, r)) return true;
  const dx = bx - ax;
  const dy = by - ay;
  // Slab test: the segment's parameter interval inside the rect's x/y slabs.
  let t0 = 0;
  let t1 = 1;
  const slabs = [
    [dx, r.x - ax, r.x + r.w - ax],
    [dy, r.y - ay, r.y + r.h - ay],
  ];
  for (const [d, lo, hi] of slabs) {
    if (d === 0) {
      if (lo > 0 || hi < 0) return false;
      continue;
    }
    let ta = lo / d;
    let tb = hi / d;
    if (ta > tb) [ta, tb] = [tb, ta];
    t0 = Math.max(t0, ta);
    t1 = Math.min(t1, tb);
    if (t0 > t1) return false;
  }
  return true;
}

/**
 * Line of sight: true when nothing in `walls` blocks the segment
 * (ax,ay)-(bx,by). Walls are the level's rectangles.
 */
export function lineOfSight(ax, ay, bx, by, walls) {
  for (const w of walls) {
    if (segmentHitsRect(ax, ay, bx, by, w)) return false;
  }
  return true;
}

/**
 * Is (px,py) inside a vision cone? The cone starts at (ox,oy), faces `angle`,
 * reaches `range`, and spreads `halfAngle` each side. `walls` block sight.
 */
export function inVisionCone(px, py, ox, oy, angle, range, halfAngle, walls) {
  const d = dist(ox, oy, px, py);
  if (d > range) return false;
  if (d < 12) return lineOfSight(ox, oy, px, py, walls);
  const toTarget = Math.atan2(py - oy, px - ox);
  if (Math.abs(angleDelta(angle, toTarget)) > halfAngle) return false;
  return lineOfSight(ox, oy, px, py, walls);
}
