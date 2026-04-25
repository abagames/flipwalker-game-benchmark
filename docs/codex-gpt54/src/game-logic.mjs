import { createLevel, solutionPlan, TILE_SIZE } from "./level.mjs";

export const FIXED_DT = 1 / 60;
const WALK_SPEED = 114;
const GRAVITY = 1200;
const MAX_VERTICAL_SPEED = 720;
const PLAYER_WIDTH = 22;
const PLAYER_HEIGHT = 28;
const LEVEL = createLevel();

function cloneState(state) {
  return {
    ...state,
    events: [...state.events],
  };
}

export function getLevel() {
  return LEVEL;
}

export function getSolutionPlan() {
  return solutionPlan.map((step) => ({ ...step }));
}

export function createInitialState() {
  return {
    x: LEVEL.start.x - PLAYER_WIDTH / 2,
    y: LEVEL.start.y - PLAYER_HEIGHT / 2,
    width: PLAYER_WIDTH,
    height: PLAYER_HEIGHT,
    direction: 1,
    gravityDirection: 1,
    velocityY: 0,
    time: 0,
    collectedKey: false,
    won: false,
    dead: false,
    deathReason: "",
    message: "Running",
    events: [],
  };
}

export function flipGravity(state) {
  if (state.dead || state.won) {
    return;
  }
  state.gravityDirection *= -1;
  state.events.push({
    type: "flip",
    time: state.time,
    x: state.x + state.width / 2,
    y: state.y + state.height / 2,
  });
}

function rectsOverlap(a, b) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

function tileAt(level, col, row) {
  if (row < 0 || row >= level.height || col < 0 || col >= level.width) {
    return "#";
  }
  return level.tiles[row][col];
}

function isSolidTile(level, col, row, collectedKey) {
  const tile = tileAt(level, col, row);
  if (tile === "#") {
    return true;
  }
  if (tile === "G") {
    return !collectedKey;
  }
  return false;
}

function forEachOverlappingTile(rect, callback) {
  const left = Math.floor(rect.x / TILE_SIZE);
  const right = Math.floor((rect.x + rect.width - 0.0001) / TILE_SIZE);
  const top = Math.floor(rect.y / TILE_SIZE);
  const bottom = Math.floor((rect.y + rect.height - 0.0001) / TILE_SIZE);

  for (let row = top; row <= bottom; row += 1) {
    for (let col = left; col <= right; col += 1) {
      callback(col, row);
    }
  }
}

function resolveHorizontal(level, state, nextState, deltaX) {
  nextState.x += deltaX;

  forEachOverlappingTile(nextState, (col, row) => {
    if (!isSolidTile(level, col, row, nextState.collectedKey)) {
      return;
    }
    const tileLeft = col * TILE_SIZE;
    const tileRight = tileLeft + TILE_SIZE;
    if (deltaX > 0) {
      nextState.x = tileLeft - nextState.width;
      nextState.direction = -1;
    } else if (deltaX < 0) {
      nextState.x = tileRight;
      nextState.direction = 1;
    }
  });
}

function resolveVertical(level, state, nextState, deltaY) {
  nextState.y += deltaY;

  forEachOverlappingTile(nextState, (col, row) => {
    if (!isSolidTile(level, col, row, nextState.collectedKey)) {
      return;
    }
    const tileTop = row * TILE_SIZE;
    const tileBottom = tileTop + TILE_SIZE;
    if (deltaY > 0) {
      nextState.y = tileTop - nextState.height;
      nextState.velocityY = 0;
    } else if (deltaY < 0) {
      nextState.y = tileBottom;
      nextState.velocityY = 0;
    }
  });
}

function makeHazardRect(col, row, tile) {
  const baseX = col * TILE_SIZE;
  const baseY = row * TILE_SIZE;
  const inset = 4;
  if (tile === "^") {
    return {
      x: baseX + inset,
      y: baseY + 10,
      width: TILE_SIZE - inset * 2,
      height: TILE_SIZE - 10,
    };
  }
  if (tile === "v") {
    return {
      x: baseX + inset,
      y: baseY,
      width: TILE_SIZE - inset * 2,
      height: TILE_SIZE - 10,
    };
  }
  return null;
}

function updateCollectibles(level, state) {
  if (!state.collectedKey) {
    const keyRect = {
      x: level.key.x - 10,
      y: level.key.y - 10,
      width: 20,
      height: 20,
    };
    if (rectsOverlap(state, keyRect)) {
      state.collectedKey = true;
      state.events.push({
        type: "key",
        time: state.time,
        x: state.x + state.width / 2,
        y: state.y + state.height / 2,
      });
      state.message = "Key collected";
    }
  }

  if (state.collectedKey && rectsOverlap(state, level.door)) {
    state.won = true;
    state.message = "Vault unlocked";
    state.events.push({
      type: "door",
      time: state.time,
      x: state.x + state.width / 2,
      y: state.y + state.height / 2,
    });
  }
}

function checkHazards(level, state) {
  let hitHazard = false;
  forEachOverlappingTile(state, (col, row) => {
    const tile = tileAt(level, col, row);
    const hazardRect = makeHazardRect(col, row, tile);
    if (hazardRect && rectsOverlap(state, hazardRect)) {
      hitHazard = true;
    }
  });

  if (
    state.y + state.height < 0 ||
    state.y > level.height * TILE_SIZE ||
    state.x + state.width < 0 ||
    state.x > level.width * TILE_SIZE
  ) {
    hitHazard = true;
  }

  if (hitHazard) {
    state.dead = true;
    state.deathReason = "spikes";
    state.message = "Reset after impact";
    state.events.push({
      type: "death",
      time: state.time,
      x: state.x + state.width / 2,
      y: state.y + state.height / 2,
    });
  }
}

export function stepGame(state, options = {}) {
  const level = options.level ?? LEVEL;
  const nextState = cloneState(state);

  if (nextState.dead || nextState.won) {
    return nextState;
  }

  if (options.flip) {
    flipGravity(nextState);
  }

  nextState.time += FIXED_DT;
  nextState.velocityY += GRAVITY * nextState.gravityDirection * FIXED_DT;
  nextState.velocityY = Math.max(
    -MAX_VERTICAL_SPEED,
    Math.min(MAX_VERTICAL_SPEED, nextState.velocityY),
  );

  const deltaX = nextState.direction * WALK_SPEED * FIXED_DT;
  const deltaY = nextState.velocityY * FIXED_DT;

  resolveHorizontal(level, state, nextState, deltaX);
  resolveVertical(level, state, nextState, deltaY);
  updateCollectibles(level, nextState);
  checkHazards(level, nextState);

  return nextState;
}

function shouldTriggerStep(state, step) {
  const centerX = state.x + state.width / 2;
  if (state.direction !== step.direction) {
    return false;
  }
  if (step.direction === 1) {
    return centerX >= step.thresholdX;
  }
  return centerX <= step.thresholdX;
}

export function simulateSolution(plan = getSolutionPlan(), maxFrames = 2400) {
  let state = createInitialState();
  const remainingPlan = plan.map((step) => ({ ...step }));
  const transcript = [];
  let handledEvents = 0;

  for (let frame = 0; frame < maxFrames; frame += 1) {
    let flip = false;
    const currentStep = remainingPlan[0];
    if (currentStep && shouldTriggerStep(state, currentStep)) {
      flip = true;
      transcript.push(
        `t=${state.time.toFixed(2)}s: ${currentStep.label} (x=${(
          state.x +
          state.width / 2
        ).toFixed(1)})`,
      );
      remainingPlan.shift();
    }

    state = stepGame(state, { flip });

    while (handledEvents < state.events.length) {
      const event = state.events[handledEvents];
      if (event.type === "key") {
        transcript.push(`t=${event.time.toFixed(2)}s: Key collected at x=${event.x.toFixed(1)}.`);
      }
      if (event.type === "door") {
        transcript.push(`t=${event.time.toFixed(2)}s: Door reached at x=${event.x.toFixed(1)}.`);
      }
      if (event.type === "death") {
        transcript.push(
          `t=${event.time.toFixed(2)}s: Failed after hitting hazards at x=${event.x.toFixed(1)}.`,
        );
      }
      handledEvents += 1;
    }

    if (state.dead || state.won) {
      break;
    }
  }

  return {
    state,
    transcript,
    unspentSteps: remainingPlan,
  };
}
