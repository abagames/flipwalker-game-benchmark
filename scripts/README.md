# Preview GIF Recording

This directory contains the automation used to record animated preview GIFs for
every FlipWalker benchmark entry.

## Files

| File | Purpose |
| --- | --- |
| `package.json` | Defines the Playwright dependency and helper npm scripts. |
| `record-gifs.js` | Starts a local static server, opens each game in Chromium, captures frames, and writes `docs/screenshots/<slug>.gif`. |
| `solutions/` | Optional per-game Space-key press timings, stored as `<slug>.json`. |

## Requirements

- Node.js
- Playwright Chromium, installed with `npm run install-browser`
- ImageMagick command-line tools: `mogrify` and `convert`
- `gifsicle`

`record-gifs.js` expects `mogrify`, `convert`, and `gifsicle` to be available on
`PATH`.

## Setup

Run these commands from this directory:

```bash
cd scripts
npm install
npm run install-browser
```

`npm install` installs Playwright. `npm run install-browser` downloads the
Chromium browser used by Playwright.

## Usage

Record every entry under `../docs/`:

```bash
node record-gifs.js
```

Record one entry by slug:

```bash
node record-gifs.js claudecode-claudeopus47
```

The same commands are also available through npm scripts:

```bash
npm run record
npm run record:one -- claudecode-claudeopus47
```

## How It Works

1. `record-gifs.js` starts a Node.js HTTP server on
   `http://127.0.0.1:3737`, serving the repository's `docs/` directory.
2. It launches headless Chromium through Playwright.
3. For each slug, it opens `http://127.0.0.1:3737/<slug>/`.
4. It clicks the center of the viewport to focus the game canvas or dismiss a
   start screen.
5. It records full-page screenshots at 6 frames per second using a 1000 x 700
   viewport. The default duration is 12 seconds, and
   `scripts/solutions/<slug>.json` can override it.
6. While frames are being captured, it presses Space at scheduled timings.
7. Captured PNG frames are resized to a maximum width of 600 px with
   `mogrify`.
8. ImageMagick `convert` assembles the frames into `_raw.gif`.
9. `gifsicle -O3 --colors 128` optimizes the raw GIF into `<slug>.gif`.
10. Temporary files are removed after each slug.

The output file is written to:

```text
docs/screenshots/<slug>.gif
```

## Default Input Timing

If a game does not define custom timings, Space is pressed five times at these
milliseconds from page load:

```json
{
  "presses": [1500, 3500, 6000, 8500, 11000]
}
```

These defaults are intended to demonstrate the gravity-flip mechanic. They may
not clear every game, and some submitted games may not be completable.

## Per-Game Timing Override

Each entry can define its own replay timing file:

```text
scripts/solutions/<slug>.json
```

The file normally contains a `presses` array. Each number is a Space-key press
time in milliseconds from page load. It may also contain `durationMs` to
override the default 12 second recording duration:

```json
{
  "presses": [1500, 4000, 6500, 9000],
  "durationMs": 12000
}
```

If a game already has its own deterministic replay button, use `startClick`
instead of `presses`:

```json
{
  "startClick": "text=Auto-Play Solution",
  "durationMs": 8000
}
```

If a game exposes a global `frame` counter and `flipGravity()` function,
`framePresses` can replay flips by game frame instead of wall-clock time:

```json
{
  "framePresses": [60, 260, 300],
  "durationMs": 8000
}
```

When `scripts/solutions/<slug>.json` exists and contains a non-empty `presses`
array, those timings replace the default timings for that slug. If `startClick`
is set, the recorder clicks that Playwright selector and does not send Space
presses. If `framePresses` is set, the recorder calls `flipGravity()` on those
game frame numbers and does not send Space presses. Invalid JSON or an empty
array is ignored, and the default timings are used instead.

For games that are known to be completable, these files should encode a clear
playthrough. For games that are not completable, use timings that keep the
character alive and show representative gameplay for the chosen duration.

## Existing Outputs

At the time this documentation was written, all seven benchmark entries already
had generated preview GIF files under `docs/screenshots/`. Their sizes ranged from about 36 KB to
936 KB:

| Slug | Size |
| --- | ---: |
| `amp-claudeopus46` | 188 KB |
| `claudecode-claudeopus47` | 160 KB |
| `codex-gpt54` | 88 KB |
| `codex-gpt55` | 936 KB |
| `copilot-gpt5mini` | 36 KB |
| `gemini-gemini3flash` | 392 KB |
| `opencode-minimax` | 44 KB |

## Notes

- A slug is skipped if `docs/<slug>/index.html` does not exist.
- Slugs are processed alphabetically when no specific slug is provided.
- Recording failures are reported per slug, and the script continues cleanup
  before moving on.
- The server is local only and binds to `127.0.0.1`.
