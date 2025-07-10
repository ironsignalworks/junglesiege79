// Elements
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const startScreen = document.getElementById("start-screen");
const endScreen = document.getElementById("end-screen");
const startButton = document.getElementById("start-button");
const restartButton = document.getElementById("restart-button");
const endMessage = document.getElementById("end-message");
const finalScoreText = document.getElementById("final-score");
const bestScoreText = document.getElementById("best-score");

// Canvas setup
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// Game constants and variables
const maxRounds = 7;

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

let tank = {
  x: canvas.width / 2 - 40,
  y: canvas.height - 100,
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
  restartButton.style.display = "none";  // hide restart button explicitly
  canvas.style.display = "block";
  gameStarted = true;
  resetGame();
  bgm.loop = true;
  bgm.play();
  nextRound();
  requestAnimationFrame(gameLoop);
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

function spawnZombie() {
  let x = Math.random() * (canvas.width - 60);
  zombies.push({ x, y: -60, width: 60, height: 60 });
}

function nextRound() {
  round++;
  let bgFile = bgImages[(round - 1) % bgImages.length];
  bgImg.src = bgFile;

  zombies = [];
  for (let i = 0; i < round * 5; i++) {
    spawnZombie();
  }
}

function showEndScreen(message) {
  gameStarted = false;
  bgm.pause();

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(gameOverBg, 0, 0, canvas.width, canvas.height);

  endScreen.style.display = "flex";
  restartButton.style.display = "inline-block"; // show restart button here

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

function gameLoop() {
  if (!gameStarted) return;

  // Draw background
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);

  // Move tank toward pointer
  tank.x += (pointerX - tank.x - tank.width / 2) * 0.1;
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
    z.y += 1 + round * 0.2;
    ctx.drawImage(zombieImg, z.x, z.y, z.width, z.height);

    // Collision with tank
    if (
      z.x < tank.x + tank.width &&
      z.x + z.width > tank.x &&
      z.y + z.height > tank.y
    ) {
      zombies.splice(zi, 1);
      health -= 10;
      playSound(fxExplosion);
    }

    // Collision with bullets
    bullets.forEach((b, bi) => {
      if (
        b.x > z.x &&
        b.x < z.x + z.width &&
        b.y > z.y &&
        b.y < z.y + z.height
      ) {
        playSound(fxExplosion);
        zombies.splice(zi, 1);
        bullets.splice(bi, 1);
        score++;
        ammo++;
      }
    });
  });

  zombies = zombies.filter(z => z.y < canvas.height + 100);

  // HUD
  ctx.fillStyle = "white";
  ctx.font = "20px sans-serif";
  ctx.fillText(`Health: ${health}`, 20, 30);
  ctx.fillText(`Ammo: ${ammo}`, 20, 60);
  ctx.fillText(`Score: ${score}`, 20, 90);
  ctx.fillText(`Round: ${round}`, 20, 120);

  // Game over conditions
  if (health <= 0) {
    showEndScreen("YOU DIED");
    return;
  }

  if (ammo <= 0 && bullets.length === 0) {
    showEndScreen("OUT OF AMMO");
    return;
  }

  if (zombies.length === 0) {
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
