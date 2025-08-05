import { Boss, bossDefinitions } from './boss.js';

// ---- ELEMENTS ----
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const startScreen = document.getElementById("start-screen");
const endScreen = document.getElementById("end-screen");
const startButton = document.getElementById("start-button");
const endMessage = document.getElementById("end-message");
const restartButton = document.getElementById("restart-button");
const finalScoreText = document.getElementById("final-score");
const bestScoreText = document.getElementById("best-score");

// ---- GAME CONSTANTS ----
const maxRounds = 13;
let bottomBarHeight = 70;

const bgImages = [
  "bg_jungle1.png", "bg_jungle2.png", "bg_jungle3.png",
  "bg_jungle4.png", "bg_jungle5.png", "bg_jungle6.png", "bg_jungle7.png", "bg_jungle8.png",
  "bg_jungle9.png", "bg_jungle10.png", "bg_jungle11.png", "bg_jungle12.png", "bg_jungle13.png",
];

// -- New: pickups
let ammoDrops = [];
let medkitDrops = [];

let resources = { images: {}, audio: {} };
let bullets = [];
let zombies = [];
let ammo = 100;
let health = 100;
let score = 0;
let round = 0;
let gameStarted = false;
let spawningInProgress = false;
let resourcesLoaded = false;

let tank = { x: 0, y: 0, width: 80, height: 80 };
let pointerX = 0;

let fps = 0;
let lastTime = 0;
let frameCount = 0;

let bossIndex = 0;
let boss = null;
let bossActive = false;
let bossDefeated = false;
let bossTriggerCount = 30;
let bossAnnouncementShowing = false;

// --- Boss attacks
let bossProjectiles = [];

function createAudio(src) {
  const audio = new Audio();
  audio.src = src;
  audio.preload = 'auto';
  audio.addEventListener('error', () => {
    console.warn(`Audio file not found: ${src}`);
  });
  return audio;
}

function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => {
      // Fallback canvas for missing images
      const fallback = document.createElement('canvas');
      fallback.width = 32;
      fallback.height = 32;
      const ctx = fallback.getContext('2d');
      if (src.includes('ammo')) ctx.fillStyle = '#ff0';
      else if (src.includes('medkit')) ctx.fillStyle = '#f00';
      else if (src.includes('tank')) ctx.fillStyle = '#4CAF50';
      else ctx.fillStyle = '#2196F3';
      ctx.fillRect(0, 0, 32, 32);
      if (src.includes('medkit')) {
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(16, 6); ctx.lineTo(16, 26);
        ctx.moveTo(6, 16); ctx.lineTo(26, 16);
        ctx.stroke();
      }
      resolve(fallback);
    };
    img.src = src;
  });
}

function initializeAudio() {
  resources.audio.menuMusic = createAudio("end.mp3");
  resources.audio.gameOverMusic = resources.audio.menuMusic;
  resources.audio.bgm = createAudio("bgm_jungle_loop.wav");
  resources.audio.fxShot = createAudio("fx_shot.wav");
  resources.audio.fxExplosion = createAudio("fx_explosion.wav");
}

async function loadAllResources() {
  try {
    initializeAudio();
    const imagePromises = [
      loadImage('tank.png').then(img => resources.images.tank = img),
      loadImage('zombie.png').then(img => resources.images.zombie = img),
      loadImage('zombie2.png').then(img => resources.images.zombie2 = img),
      loadImage('zombie3.png').then(img => resources.images.zombie3 = img),
      loadImage('zombie4.png').then(img => resources.images.zombie4 = img),
      loadImage('gameover.png').then(img => resources.images.gameOverBg = img),
      loadImage('ammo.png').then(img => resources.images.ammo = img),
      loadImage('medkit.png').then(img => resources.images.medkit = img),
      loadImage('skull.png').then(img => resources.images.skull = img),
      loadImage('katana2.png').then(img => resources.images.katana2 = img),
      loadImage('mace.png').then(img => resources.images.mace = img)
    ];
    const bgPromises = bgImages.map((src, i) =>
      loadImage(src).then(img => resources.images[`bg${i}`] = img)
    );
    const bossImagePromises = bossDefinitions.map(def =>
      loadImage(def.image).then(img => { resources.images[def.image] = img; })
    );
    await Promise.all([...imagePromises, ...bgPromises, ...bossImagePromises]);
    resourcesLoaded = true;
    startButton.disabled = false;
    startButton.textContent = 'START GAME';
  } catch (err) {
    console.error('Error loading resources:', err);
    resourcesLoaded = true;
    startButton.disabled = false;
    startButton.textContent = 'LOAD FAILED - PLAY ANYWAY';
  }
}

function updateCanvasSize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  bottomBarHeight = Math.max(60, Math.min(100, canvas.height * 0.1));
  tank.y = canvas.height - bottomBarHeight - tank.height;
  pointerX = canvas.width / 2;
}

function resetGame() {
  bullets = [];
  zombies = [];
  ammoDrops = [];
  medkitDrops = [];
  bossProjectiles = [];
  ammo = 50;
  health = 100;
  score = 0;
  round = 0;
  spawningInProgress = false;
  frameCount = 0;
  fps = 0;
  tank.x = canvas.width / 2 - tank.width / 2;
  tank.y = canvas.height - bottomBarHeight - tank.height;
  pointerX = canvas.width / 2;
  bossIndex = 0;
  boss = null;
  bossActive = false;
  bossDefeated = false;
  bossTriggerCount = 30;
  bossAnnouncementShowing = false;
}

function fireBullet() {
  if (ammo <= 0 || !gameStarted) return;
  playSound(resources.audio.fxShot);
  ammo--;
  bullets.push({
    x: tank.x + tank.width / 2 - 2,
    y: tank.y,
    dy: -6,
    width: 4,
    height: 10
  });
}

function isColliding(a, b) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

// --- ZOMBIE LOGIC ---
function spawnZombie(speed) {
  let type, zombieWidth, zombieHeight, zombieHealth;
  if (round <= 3) {
    type = (round > 1 && Math.random() < 0.4) ? "zombie2" : "zombie";
    zombieWidth = type === "zombie2" ? 70 : 60;
    zombieHeight = type === "zombie2" ? 70 : 60;
    zombieHealth = type === "zombie2" ? 3 : 1;
  } else {
    type = (Math.random() < 0.4) ? "zombie4" : "zombie3";
    zombieWidth = type === "zombie4" ? 80 : 75;
    zombieHeight = type === "zombie4" ? 80 : 75;
    zombieHealth = type === "zombie4" ? 5 : 4;
  }
  let x = Math.random() * (canvas.width - zombieWidth);
  zombies.push({
    x,
    y: -zombieHeight,
    width: zombieWidth,
    height: zombieHeight,
    speed: Math.max(0.5, speed),
    type,
    health: zombieHealth
  });
}

function nextRound() {
  if (!gameStarted) return;
  round++;
  spawningInProgress = true;
  const numZombies = Math.floor(5 * round + Math.random() * round * 4);
  let zombiesToSpawn = numZombies;
  function scheduleNextZombie() {
    if (zombiesToSpawn <= 0 || !gameStarted) {
      spawningInProgress = false;
      return;
    }
    const baseSpeed = 1 + round * 0.2;
    const individualSpeed = baseSpeed + (Math.random() - 0.4) * 0.5;
    spawnZombie(individualSpeed);
    zombiesToSpawn--;
    const baseDelay = 450;
    const delay = Math.max(80, baseDelay - round * 25);
    setTimeout(scheduleNextZombie, delay + Math.random() * 150);
  }
  scheduleNextZombie();
}

function showEndScreen(message) {
  gameStarted = false;
  if (resources.audio.bgm) {
    resources.audio.bgm.pause();
    resources.audio.bgm.currentTime = 0;
  }
  if (resources.audio.gameOverMusic) {
    resources.audio.gameOverMusic.currentTime = 0;
    resources.audio.gameOverMusic.play().catch(()=>{});
  }
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (resources.images.gameOverBg) {
    ctx.drawImage(resources.images.gameOverBg, 0, 0, canvas.width, canvas.height);
  } else {
    ctx.fillStyle = '#2c3e50';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  endScreen.style.display = "flex";
  restartButton.style.display = "inline-block";
  endMessage.textContent = message;
  finalScoreText.textContent = `Score: ${score}`;
  let best = 0;
  try {
    best = parseInt(localStorage.getItem("jungle_best_score")) || 0;
    if (score > best) {
      best = score;
      localStorage.setItem("jungle_best_score", best);
    }
  } catch (e) { }
  bestScoreText.textContent = `Best: ${best}`;
}

function playSound(sound) {
  if (!sound) return;
  try {
    const sfx = sound.cloneNode();
    sfx.play().catch(()=>{});
  } catch (e) {}
}

function drawBottomBar() {
  const padding = Math.max(10, canvas.width * 0.02);
  const barWidth = Math.min(300, canvas.width * 0.4);
  const barHeight = Math.max(20, canvas.height * 0.025);
  const barX = padding + Math.max(70, canvas.width * 0.08);
  const barY = canvas.height - bottomBarHeight / 2 - (barHeight / 2);
  const fontSize = Math.max(12, Math.min(20, canvas.width * 0.028));

  // Bar background
  ctx.fillStyle = 'rgba(0, 0, 0, 0.82)';
  ctx.fillRect(0, canvas.height - bottomBarHeight, canvas.width, bottomBarHeight);

  // Health bar
  ctx.fillStyle = "#333";
  ctx.fillRect(barX, barY, barWidth, barHeight);
  const healthPercentage = Math.max(0, Math.min(100, health)) / 100;
  const healthBarWidth = barWidth * healthPercentage;
  ctx.fillStyle = healthPercentage > 0.6 ? "#4CAF50" :
                  healthPercentage > 0.3 ? "#FF9800" : "#F44336";
  ctx.fillRect(barX, barY, healthBarWidth, barHeight);
  ctx.strokeStyle = "white";
  ctx.lineWidth = 2;
  ctx.strokeRect(barX, barY, barWidth, barHeight);

  // Arcade font
  ctx.font = `bold ${fontSize}px 'VT323', 'Orbitron', monospace`;
  ctx.fillStyle = "white";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";

  // Make sure text is always above the bar
  const y = barY - Math.max(10, fontSize * 0.7);

  let x = padding;
  function stat(label, value) {
    ctx.fillText(`${label}${value !== undefined ? ': ' + value : ''}`, x, y);
    x += ctx.measureText(`${label}${value !== undefined ? ': ' + value : ''}  `).width;
  }

  const short = canvas.width < 500;
  stat(short ? "HP" : "HEALTH");
  stat(short ? "AM" : "AMMO", ammo);
  stat("SCORE", score);
  stat(short ? "RD" : "ROUND", round);
  stat(short ? "EN" : "BOSS INCOMING", bossTriggerCount > 0 ? bossTriggerCount : 0);

  // FPS COUNTER
  if (fps > 0) {
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.font = `${Math.round(fontSize * 0.7)}px 'VT323', 'Orbitron', monospace`;
    if (canvas.width > 600) {
      ctx.fillText(`FPS: ${fps}`, canvas.width - 80, canvas.height - 10);
    } else {
      ctx.fillText(`FPS: ${fps}`, canvas.width - 60, canvas.height - bottomBarHeight - 8);
    }
  }
}

 
function drawBossHealthBar(ctx, boss) {
  if (boss && boss.isAlive) {
    let bw = canvas.width * 0.8;
    let bh = 22;
    let bx = (canvas.width - bw) / 2;
    let by = 22;
    ctx.save();
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
    ctx.restore();
  }
}

// ---- BOSS LOGIC ----
function showBossAnnouncement() {
  bossAnnouncementShowing = true;
  bossActive = false;
  document.getElementById("boss-announcement").style.display = "flex";
  document.getElementById("boss-announcement-name").textContent = bossDefinitions[bossIndex].name;
  setTimeout(() => {
    startBossFight();
  }, 2000); // 2 sec announcement
}

function startBossFight() {
  document.getElementById("boss-announcement").style.display = "none";
  bossAnnouncementShowing = false;
  bossActive = true;
  bossDefeated = false;
  bossProjectiles = [];
  const def = bossDefinitions[bossIndex];
  boss = new Boss(def, resources.images[def.image], canvas.width / 2 - def.width / 2, 80);
}

// ---- GAME LOOP ----
function gameLoop(currentTime) {
  if (!gameStarted) return;
  frameCount++;
  if (currentTime - lastTime >= 1000) {
    fps = frameCount;
    frameCount = 0;
    lastTime = currentTime;
  }
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const bgIndex = Math.min(round - 1, bgImages.length - 1);
  const bgImage = resources.images[`bg${bgIndex}`];
  if (bgImage) {
    ctx.drawImage(bgImage, 0, 0, canvas.width, canvas.height);
  } else {
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#87CEEB');
    gradient.addColorStop(1, '#228B22');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  // Tank movement
  const targetX = pointerX - tank.width / 2;
  tank.x += (targetX - tank.x) * 0.1;
  tank.x = Math.max(0, Math.min(canvas.width - tank.width, tank.x));
  // Tank
  if (resources.images.tank) {
    ctx.drawImage(resources.images.tank, tank.x, tank.y, tank.width, tank.height);
  } else {
    ctx.fillStyle = "#4CAF50";
    ctx.fillRect(tank.x, tank.y, tank.width, tank.height);
  }
  // Bullets
  bullets = bullets.filter(b => b.y > -b.height);
  bullets.forEach(b => {
    b.y += b.dy;
    ctx.fillStyle = "yellow";
    ctx.fillRect(b.x, b.y, b.width, b.height);
  });
  // Zombies
  for (let zi = zombies.length - 1; zi >= 0; zi--) {
    const z = zombies[zi];
    z.y += z.speed;
    if (z.y > canvas.height) {
      zombies.splice(zi, 1);
      continue;
    }
    // Collisions
    if (isColliding(z, tank)) {
      zombies.splice(zi, 1);
      health -= 10;
      playSound(resources.audio.fxExplosion);
      continue;
    }
    for (let i = bullets.length - 1; i >= 0; i--) {
      const bullet = bullets[i];
      if (isColliding(bullet, z)) {
        z.health--;
        bullets.splice(i, 1);
        if (z.health <= 0) {
          zombies.splice(zi, 1);
          score += z.type === "zombie4" ? 25 :
                   z.type === "zombie3" ? 20 :
                   z.type === "zombie2" ? 15 : 5;

          // --- Ammo drop: 25% chance ---
          if (Math.random() < 0.25) {
            ammoDrops.push({
              x: z.x + z.width/2 - 16,
              y: z.y + z.height/2,
              width: 32,
              height: 32,
              dy: 3
            });
          }
          // --- Medkit drop: 10% chance ---
          if (Math.random() < 0.10) {
            medkitDrops.push({
              x: z.x + z.width/2 - 16,
              y: z.y + z.height/2,
              width: 32,
              height: 32,
              dy: 2.5
            });
          }

          ammo = Math.min(ammo + 2, 150);
          playSound(resources.audio.fxExplosion);

          // --- Boss Trigger Logic ---
          if (!bossActive && !bossDefeated) {
            bossTriggerCount--;
            if (bossTriggerCount <= 0) {
              showBossAnnouncement();
            }
          }
        }
        break;
      }
    }
    // Draw zombie (all types)
    if (z.type === "zombie4" && resources.images.zombie4) {
      ctx.drawImage(resources.images.zombie4, z.x, z.y, z.width, z.height);
    } else if (z.type === "zombie3" && resources.images.zombie3) {
      ctx.drawImage(resources.images.zombie3, z.x, z.y, z.width, z.height);
    } else if (z.type === "zombie2" && resources.images.zombie2) {
      ctx.drawImage(resources.images.zombie2, z.x, z.y, z.width, z.height);
    } else if (resources.images.zombie) {
      ctx.drawImage(resources.images.zombie, z.x, z.y, z.width, z.height);
    } else {
      ctx.fillStyle = z.type === "zombie4" ? "#006600" :
                      z.type === "zombie3" ? "#009900" :
                      z.type === "zombie2" ? "#8B0000" : "#F44336";
      ctx.fillRect(z.x, z.y, z.width, z.height);
    }
  }

  // --- AMMO DROPS ---
  for (let i = ammoDrops.length - 1; i >= 0; i--) {
    const drop = ammoDrops[i];
    drop.y += drop.dy;
    // Draw
    if (resources.images.ammo) {
      ctx.drawImage(resources.images.ammo, drop.x, drop.y, drop.width, drop.height);
    } else {
      ctx.save();
      ctx.fillStyle = "#ffc107";
      ctx.beginPath();
      ctx.arc(drop.x + drop.width/2, drop.y + drop.height/2, drop.width/2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#ff9800";
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.font = "bold 20px Arial";
      ctx.fillStyle = "#333";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("A", drop.x + drop.width/2, drop.y + drop.height/2 + 2);
      ctx.restore();
    }
    // Collision
    if (isColliding(drop, tank)) {
      ammo = Math.min(ammo + 15, 150);
      playSound(resources.audio.fxShot);
      ammoDrops.splice(i, 1);
      continue;
    }
    if (drop.y > canvas.height) {
      ammoDrops.splice(i, 1);
      continue;
    }
  }
  // --- MEDKIT DROPS ---
  for (let i = medkitDrops.length - 1; i >= 0; i--) {
    const drop = medkitDrops[i];
    drop.y += drop.dy;
    // Draw
    if (resources.images.medkit) {
      ctx.drawImage(resources.images.medkit, drop.x, drop.y, drop.width, drop.height);
    } else {
      ctx.save();
      ctx.fillStyle = "#fff";
      ctx.fillRect(drop.x, drop.y, drop.width, drop.height);
      ctx.strokeStyle = "#d32f2f";
      ctx.lineWidth = 4;
      ctx.strokeRect(drop.x + 4, drop.y + 4, drop.width - 8, drop.height - 8);
      ctx.font = "bold 18px Arial";
      ctx.fillStyle = "#d32f2f";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("+", drop.x + drop.width/2, drop.y + drop.height/2 + 2);
      ctx.restore();
    }
    // Collision
    if (isColliding(drop, tank)) {
      health = Math.min(health + 25, 100);
      playSound(resources.audio.fxExplosion);
      medkitDrops.splice(i, 1);
      continue;
    }
    if (drop.y > canvas.height) {
      medkitDrops.splice(i, 1);
      continue;
    }
  }

  // --- BOSS LOGIC ---
  if (bossActive && boss && boss.isAlive) {
    boss.update(tank, bossProjectiles, canvas, bottomBarHeight);
    boss.render(ctx);
    drawBossHealthBar(ctx, boss);
    // Allow bullets to hit boss!
    for (let i = bullets.length - 1; i >= 0; i--) {
      const bullet = bullets[i];
      if (isColliding(bullet, boss)) {
        boss.health--;
        bullets.splice(i, 1);
        if (boss.health <= 0) break;
      }
    }

    if (boss.health <= 0) {
      boss.isAlive = false;
      bossActive = false;
      bossDefeated = true;
      bossIndex++;
      if (bossIndex >= bossDefinitions.length) {
        showEndScreen("ULTIMATE VICTORY!");
        return;
      } else {
        bossTriggerCount = 30 + bossIndex * 10;
        nextRound();
      }
    }
  }

  // --- BOSS PROJECTILES ---
for (let i = bossProjectiles.length - 1; i >= 0; i--) {
  const bp = bossProjectiles[i];
  bp.x += bp.dx;
  bp.y += bp.dy;
  // Draw projectile image by type
  const projImg = resources.images[bp.type];
  if (projImg) {
    ctx.drawImage(projImg, bp.x, bp.y, bp.width, bp.height);
  } else {
    // fallback (if image not found)
    ctx.save();
    ctx.fillStyle = "#e91e63";
    ctx.beginPath();
    ctx.arc(bp.x + bp.width / 2, bp.y + bp.height / 2, bp.width / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

    if (isColliding(bp, tank)) {
      health -= 16;
      bossProjectiles.splice(i, 1);
      continue;
    }
    if (
      bp.x < -20 || bp.x > canvas.width + 20 ||
      bp.y < -20 || bp.y > canvas.height + 20
    ) {
      bossProjectiles.splice(i, 1);
      continue;
    }
  }

  // UI
  drawBottomBar();

  // Game over
  if (health <= 0) return showEndScreen("ZOMBIES WIN!");
  if (ammo <= 0 && bullets.length === 0) return showEndScreen("OUT OF AMMO!");
  if (
    zombies.length === 0 &&
    !spawningInProgress &&
    !bossActive &&
    !bossAnnouncementShowing
  ) {
    if (round >= maxRounds) return showEndScreen("VICTORY!");
    else nextRound();
  }
  requestAnimationFrame(gameLoop);
}

// ---- UI and EVENTS ----
startButton.disabled = true;
startButton.textContent = 'LOADING...';

startButton.addEventListener("click", () => {
  if (!resourcesLoaded) {
    console.warn('Resources not fully loaded, starting anyway...');
  }
  updateCanvasSize();
  startScreen.style.display = "none";
  endScreen.style.display = "none";
  restartButton.style.display = "none";
  canvas.style.display = "block";
  gameStarted = true;
  resetGame();
  if (resources.audio.bgm) {
    resources.audio.bgm.loop = true;
    resources.audio.bgm.play().catch(() => {});
  }
  nextRound();
  requestAnimationFrame(gameLoop);
  if (resources.audio.gameOverMusic) {
    resources.audio.gameOverMusic.pause();
    resources.audio.gameOverMusic.currentTime = 0;
  }
});

restartButton.addEventListener("click", () => {
  updateCanvasSize();
  endScreen.style.display = "none";
  canvas.style.display = "block";
  resetGame();
  if (resources.audio.bgm) {
    resources.audio.bgm.loop = true;
    resources.audio.bgm.play().catch(() => {});
  }
  nextRound();
  gameStarted = true;
  requestAnimationFrame(gameLoop);
  if (resources.audio.gameOverMusic) {
    resources.audio.gameOverMusic.pause();
    resources.audio.gameOverMusic.currentTime = 0;
  }
});

canvas.addEventListener("mousemove", e => {
  const rect = canvas.getBoundingClientRect();
  pointerX = e.clientX - rect.left;
});
canvas.addEventListener("mousedown", e => {
  e.preventDefault();
  fireBullet();
});
canvas.addEventListener("touchmove", e => {
  e.preventDefault();
  const rect = canvas.getBoundingClientRect();
  pointerX = e.touches[0].clientX - rect.left;
}, { passive: false });
canvas.addEventListener("touchstart", e => {
  e.preventDefault();
  fireBullet();
}, { passive: false });

window.addEventListener('resize', () => {
  updateCanvasSize();
  if (gameStarted) requestAnimationFrame(gameLoop);
});
window.addEventListener('orientationchange', () => setTimeout(updateCanvasSize, 100));
window.addEventListener('beforeunload', () => {
  gameStarted = false;
  if (resources.audio.bgm) {
    resources.audio.bgm.pause();
    resources.audio.bgm.currentTime = 0;
  }
  if (resources.audio.gameOverMusic) {
    resources.audio.gameOverMusic.pause();
    resources.audio.gameOverMusic.currentTime = 0;
  }
});

function initializeScreens() {
  if (startScreen) startScreen.style.display = "flex";
  if (endScreen) endScreen.style.display = "none";
  if (canvas) canvas.style.display = "block";
  gameStarted = false;
  if (canvas) canvas.style.zIndex = '1';
  if (endScreen) endScreen.style.zIndex = '10';
}

function initialize() {
  updateCanvasSize();
  initializeScreens();
  loadAllResources();
}

initialize();
