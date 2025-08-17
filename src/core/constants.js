export const constants = {
  maxRounds: 13,
  bottomBarHeight: 70,
  bossTriggerThresholds: [15, 20, 25, 30, 100, 110],
  // Background names (just basenames; loader will prefix assets/images/)
  bgImages: [
    "bg_jungle1.png", "bg_jungle2.png", "bg_jungle3.png",
    "bg_jungle4.png", "bg_jungle5.png", "bg_jungle6.png", "bg_jungle7.png", "bg_jungle8.png",
    "bg_jungle9.png", "bg_jungle10.png", "bg_jungle11.png", "bg_jungle12.png", "bg_jungle13.png",
  ],
  ammoCap: 150,
  bullet: { w: 10, h: 24, dy: -7 },
  enemyBullet: { size: 12 },
  zombieTypes: [
    { type: "zombie",  fireRate:120, bulletSpeed:4, hp:1 },
    { type: "zombie2", fireRate: 90, bulletSpeed:5, hp:2 },
    { type: "zombie3", fireRate: 70, bulletSpeed:6, hp:3 },
    { type: "zombie4", fireRate: 40, bulletSpeed:7, hp:4 },
  ],
};
