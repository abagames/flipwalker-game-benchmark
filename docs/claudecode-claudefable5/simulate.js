/*
 * FlipWalker — level verifier.
 *
 * Run with:  node simulate.js
 *
 * Searches the real game physics (game-core.js) frame by frame, where the
 * only choice each frame is "flip gravity or not" (flips are only possible
 * while grounded, exactly as in the game). It reports:
 *
 *   1. The fastest solution (BFS over frames) and the exact frames /
 *      milliseconds at which Space must be pressed.
 *   2. The minimum number of flips any solution needs (0-1 BFS), proving
 *      the level cannot be cheesed with fewer flips.
 *   3. A replay of the fastest solution through a fresh state, asserting
 *      the key is collected and the door is reached.
 *   4. A soft-lock audit: every reachable alive state must still be able
 *      to reach either the win or a death (death respawns the player), so
 *      the player can never get permanently stuck.
 */
"use strict";

const Core = require("./game-core.js");

const FPS = 60;
const STATE_CAP = 2000000;

function keyOf(s) {
  return (
    s.x +
    "|" +
    s.y +
    "|" +
    s.vy +
    "|" +
    s.dir +
    "|" +
    s.g +
    "|" +
    (s.grounded ? 1 : 0) +
    "|" +
    (s.hasKey ? 1 : 0)
  );
}

function clone(s) {
  return {
    x: s.x,
    y: s.y,
    dir: s.dir,
    vy: s.vy,
    g: s.g,
    grounded: s.grounded,
    hasKey: s.hasKey,
    won: s.won,
    dead: s.dead,
    frame: s.frame,
  };
}

function actionsFor(s) {
  return s.grounded ? [false, true] : [false];
}

// --- 1. Fastest solution: plain BFS, one frame per edge. ---------------
function findFastestSolution() {
  const start = Core.newState();
  const nodes = [{ state: start, parent: -1, flip: false }];
  const seen = new Set([keyOf(start)]);
  let head = 0;
  while (head < nodes.length && nodes.length < STATE_CAP) {
    const node = nodes[head++];
    const acts = actionsFor(node.state);
    for (let i = 0; i < acts.length; i++) {
      const ns = clone(node.state);
      Core.step(ns, acts[i]);
      if (ns.dead) continue;
      if (ns.won) {
        return reconstruct(nodes, { state: ns, parent: head - 1, flip: acts[i] });
      }
      const k = keyOf(ns);
      if (seen.has(k)) continue;
      seen.add(k);
      nodes.push({ state: ns, parent: head - 1, flip: acts[i] });
    }
  }
  return null;
}

function reconstruct(nodes, finalNode) {
  const flipsAt = [];
  const chain = [];
  let cur = finalNode;
  while (cur) {
    chain.push(cur);
    cur = cur.parent >= 0 ? nodes[cur.parent] : null;
  }
  chain.reverse(); // chain[0] is the start node (no action taken to reach it)
  for (let f = 1; f < chain.length; f++) {
    if (chain[f].flip) flipsAt.push(f);
  }
  return { flipsAt: flipsAt, totalFrames: chain.length - 1 };
}

// --- 2. Minimum flips: 0-1 BFS (flip edges cost 1, walking costs 0). ----
function findMinimumFlips() {
  const start = Core.newState();
  const startK = keyOf(start);
  const dist = new Map([[startK, 0]]);
  const states = new Map([[startK, start]]);
  // Two-stack deque: pop order within equal cost does not matter.
  let front = [{ k: startK, d: 0 }];
  let back = [];
  let expanded = 0;
  while ((front.length || back.length) && expanded < STATE_CAP) {
    if (!front.length) {
      front = back.reverse();
      back = [];
    }
    const item = front.pop();
    if (item.d > dist.get(item.k)) continue;
    expanded++;
    const st = states.get(item.k);
    const acts = actionsFor(st);
    for (let i = 0; i < acts.length; i++) {
      const ns = clone(st);
      Core.step(ns, acts[i]);
      if (ns.dead) continue;
      const nd = item.d + (acts[i] ? 1 : 0);
      if (ns.won) return nd;
      const nk = keyOf(ns);
      if (!dist.has(nk) || nd < dist.get(nk)) {
        dist.set(nk, nd);
        states.set(nk, ns);
        if (acts[i]) back.push({ k: nk, d: nd });
        else front.push({ k: nk, d: nd });
      }
    }
  }
  return -1;
}

// --- 3. Replay the solution and trace the milestones. -------------------
function replay(flipsAt, maxFrames) {
  const flipSet = new Set(flipsAt);
  const s = Core.newState();
  const log = [];
  for (let f = 1; f <= maxFrames; f++) {
    const ev = Core.step(s, flipSet.has(f));
    if (ev.flipped) {
      log.push(
        "  frame " +
          String(f).padStart(4) +
          "  flip -> gravity " +
          (s.g > 0 ? "down" : "up") +
          "  at tile (" +
          Math.round(s.x / Core.TILE) +
          ", " +
          Math.round(s.y / Core.TILE) +
          ")"
      );
    }
    if (ev.gotKey) log.push("  frame " + String(f).padStart(4) + "  KEY collected");
    if (ev.died) log.push("  frame " + String(f).padStart(4) + "  DIED (bug!)");
    if (ev.won) {
      log.push("  frame " + String(f).padStart(4) + "  DOOR reached - WIN");
      return { ok: true, hasKey: s.hasKey, log: log, endFrame: f };
    }
    if (s.dead) return { ok: false, hasKey: s.hasKey, log: log, endFrame: f };
  }
  return { ok: false, hasKey: s.hasKey, log: log, endFrame: maxFrames };
}

// --- 4. Soft-lock audit. -------------------------------------------------
// Build the full reachable state graph; every alive state must have a path
// to a terminal (win or death). A state with neither would strand the
// player walking forever with no way to progress or respawn.
function softLockAudit() {
  const start = Core.newState();
  const startK = keyOf(start);
  const ids = new Map([[startK, 0]]);
  const stateList = [start];
  const reverse = []; // reverse[v] = array of predecessors u
  const canTerminate = [];
  reverse.push([]);
  canTerminate.push(false);
  let head = 0;
  while (head < stateList.length && stateList.length < STATE_CAP) {
    const st = stateList[head];
    const acts = actionsFor(st);
    for (let i = 0; i < acts.length; i++) {
      const ns = clone(st);
      Core.step(ns, acts[i]);
      if (ns.dead || ns.won) {
        canTerminate[head] = true;
        continue;
      }
      const nk = keyOf(ns);
      let id = ids.get(nk);
      if (id === undefined) {
        id = stateList.length;
        ids.set(nk, id);
        stateList.push(ns);
        reverse.push([]);
        canTerminate.push(false);
      }
      reverse[id].push(head);
    }
    head++;
  }

  const okSet = new Uint8Array(stateList.length);
  const queue = [];
  for (let i = 0; i < stateList.length; i++) {
    if (canTerminate[i]) {
      okSet[i] = 1;
      queue.push(i);
    }
  }
  let qh = 0;
  while (qh < queue.length) {
    const v = queue[qh++];
    const preds = reverse[v];
    for (let i = 0; i < preds.length; i++) {
      if (!okSet[preds[i]]) {
        okSet[preds[i]] = 1;
        queue.push(preds[i]);
      }
    }
  }
  let stuck = 0;
  for (let i = 0; i < stateList.length; i++) {
    if (!okSet[i]) stuck++;
  }
  return { total: stateList.length, stuck: stuck };
}

// --- Run everything. -----------------------------------------------------
console.log("FlipWalker level verification");
console.log("=============================\n");

const solution = findFastestSolution();
if (!solution) {
  console.log("FAIL: no solution found - the level is NOT completable.");
  process.exit(1);
}
console.log(
  "Fastest solution: " +
    solution.totalFrames +
    " frames (" +
    (solution.totalFrames / FPS).toFixed(1) +
    "s) using " +
    solution.flipsAt.length +
    " flips."
);

const minFlips = findMinimumFlips();
console.log(
  "Minimum flips required by ANY solution: " +
    minFlips +
    (minFlips >= 8 ? "  (level cannot be shortcut)" : "")
);

console.log("\nReplaying the fastest solution:");
const result = replay(solution.flipsAt, solution.totalFrames + 10);
result.log.forEach(function (line) {
  console.log(line);
});
if (!result.ok || !result.hasKey) {
  console.log("\nFAIL: replay did not collect the key and reach the door.");
  process.exit(1);
}

const audit = softLockAudit();
console.log(
  "\nSoft-lock audit: " +
    audit.total +
    " reachable states, " +
    audit.stuck +
    " stuck states" +
    (audit.stuck === 0 ? " (no soft-locks possible)" : "  <-- PROBLEM")
);
if (audit.stuck > 0) process.exit(1);

console.log("\nSpace-press timings (ms from game start, 60 fps):");
console.log(
  JSON.stringify(
    {
      presses: solution.flipsAt.map(function (f) {
        return Math.round((f * 1000) / FPS);
      }),
      durationMs: Math.round(((solution.totalFrames + 90) * 1000) / FPS),
    },
    null,
    2
  )
);

console.log("\nPASS: level is completable as intended.");
