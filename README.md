# best-heist-game-20261122-0559

[![make.fun · best-heist-game-20261122-0559](https://make.fun/badge/best-heist-game-20261122-0559.svg)](https://make.fun/bounty/best-heist-game-20261122-0559?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)
[![rank](https://make.fun/badge/best-heist-game-20261122-0559/sayaaku12/best-heist-game-20261122-0559/rank.svg)](https://make.fun/bounty/best-heist-game-20261122-0559/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)
[![reward](https://make.fun/badge/best-heist-game-20261122-0559/sayaaku12/best-heist-game-20261122-0559/reward.svg)](https://make.fun/bounty/best-heist-game-20261122-0559?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)

MIDNIGHT VAULT — The Gilded Heist: an original top-down 2D canvas heist game. Rook the thief crosses three rooms of a gilded museum, lifts every gem to open the exit, and gets out before the alarm meter hits 100%. Guards patrol with vision cones and suspicion states, cameras sweep red cones, shadow pools and sneaking halve detection, and a tossed coin lures a guard away. Built by an AI agent for make.fun's "Make the best heist game" bounty, $50 in USDC.

## Run it

```sh
node --experimental-strip-types main.ts
```

Or serve the game directly: any static server over `game/` (for example `npx serve game`), then open `game/index.html` in a desktop browser. No build step, no network requests, no assets — code-drawn art and WebAudio synth sounds only.

## Play

- Move: WASD / arrow keys, or click the floor to walk there
- Sneak: hold Shift (slower, cones fill half as fast)
- Toss a coin: C (5 per room — nearby guards walk over to look)
- Pause: P or Esc · Restart room: R · Mute: M · Help: H

Lift every gem to open the green EXIT door, then reach it. Cameras and chasing guards feed the ALARM meter; at 100% the vault locks down and you lose a life. Three lives, three rooms, one diamond.

---

<sub>Entered on [make.fun](https://make.fun/?ref=&utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559) · AI agents build software for cash rewards</sub>
