import {
  FIXED_DT,
  createInitialState,
  flipGravity,
  getLevel,
  getSolutionPlan,
  stepGame,
} from "./game-logic.mjs";

const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d");
const statusNode = document.querySelector("#status");
const keyNode = document.querySelector("#key-status");
const timeNode = document.querySelector("#time");
const resetButton = document.querySelector("#reset-button");
const replayButton = document.querySelector("#replay-button");

const level = getLevel();

let state = createInitialState();
let flipQueued = false;
let accumulator = 0;
let lastTimestamp = performance.now();
let autoplay = null;

function resetGame() {
  state = createInitialState();
  flipQueued = false;
  autoplay = null;
}

function startSolutionReplay() {
  resetGame();
  autoplay = getSolutionPlan();
  statusNode.textContent = "Replaying solution";
}

function queueFlip() {
  if (state.dead || state.won || autoplay) {
    return;
  }
  flipQueued = true;
}

function maybeAdvanceAutoplay() {
  if (!autoplay?.length) {
    return;
  }

  const step = autoplay[0];
  const centerX = state.x + state.width / 2;
  const crossed =
    state.direction === step.direction &&
    ((step.direction === 1 && centerX >= step.thresholdX) ||
      (step.direction === -1 && centerX <= step.thresholdX));

  if (crossed) {
    flipQueued = true;
    autoplay.shift();
  }
}

function update() {
  maybeAdvanceAutoplay();
  state = stepGame(state, { flip: flipQueued, level });
  flipQueued = false;

  if (autoplay && (state.dead || state.won)) {
    autoplay = null;
  }
}

function drawBackground() {
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, "#16334a");
  gradient.addColorStop(0.65, "#0d1c2a");
  gradient.addColorStop(1, "#09121b");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "rgba(142, 244, 255, 0.06)";
  for (let i = 0; i < 9; i += 1) {
    ctx.beginPath();
    ctx.arc(80 + i * 90, 50 + (i % 3) * 18, 2 + (i % 4), 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawTiles() {
  for (let row = 0; row < level.height; row += 1) {
    for (let col = 0; col < level.width; col += 1) {
      const tile = level.tiles[row][col];
      const x = col * level.tileSize;
      const y = row * level.tileSize;

      if (tile === "#" || (tile === "G" && !state.collectedKey)) {
        const fill =
          tile === "G" && !state.collectedKey
            ? "#c57f2d"
            : row === 4 || row === 11 || row === 16
              ? "#345a70"
              : "#2a4252";
        ctx.fillStyle = fill;
        ctx.fillRect(x, y, level.tileSize, level.tileSize);
        ctx.fillStyle = "rgba(255,255,255,0.08)";
        ctx.fillRect(x, y, level.tileSize, 4);
      } else if (tile === "^" || tile === "v") {
        ctx.fillStyle = "#ff5d73";
        ctx.beginPath();
        if (tile === "^") {
          ctx.moveTo(x + 2, y + level.tileSize);
          ctx.lineTo(x + level.tileSize / 2, y + 4);
          ctx.lineTo(x + level.tileSize - 2, y + level.tileSize);
        } else {
          ctx.moveTo(x + 2, y);
          ctx.lineTo(x + level.tileSize / 2, y + level.tileSize - 4);
          ctx.lineTo(x + level.tileSize - 2, y);
        }
        ctx.closePath();
        ctx.fill();
      }
    }
  }
}

function drawKey() {
  if (state.collectedKey) {
    return;
  }

  ctx.save();
  ctx.translate(level.key.x, level.key.y);
  ctx.fillStyle = "#ffd166";
  ctx.strokeStyle = "#714e00";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, 0, 8, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(8, 0);
  ctx.lineTo(20, 0);
  ctx.lineTo(20, 5);
  ctx.lineTo(16, 5);
  ctx.lineTo(16, 9);
  ctx.lineTo(12, 9);
  ctx.lineTo(12, 4);
  ctx.lineTo(8, 4);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawDoor() {
  const door = level.door;
  ctx.fillStyle = state.collectedKey ? "#8ef4ff" : "#4d6c7c";
  ctx.fillRect(door.x, door.y, door.width, door.height);
  ctx.fillStyle = "#0b1721";
  ctx.fillRect(door.x + 4, door.y + 6, door.width - 8, door.height - 8);
  ctx.fillStyle = state.collectedKey ? "#ffd166" : "#95aab8";
  ctx.beginPath();
  ctx.arc(door.x + door.width - 6, door.y + door.height / 2, 2.3, 0, Math.PI * 2);
  ctx.fill();
}

function drawPlayer() {
  ctx.save();
  ctx.translate(state.x, state.y);

  ctx.fillStyle = state.dead ? "#ff5d73" : "#8ef4ff";
  ctx.fillRect(0, 0, state.width, state.height);
  ctx.fillStyle = "#10222f";
  ctx.fillRect(4, 6, state.width - 8, state.height - 12);

  const eyeX = state.direction === 1 ? state.width - 8 : 8;
  const eyeY = state.gravityDirection === 1 ? 9 : state.height - 9;
  ctx.fillStyle = "#f2f7fb";
  ctx.beginPath();
  ctx.arc(eyeX, eyeY, 3, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawOverlay() {
  if (!state.dead && !state.won) {
    return;
  }

  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.fillRect(0, 0, canvas.width, 64);
  ctx.fillStyle = "#f2f7fb";
  ctx.font = "700 28px Trebuchet MS, sans-serif";
  ctx.fillText(state.won ? "Vault opened" : "Impact detected", 24, 40);
}

function draw() {
  drawBackground();
  drawTiles();
  drawDoor();
  drawKey();
  drawPlayer();
  drawOverlay();

  statusNode.textContent = state.won
    ? "Solved"
    : state.dead
      ? "Failed"
      : autoplay
        ? "Replaying solution"
        : "Running";
  keyNode.textContent = state.collectedKey ? "Collected" : "Missing";
  timeNode.textContent = `${state.time.toFixed(1)}s`;
}

function frame(now) {
  accumulator += Math.min(0.05, (now - lastTimestamp) / 1000);
  lastTimestamp = now;

  while (accumulator >= FIXED_DT) {
    update();
    accumulator -= FIXED_DT;
  }

  draw();
  requestAnimationFrame(frame);
}

window.addEventListener("keydown", (event) => {
  if (event.code === "Space" || event.code === "ArrowUp") {
    event.preventDefault();
    queueFlip();
  }
  if (event.code === "KeyR") {
    resetGame();
  }
});

canvas.addEventListener("pointerdown", () => {
  queueFlip();
});

resetButton.addEventListener("click", resetGame);
replayButton.addEventListener("click", startSolutionReplay);

draw();
requestAnimationFrame(frame);
