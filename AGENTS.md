# Agent Instructions

These instructions are for coding agents adding a new benchmark submission. They are intentionally strict so that each `docs/<slug>/` directory remains the agent's own game output.

## Your task

Implement the puzzle game described in the prompt section of [`README.md`](./README.md) using vanilla JavaScript.

## Output location

Place all your files under:

```
docs/<YOUR_SLUG>/
```

Use the slug assigned by the benchmark maintainer.  
For example, if the entry is `claudecode-claudeopus47`, your files go in `docs/claudecode-claudeopus47/`.

## Required deliverable

| File                     | Notes                                                      |
| ------------------------ | ---------------------------------------------------------- |
| `docs/<slug>/index.html` | Entry point — must run as a static page with no build step |

Additional files (`.js`, `.css`, etc.) may be placed in the same directory and referenced with relative paths.  
The game must work when served as a static page by a local HTTP server **and** when served via GitHub Pages.  
Direct `file://` opening is not required, because valid static entries may use ES modules.

## Preview GIFs

Do not place generated preview GIFs in `docs/<slug>/`. That directory should contain only the coding agent's game output.

Preview GIFs for the README are generated separately by `scripts/record-gifs.js` and written to:

```
docs/screenshots/<slug>.gif
```

Maintainers can optionally add per-game Space-key timing hints for the recorder under:

```
scripts/solutions/<slug>.json
```

The basic format is:

```json
{
  "presses": [1500, 4000, 6500, 9000],
  "durationMs": 12000
}
```

Each number is the time in **milliseconds from page load** at which the Space key should be pressed.  
`durationMs` is optional. If a timing file is omitted, the recorder falls back to a generic pattern that may not reflect the intended solution.

For recorder-specific options such as frame-based replay or clicking an in-game autoplay button, see [`scripts/README.md`](./scripts/README.md).

## Acceptance criteria

Before you consider your submission complete, verify the following:

1. **Self-contained** — `index.html` loads without external network requests (or clearly documents any CDN dependency).
2. **Controls** — The player can flip gravity by pressing **Space** (or tapping the screen on mobile).
3. **Win condition** — Collecting the key and then reaching the door triggers a clear win state.
4. **Level is completable** — Simulate or manually trace the intended solution path step-by-step and confirm the character can reach the key and the door given the walk speed, gravity, and platform layout you chose.  
   Fix any geometry or timing issues that block completion before submitting.
5. **No regressions** — Opening the game through a local HTTP server in a modern browser shows the game immediately (no blank screen, no console errors that break functionality).

## Benchmark context

This repository collects implementations from multiple AI coding agents to compare game quality, level design, and code clarity.  
Your submission will be displayed alongside others in the project README with a live demo link and a preview GIF.

Do **not** modify files outside your own `docs/<slug>/` directory, and do **not** modify `AGENTS.md` or `README.md`.
