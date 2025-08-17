// loop.js
import { state } from "./state.js";

/**
 * Creates a RAF loop that ALWAYS schedules the next frame,
 * but only updates/renders while the game is started.
 */
export function gameLoopFactory(update, render) {
  const safeUpdate = typeof update === "function" ? update : () => {};
  const safeRender = typeof render === "function" ? render : () => {};

  return function gameLoop(currentTime) {
    if (state.gameStarted) {
      // FPS bookkeeping
      state.frameCount++;
      if (currentTime - state.lastTime >= 1000) {
        state.fps = state.frameCount;
        state.frameCount = 0;
        state.lastTime = currentTime;
      }
      safeUpdate(currentTime);
      safeRender(currentTime);
    }
    requestAnimationFrame(gameLoop); // keep chain alive regardless
  };
}
