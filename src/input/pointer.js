// src/input/pointer.js
import { state } from "../core/state.js";
import { firePlayerBullet } from "../systems/projectiles.js";
import { constants } from "../core/constants.js";

export function attachPointer() {
  const canvas = state.canvas || document.getElementById("gameCanvas");
  if (!canvas) {
    console.warn("[pointer] no canvas yet; will retry on next startGame()");
    return;
  }

  // Avoid duplicate bindings
  if (canvas._pointerBound) return;
  canvas._pointerBound = true;

  const onMouseMove = (e) => {
    const rect = canvas.getBoundingClientRect();
    state.pointerX = e.clientX - rect.left;
    state.pointerY = e.clientY - rect.top;
  };
  const onMouseDown = (e) => { e.preventDefault(); try { firePlayerBullet(); } catch {} };
  const onTouchMove = (e) => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const t = e.touches[0];
    if (!t) return;
    state.pointerX = t.clientX - rect.left;
    state.pointerY = t.clientY - rect.top;
  };
  const onTouchStart = (e) => { e.preventDefault(); try { firePlayerBullet(); } catch {} };

  canvas.addEventListener("mousemove", onMouseMove);
  canvas.addEventListener("mousedown", onMouseDown);
  canvas.addEventListener("touchmove", onTouchMove, { passive: false });
  canvas.addEventListener("touchstart", onTouchStart, { passive: false });

  // gentle pointer-follow
  if (!state._pointerFollowTimer) {
    state._pointerFollowTimer = setInterval(() => {
      if (!state.gameStarted) return;
      const { pointerX, pointerY, tank } = state;
      if (!tank || pointerX == null || pointerY == null) return;
      tank.x += (pointerX - tank.x - tank.width/2) * 0.22;
      tank.y += (pointerY - tank.y - tank.height/2) * 0.22;
      const c = state.canvas;
      if (!c) return;
      tank.x = Math.max(0, Math.min(c.width - tank.width, tank.x));
      tank.y = Math.max(0, Math.min(c.height - (constants.bottomBarHeight||48) - tank.height, tank.y));
    }, 30);
  }

  console.log("[pointer] bound");
}
