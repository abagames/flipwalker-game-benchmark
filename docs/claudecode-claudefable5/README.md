# FlipWalker — Claude Code / Claude Fable 5

A gravity-flip puzzle: the walker never stops and turns around at walls; your
only input is flipping gravity (**Space** or tap), and a flip is only possible
while standing on a surface. Collect the key, then reach the door.

## Files

| File           | Purpose                                                            |
| -------------- | ------------------------------------------------------------------ |
| `index.html`   | Static entry point (plain script tags, no build step, no CDN)      |
| `game-core.js` | Level data + complete deterministic physics, shared with the tests |
| `main.js`      | Rendering, input, particles, WebAudio sound                        |
| `simulate.js`  | Node verifier (see below)                                          |

## Level design

Four stacked corridors connected by gaps in the slabs between them. Rising
through a gap needs a flip timed so the walker's drift lines up with the
opening; "guard" spikes next to each gap punish flips that are too early or
too late. The route up to the key crosses three corridors (five forced flips),
the key is collected mid-flight in the right shaft, and the return trip is a
spike gauntlet along the top corridor — entered via a wall bounce — that ends
with a free-fall down the left shaft onto the door, which sits directly above
the start.

## Verification

```
node simulate.js
```

The verifier searches the real game physics frame by frame (the only choice
per frame is flip / don't flip, only while grounded) and asserts:

- the fastest solution: **665 frames (11.1 s), 10 flips**, replayed
  step-by-step to confirm the key is collected and the door reached;
- a 0-1 BFS lower bound: **every possible solution needs at least 8 flips**,
  so the level cannot be shortcut;
- a soft-lock audit over all ~89,000 reachable states: from every state the
  player can still reach the win or a respawning death — it is impossible to
  get permanently stuck.

It also prints Space-press timings in milliseconds for the GIF recorder
(`scripts/solutions/<slug>.json` format).

A read-only `window.__flipwalker` handle (state / frame / flips / deaths) is
exposed for automated testing.
