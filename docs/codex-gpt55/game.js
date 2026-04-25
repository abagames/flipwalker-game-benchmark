(function runGravityKeyRun() {
  "use strict";

  const {
    LEVEL,
    createState,
    flipGravity,
    step,
    playerRect
  } = window.GravityKeyRun;

  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const keyMeter = document.getElementById("keyMeter");
  const statusMeter = document.getElementById("statusMeter");
  const flipButton = document.getElementById("flipButton");
  const resetButton = document.getElementById("resetButton");

  let state = createState();
  let lastTime = performance.now();
  let accumulator = 0;
  const fixedDt = 1 / 120;

  function reset() {
    state = createState();
    keyMeter.classList.remove("is-good");
    statusMeter.classList.remove("is-good", "is-alert");
    updateHud();
  }

  function requestFlip() {
    const didFlip = flipGravity(state);
    if (!didFlip && (state.dead || state.won)) reset();
  }

  flipButton.addEventListener("click", requestFlip);
  resetButton.addEventListener("click", reset);
  canvas.addEventListener("pointerdown", requestFlip);
  window.addEventListener("keydown", (event) => {
    if (event.repeat) return;
    if (event.code === "Space" || event.code === "ArrowUp" || event.code === "ArrowDown") {
      event.preventDefault();
      requestFlip();
    }
    if (event.code === "KeyR") {
      reset();
    }
  });

  function frame(now) {
    const frameTime = Math.min(0.08, (now - lastTime) / 1000);
    lastTime = now;
    accumulator += frameTime;
    while (accumulator >= fixedDt) {
      step(state, fixedDt);
      accumulator -= fixedDt;
    }
    draw();
    updateHud();
    requestAnimationFrame(frame);
  }

  function updateHud() {
    keyMeter.textContent = state.hasKey ? "Key: ready" : "Key: missing";
    keyMeter.classList.toggle("is-good", state.hasKey);

    if (state.won) {
      statusMeter.textContent = "Door open";
      statusMeter.classList.add("is-good");
      statusMeter.classList.remove("is-alert");
    } else if (state.dead) {
      statusMeter.textContent = "Reset";
      statusMeter.classList.add("is-alert");
      statusMeter.classList.remove("is-good");
    } else {
      statusMeter.textContent = state.gravitySign > 0 ? "Down" : "Up";
      statusMeter.classList.remove("is-good", "is-alert");
    }
  }

  function draw() {
    drawBackground();
    drawWorldFrame();
    drawGuides();
    drawSolids();
    drawHazards();
    drawDoor();
    if (!state.hasKey) drawKey();
    drawPlayer();
    drawOverlay();
  }

  function drawBackground() {
    const grd = ctx.createLinearGradient(0, 0, 0, LEVEL.height);
    grd.addColorStop(0, "#182438");
    grd.addColorStop(0.42, "#15241f");
    grd.addColorStop(1, "#222112");
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, LEVEL.width, LEVEL.height);

    ctx.save();
    ctx.globalAlpha = 0.12;
    ctx.strokeStyle = "#e9e0c9";
    ctx.lineWidth = 1;
    for (let x = 0; x <= LEVEL.width; x += 24) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, LEVEL.height);
      ctx.stroke();
    }
    for (let y = 0; y <= LEVEL.height; y += 24) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(LEVEL.width, y);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawWorldFrame() {
    ctx.save();
    ctx.strokeStyle = "rgba(255,255,255,0.16)";
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, LEVEL.width - 4, LEVEL.height - 4);
    ctx.restore();
  }

  function drawSolids() {
    for (const solid of LEVEL.solids) {
      const top = ctx.createLinearGradient(solid.x, solid.y, solid.x, solid.y + solid.h);
      top.addColorStop(0, solid.role === "ceiling" ? "#63715a" : "#6f684c");
      top.addColorStop(1, "#343728");
      ctx.fillStyle = top;
      ctx.fillRect(solid.x, solid.y, solid.w, solid.h);

      ctx.fillStyle = "rgba(255,255,255,0.12)";
      if (solid.role === "ceiling") {
        ctx.fillRect(solid.x, solid.y + solid.h - 5, solid.w, 5);
      } else {
        ctx.fillRect(solid.x, solid.y, solid.w, 5);
      }

      ctx.strokeStyle = "rgba(15,20,14,0.8)";
      ctx.lineWidth = 2;
      ctx.strokeRect(solid.x + 1, solid.y + 1, solid.w - 2, solid.h - 2);
    }
  }

  function drawGuides() {
    const pulse = 0.65 + Math.sin(performance.now() / 180) * 0.25;
    for (const guide of LEVEL.guides) {
      ctx.save();
      ctx.globalAlpha = pulse;
      ctx.translate(guide.x + LEVEL.player.w / 2, guide.y);
      if (guide.gravity < 0) {
        ctx.scale(1, -1);
      }
      ctx.fillStyle = "#69b7ff";
      ctx.beginPath();
      ctx.moveTo(-14, -3);
      ctx.lineTo(0, -21);
      ctx.lineTo(14, -3);
      ctx.lineTo(6, -3);
      ctx.lineTo(6, 10);
      ctx.lineTo(-6, 10);
      ctx.lineTo(-6, -3);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,0.62)";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawHazards() {
    for (const hazard of LEVEL.hazards) {
      const count = Math.max(2, Math.floor(hazard.w / 14));
      const spikeW = hazard.w / count;
      ctx.fillStyle = "#ef5d60";
      ctx.strokeStyle = "#5f1718";
      ctx.lineWidth = 2;
      for (let i = 0; i < count; i += 1) {
        const left = hazard.x + i * spikeW;
        ctx.beginPath();
        if (hazard.style === "down") {
          ctx.moveTo(left, hazard.y);
          ctx.lineTo(left + spikeW / 2, hazard.y + hazard.h);
          ctx.lineTo(left + spikeW, hazard.y);
        } else {
          ctx.moveTo(left, hazard.y + hazard.h);
          ctx.lineTo(left + spikeW / 2, hazard.y);
          ctx.lineTo(left + spikeW, hazard.y + hazard.h);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    }
  }

  function drawKey() {
    const key = LEVEL.key;
    const cx = key.x + key.w / 2;
    const cy = key.y + key.h / 2 + Math.sin(performance.now() / 240) * 2;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(Math.sin(performance.now() / 360) * 0.08);
    ctx.strokeStyle = "#5c3b04";
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.arc(-4, 0, 6, 0, Math.PI * 2);
    ctx.moveTo(2, 0);
    ctx.lineTo(15, 0);
    ctx.moveTo(10, 0);
    ctx.lineTo(10, 6);
    ctx.moveTo(15, 0);
    ctx.lineTo(15, 5);
    ctx.stroke();
    ctx.strokeStyle = "#ffd166";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }

  function drawDoor() {
    const door = LEVEL.door;
    ctx.save();
    ctx.fillStyle = state.hasKey ? "#466d47" : "#513b47";
    ctx.fillRect(door.x, door.y, door.w, door.h);
    ctx.fillStyle = state.hasKey ? "#8ed081" : "#7f6170";
    ctx.fillRect(door.x + 6, door.y + 7, door.w - 12, door.h - 7);
    ctx.strokeStyle = "#171a14";
    ctx.lineWidth = 3;
    ctx.strokeRect(door.x + 1.5, door.y + 1.5, door.w - 3, door.h - 3);
    ctx.fillStyle = state.hasKey ? "#ffd166" : "#2a1f27";
    ctx.beginPath();
    ctx.arc(door.x + door.w - 13, door.y + door.h / 2, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawPlayer() {
    const body = playerRect(state);
    const cx = body.x + body.w / 2;
    const cy = body.y + body.h / 2;
    const flipY = state.gravitySign < 0 ? -1 : 1;
    const stride = Math.sin(state.elapsed * 12) * (state.onSurface ? 1 : 0.25);

    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(state.dir, flipY);

    ctx.fillStyle = "#f1ead7";
    ctx.strokeStyle = "#22251a";
    ctx.lineWidth = 2;
    roundRect(ctx, -10, -11, 20, 22, 5);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#69b7ff";
    ctx.fillRect(1, -4, 5, 4);
    ctx.fillStyle = "#1d2630";
    ctx.fillRect(5, -4, 2, 2);

    ctx.strokeStyle = "#22251a";
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-5, 9);
    ctx.lineTo(-8, 13 + stride * 2);
    ctx.moveTo(5, 9);
    ctx.lineTo(8, 13 - stride * 2);
    ctx.stroke();

    ctx.restore();
  }

  function drawOverlay() {
    if (!state.dead && !state.won) return;
    ctx.save();
    ctx.fillStyle = "rgba(12,15,11,0.58)";
    ctx.fillRect(0, 0, LEVEL.width, LEVEL.height);
    ctx.fillStyle = state.won ? "#8ed081" : "#ff8b88";
    ctx.font = "700 40px Inter, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(state.won ? "OPEN" : "RESET", LEVEL.width / 2, LEVEL.height / 2);
    ctx.restore();
  }

  function roundRect(context, x, y, w, h, r) {
    context.beginPath();
    context.moveTo(x + r, y);
    context.arcTo(x + w, y, x + w, y + h, r);
    context.arcTo(x + w, y + h, x, y + h, r);
    context.arcTo(x, y + h, x, y, r);
    context.arcTo(x, y, x + w, y, r);
    context.closePath();
  }

  reset();
  requestAnimationFrame(frame);
})();
