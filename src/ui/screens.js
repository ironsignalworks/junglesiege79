import { state, resetGame, updateCanvasSize } from "../core/state.js";
import { resources } from "../assets/resources.js";
import { nextRound } from "../systems/spawn.js";

function ensureEndScreen() {
  let screen = document.getElementById("end-screen");
  if (!screen) {
    screen = document.createElement("div");
    screen.id = "end-screen";
    screen.style.cssText = "position:fixed;inset:0;display:none;background-image:url('assets/images/gameover.png');background-size:cover;background-position:center;background-repeat:no-repeat;z-index:100000;pointer-events:all;";
    // Controls container (bottom center)
    const controls = document.createElement("div");
    controls.style.cssText = "position:absolute;bottom:8vh;left:50%;transform:translateX(-50%);text-align:center;";
    const btn = document.createElement("button");
    btn.id = "restart-button";
    btn.textContent = "Restart";
    btn.style.cssText = "padding:10px 18px;border-radius:10px;border:1px solid #8fe88f;background:#1a2a14;color:#bfffbf;cursor:pointer;font-family:monospace;font-size:16px;";
    controls.appendChild(btn);
    screen.appendChild(controls);
    document.body.appendChild(screen);
  }
  return screen;
}

export function initScreens() {
  const d = document;
  state.startScreen   = d.getElementById("start-screen") || null;
  state.endScreen     = d.getElementById("end-screen") || null;
  state.startButton   = d.getElementById("start-button") || null;
  state.restartButton = d.getElementById("restart-button") || null;
}

export function showEndScreen(message = "") {
  // Remove How-To-Play if present
  const htp = document.getElementById("how-to-play");
  if (htp) htp.remove();

  // Hide other overlays and canvas
  const toHide = ["start-screen", "end-screen-hard", "pause-overlay", "ui", "hud"];
  for (const id of toHide) {
    const el = document.getElementById(id);
    if (el) el.style.display = "none";
  }
  const canvas = document.getElementById("gameCanvas") || document.querySelector("canvas");
  const __prevCanvasDisplay = canvas && canvas.style.display;
  if (canvas) canvas.style.display = "none";

  // Resolve gameover image URL (prefer loader)
  let gameoverUrl = "assets/images/gameover.png";
  try {
    if (resources?.images?.["gameover.png"]) {
      const imgObj = resources.images["gameover.png"];
      if (imgObj && (imgObj.src || imgObj.currentSrc)) {
        gameoverUrl = imgObj.currentSrc || imgObj.src;
      }
    }
  } catch {}

  // Build or reuse full-screen end screen
  let screen = document.getElementById("end-screen");
  if (!screen) {
    screen = document.createElement("div");
    screen.id = "end-screen";
    document.body.appendChild(screen);
  }
  // Base screen styles (background image is decorative; keep as-is even if stretched)
  screen.style.position = "fixed";
  screen.style.top = "0";
  screen.style.left = "0";
  screen.style.width = "100vw";
  screen.style.height = "100vh";
  screen.style.display = "none";
  screen.style.backgroundColor = "#000";
  screen.style.backgroundImage = "none"; // use <img> layer only
  screen.style.zIndex = "2147483647";
  screen.style.pointerEvents = "all";
  screen.style.overflow = "hidden";

  // Ensure full-screen <img id="end-bg"> exists and covers viewport
  let bg = document.getElementById("end-bg");
  if (!bg) {
    bg = document.createElement("img");
    bg.id = "end-bg";
    bg.alt = "Game Over";
    bg.decoding = "async";
    bg.loading = "eager";
    screen.appendChild(bg);
    bg.addEventListener("load", () => console.info("[UI] gameover.png loaded", bg.naturalWidth + "x" + bg.naturalHeight));
    bg.addEventListener("error", () => console.warn("[UI] Failed to load", bg.src));
  }
  bg.src = gameoverUrl;
  bg.style.position = "absolute";
  bg.style.top = "0";
  bg.style.left = "0";
  bg.style.width = "100vw";
  bg.style.height = "100vh";
  bg.style.pointerEvents = "none";
  try { bg.style.setProperty("object-fit", "cover", "important"); } catch { bg.style.objectFit = "cover"; }

  // Center overlay with title + stats + restart button
  let overlay = document.getElementById("end-overlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "end-overlay";
    screen.appendChild(overlay);
  }
  overlay.style.position = "absolute";
  overlay.style.inset = "0";
  overlay.style.display = "flex";
  overlay.style.flexDirection = "column";
  overlay.style.alignItems = "center";
  overlay.style.justifyContent = "center";
  overlay.style.gap = "10px";
  overlay.style.textAlign = "center";
  overlay.style.fontFamily = "monospace";
  overlay.style.color = "#e6ffe6";
  overlay.style.textShadow = "0 2px 4px rgba(0,0,0,.8)";
  overlay.style.padding = "16px";
  overlay.style.zIndex = "2147483647";
  overlay.style.pointerEvents = "none";

  let title = document.getElementById("end-title");
  if (!title) {
    title = document.createElement("div");
    title.id = "end-title";
    overlay.appendChild(title);
  }
  title.textContent = message || "GAME OVER";
  title.style.fontSize = "clamp(26px, 4.8vw, 50px)";
  title.style.fontWeight = "700";
  title.style.letterSpacing = "2px";

  let stats = document.getElementById("end-stats");
  if (!stats) {
    stats = document.createElement("div");
    stats.id = "end-stats";
    overlay.appendChild(stats);
  }
  const score = (state.score ?? 0);
  let bestScore = 0;
  try { bestScore = parseInt(localStorage.getItem("bestScore") || "0", 10) || 0; } catch {}
  if (score > bestScore) {
    bestScore = score;
    try { localStorage.setItem("bestScore", String(bestScore)); } catch {}
  }
  stats.innerHTML = `<div style="font-size:clamp(16px,2.2vw,22px)">SCORE: <b>${score}</b></div>` +
                    `<div style="opacity:.9;font-size:clamp(14px,2vw,18px)">BEST: <b>${bestScore}</b></div>`;

  // Restart button (centered under stats)
  let btn = overlay.querySelector("#restart-button");
  if (!btn) {
    btn = document.createElement("button");
    btn.id = "restart-button";
    overlay.appendChild(btn);
  btn.style.pointerEvents = "auto";
  }
  btn.textContent = "Restart";
  btn.style.padding = "12px 22px";
  btn.style.borderRadius = "12px";
  btn.style.border = "1px solid #8fe88f";
  btn.style.background = "#1a2a14";
  btn.style.color = "#bfffbf";
  btn.style.cursor = "pointer";
  btn.style.fontFamily = "monospace";
  btn.style.fontSize = "18px";
  btn.style.marginTop = "10px";
  btn.style.boxShadow = "0 4px 14px rgba(0,0,0,.55)";
  btn.style.display = "inline-block";
  btn.style.opacity = "1";
  btn.style.zIndex = "2147483647";
  btn.style.pointerEvents = "auto";
  btn.style.transform = "translateZ(0)"; // ensure layer on top

  // Show end screen
  screen.style.display = "block";
  document.body.style.overflow = "hidden";

  const rect = screen.getBoundingClientRect();
  console.info("[UI] GameOver screen shown", { x: rect.x, y: rect.y, w: rect.width, h: rect.height, src: gameoverUrl });

  // Stop gameplay + audio
  try {
    state.gameStarted = false;
    resources.audio?.bgm && (resources.audio.bgm.pause(), resources.audio.bgm.currentTime = 0);
    resources.audio?.instructionsBgm && (resources.audio.instructionsBgm.pause(), resources.audio.instructionsBgm.currentTime = 0);
  } catch {}

  // Play gameover audio
  try {
    if (resources?.audio?.gameOverMusic) {
      resources.audio.gameOverMusic.currentTime = 0;
      resources.audio.gameOverMusic.play().catch(()=>{});
    } else {
      const a = new Audio("assets/audio/gameover.mp3");
      a.play().catch(()=>{});
    }
  } catch {}

  // Hook restart
  const restart = () => {
    screen.style.display = "none";
    document.body.style.overflow = "";
    try { resources?.audio?.gameOverMusic && (resources.audio.gameOverMusic.pause(), resources.audio.gameOverMusic.currentTime = 0); } catch {}
    if (canvas) canvas.style.display = __prevCanvasDisplay || "";
    resetGame();
    updateCanvasSize({ keepTankPosition: true });
    nextRound();
    state.gameStarted = true;
    if (typeof requestAnimationFrame === "function" && state._gameLoop) requestAnimationFrame(state._gameLoop);
    document.removeEventListener("keydown", keyHandler, true);
  };
  btn.onclick = restart;

  function keyHandler(e) {
    if (e.code === "Enter" || e.code === "Space") { e.preventDefault(); restart(); }
  }
  document.addEventListener("keydown", keyHandler, true);
}
