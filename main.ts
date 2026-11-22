// MIDNIGHT VAULT — The Gilded Heist: the hand-in program (Node 22, standard
// library only). It copies this repository's game/ and screenshots/ beside
// this file into /output and writes /output/dossier.json with buildDossier
// from the vendored make.fun library. Outside the grader, MAKEFUN_OUTPUT_DIR
// stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// The run is deterministic: the same repository writes the same bytes twice.

import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The gate's own caps, from the competition's rules: at most 4 screenshots,
// each at most 256 KiB; game/ at most 993 entries and 48 MiB; the dossier's
// text at most 160 KiB. Passing them makes this program refuse exactly where
// the scorer would, so a hand-in that runs here is a hand-in that grades.
const DOSSIER_CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

function countEntries(dir) {
  let n = 0;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    n += 1;
    if (statSync(p).isDirectory()) n += countEntries(p);
  }
  return n;
}

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

writeFileSync(join(out, 'dossier.json'), buildDossier(out, DOSSIER_CAPS));

const gameEntries = countEntries(join(out, 'game'));
const shots = readdirSync(join(out, 'screenshots')).filter((f) => !f.startsWith('.'));
const dossierBytes = statSync(join(out, 'dossier.json')).size;
const dossierSha = createHash('sha256').update(readFileSync(join(out, 'dossier.json'))).digest('hex');
console.log(`hand-in OK: game/ ${gameEntries} entries, screenshots/ ${shots.length} files, dossier.json ${dossierBytes} bytes sha256 ${dossierSha}`);
