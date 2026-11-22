// render.js — one clear job: everything the eye sees — the room, the
// thief, the guards and their cones, the cameras, the loot, the alarm meter
// and every screen. Code-drawn art only; no images, no fonts from the net.

import { VIEW_W, VIEW_H, FLOOR, LEVELS } from './config.js';
import { clamp } from './random.js';
import { inShadow } from './world.js';

const GOLD = '#d4af37';
const MARBLE_A = '#1a2036';
const MARBLE_B = '#141a2e';

function conePath(ctx, x, y, angle, range, halfAngle) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, range, angle - halfAngle, angle + halfAngle);
  ctx.closePath();
}

function drawCone(ctx, x, y, angle, range, halfAngle, color, alpha) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  conePath(ctx, x, y, angle, range, halfAngle);
  ctx.fill();
  ctx.globalAlpha = alpha * 1.6;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();
}

function drawFloor(ctx, world) {
  ctx.fillStyle = MARBLE_A;
  ctx.fillRect(FLOOR.x, FLOOR.y, FLOOR.w, FLOOR.h);
  // Marble checker, faint enough to read as floor, never as clutter.
  ctx.fillStyle = MARBLE_B;
  const tile = 62;
  for (let y = FLOOR.y; y < FLOOR.y + FLOOR.h; y += tile) {
    for (let x = FLOOR.x; x < FLOOR.x + FLOOR.w; x += tile) {
      if (((x - FLOOR.x) / tile + (y - FLOOR.y) / tile) % 2 === 0) {
        ctx.fillRect(x, y, tile, tile);
      }
    }
  }
  // Gold trim around the room.
  ctx.strokeStyle = GOLD;
  ctx.globalAlpha = 0.55;
  ctx.lineWidth = 3;
  ctx.strokeRect(FLOOR.x + 1.5, FLOOR.y + 1.5, FLOOR.w - 3, FLOOR.h - 3);
  ctx.globalAlpha = 1;

  // Shadow pools: the safe dark. A soft edge says "hide here".
  for (const s of world.level.shadows) {
    const grad = ctx.createRadialGradient(
      s.x + s.w / 2, s.y + s.h / 2, 4,
      s.x + s.w / 2, s.y + s.h / 2, Math.max(s.w, s.h) * 0.62,
    );
    grad.addColorStop(0, 'rgba(2, 6, 20, 0.85)');
    grad.addColorStop(1, 'rgba(2, 6, 20, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(s.x - 20, s.y - 20, s.w + 40, s.h + 40);
  }
}

function drawWalls(ctx, world) {
  for (const w of world.level.walls) {
    ctx.fillStyle = '#2c3552';
    ctx.fillRect(w.x, w.y, w.w, w.h);
    ctx.fillStyle = '#3d4a6e';
    ctx.fillRect(w.x, w.y, w.w, 6);
    ctx.fillRect(w.x, w.y, 6, w.h);
    ctx.strokeStyle = '#0a0e1c';
    ctx.lineWidth = 2;
    ctx.strokeRect(w.x + 1, w.y + 1, w.w - 2, w.h - 2);
  }
}

function drawGems(ctx, world) {
  const t = world.time;
  for (const gem of world.gems) {
    if (gem.taken) continue;
    const bob = Math.sin(t * 2.4 + gem.x) * 3;
    const y = gem.y + bob;
    const color =
      gem.kind === 'ruby' ? '#ff4d6d' : gem.kind === 'diamond' ? '#bfe9ff' : '#5aa9ff';
    const glow = ctx.createRadialGradient(gem.x, y, 2, gem.x, y, 34);
    glow.addColorStop(0, color);
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(gem.x, y, 34, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    // Faceted gem: a diamond outline with a bright core.
    ctx.save();
    ctx.translate(gem.x, y);
    ctx.rotate(Math.sin(t * 1.2 + gem.x) * 0.12);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, -15);
    ctx.lineTo(11, 0);
    ctx.lineTo(0, 15);
    ctx.lineTo(-11, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath();
    ctx.moveTo(0, -15);
    ctx.lineTo(6, -3);
    ctx.lineTo(0, 2);
    ctx.lineTo(-6, -3);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

function drawExit(ctx, world) {
  const e = world.level.exit;
  const open = world.exitOpen;
  ctx.fillStyle = open ? '#12351f' : '#33131a';
  ctx.fillRect(e.x, e.y, e.w, e.h);
  ctx.strokeStyle = open ? '#7dff9e' : '#ff6b6b';
  ctx.lineWidth = 3;
  ctx.strokeRect(e.x + 1.5, e.y + 1.5, e.w - 3, e.h - 3);
  if (open) {
    ctx.save();
    ctx.globalAlpha = 0.5 + 0.3 * Math.sin(world.time * 4);
    ctx.fillStyle = '#7dff9e';
    ctx.font = 'bold 15px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('EXIT', e.x + e.w / 2, e.y + e.h / 2 + 5);
    ctx.restore();
  } else {
    ctx.fillStyle = '#ff6b6b';
    ctx.font = 'bold 13px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('LOCKED', e.x + e.w / 2, e.y + e.h / 2 + 4);
  }
}

function drawCoins(ctx, world) {
  for (const coin of world.coins) {
    ctx.fillStyle = '#ffd166';
    ctx.beginPath();
    ctx.arc(coin.x, coin.y, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#b8860b';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#b8860b';
    ctx.font = 'bold 9px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('¢', coin.x, coin.y + 3);
  }
}

function drawCameras(ctx, world) {
  for (const cam of world.cameras) {
    const color = cam.seesPlayer ? '#ff3b30' : '#ff8c42';
    drawCone(ctx, cam.x, cam.y, cam.angle, 215, 0.46, color, cam.seesPlayer ? 0.34 : 0.2);
    // Dome on its mount.
    ctx.fillStyle = '#20263e';
    ctx.beginPath();
    ctx.arc(cam.x, cam.y, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = cam.seesPlayer ? '#ff3b30' : '#ff8c42';
    ctx.beginPath();
    ctx.arc(cam.x, cam.y, 6, 0, Math.PI * 2);
    ctx.fill();
    if (cam.seesPlayer) {
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 11px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText('REC', cam.x, cam.y - 20);
    }
  }
}

function guardConeColor(guard) {
  if (guard.state === 'chase') return '#ff3b30';
  if (guard.suspicion >= 0.45) return '#ff9f1c';
  return '#ffe066';
}

function drawGuards(ctx, world) {
  for (const g of world.guards) {
    const color = guardConeColor(g);
    drawCone(ctx, g.x, g.y, g.angle, 175, 0.61, color, g.state === 'chase' ? 0.36 : 0.22);
    // Body: a navy uniform with a cap brim pointing where he looks.
    ctx.fillStyle = '#233a6b';
    ctx.beginPath();
    ctx.arc(g.x, g.y, g.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#0e1a38';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#d9e2ff';
    ctx.beginPath();
    ctx.arc(g.x + Math.cos(g.angle) * 6, g.y + Math.sin(g.angle) * 6, 6, 0, Math.PI * 2);
    ctx.fill();
    // Suspicion arc over his head.
    if (g.suspicion > 0.03) {
      ctx.strokeStyle = color;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(g.x, g.y, g.r + 8, -Math.PI / 2, -Math.PI / 2 + g.suspicion * Math.PI * 2);
      ctx.stroke();
    }
    // "?" while he investigates, "!" while he chases.
    if (g.state === 'chase' || g.state === 'investigate' || g.state === 'look') {
      ctx.fillStyle = g.state === 'chase' ? '#ff3b30' : '#ff9f1c';
      ctx.font = 'bold 22px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText(g.state === 'chase' ? '!' : '?', g.x, g.y - g.r - 12);
    }
  }
}

function drawPlayer(ctx, world) {
  const p = world.player;
  const hidden = inShadow(world, p.x, p.y);
  // A faint ring while sneaking: the thief is harder to see, and so are you.
  if (p.sneaking) {
    ctx.strokeStyle = 'rgba(125, 211, 252, 0.7)';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 5]);
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r + 6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  // Hooded cloak, mask band, and a glint where he looks.
  ctx.fillStyle = hidden ? '#1d2b45' : '#2b2f3a';
  ctx.beginPath();
  ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#0b0f1e';
  ctx.beginPath();
  ctx.arc(p.x + Math.cos(p.facing) * 5, p.y + Math.sin(p.facing) * 5, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#7dd3fc';
  ctx.beginPath();
  ctx.arc(p.x + Math.cos(p.facing) * 9, p.y + Math.sin(p.facing) * 9, 2.5, 0, Math.PI * 2);
  ctx.fill();
  // Click-to-move marker.
  if (world.moveTarget) {
    ctx.strokeStyle = 'rgba(125, 211, 252, 0.9)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(world.moveTarget.x, world.moveTarget.y, 9, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(world.moveTarget.x - 13, world.moveTarget.y);
    ctx.lineTo(world.moveTarget.x + 13, world.moveTarget.y);
    ctx.moveTo(world.moveTarget.x, world.moveTarget.y - 13);
    ctx.lineTo(world.moveTarget.x, world.moveTarget.y + 13);
    ctx.stroke();
  }
}

function drawHud(ctx, world, screen, totalScore, bestScore) {
  ctx.fillStyle = '#0d1226';
  ctx.fillRect(0, 0, VIEW_W, 64);
  ctx.fillStyle = GOLD;
  ctx.fillRect(0, 62, VIEW_W, 2);

  ctx.textAlign = 'left';
  ctx.fillStyle = '#f5e6b8';
  ctx.font = 'bold 19px Georgia, serif';
  ctx.fillText(`MIDNIGHT VAULT · ${world.level.name}`, 24, 28);
  ctx.fillStyle = '#8b93b8';
  ctx.font = '14px Georgia, serif';
  ctx.fillText(world.level.subtitle, 24, 50);

  // Gems, lives, coins, score.
  ctx.fillStyle = '#f5e6b8';
  ctx.font = 'bold 17px Georgia, serif';
  ctx.textAlign = 'right';
  const gemsText = `◆ ${world.gemsTaken}/${world.gems.length}`;
  const livesText = `♥`.repeat(Math.max(0, world.lives)) + `♡`.repeat(Math.max(0, 3 - world.lives));
  ctx.fillText(gemsText, 700, 28);
  ctx.fillStyle = '#ff6b81';
  ctx.fillText(livesText, 700, 50);
  ctx.fillStyle = '#f5e6b8';
  ctx.fillText(`¢ ${world.coinsLeft}`, 800, 28);
  ctx.fillStyle = '#8b93b8';
  ctx.font = '13px Georgia, serif';
  ctx.fillText('coins (C)', 800, 50);
  ctx.fillStyle = '#f5e6b8';
  ctx.font = 'bold 17px Georgia, serif';
  ctx.fillText(`SCORE ${totalScore}`, 960, 28);
  ctx.fillStyle = '#8b93b8';
  ctx.font = '13px Georgia, serif';
  const mins = Math.floor(world.time / 60);
  const secs = Math.floor(world.time % 60);
  ctx.fillText(`${mins}:${String(secs).padStart(2, '0')}  ·  BEST ${bestScore}`, 960, 50);

  // ALARM meter: the one number the whole heist turns on.
  const ax = 1030;
  const ay = 16;
  const aw = 226;
  const ah = 20;
  ctx.fillStyle = '#1a2036';
  ctx.fillRect(ax, ay, aw, ah);
  const frac = clamp(world.alarm / 100, 0, 1);
  const alarmColor = frac < 0.4 ? '#7dff9e' : frac < 0.7 ? '#ffd166' : '#ff3b30';
  ctx.fillStyle = alarmColor;
  ctx.fillRect(ax, ay, aw * frac, ah);
  ctx.strokeStyle = '#f5e6b8';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(ax + 0.75, ay + 0.75, aw - 1.5, ah - 1.5);
  ctx.fillStyle = '#f5e6b8';
  ctx.font = 'bold 13px Georgia, serif';
  ctx.textAlign = 'left';
  ctx.fillText('ALARM', ax, ay + ah + 15);
  ctx.textAlign = 'right';
  ctx.fillText(`${Math.floor(world.alarm)}%`, ax + aw, ay + ah + 15);
  if (screen === 'paused') {
    ctx.fillStyle = '#8b93b8';
    ctx.font = '13px Georgia, serif';
    ctx.textAlign = 'right';
    ctx.fillText('PAUSED — Esc to resume', 1256, 50);
  }
}

function drawBanner(ctx, world) {
  if (!world.banner || world.bannerTimer <= 0) return;
  const alpha = clamp(world.bannerTimer / 0.6, 0, 1);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.textAlign = 'center';
  ctx.fillStyle = world.banner.color;
  ctx.font = 'bold 44px Georgia, serif';
  ctx.shadowColor = '#000';
  ctx.shadowBlur = 12;
  ctx.fillText(world.banner.text, VIEW_W / 2, 300);
  if (world.banner.sub) {
    ctx.font = '19px Georgia, serif';
    ctx.fillStyle = '#f5e6b8';
    ctx.fillText(world.banner.sub, VIEW_W / 2, 334);
  }
  ctx.restore();
}

function drawVignette(ctx, world) {
  const frac = clamp(world.alarm / 100, 0, 1);
  if (frac < 0.35 && world.caughtFlash <= 0) return;
  const strength = Math.max(frac, world.caughtFlash > 0 ? 0.85 : 0);
  const grad = ctx.createRadialGradient(
    VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.42,
    VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.75,
  );
  grad.addColorStop(0, 'rgba(255, 30, 30, 0)');
  grad.addColorStop(1, `rgba(255, 30, 30, ${0.42 * strength})`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
}

function overlay(ctx, title, lines, accent) {
  ctx.fillStyle = 'rgba(5, 8, 18, 0.82)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.textAlign = 'center';
  ctx.fillStyle = accent || GOLD;
  ctx.font = 'bold 52px Georgia, serif';
  ctx.fillText(title, VIEW_W / 2, 210);
  ctx.fillStyle = '#e8ecf8';
  ctx.font = '19px Georgia, serif';
  lines.forEach((line, i) => ctx.fillText(line, VIEW_W / 2, 268 + i * 32));
}

export function drawTitle(ctx, world, bestScore) {
  drawWorld(ctx, world, 'title', 0, bestScore);
  overlay(ctx, 'MIDNIGHT VAULT', [
    'The Gilded Heist — three rooms, one diamond, no alarms.',
    '',
    'WASD / arrows to move · click to walk there · Shift to sneak',
    'C tosses a coin (guards come to look) · P or Esc pauses · M mutes · H help',
    'Lift every gem to open the exit. Cameras and cones feed the ALARM meter.',
    'At 100% the vault locks down and you lose a life. Three lives. Go quiet.',
    '',
    'Press Enter or click to begin',
    bestScore > 0 ? `Best score so far: ${bestScore}` : 'No score yet — the vault is waiting.',
  ]);
}

export function drawPaused(ctx, world, totalScore, bestScore) {
  drawWorld(ctx, world, 'paused', totalScore, bestScore);
  overlay(ctx, 'PAUSED', [
    'The guards hold their patrol. The cameras keep sweeping.',
    '',
    'Esc / P — resume · R — restart the room · M — mute',
  ], '#8b93b8');
}

export function drawLevelDone(ctx, world, totalScore, bestScore, bonus) {
  drawWorld(ctx, world, 'leveldone', totalScore, bestScore);
  const next = world.levelIndex + 1 < LEVELS.length ? LEVELS[world.levelIndex + 1].name : 'the getaway';
  overlay(ctx, 'ROOM CLEARED', [
    `${world.level.name} — every gem lifted, exit reached.`,
    `Room bonus ${bonus} · Score ${totalScore}`,
    '',
    `Next: ${next}`,
    'Press Enter to continue',
  ], '#7dff9e');
}

export function drawGameOver(ctx, world, totalScore, bestScore) {
  drawWorld(ctx, world, 'gameover', totalScore, bestScore);
  overlay(ctx, 'THE VAULT WINS', [
    'Three lives spent. The diamond stays in its case — this time.',
    `Score ${totalScore} · Best ${bestScore}`,
    '',
    'Press R to try the heist again',
  ], '#ff6b6b');
}

export function drawWin(ctx, world, totalScore, bestScore) {
  drawWorld(ctx, world, 'win', totalScore, bestScore);
  overlay(ctx, 'THE GILDED HEIST', [
    'Three rooms. Three sets of gems. One diamond, lifted clean.',
    `Final score ${totalScore} · Best ${bestScore}`,
    '',
    'The crew splits the take at dawn. You were never here.',
    'Press R to run it again',
  ], '#7dd3fc');
}

export function drawHelp(ctx) {
  ctx.fillStyle = 'rgba(5, 8, 18, 0.9)';
  ctx.fillRect(340, 180, 600, 330);
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 2;
  ctx.strokeRect(341, 181, 598, 328);
  ctx.textAlign = 'left';
  ctx.fillStyle = GOLD;
  ctx.font = 'bold 22px Georgia, serif';
  ctx.fillText('HOW TO STEAL QUIETLY', 370, 222);
  ctx.fillStyle = '#e8ecf8';
  ctx.font = '16px Georgia, serif';
  const lines = [
    'Move: WASD / arrows, or click the floor to walk there.',
    'Sneak (hold Shift): slower, but cones fill half as fast.',
    'Shadow pools (dark floor): cones fill half as fast again.',
    'Coin (C): toss one — nearby guards walk over to look.',
    '   You carry 5 coins per room. Spend them on the hard spots.',
    'Cameras sweep red cones: being seen feeds the ALARM meter.',
    'Guards: yellow cone calm, orange wary, red chasing.',
    '   A guard at full suspicion chases; touch him and you lose a life.',
    'Lift every gem to open the green EXIT door, then get out.',
    'Alarm at 100%: LOCKDOWN — a life lost, back to the door.',
    'P / Esc pause · R restart room · M mute · H close this panel.',
  ];
  lines.forEach((line, i) => ctx.fillText(line, 370, 254 + i * 24));
}

/** The room itself, with HUD — every screen draws through here. */
export function drawWorld(ctx, world, screen, totalScore, bestScore) {
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);
  ctx.fillStyle = '#0b0f1e';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  drawFloor(ctx, world);
  drawExit(ctx, world);
  drawCoins(ctx, world);
  drawGems(ctx, world);
  drawCameras(ctx, world);
  drawGuards(ctx, world);
  drawPlayer(ctx, world);
  drawWalls(ctx, world);
  drawHud(ctx, world, screen, totalScore, bestScore);
  drawBanner(ctx, world);
  drawVignette(ctx, world);
}
