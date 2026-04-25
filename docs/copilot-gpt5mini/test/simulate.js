#!/usr/bin/env node
const Game = require('../src/game.js');

const level = {
  width: 800, height: 400,
  startX: 50,
  speed: 120,
  g: 2000,
  platforms: [
    { x: 0, y: 340, w: 200, h: 60, oneSided: true },
    { x: 200, y: 60, w: 150, h: 20, oneSided: true },
    { x: 360, y: 260, w: 60, h: 20, oneSided: true },
    { x: 420, y: 340, w: 60, h: 60, oneSided: true },
    { x: 480, y: 60, w: 170, h: 20, oneSided: true },
    { x: 650, y: 340, w: 150, h: 60, oneSided: true },
    { x: -10, y: 0, w: 10, h: 400, solid: true },
    { x: 800, y: 0, w: 10, h: 400, solid: true }
  ],
  key: { x: 380, y: 232, w: 12, h: 12 },
  door: { x: 760, y: 312, w: 28, h: 36 }
};

const game = new Game(level);

// Flip when character's x passes these positions (tuned)
const flipPositions = [160, 323, 423, 720];
let flipIndex = 0;

const dt = 1/60;
const maxSteps = 60 * 40; // 40 seconds
let step = 0;
let lastKeyCollected = false;

console.log('Starting simulation, flips at x:', flipPositions);

while(step++ < maxSteps){
  if(flipIndex < flipPositions.length && game.char.x >= flipPositions[flipIndex]){
    game.flipGravity();
    console.log(`t=${(game.time).toFixed(2)}s x=${game.char.x.toFixed(1)} flip -> gravity=${game.gravityDir > 0 ? 'down' : 'up'}`);
    flipIndex++;
  }
  game.step(dt);
  if(!lastKeyCollected && game.keyCollected){ console.log('Key collected at t=', game.time.toFixed(2), 'x=', game.char.x.toFixed(1)); lastKeyCollected = true; }
  if(game.keyCollected && game.win){
    console.log(`SUCCESS: collected key and reached door at t=${game.time.toFixed(2)}s x=${game.char.x.toFixed(1)}`);
    process.exit(0);
  }
}
console.log('Simulation ended without success. keyCollected=', game.keyCollected, 'win=', game.win, 'char.x=', game.char.x.toFixed(1));
process.exit(2);
