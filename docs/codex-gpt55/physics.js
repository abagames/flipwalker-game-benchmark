(function initGravityKeyRun(root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.GravityKeyRun = factory();
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function createGravityKeyRun() {
  "use strict";

  const TILE = 24;

  const LEVEL = {
    width: 960,
    height: 540,
    player: {
      w: 22,
      h: 26,
      speed: 78,
      gravity: 1100,
      maxFall: 760,
      startX: 54,
      startY: 496 - 26,
      startDir: 1,
      startGravity: 1
    },
    solids: [
      { x: 18, y: 420, w: 22, h: 76, role: "bumper" },
      { x: 18, y: 496, w: 150, h: 44, role: "floor" },
      { x: 174, y: 0, w: 224, h: 70, role: "ceiling" },
      { x: 372, y: 496, w: 188, h: 44, role: "floor" },
      { x: 544, y: 0, w: 206, h: 70, role: "ceiling" },
      { x: 720, y: 496, w: 240, h: 44, role: "floor" },
      { x: 928, y: 420, w: 20, h: 76, role: "bumper" }
    ],
    hazards: [
      { x: 178, y: 464, w: 174, h: 32, style: "up" },
      { x: 358, y: 70, w: 34, h: 34, style: "down" },
      { x: 510, y: 466, w: 38, h: 30, style: "up" },
      { x: 696, y: 70, w: 42, h: 34, style: "down" }
    ],
    guides: [
      { x: 126, y: 496, gravity: 1 },
      { x: 304, y: 70, gravity: -1 },
      { x: 468, y: 496, gravity: 1 },
      { x: 654, y: 70, gravity: -1 }
    ],
    key: { x: 292, y: 88, w: 22, h: 22 },
    door: { x: 850, y: 438, w: 46, h: 58 },
    solution: [
      { atX: 126, gravity: 1, dir: 1, label: "launch to ceiling bridge" },
      { atX: 304, gravity: -1, dir: 1, label: "drop after key" },
      { atX: 468, gravity: 1, dir: 1, label: "launch to high bridge" },
      { atX: 654, gravity: -1, dir: 1, label: "drop to exit ledge" }
    ]
  };

  function createState() {
    const p = LEVEL.player;
    return {
      x: p.startX,
      y: p.startY,
      prevX: p.startX,
      prevY: p.startY,
      dir: p.startDir,
      gravitySign: p.startGravity,
      vy: 0,
      onSurface: true,
      hasKey: false,
      won: false,
      dead: false,
      deathReason: "",
      elapsed: 0,
      flips: 0
    };
  }

  function cloneState(state) {
    return {
      x: state.x,
      y: state.y,
      prevX: state.prevX,
      prevY: state.prevY,
      dir: state.dir,
      gravitySign: state.gravitySign,
      vy: state.vy,
      onSurface: state.onSurface,
      hasKey: state.hasKey,
      won: state.won,
      dead: state.dead,
      deathReason: state.deathReason,
      elapsed: state.elapsed,
      flips: state.flips
    };
  }

  function rectsOverlap(a, b) {
    return (
      a.x < b.x + b.w &&
      a.x + a.w > b.x &&
      a.y < b.y + b.h &&
      a.y + a.h > b.y
    );
  }

  function playerRect(state) {
    const p = LEVEL.player;
    return { x: state.x, y: state.y, w: p.w, h: p.h };
  }

  function flipGravity(state) {
    if (state.dead || state.won) return false;
    state.gravitySign *= -1;
    state.vy = 0;
    state.onSurface = false;
    state.flips += 1;
    return true;
  }

  function step(state, dt) {
    if (state.dead || state.won) return state;
    const p = LEVEL.player;

    state.elapsed += dt;
    state.prevX = state.x;
    state.prevY = state.y;

    state.x += state.dir * p.speed * dt;
    resolveHorizontal(state);

    state.vy += p.gravity * state.gravitySign * dt;
    state.vy = Math.max(-p.maxFall, Math.min(p.maxFall, state.vy));
    state.y += state.vy * dt;
    state.onSurface = false;
    resolveVertical(state);

    const body = playerRect(state);
    if (!state.hasKey && rectsOverlap(body, LEVEL.key)) {
      state.hasKey = true;
    }

    for (const hazard of LEVEL.hazards) {
      if (rectsOverlap(body, hazard)) {
        state.dead = true;
        state.deathReason = "hazard";
        return state;
      }
    }

    if (
      state.x < -80 ||
      state.x > LEVEL.width + 80 ||
      state.y < -120 ||
      state.y > LEVEL.height + 120
    ) {
      state.dead = true;
      state.deathReason = "void";
      return state;
    }

    if (state.hasKey && rectsOverlap(body, LEVEL.door)) {
      state.won = true;
    }

    return state;
  }

  function resolveHorizontal(state) {
    const p = LEVEL.player;
    const body = playerRect(state);

    for (const solid of LEVEL.solids) {
      if (!rectsOverlap(body, solid)) continue;

      const cameFromLeft = state.prevX + p.w <= solid.x;
      const cameFromRight = state.prevX >= solid.x + solid.w;
      if (cameFromLeft) {
        state.x = solid.x - p.w;
        state.dir = -1;
      } else if (cameFromRight) {
        state.x = solid.x + solid.w;
        state.dir = 1;
      }
      body.x = state.x;
    }
  }

  function resolveVertical(state) {
    const p = LEVEL.player;
    const body = playerRect(state);

    for (const solid of LEVEL.solids) {
      if (!rectsOverlap(body, solid)) continue;

      const wasAbove = state.prevY + p.h <= solid.y;
      const wasBelow = state.prevY >= solid.y + solid.h;
      if (state.vy >= 0 && wasAbove) {
        state.y = solid.y - p.h;
        state.vy = 0;
        state.onSurface = state.gravitySign > 0;
      } else if (state.vy <= 0 && wasBelow) {
        state.y = solid.y + solid.h;
        state.vy = 0;
        state.onSurface = state.gravitySign < 0;
      } else {
        const pushUp = Math.abs(state.y + p.h - solid.y);
        const pushDown = Math.abs(solid.y + solid.h - state.y);
        if (pushUp < pushDown) {
          state.y = solid.y - p.h;
        } else {
          state.y = solid.y + solid.h;
        }
        state.vy = 0;
      }

      body.y = state.y;
    }
  }

  function simulateSolution(options) {
    const opts = options || {};
    const dt = opts.dt || 1 / 240;
    const maxTime = opts.maxTime || 20;
    const state = createState();
    const events = [];
    let nextFlip = 0;

    while (state.elapsed < maxTime && !state.dead && !state.won) {
      const target = LEVEL.solution[nextFlip];
      if (
        target &&
        state.dir === target.dir &&
        state.gravitySign === target.gravity &&
        crossesX(state.prevX, state.x, target.atX, target.dir)
      ) {
        state.x = target.atX;
        flipGravity(state);
        events.push({
          time: round(state.elapsed, 3),
          x: round(state.x, 2),
          y: round(state.y, 2),
          gravity: state.gravitySign,
          label: target.label
        });
        nextFlip += 1;
      }

      const hadKey = state.hasKey;
      step(state, dt);
      if (!hadKey && state.hasKey) {
        events.push({
          time: round(state.elapsed, 3),
          x: round(state.x, 2),
          y: round(state.y, 2),
          label: "key collected"
        });
      }
      if (state.won) {
        events.push({
          time: round(state.elapsed, 3),
          x: round(state.x, 2),
          y: round(state.y, 2),
          label: "door reached"
        });
      }
    }

    return {
      success: state.won && state.hasKey && nextFlip === LEVEL.solution.length,
      state: cloneState(state),
      events,
      flipsUsed: nextFlip
    };
  }

  function crossesX(prevX, x, targetX, dir) {
    if (dir > 0) return prevX < targetX && x >= targetX;
    return prevX > targetX && x <= targetX;
  }

  function round(value, places) {
    const scale = Math.pow(10, places);
    return Math.round(value * scale) / scale;
  }

  return {
    TILE,
    LEVEL,
    createState,
    cloneState,
    flipGravity,
    step,
    simulateSolution,
    rectsOverlap,
    playerRect
  };
});
