/*
 * FlipWalker — core simulation.
 *
 * This file is shared between the browser game (main.js) and the Node
 * verifier (simulate.js). It contains the level data and the complete,
 * deterministic physics step so that the verifier exercises exactly the
 * same rules the player experiences.
 *
 * Map legend:
 *   #  solid tile
 *   ^  spike pointing up (deadly when walking on the floor below it)
 *   v  spike pointing down (deadly when walking on the ceiling above it)
 *   S  player start (stands on the tile underneath, gravity down)
 *   K  key
 *   D  door tile (win when touched while holding the key)
 *   .  empty space
 */
(function (root, factory) {
  if (typeof module === "object" && typeof module.exports === "object") {
    module.exports = factory();
  } else {
    root.GameCore = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const TILE = 32;

  // 24 x 15 tiles -> 768 x 480 px.
  //
  // Intended solution (verified by simulate.js):
  //  1. Bottom corridor: flip up before the floor spikes and rise through
  //     the gap in the slab above (a hanging spike punishes late flips).
  //  2. Middle-low corridor: land on its ceiling, flip down before the
  //     hanging spikes, then flip up through the second slab gap between
  //     a "guard" spike and the floor spike bed.
  //  3. Middle-high corridor: land on its ceiling, flip down before the
  //     hanging spikes, flip back up past the floor spike, and ride the
  //     ceiling into the right shaft, collecting the key while rising.
  //  4. Top corridor: bounce off the right wall and run the return
  //     gauntlet leftwards — down before the hanging spikes, up over the
  //     floor spikes, down again before the last hanging spikes — then
  //     drop into the left shaft, which lands on the door.
  const MAP = [
    "########################",
    "#....vvv......vvv....K.#",
    "#........^^^...........#",
    "#..##################..#",
    "#..#.............vv....#",
    "#..#................^..#",
    "#..##########..#########",
    "#..#.....vv.v..........#",
    "#DD#..........^^^......#",
    "#####..#################",
    "#......v........########",
    "#...............########",
    "#...............########",
    "#.S.....^^^.....########",
    "########################",
  ];

  const ROWS = MAP.length;
  const COLS = MAP[0].length;

  const WALK_SPEED = 2; // px per frame, 60 fps
  const GRAVITY = 0.5; // px per frame^2
  const MAX_FALL = 8; // terminal velocity
  const PLAYER_W = 18;
  const PLAYER_H = 26;
  const SPIKE_INSET_X = 6; // forgiving spike hitbox
  const SPIKE_DEPTH = 18;
  const KEY_HALF = 10;
  const EPS = 0.001;

  let startCol = 0;
  let startRow = 0;
  let keyCol = 0;
  let keyRow = 0;
  const doorCells = [];
  const spikes = [];

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const ch = MAP[r][c];
      if (ch === "S") {
        startCol = c;
        startRow = r;
      } else if (ch === "K") {
        keyCol = c;
        keyRow = r;
      } else if (ch === "D") {
        doorCells.push({ c: c, r: r });
      } else if (ch === "^") {
        spikes.push({
          x: c * TILE + SPIKE_INSET_X,
          y: (r + 1) * TILE - SPIKE_DEPTH,
          w: TILE - 2 * SPIKE_INSET_X,
          h: SPIKE_DEPTH,
          dir: "up",
          c: c,
          r: r,
        });
      } else if (ch === "v") {
        spikes.push({
          x: c * TILE + SPIKE_INSET_X,
          y: r * TILE,
          w: TILE - 2 * SPIKE_INSET_X,
          h: SPIKE_DEPTH,
          dir: "down",
          c: c,
          r: r,
        });
      }
    }
  }

  const startX = startCol * TILE + (TILE - PLAYER_W) / 2;
  const startY = (startRow + 1) * TILE - PLAYER_H;

  const keyBox = {
    x: (keyCol + 0.5) * TILE - KEY_HALF,
    y: (keyRow + 0.5) * TILE - KEY_HALF,
    w: KEY_HALF * 2,
    h: KEY_HALF * 2,
  };

  const doorRects = doorCells.map(function (d) {
    return { x: d.c * TILE, y: d.r * TILE, w: TILE, h: TILE };
  });

  function solidAt(c, r) {
    if (c < 0 || r < 0 || c >= COLS || r >= ROWS) return true;
    return MAP[r][c] === "#";
  }

  function rectHitsSolid(x, y) {
    const c0 = Math.floor(x / TILE);
    const c1 = Math.floor((x + PLAYER_W - EPS) / TILE);
    const r0 = Math.floor(y / TILE);
    const r1 = Math.floor((y + PLAYER_H - EPS) / TILE);
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        if (solidAt(c, r)) return true;
      }
    }
    return false;
  }

  function overlapsBox(x, y, b) {
    return (
      x < b.x + b.w && x + PLAYER_W > b.x && y < b.y + b.h && y + PLAYER_H > b.y
    );
  }

  function newState() {
    return {
      x: startX,
      y: startY,
      dir: 1, // 1 right, -1 left
      vy: 0,
      g: 1, // 1 gravity down, -1 gravity up
      grounded: true,
      hasKey: false,
      won: false,
      dead: false,
      frame: 0,
    };
  }

  // Reset position after a death; the key, once collected, stays collected.
  function respawn(s) {
    s.x = startX;
    s.y = startY;
    s.dir = 1;
    s.vy = 0;
    s.g = 1;
    s.grounded = true;
    s.dead = false;
  }

  // Advance the simulation one frame. `wantFlip` is the player's only
  // input: it flips gravity, but only while standing on a surface.
  function step(s, wantFlip) {
    const ev = {
      flipped: false,
      bounced: false,
      landed: false,
      impact: 0,
      gotKey: false,
      died: false,
      won: false,
      atLockedDoor: false,
    };
    if (s.won || s.dead) return ev;
    s.frame++;

    if (wantFlip && s.grounded) {
      s.g = -s.g;
      s.vy = 0;
      s.grounded = false;
      ev.flipped = true;
    }

    // Horizontal: walk forward, reverse on hitting a wall.
    let nx = s.x + s.dir * WALK_SPEED;
    if (rectHitsSolid(nx, s.y)) {
      if (s.dir > 0) {
        nx = Math.floor((nx + PLAYER_W - EPS) / TILE) * TILE - PLAYER_W;
      } else {
        nx = (Math.floor(nx / TILE) + 1) * TILE;
      }
      s.dir = -s.dir;
      ev.bounced = true;
    }
    s.x = nx;

    // Vertical: gravity, then resolve against tiles.
    s.vy += GRAVITY * s.g;
    if (s.vy > MAX_FALL) s.vy = MAX_FALL;
    if (s.vy < -MAX_FALL) s.vy = -MAX_FALL;
    const wasGrounded = s.grounded;
    const impactVy = Math.abs(s.vy);
    let ny = s.y + s.vy;
    s.grounded = false;
    if (rectHitsSolid(s.x, ny)) {
      if (s.vy > 0) {
        ny = Math.floor((ny + PLAYER_H - EPS) / TILE) * TILE - PLAYER_H;
        if (s.g > 0) {
          s.grounded = true;
          if (!wasGrounded) {
            ev.landed = true;
            ev.impact = impactVy;
          }
        }
      } else {
        ny = (Math.floor(ny / TILE) + 1) * TILE;
        if (s.g < 0) {
          s.grounded = true;
          if (!wasGrounded) {
            ev.landed = true;
            ev.impact = impactVy;
          }
        }
      }
      s.vy = 0;
    }
    s.y = ny;

    // Spikes.
    for (let i = 0; i < spikes.length; i++) {
      if (overlapsBox(s.x, s.y, spikes[i])) {
        s.dead = true;
        ev.died = true;
        return ev;
      }
    }

    // Key.
    if (!s.hasKey && overlapsBox(s.x, s.y, keyBox)) {
      s.hasKey = true;
      ev.gotKey = true;
    }

    // Door.
    for (let i = 0; i < doorRects.length; i++) {
      if (overlapsBox(s.x, s.y, doorRects[i])) {
        if (s.hasKey) {
          s.won = true;
          ev.won = true;
        } else {
          ev.atLockedDoor = true;
        }
        break;
      }
    }

    return ev;
  }

  return {
    TILE: TILE,
    MAP: MAP,
    ROWS: ROWS,
    COLS: COLS,
    WALK_SPEED: WALK_SPEED,
    GRAVITY: GRAVITY,
    MAX_FALL: MAX_FALL,
    PLAYER_W: PLAYER_W,
    PLAYER_H: PLAYER_H,
    spikes: spikes,
    doorCells: doorCells,
    doorRects: doorRects,
    keyBox: keyBox,
    keyCol: keyCol,
    keyRow: keyRow,
    startX: startX,
    startY: startY,
    solidAt: solidAt,
    newState: newState,
    respawn: respawn,
    step: step,
  };
});
