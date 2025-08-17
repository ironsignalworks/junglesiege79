// src/core/state.js
import { constants } from "./constants.js";

export const state = {
  canvas: null,
  ctx: null,
  startScreen: null,
  endScreen: null,
  startButton: null,
  endMessage: null,
  restartButton: null,
  finalScoreText: null,
  bestScoreText: null,
  gameoverImg: null,

  gameStarted: false,
  resourcesLoaded: false,
  spawningInProgress: false,
  howToPlayShown: false,

  tank: { x: 0, y: 0, width: 80, height: 80 },
  ammo: 100,
  health: 100,
  score: 0,
  round: 0,

  bullets: [],
  zombies: [],
  enemyBullets: [],
  ammoDrops: [],
  medkitDrops: [],

  boss: null,
  bossActive: false,
  bossDefeated: false,
  bossIndex: 0,
  bossTriggerCount: constants.bossTriggerThresholds[0],
  bossAnnouncementShowing: false,
  bossProjectiles: [],
  bossPortraitAlpha: 0,

  screenShake: 0,
  flashWhite: 0,
  flashRed: 0,

  lastKillTime: 0,
  comboCount: 0,
  comboTimer: 0,
  comboDisplay: "",

  keyLeft: false,
  keyRight: false,
  keyUp: false,
  keyDown: false,
  pointerX: 0,
  pointerY: 0,

  fps: 0,
  lastTime: 0,
  frameCount: 0,

  _gameLoop: null,
};

/**
 * Resize the canvas to fit the window.
 * @param {Object} options
 * @param {boolean} options.keepTankPosition - Keep the tank in its current position.
 */
export function updateCanvasSize({ keepTankPosition = true } = {}) {
  const { canvas, tank } = state;
  if (!canvas) return;

  const prevX = tank.x;
  const prevY = tank.y;

  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  if (keepTankPosition) {
    // Clamp tank position to bounds
    tank.x = Math.max(0, Math.min(canvas.width - tank.width, prevX));
    const minY = canvas.height - constants.bottomBarHeight - tank.height;
    const topLimit = canvas.height / 2;
    tank.y = Math.max(topLimit, Math.min(minY, prevY));
  } else {
    // Explicit recentre
    tank.x = canvas.width / 2 - tank.width / 2;
    tank.y = canvas.height - constants.bottomBarHeight - tank.height;
  }
}

export function resetGame() {
  const { canvas, tank } = state;
  if (!canvas) return;

  state.bullets = [];
  state.zombies = [];
  state.enemyBullets = [];
  state.ammoDrops = [];
  state.medkitDrops = [];
  state.bossProjectiles = [];
  state.ammo = 50;
  state.health = 100;
  state.score = 0;
  state.round = 0;
  state.spawningInProgress = false;
  state.frameCount = 0;
  state.fps = 0;
  tank.x = canvas.width / 2 - tank.width / 2;
  tank.y = canvas.height - constants.bottomBarHeight - tank.height;
  state.pointerX = canvas.width / 2;
  state.pointerY = tank.y;
  state.bossIndex = 0;
  state.boss = null;
  state.bossActive = false;
  state.bossDefeated = false;
  state.bossTriggerCount = constants.bossTriggerThresholds[0];
  state.bossAnnouncementShowing = false;
  state.comboCount = 0;
  state.comboDisplay = "";
  state.comboTimer = 0;
  if (state.gameoverImg) state.gameoverImg.style.display = "none"; // hide on reset
}

export function playSound(sound) {
  if (sound) {
    try {
      sound.currentTime = 0;
      sound.play().catch(() => {});
    } catch (e) {
      console.warn("Failed to play sound:", e);
    }
  }
}
