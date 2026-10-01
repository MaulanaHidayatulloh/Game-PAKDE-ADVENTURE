const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

ctx.imageSmoothingEnabled = false;

const GAME_WIDTH = 1200;
const GAME_HEIGHT = 600;

canvas.width = GAME_WIDTH;
canvas.height = GAME_HEIGHT;

// GAME STATE
let gameRunning = false;
let gameWon = false;
let gamePaused = false;

let score = 0;
let coinsCollected = 0;
let lives = 3;

let cameraX = 0;
let gameTime = 0;
let lastTime = 0;

// SOUND SETTINGS
const musicEnabled = localStorage.getItem("musicEnabled") !== "false";
const sfxEnabled = localStorage.getItem("sfxEnabled") !== "false";

//  SOUND
const sounds = {
  enemy: new Audio("assets/enemy.mp3"),
  death: new Audio("assets/death.mp3"),
  coin: new Audio("assets/coin.mp3"),
  jump: new Audio("assets/jump.mp3"),
  coinsCollected: new Audio("assets/coin-collect.mp3"),
  enemyNear: new Audio("assets/enemy-2.mp3"),
  background: new Audio("assets/backsong.mp3"),
  mushroom: new Audio("assets/mushroom.mp3"),

  /* SCREEN / DEATH SOUNDS */
  startScreen: new Audio("assets/opening.mp3"),
  gameOver: new Audio("assets/defeat.mp3"),
  deathPowered: new Audio("assets/death_powered-up.mp3"),
  win: new Audio("assets/win.mp3"),
  pause: new Audio("assets/pause.mp3"),
};

sounds.background.loop = true;
sounds.startScreen.loop = true;
sounds.gameOver.loop = true;
sounds.win.loop = true;
sounds.background.volume = 0.2;
sounds.enemyNear.volume = 0.15;
sounds.jump.volume = 0.3;
sounds.coin.volume = 0.5;
sounds.startScreen.volume = 0.4;
sounds.gameOver.volume = 0.5;
sounds.deathPowered.volume = 0.7;
sounds.win.volume = 0.4;
sounds.pause.volume = 0.5;
sounds.pause.loop = true;

function playSound(sound) {
  if (!sfxEnabled) return;
  sound.currentTime = 0;
  sound.play().catch(() => {});
}

function stopSound(sound) {
  sound.pause();
  sound.currentTime = 0;
}

function playStartScreenSound() {
  if (gameRunning || gameWon || gamePaused || !musicEnabled) {
    return;
  }

  sounds.startScreen.currentTime = 0;
  sounds.startScreen.play().catch(() => {});
}

function stopStartScreenSound() {
  stopSound(sounds.startScreen);
}

// ANIMATION
const animation = {
  player: 0,
  enemy: 0,
  coin: 0,
};

// PHYSICS
const gravity = 0.7;
const friction = 0.82;
const maxSpeed = 6;
const jumpPower = -14;

// INPUT
const keys = {
  left: false,
  right: false,
  jump: false,
  jumpPressed: false,
};

window.addEventListener("keydown", (e) => {
  if (
    e.code === "ArrowLeft" ||
    e.code === "ArrowRight" ||
    e.code === "ArrowUp" ||
    e.code === "Space"
  ) {
    e.preventDefault();
  }

  if (e.code === "ArrowLeft" || e.code === "KeyA") {
    keys.left = true;
  }

  if (e.code === "ArrowRight" || e.code === "KeyD") {
    keys.right = true;
  }

  if (e.code === "Space" || e.code === "ArrowUp" || e.code === "KeyW") {
    if (!keys.jump) {
      keys.jumpPressed = true;
    }

    keys.jump = true;
  }
});

window.addEventListener("keyup", (e) => {
  if (e.code === "ArrowLeft" || e.code === "KeyA") {
    keys.left = false;
  }

  if (e.code === "ArrowRight" || e.code === "KeyD") {
    keys.right = false;
  }

  if (e.code === "Space" || e.code === "ArrowUp" || e.code === "KeyW") {
    keys.jump = false;
  }
});

// MOBILE CONTROLS
function mobileButton(id, key) {
  const button = document.getElementById(id);

  if (!button) {
    return;
  }

  const start = (e) => {
    e.preventDefault();

    if (key === "jump") {
      if (!keys.jump) {
        keys.jumpPressed = true;
      }

      keys.jump = true;
    } else {
      keys[key] = true;
    }
  };

  const end = (e) => {
    e.preventDefault();

    if (key === "jump") {
      keys.jump = false;
    } else {
      keys[key] = false;
    }
  };

  button.addEventListener("touchstart", start, {
    passive: false,
  });

  button.addEventListener("touchend", end, {
    passive: false,
  });

  button.addEventListener("touchcancel", end, {
    passive: false,
  });

  button.addEventListener("mousedown", start);
  button.addEventListener("mouseup", end);
  button.addEventListener("mouseleave", end);
}

mobileButton("leftBtn", "left");
mobileButton("rightBtn", "right");
mobileButton("jumpBtn", "jump");

/* =========================
   PARTICLES
========================= */

const particles = [];

function createParticle(x, y, options = {}) {
  particles.push({
    x,
    y,
    velocityX: options.velocityX ?? (Math.random() - 0.5) * 3,
    velocityY: options.velocityY ?? (Math.random() - 0.5) * 3,
    size: options.size ?? 4,
    life: options.life ?? 30,
    maxLife: options.life ?? 30,
    gravity: options.gravity ?? 0.08,
    color: options.color ?? "#ffffff",
  });
}

function createCoinParticles(x, y) {
  for (let i = 0; i < 10; i++) {
    createParticle(x, y, {
      velocityX: (Math.random() - 0.5) * 5,
      velocityY: -Math.random() * 4 - 1,
      size: Math.random() * 4 + 2,
      life: 30,
      gravity: 0.12,
      color: Math.random() > 0.5 ? "#facc15" : "#fde68a",
    });
  }
}

function createEnemyParticles(x, y) {
  for (let i = 0; i < 12; i++) {
    createParticle(x, y, {
      velocityX: (Math.random() - 0.5) * 6,
      velocityY: -Math.random() * 4,
      size: Math.random() * 5 + 2,
      life: 35,
      gravity: 0.15,
      color: Math.random() > 0.5 ? "#f87171" : "#b91c1c",
    });
  }
}

function createDustParticles(x, y) {
  for (let i = 0; i < 6; i++) {
    createParticle(x, y, {
      velocityX: (Math.random() - 0.5) * 3,
      velocityY: -Math.random() * 1.5,
      size: Math.random() * 4 + 2,
      life: 20,
      gravity: 0.03,
      color: "#9ca3af",
    });
  }
}

function createBlockParticles(x, y) {
  for (let i = 0; i < 8; i++) {
    createParticle(x, y, {
      velocityX: (Math.random() - 0.5) * 4,
      velocityY: -Math.random() * 3,
      size: Math.random() * 3 + 2,
      life: 25,
      gravity: 0.12,
      color: Math.random() > 0.5 ? "#a78bfa" : "#ddd6fe",
    });
  }
}

function createMushroomParticles(x, y) {
  for (let i = 0; i < 12; i++) {
    createParticle(x, y, {
      velocityX: (Math.random() - 0.5) * 4,
      velocityY: -Math.random() * 3,
      size: Math.random() * 4 + 2,
      life: 35,
      gravity: 0.08,
      color: Math.random() > 0.5 ? "#ef4444" : "#fef2f2",
    });
  }
}

function updateParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    const particle = particles[i];

    particle.x += particle.velocityX;
    particle.y += particle.velocityY;

    particle.velocityY += particle.gravity;

    particle.life--;

    if (particle.life <= 0) {
      particles.splice(i, 1);
    }
  }
}

function drawParticles() {
  particles.forEach((particle) => {
    const alpha = particle.life / particle.maxLife;

    ctx.globalAlpha = alpha;
    ctx.fillStyle = particle.color;

    ctx.fillRect(
      Math.floor(particle.x - cameraX),
      Math.floor(particle.y),
      particle.size,
      particle.size,
    );
  });

  ctx.globalAlpha = 1;
}

//  LEVEL
const LEVEL_WIDTH = 6800;

const platforms = [
  /* START - RAINY CLIFF */
  { x: 0, y: 530, width: 620, height: 70 },
  { x: 170, y: 410, width: 100, height: 30 },
  { x: 380, y: 335, width: 150, height: 30 },

  /* TORNADO GAP */
  { x: 820, y: 530, width: 430, height: 70 },
  { x: 900, y: 400, width: 130, height: 30 },
  { x: 1100, y: 315, width: 120, height: 30 },

  /* LIGHTNING FIELD */
  { x: 1400, y: 530, width: 620, height: 70 },
  { x: 1510, y: 400, width: 130, height: 30 },
  { x: 1750, y: 310, width: 120, height: 30 },
  { x: 1910, y: 420, width: 80, height: 30 },

  /* CHECKPOINT ISLAND */
  { x: 2160, y: 530, width: 430, height: 70 },
  { x: 2240, y: 405, width: 120, height: 30 },
  { x: 2440, y: 330, width: 100, height: 30 },

  /* WIND CANYON */
  { x: 2730, y: 530, width: 520, height: 70 },
  { x: 2800, y: 400, width: 110, height: 30 },
  { x: 2990, y: 285, width: 120, height: 30 },
  { x: 3170, y: 395, width: 90, height: 30 },

  /* STORM BRIDGE */
  { x: 3380, y: 530, width: 760, height: 70 },
  { x: 3470, y: 400, width: 100, height: 30 },
  { x: 3650, y: 330, width: 120, height: 30 },
  { x: 3890, y: 400, width: 90, height: 30 },

  /* FINAL STORM */
  { x: 4240, y: 530, width: 600, height: 70 },
  { x: 4330, y: 400, width: 110, height: 30 },
  { x: 4520, y: 290, width: 110, height: 30 },
  { x: 4700, y: 400, width: 100, height: 30 },

  /* LAST GAUNTLET */
  { x: 4950, y: 530, width: 350, height: 70 },
  { x: 5100, y: 420, width: 100, height: 30 },
  { x: 5290, y: 300, width: 100, height: 30 },
  { x: 5480, y: 400, width: 100, height: 30 },
  { x: 5680, y: 530, width: 1120, height: 70 },
  { x: 5900, y: 390, width: 110, height: 30 },
  { x: 6130, y: 300, width: 110, height: 30 },
];

// QUESTION BLOCKS
const questionBlocks = [
  {
    x: 300,
    y: 355,
    width: 44,
    height: 44,
    hit: false,
    offsetY: 0,
    velocityY: 0,
    coin: false,
    coinY: 0,
    coinVelocityY: 0,
    coinLife: 0,
  },
  {
    x: 1160,
    y: 150,
    width: 44,
    height: 44,
    hit: false,
    offsetY: 0,
    velocityY: 0,
    coin: false,
    coinY: 0,
    coinVelocityY: 0,
    coinLife: 0,
  },
  {
    x: 2360,
    y: 140,
    width: 44,
    height: 44,
    hit: false,
    offsetY: 0,
    velocityY: 0,
    coin: false,
    coinY: 0,
    coinVelocityY: 0,
    coinLife: 0,
  },
  {
    x: 5360,
    y: 100,
    width: 44,
    height: 44,
    hit: false,
    offsetY: 0,
    velocityY: 0,
    coin: false,
    coinY: 0,
    coinVelocityY: 0,
    coinLife: 0,
  },
];

//  PLAYER SPRITES
function loadSprite(path) {
  const image = new Image();

  image.src = path;

  return image;
}

const playerSprites = {
  idle: [
    loadSprite("assets/player/idle_1.png"),
    loadSprite("assets/player/idle_2.png"),
    loadSprite("assets/player/idle_3.png"),
    loadSprite("assets/player/idle_4.png"),
  ],

  walkRight: [
    loadSprite("assets/player/walk_right_1.png"),
    loadSprite("assets/player/walk_right_2.png"),
    loadSprite("assets/player/walk_right_3.png"),
    loadSprite("assets/player/walk_right_4.png"),
    loadSprite("assets/player/walk_right_5.png"),
  ],

  walkLeft: [
    loadSprite("assets/player/walk_left_1.png"),
    loadSprite("assets/player/walk_left_2.png"),
    loadSprite("assets/player/walk_left_3.png"),
    loadSprite("assets/player/walk_left_4.png"),
  ],

  jump: [
    loadSprite("assets/player/jump_1.png"),
    loadSprite("assets/player/jump_2.png"),
    loadSprite("assets/player/jump_3.png"),
    loadSprite("assets/player/jump_4.png"),
  ],

  fall: [
    loadSprite("assets/player/fall_1.png"),
    loadSprite("assets/player/fall_2.png"),
    loadSprite("assets/player/fall_3.png"),
    loadSprite("assets/player/fall_4.png"),
  ],

  powered: [
    loadSprite("assets/player/powered_1.png"),
    loadSprite("assets/player/powered_2.png"),
    loadSprite("assets/player/powered_3.png"),
    loadSprite("assets/player/powered_4.png"),
  ],

  hurt: [
    loadSprite("assets/player/hurt_1.png"),
    loadSprite("assets/player/hurt_2.png"),
    loadSprite("assets/player/hurt_3.png"),
    loadSprite("assets/player/hurt_4.png"),
  ],
};

//  ENEMY SPRITES
const enemySprites = {
  idle: [loadSprite("assets/enemy/Idle.png")],

  walkRight: [
    loadSprite("assets/enemy/walk_right_1.png"),
    loadSprite("assets/enemy/walk_right_2.png"),
    loadSprite("assets/enemy/walk_right_3.png"),
    loadSprite("assets/enemy/walk_right_4.png"),
    loadSprite("assets/enemy/walk_right_5.png"),
  ],

  walkLeft: [
    loadSprite("assets/enemy/walk_left_1.png"),
    loadSprite("assets/enemy/walk_left_2.png"),
    loadSprite("assets/enemy/walk_left_3.png"),
    loadSprite("assets/enemy/walk_left_4.png"),
    loadSprite("assets/enemy/walk_left_5.png"),
  ],
};

//  PLAYER
const player = {
  x: 120,
  y: 400,

  width: 38,
  height: 48,

  normalWidth: 38,
  normalHeight: 48,

  poweredWidth: 42,
  poweredHeight: 60,

  velocityX: 0,
  velocityY: 0,

  speed: 0.8,

  grounded: false,
  previousGrounded: false,

  facing: 1,

  animationTimer: 0,
  animationFrame: 0,

  poweredUp: false,

  invincible: false,
  invincibleTimer: 0,

  /* HURT / DEATH ANIMATION */
  hurt: false,
  hurtTimer: 0,
  hurtFrame: 0,
  hurtFrameTimer: 0,

  reset() {
    this.x = 120;
    this.y = 400;

    this.width = this.normalWidth;
    this.height = this.normalHeight;

    this.velocityX = 0;
    this.velocityY = 0;

    this.grounded = false;
    this.previousGrounded = false;

    this.facing = 1;

    this.animationTimer = 0;
    this.animationFrame = 0;

    this.poweredUp = false;

    this.invincible = false;
    this.invincibleTimer = 0;

    this.hurt = false;
    this.hurtTimer = 0;
    this.hurtFrame = 0;
    this.hurtFrameTimer = 0;
  },

  startHurtAnimation() {
    if (this.hurt) {
      return;
    }

    this.hurt = true;
    this.hurtTimer = 90;
    this.hurtFrame = 0;
    this.hurtFrameTimer = 0;

    this.velocityX = 0;
    this.velocityY = 0;
    this.grounded = false;
  },

  updateHurtAnimation() {
    if (!this.hurt) {
      return;
    }

    this.hurtTimer--;
    this.hurtFrameTimer++;

    if (this.hurtFrameTimer >= 12) {
      this.hurtFrameTimer = 0;

      if (this.hurtFrame < playerSprites.hurt.length - 1) {
        this.hurtFrame++;
      }
    }

    if (this.hurtTimer <= 0) {
      this.hurt = false;
      this.hurtTimer = 0;
      this.hurtFrame = 0;
      this.hurtFrameTimer = 0;

      finishPlayerDeath();
    }
  },

  activatePowerUp() {
    if (this.poweredUp) {
      return;
    }

    const oldHeight = this.height;
    this.poweredUp = true;
    this.width = this.poweredWidth;
    this.height = this.poweredHeight;

    this.y -= this.height - oldHeight;

    createMushroomParticles(this.x + this.width / 2, this.y + this.height / 2);
  },

  update() {
    if (this.hurt) {
      this.updateHurtAnimation();
      return;
    }

    this.previousGrounded = this.grounded;

    if (this.invincible) {
      this.invincibleTimer--;

      if (this.invincibleTimer <= 0) {
        this.invincible = false;
        this.invincibleTimer = 0;
      }
    }

    /* HORIZONTAL */
    if (keys.left) {
      this.velocityX -= this.speed;
      this.facing = -1;
    } else if (keys.right) {
      this.velocityX += this.speed;
      this.facing = 1;
    } else {
      this.velocityX *= friction;
    }

    this.velocityX = Math.max(-maxSpeed, Math.min(maxSpeed, this.velocityX));

    /* JUMP */
    if (keys.jumpPressed && this.grounded) {
      this.velocityY = jumpPower;
      this.grounded = false;
      playSound(sounds.jump);
      createDustParticles(this.x + this.width / 2, this.y + this.height);
    }

    keys.jumpPressed = false;

    /* GRAVITY */
    this.velocityY += gravity;

    if (this.velocityY > 15) {
      this.velocityY = 15;
    }

    /* MOVE X */
    this.x += this.velocityX;
    this.horizontalCollision();

    /* MOVE Y */
    this.y += this.velocityY;
    this.grounded = false;
    this.verticalCollision();

    /* WORLD BOUNDARY */
    if (this.x < 0) {
      this.x = 0;
      this.velocityX = 0;
    }

    if (this.x + this.width > LEVEL_WIDTH) {
      this.x = LEVEL_WIDTH - this.width;
      this.velocityX = 0;
    }

    /* FALL */
    if (this.y > GAME_HEIGHT + 150) {
      loseLife();
    }

    /* LANDING */
    if (this.grounded && !this.previousGrounded && this.velocityY >= 0) {
      createDustParticles(this.x + this.width / 2, this.y + this.height);
    }

    this.updateAnimation();

    /* CAMERA */
    const targetCamera = this.x - GAME_WIDTH * 0.35;

    cameraX += (targetCamera - cameraX) * 0.08;

    cameraX = Math.max(0, Math.min(LEVEL_WIDTH - GAME_WIDTH, cameraX));
  },

  updateAnimation() {
    if (this.grounded && Math.abs(this.velocityX) > 0.3) {
      this.animationTimer += Math.abs(this.velocityX);

      if (this.animationTimer > 6) {
        this.animationFrame++;

        this.animationTimer = 0;
      }
    } else if (!this.grounded) {
      this.animationTimer += 1;

      if (this.animationTimer > 6) {
        this.animationFrame++;

        this.animationTimer = 0;
      }
    } else {
      this.animationTimer = 0;
      this.animationFrame = 0;
    }
  },

  horizontalCollision() {
    platforms.forEach((platform) => {
      if (checkCollision(this, platform)) {
        if (this.velocityX > 0) {
          this.x = platform.x - this.width;
        } else if (this.velocityX < 0) {
          this.x = platform.x + platform.width;
        }

        this.velocityX = 0;
      }
    });

    questionBlocks.forEach((block) => {
      if (checkCollision(this, block)) {
        if (this.velocityX > 0) {
          this.x = block.x - this.width;
        } else if (this.velocityX < 0) {
          this.x = block.x + block.width;
        }

        this.velocityX = 0;
      }
    });
  },

  verticalCollision() {
    platforms.forEach((platform) => {
      if (checkCollision(this, platform)) {
        if (this.velocityY > 0) {
          this.y = platform.y - this.height;

          this.velocityY = 0;

          this.grounded = true;
        } else if (this.velocityY < 0) {
          this.y = platform.y + platform.height;

          this.velocityY = 0;
        }
      }
    });

    questionBlocks.forEach((block) => {
      if (checkCollision(this, block)) {
        if (this.velocityY > 0) {
          this.y = block.y - this.height;

          this.velocityY = 0;

          this.grounded = true;
        } else if (this.velocityY < 0) {
          this.y = block.y + block.height;

          this.velocityY = 0;

          hitQuestionBlock(block);
        }
      }
    });
  },

  draw() {
    const screenX = Math.floor(this.x - cameraX);
    const screenY = Math.floor(this.y);

    if (
      !this.hurt &&
      this.invincible &&
      Math.floor(this.invincibleTimer / 6) % 2 === 0
    ) {
      return;
    }

    if (this.grounded) {
      ctx.fillStyle = "rgba(0,0,0,0.35)";

      ctx.fillRect(screenX + 4, screenY + this.height + 2, this.width - 8, 4);
    }

    let frames;

    if (this.hurt) {
      frames = playerSprites.hurt;
    } else if (this.poweredUp) {
      frames = playerSprites.powered;
    } else if (this.velocityY < -1) {
      frames = playerSprites.jump;
    } else if (this.velocityY > 1 && !this.grounded) {
      frames = playerSprites.fall;
    } else if (Math.abs(this.velocityX) > 0.3 && this.facing === 1) {
      frames = playerSprites.walkRight;
    } else if (Math.abs(this.velocityX) > 0.3 && this.facing === -1) {
      frames = playerSprites.walkLeft;
    } else {
      frames = playerSprites.idle;
    }

    let frameIndex = this.hurt
      ? Math.min(this.hurtFrame, frames.length - 1)
      : this.animationFrame % frames.length;

    const sprite = frames[frameIndex];

    if (!sprite || !sprite.complete || sprite.naturalWidth === 0) {
      return;
    }

    // SPRITE SIZE
    let spriteWidth = 42;
    let spriteHeight = 84;

    if (this.poweredUp) {
      spriteWidth = 48;
      spriteHeight = 96;
    }

    const drawX = screenX + this.width / 2 - spriteWidth / 2;
    const drawY = screenY + this.height - spriteHeight;

    //  DRAW SPRITE
    ctx.imageSmoothingEnabled = false;

    ctx.drawImage(
      sprite,
      Math.floor(drawX),
      Math.floor(drawY),
      spriteWidth,
      spriteHeight,
    );
  },
};

// COINS
const coins = [
  { x: 200, y: 360, collected: false },
  { x: 250, y: 360, collected: false },
  { x: 420, y: 290, collected: false },
  { x: 500, y: 290, collected: false },
  { x: 740, y: 280, collected: false },
  { x: 1130, y: 270, collected: false },
  { x: 1190, y: 270, collected: false },
  { x: 1420, y: 270, collected: false },
  { x: 1810, y: 470, collected: false },
  { x: 1870, y: 470, collected: false },
  { x: 1920, y: 340, collected: false },
  { x: 2180, y: 250, collected: false },
  { x: 2480, y: 470, collected: false },
  { x: 2540, y: 470, collected: false },
  { x: 2950, y: 270, collected: false },
  { x: 3150, y: 370, collected: false },
  { x: 3500, y: 470, collected: false },
  { x: 3570, y: 470, collected: false },
  { x: 3850, y: 270, collected: false },
  { x: 4130, y: 370, collected: false },
  { x: 4500, y: 470, collected: false },
  { x: 4600, y: 470, collected: false },
  { x: 4720, y: 270, collected: false },
  { x: 5000, y: 270, collected: false },
  { x: 5300, y: 470, collected: false },
];

//  ENEMIES
const enemies = [
  {
    x: 430,
    y: 480,
    width: 40,
    height: 50,
    velocityX: 1.8,
    minX: 300,
    maxX: 590,
    alive: true,
    animationTimer: 0,
  },
  {
    x: 900,
    y: 480,
    width: 40,
    height: 50,
    velocityX: 2.1,
    minX: 830,
    maxX: 1220,
    alive: true,
    animationTimer: 0,
  },
  {
    x: 1490,
    y: 480,
    width: 40,
    height: 50,
    velocityX: 2.0,
    minX: 1430,
    maxX: 1980,
    alive: true,
    animationTimer: 0,
  },
  {
    x: 2250,
    y: 480,
    width: 40,
    height: 50,
    velocityX: 2.2,
    minX: 2190,
    maxX: 2530,
    alive: true,
    animationTimer: 0,
  },
  {
    x: 2780,
    y: 480,
    width: 40,
    height: 50,
    velocityX: 2.4,
    minX: 2740,
    maxX: 3210,
    alive: true,
    animationTimer: 0,
  },
  {
    x: 3440,
    y: 480,
    width: 40,
    height: 50,
    velocityX: 2.3,
    minX: 3400,
    maxX: 4100,
    alive: true,
    animationTimer: 0,
  },
  {
    x: 4320,
    y: 480,
    width: 40,
    height: 50,
    velocityX: 2.5,
    minX: 4260,
    maxX: 4800,
    alive: true,
    animationTimer: 0,
  },
  {
    x: 5010,
    y: 480,
    width: 40,
    height: 50,
    velocityX: 2.6,
    minX: 4980,
    maxX: 5290,
    alive: true,
    animationTimer: 0,
  },
  {
    x: 5750,
    y: 480,
    width: 40,
    height: 50,
    velocityX: 2.7,
    minX: 5700,
    maxX: 6750,
    alive: true,
    animationTimer: 0,
  },
];

// MUSHROOM
const mushrooms = [
  {
    x: 0,
    y: 0,
    width: 38,
    height: 38,
    velocityX: 2.2,
    velocityY: 0,
    active: false,
    collected: false,
    grounded: false,
    spawnY: 0,
  },
];

//  CHECKPOINT
const checkpoint = { x: 2520, y: 430, width: 30, height: 100, active: false };

// FINISH
const finish = { x: 6540, y: 330, width: 60, height: 200 };

// STORM HAZARDS
const windZones = [
  { x: 650, y: 0, width: 170, height: 530, force: 0.18, direction: 1 },
  { x: 2570, y: 0, width: 160, height: 530, force: -0.2, direction: -1 },
  { x: 4140, y: 0, width: 100, height: 530, force: 0.22, direction: 1 },
  { x: 4840, y: 0, width: 110, height: 530, force: -0.24, direction: -1 },
];

const tornadoes = [
  {
    x: 710,
    y: 360,
    width: 70,
    height: 170,
    velocityX: 1.6,
    minX: 650,
    maxX: 800,
    phase: 0,
    hitCooldown: 0,
  },
  {
    x: 2010,
    y: 350,
    width: 75,
    height: 180,
    velocityX: -1.9,
    minX: 1900,
    maxX: 2140,
    phase: 1.8,
    hitCooldown: 0,
  },
  {
    x: 3250,
    y: 350,
    width: 75,
    height: 180,
    velocityX: 2.0,
    minX: 3180,
    maxX: 3370,
    phase: 3.1,
    hitCooldown: 0,
  },
  {
    x: 4750,
    y: 350,
    width: 80,
    height: 180,
    velocityX: -2.2,
    minX: 4680,
    maxX: 4920,
    phase: 4.2,
    hitCooldown: 0,
  },
  {
    x: 5550,
    y: 350,
    width: 80,
    height: 180,
    velocityX: 2.4,
    minX: 5480,
    maxX: 5680,
    phase: 0.7,
    hitCooldown: 0,
  },
];

const lightningStrikes = [
  { x: 1180, timer: 20, cycle: 210, warning: 0, active: 0, hitCooldown: 0 },
  { x: 1670, timer: 100, cycle: 230, warning: 0, active: 0, hitCooldown: 0 },
  { x: 2550, timer: 50, cycle: 190, warning: 0, active: 0, hitCooldown: 0 },
  { x: 3690, timer: 140, cycle: 220, warning: 0, active: 0, hitCooldown: 0 },
  { x: 4480, timer: 70, cycle: 200, warning: 0, active: 0, hitCooldown: 0 },
  { x: 5200, timer: 10, cycle: 180, warning: 0, active: 0, hitCooldown: 0 },
  { x: 6060, timer: 90, cycle: 200, warning: 0, active: 0, hitCooldown: 0 },
];

// COLLISION
function checkCollision(a, b) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

// QUESTION BLOCK
function hitQuestionBlock(block) {
  if (block.hit) {
    return;
  }

  block.hit = true;

  block.offsetY = -8;
  block.velocityY = -5;

  /* SECOND BLOCK = MUSHROOM */
  if (block === questionBlocks[1]) {
    spawnMushroom(block);

    score += 1000;

    createBlockParticles(block.x + block.width / 2, block.y + block.height / 2);

    updateUI();

    return;
  }

  /* OTHER BLOCKS = COIN */
  block.coin = true;

  block.coinY = block.y - 10;
  block.coinVelocityY = -9;
  block.coinLife = 55;

  score += 100;
  coinsCollected++;

  playSound(sounds.coin);

  createCoinParticles(block.x + block.width / 2, block.y);

  createBlockParticles(block.x + block.width / 2, block.y + block.height / 2);

  updateUI();
}

function updateQuestionBlocks() {
  questionBlocks.forEach((block) => {
    if (block.offsetY < 0) {
      block.offsetY += 1;

      if (block.offsetY >= 0) {
        block.offsetY = 0;
      }
    }

    if (block.velocityY !== 0) {
      block.velocityY += gravity;

      block.coinY += block.velocityY;

      if (block.coinLife > 0) {
        block.coinLife--;
      }

      if (block.coinLife <= 0) {
        block.coin = false;
        block.velocityY = 0;
      }
    }
  });
}

// MUSHROOM
function spawnMushroom(block) {
  if (block !== questionBlocks[1]) {
    return;
  }

  const mushroom = mushrooms[0];

  if (mushroom.active || mushroom.collected) {
    return;
  }

  mushroom.x = block.x + block.width / 2 - mushroom.width / 2;
  mushroom.y = block.y - mushroom.height;
  mushroom.spawnY = mushroom.y;
  mushroom.velocityX = 2.2;
  mushroom.velocityY = -5;
  mushroom.active = true;
  mushroom.collected = false;
  mushroom.grounded = false;
}

function updateMushrooms() {
  mushrooms.forEach((mushroom) => {
    if (!mushroom.active || mushroom.collected) {
      return;
    }

    mushroom.x += mushroom.velocityX;

    platforms.forEach((platform) => {
      if (checkCollision(mushroom, platform)) {
        if (mushroom.velocityX > 0) {
          mushroom.x = platform.x - mushroom.width;
        } else {
          mushroom.x = platform.x + platform.width;
        }

        mushroom.velocityX *= -1;
      }
    });

    questionBlocks.forEach((block) => {
      if (block === questionBlocks[1]) {
        return;
      }

      if (checkCollision(mushroom, block)) {
        if (mushroom.velocityX > 0) {
          mushroom.x = block.x - mushroom.width;
        } else {
          mushroom.x = block.x + block.width;
        }

        mushroom.velocityX *= -1;
      }
    });

    mushroom.velocityY += gravity;

    if (mushroom.velocityY > 10) {
      mushroom.velocityY = 10;
    }

    mushroom.y += mushroom.velocityY;

    mushroom.grounded = false;

    platforms.forEach((platform) => {
      if (checkCollision(mushroom, platform)) {
        if (mushroom.velocityY > 0) {
          mushroom.y = platform.y - mushroom.height;

          mushroom.velocityY = 0;

          mushroom.grounded = true;
        } else if (mushroom.velocityY < 0) {
          mushroom.y = platform.y + platform.height;

          mushroom.velocityY = 0;
        }
      }
    });

    questionBlocks.forEach((block) => {
      if (checkCollision(mushroom, block)) {
        if (mushroom.velocityY > 0) {
          mushroom.y = block.y - mushroom.height;

          mushroom.velocityY = 0;

          mushroom.grounded = true;
        } else if (mushroom.velocityY < 0) {
          mushroom.y = block.y + block.height;

          mushroom.velocityY = 0;
        }
      }
    });

    if (mushroom.x < 0) {
      mushroom.x = 0;
      mushroom.velocityX *= -1;
    }

    if (mushroom.x + mushroom.width > LEVEL_WIDTH) {
      mushroom.x = LEVEL_WIDTH - mushroom.width;

      mushroom.velocityX *= -1;
    }

    if (checkCollision(player, mushroom)) {
      collectMushroom(mushroom);
    }

    if (mushroom.y > GAME_HEIGHT + 150) {
      mushroom.active = false;
    }
  });
}

function collectMushroom(mushroom) {
  if (mushroom.collected) {
    return;
  }

  mushroom.collected = true;
  mushroom.active = false;

  score += 1000;

  playSound(sounds.mushroom);

  player.activatePowerUp();

  createMushroomParticles(
    mushroom.x + mushroom.width / 2,
    mushroom.y + mushroom.height / 2,
  );

  updateUI();
}

function drawMushrooms() {
  mushrooms.forEach((mushroom) => {
    if (!mushroom.active || mushroom.collected) {
      return;
    }

    const x = Math.floor(mushroom.x - cameraX);
    const y = Math.floor(mushroom.y);

    /* SHADOW */
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.fillRect(x + 4, y + mushroom.height + 2, mushroom.width - 8, 4);

    /* STEM */
    ctx.fillStyle = "#bae6fd";
    ctx.fillRect(x + 10, y + 18, 18, 17);
    ctx.fillRect(x + 13, y + 15, 12, 5);

    /* CAP */
    ctx.fillStyle = "#dc2626";
    ctx.fillRect(x + 5, y + 7, 28, 15);
    ctx.fillRect(x + 9, y + 3, 20, 5);
    ctx.fillRect(x + 13, y, 12, 4);

    /* DARK RED */
    ctx.fillStyle = "#991b1b";
    ctx.fillRect(x + 7, y + 18, 24, 5);

    /* WHITE SPOTS */
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(x + 10, y + 7, 6, 6);
    ctx.fillRect(x + 22, y + 5, 6, 6);

    /* OUTLINE */
    ctx.fillStyle = "#450a0a";
    ctx.fillRect(x + 5, y + 21, 5, 3);
    ctx.fillRect(x + 28, y + 21, 5, 3);
  });
}

//  COINS
function updateCoins() {
  coins.forEach((coin) => {
    if (coin.collected) {
      return;
    }

    const coinBox = {
      x: coin.x - 10,
      y: coin.y - 14,
      width: 20,
      height: 28,
    };

    if (checkCollision(player, coinBox)) {
      coin.collected = true;

      score += 100;
      coinsCollected++;

      playSound(sounds.coinsCollected);

      createCoinParticles(coin.x, coin.y);

      updateUI();
    }
  });
}

function drawCoins() {
  coins.forEach((coin) => {
    if (coin.collected) {
      return;
    }

    const x = Math.floor(coin.x - cameraX);
    const bob = Math.sin(gameTime * 0.12 + coin.x) * 3;
    const scale = 0.85 + Math.sin(gameTime * 0.15 + coin.x) * 0.15;
    ctx.save();
    ctx.translate(x, coin.y + bob);
    ctx.scale(scale, 1);

    /* OUTER */
    ctx.fillStyle = "#ca8a04";
    ctx.fillRect(-9, -14, 18, 28);

    /* MAIN */
    ctx.fillStyle = "#facc15";
    ctx.fillRect(-7, -12, 14, 24);

    /* HIGHLIGHT */
    ctx.fillStyle = "#7dd3fc";
    ctx.fillRect(-4, -9, 4, 18);

    /* CENTER */
    ctx.fillStyle = "#eab308";
    ctx.fillRect(1, -6, 3, 12);
    ctx.restore();
  });
}

// STORM HAZARDS
function hazardDamage() {
  if (!gameRunning || gamePaused || player.hurt || player.invincible) return;
  loseLife(true);
}

function updateStormHazards() {
  // Wind zones push the player while crossing exposed gaps.
  for (const zone of windZones) {
    if (
      player.x + player.width > zone.x &&
      player.x < zone.x + zone.width &&
      player.y < zone.y + zone.height
    ) {
      player.velocityX += zone.force;
      player.velocityX = Math.max(
        -maxSpeed - 1.5,
        Math.min(maxSpeed + 1.5, player.velocityX),
      );
    }
  }

  // Moving tornadoes.
  for (const tornado of tornadoes) {
    tornado.x += tornado.velocityX;
    tornado.phase += 0.08;
    if (
      tornado.x <= tornado.minX ||
      tornado.x + tornado.width >= tornado.maxX
    ) {
      tornado.velocityX *= -1;
    }
    if (tornado.hitCooldown > 0) tornado.hitCooldown--;

    const box = {
      x: tornado.x + 15,
      y: tornado.y,
      width: tornado.width - 30,
      height: tornado.height,
    };
    if (checkCollision(player, box) && tornado.hitCooldown <= 0) {
      tornado.hitCooldown = 75;
      player.velocityX += tornado.velocityX > 0 ? -5 : 5;
      player.velocityY = -8;
      hazardDamage();
    }
  }

  // Lightning: warning -> strike -> cooldown.
  for (const strike of lightningStrikes) {
    if (strike.hitCooldown > 0) strike.hitCooldown--;
    strike.timer++;
    const cyclePos = strike.timer % strike.cycle;
    strike.warning = cyclePos >= strike.cycle - 65 ? 1 : 0;
    strike.active = cyclePos >= strike.cycle - 14 ? 1 : 0;

    if (strike.active && strike.hitCooldown <= 0) {
      const box = { x: strike.x - 22, y: 0, width: 44, height: 530 };
      if (checkCollision(player, box)) {
        strike.hitCooldown = 80;
        player.velocityY = -10;
        hazardDamage();
      }
    }
  }
}

function drawStormHazards() {
  /* =====================================================
     WIND ZONES - thin streaks, not solid rectangles
  ===================================================== */
  windZones.forEach((zone) => {
    const sx = Math.floor(zone.x - cameraX);
    const travel = (gameTime * 3.2) % 110;

    ctx.save();
    ctx.globalAlpha = 0.22;

    for (let row = 0; row < 6; row++) {
      const y = 105 + row * 65;
      const raw = (travel + row * 27) % 110;
      const x = zone.direction > 0 ? sx + raw : sx + zone.width - raw;

      ctx.fillStyle = "#dbeafe";
      ctx.fillRect(Math.floor(x), y, 34, 3);
      ctx.fillRect(Math.floor(x + (zone.direction > 0 ? 27 : -3)), y - 4, 7, 3);
      ctx.fillRect(Math.floor(x + (zone.direction > 0 ? 27 : -3)), y + 4, 7, 3);
    }

    ctx.restore();
  });

  /* =====================================================
     TORNADO - inverted realistic pixel-art funnel
     Wide cloud/base at the TOP -> narrow tip at the GROUND.
  ===================================================== */
  tornadoes.forEach((tornado) => {
    const sx = Math.floor(tornado.x - cameraX);
    const sy = Math.floor(tornado.y);
    const cx = sx + tornado.width / 2;
    const h = tornado.height;
    const pulse = Math.sin(tornado.phase * 1.7) * 2;

    ctx.save();
    ctx.imageSmoothingEnabled = false;

    /* ---------------------------------------------
       STORM CLOUD / WIDE TOP
    --------------------------------------------- */
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = "#cbd5e1";
    ctx.fillRect(
      Math.floor(cx - tornado.width * 0.48),
      sy - 8,
      Math.floor(tornado.width * 0.96),
      16,
    );

    ctx.globalAlpha = 0.42;
    ctx.fillStyle = "#94a3b8";
    ctx.fillRect(
      Math.floor(cx - tornado.width * 0.34),
      sy - 14,
      Math.floor(tornado.width * 0.68),
      12,
    );
    ctx.fillRect(
      Math.floor(cx - tornado.width * 0.42),
      sy - 4,
      Math.floor(tornado.width * 0.84),
      9,
    );

    /* ---------------------------------------------
       OUTER FUNNEL
       WIDE AT TOP, NARROW AT BOTTOM.
    --------------------------------------------- */
    ctx.globalAlpha = 0.48;
    ctx.fillStyle = "#64748b";
    ctx.beginPath();
    ctx.moveTo(cx - tornado.width * 0.43 + pulse, sy + 2);
    ctx.bezierCurveTo(
      cx - tornado.width * 0.4,
      sy + 38,
      cx - tornado.width * 0.3,
      sy + 76,
      cx - tornado.width * 0.22,
      sy + 108,
    );
    ctx.bezierCurveTo(
      cx - tornado.width * 0.15,
      sy + 138,
      cx - 10,
      sy + h - 28,
      cx - 7,
      sy + h - 3,
    );
    ctx.lineTo(cx + 7, sy + h - 3);
    ctx.bezierCurveTo(
      cx + 10,
      sy + h - 28,
      cx + tornado.width * 0.15,
      sy + 138,
      cx + tornado.width * 0.22,
      sy + 108,
    );
    ctx.bezierCurveTo(
      cx + tornado.width * 0.3,
      sy + 76,
      cx + tornado.width * 0.4,
      sy + 38,
      cx + tornado.width * 0.43 - pulse,
      sy + 2,
    );
    ctx.closePath();
    ctx.fill();

    /* ---------------------------------------------
       DARK INNER FUNNEL
    --------------------------------------------- */
    ctx.globalAlpha = 0.52;
    ctx.fillStyle = "#334155";
    ctx.beginPath();
    ctx.moveTo(cx - tornado.width * 0.27, sy + 8);
    ctx.bezierCurveTo(
      cx - tornado.width * 0.25,
      sy + 52,
      cx - tornado.width * 0.17,
      sy + 88,
      cx - tornado.width * 0.11,
      sy + 116,
    );
    ctx.bezierCurveTo(
      cx - 7,
      sy + 142,
      cx - 4,
      sy + h - 19,
      cx - 3,
      sy + h - 3,
    );
    ctx.lineTo(cx + 3, sy + h - 3);
    ctx.bezierCurveTo(
      cx + 4,
      sy + h - 19,
      cx + 7,
      sy + 142,
      cx + tornado.width * 0.11,
      sy + 116,
    );
    ctx.bezierCurveTo(
      cx + tornado.width * 0.17,
      sy + 88,
      cx + tornado.width * 0.25,
      sy + 52,
      cx + tornado.width * 0.27,
      sy + 8,
    );
    ctx.closePath();
    ctx.fill();

    /* ---------------------------------------------
       ROTATING WIND BANDS
    --------------------------------------------- */
    const bands = [
      { y: 14, width: 50 },
      { y: 42, width: 44 },
      { y: 72, width: 36 },
      { y: 102, width: 27 },
      { y: 132, width: 18 },
      { y: 158, width: 10 },
    ];

    bands.forEach((band, i) => {
      const progress = band.y / h;
      const funnelWidth = tornado.width * (0.78 - progress * 0.7);
      const width = Math.max(7, Math.min(band.width, funnelWidth));
      const drift = Math.sin(tornado.phase * 2.1 + i * 1.15) * (4 + i);

      ctx.globalAlpha = 0.42 + (i % 2) * 0.1;
      ctx.fillStyle = i % 2 === 0 ? "#e2e8f0" : "#94a3b8";
      ctx.fillRect(
        Math.floor(cx - width / 2 + drift),
        sy + band.y,
        Math.floor(width),
        5,
      );
    });

    /* ---------------------------------------------
       SPIRAL WIND STREAKS
    --------------------------------------------- */
    ctx.globalAlpha = 0.52;
    ctx.strokeStyle = "#e2e8f0";
    ctx.lineWidth = 4;

    ctx.beginPath();
    ctx.moveTo(cx - tornado.width * 0.3, sy + 20);
    ctx.quadraticCurveTo(
      cx + tornado.width * 0.34,
      sy + 58,
      cx - tornado.width * 0.14,
      sy + 96,
    );
    ctx.quadraticCurveTo(cx - 4, sy + 126, cx - 5, sy + h - 12);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(cx + tornado.width * 0.3, sy + 28);
    ctx.quadraticCurveTo(
      cx - tornado.width * 0.3,
      sy + 68,
      cx + tornado.width * 0.12,
      sy + 106,
    );
    ctx.quadraticCurveTo(cx + 6, sy + 132, cx + 4, sy + h - 10);
    ctx.stroke();

    /* ---------------------------------------------
       FLYING DEBRIS - WIDER ORBIT AT TOP,
       TIGHTER ORBIT TOWARD THE TIP.
    --------------------------------------------- */
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = "#78716c";

    for (let i = 0; i < 10; i++) {
      const t = i / 10;
      const y = sy + 18 + t * (h - 34);
      const orbit = tornado.width * (0.43 - t * 0.35);
      const angle = tornado.phase * (1.7 + t) + i * 0.9;
      const x = cx + Math.cos(angle) * Math.max(4, orbit);
      const size = i % 3 === 0 ? 7 : 4;

      ctx.fillRect(
        Math.floor(x),
        Math.floor(y + Math.sin(angle * 1.4) * 5),
        size,
        size,
      );
    }

    /* ---------------------------------------------
       NARROW DUST / DEBRIS AT THE GROUND TIP
    --------------------------------------------- */
    ctx.globalAlpha = 0.62;
    ctx.fillStyle = "#a8a29e";

    for (let i = 0; i < 10; i++) {
      const angle = tornado.phase * 2.4 + i * 0.65;
      const radius = 5 + (i % 4) * 5;

      ctx.fillRect(
        Math.floor(cx + Math.cos(angle) * radius),
        Math.floor(sy + h - 7 + Math.sin(angle) * 4),
        i % 2 ? 4 : 6,
        i % 2 ? 4 : 5,
      );
    }

    /* Small contact shadow under the tornado tip */
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = "#475569";
    ctx.fillRect(Math.floor(cx - 12), sy + h - 1, 24, 4);

    ctx.restore();
  });

  /* =====================================================
     LIGHTNING - warning glow + branched bolt
  ===================================================== */
  lightningStrikes.forEach((strike) => {
    const sx = Math.floor(strike.x - cameraX);
    const pulse = Math.sin(gameTime * 0.35 + strike.x) * 0.5 + 0.5;

    if (strike.warning) {
      ctx.save();
      ctx.globalAlpha = 0.16 + pulse * 0.12;
      ctx.fillStyle = "#7dd3fc";
      ctx.fillRect(sx - 24, 0, 48, 530);

      ctx.globalAlpha = 0.8;
      ctx.fillStyle = "#38bdf8";
      ctx.fillRect(sx - 12, 510, 24, 4);
      ctx.fillRect(sx - 20, 516, 40, 3);

      /* warning electric arcs */
      ctx.strokeStyle = "#7dd3fc";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(sx - 5, 0);
      ctx.lineTo(sx - 14, 90);
      ctx.lineTo(sx + 4, 150);
      ctx.lineTo(sx - 10, 225);
      ctx.stroke();
      ctx.restore();
    }

    if (strike.active) {
      ctx.save();

      /* Flash */
      ctx.globalAlpha = 0.22;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(sx - 42, 0, 84, 530);

      /* Glow */
      ctx.globalAlpha = 0.75;
      ctx.fillStyle = "#7dd3fc";
      ctx.shadowColor = "#ffffff";
      ctx.shadowBlur = 18;

      ctx.beginPath();
      ctx.moveTo(sx + 8, 0);
      ctx.lineTo(sx - 10, 78);
      ctx.lineTo(sx + 1, 78);
      ctx.lineTo(sx - 19, 158);
      ctx.lineTo(sx - 2, 158);
      ctx.lineTo(sx - 29, 264);
      ctx.lineTo(sx + 4, 204);
      ctx.lineTo(sx - 3, 204);
      ctx.lineTo(sx + 20, 118);
      ctx.lineTo(sx + 7, 118);
      ctx.closePath();
      ctx.fill();

      /* Main white bolt */
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.moveTo(sx + 7, 0);
      ctx.lineTo(sx - 7, 78);
      ctx.lineTo(sx + 3, 78);
      ctx.lineTo(sx - 14, 151);
      ctx.lineTo(sx + 0, 151);
      ctx.lineTo(sx - 22, 238);
      ctx.lineTo(sx + 7, 185);
      ctx.lineTo(sx + 1, 185);
      ctx.lineTo(sx + 17, 106);
      ctx.lineTo(sx + 6, 106);
      ctx.closePath();
      ctx.fill();

      /* Side branches */
      ctx.fillRect(sx - 8, 78, 24, 3);
      ctx.fillRect(sx - 25, 110, 19, 3);
      ctx.fillRect(sx + 4, 137, 20, 3);
      ctx.fillRect(sx - 30, 172, 29, 3);

      /* Ground flash */
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = "#bae6fd";
      ctx.fillRect(sx - 30, 500, 60, 5);
      ctx.fillRect(sx - 18, 507, 36, 4);

      ctx.restore();
    }
  });
}

// ENEMIES
function updateEnemies() {
  enemies.forEach((enemy) => {
    if (!enemy.alive) {
      return;
    }

    // JEDA SEBENTAR DI UJUNG PATROL
    if (enemy.pauseTimer === undefined) {
      enemy.pauseTimer = 0;
    }

    if (enemy.pauseTimer > 0) {
      enemy.pauseTimer--;
    } else {
      enemy.x += enemy.velocityX;

      enemy.animationTimer += Math.abs(enemy.velocityX);

      if (enemy.x <= enemy.minX || enemy.x + enemy.width >= enemy.maxX) {
        enemy.velocityX *= -1;

        enemy.pauseTimer = 90;
      }
    }

    if (checkCollision(player, enemy)) {
      if (player.invincible) {
        return;
      }

      const playerBottom = player.y + player.height;

      const enemyTop = enemy.y;

      const stomping = player.velocityY > 0 && playerBottom <= enemyTop + 18;

      if (stomping) {
        enemy.alive = false;

        player.velocityY = jumpPower * 0.55;

        score += 200;

        playSound(sounds.enemy);

        createEnemyParticles(
          enemy.x + enemy.width / 2,
          enemy.y + enemy.height / 2,
        );

        updateUI();
      } else {
        if (player.poweredUp) {
          /* BIG PLAYER TERKENA ENEMY */
          playSound(sounds.deathPowered);

          const playerBottom = player.y + player.height;

          player.poweredUp = false;

          player.width = player.normalWidth;

          player.height = player.normalHeight;

          player.y = playerBottom - player.height;

          player.velocityX = 0;

          player.invincible = true;
          player.invincibleTimer = 180;

          createMushroomParticles(
            player.x + player.width / 2,
            player.y + player.height / 2,
          );

          updateUI();
        } else {
          loseLife(true);
        }
      }
    }
  });
}

// ENEMY NEAR SOUND
let enemyNearCooldown = 0;

function updateEnemyNearSound() {
  if (enemyNearCooldown > 0) {
    enemyNearCooldown--;
  }

  if (!gameRunning) {
    return;
  }

  const playerCenter = player.x + player.width / 2;

  for (const enemy of enemies) {
    if (!enemy.alive) {
      continue;
    }

    const enemyCenter = enemy.x + enemy.width / 2;

    const distance = Math.abs(playerCenter - enemyCenter);

    if (distance <= 220 && enemyNearCooldown <= 0) {
      playSound(sounds.enemyNear);

      enemyNearCooldown = 180;

      break;
    }
  }
}

// CHECKPOINT
function checkCheckpoint() {
  if (checkpoint.active) {
    return;
  }

  if (checkCollision(player, checkpoint)) {
    checkpoint.active = true;
  }
}

function drawCheckpoint() {
  const screenX = Math.floor(checkpoint.x - cameraX);

  /* POLE */
  ctx.fillStyle = "#3f2a18";
  ctx.fillRect(screenX + 12, checkpoint.y, 6, checkpoint.height);

  /* FLAG */
  ctx.fillStyle = checkpoint.active ? "#22c55e" : "#ef4444";
  ctx.fillRect(screenX + 18, checkpoint.y + 8, 28, 20);

  /* FLAG HIGHLIGHT */
  ctx.fillStyle = checkpoint.active ? "#86efac" : "#fca5a5";
  ctx.fillRect(screenX + 18, checkpoint.y + 8, 8, 20);

  /* TOP */
  ctx.fillStyle = "#facc15";
  ctx.fillRect(screenX + 10, checkpoint.y - 6, 10, 10);

  /* SHADOW */
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.fillRect(screenX + 4, checkpoint.y + checkpoint.height, 24, 4);
}

//  FINISH
function checkFinish() {
  const finishBox = {
    x: finish.x,
    y: finish.y,
    width: finish.width,
    height: finish.height,
  };

  if (checkCollision(player, finishBox)) {
    winGame();
  }
}

// PAUSE SYSTEM
function showPauseScreen() {
  const pauseScreen = document.getElementById("pauseScreen");

  if (pauseScreen) {
    pauseScreen.classList.remove("hidden");
  }
}

function hidePauseScreen() {
  const pauseScreen = document.getElementById("pauseScreen");

  if (pauseScreen) {
    pauseScreen.classList.add("hidden");
  }
}

function updatePauseButtonVisibility() {
  const pauseButton = document.getElementById("pauseButton");

  if (!pauseButton) {
    return;
  }

  pauseButton.classList.toggle(
    "hidden",
    !(gameRunning && !gamePaused && !gameWon),
  );
}

function clearInputState() {
  keys.left = false;
  keys.right = false;
  keys.jump = false;
  keys.jumpPressed = false;
}

function pauseGame() {
  if (!gameRunning || gameWon || gamePaused) {
    return;
  }

  gamePaused = true;
  gameRunning = false;

  updatePauseButtonVisibility();
  clearInputState();

  sounds.background.pause();

  stopStartScreenSound();
  stopSound(sounds.gameOver);
  stopSound(sounds.win);
  stopSound(sounds.pause);
  playSound(sounds.pause);

  showPauseScreen();
}

function resumeGame() {
  if (!gamePaused || gameWon) {
    return;
  }

  gamePaused = false;
  gameRunning = true;

  hidePauseScreen();
  stopSound(sounds.pause);
  updatePauseButtonVisibility();

  if (musicEnabled) sounds.background.play().catch(() => {});
}

function togglePause() {
  if (gamePaused) {
    resumeGame();
  } else {
    pauseGame();
  }
}

// MOBILE / TABLET BACK BUTTON
let pauseHistoryGuard = false;

function activatePauseHistoryGuard() {
  if (pauseHistoryGuard) {
    return;
  }

  history.pushState({ gamePauseGuard: true }, "", window.location.href);
  pauseHistoryGuard = true;
}

window.addEventListener("popstate", () => {
  if (gameRunning) {
    pauseGame();

    history.pushState({ gamePauseGuard: true }, "", window.location.href);
    return;
  }

  if (gamePaused) {
    history.pushState({ gamePauseGuard: true }, "", window.location.href);
  }
});

//  DEATH

function loseLife(showHurtAnimation = false) {
  if (!gameRunning || player.hurt) {
    return;
  }

  lives--;

  playSound(sounds.death);

  createEnemyParticles(
    player.x + player.width / 2,
    player.y + player.height / 2,
  );

  updateUI();

  if (showHurtAnimation) {
    player.startHurtAnimation();
    return;
  }

  finishPlayerDeath();
}

// SELESAI ANIMASI KEMATIAN
function finishPlayerDeath() {
  if (lives <= 0) {
    gameRunning = false;
    gamePaused = false;

    hidePauseScreen();
    stopSound(sounds.pause);
    updatePauseButtonVisibility();

    sounds.background.pause();
    stopStartScreenSound();
    stopSound(sounds.win);
    stopSound(sounds.deathPowered);

    const finalScore = document.getElementById("finalScore");
    if (finalScore) {
      finalScore.textContent = score;
    }

    // Simpan juga skor dari percobaan yang gagal jika menjadi skor tertinggi.
    saveBestScore();

    const gameOverBestScore = document.getElementById("gameOverBestScore");
    if (gameOverBestScore) {
      gameOverBestScore.textContent =
        Number(localStorage.getItem("bestScoreLevel3")) || 0;
    }

    const gameOverScreen = document.getElementById("gameOverScreen");
    if (gameOverScreen) {
      gameOverScreen.classList.remove("hidden");
    }

    /* Game-over sound is started in exactly one place. */
    playSound(sounds.gameOver);
    return;
  }

  player.reset();

  if (checkpoint.active) {
    player.x = checkpoint.x - player.width / 2;
    player.y = checkpoint.y - player.height;
  }

  mushrooms.forEach((mushroom) => {
    mushroom.active = false;
    mushroom.collected = false;
    mushroom.x = 0;
    mushroom.y = 0;
  });

  setTimeout(() => {
    if (!gameRunning) {
      return;
    }

    if (checkpoint.active) {
      player.y = checkpoint.y - player.height;
    } else {
      player.y = 350;
    }
  }, 100);
}

//  WIN
function saveBestScore() {
  const key = "bestScoreLevel3";
  const currentBest = Number(localStorage.getItem(key)) || 0;

  if (score > currentBest) {
    localStorage.setItem(key, String(score));
  }
}

function winGame() {
  if (gameWon) {
    return;
  }

  saveBestScore();

  gameWon = true;
  gamePaused = false;

  gameRunning = false;
  hidePauseScreen();
  updatePauseButtonVisibility();

  localStorage.setItem("level3Completed", "true");

  sounds.background.pause();

  hidePauseScreen();
  stopSound(sounds.pause);
  stopStartScreenSound();
  stopSound(sounds.gameOver);
  stopSound(sounds.deathPowered);
  updatePauseButtonVisibility();

  playSound(sounds.win);

  const winScore = document.getElementById("winScore");

  if (winScore) {
    winScore.textContent = score;
  }

  const winScreen = document.getElementById("winScreen");

  if (winScreen) {
    winScreen.classList.remove("hidden");
  }
}

// RESET
function resetGame() {
  /* STOP SCREEN SOUNDS */
  stopStartScreenSound();
  stopSound(sounds.gameOver);
  stopSound(sounds.deathPowered);
  stopSound(sounds.win);
  stopSound(sounds.pause);

  gameRunning = true;
  gameWon = false;
  gamePaused = false;

  hidePauseScreen();
  stopSound(sounds.pause);
  stopSound(sounds.gameOver);
  stopSound(sounds.win);
  activatePauseHistoryGuard();

  checkpoint.active = false;

  score = 0;
  coinsCollected = 0;
  lives = 3;

  cameraX = 0;
  gameTime = 0;

  enemyNearCooldown = 0;

  particles.length = 0;

  player.reset();

  /* COINS */
  coins.forEach((coin) => {
    coin.collected = false;
  });

  /* ENEMIES */
  enemies.forEach((enemy, index) => {
    enemy.alive = true;

    enemy.animationTimer = 0;

    const startingPositions = [
      430, 900, 1490, 2250, 2780, 3440, 4320, 5010, 5750,
    ];

    enemy.x = startingPositions[index];

    enemy.velocityX = Math.abs(enemy.velocityX);
  });

  tornadoes.forEach((tornado, index) => {
    tornado.hitCooldown = 0;
    tornado.x = [710, 2010, 3250, 4750, 5550][index];
    tornado.velocityX =
      Math.abs(tornado.velocityX) * (index % 2 === 0 ? 1 : -1);
  });

  lightningStrikes.forEach((strike, index) => {
    strike.timer = [20, 100, 50, 140, 70, 10, 90][index];
    strike.warning = 0;
    strike.active = 0;
    strike.hitCooldown = 0;
  });

  /* QUESTION BLOCKS */
  questionBlocks.forEach((block) => {
    block.hit = false;

    block.offsetY = 0;
    block.velocityY = 0;

    block.coin = false;
    block.coinY = 0;
    block.coinVelocityY = 0;
    block.coinLife = 0;
  });

  /* MUSHROOM */
  mushrooms.forEach((mushroom) => {
    mushroom.x = 0;
    mushroom.y = 0;

    mushroom.velocityX = 2.2;
    mushroom.velocityY = 0;

    mushroom.active = false;
    mushroom.collected = false;

    mushroom.grounded = false;
  });

  sounds.background.currentTime = 0;

  if (musicEnabled) sounds.background.play().catch(() => {});

  updateUI();

  hideScreens();
  updatePauseButtonVisibility();
}

//   UI
function updateUI() {
  const scoreElement = document.getElementById("score");

  const coinsElement = document.getElementById("coins");

  const livesElement = document.getElementById("lives");

  if (scoreElement) {
    scoreElement.textContent = score;
  }

  if (coinsElement) {
    coinsElement.textContent = coinsCollected;
  }

  if (livesElement) {
    livesElement.textContent = lives;
  }
}

function hideScreens() {
  const screens = ["startScreen", "gameOverScreen", "winScreen"];

  screens.forEach((id) => {
    const element = document.getElementById(id);

    if (element) {
      element.classList.add("hidden");
    }
  });
}

//  BACKGROUND
const backgroundImage = loadSprite("assets/background_level3.png");

function drawRain() {
  ctx.save();
  ctx.lineWidth = 1;
  ctx.lineCap = "round";

  // Hujan utama: lebih rapat, bergerak diagonal, dan punya panjang bervariasi.
  for (let i = 0; i < 190; i++) {
    const speed = 7 + (i % 5) * 1.4;
    const length = 14 + (i % 4) * 5;
    const drift = gameTime * speed;
    const x = ((i * 137 + drift * 0.95) % (GAME_WIDTH + 120)) - 60;
    const y = ((i * 83 + drift * 1.7) % (GAME_HEIGHT + 120)) - 60;

    ctx.globalAlpha = 0.22 + (i % 4) * 0.045;
    ctx.strokeStyle = i % 3 === 0 ? "#e2e8f0" : "#cbd5e1";

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - 7, y + length);
    ctx.stroke();
  }

  // Beberapa tetes foreground yang lebih terang supaya efek hujan terasa di depan objek.
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 35; i++) {
    const x = ((i * 211 + gameTime * 12) % (GAME_WIDTH + 100)) - 50;
    const y = ((i * 97 + gameTime * 18) % (GAME_HEIGHT + 100)) - 50;

    ctx.globalAlpha = 0.32;
    ctx.strokeStyle = "#f1f5f9";
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - 9, y + 25);
    ctx.stroke();
  }

  ctx.restore();
}

function drawBackground() {
  if (backgroundImage.complete && backgroundImage.naturalWidth > 0) {
    /* IMAGE BACKGROUND */
    ctx.drawImage(backgroundImage, 0, 0, GAME_WIDTH, GAME_HEIGHT);
  } else {
    /* FALLBACK NIGHT SKY (while image is still loading) */
    const skyGradient = ctx.createLinearGradient(0, 0, 0, GAME_HEIGHT);
    skyGradient.addColorStop(0, "#0f172a");
    skyGradient.addColorStop(0.55, "#172554");
    skyGradient.addColorStop(1, "#312e81");
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
  }
}

function drawForestLayer(parallax, color, baseY, treeHeight) {
  const offset = -(cameraX * parallax) % 180;
  ctx.fillStyle = color;

  for (let x = offset - 180; x < GAME_WIDTH + 180; x += 180) {
    const height = treeHeight + Math.sin(x * 0.05) * 25;
    const treeX = x;

    /* TRUNK */
    ctx.fillRect(treeX + 68, baseY, 22, 80);

    /* TOP */
    ctx.beginPath();
    ctx.moveTo(treeX + 80, baseY - height);
    ctx.lineTo(treeX + 20, baseY + 10);
    ctx.lineTo(treeX + 140, baseY + 10);
    ctx.closePath();
    ctx.fill();

    /* SECOND BRANCH */
    ctx.beginPath();
    ctx.moveTo(treeX + 80, baseY - height * 0.65);
    ctx.lineTo(treeX + 35, baseY + 45);
    ctx.lineTo(treeX + 125, baseY + 45);
    ctx.closePath();
    ctx.fill();
  }
}

//  DRAW PLATFORMS - LEVEL 2
function drawPlatforms() {
  platforms.forEach((platform) => {
    const screenX = Math.floor(platform.x - cameraX);
    const y = Math.floor(platform.y);

    const width = platform.width;
    const height = platform.height;

    //  SHADOW
    ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
    ctx.fillRect(screenX + 5, y + height, width - 10, 6);

    //   BAGIAN BAWAH BETON
    ctx.fillStyle = "#1f2937";

    ctx.fillRect(screenX, y + 8, width, Math.max(0, height - 8));

    //   BAGIAN BETON TENGAH
    ctx.fillStyle = "#374151";

    if (height > 15) {
      ctx.fillRect(screenX, y + 10, width, Math.max(0, height - 14));
    }

    //  BAGIAN GELAP BAWAH
    ctx.fillStyle = "#111827";

    if (height > 24) {
      ctx.fillRect(screenX, y + height - 9, width, 9);
    }

    //  PERMUKAAN PAVING
    ctx.fillStyle = "#6b7280";
    ctx.fillRect(screenX, y, width, 7);

    //  HIGHLIGHT PERMUKAAN
    ctx.fillStyle = "#9ca3af";
    ctx.fillRect(screenX, y, width, 3);

    //  GARIS PAVING
    ctx.fillStyle = "#4b5563";

    for (let x = 0; x < width; x += 36) {
      ctx.fillRect(screenX + x, y + 8, 2, Math.min(7, Math.max(0, height - 8)));
    }

    //   POLA BATU / BETON PIXEL
    ctx.fillStyle = "#252f3d";

    for (let x = 8; x < width - 5; x += 45) {
      if (height > 25) {
        ctx.fillRect(screenX + x, y + 20, 14, 5);
      }

      if (height > 42) {
        ctx.fillRect(screenX + x + 20, y + 36, 9, 5);
      }
    }

    //   RETAKAN / DETAIL BETON
    ctx.fillStyle = "#111827";

    for (let x = 20; x < width - 10; x += 70) {
      if (height > 32) {
        ctx.fillRect(screenX + x, y + 29, 6, 3);

        ctx.fillRect(screenX + x + 6, y + 32, 4, 3);
      }
    }

    //  DETAIL HIJAU KECIL
    ctx.fillStyle = "#166534";

    for (let x = 12; x < width - 5; x += 64) {
      ctx.fillRect(screenX + x, y - 2, 7, 3);

      if (x + 10 < width) {
        ctx.fillRect(screenX + x + 8, y - 1, 4, 2);
      }
    }

    //  GARIS BAWAH PLATFORM
    ctx.fillStyle = "#0f172a";

    if (height > 8) {
      ctx.fillRect(screenX, y + height - 4, width, 4);
    }
  });
}

//  PLATFORM LIGHTS - LEVEL 2
function drawPlatformLights() {
  platforms.forEach((platform, index) => {
    const screenX = Math.floor(platform.x - cameraX);

    if (index % 2 !== 0) {
      return;
    }

    const lightPositions = [
      25,
      Math.floor(platform.width / 2),
      platform.width - 30,
    ];

    lightPositions.forEach((offsetX) => {
      if (offsetX < 8 || offsetX > platform.width - 8) {
        return;
      }

      /* tiang kecil */
      ctx.fillStyle = "#374151";
      ctx.fillRect(screenX + offsetX, platform.y - 18, 3, 18);

      /* lampu */
      ctx.fillStyle = "#facc15";
      ctx.fillRect(screenX + offsetX - 2, platform.y - 21, 7, 5);

      /* glow */
      ctx.fillStyle = "rgba(250, 204, 21, 0.15)";
      ctx.fillRect(screenX + offsetX - 5, platform.y - 26, 13, 8);
    });
  });
}

//  QUESTION BLOCK DRAW
function drawQuestionBlocks() {
  questionBlocks.forEach((block) => {
    const x = Math.floor(block.x - cameraX);
    const y = block.y + block.offsetY;

    /* BODY */
    ctx.fillStyle = block.hit ? "#475569" : "#7c3aed";
    ctx.fillRect(x, y, block.width, block.height);

    /* BORDER */
    ctx.strokeStyle = "#c4b5fd";
    ctx.lineWidth = 3;
    ctx.strokeRect(x + 1, y + 1, block.width - 2, block.height - 2);
    if (!block.hit) {
      ctx.fillStyle = "#bae6fd";

      ctx.font = "bold 28px monospace";

      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      ctx.fillText("?", x + block.width / 2, y + block.height / 2 + 1);
    }

    /* COIN FROM BLOCK */
    if (block.coin) {
      const coinX = block.x + block.width / 2;
      const coinY = block.coinY;
      ctx.fillStyle = "#facc15";
      ctx.fillRect(coinX - 8 - cameraX, coinY - 12, 16, 24);
      ctx.fillStyle = "#7dd3fc";
      ctx.fillRect(coinX - 4 - cameraX, coinY - 8, 4, 16);
    }
  });
}

// ENEMY DRAW
function drawEnemies() {
  enemies.forEach((enemy) => {
    if (!enemy.alive) {
      return;
    }

    const x = Math.floor(enemy.x - cameraX);
    const bob = Math.sin(enemy.animationTimer * 0.2) * 1;
    const y = Math.floor(enemy.y + bob);

    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.fillRect(x + 4, y + enemy.height + 2, enemy.width - 8, 4);
    const isPaused = enemy.pauseTimer > 0;
    let frames;

    if (isPaused) {
      frames = enemySprites.idle;
    } else if (enemy.velocityX > 0) {
      frames = enemySprites.walkRight;
    } else {
      frames = enemySprites.walkLeft;
    }

    const frameIndex = Math.floor(enemy.animationTimer / 6) % frames.length;
    const sprite = frames[frameIndex];
    if (!sprite || !sprite.complete || sprite.naturalWidth === 0) {
      return;
    }

    const spriteWidth = 46;
    const spriteHeight = 95;

    const drawX = x + enemy.width / 2 - spriteWidth / 2;
    const drawY = y + enemy.height - spriteHeight;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(
      sprite,
      Math.floor(drawX),
      Math.floor(drawY),
      spriteWidth,
      spriteHeight,
    );
  });
}

//  FINISH DRAW
function drawFinish() {
  const x = Math.floor(finish.x - cameraX);

  /* POLE */
  ctx.fillStyle = "#475569";
  ctx.fillRect(x + 25, finish.y, 7, finish.height);

  /* TOP */
  ctx.fillStyle = "#facc15";
  ctx.fillRect(x + 21, finish.y - 7, 15, 10);

  /* FLAG */
  ctx.fillStyle = "#a855f7";
  ctx.fillRect(x + 32, finish.y + 10, 35, 24);

  /* FLAG HIGHLIGHT */
  ctx.fillStyle = "#c4b5fd";
  ctx.fillRect(x + 32, finish.y + 10, 10, 24);

  /* BASE */
  ctx.fillStyle = "#1e293b";
  ctx.fillRect(x + 12, finish.y + finish.height - 5, 34, 8);
}

// WORLD DRAW
function drawWorld() {
  ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
  drawBackground();
  drawPlatforms();
  drawPlatformLights();
  drawQuestionBlocks();
  drawCheckpoint();
  drawFinish();
  drawCoins();
  drawMushrooms();
  drawEnemies();
  drawStormHazards();
  player.draw();
  drawParticles();

  // Hujan digambar paling akhir agar tetap terlihat di depan seluruh objek level 3.
  drawRain();
}

// GAME LOOP
function gameLoop(timestamp) {
  if (!lastTime) {
    lastTime = timestamp;
  }

  let delta = timestamp - lastTime;

  lastTime = timestamp;

  if (delta > 40) {
    delta = 40;
  }

  if (gameRunning) {
    gameTime += delta / 16.67;
    player.update();
    updateQuestionBlocks();
    updateMushrooms();
    updateCoins();
    updateStormHazards();
    updateEnemies();
    updateEnemyNearSound();
    updateParticles();
    checkCheckpoint();
    checkFinish();
  }

  drawWorld();

  requestAnimationFrame(gameLoop);
}

// BUTTONS
const startButton = document.getElementById("startButton");

if (startButton) {
  startButton.addEventListener("click", () => {
    resetGame();
  });
}

const pauseButton = document.getElementById("pauseButton");

if (pauseButton) {
  pauseButton.addEventListener("click", () => {
    togglePause();
  });
}

const resumeButton = document.getElementById("resumeButton");

if (resumeButton) {
  resumeButton.addEventListener("click", () => {
    resumeGame();
  });
}

const pauseMainMenuButton = document.getElementById("pauseMainMenuButton");

if (pauseMainMenuButton) {
  pauseMainMenuButton.addEventListener("click", () => {
    window.location.href = "index.html";
  });
}

/* KEYBOARD PAUSE */
document.addEventListener("keydown", (e) => {
  if (e.code === "Escape") {
    e.preventDefault();

    if (gameRunning || gamePaused) {
      togglePause();
    }
  }
});

const restartButton = document.getElementById("restartButton");

if (restartButton) {
  restartButton.addEventListener("click", () => {
    resetGame();
  });
}

const playAgainButton = document.getElementById("playAgainButton");

if (playAgainButton) {
  playAgainButton.addEventListener("click", () => {
    resetGame();
  });
}

/* MAIN MENU */
const mainMenuButton = document.getElementById("mainMenuButton");

if (mainMenuButton) {
  mainMenuButton.addEventListener("click", () => {
    window.location.href = "index.html";
  });
}

// INIT
updateUI();
updatePauseButtonVisibility();

drawWorld();

playStartScreenSound();

document.addEventListener(
  "pointerdown",
  () => {
    // Jangan menyalakan opening sound saat WIN atau GAME OVER sedang tampil.
    const gameOverScreen = document.getElementById("gameOverScreen");
    const winScreen = document.getElementById("winScreen");
    const isGameOverVisible =
      gameOverScreen && !gameOverScreen.classList.contains("hidden");
    const isWinVisible = winScreen && !winScreen.classList.contains("hidden");

    if (isGameOverVisible || isWinVisible) {
      return;
    }

    if (!gameRunning && !gamePaused && !gameWon) {
      playStartScreenSound();
    }
  },
  { passive: true },
);

requestAnimationFrame(gameLoop);
