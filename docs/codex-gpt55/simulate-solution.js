#!/usr/bin/env node

"use strict";

const { LEVEL, simulateSolution } = require("./physics.js");

const result = simulateSolution({ dt: 1 / 240, maxTime: 20 });

console.log("Gravity Key Run solution simulation");
console.log(`World: ${LEVEL.width}x${LEVEL.height}`);
console.log(`Result: ${result.success ? "PASS" : "FAIL"}`);
console.log(`Flips used: ${result.flipsUsed}/${LEVEL.solution.length}`);
console.log("");
console.log("Step log:");
for (const event of result.events) {
  const gravity = event.gravity ? ` gravity=${event.gravity > 0 ? "down" : "up"}` : "";
  console.log(
    `- t=${event.time.toFixed(3)}s x=${event.x.toFixed(2)} y=${event.y.toFixed(2)}${gravity} ${event.label}`
  );
}
console.log("");
console.log(
  `Final: x=${result.state.x.toFixed(2)} y=${result.state.y.toFixed(2)} key=${result.state.hasKey} won=${result.state.won} dead=${result.state.dead}`
);

if (!result.success) {
  if (result.state.dead) {
    console.error(`Failed because the runner died: ${result.state.deathReason}`);
  } else {
    console.error("Failed because the planned route did not reach the keyed door in time.");
  }
  process.exit(1);
}
