const WIDTH = 960;
const HEIGHT = 540;
const FLOOR_Y = 500;
const FIXED_DT = 1 / 60;
const PLAYER_W = 24;
const PLAYER_H = 30;
const GRAVITY = 0.42;

function createRng(seed = 1) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function rectIntersects(a, b) {
  return !(
    a.x + a.w <= b.x ||
    b.x + b.w <= a.x ||
    a.y + a.h <= b.y ||
    b.y + b.h <= a.y
  );
}

function buildStage(seed, stageNumber = 1) {
  const rng = createRng(seed + stageNumber * 97);
  const levelYs = [468, 388, 308, 228, 148];
  const levelWidth = 160;
  const gapWidth = 120;

  const platforms = [];
  const ladders = [];
  const collectibles = [];
  const hazards = [];

  for (let i = 0; i < levelYs.length; i += 1) {
    const y = levelYs[i];
    const gapCenter = 240 + Math.floor(rng() * 480);
    const leftWidth = Math.max(90, gapCenter - gapWidth / 2 - 20);
    const rightX = gapCenter + gapWidth / 2;
    const rightWidth = WIDTH - rightX - 20;

    platforms.push({ x: 20, y, w: leftWidth, h: 14 });
    platforms.push({ x: rightX, y, w: rightWidth, h: 14 });

    if (i < levelYs.length - 1) {
      const ladderCount = 1 + (rng() < 0.55 ? 1 : 0);
      for (let l = 0; l < ladderCount; l += 1) {
        const x = 80 + Math.floor(rng() * (WIDTH - 160));
        ladders.push({ x, topY: levelYs[i + 1] - 2, bottomY: y + 14, w: 18 });
      }
    }

    const collectibleX = 50 + Math.floor(rng() * (WIDTH - 100));
    const blockedByGap = collectibleX > gapCenter - gapWidth / 2 - 12 && collectibleX < gapCenter + gapWidth / 2 + 12;
    collectibles.push({
      id: `c${i}`,
      x: blockedByGap ? collectibleX + gapWidth : collectibleX,
      y: y - 18,
      w: 14,
      h: 14,
      taken: false,
    });
  }

  hazards.push({ id: "h1", x: 120, y: 292, w: 26, h: 14, vx: 1.7 });
  hazards.push({ id: "h2", x: 770, y: 212, w: 26, h: 14, vx: -1.5 });

  const signature = [
    ...platforms.map((p) => `${Math.round(p.x)}:${Math.round(p.y)}:${Math.round(p.w)}`),
    ...ladders.map((l) => `${Math.round(l.x)}:${Math.round(l.topY)}:${Math.round(l.bottomY)}`),
  ].join("|");

  return {
    stageNumber,
    platforms,
    ladders,
    collectibles,
    hazards,
    signature,
  };
}

function createPlayer() {
  return {
    x: 150,
    y: FLOOR_Y - PLAYER_H,
    w: PLAYER_W,
    h: PLAYER_H,
    vx: 0,
    vy: 0,
    facing: 1,
    onGround: true,
    onLadder: false,
    invuln: 0,
  };
}

function defaultInput() {
  return { left: false, right: false, up: false, jumpPressed: false, swingPressed: false };
}

function findGroundY(state, playerRect) {
  let best = null;
  for (const platform of state.stage.platforms) {
    const overlapX = playerRect.x + playerRect.w > platform.x && playerRect.x < platform.x + platform.w;
    if (!overlapX) continue;
    const top = platform.y;
    if (playerRect.y + playerRect.h <= top + 16) {
      if (best === null || top < best) best = top;
    }
  }
  return best;
}

function touchingLadder(state, p) {
  return state.stage.ladders.find((l) => p.x + p.w / 2 >= l.x && p.x + p.w / 2 <= l.x + l.w && p.y + p.h >= l.topY && p.y <= l.bottomY);
}

function updatePlayer(state, input) {
  const p = state.player;
  const accel = 0.42;
  const maxSpeed = 3.6;

  if (input.left && !input.right) {
    p.vx -= accel;
    p.facing = -1;
  }
  if (input.right && !input.left) {
    p.vx += accel;
    p.facing = 1;
  }
  p.vx *= p.onGround ? 0.78 : 0.92;
  p.vx = clamp(p.vx, -maxSpeed, maxSpeed);

  const ladder = touchingLadder(state, p);
  p.onLadder = Boolean(ladder && input.up);
  if (p.onLadder && ladder) {
    p.vy = -2.1;
    p.x = clamp(ladder.x - (p.w - ladder.w) / 2, 0, WIDTH - p.w);
  } else {
    if (input.jumpPressed && p.onGround) {
      p.vy = -7.4;
      p.onGround = false;
    }
    p.vy += GRAVITY;
    p.vy = clamp(p.vy, -8.5, 7.5);
  }

  p.x = clamp(p.x + p.vx, 0, WIDTH - p.w);
  p.y += p.vy;

  const probe = { x: p.x, y: p.y, w: p.w, h: p.h };
  const groundTop = findGroundY(state, probe);
  const wasFalling = p.vy >= 0;

  if (groundTop !== null && p.y + p.h >= groundTop && p.y + p.h <= groundTop + 14 && wasFalling) {
    p.y = groundTop - p.h;
    p.vy = 0;
    p.onGround = true;
  } else if (!p.onLadder) {
    p.onGround = false;
  }

  if (p.invuln > 0) {
    p.invuln = Math.max(0, p.invuln - FIXED_DT);
  }
}

function loseLife(state, reason) {
  state.lives -= 1;
  state.lastEvent = reason;
  if (state.lives <= 0) {
    state.mode = "gameover";
    return;
  }
  state.player = createPlayer();
  state.player.invuln = 1.4;
}

function updateHazards(state) {
  for (const h of state.stage.hazards) {
    h.x += h.vx;
    if (h.x < 40 || h.x + h.w > WIDTH - 40) h.vx *= -1;

    if (state.player.invuln <= 0 && rectIntersects(state.player, h)) {
      loseLife(state, "Hit by roaming condor");
      if (state.mode !== "playing") return;
    }
  }
}

function updateCollectibles(state) {
  for (const c of state.stage.collectibles) {
    if (c.taken) continue;
    if (rectIntersects(state.player, c)) {
      c.taken = true;
      state.collected += 1;
      state.score += 200;
      state.lastEvent = "Crystal secured";
    }
  }

  if (state.collected === state.stage.collectibles.length && state.mode === "playing") {
    state.score += 500;
    state.mode = "win";
    state.lastEvent = "Summit reached";
  }
}

export function createGame(seed = 20260318) {
  return {
    seed,
    mode: "title",
    width: WIDTH,
    height: HEIGHT,
    floorY: FLOOR_Y,
    elapsed: 0,
    score: 0,
    lives: 3,
    collected: 0,
    stageNumber: 1,
    lastEvent: "Ready",
    player: createPlayer(),
    stage: buildStage(seed, 1),
  };
}

export function startGame(state) {
  state.mode = "playing";
  state.elapsed = 0;
  state.score = 0;
  state.lives = 3;
  state.collected = 0;
  state.stageNumber = 1;
  state.lastEvent = "Climb";
  state.player = createPlayer();
  state.stage = buildStage(state.seed, state.stageNumber);
}

export function resetToTitle(state, seed = state.seed) {
  const fresh = createGame(seed);
  Object.assign(state, fresh);
}

export function togglePause(state) {
  if (state.mode === "playing") state.mode = "paused";
  else if (state.mode === "paused") state.mode = "playing";
}

export function stepGame(state, input = defaultInput()) {
  if (state.mode !== "playing") return;

  updatePlayer(state, input);

  if (state.player.y > HEIGHT - 20 || state.player.x < 26 || state.player.x > WIDTH - 26) {
    state.mode = "gameover";
    state.lastEvent = "Fell from mountain";
    return;
  }

  updateHazards(state);
  updateCollectibles(state);

  state.elapsed += FIXED_DT;
}

export function advanceByMs(state, input = defaultInput(), ms = 16) {
  const steps = Math.max(1, Math.round(ms / (1000 / 60)));
  for (let i = 0; i < steps; i += 1) {
    stepGame(state, input);
    input.jumpPressed = false;
    input.swingPressed = false;
  }
}

export function snapshot(state) {
  return {
    mode: state.mode,
    coordinateSystem: "origin top-left; +x right; +y down; units in canvas px",
    elapsedSeconds: Number(state.elapsed.toFixed(2)),
    score: state.score,
    lives: state.lives,
    collected: state.collected,
    collectiblesTotal: state.stage.collectibles.length,
    stageNumber: state.stageNumber,
    stageSignature: state.stage.signature,
    lastEvent: state.lastEvent,
    player: {
      x: Number(state.player.x.toFixed(1)),
      y: Number(state.player.y.toFixed(1)),
      vx: Number(state.player.vx.toFixed(2)),
      vy: Number(state.player.vy.toFixed(2)),
      onGround: state.player.onGround,
      onLadder: state.player.onLadder,
    },
    hazards: state.stage.hazards.map((h) => ({
      id: h.id,
      x: Number(h.x.toFixed(1)),
      y: Number(h.y.toFixed(1)),
      vx: Number(h.vx.toFixed(2)),
    })),
  };
}

export function getStageSignature(state) {
  return state.stage.signature;
}

export function setSingleCollectibleScenario(state) {
  state.mode = "playing";
  state.player.x = 280;
  state.player.y = 300;
  state.player.vx = 0;
  state.player.vy = 0;
  state.player.onGround = false;
  state.stage.collectibles = [
    { id: "solo-a", x: 285, y: 302, w: 14, h: 14, taken: false },
    { id: "solo-b", x: 860, y: 150, w: 14, h: 14, taken: false },
  ];
  state.collected = 0;
  state.score = 0;
  state.lastEvent = "Scripted collectible";
}

export function movePlayerTo(state, x, y) {
  state.player.x = x;
  state.player.y = y;
  state.player.vx = 0;
  state.player.vy = 0;
}
