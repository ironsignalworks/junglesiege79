// src/main.js
import { state, updateCanvasSize } from "./core/state.js";
import { loadAllResources } from "./assets/loader.js";
import { bossDefinitions } from "./systems/boss.js";
import GameScene from "./scenes/GameScene.js";
import { gameLoopFactory } from "./core/loop.js";
import { attachKeyboard } from "./input/keyboard.js";
import { attachPointer } from "./input/pointer.js";

console.log("[main] script loaded");

function startGame(scene, { startScreen, canvas }) {
  console.log("[main] startGame()");
  state.canvas = canvas ?? document.getElementById("gameCanvas");
  if (!state.canvas) {
    const c = document.createElement("canvas");
    c.id = "gameCanvas";
    c.width = 800; c.height = 600;
    document.body.appendChild(c);
    state.canvas = c;
  }
  state.ctx = state.canvas.getContext("2d");

  // Show canvas
  if (startScreen) startScreen.style.display = "none";
  state.canvas.style.display = "block";

  // Input
  attachPointer();  // guarded, no-throw
  attachKeyboard();

  // Player seed
  state.tank = state.tank || { x: 0, y: 0, width: 64, height: 64 };
  state.tank.x = Math.max(0, (state.canvas.width / 2) - (state.tank.width / 2));
  state.tank.y = Math.max(0, state.canvas.height - 100);

  state.gameStarted = true;

  // Enter scene
  if (scene?.enter) { try { scene.enter(); } catch (e) { console.error("Scene enter() failed:", e); } }

  // RAF once
  if (!state._gameLoop) {
    state._gameLoop = gameLoopFactory(
      (now) => { try { scene?.update?.(now); } catch (e) { console.error("update() crash:", e); } },
      (now) => { try { scene?.render?.(now); } catch (e) { console.error("render() crash:", e); } }
    );
    requestAnimationFrame(state._gameLoop);
  }

  // Size handling
  updateCanvasSize({ keepTankPosition: true });
  window.addEventListener("resize", () => updateCanvasSize({ keepTankPosition: true }));
}

async function initGame() {
  console.log("[main] initGame()");
  const startBtn = document.getElementById("start-button");
  const startScreen = document.getElementById("start-screen");
  const canvas = document.getElementById("gameCanvas");

  if (canvas) canvas.style.display = "none";
  if (startBtn) { startBtn.disabled = true; startBtn.textContent = "LOADING..."; }

  // Start a safety timer: if loader doesn't complete, we still enable START
  const safety = setTimeout(() => {
    if (startBtn && startBtn.disabled) {
      console.warn("[main] loader safety trip → enabling START anyway");
      startBtn.disabled = false;
      startBtn.textContent = "START";
    }
  }, 3500);

  try {
    await loadAllResources(bossDefinitions);
    state.resourcesLoaded = true;
    console.log("[main] resources loaded");
  } catch (err) {
    console.error("[main] loadAllResources failed:", err);
    if (startBtn) { startBtn.textContent = "START (assets failed)"; }
  } finally {
    clearTimeout(safety);
  }

  const scene = new GameScene();

  // Make button clickable
  if (startBtn) {
    startBtn.disabled = false;
    startBtn.textContent = "START";
    startBtn.onclick = (e) => {
      e.preventDefault();
      startGame(scene, { startScreen, canvas });
    };
  } else {
    // No button? start right away
    startGame(scene, { startScreen, canvas });
  }
}

initGame().catch(e => console.error("[main] init crash:", e));
