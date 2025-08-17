import { state } from "../core/state.js";
import { firePlayerBullet } from "../systems/projectiles.js";

export function attachKeyboard() {
  document.addEventListener("keydown", onDown);
  document.addEventListener("keyup", onUp);
}

function onDown(e) {
  if (e.key === "ArrowLeft" || e.key === "a") state.keyLeft = true;
  if (e.key === "ArrowRight" || e.key === "d") state.keyRight = true;
  if (e.key === "ArrowUp" || e.key === "w") state.keyUp = true;
  if (e.key === "ArrowDown" || e.key === "s") state.keyDown = true;
  if (e.key === " " || e.key === "Spacebar") firePlayerBullet();
}

function onUp(e) {
  if (e.key === "ArrowLeft" || e.key === "a") state.keyLeft = false;
  if (e.key === "ArrowRight" || e.key === "d") state.keyRight = false;
  if (e.key === "ArrowUp" || e.key === "w") state.keyUp = false;
  if (e.key === "ArrowDown" || e.key === "s") state.keyDown = false;
}
