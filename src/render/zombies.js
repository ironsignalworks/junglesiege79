import { resources } from "../assets/resources.js";
import { state } from "../core/state.js";
export function drawZombies(ctx) {
  for (const z of state.zombies) {
    const key = z.type + ".png";
    if (resources.images[key]) {
      ctx.drawImage(resources.images[key], z.x, z.y, z.width, z.height);
    } else {
      ctx.fillStyle = z.type === "zombie4" ? "#006600"
                   : z.type === "zombie3" ? "#009900"
                   : z.type === "zombie2" ? "#8B0000" : "#F44336";
      ctx.fillRect(z.x, z.y, z.width, z.height);
    }
  }
}
