// src/assets/loader.js
import { resources } from "./resources.js";
import { constants } from "../core/constants.js";

const IMG_TIMEOUT_MS = 4000;

function createAudio(src) {
  const audio = new Audio(src);
  audio.preload = "auto";
  audio.addEventListener("error", () => console.warn("[loader] audio failed:", src));
  return audio;
}

function makePlaceholderCanvas(label = "?") {
  const c = document.createElement("canvas");
  c.width = 48; c.height = 48;
  const g = c.getContext("2d");
  g.fillStyle = "#333"; g.fillRect(0, 0, 48, 48);
  g.strokeStyle = "#f33"; g.lineWidth = 3; g.strokeRect(3, 3, 42, 42);
  g.fillStyle = "#fff"; g.font = "bold 10px monospace";
  g.fillText(String(label).slice(0, 3), 6, 26);
  return c;
}

function loadImage(path, key) {
  return new Promise((resolve) => {
    const img = new Image();
    let done = false;

    const t = setTimeout(() => {
      if (done) return;
      done = true;
      console.warn(`[loader] image timeout (${IMG_TIMEOUT_MS}ms): ${path} → placeholder`);
      resolve(makePlaceholderCanvas(key));
    }, IMG_TIMEOUT_MS);

    img.onload = () => { if (!done) { done = true; clearTimeout(t); resolve(img); } };
    img.onerror = () => {
      if (!done) {
        done = true; clearTimeout(t);
        console.warn("[loader] image failed:", path, "→ placeholder");
        resolve(makePlaceholderCanvas(key));
      }
    };
    img.src = path;
  }).then((img) => { resources.images[key] = img; });
}

export async function loadAllResources(bossDefinitions = []) {
  console.log("[loader] begin; images in resources:", Object.keys(resources.images).length);

  const promises = [];

  // 1) resources.images (relative paths already set there)
  for (const [key, rel] of Object.entries(resources.images)) {
    promises.push(loadImage(rel, key));
  }

  // 2) backgrounds from constants
  for (const name of constants.bgImages || []) {
    if (!resources.images[name]) {
      promises.push(loadImage("assets/images/" + name, name));
    }
  }

  // 3) boss assets
  for (const def of bossDefinitions || []) {
    if (def.image && !resources.images[def.image]) {
      promises.push(loadImage("assets/images/" + def.image, def.image));
    }
    if (def.projectileType && !resources.images[def.projectileType]) {
      promises.push(loadImage("assets/images/" + def.projectileType, def.projectileType));
    }
    if (def.backdrop && !resources.images[def.backdrop]) {
      promises.push(loadImage("assets/images/" + def.backdrop, def.backdrop));
    }
  }

  // 4) Await everything without throwing
  const results = await Promise.allSettled(promises);
  const rejected = results.filter(r => r.status === "rejected").length;
  console.log(`[loader] images done; total:${results.length} rejected:${rejected}`);

  // 5) Audio (non-blocking)
  const baseAudio = "assets/audio/";
  resources.audio.bgm = resources.audio.bgm || createAudio(baseAudio + "jungle_loop.mp3");
  resources.audio.instructionsBgm = resources.audio.instructionsBgm || createAudio(baseAudio + "bgm.wav");
  resources.audio.gameOverMusic = resources.audio.gameOverMusic || createAudio(baseAudio + "gameover.mp3");
  resources.audio.fxShot = resources.audio.fxShot || createAudio(baseAudio + "shot.mp3");
  resources.audio.fxExplosion = resources.audio.fxExplosion || createAudio(baseAudio + "explosion.mp3");

  console.log("[loader] done");
}
