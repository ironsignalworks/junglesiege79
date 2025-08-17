# Jungle Siege '79 – Modular & Organized

Ready-to-deploy vanilla ES modules build with clean folders and your original `boss.js` already wired in.

## Run locally
From this folder (the one with `index.html`), start a static server:
- Python: `python -m http.server 8000`
- Node: `npx http-server -p 8000`
Then open: http://localhost:8000/

## Where to place your assets
Put all **images** into: `assets/images/`
Put all **audio** into:  `assets/audio/`

### Expected filenames (rename yours to these for zero-config)
Images (place in `assets/images/`):
- ammo.png
- medkit.png
- tank.png
- zombie.png, zombie2.png, zombie3.png, zombie4.png
- gameover.png
- skull.png, katana2.png, mace.png
- kurtz.png, katana.png, melissa.png  (used by your boss.js)
- bomber.png (optional)
- bg_jungle1.png … bg_jungle13.png

Audio (place in `assets/audio/`):
- jungle_loop.mp3  (BGM during gameplay)
- bgm.mp3          (How-to overlay music)
- gameover.mp3
- shot.mp3
- explosion.mp3

> If your audio files have different extensions (e.g. `.wav`), either rename them to the above or change the filenames inside `src/assets/loader.js`.

## Your boss.js
Your original logic is included at: `src/systems/boss.js` (exporting `Boss` and `bossDefinitions`). The loader automatically picks up the images it references (e.g., `kurtz.png`, `katana.png`, `melissa.png`, projectile sprites).

## Notes
- The code gracefully falls back to placeholders if any image is missing, so you can boot the game even before you drop assets in.
- All imports are relative and self-contained; just use a static server from the project root.
