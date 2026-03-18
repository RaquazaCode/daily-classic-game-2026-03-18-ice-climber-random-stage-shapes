# Design - Ice Climber: Random Stage Shapes

## Goal
Ship a deterministic browser MVP inspired by Ice Climber with strong unattended automation safety. The game must include movement, jumping, ladder climbing, collision hazards, scoring, restart, and pause/reset support.

## Core Loop
1. Start from title with `Enter`.
2. Traverse layered platforms and climb ladders.
3. Collect all crystals while dodging condor hazards.
4. Clear stage on full collection or lose on pit/life depletion.

## Twist
Random Stage Shapes are generated from a seed-driven RNG that controls gap positions and ladder lanes. Equal seeds produce equal stage signatures, while different seeds produce different shapes.

## Determinism and Hooks
- Fixed-step update loop at 60 FPS in `stepGame`.
- `advanceByMs` executes deterministic frame counts.
- Browser automation hooks:
  - `window.advanceTime(ms)`
  - `window.render_game_to_text()`

## Testing Strategy
- Node test validates deterministic stage signature, movement/jump response, collectible scoring, advance-time stepping, and pit fail state.
- Playwright test validates start flow, scripted collectible scenario, paused state, and required capture artifacts.
