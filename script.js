// Elements
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const startScreen = document.getElementById("start-screen");
const endScreen = document.getElementById("end-screen");
const startButton = document.getElementById("start-button");
const endMessage = document.getElementById("end-message");
const restartButton = document.getElementById("restart-button");
const finalScoreText = document.getElementById("final-score");
const bestScoreText = document.getElementById("best-score");

// Validate essential elements
if (!canvas || !ctx) {
    console.error('Canvas element or 2D context not found!');
    throw new Error('Canvas initialization failed');
}

// Game constants and variables
const maxRounds = 7;
let bottomBarHeight = 70; // Will be dynamically adjusted

// Image and audio resources
const resources = {
    images: {},
    audio: {}
};

const bgImages = [
    "bg_jungle1.png", "bg_jungle2.png", "bg_jungle3.png",
    "bg_jungle4.png", "bg_jungle5.png", "bg_jungle6.png", "bg_jungle7.png", "bg_jungle8.png", "bg_jungle9.png", "bg_jungle10.png", "bg_jungle11.png", "bg_jungle12.png", "bg_jungle13.png",
];

let bullets = [];
let zombies = [];
let ammo = 50;
let health = 100;
let score = 0;
let round = 0;
let gameStarted = false;
let spawningInProgress = false;
let resourcesLoaded = false;

let tank = {
    x: 0,
    y: 0,
    width: 80,
    height: 80
};

let pointerX = 0;

// Performance monitoring
let fps = 0;
let lastTime = 0;
let frameCount = 0;

// Safe audio creation with error handling
function createAudio(src) {
    const audio = new Audio();
    audio.addEventListener('error', (e) => {
        console.warn(`Audio file not found: ${src}, continuing without audio`);
    });
    audio.addEventListener('canplaythrough', () => {
        console.log(`Audio loaded: ${src}`);
    });
    audio.src = src;
    return audio;
}

// Safe image loading with promises
function loadImage(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            console.log(`Image loaded: ${src}`);
            resolve(img);
        };
        img.onerror = () => {
            console.error(`Failed to load image: ${src}`);
            // Create a fallback colored rectangle
            const fallbackCanvas = document.createElement('canvas');
            fallbackCanvas.width = 80;
            fallbackCanvas.height = 80;
            const fallbackCtx = fallbackCanvas.getContext('2d');
            fallbackCtx.fillStyle = src.includes('tank') ? '#4CAF50' : 
                                  src.includes('zombie') ? '#F44336' : '#2196F3';
            fallbackCtx.fillRect(0, 0, 80, 80);
            resolve(fallbackCanvas);
        };
        img.src = src;
    });
}

// Initialize audio resources
function initializeAudio() {
    resources.audio.menuMusic = createAudio("end.mp3");  // Renamed for clarity
    resources.audio.gameOverMusic = resources.audio.menuMusic;  // Reference the same audio
    resources.audio.bgm = createAudio("bgm_jungle_loop.wav");
    resources.audio.fxShot = createAudio("fx_shot.wav");
    resources.audio.fxExplosion = createAudio("fx_explosion.wav");
}

// Load all resources
async function loadAllResources() {
    try {
        console.log('Loading resources...');

        // Initialize audio
        initializeAudio();

        // Load essential images
        const imagePromises = [
            loadImage('tank.png').then(img => resources.images.tank = img),
            loadImage('zombie.png').then(img => resources.images.zombie = img),
            loadImage('bg_jungle8.jpg').then(img => resources.images.gameOverBg = img)
        ];

        // Load background images
        const bgPromises = bgImages.map(async (src, index) => {
            const img = await loadImage(src);
            resources.images[`bg${index}`] = img;
        });

        // Wait for all images to load
        await Promise.all([...imagePromises, ...bgPromises]);

        // Start menu music after all resources load
        if (resources.audio.menuMusic) {
            resources.audio.menuMusic.loop = true;
            try {
                await resources.audio.menuMusic.play();
            } catch (e) {
                console.warn('Menu music autoplay failed:', e);
            }
        }

        // Enable UI
        resourcesLoaded = true;
        startButton.disabled = false;
        startButton.textContent = 'START GAME';

        console.log('All resources loaded successfully');

    } catch (error) {
        console.error('Resource loading failed:', error);

        // Allow the game to continue with partial assets
        resourcesLoaded = true;
        startButton.disabled = false;
        startButton.textContent = 'Load Failed - Try Anyway';
    }
}

// Canvas sizing and responsive handling
function updateCanvasSize() {
    const container = canvas.parentElement || document.body;
    const rect = container.getBoundingClientRect();
    
    // Set canvas size to container size or window size
    canvas.width = rect.width || window.innerWidth;
    canvas.height = rect.height || window.innerHeight;
    
    // Update bottom bar height based on screen size
    bottomBarHeight = Math.max(60, Math.min(100, canvas.height * 0.1));
    
    // Update tank position for new size
    tank.x = Math.max(0, Math.min(canvas.width - tank.width, tank.x));
    tank.y = canvas.height - bottomBarHeight - tank.height;
    
    // Update pointer position
    pointerX = canvas.width / 2;
    
    console.log(`Canvas resized to: ${canvas.width}x${canvas.height}`);
}

// Event Listeners
startButton.disabled = true;
startButton.textContent = 'LOADING...';

startButton.addEventListener("click", () => {
    if (!resourcesLoaded) {
        console.warn('Resources not fully loaded, starting anyway...');
    }
    
    startScreen.style.display = "none";
    endScreen.style.display = "none";
    restartButton.style.display = "none";
    canvas.style.display = "block";
    gameStarted = true;
    resetGame();
   
    // Start background music safely
    if (resources.audio.bgm) {
        resources.audio.bgm.loop = true;
        resources.audio.bgm.play().catch(e => console.warn('BGM playback failed:', e));
    }
    
    nextRound();
    requestAnimationFrame(gameLoop);
    
    // Stop game over music
    if (resources.audio.gameOverMusic) {
        resources.audio.gameOverMusic.pause();
        resources.audio.gameOverMusic.currentTime = 0;
    }
});

restartButton.addEventListener("click", () => {
    endScreen.style.display = "none";
    canvas.style.display = "block";
    resetGame();
    
    if (resources.audio.bgm) {
        resources.audio.bgm.loop = true;
        resources.audio.bgm.play().catch(e => console.warn('BGM playback failed:', e));
    }
    
    nextRound();
    gameStarted = true;
    requestAnimationFrame(gameLoop);
    
    if (resources.audio.gameOverMusic) {
        resources.audio.gameOverMusic.pause();
        resources.audio.gameOverMusic.currentTime = 0;
    }
});

// Mouse and touch controls with better coordinate handling
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

// Window resize handling
window.addEventListener('resize', () => {
    updateCanvasSize();
    if (gameStarted) {
        // Redraw immediately after resize
        requestAnimationFrame(gameLoop);
    }
});

window.addEventListener('orientationchange', () => {
    setTimeout(updateCanvasSize, 100);
});

// Functions
function resetGame() {
    bullets.length = 0;
    zombies.length = 0;
    ammo = 50;
    health = 100;
    score = 0;
    round = 0;
    
    // Reset tank position
    tank.x = canvas.width / 2 - tank.width / 2;
    tank.y = canvas.height - bottomBarHeight - tank.height;
    
    spawningInProgress = false;
    frameCount = 0;
    fps = 0;
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

function spawnZombie(speed) {
    const zombieWidth = 60;
    const zombieHeight = 60;
    let x = Math.random() * (canvas.width - zombieWidth);
    
    zombies.push({ 
        x, 
        y: -zombieHeight, 
        width: zombieWidth, 
        height: zombieHeight, 
        speed: Math.max(0.5, speed)
    });
}

function nextRound() {
    if (!gameStarted) return;
    
    round++;
    spawningInProgress = true;
    
    console.log(`Starting round ${round}`);
    
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
    
    // Stop gameplay music
    if (resources.audio.bgm) {
        resources.audio.bgm.pause();
        resources.audio.bgm.currentTime = 0;
    }
    
    // Play game over music
    if (resources.audio.gameOverMusic) {
        resources.audio.gameOverMusic.currentTime = 0;
        resources.audio.gameOverMusic.play().catch(e => console.warn('Game over music failed:', e));
    }
    
    // Draw final screen
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
    
    // Handle best score with error handling
    let best = 0;
    try {
        best = parseInt(localStorage.getItem("jungle_best_score")) || 0;
        if (score > best) {
            best = score;
            localStorage.setItem("jungle_best_score", best);
        }
    } catch (e) {
        console.warn('localStorage not available:', e);
    }
    
    bestScoreText.textContent = `Best: ${best}`;
    
    console.log(`Game ended: ${message}, Score: ${score}`);
}

function playSound(sound) {
    if (!sound) return;
    
    try {
        const sfx = sound.cloneNode();
        sfx.play().catch(e => {
            console.warn('Audio playback failed:', e);
        });
    } catch (error) {
        console.warn('Audio not available:', error);
    }
}

/**
 * Draws a responsive bottom bar with all game stats
 */
function drawBottomBar() {
    const padding = Math.max(10, canvas.width * 0.02);
    const barWidth = Math.min(300, canvas.width * 0.4);
    const barHeight = Math.max(20, canvas.height * 0.025);
    const barX = padding + Math.max(70, canvas.width * 0.08);
    const barY = canvas.height - bottomBarHeight / 2 - (barHeight / 2);
    const fontSize = Math.max(12, Math.min(18, canvas.width * 0.025));
    
    // Background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(0, canvas.height - bottomBarHeight, canvas.width, bottomBarHeight);
    
    // Text styling
    ctx.fillStyle = "white";
    ctx.font = `bold ${fontSize}px Arial, sans-serif`;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    
    // Health label
    ctx.fillText("HEALTH", padding, canvas.height - bottomBarHeight / 2);
    
    // Health bar background
    ctx.fillStyle = "#333";
    ctx.fillRect(barX, barY, barWidth, barHeight);
    
    // Health bar fill
    const healthPercentage = Math.max(0, Math.min(100, health)) / 100;
    const healthBarWidth = barWidth * healthPercentage;
    
    if (healthPercentage > 0.6) ctx.fillStyle = "#4CAF50"; // Green
    else if (healthPercentage > 0.3) ctx.fillStyle = "#FF9800"; // Orange
    else ctx.fillStyle = "#F44336"; // Red
    
    ctx.fillRect(barX, barY, healthBarWidth, barHeight);
    
    // Health bar border
    ctx.strokeStyle = "white";
    ctx.lineWidth = 2;
    ctx.strokeRect(barX, barY, barWidth, barHeight);
    
    // Other stats
    ctx.fillStyle = "white";
    const spacing = Math.max(120, canvas.width * 0.15);
    const statsY = canvas.height - bottomBarHeight / 2 + barHeight + 5;
    
    ctx.fillText(`AMMO: ${ammo}`, padding, statsY);
    ctx.fillText(`SCORE: ${score}`, padding + spacing, statsY);
    ctx.fillText(`ROUND: ${round}`, padding + spacing * 2, statsY);
    
    // FPS display (optional, for debugging)
    if (fps > 0) {
        ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
        ctx.font = `${fontSize * 0.7}px Arial`;
        ctx.fillText(`FPS: ${fps}`, canvas.width - 80, canvas.height - 10);
    }
}

// Improved collision detection
function checkCollision(rect1, rect2) {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y;
}

function gameLoop(currentTime) {
    if (!gameStarted) return;
    
    // Performance monitoring
    frameCount++;
    if (currentTime - lastTime >= 1000) {
        fps = frameCount;
        frameCount = 0;
        lastTime = currentTime;
    }
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw background
    const bgIndex = Math.min(round - 1, bgImages.length - 1);
    const bgImage = resources.images[`bg${bgIndex}`];
    if (bgImage) {
        ctx.drawImage(bgImage, 0, 0, canvas.width, canvas.height);
    } else {
        // Fallback gradient background
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, '#87CEEB');
        gradient.addColorStop(1, '#228B22');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    
    // Move tank toward pointer with smooth interpolation
    const targetX = pointerX - tank.width / 2;
    tank.x += (targetX - tank.x) * 0.1;
    
    // Keep tank within bounds
    tank.x = Math.max(0, Math.min(canvas.width - tank.width, tank.x));
    
    // Draw tank
    if (resources.images.tank) {
        ctx.drawImage(resources.images.tank, tank.x, tank.y, tank.width, tank.height);
    } else {
        // Fallback tank
        ctx.fillStyle = "#4CAF50";
        ctx.fillRect(tank.x, tank.y, tank.width, tank.height);
    }
    
    // Update and draw bullets
    bullets = bullets.filter(b => b.y > -b.height);
    bullets.forEach(b => {
        b.y += b.dy;
        ctx.fillStyle = "yellow";
        ctx.fillRect(b.x, b.y, b.width, b.height);
    });
    
    // Update and draw zombies
    for (let zi = zombies.length - 1; zi >= 0; zi--) {
        const z = zombies[zi];
        z.y += z.speed;
        
        // Draw zombie
        if (resources.images.zombie) {
            ctx.drawImage(resources.images.zombie, z.x, z.y, z.width, z.height);
        } else {
            // Fallback zombie
            ctx.fillStyle = "#F44336";
            ctx.fillRect(z.x, z.y, z.width, z.height);
        }
        
        // Collision with tank
        if (checkCollision(z, tank)) {
            zombies.splice(zi, 1);
            health -= 10;
            playSound(resources.audio.fxExplosion);
            continue;
        }
        
        // Collision with bullets
        for (let bi = bullets.length - 1; bi >= 0; bi--) {
            const b = bullets[bi];
            if (checkCollision(b, z)) {
                playSound(resources.audio.fxExplosion);
                zombies.splice(zi, 1);
                bullets.splice(bi, 1);
                score++;
                ammo++;
                break;
            }
        }
    }
    
    // Remove zombies that have gone off screen
    zombies = zombies.filter(z => z.y < canvas.height + 100);
    
    // Draw bottom bar
    drawBottomBar();
    
    // Game over conditions
    if (health <= 0) {
        showEndScreen("ZOMBIES WIN!");
        return;
    }
    
    if (ammo <= 0 && bullets.length === 0) {
        showEndScreen("OUT OF AMMO!");
        return;
    }
    
    // Check for round completion
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

// Game cleanup function
function cleanupGame() {
    gameStarted = false;
    bullets.length = 0;
    zombies.length = 0;
    
    if (resources.audio.bgm) {
        resources.audio.bgm.pause();
        resources.audio.bgm.currentTime = 0;
    }
    
    if (resources.audio.gameOverMusic) {
        resources.audio.gameOverMusic.pause();
        resources.audio.gameOverMusic.currentTime = 0;
    }
}

// Initialize screens
function initializeScreens() {
    startScreen.style.display = "flex";
    endScreen.style.display = "column";
    canvas.style.display = "center";
    gameStarted = false;
canvas.style.zIndex = '1';
endScreen.style.zIndex = '10';
}

// Initialize everything
function initialize() {
    console.log('Initializing game...');
    
    // Set up canvas
    updateCanvasSize();
    
    // Initialize screens
    initializeScreens();
    
    // Load all resources
    loadAllResources();
    
    console.log('Game initialized');
}

// Handle page unload
window.addEventListener('beforeunload', cleanupGame);

// Start initialization
initialize();