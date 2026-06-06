#!/usr/bin/env node
import { SOLUTION_FLIPS } from './level.js';
import { simulate } from './physics.js';

const { state, time } = simulate(SOLUTION_FLIPS);

if (state.dead) {
  console.error(`FAIL: died at t=${time.toFixed(2)}s pos=(${state.x.toFixed(2)},${state.y.toFixed(2)})`);
  process.exit(1);
}
if (!state.hasKey) {
  console.error(`FAIL: finished without key at t=${time.toFixed(2)}s`);
  process.exit(1);
}
if (!state.won) {
  console.error(`FAIL: has key but no win at t=${time.toFixed(2)}s pos=(${state.x.toFixed(2)},${state.y.toFixed(2)})`);
  process.exit(1);
}

console.log(`OK: won in ${time.toFixed(2)}s with ${SOLUTION_FLIPS.length} flips`);
