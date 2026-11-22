// MIDNIGHT VAULT — The Gilded Heist
// config.js — one clear job: the three rooms (levels) and the tuning numbers.
// Every coordinate lives in the 1280x720 play canvas. The HUD bar sits at the
// top (y 0..64); the walkable floor is x 24..1256, y 76..696. Walls, pillars and
// display cases are axis-aligned rectangles the thief, the guards and every
// line of sight must respect. Patrol routes were checked by hand to stay clear
// of every wall and case in their room.

export const VIEW_W = 1280;
export const VIEW_H = 720;
export const FLOOR = { x: 24, y: 76, w: 1232, h: 620 };

export const TUNING = {
  playerWalkSpeed: 168,
  playerSneakSpeed: 96,
  guardPatrolSpeed: 58,
  guardInvestigateSpeed: 92,
  guardChaseSpeed: 138,
  guardVisionRange: 175,
  guardVisionHalfAngle: 0.61, // ~35 degrees each side
  cameraRange: 215,
  cameraHalfAngle: 0.46, // ~26 degrees each side
  suspicionRiseBase: 1.5, // per second, scaled by closeness
  suspicionRiseCloseBonus: 0.9, // extra per second at point blank
  suspicionDecay: 0.38, // per second while unseen
  suspicionDecayHidden: 0.7, // per second while unseen and in shadow
  investigateAt: 0.45, // suspicion that sends a guard to look
  chaseAt: 0.95, // suspicion that sends a guard after the thief
  sneakDetection: 0.55, // multiplier while sneaking (Shift)
  shadowDetection: 0.5, // multiplier while standing in a shadow pool
  runDetection: 1.55, // multiplier while walking at full speed
  alarmCameraRate: 55, // alarm points per second while a camera sees you
  alarmChaseRate: 26, // alarm points per second while a guard chases you
  alarmDecay: 4.5, // alarm points per second while nobody sees you
  alarmLockdownAt: 100,
  alarmAfterLockdown: 35,
  catchRadius: 27,
  gemRadius: 15,
  gemScore: 150,
  coinScore: 0,
  coinsPerLevel: 5,
  coinThrowDistance: 150,
  coinLureRadius: 230,
  coinCooldown: 2.5,
  levelClearScore: 300,
  timeBonusPerSecond: 5,
  timeBonusWindow: 120,
  caughtScorePenalty: 100,
  lives: 3,
};

export const LEVELS = [
  {
    name: 'The Marble Gallery',
    subtitle: 'Lift the sapphires. Mind the patrols.',
    spawn: { x: 90, y: 620 },
    exit: { x: 1214, y: 330, w: 30, h: 76 },
    walls: [
      { x: 560, y: 300, w: 160, h: 120 }, // central display case
      { x: 300, y: 200, w: 60, h: 60 }, // pillars
      { x: 920, y: 200, w: 60, h: 60 },
      { x: 300, y: 480, w: 60, h: 60 },
      { x: 920, y: 480, w: 60, h: 60 },
    ],
    shadows: [
      { x: 120, y: 110, w: 190, h: 96 },
      { x: 970, y: 560, w: 190, h: 96 },
      { x: 560, y: 570, w: 160, h: 84 },
    ],
    gems: [
      { x: 180, y: 360, kind: 'sapphire' },
      { x: 1100, y: 360, kind: 'sapphire' },
      { x: 640, y: 628, kind: 'sapphire' },
    ],
    guards: [
      { waypoints: [{ x: 200, y: 150 }, { x: 1080, y: 150 }], speed: 58 },
      { waypoints: [{ x: 1080, y: 560 }, { x: 200, y: 560 }], speed: 58 },
    ],
    cameras: [{ x: 640, y: 88, baseAngle: Math.PI / 2, sweep: 0.9, speed: 0.55 }],
  },
  {
    name: 'The Vault Corridor',
    subtitle: 'Three rubies behind two sweeps. Spend coins wisely.',
    spawn: { x: 90, y: 620 },
    exit: { x: 1214, y: 330, w: 30, h: 76 },
    walls: [
      { x: 420, y: 76, w: 40, h: 300 }, // north vault wall (gap below)
      { x: 820, y: 420, w: 40, h: 276 }, // south vault wall (gap above)
      { x: 420, y: 420, w: 400, h: 40 }, // mid wall
      { x: 150, y: 300, w: 90, h: 90 }, // west strongbox
      { x: 1040, y: 300, w: 90, h: 90 }, // east strongbox
    ],
    shadows: [
      { x: 90, y: 480, w: 180, h: 96 },
      { x: 900, y: 110, w: 200, h: 96 },
      { x: 560, y: 300, w: 150, h: 84 },
    ],
    gems: [
      { x: 1150, y: 620, kind: 'ruby' },
      { x: 1150, y: 140, kind: 'ruby' },
      { x: 520, y: 620, kind: 'ruby' },
    ],
    guards: [
      { waypoints: [{ x: 150, y: 150 }, { x: 1100, y: 150 }], speed: 62 },
      { waypoints: [{ x: 150, y: 610 }, { x: 1100, y: 610 }], speed: 62 },
      { waypoints: [{ x: 300, y: 200 }, { x: 300, y: 480 }], speed: 58 },
    ],
    cameras: [
      { x: 640, y: 88, baseAngle: Math.PI / 2, sweep: 0.8, speed: 0.6 },
      { x: 36, y: 360, baseAngle: 0, sweep: 0.9, speed: 0.5 },
    ],
  },
  {
    name: 'The Diamond Chamber',
    subtitle: 'One diamond. Three lenses. No second chances.',
    spawn: { x: 90, y: 620 },
    exit: { x: 1214, y: 330, w: 30, h: 76 },
    walls: [
      { x: 540, y: 280, w: 200, h: 160 }, // the vault itself
      { x: 300, y: 200, w: 60, h: 60 }, // pillars
      { x: 920, y: 200, w: 60, h: 60 },
      { x: 300, y: 480, w: 60, h: 60 },
      { x: 920, y: 480, w: 60, h: 60 },
      { x: 150, y: 300, w: 80, h: 120 }, // side cabinets
      { x: 1050, y: 300, w: 80, h: 120 },
    ],
    shadows: [
      { x: 120, y: 110, w: 190, h: 96 },
      { x: 970, y: 560, w: 190, h: 96 },
      { x: 90, y: 330, w: 130, h: 110 },
      { x: 1060, y: 330, w: 130, h: 110 },
    ],
    gems: [
      { x: 640, y: 258, kind: 'diamond' },
      { x: 180, y: 360, kind: 'diamond' },
      { x: 1100, y: 360, kind: 'diamond' },
    ],
    guards: [
      { waypoints: [{ x: 200, y: 140 }, { x: 1080, y: 140 }], speed: 66 },
      { waypoints: [{ x: 1080, y: 580 }, { x: 200, y: 580 }], speed: 66 },
      {
        waypoints: [
          { x: 480, y: 240 },
          { x: 800, y: 240 },
          { x: 800, y: 520 },
          { x: 480, y: 520 },
        ],
        speed: 62,
      },
    ],
    cameras: [
      { x: 640, y: 88, baseAngle: Math.PI / 2, sweep: 0.85, speed: 0.65 },
      { x: 36, y: 360, baseAngle: 0, sweep: 0.8, speed: 0.5 },
      { x: 1244, y: 360, baseAngle: Math.PI, sweep: 0.8, speed: 0.5 },
    ],
  },
];
