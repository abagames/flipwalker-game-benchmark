const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const msgEl = document.getElementById('message');

const TILE = 32;
const COLS = 25;
const ROWS = 15;
const WIDTH = COLS * TILE;
const HEIGHT = ROWS * TILE;

const WALK_SPEED = 120;
const GRAVITY = 400;
const PLAYER_SIZE = 24;
const FLIP_COOLDOWN = 0.05;

const level = [
  ".........................", // 0
  ".........................", // 1
  ".........................", // 2
  ".........................", // 3
  ".........................", // 4
  "...##################....", // 5
  "...#................#....", // 6
  "...#................#....", // 7
  "...#................#....", // 8
  "...##################....", // 9
  ".......................#.", // 10
  ".......................#.", // 11
  ".......................#.", // 12
  "S......................#.", // 13
  "####^^^^^^^^^^^^^^^###D#."  // 14
];

const start = { x: 0.5 * TILE, y: 14 * TILE - PLAYER_SIZE };
const keyEntity = { x: 12 * TILE + TILE / 2, y: 10 * TILE + 12, r: 8, taken: false };
const door = { x: 22 * TILE, y: 14 * TILE - 8, w: TILE, h: 40 };

let state;
const solutionFlips = [1.000, 4.200];
let simFlips = [];

function resetState() {
  simFlips = [];
  state = {
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
    trail: []
  };
  keyEntity.taken = false;
  msgEl.textContent = '';
}

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

function update(dt) {
  if (state.dead || state.won) return;

  state.time += dt;
  if (state.flipCooldown > 0) state.flipCooldown -= dt;

  if (simFlips.length > 0 && state.time >= simFlips[0]) {
    flipGravity();
    simFlips.shift();
  }

  state.vy += state.gravity * GRAVITY * dt;

  const horiz = resolveHorizontal(state.px, state.py, state.vx, dt);
  state.px = horiz.px;
  state.vx = horiz.vx;

  const vert = resolveVertical(state.px, state.py, state.vy, dt);
  state.py = vert.py;
  state.vy = vert.vy;
  state.grounded = vert.grounded;

  if (overlapsSpike(state.px, state.py)) {
    die();
  }

  if (!state.hasKey) {
    const dx = state.px + PLAYER_SIZE / 2 - keyEntity.x;
    const dy = state.py + PLAYER_SIZE / 2 - keyEntity.y;
    if (dx * dx + dy * dy < (keyEntity.r + PLAYER_SIZE / 2) ** 2) {
      state.hasKey = true;
      keyEntity.taken = true;
    }
  }

  if (state.hasKey && rectsOverlap(state.px, state.py, PLAYER_SIZE, PLAYER_SIZE, door.x, door.y, door.w, door.h)) {
    win();
  }

  if (state.py > HEIGHT + 100) die();
}

function rectsOverlap(x1, y1, w1, h1, x2, y2, w2, h2) {
  return x1 < x2 + w2 && x1 + w1 > x2 && y1 < y2 + h2 && y1 + h1 > y2;
}

function die() {
  state.dead = true;
  msgEl.textContent = 'You died! Press R to retry.';
}

function win() {
  state.won = true;
  msgEl.textContent = 'Level complete!';
}

function flipGravity() {
  if (state.dead || state.won || state.flipCooldown > 0) return;
  state.gravity *= -1;
  state.vy = 0;
  state.flipCooldown = FLIP_COOLDOWN;
}

function draw() {
  ctx.fillStyle = '#16213e';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const ch = level[r][c];
      const x = c * TILE;
      const y = r * TILE;
      if (ch === '#') {
        ctx.fillStyle = '#0f3460';
        ctx.fillRect(x, y, TILE, TILE);
        ctx.strokeStyle = '#1a4a8a';
        ctx.strokeRect(x + 2, y + 2, TILE - 4, TILE - 4);
      } else if (ch === '^') {
        ctx.fillStyle = '#e94560';
        ctx.beginPath();
        ctx.moveTo(x + 4, y + TILE - 4);
        ctx.lineTo(x + TILE / 2, y + 4);
        ctx.lineTo(x + TILE - 4, y + TILE - 4);
        ctx.closePath();
        ctx.fill();
      }
    }
  }

  ctx.fillStyle = '#4fd';
  ctx.fillRect(door.x + 4, door.y + 2, door.w - 8, door.h - 2);
  ctx.fillStyle = '#0f3460';
  ctx.fillRect(door.x + door.w / 2 - 2, door.y + 14, 4, 6);

  if (!keyEntity.taken) {
    ctx.fillStyle = '#ffd700';
    ctx.beginPath();
    ctx.arc(keyEntity.x, keyEntity.y, keyEntity.r, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = state.dead ? '#e94560' : '#fff';
  ctx.fillRect(state.px, state.py, PLAYER_SIZE, PLAYER_SIZE);
  ctx.fillStyle = '#1a1a2e';
  const eyeY = state.gravity > 0 ? state.py + 6 : state.py + PLAYER_SIZE - 10;
  ctx.fillRect(state.px + (state.vx > 0 ? 14 : 4), eyeY, 6, 4);

  if (state.hasKey) {
    ctx.fillStyle = '#ffd700';
    ctx.beginPath();
    ctx.arc(state.px + PLAYER_SIZE / 2, state.py - 8, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  if (state.won) {
    ctx.fillStyle = 'rgba(79, 255, 136, 0.25)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#4ff88';
    ctx.font = 'bold 48px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Level Complete!', canvas.width / 2, canvas.height / 2);
  }
}

let lastTime = 0;
let rafId;

function loop(ts) {
  const dt = Math.min((ts - lastTime) / 1000, 0.05);
  lastTime = ts;
  update(dt);
  draw();
  rafId = requestAnimationFrame(loop);
}

function startGame() {
  resetState();
  cancelAnimationFrame(rafId);
  lastTime = performance.now();
  rafId = requestAnimationFrame(loop);
}

function startSimulation() {
  resetState();
  simFlips = [...solutionFlips];
  msgEl.textContent = 'Simulating solution...';
  cancelAnimationFrame(rafId);
  lastTime = performance.now();
  rafId = requestAnimationFrame(loop);
}

window.addEventListener('keydown', (e) => {
  if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
    e.preventDefault();
    flipGravity();
  }
  if (e.code === 'KeyR') {
    startGame();
  }
});

canvas.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  flipGravity();
});

document.getElementById('reset').addEventListener('click', startGame);
document.getElementById('simulate').addEventListener('click', startSimulation);

startGame();
