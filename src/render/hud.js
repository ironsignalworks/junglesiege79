import { state } from "../core/state.js";
import { constants } from "../core/constants.js";

export function drawHUD(ctx) {
  const padding = Math.max(10, state.canvas.width * 0.02);
  const barWidth = 130;
  const barHeight = Math.max(18, state.canvas.height * 0.023);
  const bottomY = state.canvas.height - constants.bottomBarHeight;

  ctx.fillStyle = 'rgba(0, 0, 0, 0.82)';
  ctx.fillRect(0, bottomY, state.canvas.width, constants.bottomBarHeight);

  const fontSize = Math.max(12, Math.min(20, state.canvas.width * 0.028));
  ctx.font = `bold ${fontSize}px 'VT323', 'Orbitron', monospace`;
  ctx.fillStyle = "white";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";

  const label = (state.canvas.width < 500) ? "HP" : "HEALTH";
  const labelX = padding;
  const labelY = bottomY + 6;
  ctx.fillText(label, labelX, labelY);

  const labelWidth = ctx.measureText(label).width;
  const labelMargin = 18;
  const barX = labelX + labelWidth + labelMargin;
  const barY = labelY - 1;

  ctx.fillStyle = "#333";
  ctx.fillRect(barX, barY, barWidth, barHeight);

  const hp = Math.max(0, Math.min(100, state.health)) / 100;
  const w = barWidth * hp;
  ctx.fillStyle = hp > 0.6 ? "#4CAF50" : hp > 0.3 ? "#FF9800" : "#F44336";
  ctx.fillRect(barX, barY, w, barHeight);
  ctx.strokeStyle = "white";
  ctx.lineWidth = 2;
  ctx.strokeRect(barX, barY, barWidth, barHeight);

  let x = barX + barWidth + 28;
  const y = labelY;
  const short = state.canvas.width < 500;

  ctx.fillText(short ? "AM" : "AMMO", x, y);
  x += ctx.measureText(short ? "AM" : "AMMO  ").width;
  ctx.fillText(String(state.ammo), x, y);
  x += ctx.measureText(String(state.ammo) + "  ").width;

  ctx.fillText("SCORE", x, y);
  x += ctx.measureText("SCORE  ").width;
  ctx.fillText(String(state.score), x, y);
  x += ctx.measureText(String(state.score) + "  ").width;

  ctx.fillText(short ? "RD" : "ROUND", x, y);
  x += ctx.measureText(short ? "RD  " : "ROUND  ").width;
  ctx.fillText(String(state.round), x, y);
  x += ctx.measureText(String(state.round) + "  ").width;

  ctx.fillText(short ? "BOSS" : "BOSS INCOMING", x, y);
  x += ctx.measureText(short ? "BOSS  " : "BOSS INCOMING  ").width;
  ctx.fillText(String(state.bossTriggerCount > 0 ? state.bossTriggerCount : 0), x, y);

  if (state.fps > 0) {
    ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
    ctx.font = `${Math.round(fontSize * 0.7)}px 'VT323', 'Orbitron', monospace`;
    if (state.canvas.width > 600) {
      ctx.fillText(`FPS: ${state.fps}`, state.canvas.width - 80, state.canvas.height - 10);
    } else {
      ctx.fillText(`FPS: ${state.fps}`, state.canvas.width - 60, state.canvas.height - constants.bottomBarHeight - 8);
    }
  }
}

export function drawCombo(ctx) {
  if (state.comboTimer > 0 && state.comboDisplay) {
    ctx.save();
    ctx.globalAlpha = Math.max(0.5, state.comboTimer / 25);
    ctx.font = "bold 2.5em 'VT323', 'Orbitron', monospace";
    ctx.fillStyle = "#ffe400";
    ctx.textAlign = "center";
    ctx.fillText(state.comboDisplay, state.canvas.width / 2, state.canvas.height * 0.16);
    ctx.restore();
    state.comboTimer--;
  }
}
