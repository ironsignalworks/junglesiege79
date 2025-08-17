import { state, playSound } from "../core/state.js";
import { constants } from "../core/constants.js";
import { resources } from "../assets/resources.js";
import { isColliding } from "./collisions.js";

// ------------ helpers -------------------------------------------------------
function hasShieldActive() {
  return (state.shieldUntil || 0) > Date.now();
}

// Big centered caption that never overlaps (replaces previous one)
function showCaption(text, ms = 1000) {
  try {
    const old = document.getElementById("streak-caption");
    if (old) old.remove();
    const el = document.createElement("div");
    el.id = "streak-caption";
    el.textContent = text;
    el.style.cssText = [
      "position:fixed",
      "left:50%",
      "top:50%",
      "transform:translate(-50%,-50%)",
      "padding:12px 18px",
      "border:1px solid #8fe88f",
      "border-radius:12px",
      "background:#10160acc",
      "color:#bfffbf",
      "font:700 28px/1 monospace",
      "letter-spacing:1px",
      "z-index:600000",
      "pointer-events:none",
      "text-align:center",
      "box-shadow:0 6px 24px rgba(0,0,0,.45)"
    ].join(";");
    document.body.appendChild(el);
    setTimeout(() => el.remove(), ms);
  } catch {}
}

// ------------ special spawns ------------------------------------------------
// AmmoBay: visible above bottom HUD, +30 ammo when touched (handled below)
function spawnAmmoBayAtBottom() {
  const cw = state.canvas?.width ?? 800;
  const ch = state.canvas?.height ?? 600;
  // ~30% bigger than 27x27 → 35x35
  const w = 65, h = 65;
  const bottomBar = (constants?.bottomBarHeight || 0);
  const x = Math.random() * Math.max(0, cw - w);
  // place above HUD so it’s visible
  const y = Math.max(0, ch - bottomBar - h - 10);

  state.ammoDrops.push({
    x, y, width: w, height: h,
    dy: 0, // stays put
    type: "ammobay.png",
    _isSpecialAmmoBay: true,
    ttl: 12000 // ms (decayed below)
  });

  showCaption("AMMOBAY DEPLOYED", 900);
}

// Grant +30 ammo on touching special AmmoBay (and remove it)
function processSpecialAmmoBay() {
  const { tank } = state;
  if (!tank || !state.ammoDrops) return;

  for (let i = state.ammoDrops.length - 1; i >= 0; i--) {
    const p = state.ammoDrops[i];
    if (!p || !p._isSpecialAmmoBay) continue;

    // TTL decay per frame (~16ms averaged by your loop)
    p.ttl = (p.ttl ?? 12000) - 16;
    if (p.ttl <= 0) {
      state.ammoDrops.splice(i, 1);
      continue;
    }

    if (isColliding(tank, p)) {
      state.ammo = Math.min(state.ammo + 30, constants.ammoCap);
      try { playSound && resources?.audio?.fxPickup && playSound(resources.audio.fxPickup); } catch {}
      showCaption("AMMO +30", 900);
      state.ammoDrops.splice(i, 1);
    }
  }
}

// NEW: spawn parachute pickups that behave like medkits (heal on touch)
function spawnParachutePickups(count = 2) {
  const cw = state.canvas?.width ?? 800;
  // 30% bigger than 27 → 35
  const w = 75, h = 75;

  for (let i = 0; i < count; i++) {
    const x = Math.random() * Math.max(0, cw - w);
    // start above the screen and fall down like medkits
    state.medkitDrops.push({
      x,
      y: -h,
      width: w,
      height: h,
      dy: 2.8 + Math.random() * 0.6, // gentle fall
      type: "parachute.png"          // <- draws parachute image
    });
  }
  showCaption("SUPPLY DROP!", 900);
}

// ------------ original & minimally edited code ------------------------------
export function spawnZombie(speed) {
  if (state.bossActive || state.bossAnnouncementShowing) return;

  const zType = constants.zombieTypes[Math.floor(Math.random() * constants.zombieTypes.length)];
  const zombieWidth = 48;
  const zombieHeight = 72;
  const canvasWidth = state.canvas?.width ?? 800;
  const x = Math.random() * Math.max(0, canvasWidth - zombieWidth);

  state.zombies.push({
    x,
    y: -zombieHeight,
    width: zombieWidth,
    height: zombieHeight,
    speed,
    health: zType.hp,
    type: zType.type,
    fireCooldown: Math.floor(Math.random() * zType.fireRate) + zType.fireRate * 2,
    fireRate: Math.floor(zType.fireRate * 3.0),
    bulletSpeed: Math.max(3, zType.bulletSpeed - 1),
    vx: (Math.random() * 1.2) - 0.6,
    wobbleAmp: 1.4 + Math.random() * 1.6,
    wobbleSpeed: 0.05 + Math.random() * 0.05,
    t: Math.random() * Math.PI * 2,
  });
}

export function nextRound() {
  if (!state.gameStarted) return;
  state.bossDefeated = false;
  state.round++;
  state.spawningInProgress = true;

  // reset 3s shield
  state.shieldUntil = 0;

  const numZombies = Math.max(3, Math.floor(3 * state.round + Math.random() * (state.round * 2)));
  let zombiesToSpawn = numZombies;

  function scheduleNextZombie() {
    if (
      zombiesToSpawn <= 0 ||
      !state.gameStarted ||
      state.bossActive ||
      state.bossAnnouncementShowing
    ) {
      state.spawningInProgress = false;
      return;
    }
    const baseSpeed = 0.8 + state.round * 0.12;
    const individualSpeed = baseSpeed + (Math.random() - 0.4) * 0.3;

    spawnZombie(individualSpeed);
    zombiesToSpawn--;

    const baseDelay = 800;
    const delay = Math.max(250, baseDelay - state.round * 10);
    setTimeout(scheduleNextZombie, delay + Math.random() * 250);
  }

  scheduleNextZombie();
}

export function updateZombies(currentTime, onPlayerHit, _onZombieKilled, pushEnemyBullet) {
  const { zombies, canvas, tank } = state;

  for (let zi = zombies.length - 1; zi >= 0; zi--) {
    const z = zombies[zi];

    z.t += z.wobbleSpeed;
    z.x += z.vx + Math.sin(z.t) * z.wobbleAmp;
    z.y += z.speed;

    if (z.x < 0) { z.x = 0; z.vx *= -0.8; }
    if (z.x > canvas.width - z.width) { z.x = canvas.width - z.width; z.vx *= -0.8; }
    if (z.y > canvas.height) { zombies.splice(zi, 1); continue; }

    if (isColliding(z, tank)) {
      zombies.splice(zi, 1);

      // 3s shield absorbs collision damage
      if (hasShieldActive()) {
        try { playSound && resources?.audio?.fxPickup && playSound(resources.audio.fxPickup); } catch {}
        showCaption("SHIELD HIT", 700);
        continue;
      }

      onPlayerHit(10, true);
      continue;
    }

    z.fireCooldown = (z.fireCooldown || Math.floor(Math.random() * 60)) - 1;

    if (z.fireCooldown <= 0) {
      if (Math.random() < 0.70) {
        z.fireCooldown = z.fireRate + Math.floor(Math.random() * 60);
      } else {
        const aimed = Math.random() < 0.20;
        let dx, dy;
        if (aimed) {
          dx = (tank.x + tank.width / 2) - (z.x + z.width / 2);
          dy = (tank.y + tank.height / 2) - (z.y + z.height / 2);
          const dist = Math.max(1, Math.hypot(dx, dy));
          dx = (dx / dist) * z.bulletSpeed;
          dy = (dy / dist) * z.bulletSpeed;
        } else {
          dx = (Math.random() - 0.5) * 1.6;
          dy = z.bulletSpeed * (0.9 + Math.random() * 0.4);
        }

        pushEnemyBullet({
          x: z.x + z.width / 2 - 8,
          y: z.y + z.height / 2 - 8,
          width: 24,
          height: 24,
          dx,
          dy,
          owner: z.type,
          type: "ammo.png" // enemy projectile sprite
        });

        z.fireCooldown = z.fireRate + Math.floor(Math.random() * 80);
      }
    }

    // Check player bullets hitting zombie
    for (let i = state.bullets.length - 1; i >= 0; i--) {
      const bullet = state.bullets[i];
      if (isColliding(bullet, z)) {
        z.health--;
        state.bullets.splice(i, 1);

        if (z.health <= 0) {
          zombies.splice(zi, 1);
          const add = z.type === "zombie4" ? 25 : z.type === "zombie3" ? 20 : z.type === "zombie2" ? 15 : 5;
          state.score += add;
          handleCombo(currentTime);
          maybeDrop(z);
          if (!state.bossActive && !state.bossDefeated) state.bossTriggerCount--;
        }
        break;
      }
    }
  }

  // Special AmmoBay (+30) pickup handling
  processSpecialAmmoBay();
}

function handleCombo(now) {
  if (now - state.lastKillTime < 900) {
    state.comboCount++;
    state.comboTimer = 25;
    state.comboDisplay =
      state.comboCount === 2 ? "DOUBLE KILL!" :
      state.comboCount === 3 ? "TRIPLE KILL!" :
      `${state.comboCount} KILL STREAK!`;
  } else {
    state.comboCount = 1;
    state.comboDisplay = "";
  }
  state.lastKillTime = now;

  // Streak rewards
  if (state.comboCount === 2) {
    // 3-second shield
    state.shieldUntil = Date.now() + 3000;
    showCaption("SHIELD: 3s", 900);
    try { playSound && resources?.audio?.fxPickup && playSound(resources.audio.fxPickup); } catch {}
  } else if (state.comboCount === 3) {
    spawnAmmoBayAtBottom();           // ammobay.png at bottom; touch => +30
  } else if (state.comboCount === 4) {
    spawnParachutePickups(2);         // two parachutes that heal like medkits
  }
}

function maybeDrop(z) {
  // Ammo drop (25%) — ammo2.png 27x27
  if (Math.random() < 0.25 && resources.images["ammo2.png"]) {
    state.ammoDrops.push({
      x: z.x + z.width / 2 - 13,
      y: z.y + z.height / 2 - 13,
      width: 27,
      height: 27,
      dy: 3,
      type: "ammo2.png"
    });
  }
  // Medkit drop (10%) — unchanged
  if (Math.random() < 0.10 && resources.images["medkit.png"]) {
    state.medkitDrops.push({
      x: z.x + z.width / 2 - 13,
      y: z.y + z.height / 2,
      width: 27,
      height: 27,
      dy: 2.5,
      type: "medkit.png"
    });
  }
  state.ammo = Math.min(state.ammo + 2, constants.ammoCap);
  playSound(resources.audio.fxExplosion);
}
