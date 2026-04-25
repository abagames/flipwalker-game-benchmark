# GIF Replay Timings

Place optional per-game Space-key press timings here as `<slug>.json`.

Example:

```json
{
  "presses": [1500, 4000, 6500, 9000],
  "durationMs": 12000
}
```

Each number is a Space-key press time in milliseconds from page load.
`durationMs` is optional and defaults to 12000.

For completable games, prefer a timing file that reaches the win state. For
games that are not completable, prefer timings that keep the character alive and
show representative movement for the chosen duration. If a slug does not have a
timing file here, `scripts/record-gifs.js` uses its default timing pattern.

If a game has a deterministic replay button, `startClick` can be used instead
of `presses`:

```json
{
  "startClick": "text=Auto-Play Solution",
  "durationMs": 8000
}
```

If a game exposes a global `frame` counter and `flipGravity()` function,
`framePresses` can be used for frame-accurate replay:

```json
{
  "framePresses": [60, 260, 300],
  "durationMs": 8000
}
```
