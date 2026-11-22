// main.js — one clear job: run the game — the loop, the screens, the score
// across rooms, and the debug handle the play-tests drive. It owns no rules
// (world.js) and draws nothing itself (render.js).

import { LEVELS, TUNING } from './config.js';
import { createWorld, updateWorld } from './world.js';
import {
  drawTitle,
  drawPaused,
  drawLevelDone,
  drawGameOver,
  drawWin,
  drawHelp,
  drawWorld,
} from './render.js';
import { createInput } from './input.js';
import * as sfx from './audio.js';
import { applyShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const input = createInput(canvas);

const BEST_KEY = 'midnight-vault-best';
let bestScore = 0;
try {
  bestScore = Number(window.localStorage.getItem(BEST_KEY) || 0) || 0;
} catch {
  bestScore = 0;
}

const game = {
  world: null,
  screen: 'title', // title | playing | paused | leveldone | gameover | win
  score: 0,
  bonus: 0,
  showHelp: false,
  shot: null,
};

function saveBest() {
  if (game.score > bestScore) {
    bestScore = game.score;
    try {
      window.localStorage.setItem(BEST_KEY, String(bestScore));
    } catch {
      // A locked-down browser still plays; it just keeps no best score.
    }
  }
}

function startLevel(levelIndex, carry) {
  game.world = createWorld(levelIndex, carry);
  game.screen = 'playing';
  game.showHelp = false;
}

function startGame() {
  game.score = 0;
  game.bonus = 0;
  startLevel(0, { score: 0, lives: TUNING.lives });
}

function handleEvents(events) {
  for (const e of events) {
    if (e.type === 'footstep') sfx.playFootstep(e.sneaking);
    else if (e.type === 'coin') sfx.playCoin();
    else if (e.type === 'gem') sfx.playGem();
    else if (e.type === 'door') sfx.playDoor();
    else if (e.type === 'suspicious') sfx.playSuspicious();
    else if (e.type === 'alert') sfx.playAlert();
    else if (e.type === 'camera') sfx.playCameraBeep();
    else if (e.type === 'caught') sfx.playCaught();
    else if (e.type === 'lockdown') sfx.playCaught();
    else if (e.type === 'leveldone') {
      game.bonus = e.bonus;
      game.score = game.world.score;
      saveBest();
      if (game.world.levelIndex + 1 < LEVELS.length) {
        sfx.playLevelClear();
        game.screen = 'leveldone';
      } else {
        sfx.playWin();
        game.screen = 'win';
      }
    }
  }
  if (game.world) game.score = game.world.score;
}

function step(dt) {
  const w = game.world;
  if (!w) return;

  if (input.wasPressed('mute')) {
    sfx.setMuted(!sfx.isMuted());
  }
  if (input.wasPressed('hint') && game.screen === 'playing') {
    game.showHelp = !game.showHelp;
  }

  if (game.screen === 'title') {
    if (input.wasPressed('confirm') || input.clickTarget) {
      input.clickTarget = null;
      sfx.unlockAudio();
      startGame();
    }
    return;
  }

  if (game.screen === 'playing') {
    if (input.wasPressed('pause')) {
      game.screen = 'paused';
      return;
    }
    if (input.wasPressed('restart')) {
      // R restarts the room at its spawn, keeping score and lives.
      startLevel(w.levelIndex, { score: game.score, lives: w.lives });
      return;
    }
    if (game.showHelp) return;
    const events = updateWorld(w, input, dt);
    handleEvents(events);
    if (w.gameOver) {
      saveBest();
      game.screen = 'gameover';
    }
    return;
  }

  if (game.screen === 'paused') {
    if (input.wasPressed('pause')) game.screen = 'playing';
    if (input.wasPressed('restart')) {
      startLevel(w.levelIndex, { score: game.score, lives: w.lives });
    }
    return;
  }

  if (game.screen === 'leveldone') {
    if (input.wasPressed('confirm')) {
      startLevel(w.levelIndex + 1, { score: game.score, lives: w.lives });
    }
    return;
  }

  if (game.screen === 'gameover' || game.screen === 'win') {
    if (input.wasPressed('restart') || input.wasPressed('confirm')) {
      startGame();
    }
  }
}

function render() {
  const w = game.world;
  if (!w) return;
  if (game.screen === 'title') drawTitle(ctx, w, bestScore);
  else if (game.screen === 'paused') drawPaused(ctx, w, game.score, bestScore);
  else if (game.screen === 'leveldone') drawLevelDone(ctx, w, game.score, bestScore, game.bonus);
  else if (game.screen === 'gameover') drawGameOver(ctx, w, game.score, bestScore);
  else if (game.screen === 'win') drawWin(ctx, w, game.score, bestScore);
  else drawWorld(ctx, w, 'playing', game.score, bestScore);
  if (game.showHelp && game.screen === 'playing') drawHelp(ctx);
}

// --- boot -----------------------------------------------------------------

game.world = createWorld(0, { score: 0, lives: TUNING.lives });
const params = new URLSearchParams(window.location.search);
game.shot = params.get('shot');
if (game.shot) applyShot(game, game.shot);

let last = performance.now();
function frame(now) {
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;
  if (!game.shot) step(dt);
  else if (game.screen === 'playing' && game.shot === 'play') {
    // The cover shot plays for real, one frozen beat at a time: advance the
    // world a little so cones and gems read alive, but never move the thief.
    game.world.time += dt;
  }
  render();
  input.endFrame();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// --- debug handle: the play-tests drive the game through this -------------

/** A plain snapshot of the live state, for tests and screenshots. */
function snapshot() {
  const w = game.world;
  return {
    screen: game.screen,
    level: w.levelIndex,
    levelName: w.level.name,
    score: game.score,
    lives: w.lives,
    alarm: Math.round(w.alarm * 10) / 10,
    gemsTaken: w.gemsTaken,
    gemsTotal: w.gems.length,
    coinsLeft: w.coinsLeft,
    exitOpen: w.exitOpen,
    levelDone: w.levelDone,
    gameOver: w.gameOver,
    player: { x: Math.round(w.player.x), y: Math.round(w.player.y), sneaking: w.player.sneaking },
    guards: w.guards.map((g) => ({
      x: Math.round(g.x),
      y: Math.round(g.y),
      state: g.state,
      suspicion: Math.round(g.suspicion * 100) / 100,
    })),
    cameras: w.cameras.map((c) => ({ seesPlayer: c.seesPlayer })),
    muted: sfx.isMuted(),
    bestScore,
  };
}

window.__heist = {
  snapshot,
  start: () => {
    sfx.unlockAudio();
    startGame();
  },
  /** Put the thief somewhere, for tests (x, y in canvas pixels). */
  teleport: (x, y) => {
    game.world.player.x = x;
    game.world.player.y = y;
    game.world.moveTarget = null;
  },
  /** Freeze a guard where he stands, for tests. */
  freezeGuard: (i, x, y, angle) => {
    const g = game.world.guards[i];
    g.x = x;
    g.y = y;
    g.angle = angle;
    g.waypoints = [{ x, y }];
    g.wpIndex = 0;
    g.state = 'patrol';
  },
  setAlarm: (v) => {
    game.world.alarm = v;
  },
  screen: () => game.screen,
};
