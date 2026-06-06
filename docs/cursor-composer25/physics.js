import { DOOR, KEY, PLAYER, PLATFORMS, SPAWN, SPIKES, WORLD } from './level.js';

export function createState() {
  return {
    x: SPAWN.x,
    y: SPAWN.y,
    vx: PLAYER.walk,
    vy: 0,
    dir: 1,
    grav: 1,
    grounded: false,
    hasKey: false,
    won: false,
    dead: false,
    flipLock: 0,
    time: 0,
  };
}

export function flipGravity(state) {
  if (state.dead || state.won || state.flipLock > 0) return false;
  state.grav *= -1;
  state.flipLock = PLAYER.flipCooldown;
  return true;
}

function aabbOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

function wallSolids() {
  return [
    ...PLATFORMS,
    { x: -0.15, y: 0, w: 0.15, h: WORLD.h },
    { x: WORLD.w, y: 0, w: 0.15, h: WORLD.h },
  ];
}

function moveAndCollide(state, dt) {
  const pw = PLAYER.w;
  const ph = PLAYER.h;
  const gravSign = state.grav;
  const solids = wallSolids();

  state.vx = PLAYER.walk * state.dir;
  state.vy += PLAYER.gravity * gravSign * dt;
  state.vy = Math.max(-PLAYER.maxVy, Math.min(PLAYER.maxVy, state.vy));

  let px = state.x + state.vx * dt;
  let py = state.y;
  let vx = state.vx;
  let vy = state.vy;

  for (const s of solids) {
    if (!aabbOverlap(px, py, pw, ph, s.x, s.y, s.w, s.h)) continue;
    if (vx > 0) px = s.x - pw;
    else if (vx < 0) px = s.x + s.w;
    vx = -vx;
    state.dir = vx > 0 ? 1 : -1;
  }

  py = state.y + vy * dt;
  for (const s of solids) {
    if (!aabbOverlap(px, py, pw, ph, s.x, s.y, s.w, s.h)) continue;
    if (gravSign > 0) {
      if (vy >= 0) {
        py = s.y - ph;
        vy = 0;
      } else {
        py = s.y + s.h;
        vy = 0;
      }
    } else if (vy <= 0) {
      py = s.y + s.h;
      vy = 0;
    } else {
      py = s.y - ph;
      vy = 0;
    }
  }

  state.x = px;
  state.y = py;
  state.vx = vx;
  state.vy = vy;
  state.grounded = vy === 0;
}

function outOfWorld(state) {
  return (
    state.y < -0.2
    || state.y + PLAYER.h > WORLD.h + 0.15
    || state.x < -0.3
    || state.x + PLAYER.w > WORLD.w + 0.3
  );
}

export function step(state, dt, flipNow = false) {
  if (state.dead || state.won) return state;

  state.time += dt;
  if (state.flipLock > 0) state.flipLock = Math.max(0, state.flipLock - dt);
  if (flipNow) flipGravity(state);

  const sub = Math.max(1, Math.ceil(dt / 0.004));
  const subDt = dt / sub;
  for (let i = 0; i < sub; i++) moveAndCollide(state, subDt);

  if (outOfWorld(state)) {
    state.dead = true;
    return state;
  }

  const pad = 0.1;
  for (const sp of SPIKES) {
    if (
      aabbOverlap(
        state.x + pad,
        state.y + pad,
        PLAYER.w - pad * 2,
        PLAYER.h - pad * 2,
        sp.x,
        sp.y,
        sp.w,
        sp.h,
      )
    ) {
      state.dead = true;
      return state;
    }
  }

  const cx = state.x + PLAYER.w * 0.5;
  const cy = state.y + PLAYER.h * 0.5;
  if (!state.hasKey) {
    const dx = cx - KEY.x;
    const dy = cy - KEY.y;
    if (dx * dx + dy * dy < (KEY.r + 0.32) ** 2) state.hasKey = true;
  }

  if (
    state.hasKey
    && aabbOverlap(state.x, state.y, PLAYER.w, PLAYER.h, DOOR.x, DOOR.y, DOOR.w, DOOR.h)
  ) {
    state.won = true;
  }

  return state;
}

export function simulate(flips, maxTime = 14) {
  const state = createState();
  const queue = [...flips].sort((a, b) => a - b);
  let t = 0;
  const dt = 1 / 120;

  while (t < maxTime && !state.dead && !state.won) {
    const flipNow = queue.length > 0 && queue[0] <= t + 1e-6;
    if (flipNow) queue.shift();
    step(state, dt, flipNow);
    t += dt;
  }

  return { state, time: t };
}
