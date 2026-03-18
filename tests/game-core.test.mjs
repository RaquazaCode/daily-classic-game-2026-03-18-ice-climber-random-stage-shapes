import assert from "node:assert/strict";
import {
  advanceByMs,
  createGame,
  getStageSignature,
  movePlayerTo,
  setSingleCollectibleScenario,
  snapshot,
  startGame,
  stepGame,
} from "../src/game-core.js";

function runFrames(state, frames, input) {
  for (let i = 0; i < frames; i += 1) {
    stepGame(state, input);
    input.jumpPressed = false;
    input.swingPressed = false;
  }
}

{
  const a = createGame(77);
  const b = createGame(77);
  const c = createGame(78);
  startGame(a);
  startGame(b);
  startGame(c);
  assert.equal(getStageSignature(a), getStageSignature(b), "same seed must keep same stage shape");
  assert.notEqual(getStageSignature(a), getStageSignature(c), "different seed should alter stage shape");
}

{
  const state = createGame(90);
  startGame(state);
  const input = { left: false, right: true, up: false, jumpPressed: true, swingPressed: false };
  runFrames(state, 20, input);
  assert.ok(state.player.x > 160, "player should move right");
  assert.ok(state.player.y < 486, "jump should lift player");
}

{
  const state = createGame(11);
  startGame(state);
  setSingleCollectibleScenario(state);
  const input = { left: false, right: false, up: false, jumpPressed: false, swingPressed: false };
  runFrames(state, 6, input);
  assert.equal(state.collected, 1, "collectible should be collected in scenario");
  assert.ok(state.score >= 200, "collecting should score points");
}

{
  const state = createGame(222);
  startGame(state);
  const input = { left: false, right: false, up: false, jumpPressed: false, swingPressed: false };
  const before = snapshot(state);
  advanceByMs(state, input, 1000);
  const after = snapshot(state);
  assert.notEqual(before.elapsedSeconds, after.elapsedSeconds, "advanceByMs should move deterministic time");
}

{
  const state = createGame(303);
  startGame(state);
  movePlayerTo(state, 20, 505);
  const input = { left: false, right: false, up: false, jumpPressed: false, swingPressed: false };
  runFrames(state, 2, input);
  assert.equal(state.mode, "gameover", "falling into pit should trigger game over");
}

console.log("game-core tests passed");
