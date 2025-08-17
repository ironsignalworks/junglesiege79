// systems/napalm.js
import { state, playSound } from "../core/state.js";
import { resources } from "../assets/resources.js";

/** Initialize / reset per-run napalm state */
export function initNapalmState() {
  state.napalm = {
    // unlock logic
    ready: false,
    streak: { count: 0, expires: 0, windowMs: 1800, hitsRequired: 5 },

    // entities
    bomber: null,    // { x,y,w,h,vx,img,sign,flip,dropsLeft,nextDropX }
    bombs: [],       // { x,y,vy,alive }
    explosions: [],  // { x,y,frame,frameTime }

    // config
    cfg: {
      direction: "rtl",            // "rtl" (→ left) or "ltr"
      flipSpriteWhenRTL: true,     // flip image if moving RTL
      bomberSpeed: 3.2,            // px/frame
      bomberAltitude: 90,          // y in px
      bomberScale: 1.25,           // uniform scale (keeps aspect)
      dropsPerRun: 3,
      dropSpacingPx: 180,          // horizontal spacing between drops
      bombGravity: 0.18,
      bombVyStart: 1.2,
      explodeRadius: 110,          // kill radius
      explosionFrameMs: 80,        // xp1 → xp2 → xp3 timing
    }
  };
}

export function resetNapalm() {
  if (!state.napalm) return;
  state.napalm.ready = false;
  state.napalm.streak.count = 0;
  state.napalm.streak.expires = 0;
  state.napalm.bomber = null;
  state.napalm.bombs.length = 0;
  state.napalm.explosions.length = 0;
}

/** Call when a player bullet hits the boss */
export function bumpBossHitStreak(now = performance.now()) {
  if (!state.napalm) initNapalmState();
  const s = state.napalm.streak;
  if (now > s.expires) s.count = 0;
  s.count++;
  s.expires = now + s.windowMs;
  if (!state.napalm.ready && s.count >= s.hitsRequired) {
    state.napalm.ready = true;
  }
}

/** User action (keyboard N or button) to fire the strike */
export function triggerNapalmStrike() {
  if (!state.napalm || !state.napalm.ready || state.napalm.bomber) return;

  const { cfg } = state.napalm;
  const img = resources.images["bomber.png"];
  const natW = (img && img.width) || 96;
  const natH = (img && img.height) || 48;
  const w = Math.round(natW * cfg.bomberScale);
  const h = Math.round(natH * cfg.bomberScale);

  const rtl = cfg.direction === "rtl";
  const sign = rtl ? -1 : 1;
  const vx = sign * cfg.bomberSpeed;

  const xStart = rtl ? (state.canvas.width + w + 30) : (-w - 30);
  const y = cfg.bomberAltitude;

  state.napalm.bomber = {
    x: xStart,
    y,
    w, h,
    vx,
    img,
    sign,
    flip: rtl && cfg.flipSpriteWhenRTL,
    dropsLeft: cfg.dropsPerRun,
    nextDropX: xStart + sign * cfg.dropSpacingPx
  };

  // consume readiness
  state.napalm.ready = false;
  state.napalm.streak.count = 0;
  state.napalm.streak.expires = 0;
}

/** Draw a tiny HUD badge on the bottom bar when ready */
export function drawNapalmHUD(ctx) {
  const n = state.napalm;
  if (!n || !n.ready) return;
  const x = 12, y = state.canvas.height - 28;
  ctx.save();
  ctx.font = "bold 14px monospace";
  ctx.fillStyle = "#ffeb3b";
  ctx.strokeStyle = "#000";
  ctx.lineWidth = 3;
  const text = "NAPALM READY [N]";
  ctx.strokeText(text, x, y);
  ctx.fillText(text, x, y);
  ctx.restore();
}

/** Update & render: bomber, bombs and explosion FX */
export function updateAndRenderNapalm(ctx, now) {
  if (!state.napalm) return;
  const { bomber, bombs, explosions, cfg } = state.napalm;

  // --- Bomber ---
  if (bomber) {
    bomber.x += bomber.vx;

    // draw bomber with preserved aspect; flip if needed
    if (bomber.img instanceof HTMLImageElement || bomber.img instanceof HTMLCanvasElement) {
      ctx.save();
      if (bomber.flip) {
        // flip around bomber center
        ctx.translate(bomber.x + bomber.w / 2, bomber.y + bomber.h / 2);
        ctx.scale(-1, 1);
        ctx.drawImage(bomber.img, -bomber.w / 2, -bomber.h / 2, bomber.w, bomber.h);
      } else {
        ctx.drawImage(bomber.img, bomber.x, bomber.y, bomber.w, bomber.h);
      }
      ctx.restore();
    } else {
      // fallback rect
      ctx.save();
      ctx.fillStyle = "#607d8b";
      ctx.fillRect(bomber.x, bomber.y, bomber.w, bomber.h);
      ctx.restore();
    }

    // drop logic: when crossing nextDropX in the movement direction
    const crossed =
      (bomber.sign > 0 && bomber.x >= bomber.nextDropX) ||
      (bomber.sign < 0 && bomber.x <= bomber.nextDropX);

    if (bomber.dropsLeft > 0 && crossed) {
      spawnBomb(bomber.x + bomber.w * 0.5, bomber.y + bomber.h * 0.7);
      bomber.dropsLeft--;
      bomber.nextDropX += bomber.sign * cfg.dropSpacingPx;
    }

    // remove bomber after it fully leaves screen
    if ((bomber.sign < 0 && bomber.x + bomber.w < -40) ||
        (bomber.sign > 0 && bomber.x > state.canvas.width + 40)) {
      state.napalm.bomber = null;
    }
  }

  // --- Bombs ---
  for (let i = bombs.length - 1; i >= 0; i--) {
    const b = bombs[i];
    b.vy += cfg.bombGravity;
    b.y += b.vy;

    const img = resources.images["napalm.png"];
    if (img instanceof HTMLImageElement || img instanceof HTMLCanvasElement) {
      const w = img.width, h = img.height;
      ctx.drawImage(img, b.x - w / 2, b.y - h / 2, w, h);
    } else {
      ctx.save();
      ctx.fillStyle = "#ff9800";
      ctx.beginPath();
      ctx.arc(b.x, b.y, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // ground or off-screen → explode
    if (b.y >= state.canvas.height - (state.bottomBarHeight || 48) - 10) {
      spawnExplosion(b.x, b.y - 10);
      bombs.splice(i, 1);
      continue;
    }
  }

  // --- Explosions ---
  for (let i = explosions.length - 1; i >= 0; i--) {
    const e = explosions[i];
    if (!e.started) { e.started = now; e.last = now; }
    const dt = now - e.last;
    if (dt >= cfg.explosionFrameMs) {
      e.frame++;
      e.last = now;
    }

    const frameKey = e.frame === 0 ? "xp1.png" : e.frame === 1 ? "xp2.png" : "xp3.png";
    const img = resources.images[frameKey];
    const radius = cfg.explodeRadius;

    // damage window mainly on first two frames
    if (!e.didDamage && e.frame <= 1) {
      e.didDamage = true;
      // wipe zombies
      for (let zi = state.zombies.length - 1; zi >= 0; zi--) {
        const z = state.zombies[zi];
        if (dist2(e.x, e.y, z.x + z.width / 2, z.y + z.height / 2) <= radius * radius) {
          state.zombies.splice(zi, 1);
          state.score += 10;
        }
      }
      // damage boss
      if (state.bossActive && state.boss && state.boss.isAlive) {
        if (dist2(e.x, e.y, state.boss.x + state.boss.width / 2, state.boss.y + state.boss.height / 2) <= (radius + 30) * (radius + 30)) {
          state.boss.health = Math.max(0, state.boss.health - 12); // tune damage
        }
      }
      try { playSound && resources?.audio?.fxExplosion && playSound(resources.audio.fxExplosion); } catch {}
      state.screenShake = Math.max(state.screenShake || 0, 12);
      state.flashWhite = Math.max(state.flashWhite || 0, 0.2);
    }

    // draw
    if (img instanceof HTMLImageElement || img instanceof HTMLCanvasElement) {
      const w = img.width, h = img.height;
      ctx.drawImage(img, e.x - w / 2, e.y - h / 2, w, h);
    } else {
      ctx.save();
      const alpha = e.frame === 0 ? 0.9 : e.frame === 1 ? 0.7 : 0.4;
      ctx.fillStyle = `rgba(255,140,0,${alpha})`;
      ctx.beginPath();
      ctx.arc(e.x, e.y, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    if (e.frame > 2) {
      explosions.splice(i, 1);
    }
  }
}

/* --------------------------- helpers (internal) --------------------------- */

function spawnBomb(x, y) {
  const { bombs, cfg } = state.napalm;
  bombs.push({ x, y, vy: cfg.bombVyStart, alive: true });
}

function spawnExplosion(x, y) {
  state.napalm.explosions.push({ x, y, frame: 0, frameTime: 0, didDamage: false });
}

function dist2(x1, y1, x2, y2) {
  const dx = x1 - x2, dy = y1 - y2;
  return dx * dx + dy * dy;
}
