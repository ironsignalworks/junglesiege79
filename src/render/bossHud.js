import { state } from "../core/state.js";
import { resources } from "../assets/resources.js";

export function drawBossHealthBar(ctx) {
  const boss = state.boss;
  if (boss && boss.isAlive) {
    let bw = state.canvas.width * 0.8;
    let bh = 22;
    let bx = (state.canvas.width - bw) / 2;
    let by = 22;
    ctx.save();
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#111";
    ctx.fillRect(bx, by, bw, bh);
    ctx.fillStyle = "#f03333";
    ctx.fillRect(bx, by, bw * (boss.health / boss.maxHealth), bh);
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 3;
    ctx.strokeRect(bx, by, bw, bh);
    ctx.font = "bold 18px Arial, sans-serif";
    ctx.fillStyle = "#fff";
    ctx.fillText(boss.name, bx + 12, by + bh - 5);

    if (boss.projectileType && resources.images[boss.projectileType]) {
      ctx.drawImage(resources.images[boss.projectileType], bx + 120, by, 32, 32);
    }
    ctx.restore();
  }
}
