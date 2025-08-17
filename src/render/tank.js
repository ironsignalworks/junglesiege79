import { resources } from "../assets/resources.js";
import { state } from "../core/state.js";
export function drawTank(ctx) {
  const { tank } = state;
  const img = resources.images["tank.png"];
  if (img) ctx.drawImage(img, tank.x, tank.y, tank.width, tank.height);
  else { ctx.fillStyle = "#4CAF50"; ctx.fillRect(tank.x, tank.y, tank.width, tank.height); }
}
