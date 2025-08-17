// src/systems/boss.js

export class Boss {
  constructor(def, sprite, x, y) {
    // Identity / visuals
    this.name = def.name || "BOSS";
    this.sprite = sprite;           // preloaded image element from resources
    this.backdrop = def.backdrop;   // optional background image key (e.g., "bg_kurtz.png")

    // Position / size
    this.x = x || 0;
    this.y = y || 0;
    this.width  = def.width  || 150;
    this.height = def.height || 200;

    // Stats
    this.maxHealth = def.maxHealth || 400;
    this.health    = this.maxHealth;
    this.speed     = def.speed || 2.0;
    this.isAlive   = true;

    // Attacks
    this.attackPattern  = def.attackPattern || "default";
    this.projectileType = def.projectileType || "ammo.png"; // MUST include extension
    this.attackCooldown = 90 + Math.random() * 60;          // frames/ticks, tuned by caller

    // Internal
    this._t = 0; // small wiggle timer if you want to add motion variety later
  }

  /**
   * Update boss position and fire projectiles toward the player.
   * - player: tank object (x,y,width,height)
   * - projectiles: array to push boss projectiles into
   * - canvas: for bounds
   * - bottomBarHeight: HUD height to keep boss away from the bottom UI
   */
  update(player, projectiles, canvas, bottomBarHeight) {
    if (!this.isAlive) return;

    // Move toward player (clamped so the boss doesn't overlap HUD)
    const cx = this.x + this.width  / 2;
    const cy = this.y + this.height / 2;
    const px = player.x + player.width  / 2;
    const py = player.y + player.height / 2;

    let dx = px - cx;
    let dy = py - cy;
    const dist = Math.max(1, Math.hypot(dx, dy));

    // Gentle pursuit
    if (dist > 10) {
      this.x += (dx / dist) * this.speed;
      this.y += (dy / dist) * this.speed;

      // Clamp within playfield (leave headroom above bottom HUD)
      this.x = Math.max(0, Math.min(canvas.width - this.width, this.x));
      const maxY = canvas.height - bottomBarHeight - this.height - Math.floor(canvas.height * 0.30);
      this.y = Math.max(10, Math.min(maxY, this.y));
    }

    // Shoot at player
    this.attackCooldown--;
    if (this.attackCooldown <= 0) {
      const ang = Math.atan2(dy, dx);
      const speed = 6;
      projectiles.push({
        x: this.x + this.width / 2 - 6,
        y: this.y + this.height / 2 - 6,
        dx: Math.cos(ang) * speed,
        dy: Math.sin(ang) * speed,
        width: 32,
        height: 32,
        type: this.projectileType, // e.g., "skull.png", "katana2.png"
      });
      this.attackCooldown = 70 + Math.random() * 40; // next shot
    }

    // NOTE: Contact damage is handled outside (in GameScene) via collision checks.
    // Avoid writing to player.health here—your game tracks it in state.health.
  }

  render(ctx) {
    if (!this.isAlive) return;

    if (this.sprite) {
      ctx.drawImage(this.sprite, this.x, this.y, this.width, this.height);
    } else {
      // Fallback rectangle if sprite missing
      ctx.save();
      ctx.fillStyle = "#b71c1c";
      ctx.fillRect(this.x, this.y, this.width, this.height);
      ctx.fillStyle = "#fff";
      ctx.font = "bold 18px monospace";
      ctx.fillText(this.name, this.x + 6, this.y - 8);
      ctx.restore();
    }
  }
}

/**
 * Boss roster.
 * IMPORTANT: Keep image and projectileType as keys that exist in resources.images (with extension).
 * Optional: 'backdrop' is a key for a boss-specific background (e.g., "bg_kurtz.png").
 */
export const bossDefinitions = [
  {
    name: "Colonel Kurtz",
    image: "kurtz.png",
    width: 180,
    height: 240,
    maxHealth: 10,
    speed: 1.5,
    attackPattern: "berserk",
    projectileType: "skull.png",
    type: "kurtz",
    backdrop: "bg_kurtz.png",
  },
  {
    name: "Katana Joe",
    image: "katana.png",
    width: 150,
    height: 220,
    maxHealth: 48,
    speed: 2.0,
    attackPattern: "slash",
    projectileType: "katana2.png",
    type: "katana",
    backdrop: "bg_joe.png",
  },
  {
    name: "Mallet Melissa",
    image: "melissa.png",
    width: 160,
    height: 240,
    maxHealth: 70,
    speed: 2.4,
    attackPattern: "mallet",
    projectileType: "mace.png",
    type: "melissa",
    backdrop: "bg_melissa.png",
  },
];
