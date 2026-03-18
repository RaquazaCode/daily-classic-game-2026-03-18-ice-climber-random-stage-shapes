import {
  advanceByMs,
  createGame,
  resetToTitle,
  setSingleCollectibleScenario,
  snapshot,
  startGame,
  stepGame,
  togglePause,
} from "./game-core.js";

const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d");
const state = createGame(20260318);

const input = {
  left: false,
  right: false,
  up: false,
  jumpPressed: false,
  swingPressed: false,
};

function drawBackground() {
  ctx.fillStyle = "#9fe3ff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#daf4ff";
  for (let i = 0; i < 7; i += 1) {
    ctx.beginPath();
    ctx.ellipse(70 + i * 140 + Math.sin(state.elapsed + i) * 8, 80 + (i % 2) * 32, 48, 20, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawTerrain() {
  ctx.fillStyle = "#f7fbff";
  for (const p of state.stage.platforms) {
    ctx.fillRect(p.x, p.y, p.w, p.h);
    ctx.fillStyle = "#9ed0ea";
    ctx.fillRect(p.x, p.y + 8, p.w, 6);
    ctx.fillStyle = "#f7fbff";
  }

  ctx.fillStyle = "#4f6f8d";
  for (const l of state.stage.ladders) {
    ctx.fillRect(l.x, l.topY, l.w, l.bottomY - l.topY);
    ctx.fillStyle = "#b6d5ea";
    for (let r = l.topY + 6; r < l.bottomY - 4; r += 10) {
      ctx.fillRect(l.x - 2, r, l.w + 4, 2);
    }
    ctx.fillStyle = "#4f6f8d";
  }
}

function drawEntities() {
  for (const c of state.stage.collectibles) {
    if (c.taken) continue;
    ctx.fillStyle = "#f7c331";
    ctx.fillRect(c.x, c.y, c.w, c.h);
    ctx.strokeStyle = "#9e7004";
    ctx.lineWidth = 2;
    ctx.strokeRect(c.x, c.y, c.w, c.h);
  }

  ctx.fillStyle = "#5f2c82";
  for (const h of state.stage.hazards) {
    ctx.fillRect(h.x, h.y, h.w, h.h);
    ctx.fillStyle = "#f0d7ff";
    ctx.fillRect(h.x + 4, h.y + 3, 4, 4);
    ctx.fillRect(h.x + h.w - 8, h.y + 3, 4, 4);
    ctx.fillStyle = "#5f2c82";
  }

  if (!(state.player.invuln > 0 && Math.floor(state.elapsed * 12) % 2 === 0)) {
    ctx.fillStyle = "#0f2747";
    ctx.fillRect(state.player.x, state.player.y, state.player.w, state.player.h);
    ctx.fillStyle = "#81d5ff";
    ctx.fillRect(state.player.x + 5, state.player.y - 8, 14, 10);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(state.player.x + (state.player.facing > 0 ? 17 : 3), state.player.y + 10, 4, 4);
  }
}

function drawHud() {
  ctx.fillStyle = "rgba(5, 22, 44, 0.9)";
  ctx.fillRect(0, 0, canvas.width, 42);
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 18px Trebuchet MS";
  ctx.fillText(`Score ${state.score}`, 14, 27);
  ctx.fillText(`Lives ${state.lives}`, 180, 27);
  ctx.fillText(`Crystals ${state.collected}/${state.stage.collectibles.length}`, 300, 27);
  ctx.fillText(state.lastEvent, 620, 27);
}

function drawOverlay() {
  if (state.mode === "playing") return;

  ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";

  if (state.mode === "title") {
    ctx.font = "bold 54px Trebuchet MS";
    ctx.fillText("Ice Climber", canvas.width / 2, 200);
    ctx.font = "bold 30px Trebuchet MS";
    ctx.fillText("Random Stage Shapes", canvas.width / 2, 245);
    ctx.font = "20px Trebuchet MS";
    ctx.fillText("Enter start | Arrows move | Space jump | Up climb", canvas.width / 2, 310);
    ctx.fillText("P pause | R reset", canvas.width / 2, 340);
  }

  if (state.mode === "paused") {
    ctx.font = "bold 56px Trebuchet MS";
    ctx.fillText("Paused", canvas.width / 2, 230);
    ctx.font = "21px Trebuchet MS";
    ctx.fillText("Press P to continue", canvas.width / 2, 270);
  }

  if (state.mode === "gameover") {
    ctx.font = "bold 56px Trebuchet MS";
    ctx.fillText("Game Over", canvas.width / 2, 225);
    ctx.font = "21px Trebuchet MS";
    ctx.fillText(`Final score ${state.score}`, canvas.width / 2, 268);
    ctx.fillText("Press Enter to restart", canvas.width / 2, 298);
  }

  if (state.mode === "win") {
    ctx.font = "bold 56px Trebuchet MS";
    ctx.fillText("Stage Cleared", canvas.width / 2, 225);
    ctx.font = "21px Trebuchet MS";
    ctx.fillText(`Final score ${state.score}`, canvas.width / 2, 268);
    ctx.fillText("Press Enter to replay", canvas.width / 2, 298);
  }

  ctx.textAlign = "start";
}

function render() {
  drawBackground();
  drawTerrain();
  drawEntities();
  drawHud();
  drawOverlay();
}

let previous = performance.now();
let accumulator = 0;
let raf = 0;

function frame(now) {
  const dt = Math.min(0.05, (now - previous) / 1000);
  previous = now;
  accumulator += dt;

  while (accumulator >= 1 / 60) {
    stepGame(state, input);
    input.jumpPressed = false;
    input.swingPressed = false;
    accumulator -= 1 / 60;
  }

  render();
  raf = requestAnimationFrame(frame);
}

window.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();
  if (key === "arrowleft") input.left = true;
  if (key === "arrowright") input.right = true;
  if (key === "arrowup") input.up = true;
  if (key === " " || key === "spacebar") input.jumpPressed = true;
  if (key === "enter") {
    if (state.mode === "title" || state.mode === "gameover" || state.mode === "win") {
      startGame(state);
    }
  }
  if (key === "p") togglePause(state);
  if (key === "r") resetToTitle(state, 20260318);
});

window.addEventListener("keyup", (event) => {
  const key = event.key.toLowerCase();
  if (key === "arrowleft") input.left = false;
  if (key === "arrowright") input.right = false;
  if (key === "arrowup") input.up = false;
});

window.advanceTime = (ms) => {
  advanceByMs(state, input, ms);
  render();
};

window.render_game_to_text = () => JSON.stringify(snapshot(state));
window.__setupCollectibleScenario = () => setSingleCollectibleScenario(state);

render();
raf = requestAnimationFrame(frame);
window.addEventListener("beforeunload", () => cancelAnimationFrame(raf));
