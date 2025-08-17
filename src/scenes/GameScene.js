// GameScene.js
import { state, playSound } from "../core/state.js";
import { constants } from "../core/constants.js";
import { resources } from "../assets/resources.js";
import { updatePlayerBullets, updateEnemyBullets } from "../systems/projectiles.js";
import { nextRound, updateZombies } from "../systems/spawn.js";
import { isColliding } from "../systems/collisions.js";
import { drawBackground } from "../render/background.js";
import { drawTank } from "../render/tank.js";
import { drawZombies } from "../render/zombies.js";
import { applyScreenEffects } from "../render/effects.js";
import { drawHUD, drawCombo } from "../render/hud.js";
import { drawBossHealthBar } from "../render/bossHud.js";
import { showEndScreen } from "../ui/screens.js";
import { Boss, bossDefinitions } from "../systems/boss.js";

// 🔥 Napalm system (modular)
import {
  initNapalmState,
  resetNapalm,
  bumpBossHitStreak,
  triggerNapalmStrike,
  updateAndRenderNapalm,
  drawNapalmHUD
} from "../systems/napalm.js";

/* ------------------------------ helpers ---------------------------------- */
function hasShieldActive() {
  return (state.shieldUntil || 0) > Date.now();
}
function bossLineForName(name) {
  const k = (name || "").toLowerCase();
  if (k.includes("kurtz")) return "you're an errand boy...";
  if (k.includes("katana") || k.includes("joe")) return "ready to slice!";
  if (k.includes("melissa")) return "i can teach you how to use this.";
  return "prepare yourself.";
}

/* ----------------------- boss backdrop (cover-fit) ------------------------ */
function drawBossBackdrop(ctx) {
  let key = null;
  if (state.bossAnnouncementShowing) {
    const def = bossDefinitions[state.bossIndex];
    key = def && def.backdrop;
  } else if (state.bossActive && state.boss && state.boss.backdrop) {
    key = state.boss.backdrop;
  }
  if (!key) return;

  const img = resources.images[key];
  if (!img) return;

  const cw = state.canvas.width, ch = state.canvas.height;
  const iw = img.width, ih = img.height;
  if (!iw || !ih) return;

  const scale = Math.max(cw / iw, ch / ih);
  const w = Math.ceil(iw * scale);
  const h = Math.ceil(ih * scale);
  const x = Math.floor((cw - w) / 2);
  const y = Math.floor((ch - h) / 2);
  ctx.drawImage(img, x, y, w, h);
}

/* -------------------- canvas-based boss intro config ---------------------- */
function initBossIntro() {
  const def  = bossDefinitions[state.bossIndex] || {};
  const name = def.name || "BOSS";
  const img  = def.image ? resources.images[def.image] : null;

  state._bossIntro = {
    name,
    line: bossLineForName(name),

    img,
    startedAt: 0,
    typedChars: 0,
    lastType: 0,

    // Tune feel here:
    typeSpeed: 90,     // ms per char (↑ = slower)
    preDelay: 600,     // ms before typing starts
    doneHold: 1800,    // ms to hold after finished typing

    // Layout/animation:
    heightScale: 1.0,  // % of canvas height for portrait
    sideCrop: 0.8,     // portion of width used to anchor at right side
    floatAmp: 8,       // gentle vertical float in px
  };
}

function drawBossIntro(ctx, now) {
  const bi = state._bossIntro;
  if (!bi) return;

  if (!bi.startedAt) bi.startedAt = now;
  if (!bi.lastType)  bi.lastType  = now + bi.preDelay - bi.typeSpeed;

  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.78)";
  ctx.fillRect(0, 0, state.canvas.width, state.canvas.height);

  // Top bar
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = "rgba(255,60,60,0.6)";
  ctx.shadowBlur = 18;
  ctx.fillStyle = "#ff3b3b";
  ctx.font = "900 22px monospace";
  ctx.fillText("INCOMING  —  " + bi.name.toUpperCase(), state.canvas.width / 2, 42);

  // Big right portrait
  const floatY = Math.sin(now / 480) * bi.floatAmp;
  if (bi.img instanceof HTMLImageElement || bi.img instanceof HTMLCanvasElement) {
    const maxH = Math.floor(state.canvas.height * bi.heightScale);
    const ratio = (bi.img.width / bi.img.height) || 1;
    const h = maxH;
    const w = Math.round(h * ratio);
    const x = Math.floor(state.canvas.width - w * bi.sideCrop);
    const y = Math.floor(state.canvas.height * 0.18 - h * 0.1 + floatY);
    ctx.drawImage(bi.img, x, y, w, h);
  }

  // Typewriter text column (bigger + pushed right)
  const leftPad  = Math.floor(state.canvas.width * 0.30);
  const colWidth = Math.floor(state.canvas.width * 0.42);
  const midY     = Math.floor(state.canvas.height * 0.50);

  if (now - bi.lastType >= bi.typeSpeed && bi.typedChars < bi.line.length) {
    bi.typedChars++;
    bi.lastType = now;
    if (bi.typedChars === bi.line.length) bi.doneAt = now;
  }

  const typed = bi.line.slice(0, bi.typedChars);
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.shadowColor = "rgba(255,60,60,0.6)";
  ctx.shadowBlur = 18;
  ctx.fillStyle = "#ff3b3b";
  ctx.font = "900 34px monospace";

  // Word-wrap
  const lineH = 40;
  const words = typed.split(" ");
  let line = "";
  let y = midY - lineH;
  for (let i = 0; i < words.length; i++) {
    const test = (line ? line + " " : "") + words[i];
    if (ctx.measureText(test).width > colWidth && line) {
      ctx.fillText(line, leftPad, y);
      line = words[i];
      y += lineH;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, leftPad, y);

  // caret while typing
  if (bi.typedChars < bi.line.length) {
    if (Math.floor(now / 400) % 2 === 0) {
      const caretX = leftPad + ctx.measureText(line).width + 12;
      ctx.fillText("▌", caretX, y);
    }
  }

  ctx.restore();

  // Auto-start after doneHold
  if (bi.typedChars >= bi.line.length && now - bi.doneAt >= bi.doneHold) {
    startBossFight();
  }
}

/* -------------------------------- scene ---------------------------------- */
export class GameScene {
  enter() {
    state.canvas = document.getElementById("gameCanvas");
    state.ctx = state.canvas.getContext("2d");

    state.canvas.style.display = "block";
    const startScreen = document.getElementById("start-screen");
    if (startScreen) startScreen.style.display = "none";

    state.tank = { x: state.canvas.width / 2 - 32, y: state.canvas.height - 100, width: 64, height: 64 };
    state.health = 100;
    state.ammo = 50;
    state.score = 0;
    state.round = 1;
    state.zombies = [];
    state.bullets = [];
    state.enemyBullets = [];
    state.ammoDrops = [];
    state.medkitDrops = [];

    state.bossIndex = 0;
    state.bossActive = false;
    state.bossDefeated = false;
    state.bossTriggerCount = 10;
    state.bossAnnouncementShowing = false;
    state.spawningInProgress = false;
    state.bossProjectiles = [];

    if (state.resourcesLoaded && resources.audio.bgm) {
      resources.audio.bgm.loop = true;
      resources.audio.bgm.volume = 0.5;
      resources.audio.bgm.play().catch(() => {});
    }

    // 🔥 Napalm: init + keyboard shortcut (N)
    initNapalmState();
    this._onNapalmKey = (e) => {
      if ((e.key === "n" || e.key === "N") && state.napalm?.ready && !state.bossAnnouncementShowing) {
        e.preventDefault();
        triggerNapalmStrike();
      }
    };
    window.addEventListener("keydown", this._onNapalmKey);

    nextRound();
  }

  exit() {
    if (this._onNapalmKey) window.removeEventListener("keydown", this._onNapalmKey);
  }

  onPlayerHit(amount = 10, fromCollision = false) {
    if (hasShieldActive()) {
      try { playSound && resources?.audio?.fxPickup && playSound(resources.audio.fxPickup); } catch {}
      state.flashWhite = Math.max(state.flashWhite || 0, 0.15);
      state.screenShake = Math.max(state.screenShake || 0, fromCollision ? 8 : 6);
      return;
    }
    state.health = Math.max(0, (state.health || 0) - amount);
    try { playSound && resources?.audio?.fxHurt && playSound(resources.audio.fxHurt); } catch {}
    state.flashRed = Math.max(state.flashRed || 0, fromCollision ? 0.4 : 0.25);
    state.screenShake = Math.max(state.screenShake || 0, fromCollision ? 10 : 7);

    if (state.health <= 0) this.gameOver();
  }

  update(now) {
    const ctx = state.ctx;

    ctx.clearRect(0, 0, state.canvas.width, state.canvas.height);
    ctx.save();
    applyScreenEffects(ctx);

    drawBackground(ctx);      // rotating jungle bg
    drawBossBackdrop(ctx);    // boss-specific backdrop when active/intro

    // Pause everything during canvas boss intro
    if (state.bossAnnouncementShowing) {
      drawBossIntro(ctx, now);
      ctx.restore();
      drawHUD(ctx);
      drawCombo(ctx);
      return;
    }

    // movement
    if (state.keyLeft)  state.tank.x -= 5;
    if (state.keyRight) state.tank.x += 5;
    if (state.keyUp)    state.tank.y -= 5;
    if (state.keyDown)  state.tank.y += 5;

    state.tank.x = Math.max(0, Math.min(state.canvas.width - state.tank.width, state.tank.x));
    const tankTopLimit = state.canvas.height / 2;
    state.tank.y = Math.max(tankTopLimit, Math.min(state.canvas.height - constants.bottomBarHeight - state.tank.height, state.tank.y));

    drawTank(ctx);

    // shield overlay
    if (hasShieldActive()) {
      const img = resources?.images?.["shield.png"];
      ctx.save(); ctx.globalAlpha = 0.7;
      if (img instanceof HTMLImageElement || img instanceof HTMLCanvasElement) {
        const w = state.tank.width * 1.10, h = state.tank.height * 1.10;
        const x = state.tank.x + state.tank.width * 0.5 - w * 0.5;
        const y = state.tank.y + state.tank.height * 0.5 - h * 0.5;
        ctx.drawImage(img, x, y, w, h);
      } else {
        ctx.strokeStyle = "rgba(143,232,143,0.9)";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(state.tank.x + state.tank.width/2, state.tank.y + state.tank.height/2, state.tank.width*0.6, state.tank.height*0.6, 0, 0, Math.PI*2);
        ctx.stroke();
      }
      ctx.restore();
    }

    updatePlayerBullets(ctx);

    updateEnemyBullets(ctx, (eb, i) => {
      if (isColliding(eb, state.tank)) {
        if (hasShieldActive()) {
          try { playSound && resources?.audio?.fxPickup && playSound(resources.audio.fxPickup); } catch {}
          state.enemyBullets.splice(i, 1);
          state.flashWhite = Math.max(state.flashWhite || 0, 0.15);
          state.screenShake = Math.max(state.screenShake || 0, 6);
          return true;
        }
        state.health -= 8;
        state.enemyBullets.splice(i, 1);
        state.flashRed = Math.max(state.flashRed || 0, 0.18);
        state.screenShake = Math.max(state.screenShake || 0, 7);
        return true;
      }
      return false;
    });

    updateZombies(
      now,
      (damage, boom) => {
        this.onPlayerHit(damage, true);
        if (boom) { try { playSound && resources?.audio?.fxExplosion && playSound(resources.audio.fxExplosion); } catch {} }
      },
      () => {},
      (bullet) => state.enemyBullets.push(bullet)
    );

    drawZombies(ctx);

    // 🔥 Napalm bombs/explosions (render above enemies)
    updateAndRenderNapalm(ctx, now);

    // ammo drops
    for (let i = state.ammoDrops.length - 1; i >= 0; i--) {
      const drop = state.ammoDrops[i];
      if (typeof drop.dy === "number" && drop.dy !== 0) drop.y += drop.dy;

      const key = drop.type || "ammo2.png";
      const ammoImg = resources.images[key] || resources.images["ammo2.png"] || resources.images["ammo.png"];
      if (ammoImg instanceof HTMLImageElement || ammoImg instanceof HTMLCanvasElement) {
        ctx.drawImage(ammoImg, drop.x, drop.y, drop.width, drop.height);
      } else {
        ctx.save();
        ctx.fillStyle = "#ffc107";
        ctx.beginPath();
        ctx.arc(drop.x + drop.width/2, drop.y + drop.height/2, drop.width/2, 0, Math.PI*2);
        ctx.fill();
        ctx.restore();
      }

      if (!drop._isSpecialAmmoBay && isColliding(drop, state.tank)) {
        state.ammo = Math.min(state.ammo + 15, 150);
        try { playSound && resources?.audio?.fxShot && playSound(resources.audio.fxShot); } catch {}
        state.ammoDrops.splice(i, 1);
        state.flashWhite = Math.max(state.flashWhite || 0, 0.25);
        continue;
      }
      if (drop.y > state.canvas.height) state.ammoDrops.splice(i, 1);
    }

    // medkits & parachutes (same heal)
    for (let i = state.medkitDrops.length - 1; i >= 0; i--) {
      const drop = state.medkitDrops[i];
      if (typeof drop.dy === "number") drop.y += drop.dy;

      const key = drop.type || "medkit.png";
      const medImg = resources.images[key] || resources.images["medkit.png"];
      if (medImg instanceof HTMLImageElement || medImg instanceof HTMLCanvasElement) {
        ctx.drawImage(medImg, drop.x, drop.y, drop.width, drop.height);
      } else {
        ctx.save();
        ctx.fillStyle = "#fff";
        ctx.fillRect(drop.x, drop.y, drop.width, drop.height);
        ctx.restore();
      }

      if (isColliding(drop, state.tank)) {
        state.health = Math.min(state.health + 25, 100);
        try { playSound && resources?.audio?.fxPickup && playSound(resources.audio.fxPickup); } catch {}
        state.medkitDrops.splice(i, 1);
        state.flashWhite = Math.max(state.flashWhite || 0, 0.2);
        continue;
      }
      if (drop.y > state.canvas.height) state.medkitDrops.splice(i, 1);
    }

    // boss logic
    if (state.bossActive && state.boss && state.boss.isAlive) {
      state.boss.update(state.tank, state.bossProjectiles, state.canvas, constants.bottomBarHeight);
      state.boss.render(ctx);
      drawBossHealthBar(ctx);

      for (let i = state.bullets.length - 1; i >= 0; i--) {
        const bullet = state.bullets[i];
        if (isColliding(bullet, state.boss)) {
          state.boss.health--;
          state.bullets.splice(i, 1);

          // 🔥 Napalm: count consecutive boss hits toward the strike
          bumpBossHitStreak(performance.now());

          if (state.boss.health <= 0) break;
        }
      }
      if (state.boss.health <= 0) {
        state.boss.isAlive = false;
        state.bossActive = false;
        state.bossDefeated = true;

        // 🔥 Napalm: cleanup on boss defeat
        resetNapalm();

        state.bossIndex++;
        if (state.bossIndex >= bossDefinitions.length) {
          showEndScreen("ULTIMATE VICTORY!"); ctx.restore(); return;
        } else {
          state.bossTriggerCount = (constants.bossTriggerThresholds[state.bossIndex] ?? 9999);
          nextRound();
        }
      }
    }

    // boss projectiles
    for (let i = state.bossProjectiles.length - 1; i >= 0; i--) {
      const bp = state.bossProjectiles[i];
      bp.x += bp.dx; bp.y += bp.dy;
      ctx.save();
      const img = bp.type ? resources.images[bp.type] : undefined;
      if (img instanceof HTMLImageElement || img instanceof HTMLCanvasElement) {
        ctx.globalAlpha = (Math.floor(now/100)%2===0)?0.85:0.55;
        ctx.drawImage(img, bp.x, bp.y, bp.width*1.5, bp.height*1.5);
      } else {
        ctx.fillStyle = "#e91e63";
        ctx.beginPath(); ctx.arc(bp.x+bp.width/2, bp.y+bp.height/2, bp.width, 0, Math.PI*2); ctx.fill();
      }
      ctx.restore();

      if (isColliding(bp, state.tank)) {
        if (hasShieldActive()) {
          try { playSound && resources?.audio?.fxPickup && playSound(resources.audio.fxPickup); } catch {}
          state.bossProjectiles.splice(i, 1);
          state.flashWhite = Math.max(state.flashWhite || 0, 0.15);
          state.screenShake = Math.max(state.screenShake || 0, 6);
          continue;
        }
        state.health -= 16;
        state.bossProjectiles.splice(i, 1);
        state.screenShake = Math.max(state.screenShake || 0, 15);
        state.flashRed = Math.max(state.flashRed || 0, 0.5);
        continue;
      }
      if (bp.x < -40 || bp.x > state.canvas.width + 40 || bp.y < -40 || bp.y > state.canvas.height + 40) {
        state.bossProjectiles.splice(i, 1);
      }
    }

    ctx.restore();
    drawHUD(ctx);

    // 🔥 Napalm: HUD badge ("NAPALM READY [N]") on the bottom bar
    drawNapalmHUD(state.ctx);

    drawCombo(ctx);

    if (state.health <= 0) { showEndScreen("MISSION FAILED"); return; }

    if (!state.spawningInProgress && state.zombies.length === 0 && !state.bossActive && !state.bossAnnouncementShowing) {
      setTimeout(nextRound, 600); state.spawningInProgress = true;
    }
    if (!state.bossActive && !state.bossDefeated && state.bossIndex < bossDefinitions.length) {
      if (state.bossTriggerCount <= 0 && !state.bossAnnouncementShowing) {
        showBossAnnouncement();
      }
    }
  }

  render() {}

  gameOver() {
    state.gameStarted = false;
    // 🔥 Napalm: ensure cleanup on game over
    resetNapalm();
    showEndScreen("MISSION FAILED");
  }
}

/* ------------------------------ boss control ------------------------------ */
function showBossAnnouncement() {
  state.bossAnnouncementShowing = true;
  state.bossActive = false;
  try { resources.audio?.bgm?.pause?.(); } catch {}

  initBossIntro(); // set up canvas intro state

  // 7s safety net: if typing/intro fails, start the fight anyway
  if (state._bossIntroSafety) clearTimeout(state._bossIntroSafety);
  state._bossIntroSafety = setTimeout(() => {
    if (state.bossAnnouncementShowing) startBossFight();
  }, 7000);
}

function startBossFight() {
  // clear safety timer if any
  if (state._bossIntroSafety) {
    clearTimeout(state._bossIntroSafety);
    state._bossIntroSafety = null;
  }

  state.bossAnnouncementShowing = false;
  state.bossActive = true;
  state.bossDefeated = false;

  try { resources.audio?.bgm?.play?.().catch(()=>{}); } catch {}

  if (!Array.isArray(state.bossProjectiles)) state.bossProjectiles = [];
  const def = bossDefinitions[state.bossIndex];

  state.boss = new Boss(
    def,
    resources.images[def.image],
    state.canvas.width / 2 - def.width / 2,
    80
  );

  // ✅ Make backdrop available during the fight
  state.boss.backdrop = def.backdrop;

  state.screenShake = 16;
  state._bossIntro = null;
}

export default GameScene;
