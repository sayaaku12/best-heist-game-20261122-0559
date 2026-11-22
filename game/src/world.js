// world.js — one clear job: the heist itself — movement, guard brains,
// cameras, detection, loot, alarm and lives. It knows nothing about pixels
// or sound files: it returns events, and main.js turns them into noise.

import { LEVELS, TUNING, FLOOR } from './config.js';
import {
  clamp,
  dist,
  angleDelta,
  pointInRect,
  resolveCircleRect,
  inVisionCone,
  mulberry32,
} from './random.js';

const T = TUNING;

/** A fresh guard from a level definition. */
function makeGuard(def) {
  const start = def.waypoints[0];
  return {
    x: start.x,
    y: start.y,
    r: 15,
    angle: 0,
    speed: def.speed,
    waypoints: def.waypoints,
    wpIndex: 1,
    wpDir: 1,
    state: 'patrol', // patrol | investigate | chase | look | return
    suspicion: 0,
    lastSeen: null,
    target: null,
    lookTimer: 0,
    stateTimer: 0,
    wasSuspicious: false,
    wasChasing: false,
  };
}

/** A fresh camera from a level definition. */
function makeCamera(def, index) {
  return {
    x: def.x,
    y: def.y,
    angle: def.baseAngle,
    baseAngle: def.baseAngle,
    sweep: def.sweep,
    speed: def.speed,
    phase: index * 1.7,
    seesPlayer: false,
    beeped: false,
  };
}

export function createWorld(levelIndex, carry) {
  const level = LEVELS[levelIndex];
  const rng = mulberry32(0x9e3779b9 + levelIndex * 7919);
  const world = {
    levelIndex,
    level,
    rng,
    time: 0,
    score: carry.score,
    lives: carry.lives,
    coinsLeft: T.coinsPerLevel,
    coinCooldown: 0,
    coins: [],
    gems: level.gems.map((g) => ({ ...g, taken: false })),
    gemsTaken: 0,
    exitOpen: false,
    alarm: 0,
    banner: null, // { text, sub, timer, color }
    bannerTimer: 0,
    caughtFlash: 0,
    lockdownTimer: 0,
    graceTimer: 0, // spawn protection after a catch: guards cannot spot you
    levelDone: false,
    gameOver: false,
    player: {
      x: level.spawn.x,
      y: level.spawn.y,
      r: 14,
      facing: 0,
      sneaking: false,
      moving: false,
      stepTimer: 0,
    },
    moveTarget: null,
    guards: level.guards.map(makeGuard),
    cameras: level.cameras.map(makeCamera),
  };
  return world;
}

/** True when (x,y) is inside one of the level's shadow pools. */
export function inShadow(world, x, y) {
  return world.level.shadows.some((s) => pointInRect(x, y, s));
}

function showBanner(world, text, sub, color) {
  world.banner = { text, sub: sub || '', color: color || '#ffd166' };
  world.bannerTimer = 2.6;
}

function resetAfterCaught(world, reason) {
  world.lives -= 1;
  world.score = Math.max(0, world.score - T.caughtScorePenalty);
  world.alarm = Math.min(world.alarm + 25, 90);
  world.caughtFlash = 1.1;
  world.graceTimer = 2.5; // a fair caught moment: time to slip away again
  world.player.x = world.level.spawn.x;
  world.player.y = world.level.spawn.y;
  world.moveTarget = null;
  for (const g of world.guards) {
    const start = g.waypoints[0];
    g.x = start.x;
    g.y = start.y;
    g.wpIndex = 1;
    g.wpDir = 1;
    g.state = 'patrol';
    g.suspicion = 0;
    g.lastSeen = null;
    g.target = null;
    g.wasSuspicious = false;
    g.wasChasing = false;
  }
  for (const c of world.cameras) c.seesPlayer = false;
  showBanner(world, reason, `Lives left: ${world.lives}`, '#ff6b6b');
  if (world.lives <= 0) world.gameOver = true;
}

function moveBody(world, body, vx, vy, dt) {
  body.x += vx * dt;
  body.y += vy * dt;
  body.x = clamp(body.x, FLOOR.x + body.r, FLOOR.x + FLOOR.w - body.r);
  body.y = clamp(body.y, FLOOR.y + body.r, FLOOR.y + FLOOR.h - body.r);
  for (const w of world.level.walls) resolveCircleRect(body, w);
}

function guardSeesPlayer(world, guard) {
  return inVisionCone(
    world.player.x,
    world.player.y,
    guard.x,
    guard.y,
    guard.angle,
    T.guardVisionRange,
    T.guardVisionHalfAngle,
    world.level.walls,
  );
}

function detectionMultiplier(world) {
  const p = world.player;
  let m = 1;
  if (p.sneaking) m *= T.sneakDetection;
  else m *= T.runDetection;
  if (inShadow(world, p.x, p.y)) m *= T.shadowDetection;
  return m;
}

function nearestWaypointIndex(guard) {
  let best = 0;
  let bestD = Infinity;
  guard.waypoints.forEach((w, i) => {
    const d = dist(guard.x, guard.y, w.x, w.y);
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  });
  return best;
}

function updateGuard(world, guard, dt, events) {
  const p = world.player;
  // Spawn protection: for a short while after a catch, guards cannot spot
  // the thief and cannot catch him again.
  const sees = world.graceTimer > 0 ? false : guardSeesPlayer(world, guard);
  const mult = detectionMultiplier(world);

  if (sees) {
    const d = dist(guard.x, guard.y, p.x, p.y);
    const closeness = 1 - d / T.guardVisionRange;
    guard.suspicion = clamp(
      guard.suspicion + (T.suspicionRiseBase + closeness * T.suspicionRiseCloseBonus) * mult * dt,
      0,
      1,
    );
    guard.lastSeen = { x: p.x, y: p.y };
  } else {
    const decay = inShadow(world, p.x, p.y) ? T.suspicionDecayHidden : T.suspicionDecay;
    guard.suspicion = clamp(guard.suspicion - decay * dt, 0, 1);
  }

  const suspiciousNow = guard.suspicion >= T.investigateAt;
  const chasingNow = guard.suspicion >= T.chaseAt;
  if (suspiciousNow && !guard.wasSuspicious) events.push({ type: 'suspicious' });
  if (chasingNow && !guard.wasChasing) {
    events.push({ type: 'alert' });
    guard.state = 'chase';
  }
  guard.wasSuspicious = suspiciousNow;
  guard.wasChasing = chasingNow;

  if (guard.state === 'chase' && guard.suspicion < 0.3) {
    guard.state = 'return';
    guard.target = null;
  }

  let speed = 0;
  let tx = null;
  let ty = null;

  if (guard.state === 'patrol') {
    if (guard.waypoints.length < 2) {
      // A one-point route is a posted guard: he stands and watches.
      if (suspiciousNow && !chasingNow) {
        guard.state = 'investigate';
        guard.target = guard.lastSeen ? { ...guard.lastSeen } : { x: p.x, y: p.y };
      }
    } else {
      const wp = guard.waypoints[guard.wpIndex];
      tx = wp.x;
      ty = wp.y;
      speed = guard.speed;
      if (dist(guard.x, guard.y, tx, ty) < 8) {
        guard.wpIndex += guard.wpDir;
        if (guard.wpIndex >= guard.waypoints.length) {
          guard.wpIndex = guard.waypoints.length - 2;
          guard.wpDir = -1;
        } else if (guard.wpIndex < 0) {
          guard.wpIndex = 1;
          guard.wpDir = 1;
        }
      }
      if (suspiciousNow && !chasingNow) {
        guard.state = 'investigate';
        guard.target = guard.lastSeen ? { ...guard.lastSeen } : { x: p.x, y: p.y };
      }
    }
  } else if (guard.state === 'investigate') {
    if (guard.target) {
      tx = guard.target.x;
      ty = guard.target.y;
      speed = T.guardInvestigateSpeed;
      if (dist(guard.x, guard.y, tx, ty) < 10) {
        guard.state = 'look';
        guard.lookTimer = 2.2;
      }
    } else {
      guard.state = 'return';
    }
  } else if (guard.state === 'chase') {
    tx = p.x;
    ty = p.y;
    speed = T.guardChaseSpeed;
  } else if (guard.state === 'look') {
    guard.lookTimer -= dt;
    guard.angle += dt * 1.4; // scan the room
    if (guard.lookTimer <= 0) guard.state = 'return';
  } else if (guard.state === 'return') {
    const i = nearestWaypointIndex(guard);
    const wp = guard.waypoints[i];
    tx = wp.x;
    ty = wp.y;
    speed = T.guardPatrolSpeed;
    if (dist(guard.x, guard.y, tx, ty) < 8) {
      guard.wpIndex = i + 1 < guard.waypoints.length ? i + 1 : 0;
      guard.wpDir = 1;
      guard.state = 'patrol';
    }
  }

  if (tx !== null && speed > 0) {
    const dx = tx - guard.x;
    const dy = ty - guard.y;
    const d = Math.hypot(dx, dy);
    if (d > 0.5) {
      const want = Math.atan2(dy, dx);
      guard.angle += angleDelta(guard.angle, want) * Math.min(1, dt * 10);
      moveBody(world, guard, (dx / d) * speed, (dy / d) * speed, dt);
    }
  }

  if (guard.state === 'chase' && world.graceTimer <= 0 && dist(guard.x, guard.y, p.x, p.y) < T.catchRadius) {
    events.push({ type: 'caught' });
    resetAfterCaught(world, 'CAUGHT!');
  }
}

function updateCameras(world, dt, events) {
  const p = world.player;
  const mult = detectionMultiplier(world);
  for (const cam of world.cameras) {
    cam.angle = cam.baseAngle + Math.sin(world.time * cam.speed + cam.phase) * cam.sweep;
    const sees = inVisionCone(
      p.x,
      p.y,
      cam.x,
      cam.y,
      cam.angle,
      T.cameraRange,
      T.cameraHalfAngle,
      world.level.walls,
    );
    cam.seesPlayer = sees;
    if (sees && world.graceTimer <= 0) {
      world.alarm = clamp(world.alarm + T.alarmCameraRate * mult * dt, 0, 100);
      if (!cam.beeped) {
        events.push({ type: 'camera' });
        cam.beeped = true;
      }
    } else {
      cam.beeped = false;
    }
  }
}

function throwCoin(world, input) {
  if (world.coinsLeft <= 0 || world.coinCooldown > 0) return false;
  world.coinsLeft -= 1;
  world.coinCooldown = T.coinCooldown;
  const p = world.player;
  const dir = input.clickTarget
    ? Math.atan2(input.clickTarget.y - p.y, input.clickTarget.x - p.x)
    : p.facing;
  let cx = p.x + Math.cos(dir) * T.coinThrowDistance;
  let cy = p.y + Math.sin(dir) * T.coinThrowDistance;
  cx = clamp(cx, FLOOR.x + 10, FLOOR.x + FLOOR.w - 10);
  cy = clamp(cy, FLOOR.y + 10, FLOOR.y + FLOOR.h - 10);
  const coin = { x: cx, y: cy, timer: 14 };
  world.coins.push(coin);
  for (const g of world.guards) {
    if (dist(g.x, g.y, cx, cy) < T.coinLureRadius) {
      g.state = 'investigate';
      g.target = { x: cx, y: cy };
      g.suspicion = Math.max(g.suspicion, 0.3);
    }
  }
  return true;
}

/**
 * One frame of the heist. Returns the events that happened, in order:
 * footstep | coin | gem | door | suspicious | alert | camera | caught |
 * lockdown | leveldone. Main.js turns events into sound and score text.
 */
export function updateWorld(world, input, dt) {
  const events = [];
  if (world.levelDone || world.gameOver) return events;
  world.time += dt;
  if (world.bannerTimer > 0) world.bannerTimer -= dt;
  if (world.caughtFlash > 0) world.caughtFlash -= dt;
  if (world.graceTimer > 0) world.graceTimer -= dt;
  if (world.coinCooldown > 0) world.coinCooldown -= dt;
  if (world.lockdownTimer > 0) {
    world.lockdownTimer -= dt;
    if (world.lockdownTimer <= 0) world.banner = null;
  }

  const p = world.player;
  p.sneaking = input.keys.has('sneak');
  const speed = p.sneaking ? T.playerSneakSpeed : T.playerWalkSpeed;

  // --- player movement: keys win over click-to-move
  const vec = input.moveVector();
  let moving = false;
  if (vec) {
    world.moveTarget = null;
    moveBody(world, p, vec.x * speed, vec.y * speed, dt);
    p.facing = Math.atan2(vec.y, vec.x);
    moving = true;
  } else if (world.moveTarget) {
    const dx = world.moveTarget.x - p.x;
    const dy = world.moveTarget.y - p.y;
    const d = Math.hypot(dx, dy);
    if (d < 7) {
      world.moveTarget = null;
    } else {
      moveBody(world, p, (dx / d) * speed, (dy / d) * speed, dt);
      p.facing = Math.atan2(dy, dx);
      moving = true;
    }
  }
  p.moving = moving;
  if (moving) {
    p.stepTimer -= dt;
    if (p.stepTimer <= 0) {
      events.push({ type: 'footstep', sneaking: p.sneaking });
      p.stepTimer = p.sneaking ? 0.55 : 0.34;
    }
  }
  if (input.clickTarget) {
    world.moveTarget = { ...input.clickTarget };
    input.clickTarget = null;
  }

  if (input.wasPressed('coin')) {
    if (throwCoin(world, input)) events.push({ type: 'coin' });
  }

  for (const coin of world.coins) coin.timer -= dt;
  world.coins = world.coins.filter((c) => c.timer > 0);

  // --- guards, cameras, alarm
  let anyChasing = false;
  for (const g of world.guards) {
    updateGuard(world, g, dt, events);
    if (g.state === 'chase') anyChasing = true;
    if (world.gameOver) return events;
  }
  updateCameras(world, dt, events);
  if (anyChasing) {
    world.alarm = clamp(world.alarm + T.alarmChaseRate * dt, 0, 100);
  } else if (!world.cameras.some((c) => c.seesPlayer)) {
    world.alarm = clamp(world.alarm - T.alarmDecay * dt, 0, 100);
  }

  if (world.alarm >= T.alarmLockdownAt) {
    events.push({ type: 'lockdown' });
    world.lockdownTimer = 2.6;
    resetAfterCaught(world, 'LOCKDOWN!');
    if (world.gameOver) return events;
  }

  // --- loot
  for (const gem of world.gems) {
    if (gem.taken) continue;
    if (dist(p.x, p.y, gem.x, gem.y) < T.gemRadius + p.r) {
      gem.taken = true;
      world.gemsTaken += 1;
      world.score += T.gemScore;
      events.push({ type: 'gem', kind: gem.kind });
      if (world.gemsTaken === world.gems.length) {
        world.exitOpen = true;
        events.push({ type: 'door' });
        showBanner(world, 'THE VAULT IS OPEN', 'Get to the green exit door', '#7dff9e');
      }
    }
  }

  // --- exit
  if (world.exitOpen && pointInRect(p.x, p.y, world.level.exit)) {
    const bonus = Math.max(0, T.timeBonusWindow - Math.floor(world.time)) * T.timeBonusPerSecond;
    world.score += T.levelClearScore + bonus;
    world.levelDone = true;
    events.push({ type: 'leveldone', bonus });
  }

  return events;
}
