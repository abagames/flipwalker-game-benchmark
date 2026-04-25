import { getSolutionPlan, simulateSolution } from "./src/game-logic.mjs";

const result = simulateSolution(getSolutionPlan());

for (const line of result.transcript) {
  console.log(line);
}

if (result.unspentSteps.length > 0) {
  console.error(
    `Verification failed: ${result.unspentSteps.length} scripted flips were never used.`,
  );
  process.exit(1);
}

if (result.state.dead) {
  console.error("Verification failed: the intended solution dies before reaching the door.");
  process.exit(1);
}

if (!result.state.collectedKey) {
  console.error("Verification failed: the key was not collected.");
  process.exit(1);
}

if (!result.state.won) {
  console.error("Verification failed: the door was not reached.");
  process.exit(1);
}

console.log(
  `Verification passed in ${result.state.time.toFixed(2)}s with ${getSolutionPlan().length} planned flips.`,
);
