// shots.js — one clear job: stage the game for its screenshots.
// ?shot=title | play | alert | win puts the room in a fixed, readable state
// so every screenshot is a real render of the game's own code, not a mock.
// Nothing here runs during normal play (no ?shot= in the URL).

/**
 * Stage a screenshot state. `game` is the object main.js owns:
 * { world, screen, score, bestScore, bonus } — mutated in place.
 * Returns the screen the shot should render, or null for normal play.
 */
export function applyShot(game, shot) {
  const w = game.world;
  if (shot === 'title') {
    game.screen = 'title';
    return 'title';
  }
  if (shot === 'play') {
    // Mid-heist, cover frame: the thief crossing the gallery, both guards
    // mid-patrol with cones out, the camera sweeping, gems on the floor,
    // the exit still locked, the alarm meter ticking.
    game.screen = 'playing';
    w.player.x = 640;
    w.player.y = 470;
    w.player.facing = -Math.PI / 2;
    w.guards[0].x = 420;
    w.guards[0].y = 150;
    w.guards[0].angle = 0;
    w.guards[0].wpIndex = 1;
    w.guards[1].x = 860;
    w.guards[1].y = 560;
    w.guards[1].angle = Math.PI;
    w.guards[1].wpIndex = 0;
    w.cameras[0].angle = w.cameras[0].baseAngle + 0.45;
    w.alarm = 18;
    w.time = 42;
    game.score = 300;
    w.score = 300;
    return 'playing';
  }
  if (shot === 'alert') {
    // The caught moment: a guard at full suspicion, red cone on the thief,
    // SPOTTED banner, alarm high, camera watching too.
    game.screen = 'playing';
    w.player.x = 640;
    w.player.y = 210;
    w.player.facing = Math.PI / 2;
    const g = w.guards[0];
    g.x = 640;
    g.y = 150;
    g.angle = Math.PI / 2;
    g.state = 'chase';
    g.suspicion = 0.98;
    g.wasChasing = true;
    g.wasSuspicious = true;
    w.guards[1].x = 300;
    w.guards[1].y = 560;
    w.guards[1].angle = 0;
    w.guards[1].suspicion = 0.55;
    w.guards[1].state = 'investigate';
    w.cameras[0].angle = w.cameras[0].baseAngle - 0.3;
    w.alarm = 64;
    w.time = 87;
    w.banner = { text: 'SPOTTED!', sub: 'Break the line of sight — now', color: '#ff3b30' };
    w.bannerTimer = 99;
    game.score = 450;
    w.score = 450;
    return 'playing';
  }
  if (shot === 'win') {
    game.screen = 'win';
    game.score = 2450;
    w.score = 2450;
    w.gemsTaken = w.gems.length;
    for (const gem of w.gems) gem.taken = true;
    w.exitOpen = true;
    w.time = 214;
    w.alarm = 12;
    return 'win';
  }
  return null;
}
