/** Level geometry in world units (1 unit = 48px). Origin top-left, +y down. */

export const WORLD = { w: 14, h: 9 };

export const TILE = 48;

export const PLAYER = {
  w: 0.58,
  h: 0.88,
  walk: 3.8,
  gravity: 28,
  maxVy: 16,
  flipCooldown: 0.2,
};

export const PLATFORMS = [
  { x: 0, y: 7.2, w: 4.1, h: 0.75 },
  { x: 0, y: 0.85, w: 10.8, h: 0.55 },
  { x: 7.2, y: 4.55, w: 2.9, h: 0.48 },
  { x: 9.2, y: 7.2, w: 4.8, h: 0.75 },
];

export const SPIKES = [
  { x: 4.05, y: 7.65, w: 5.05, h: 0.38 },
];

export const KEY = { x: 8.35, y: 3.95, r: 0.24 };

export const DOOR = { x: 11.85, y: 5.75, w: 0.85, h: 1.45 };

export const SPAWN = { x: 0.85, y: 6.35 };

/** Intended gravity flips (seconds from start). */
export const SOLUTION_FLIPS = [0.7, 1.85, 3.0, 5.0];
