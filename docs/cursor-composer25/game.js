import {
  DOOR,
  KEY,
  PLATFORMS,
  PLAYER,
  SOLUTION_FLIPS,
  SPIKES,
  TILE,
  WORLD,
} from './level.js';
import { createState, flipGravity, step } from './physics.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const keyHud = document.getElementById('key-status');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayText = document.getElementById('overlay-text');

canvas.width = WORLD.w * TILE;
canvas.height = WORLD.h * TILE;

let state = createState();
let paused = true;
let started = false;
let demo = false;
let demoFlips = [];
let lastTs = 0;

function reset(waiting = true) {
  state = createState();
  demo = false;
  demoFlips = [];
  started = !waiting;
  paused = waiting;
  if (waiting) {
    showOverlay(
      'Ready',
      'Press Space to start. Flip before the spike gap — about 0.7s after you begin.',
    );
  } else {
    overlay.classList.remove('show');
  }
  updateHud();
}

function beginRun() {
  started = true;
  paused = false;
  overlay.classList.remove('show');
}

function updateHud() {
  keyHud.textContent = state.hasKey ? 'Key: collected' : 'Key: not yet';
  keyHud.classList.toggle('on', state.hasKey);
}

function showOverlay(title, text) {
  overlayTitle.textContent = title;
  overlayText.textContent = text;
  overlay.classList.add('show');
}

function onFlip() {
  if (paused || state.dead || state.won) return;
  if (flipGravity(state)) {
    flashFlip();
  }
}

function flashFlip() {
  state.flipFlash = 0.12;
}

function startDemo() {
  reset(false);
  demo = true;
  demoFlips = [...SOLUTION_FLIPS];
}

function handleInput() {
  if (!started) {
    beginRun();
    return;
  }
  onFlip();
}

document.addEventListener('keydown', (e) => {
  if (e.code === 'Space') {
    e.preventDefault();
    handleInput();
  }
  if (e.code === 'KeyR') reset();
  if (e.code === 'KeyD') startDemo();
});

canvas.addEventListener('pointerdown', () => handleInput());

function drawRoundedRect(x, y, w, h, r, fill, stroke) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

function drawWorld() {
  const g = ctx.createLinearGradient(0, 0, 0, canvas.height);
  g.addColorStop(0, '#1a2744');
  g.addColorStop(1, '#0d1424');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (const p of PLATFORMS) {
    drawRoundedRect(
      p.x * TILE,
      p.y * TILE,
      p.w * TILE,
      p.h * TILE,
      6,
      '#2d3f66',
      '#4f6aa3',
    );
  }

  for (const sp of SPIKES) {
    const sx = sp.x * TILE;
    const sy = sp.y * TILE;
    ctx.fillStyle = '#c94b63';
    for (let i = 0; i < sp.w * TILE; i += 14) {
      ctx.beginPath();
      ctx.moveTo(sx + i, sy + sp.h * TILE);
      ctx.lineTo(sx + i + 7, sy);
      ctx.lineTo(sx + i + 14, sy + sp.h * TILE);
      ctx.closePath();
      ctx.fill();
    }
  }

  if (!state.hasKey) {
    const kx = KEY.x * TILE;
    const ky = KEY.y * TILE;
    const pulse = 0.85 + Math.sin(performance.now() / 220) * 0.15;
    ctx.save();
    ctx.translate(kx, ky);
    ctx.scale(pulse, pulse);
    ctx.fillStyle = '#ffd76a';
    ctx.beginPath();
    ctx.arc(0, 0, KEY.r * TILE, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fff2b8';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }

  const dx = DOOR.x * TILE;
  const dy = DOOR.y * TILE;
  const dw = DOOR.w * TILE;
  const dh = DOOR.h * TILE;
  ctx.fillStyle = state.hasKey ? '#5fd38d' : '#3a4f72';
  drawRoundedRect(dx, dy, dw, dh, 8, ctx.fillStyle, state.hasKey ? '#9ef0bc' : '#5a7099');
  ctx.fillStyle = '#0b1020';
  ctx.fillRect(dx + dw * 0.55, dy + dh * 0.22, dw * 0.18, dh * 0.22);
}

function drawPlayer() {
  const x = state.x * TILE;
  const y = state.y * TILE;
  const w = PLAYER.w * TILE;
  const h = PLAYER.h * TILE;

  if (state.flipFlash > 0) {
    state.flipFlash -= 1 / 60;
    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = '#8ec5ff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
  }

  const body = ctx.createLinearGradient(x, y, x, y + h);
  body.addColorStop(0, '#7ed0ff');
  body.addColorStop(1, '#3d8fd9');
  drawRoundedRect(x, y, w, h, 8, body, '#d8ecff');

  const eyeY = state.grav > 0 ? y + h * 0.28 : y + h * 0.55;
  ctx.fillStyle = '#0b1020';
  const look = state.dir > 0 ? 1 : -1;
  ctx.beginPath();
  ctx.arc(x + w * 0.65, eyeY, 3.5, 0, Math.PI * 2);
  ctx.arc(x + w * 0.35, eyeY, 3.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#0b1020';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x + w * 0.5, eyeY + 4 * look, 5, 0.2, Math.PI - 0.2);
  ctx.stroke();
}

function tickDemo(dt) {
  if (!demo || demoFlips.length === 0) return;
  if (demoFlips[0] <= state.time + 1e-6) {
    demoFlips.shift();
    if (flipGravity(state)) flashFlip();
  }
}

function frame(ts) {
  if (!lastTs) lastTs = ts;
  const dt = Math.min(0.033, (ts - lastTs) / 1000);
  lastTs = ts;

  if (!paused && !state.dead && !state.won) {
    tickDemo(dt);
    step(state, dt, false);
    updateHud();

    if (state.dead) {
      showOverlay('Ouch!', 'Press R to try again.');
    } else if (state.won) {
      showOverlay('Door unlocked!', demo ? 'Auto-solution complete. Press R to play.' : 'Nice flips. Press R to replay.');
    }
  }

  drawWorld();
  drawPlayer();
  requestAnimationFrame(frame);
}

reset(true);
requestAnimationFrame(frame);
