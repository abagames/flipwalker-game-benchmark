const TILE = 32;
const COLS = 25;
const ROWS = 15;
const WALK_SPEED = 120;
const GRAVITY = 400;
const PLAYER_SIZE = 24;
const FLIP_COOLDOWN = 0.05;

const level = [
  ".........................",
  ".........................",
  ".........................",
  ".........................",
  ".........................",
  "...##################....",
  "...#................#....",
  "...#................#....",
  "...#................#....",
  "...##################....",
  ".......................#.",
  ".......................#.",
  ".......................#.",
  "S......................#.",
  "####^^^^^^^^^^^^^^^###D#."
];

const start = { x: 0.5 * TILE, y: 14 * TILE - PLAYER_SIZE };
const keyEntity = { x: 12 * TILE + TILE / 2, y: 10 * TILE + 12, r: 8 };
const door = { x: 22 * TILE, y: 14 * TILE - 8, w: TILE, h: 40 };

function isSolid(col, row) {
  if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return false;
  const ch = level[row][col];
  return ch === '#' || ch === 'D';
}

function isSpike(col, row) {
  if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return false;
  return level[row][col] === '^';
}

function getTile(x, y) {
  return { c: Math.floor(x / TILE), r: Math.floor(y / TILE) };
}

function overlapsSpike(px, py) {
  const margin = 4;
  const left = px + margin;
  const right = px + PLAYER_SIZE - margin;
  const top = py + margin;
  const bottom = py + PLAYER_SIZE - margin;
  const tl = getTile(left, top);
  const tr = getTile(right, top);
  const bl = getTile(left, bottom);
  const br = getTile(right, bottom);
  return isSpike(tl.c, tl.r) || isSpike(tr.c, tr.r) || isSpike(bl.c, bl.r) || isSpike(br.c, br.r);
}

function resolveHorizontal(px, py, vx, dt) {
  const dx = vx * dt;
  const nextX = px + dx;
  const margin = 4;
  const ySamples = [py + margin, py + PLAYER_SIZE / 2, py + PLAYER_SIZE - margin];
  const dir = Math.sign(vx);
  const edgeX = dir > 0 ? nextX + PLAYER_SIZE - 0.001 : nextX + 0.001;

  for (const y of ySamples) {
    const tile = getTile(edgeX, y);
    if (isSolid(tile.c, tile.r)) {
      const col = Math.floor(edgeX / TILE);
      const wallX = dir > 0 ? col * TILE : (col + 1) * TILE;
      return {
        px: dir > 0 ? wallX - PLAYER_SIZE - 0.001 : wallX + 0.001,
        vx: -vx
      };
    }
  }
  return { px: nextX, vx };
}

function resolveVertical(px, py, vy, dt) {
  const dy = vy * dt;
  const nextY = py + dy;
  const margin = 4;
  const xSamples = [px + margin, px + PLAYER_SIZE / 2, px + PLAYER_SIZE - margin];
  const dir = Math.sign(vy);
  const edgeY = dir > 0 ? nextY + PLAYER_SIZE - 0.001 : nextY + 0.001;

  for (const x of xSamples) {
    const tile = getTile(x, edgeY);
    if (isSolid(tile.c, tile.r)) {
      const row = Math.floor(edgeY / TILE);
      const floorY = dir > 0 ? row * TILE : (row + 1) * TILE;
      return {
        py: dir > 0 ? floorY - PLAYER_SIZE - 0.001 : floorY + 0.001,
        vy: 0,
        grounded: true
      };
    }
  }
  return { py: nextY, vy, grounded: false };
}

function rectsOverlap(x1, y1, w1, h1, x2, y2, w2, h2) {
  return x1 < x2 + w2 && x1 + w1 > x2 && y1 < y2 + h2 && y1 + h1 > y2;
}

function simulate(flipTimes, dt = 1 / 120, maxTime = 20) {
  const s = {
    px: start.x,
    py: start.y,
    vx: WALK_SPEED,
    vy: 0,
    gravity: 1,
    grounded: false,
    hasKey: false,
    dead: false,
    won: false,
    time: 0,
    flipCooldown: 0,
    flips: [...flipTimes],
    trace: []
  };

  const totalSteps = Math.ceil(maxTime / dt);
  for (let i = 0; i < totalSteps; i++) {
    if (s.dead || s.won) break;

    s.time += dt;
    if (s.flipCooldown > 0) s.flipCooldown -= dt;

    if (s.flips.length > 0 && s.time >= s.flips[0]) {
      s.flips.shift();
      if (s.flipCooldown <= 0) {
        s.gravity *= -1;
        s.vy = 0;
        s.flipCooldown = FLIP_COOLDOWN;
      }
    }

    s.vy += s.gravity * GRAVITY * dt;

    const horiz = resolveHorizontal(s.px, s.py, s.vx, dt);
    s.px = horiz.px;
    s.vx = horiz.vx;

    const vert = resolveVertical(s.px, s.py, s.vy, dt);
    s.py = vert.py;
    s.vy = vert.vy;
    s.grounded = vert.grounded;

    if (overlapsSpike(s.px, s.py)) s.dead = true;
    if (s.py > ROWS * TILE + 100) s.dead = true;
    if (!s.hasKey) {
      const dx = s.px + PLAYER_SIZE / 2 - keyEntity.x;
      const dy = s.py + PLAYER_SIZE / 2 - keyEntity.y;
      if (dx * dx + dy * dy < (keyEntity.r + PLAYER_SIZE / 2) ** 2) s.hasKey = true;
    }
    if (s.hasKey && rectsOverlap(s.px, s.py, PLAYER_SIZE, PLAYER_SIZE, door.x, door.y, door.w, door.h)) s.won = true;
    if (i % 10 === 0) {
      s.trace.push({ t: s.time, x: s.px, y: s.py, vx: s.vx, vy: s.vy, g: s.gravity, key: s.hasKey, grounded: s.grounded });
    }
  }

  return s;
}

function formatTrace(trace) {
  return trace.map(p =>
    `t=${p.t.toFixed(3)} x=${p.x.toFixed(1)} y=${p.y.toFixed(1)} vx=${p.vx.toFixed(0)} vy=${p.vy.toFixed(1)} g=${p.grounded ? 'Y' : 'N'}`
  ).join('\n');
}

function findSolution() {
  const dt = 1 / 120;
  const step = 0.02;
  let best = null;

  for (let f1 = 1.0; f1 <= 1.3; f1 += step) {
    for (let f2 = 4.2; f2 <= 4.7; f2 += step) {
      const result = simulate([f1, f2], dt, 10);
      if (result.won) {
        if (!best || result.time < best.time) {
          best = { f1, f2, result };
        }
      }
    }
  }

  return best;
}

function measureWindow(f1) {
  let minF2 = Infinity;
  let maxF2 = -Infinity;
  for (let f2 = 3.5; f2 <= 5.5; f2 += 0.01) {
    const r = simulate([f1, f2], 1 / 120, 10);
    if (r.won) {
      minF2 = Math.min(minF2, f2);
      maxF2 = Math.max(maxF2, f2);
    }
  }
  return { minF2, maxF2 };
}

const best = findSolution();
if (best) {
  console.log('\nSolution found!');
  console.log(`Flip 1 at t=${best.f1.toFixed(3)}s`);
  console.log(`Flip 2 at t=${best.f2.toFixed(3)}s`);
  console.log(`Completed at t=${best.result.time.toFixed(3)}s`);

  const window = measureWindow(best.f1);
  console.log(`\nSecond-flip timing window: ${window.minF2.toFixed(3)}s to ${window.maxF2.toFixed(3)}s (width ${(window.maxF2 - window.minF2).toFixed(3)}s)`);

  const verify = simulate([best.f1, best.f2], 1 / 120, 10);
  console.log(`\nVerification: won=${verify.won}, dead=${verify.dead}, hasKey=${verify.hasKey}, time=${verify.time.toFixed(3)}s`);

  console.log('\nTrace:');
  console.log(formatTrace(best.result.trace));
} else {
  console.log('\nNo solution found with 2 flips in the searched range.');
}
