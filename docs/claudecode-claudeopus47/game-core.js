// Shared game logic - usable from both the browser game and the Node simulator.
// Exposes as globals when loaded in a <script> tag, and via module.exports in Node.

(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    Object.assign(root, api);
  }
})(typeof self !== 'undefined' ? self : this, function () {

  const LEVEL = [
    "############################",
    "#                         D#",
    "#                          #",
    "#   ####                   #",
    "#                          #",
    "#                  K       #",
    "#                          #",
    "#                ########  #",
    "#                          #",
    "# P      ^^^^^    ^^^^^^   #",
    "############################",
  ];

  const T = 32;                 // tile size (px)
  const PW = 20;                // player width
  const PH = 24;                // player height
  const WALK = 2;               // horizontal px/frame
  const GRAV = 0.8;             // px/frame^2
  const MAX_VY = 12;            // terminal velocity

  const W = LEVEL[0].length;
  const H = LEVEL.length;

  function findStart() {
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++)
        if (LEVEL[y][x] === 'P') return { x, y };
    return { x: 1, y: H - 2 };
  }

  function isSolid(tx, ty) {
    if (tx < 0 || tx >= W || ty < 0 || ty >= H) return true;
    return LEVEL[ty][tx] === '#';
  }

  function tileAt(tx, ty) {
    if (tx < 0 || tx >= W || ty < 0 || ty >= H) return '#';
    return LEVEL[ty][tx];
  }

  function newPlayer() {
    const s = findStart();
    return {
      x: s.x * T + (T - PW) / 2,
      y: s.y * T + (T - PH) / 2,
      vx: WALK,         // starts walking right
      vy: 0,
      gravity: 1,       // 1 = down, -1 = up
      onSurface: true,
      alive: true,
      won: false,
      hasKey: false,
    };
  }

  function bbox(p) {
    return {
      left: Math.floor(p.x / T),
      right: Math.floor((p.x + PW - 1) / T),
      top: Math.floor(p.y / T),
      bottom: Math.floor((p.y + PH - 1) / T),
    };
  }

  function step(p) {
    if (!p.alive || p.won) return;

    // Horizontal
    p.x += p.vx;
    let b = bbox(p);
    let hitH = false;
    for (let ty = b.top; ty <= b.bottom; ty++) {
      if (p.vx > 0 && isSolid(b.right, ty)) hitH = true;
      if (p.vx < 0 && isSolid(b.left, ty)) hitH = true;
    }
    if (hitH) {
      if (p.vx > 0) p.x = b.right * T - PW;
      else p.x = (b.left + 1) * T;
      p.vx *= -1;
    }

    // Vertical (gravity)
    p.vy += GRAV * p.gravity;
    if (p.vy > MAX_VY) p.vy = MAX_VY;
    if (p.vy < -MAX_VY) p.vy = -MAX_VY;
    p.y += p.vy;

    b = bbox(p);
    let hitFloor = false, hitCeil = false;
    for (let tx = b.left; tx <= b.right; tx++) {
      if (p.vy > 0 && isSolid(tx, b.bottom)) hitFloor = true;
      if (p.vy < 0 && isSolid(tx, b.top)) hitCeil = true;
    }
    if (hitFloor) {
      p.y = b.bottom * T - PH;
      p.vy = 0;
    } else if (hitCeil) {
      p.y = (b.top + 1) * T;
      p.vy = 0;
    }
    p.onSurface = (hitFloor && p.gravity === 1) || (hitCeil && p.gravity === -1);

    // Hazards & pickups
    b = bbox(p);
    for (let ty = b.top; ty <= b.bottom; ty++) {
      for (let tx = b.left; tx <= b.right; tx++) {
        const tile = tileAt(tx, ty);
        if (tile === '^' || tile === 'v') {
          p.alive = false;
          return;
        }
        if (tile === 'K') {
          p.hasKey = true;
        }
        if (tile === 'D' && p.hasKey) {
          p.won = true;
        }
      }
    }
  }

  function tryFlip(p) {
    if (p.alive && !p.won && p.onSurface) {
      p.gravity *= -1;
      p.vy = 0;
      p.onSurface = false;
      return true;
    }
    return false;
  }

  return {
    LEVEL, T, PW, PH, WALK, GRAV, MAX_VY, W, H,
    isSolid, tileAt, newPlayer, bbox, step, tryFlip,
  };
});
