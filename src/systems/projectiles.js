// src/game/projectiles.js
import { state, playSound } from "../core/state.js";
import { resources } from "../assets/resources.js";
import { constants } from "../core/constants.js";

/* ------------------ helpers ------------------ */

function isCanvasCtx(x) {
  return !!x && typeof x.drawImage === "function" && typeof x.save === "function";
}

function drawSpriteOrRect(ctx, img, x, y, w, h, fallbackFill = "yellow") {
  if (img instanceof HTMLImageElement || img instanceof HTMLCanvasElement) {
    ctx.drawImage(img, x, y, w, h);
  } else {
    ctx.save();
    ctx.fillStyle = fallbackFill;
    ctx.fillRect(x, y, w, h);
    ctx.restore();
  }
}

/* --------------- player bullets --------------- */

export function firePlayerBullet() {
  if (!state.gameStarted || state.ammo <= 0) return;
  state.bullets.push({
    x: state.tank.x + state.tank.width / 2 - 13,
    y: state.tank.y,
    width: 27,
    height: 27,
    dx: 0,
    dy: constants.bullet.dy,
    type: "ammo1.png"
  });
  state.ammo--;
  playSound?.(resources.audio?.fxShot);
}


/**
 * updatePlayerBullets(ctx?) — ctx optional (falls back to state.ctx)
 */
export function updatePlayerBullets(ctx) {
  ctx = isCanvasCtx(ctx) ? ctx : state.ctx;
  if (!isCanvasCtx(ctx)) return;

  const { canvas } = state;

  // cull with padded bounds
  state.bullets = state.bullets.filter(
    (b) =>
      b.y > -b.height &&
      b.y < canvas.height + b.height &&
      b.x > -b.width &&
      b.x < canvas.width + b.width
  );

  for (let i = 0; i < state.bullets.length; i++) {
    const b = state.bullets[i];

    const vx = b.dx ?? b.vx ?? 0;
    const vy = b.dy ?? b.vy ?? 0;
    b.x += vx;
    b.y += vy;

    const img = (b.type && resources.images?.[b.type]) || resources.images?.["ammo1.png"];
    drawSpriteOrRect(ctx, img, b.x, b.y, b.width, b.height, "yellow");
  }
}

/* --------------- enemy bullets --------------- */

/**
 * updateEnemyBullets(ctx?, onHitTank?)
 *
 * Compatible with legacy calls like:
 *   updateEnemyBullets(updateFn, onHitTank, onEnemyHit, pushEnemyBullet)
 * In that case, we ignore the extra callbacks and just use state.ctx.
 *
 * onHitTank(eb, index) should return true if it handled/removes the bullet.
 */
export function updateEnemyBullets(ctx, onHitTank) {
  // If first arg isn't a real 2D context, treat it as legacy signature and shift.
  if (!isCanvasCtx(ctx)) {
    onHitTank = typeof arguments[1] === "function" ? arguments[1] : onHitTank;
    ctx = state.ctx;
  }
  if (!isCanvasCtx(ctx)) return;

  const hitFn = typeof onHitTank === "function" ? onHitTank : () => false;
  const { enemyBullets, canvas } = state;

  for (let i = enemyBullets.length - 1; i >= 0; i--) {
    const eb = enemyBullets[i];

    const vx = eb.dx ?? eb.vx ?? 0;
    const vy = eb.dy ?? eb.vy ?? 0;
    eb.x += vx;
    eb.y += vy;

    const img = (eb.type && resources.images?.[eb.type]) || resources.images?.["ammo1.png"];
    drawSpriteOrRect(ctx, img, eb.x, eb.y, eb.width, eb.height, "#ffc107");

    // let caller handle tank collision/removal
    if (hitFn(eb, i)) continue;

    // cull off-screen
    if (
      eb.x < -40 ||
      eb.x > canvas.width + 40 ||
      eb.y < -40 ||
      eb.y > canvas.height + 40
    ) {
      enemyBullets.splice(i, 1);
    }
  }
}

/** Optional helper to add enemy bullets safely */
export function pushEnemyBullet(bullet) {
  if (!bullet) return;
  const b = {
    x: 0,
    y: 0,
    width: 27,
    height: 27,
    dx: 0,
    dy: 0,
    type: "ammo.png",
    ...bullet
  };
  if (!Number.isFinite(b.x) || !Number.isFinite(b.y)) return;
  if (!Number.isFinite(b.width) || !Number.isFinite(b.height)) return;
  state.enemyBullets.push(b);
}

