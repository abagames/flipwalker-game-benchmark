export const TILE_SIZE = 32;
export const LEVEL_WIDTH = 28;
export const LEVEL_HEIGHT = 18;

function createGrid(width, height, fill = ".") {
  return Array.from({ length: height }, () => Array(width).fill(fill));
}

function fillRect(grid, x, y, width, height, value) {
  for (let row = y; row < y + height; row += 1) {
    for (let col = x; col < x + width; col += 1) {
      grid[row][col] = value;
    }
  }
}

function setRun(grid, row, startX, endX, value) {
  for (let col = startX; col <= endX; col += 1) {
    grid[row][col] = value;
  }
}

function tileCenter(col, row, xOffset = 0, yOffset = 0) {
  return {
    x: col * TILE_SIZE + TILE_SIZE / 2 + xOffset,
    y: row * TILE_SIZE + TILE_SIZE / 2 + yOffset,
  };
}

const tiles = createGrid(LEVEL_WIDTH, LEVEL_HEIGHT);

fillRect(tiles, 0, 0, LEVEL_WIDTH, 1, "#");
fillRect(tiles, 0, LEVEL_HEIGHT - 1, LEVEL_WIDTH, 1, "#");
fillRect(tiles, 0, 0, 1, LEVEL_HEIGHT, "#");
fillRect(tiles, LEVEL_WIDTH - 1, 0, 1, LEVEL_HEIGHT, "#");

fillRect(tiles, 1, 4, LEVEL_WIDTH - 2, 1, "#");
fillRect(tiles, 1, 11, LEVEL_WIDTH - 2, 1, "#");
fillRect(tiles, 1, 16, 10, 1, "#");
fillRect(tiles, 11, 12, LEVEL_WIDTH - 12, 5, "#");

setRun(tiles, 11, 10, 11, "G");

setRun(tiles, 10, 6, 8, "^");
setRun(tiles, 5, 12, 14, "v");
setRun(tiles, 10, 17, 19, "^");
setRun(tiles, 5, 22, 24, "v");

setRun(tiles, 15, 4, 6, "^");
setRun(tiles, 12, 3, 3, "v");

tiles[10][25] = "K";
tiles[15][2] = "D";
tiles[10][2] = "S";

export const solutionPlan = [
  {
    id: "rise-1",
    direction: 1,
    thresholdX: 142,
    label: "Flip up before the first floor spike band.",
  },
  {
    id: "drop-1",
    direction: 1,
    thresholdX: 332,
    label: "Drop back to the floor to thread under the first ceiling spikes.",
  },
  {
    id: "rise-2",
    direction: 1,
    thresholdX: 492,
    label: "Flip up again to clear the second floor spike band.",
  },
  {
    id: "drop-2",
    direction: 1,
    thresholdX: 652,
    label: "Drop late to slip under the last ceiling spikes and line up with the key.",
  },
  {
    id: "rise-3",
    direction: -1,
    thresholdX: 691,
    label: "On the return, flip up to cross the second floor spike band from the other side.",
  },
  {
    id: "drop-3",
    direction: -1,
    thresholdX: 531,
    label: "Drop to the floor so the opened gate shaft can catch you.",
  },
  {
    id: "rise-4",
    direction: -1,
    thresholdX: 275,
    label: "In the lower chamber, flip up to cross the floor spikes.",
  },
  {
    id: "drop-4",
    direction: -1,
    thresholdX: 162,
    label: "Drop back down before the ceiling spikes and walk into the door.",
  },
];

export function createLevel() {
  return {
    name: "Flipline Vault",
    width: LEVEL_WIDTH,
    height: LEVEL_HEIGHT,
    tileSize: TILE_SIZE,
    tiles: tiles.map((row) => row.join("")),
    start: tileCenter(2, 10, 0, 4),
    key: tileCenter(25, 10, 0, -4),
    door: {
      x: 2 * TILE_SIZE + 8,
      y: 16 * TILE_SIZE - 44,
      width: 18,
      height: 36,
    },
  };
}
