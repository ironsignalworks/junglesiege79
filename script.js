// Elements
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const startScreen = document.getElementById("start-screen");
const endScreen = document.getElementById("end-screen");
const startButton = document.getElementById("start-button");
const endMessage = document.getElementById("end-message");
const finalScoreText = document.getElementById("final-score");
const bestScoreText = document.getElementById("best-score");
const gameOverMusic = new Audio("end.mp3"); // or .wav
const restartButton = document.getElementById("restart-button");


// Canvas setup
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// Game constants and variables
const maxRounds = 7;
const bottomBarHeight = 70; // Height of the new stats bar

const tankImg = new Image();
tankImg.src = "tank.png";

const zombieImg = new Image();
zombieImg.src = "zombie.png";

const bgImages = [
  "bg_jungle1.jpg", "bg_jungle2.jpg", "bg_jungle3.jpg",
  "bg_jungle4.jpg", "bg_jungle5.jpg", "bg_jungle6.jpg", "bg_jungle7.jpg"
];

const bgImg = new Image();
const gameOverBg = new Image();
gameOverBg.src = "bg_jungle8.jpg";

const bgm = new Audio("bgm_jungle_loop.wav");
const fxShot = new Audio("fx_shot.wav");
const fxExplosion = new Audio("fx_explosion.wav");

let bullets = [];
let zombies = [];
let ammo = 50;
let health = 100;
let score = 0;
let round = 0;
let gameStarted = false;
let spawningInProgress = false;

let tank = {
  x: canvas.width / 2 - 40,
  // Adjust initial Y position to be just above the new bottom bar
  y: canvas.height - bottomBarHeight - 80, 
  width: 80,
  height: 80
};

let pointerX = canvas.width / 2;

// Image loading and enabling start button
let imagesLoaded = 0;
const totalImages = 2 + bgImages.length + 1; // tank + zombie + bgImgs + gameOverBg

function checkAllImagesLoaded() {
  imagesLoaded++;
  if (imagesLoaded >= totalImages) {
    startButton.disabled = false;

  }
}

tankImg.onload = checkAllImagesLoaded;
zombieImg.onload = checkAllImagesLoaded;
gameOverBg.onload = checkAllImagesLoaded;

bgImages.forEach(src => {
  const img = new Image();
  img.src = src;
  img.onload = checkAllImagesLoaded;
});

// Event Listeners
startButton.disabled = true;

startButton.addEventListener("click", () => {
  startScreen.style.display = "none";
  endScreen.style.display = "none";
  restartButton.style.display = "none";
  canvas.style.display = "block";
  gameStarted = true;
  resetGame();
  bgm.loop = true;
  bgm.play();
  nextRound();
  requestAnimationFrame(gameLoop);
  gameOverMusic.pause();
  gameOverMusic.currentTime = 0;
});

restartButton.addEventListener("click", () => {
  endScreen.style.display = "none";
  canvas.style.display = "block";
  resetGame();
  bgm.loop = true;
  bgm.play();
  nextRound();
  gameStarted = true;
  requestAnimationFrame(gameLoop);
  gameOverMusic.pause();
  gameOverMusic.currentTime = 0;
});


// Mouse and touch controls
canvas.addEventListener("mousemove", e => {
  pointerX = e.clientX - canvas.getBoundingClientRect().left;
});

canvas.addEventListener("mousedown", () => fireBullet());

canvas.addEventListener("touchmove", e => {
  e.preventDefault();
  pointerX = e.touches[0].clientX - canvas.getBoundingClientRect().left;
}, { passive: false });

canvas.addEventListener("touchstart", e => {
  e.preventDefault();
  fireBullet();
}, { passive: false });

// Functions

function resetGame() {
  bullets = [];
  zombies = [];
  ammo = 50;
  health = 100;
  score = 0;
  round = 0;
  tank.x = canvas.width / 2 - 40;
  // Also reset the tank's y position to be correct for the current screen size
  tank.y = canvas.height - bottomBarHeight - tank.height;
}

function fireBullet() {
  if (ammo <= 0) return;
  playSound(fxShot);
  ammo--;
  bullets.push({
    x: tank.x + tank.width / 2 - 2,
    y: tank.y,
    dy: -6
  });
}

function spawnZombie(speed) {
  let x = Math.random() * (canvas.width - 60);
  zombies.push({ x, y: -80, width: 60, height: 60, speed });
}

function nextRound() {
  round++;
  spawningInProgress = true;
  let bgFile = bgImages[(round - 1) % bgImages.length];
  bgImg.src = bgFile;

  const numZombies = Math.floor(5 * round + Math.random() * round * 4);
  let zombiesToSpawn = numZombies;

  function scheduleNextZombie() {
    if (zombiesToSpawn <= 0 || !gameStarted) {
        spawningInProgress = false;
        return;
    }
    const baseSpeed = 1 + round * 0.2;
    const individualSpeed = baseSpeed + (Math.random() - 0.4) * 0.5;
    spawnZombie(Math.max(0.5, individualSpeed));
    zombiesToSpawn--;
    const baseDelay = 450;
    const delay = Math.max(80, baseDelay - round * 25);
    setTimeout(scheduleNextZombie, delay + Math.random() * 150);
  }
  scheduleNextZombie();
}

function showEndScreen(message) {
  gameStarted = false;

  // Stop gameplay music
  bgm.pause();
  bgm.currentTime = 0;

  // Play game over music
  gameOverMusic.currentTime = 0;
  gameOverMusic.play();

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(gameOverBg, 0, 0, canvas.width, canvas.height);

  endScreen.style.display = "flex";
  restartButton.style.display = "inline-block";

  endMessage.textContent = message;
  finalScoreText.textContent = `Score: ${score}`;

  let best = parseInt(localStorage.getItem("jungle_best_score")) || 0;
  if (score > best) {
    best = score;
    localStorage.setItem("jungle_best_score", best);
  }
  bestScoreText.textContent = `Best: ${best}`;
}

function playSound(sound) {
  const sfx = sound.cloneNode();
  sfx.play();
}

/**
 * NEW: Draws a fixed bar at the bottom of the screen with all game stats.
 */
function drawBottomBar() {
    // Draw the main bar background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, canvas.height - bottomBarHeight, canvas.width, bottomBarHeight);

    // --- Health Section ---
    ctx.fillStyle = "white";
    ctx.font = "bold 18px 'Courier New', Courier, monospace";
    ctx.textAlign = "left";
    ctx.fillText("HEALTH", 20, canvas.height - bottomBarHeight / 2 + 7);

    const barWidth = 200;
    const barHeight = 20;
    const barX = 110;
    const barY = canvas.height - bottomBarHeight / 2 - (barHeight/2);
    
    // Draw health bar background
    ctx.fillStyle = "#333";
    ctx.fillRect(barX, barY, barWidth, barHeight);

    // Draw current health
    const healthPercentage = Math.max(0, health) / 100;
    const healthBarWidth = barWidth * healthPercentage;
    if (healthPercentage > 0.6) ctx.fillStyle = "#28a745"; // Green
    else if (healthPercentage > 0.3) ctx.fillStyle = "#ffc107"; // Yellow
    else ctx.fillStyle = "#dc3545"; // Red
    ctx.fillRect(barX, barY, healthBarWidth, barHeight);
    
    // Draw health bar border
    ctx.strokeStyle = "black";
    ctx.strokeRect(barX, barY, barWidth, barHeight);

    // --- Other Stats (Ammo, Score, Round) ---
    ctx.fillStyle = "white";
    ctx.font = "18px 'Courier New', Courier, monospace";
    
    // Position stats across the remaining width of the screen
    const statsXStart = barX + barWidth + 50;
    const remainingWidth = canvas.width - statsXStart;
    
    ctx.fillText(`AMMO: ${ammo}`, statsXStart, canvas.height - bottomBarHeight / 2 + 7);
    ctx.fillText(`SCORE: ${score}`, statsXStart + remainingWidth * 0.33, canvas.height - bottomBarHeight / 2 + 7);
    ctx.fillText(`ROUND: ${round}`, statsXStart + remainingWidth * 0.66, canvas.height - bottomBarHeight / 2 + 7);
}


function gameLoop() {
  if (!gameStarted) return;

  // Draw background
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);

  // Move tank toward pointer
  tank.x += (pointerX - tank.x - tank.width / 2) * 0.1;
  // Prevent tank from moving off the sides of the screen
  tank.x = Math.max(0, Math.min(canvas.width - tank.width, tank.x));

  // Draw tank
  ctx.drawImage(tankImg, tank.x, tank.y, tank.width, tank.height);

  // Update & draw bullets
  bullets = bullets.filter(b => b.y > -10);
  bullets.forEach(b => {
    b.y += b.dy;
    ctx.fillStyle = "yellow";
    ctx.fillRect(b.x, b.y, 4, 10);
  });

  // Update & draw zombies
  zombies.forEach((z, zi) => {
    z.y += z.speed;
    ctx.drawImage(zombieImg, z.x, z.y, z.width, z.height);

    // Collision with tank
    if (z.x < tank.x + tank.width && z.x + z.width > tank.x && z.y + z.height > tank.y) {
      zombies.splice(zi, 1);
      health -= 10;
      playSound(fxExplosion);
    }

    // Collision with bullets
    bullets.forEach((b, bi) => {
      if (b.x > z.x && b.x < z.x + z.width && b.y > z.y && b.y < z.y + z.height) {
        playSound(fxExplosion);
        zombies.splice(zi, 1);
        bullets.splice(bi, 1);
        score++;
        ammo++;
      }
    });
  });

  zombies = zombies.filter(z => z.y < canvas.height + 100);

  // **NEW**: Draw the fixed bottom bar on top of everything else
  drawBottomBar();

  // Game over conditions
  if (health <= 0) {
    showEndScreen("ZOMBIES WIN!");
    return;
  }

  if (ammo <= 0 && bullets.length === 0) {
    showEndScreen("OUT OF JUICE!");
    return;
  }

  if (zombies.length === 0 && !spawningInProgress) {
    if (round >= maxRounds) {
      showEndScreen("VICTORY!");
      return;
    } else {
      nextRound();
    }
  }

  requestAnimationFrame(gameLoop);
}

function initializeScreens() {
  startScreen.style.display = "flex";
  endScreen.style.display = "none";
  canvas.style.display = "none";
  gameStarted = false;
}
initializeScreens();
