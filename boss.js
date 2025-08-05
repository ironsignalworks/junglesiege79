// boss.js

export class Boss {
constructor(def, sprite, x, y) {
  this.name = def.name;
  this.sprite = sprite;
  this.x = x;
  this.y = y;
  this.width = def.width || 150;
  this.height = def.height || 200;
  this.maxHealth = def.maxHealth || 400;
  this.health = this.maxHealth;
  this.speed = def.speed || 2.0;
  this.phase = 1;
  this.cooldown = 0;
  this.attackPattern = def.attackPattern;
  this.type = def.type;
  this.projectileType = def.projectileType;   // <--- ADD THIS LINE!
  this.isAlive = true;
  this.attackCooldown = 90 + Math.random() * 60;
}
  update(player, projectiles, canvas, bottomBarHeight) {
    if (!this.isAlive) return;
    // Move toward player in all directions
    let dx = player.x + player.width / 2 - (this.x + this.width / 2);
    let dy = player.y + player.height / 2 - (this.y + this.height / 2);
    let dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > 10) {
      this.x += (dx / dist) * this.speed;
      this.y += (dy / dist) * this.speed;
      // Clamp to screen
      this.x = Math.max(0, Math.min(canvas.width - this.width, this.x));
     const maxBossY = canvas.height - bottomBarHeight - this.height - Math.floor(canvas.height * 0.30);
this.y = Math.max(10, Math.min(maxBossY, this.y));
    }
    // Attack: shoot at player
   this.attackCooldown--;
if (this.attackCooldown <= 0) {
  let angle = Math.atan2(dy, dx);
  projectiles.push({
    x: this.x + this.width / 2 - 6,
    y: this.y + this.height / 2 - 6,
    dx: Math.cos(angle) * 6,
    dy: Math.sin(angle) * 6,
    width: 32,
    height: 32,
    type: this.projectileType
  });
  this.attackCooldown = 70 + Math.random() * 40; // Next attack
}

    // Contact damage
    if (
      player.x + player.width > this.x &&
      player.x < this.x + this.width &&
      player.y + player.height > this.y &&
      player.y < this.y + this.height
    ) {
      player.health -= 0.3;
    }
  }
  render(ctx) {
    if (!this.isAlive) return;
    if (this.sprite) ctx.drawImage(this.sprite, this.x, this.y, this.width, this.height);
    else {
      ctx.save();
      ctx.fillStyle = 'red';
      ctx.fillRect(this.x, this.y, this.width, this.height);
      ctx.font = '20px monospace';
      ctx.fillStyle = '#fff';
      ctx.fillText(this.name, this.x + 6, this.y - 8);
      ctx.restore();
    }
  }
}

export const bossDefinitions = [
  {
    name: "Colonel Kurtz",
    image: "kurtz.png",
    width: 180,
    height: 240,
    maxHealth: 300,
    speed: 1.5,
    attackPattern: "berserk",
    projectileType: "skull",   // <- Add this
    type: "kurtz"
  },
  {
    name: "Katana Joe",
    image: "katana.png",
    width: 150,
    height: 220,
    maxHealth: 480,
    speed: 2.0,
    attackPattern: "slash",
    projectileType: "katana2", // <- Add this
    type: "katana"
  },
  {
    name: "Mallet Melissa",
    image: "melissa.png",
    width: 160,
    height: 240,
    maxHealth: 700,
    speed: 2.4,
    attackPattern: "mallet",
    projectileType: "mace",    // <- Add this
    type: "melissa"
  }
];

