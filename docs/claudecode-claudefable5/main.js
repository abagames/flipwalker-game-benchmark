/*
 * FlipWalker — browser front end.
 *
 * All game rules live in game-core.js; this file only handles input,
 * rendering and feedback (particles, screen shake, sound).
 */
(function () {
  "use strict";

  const Core = window.GameCore;
  const TILE = Core.TILE;
  const W = Core.COLS * TILE;
  const H = Core.ROWS * TILE;

  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  canvas.width = W;
  canvas.height = H;

  // ----- game state ------------------------------------------------------
  let state = Core.newState();
  let flips = 0;
  let deaths = 0;
  let elapsedFrames = 0;
  let flipBuffer = 0; // input buffering: a press slightly before landing still flips
  let deathTimer = 0;
  let winFrames = -1;
  let message = "";
  let messageTimer = 0;
  let shake = 0;
  let squash = 0;
  let keyGlow = 0;
  const particles = [];

  const FLIP_BUFFER_FRAMES = 8;
  const DEATH_PAUSE_FRAMES = 40;

  function showMessage(text, frames) {
    message = text;
    messageTimer = frames;
  }
  showMessage("SPACE / TAP — flip gravity", 240);

  function restart() {
    state = Core.newState();
    flips = 0;
    deaths = 0;
    elapsedFrames = 0;
    flipBuffer = 0;
    deathTimer = 0;
    winFrames = -1;
    particles.length = 0;
    shake = 0;
    squash = 0;
    showMessage("SPACE / TAP — flip gravity", 240);
  }

  // ----- sound (tiny WebAudio synth, no assets) --------------------------
  let audio = null;
  function ensureAudio() {
    if (audio || !window.AudioContext) return;
    try {
      audio = new AudioContext();
    } catch (e) {
      audio = null;
    }
  }
  function beep(freq, dur, type, vol, slide) {
    if (!audio || audio.state === "suspended") {
      if (audio) audio.resume();
      if (!audio) return;
    }
    try {
      const t = audio.currentTime;
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      osc.type = type || "square";
      osc.frequency.setValueAtTime(freq, t);
      if (slide) osc.frequency.exponentialRampToValueAtTime(slide, t + dur);
      gain.gain.setValueAtTime(vol || 0.06, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(gain).connect(audio.destination);
      osc.start(t);
      osc.stop(t + dur);
    } catch (e) {
      /* sound is decorative */
    }
  }
  function sfxFlip() {
    beep(300, 0.12, "square", 0.05, state.g < 0 ? 600 : 150);
  }
  function sfxKey() {
    beep(660, 0.1, "triangle", 0.08);
    setTimeout(function () {
      beep(880, 0.12, "triangle", 0.08);
    }, 90);
    setTimeout(function () {
      beep(1320, 0.18, "triangle", 0.08);
    }, 180);
  }
  function sfxDie() {
    beep(220, 0.3, "sawtooth", 0.07, 55);
  }
  function sfxWin() {
    [523, 659, 784, 1047].forEach(function (f, i) {
      setTimeout(function () {
        beep(f, 0.22, "triangle", 0.08);
      }, i * 110);
    });
  }
  function sfxLocked() {
    beep(180, 0.12, "square", 0.05);
  }

  // ----- input ------------------------------------------------------------
  function pressFlip() {
    ensureAudio();
    if (state.won) return;
    flipBuffer = FLIP_BUFFER_FRAMES;
  }
  window.addEventListener("keydown", function (e) {
    if (e.code === "Space") {
      e.preventDefault();
      if (!e.repeat) pressFlip();
    } else if (e.code === "KeyR") {
      ensureAudio();
      restart();
    }
  });
  canvas.addEventListener("pointerdown", function (e) {
    e.preventDefault();
    if (state.won) {
      ensureAudio();
      restart();
    } else {
      pressFlip();
    }
  });

  // ----- particles ---------------------------------------------------------
  function burst(x, y, color, count, speed) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = (0.3 + Math.random()) * speed;
      particles.push({
        x: x,
        y: y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v,
        life: 20 + Math.random() * 20,
        max: 40,
        color: color,
        size: 1.5 + Math.random() * 2.5,
      });
    }
  }
  function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.96;
      p.vy *= 0.96;
      p.life--;
      if (p.life <= 0) particles.splice(i, 1);
    }
  }

  // ----- fixed-timestep loop ------------------------------------------------
  const STEP_MS = 1000 / 60;
  let last = performance.now();
  let acc = 0;

  function frame(now) {
    acc += Math.min(now - last, 100);
    last = now;
    while (acc >= STEP_MS) {
      acc -= STEP_MS;
      tick();
    }
    render();
    requestAnimationFrame(frame);
  }

  function tick() {
    updateParticles();
    if (messageTimer > 0) messageTimer--;
    if (shake > 0) shake *= 0.85;
    if (squash > 0) squash *= 0.8;
    if (keyGlow > 0) keyGlow--;

    if (state.won) {
      winFrames++;
      return;
    }
    if (deathTimer > 0) {
      deathTimer--;
      if (deathTimer === 0) {
        Core.respawn(state);
        flipBuffer = 0;
      }
      return;
    }

    elapsedFrames++;
    const wantFlip = flipBuffer > 0;
    if (flipBuffer > 0) flipBuffer--;
    const ev = Core.step(state, wantFlip);

    if (ev.flipped) {
      flips++;
      flipBuffer = 0;
      sfxFlip();
      burst(
        state.x + Core.PLAYER_W / 2,
        state.y + (state.g > 0 ? 0 : Core.PLAYER_H),
        "#7df9ff",
        8,
        2
      );
    }
    if (ev.landed && ev.impact > 3) {
      squash = Math.min(0.45, ev.impact * 0.05);
    }
    if (ev.gotKey) {
      sfxKey();
      keyGlow = 50;
      burst(Core.keyBox.x + 10, Core.keyBox.y + 10, "#ffd84d", 24, 3);
      showMessage("Key acquired — now reach the door!", 180);
    }
    if (ev.atLockedDoor && messageTimer <= 0) {
      sfxLocked();
      showMessage("The door is locked. Find the key.", 120);
    }
    if (ev.died) {
      deaths++;
      deathTimer = DEATH_PAUSE_FRAMES;
      shake = 8;
      sfxDie();
      burst(
        state.x + Core.PLAYER_W / 2,
        state.y + Core.PLAYER_H / 2,
        "#ff5470",
        28,
        3.5
      );
      showMessage("Ouch! Try again.", 90);
    }
    if (ev.won) {
      winFrames = 0;
      shake = 4;
      sfxWin();
      burst(state.x + Core.PLAYER_W / 2, state.y + Core.PLAYER_H / 2, "#9dff8a", 40, 4);
    }
  }

  // ----- rendering ------------------------------------------------------------
  // Pre-rendered static layer: background, walls, spikes.
  const staticLayer = document.createElement("canvas");
  staticLayer.width = W;
  staticLayer.height = H;
  (function drawStatic() {
    const g = staticLayer.getContext("2d");

    const grad = g.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, "#0d1226");
    grad.addColorStop(1, "#1a2138");
    g.fillStyle = grad;
    g.fillRect(0, 0, W, H);

    // faint deterministic stars
    let seed = 7;
    function rnd() {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed / 0x7fffffff;
    }
    for (let i = 0; i < 70; i++) {
      const x = rnd() * W;
      const y = rnd() * H;
      g.fillStyle = "rgba(255,255,255," + (0.04 + rnd() * 0.1) + ")";
      g.fillRect(x, y, 1.6, 1.6);
    }

    // walls
    for (let r = 0; r < Core.ROWS; r++) {
      for (let c = 0; c < Core.COLS; c++) {
        if (Core.MAP[r][c] !== "#") continue;
        const x = c * TILE;
        const y = r * TILE;
        g.fillStyle = "#2b3a57";
        g.fillRect(x, y, TILE, TILE);
        // light the exposed edges
        g.fillStyle = "#43597f";
        if (!Core.solidAt(c, r - 1)) g.fillRect(x, y, TILE, 3);
        if (!Core.solidAt(c, r + 1)) g.fillRect(x, y + TILE - 3, TILE, 3);
        if (!Core.solidAt(c - 1, r)) g.fillRect(x, y, 3, TILE);
        if (!Core.solidAt(c + 1, r)) g.fillRect(x + TILE - 3, y, 3, TILE);
        g.fillStyle = "rgba(0,0,0,0.12)";
        if ((c + r) % 2 === 0) g.fillRect(x, y, TILE, TILE);
      }
    }

    // spikes (3 teeth per tile)
    for (let i = 0; i < Core.spikes.length; i++) {
      const sp = Core.spikes[i];
      const baseX = sp.c * TILE;
      const up = sp.dir === "up";
      const baseY = up ? (sp.r + 1) * TILE : sp.r * TILE;
      const tipY = up ? baseY - 22 : baseY + 22;
      const sg = g.createLinearGradient(0, baseY, 0, tipY);
      sg.addColorStop(0, "#a32441");
      sg.addColorStop(1, "#ff5470");
      g.fillStyle = sg;
      for (let t = 0; t < 3; t++) {
        const x0 = baseX + 1 + t * 10;
        g.beginPath();
        g.moveTo(x0, baseY);
        g.lineTo(x0 + 10, baseY);
        g.lineTo(x0 + 5, tipY);
        g.closePath();
        g.fill();
      }
    }
  })();

  function roundRect(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }

  function drawDoor(t) {
    const cells = Core.doorCells;
    const x = cells[0].c * TILE;
    const y = cells[0].r * TILE;
    const w = TILE * cells.length;
    const open = state.hasKey;
    // frame / arch rising into the row above
    ctx.fillStyle = open ? "#3f6b4a" : "#54442e";
    roundRect(ctx, x + 4, y - TILE + 8, w - 8, TILE * 2 - 8, 10);
    ctx.fill();
    ctx.fillStyle = open ? "#5fae6e" : "#7a6442";
    roundRect(ctx, x + 9, y - TILE + 13, w - 18, TILE * 2 - 13, 7);
    ctx.fill();
    if (open) {
      const pulse = 0.25 + 0.15 * Math.sin(t * 0.1);
      ctx.fillStyle = "rgba(157,255,138," + pulse + ")";
      roundRect(ctx, x + 9, y - TILE + 13, w - 18, TILE * 2 - 13, 7);
      ctx.fill();
    }
    // lock plate
    ctx.fillStyle = open ? "#bdf3c2" : "#ffd84d";
    ctx.beginPath();
    ctx.arc(x + w / 2, y + 6, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = open ? "#3f6b4a" : "#54442e";
    ctx.fillRect(x + w / 2 - 1.5, y + 6, 3, 7);
  }

  function drawKey(t) {
    if (state.hasKey) {
      if (keyGlow > 0) {
        ctx.fillStyle = "rgba(255,216,77," + keyGlow / 120 + ")";
        ctx.beginPath();
        ctx.arc(
          Core.keyBox.x + 10,
          Core.keyBox.y + 10,
          (50 - keyGlow) * 0.8 + 8,
          0,
          Math.PI * 2
        );
        ctx.fill();
      }
      return;
    }
    const cx = Core.keyBox.x + 10;
    const cy = Core.keyBox.y + 10 + Math.sin(t * 0.06) * 3;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(Math.sin(t * 0.03) * 0.25);
    ctx.shadowColor = "#ffd84d";
    ctx.shadowBlur = 14;
    ctx.strokeStyle = "#ffd84d";
    ctx.fillStyle = "#ffd84d";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(-4, 0, 5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillRect(1, -1.5, 10, 3);
    ctx.fillRect(7, 0, 3, 6);
    ctx.fillRect(11, 0, 3, 5);
    ctx.restore();
  }

  function drawPlayer(t) {
    if (deathTimer > 0) return;
    const s = state;
    const cx = s.x + Core.PLAYER_W / 2;
    const cy = s.y + Core.PLAYER_H / 2;
    ctx.save();
    ctx.translate(cx, cy);
    if (s.g < 0) ctx.scale(1, -1); // stand on ceilings upside-down
    const sq = squash;
    ctx.scale(1 + sq, 1 - sq);

    // body
    const grad = ctx.createLinearGradient(0, -13, 0, 13);
    grad.addColorStop(0, "#8ef6ff");
    grad.addColorStop(1, "#3ac4e0");
    ctx.fillStyle = grad;
    roundRect(ctx, -9, -13, 18, 26, 5);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.5)";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // eyes look in the walking direction
    const ex = s.dir * 3;
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(-4 + ex, -5, 3.4, 0, Math.PI * 2);
    ctx.arc(4 + ex, -5, 3.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#15314a";
    ctx.beginPath();
    ctx.arc(-4 + ex + s.dir * 1.4, -5, 1.7, 0, Math.PI * 2);
    ctx.arc(4 + ex + s.dir * 1.4, -5, 1.7, 0, Math.PI * 2);
    ctx.fill();

    // little feet shuffle
    const ph = Math.sin(t * 0.5) * 2.5;
    ctx.fillStyle = "#2697b3";
    ctx.fillRect(-7 + ph, 11, 5, 3);
    ctx.fillRect(2 - ph, 11, 5, 3);
    ctx.restore();

    // gravity direction hint while airborne
    if (!s.grounded && !s.won) {
      ctx.fillStyle = "rgba(125,249,255,0.5)";
      ctx.beginPath();
      const ay = s.g > 0 ? s.y + Core.PLAYER_H + 8 : s.y - 8;
      const d = s.g > 0 ? 1 : -1;
      ctx.moveTo(cx - 5, ay);
      ctx.lineTo(cx + 5, ay);
      ctx.lineTo(cx, ay + 5 * d);
      ctx.closePath();
      ctx.fill();
    }
  }

  function formatTime(framesCount) {
    const s = framesCount / 60;
    return s.toFixed(1) + "s";
  }

  function render() {
    const t = performance.now() / (1000 / 60);
    ctx.save();
    if (shake > 0.3) {
      ctx.translate(
        (Math.random() - 0.5) * shake,
        (Math.random() - 0.5) * shake
      );
    }

    ctx.drawImage(staticLayer, 0, 0);
    drawDoor(t);
    drawKey(t);
    drawPlayer(t);

    // particles
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      ctx.globalAlpha = Math.max(0, p.life / p.max);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;

    // HUD
    ctx.font = "bold 13px 'Segoe UI', system-ui, sans-serif";
    ctx.textAlign = "left";
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.fillText("Flips " + flips, 12, 20);
    ctx.fillText("Deaths " + deaths, 80, 20);
    ctx.fillText(
      "Time " + formatTime(state.won ? elapsedFrames : elapsedFrames),
      165,
      20
    );
    if (state.hasKey) {
      ctx.fillStyle = "#ffd84d";
      ctx.fillText("✓ KEY", 255, 20);
    }

    if (messageTimer > 0 && !state.won) {
      const a = Math.min(1, messageTimer / 30);
      ctx.globalAlpha = a;
      ctx.font = "bold 16px 'Segoe UI', system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillStyle = "rgba(13,18,38,0.7)";
      const tw = ctx.measureText(message).width;
      roundRect(ctx, W / 2 - tw / 2 - 14, 30, tw + 28, 28, 8);
      ctx.fill();
      ctx.fillStyle = "#dfe8ff";
      ctx.fillText(message, W / 2, 49);
      ctx.globalAlpha = 1;
    }

    // win overlay
    if (state.won) {
      const fade = Math.min(1, winFrames / 30);
      ctx.fillStyle = "rgba(8,12,24," + fade * 0.72 + ")";
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = fade;
      ctx.textAlign = "center";
      ctx.fillStyle = "#9dff8a";
      ctx.font = "bold 40px 'Segoe UI', system-ui, sans-serif";
      ctx.fillText("LEVEL COMPLETE!", W / 2, H / 2 - 30);
      ctx.fillStyle = "#dfe8ff";
      ctx.font = "16px 'Segoe UI', system-ui, sans-serif";
      ctx.fillText(
        "Time " +
          formatTime(elapsedFrames) +
          "   ·   Flips " +
          flips +
          "   ·   Deaths " +
          deaths,
        W / 2,
        H / 2 + 6
      );
      ctx.fillStyle = "rgba(223,232,255,0.8)";
      ctx.fillText("Press R or tap to play again", W / 2, H / 2 + 40);
      ctx.globalAlpha = 1;
    }

    ctx.restore();
  }

  requestAnimationFrame(frame);

  // Read-only debug handle for automated testing / GIF recording.
  window.__flipwalker = {
    get state() {
      return state;
    },
    get frame() {
      return elapsedFrames;
    },
    get flips() {
      return flips;
    },
    get deaths() {
      return deaths;
    },
  };
})();
