// Simulation harness. Runs the game with a given flip schedule and reports
// whether the player won. Used to verify that a designed level is completable.

const core = require('./game-core.js');
const { T, PW, PH, W, H, LEVEL, newPlayer, step, tryFlip, tileAt } = core;

function render(p) {
  const rows = LEVEL.map(r => r.split(''));
  const px = Math.floor((p.x + PW / 2) / T);
  const py = Math.floor((p.y + PH / 2) / T);
  if (py >= 0 && py < H && px >= 0 && px < W) {
    rows[py][px] = p.alive ? (p.won ? '*' : '@') : 'X';
  }
  return rows.map(r => r.join('')).join('\n');
}

function simulate(flipFrames, opts = {}) {
  const maxFrames = opts.maxFrames || 2000;
  const trace = opts.trace || false;
  const p = newPlayer();
  const flipSet = new Set(flipFrames);
  const events = [];
  for (let frame = 0; frame < maxFrames; frame++) {
    if (flipSet.has(frame)) {
      const ok = tryFlip(p);
      events.push(`f${frame}: flip ${ok ? 'OK' : 'FAIL (not on surface)'} at x=${p.x.toFixed(1)},y=${p.y.toFixed(1)}`);
    }
    step(p);
    if (trace && (frame % 5 === 0 || flipSet.has(frame))) {
      const col = (p.x / T).toFixed(2);
      const row = (p.y / T).toFixed(2);
      console.log(`f${frame}: x=${p.x.toFixed(1)} y=${p.y.toFixed(1)} col=${col} row=${row} vx=${p.vx} vy=${p.vy.toFixed(2)} g=${p.gravity} onSurf=${p.onSurface} key=${p.hasKey}`);
    }
    if (p.won) {
      return { won: true, alive: true, frame, events, player: p };
    }
    if (!p.alive) {
      return { won: false, alive: false, frame, events, player: p };
    }
  }
  return { won: false, alive: p.alive, frame: maxFrames, events, player: p, timeout: true };
}

// Parse command-line flip frames, e.g. `node simulate.js 70 180 260`.
const argFlips = process.argv.slice(2).map(Number).filter(n => !Number.isNaN(n));
const trace = process.env.TRACE === '1';

console.log('=== Level ===');
console.log(LEVEL.join('\n'));
console.log('');
console.log('Flip frames:', argFlips.join(', ') || '(none)');
console.log('');

const result = simulate(argFlips, { trace });
console.log('');
console.log('Events:');
result.events.forEach(e => console.log('  ' + e));
console.log('');
console.log(`Result: won=${result.won} alive=${result.alive} frame=${result.frame} hasKey=${result.player.hasKey}`);
console.log(`Final: x=${result.player.x.toFixed(1)} y=${result.player.y.toFixed(1)} col=${(result.player.x / T).toFixed(2)} row=${(result.player.y / T).toFixed(2)}`);
console.log('');
console.log('Final board:');
console.log(render(result.player));
