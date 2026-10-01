const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

ctx.imageSmoothingEnabled = false;

const GAME_WIDTH = 1200;
const GAME_HEIGHT = 600;

canvas.width = GAME_WIDTH;
canvas.height = GAME_HEIGHT;

// Main Menu Button
const mainMenuButton = document.getElementById("mainMenuButton");

if (mainMenuButton) {
  mainMenuButton.addEventListener("click", () => {
    window.location.href = "index.html";
  });
}

// SOUND SETTINGS
const musicEnabled = localStorage.getItem("musicEnabled") !== "false";
const sfxEnabled = localStorage.getItem("sfxEnabled") !== "false";

// SOUND
const sounds = {
  enemy: new Audio("assets/enemy.mp3"),
  death: new Audio("assets/death.mp3"),
  coin: new Audio("assets/coin.mp3"),
  jump: new Audio("assets/jump.mp3"),
  coinsCollected: new Audio("assets/coin-collect.mp3"),
  enemyNear: new Audio("assets/enemy-2.mp3"),
  background: new Audio("assets/backsong.mp3"),
  mushroom: new Audio("assets/mushroom.mp3"),
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

//  GAME STATE
let gameRunning = false;
let gameWon = false;
let gamePaused = false;
let score = 0;
let coinsCollected = 0;
let lives = 3;
let cameraX = 0;
let gameTime = 0;
let lastTime = 0;

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

document.addEventListener("keydown", (e) => {
  if (e.code === "ArrowLeft" || e.code === "KeyA") {
    keys.left = true;
    e.preventDefault();
  }

  if (e.code === "ArrowRight" || e.code === "KeyD") {
    keys.right = true;
    e.preventDefault();
  }

  if (e.code === "Space" || e.code === "ArrowUp" || e.code === "KeyW") {
    if (!keys.jump) {
      keys.jumpPressed = true;
    }

    keys.jump = true;
    e.preventDefault();
  }
});

document.addEventListener("keyup", (e) => {
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

//  MOBILE CONTROLS
function mobileButton(id, key) {
  const button = document.getElementById(id);

  if (!button) return;

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

  button.addEventListener("touchstart", start, { passive: false });
  button.addEventListener("touchend", end, { passive: false });
  button.addEventListener("touchcancel", end, { passive: false });

  button.addEventListener("mousedown", start);
  button.addEventListener("mouseup", end);
  button.addEventListener("mouseleave", end);
}

mobileButton("leftBtn", "left");
mobileButton("rightBtn", "right");
mobileButton("jumpBtn", "jump");

//  PARTICLES
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
      color: "#d1d5db",
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
      color: Math.random() > 0.5 ? "#fbbf24" : "#fef3c7",
    });
  }
}

/* MUSHROOM PARTICLES */
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

// PLAYER SPRITES
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

// ENEMY SPRITES
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

// PLAYER
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

    /* INVINCIBILITY TIMER */
    if (this.invincible) {
      this.invincibleTimer--;

      if (this.invincibleTimer <= 0) {
        this.invincible = false;
        this.invincibleTimer = 0;
      }
    }

    //  HORIZONTAL MOVEMENT
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

    //  JUMP
    if (keys.jumpPressed && this.grounded) {
      this.velocityY = jumpPower;
      this.grounded = false;
      playSound(sounds.jump);
      createDustParticles(this.x + this.width / 2, this.y + this.height);
    }

    keys.jumpPressed = false;

    // GRAVITY
    this.velocityY += gravity;

    if (this.velocityY > 15) {
      this.velocityY = 15;
    }

    // MOVE X
    this.x += this.velocityX;
    this.horizontalCollision();

    // MOVE Y
    this.y += this.velocityY;
    this.grounded = false;
    this.verticalCollision();

    // WORLD BOUNDARY
    if (this.x < 0) {
      this.x = 0;
      this.velocityX = 0;
    }

    if (this.x + this.width > LEVEL_WIDTH) {
      this.x = LEVEL_WIDTH - this.width;
      this.velocityX = 0;
    }

    // FALLING
    if (this.y > GAME_HEIGHT + 150) {
      loseLife();
    }

    // LANDING
    if (this.grounded && !this.previousGrounded && this.velocityY >= 0) {
      createDustParticles(this.x + this.width / 2, this.y + this.height);
    }

    //  ANIMATION
    this.updateAnimation();

    //  CAMERA
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

    // /DRAW SPRITE
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

// / LEVEL
const LEVEL_WIDTH = 5200;

const platforms = [
  { x: 0, y: 530, width: 900, height: 70 },

  {
    x: 250,
    y: 420,
    width: 60,
    height: 30,
  },

  {
    x: 357,
    y: 420,
    width: 63,
    height: 30,
  },

  { x: 520, y: 350, width: 150, height: 30 },

  { x: 1050, y: 530, width: 800, height: 70 },

  {
    x: 1250,
    y: 400,
    width: 180,
    height: 30,
  },

  { x: 1530, y: 320, width: 150, height: 30 },

  { x: 1950, y: 530, width: 850, height: 70 },
  { x: 2150, y: 400, width: 150, height: 30 },
  { x: 2400, y: 340, width: 150, height: 30 },

  { x: 2900, y: 530, width: 900, height: 70 },
  { x: 3150, y: 400, width: 170, height: 30 },
  { x: 3450, y: 330, width: 160, height: 30 },

  { x: 3900, y: 530, width: 1300, height: 70 },
  { x: 4200, y: 410, width: 160, height: 30 },
  { x: 4500, y: 350, width: 170, height: 30 },
];

const questionBlocks = [
  // BLOCK 1
  {
    x: 312,
    y: 405,
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

  //  BLOCK 2
  {
    x: 1450,
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

  //  BLOCK 3
  {
    x: 4280,
    y: 250,
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

// POWER-UP MUSHROOM
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

//  SPAWN MUSHROOM
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

// UPDATE MUSHROOM
function updateMushrooms() {
  mushrooms.forEach((mushroom) => {
    if (!mushroom.active || mushroom.collected) {
      return;
    }

    //  HORIZONTAL MOVEMENT
    mushroom.x += mushroom.velocityX;

    let horizontalBlocked = false;

    platforms.forEach((platform) => {
      if (checkCollision(mushroom, platform)) {
        horizontalBlocked = true;

        if (mushroom.velocityX > 0) {
          mushroom.x = platform.x - mushroom.width;
        } else {
          mushroom.x = platform.x + platform.width;
        }
      }
    });

    questionBlocks.forEach((block) => {
      if (block === questionBlocks[1]) {
        return;
      }

      if (checkCollision(mushroom, block)) {
        horizontalBlocked = true;

        if (mushroom.velocityX > 0) {
          mushroom.x = block.x - mushroom.width;
        } else {
          mushroom.x = block.x + block.width;
        }
      }
    });

    if (horizontalBlocked) {
      mushroom.velocityX *= -1;
    }

    // GRAVITY
    mushroom.velocityY += gravity;

    if (mushroom.velocityY > 12) {
      mushroom.velocityY = 12;
    }

    mushroom.y += mushroom.velocityY;
    mushroom.grounded = false;

    // VERTICAL COLLISION
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

    // WORLD BOUNDARY
    if (mushroom.x < 0) {
      mushroom.x = 0;
      mushroom.velocityX = Math.abs(mushroom.velocityX);
    }

    if (mushroom.x + mushroom.width > LEVEL_WIDTH) {
      mushroom.x = LEVEL_WIDTH - mushroom.width;

      mushroom.velocityX = -Math.abs(mushroom.velocityX);
    }

    //  COLLECT BY PLAYER
    if (checkCollision(player, mushroom)) {
      collectMushroom(mushroom);
    }

    //  FALL INTO VOID
    if (mushroom.y > GAME_HEIGHT + 100) {
      mushroom.active = false;
    }
  });
}

// COLLECT MUSHROOM
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

//  DRAW MUSHROOM
function drawMushrooms() {
  mushrooms.forEach((mushroom) => {
    if (!mushroom.active || mushroom.collected) {
      return;
    }

    const screenX = Math.floor(mushroom.x - cameraX);

    const screenY = Math.floor(mushroom.y);

    if (mushroom.grounded) {
      ctx.fillStyle = "rgba(0,0,0,0.18)";

      ctx.fillRect(
        screenX + 5,
        screenY + mushroom.height + 2,
        mushroom.width - 10,
        4,
      );
    }

    //  STEM

    ctx.fillStyle = "#fef3c7";

    ctx.fillRect(screenX + 9, screenY + 18, 20, 17);

    ctx.fillStyle = "#d6d3d1";

    ctx.fillRect(screenX + 23, screenY + 19, 6, 15);

    //  RED CAP
    ctx.fillStyle = "#dc2626";
    ctx.fillRect(screenX + 4, screenY + 8, 30, 15);
    ctx.fillRect(screenX + 8, screenY + 4, 22, 7);
    ctx.fillRect(screenX + 13, screenY + 1, 12, 5);

    /* CAP DARK BOTTOM */
    ctx.fillStyle = "#991b1b";
    ctx.fillRect(screenX + 7, screenY + 20, 26, 5);

    // WHITE SPOTS
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(screenX + 8, screenY + 7, 7, 7);
    ctx.fillRect(screenX + 23, screenY + 6, 7, 7);
    ctx.fillRect(screenX + 16, screenY + 14, 7, 6);

    //  OUTLINE
    ctx.strokeStyle = "#7f1d1d";
    ctx.lineWidth = 2;
    ctx.strokeRect(screenX + 4, screenY + 8, 30, 17);
  });
}

// QUESTION BLOCK HIT
function hitQuestionBlock(block) {
  if (block.hit) {
    return;
  }

  block.hit = true;

  block.offsetY = -8;
  block.velocityY = -5;

  // BLOCK KEDUA = MUSHROOM
  if (block === questionBlocks[1]) {
    spawnMushroom(block);
    score += 1000;
    createBlockParticles(block.x + block.width / 2, block.y + block.height / 2);

    updateUI();

    return;
  }

  // BLOCK 1 & 3 = COIN
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

// UPDATE QUESTION BLOCKS
function updateQuestionBlocks() {
  questionBlocks.forEach((block) => {
    if (block.offsetY !== 0 || block.velocityY !== 0) {
      block.offsetY += block.velocityY;

      block.velocityY += 0.7;

      if (block.offsetY >= 0) {
        block.offsetY = 0;
        block.velocityY = 0;
      }
    }

    if (block.coin) {
      block.coinY += block.coinVelocityY;
      block.coinVelocityY += 0.45;
      block.coinLife--;

      if (block.coinLife <= 0) {
        block.coin = false;
      }
    }
  });
}

//  COINS
const coins = [
  { x: 300, y: 370, collected: false },
  { x: 350, y: 370, collected: false },

  { x: 560, y: 300, collected: false },
  { x: 610, y: 300, collected: false },

  { x: 760, y: 470, collected: false },

  { x: 1100, y: 470, collected: false },

  { x: 1290, y: 340, collected: false },
  { x: 1340, y: 340, collected: false },

  { x: 1570, y: 270, collected: false },

  { x: 2000, y: 470, collected: false },
  { x: 2050, y: 470, collected: false },

  { x: 2190, y: 350, collected: false },

  { x: 2440, y: 290, collected: false },

  { x: 3000, y: 470, collected: false },
  { x: 3050, y: 470, collected: false },

  { x: 3190, y: 350, collected: false },

  { x: 3490, y: 280, collected: false },

  { x: 4000, y: 470, collected: false },
  { x: 4100, y: 470, collected: false },

  { x: 4250, y: 360, collected: false },

  { x: 4550, y: 300, collected: false },

  { x: 4750, y: 470, collected: false },
];

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

// ENEMIES
const enemies = [
  {
    x: 650,
    y: 480,
    width: 40,
    height: 50,
    velocityX: 1.5,
    minX: 550,
    maxX: 850,
    alive: true,
    animationTimer: 0,
  },

  {
    x: 1180,
    y: 480,
    width: 40,
    height: 50,
    velocityX: 1.5,
    minX: 1080,
    maxX: 1500,
    alive: true,
    animationTimer: 0,
  },

  {
    x: 2100,
    y: 480,
    width: 40,
    height: 50,
    velocityX: 1.7,
    minX: 1980,
    maxX: 2700,
    alive: true,
    animationTimer: 0,
  },

  {
    x: 3000,
    y: 480,
    width: 40,
    height: 50,
    velocityX: 2,
    minX: 2920,
    maxX: 3750,
    alive: true,
    animationTimer: 0,
  },

  {
    x: 4050,
    y: 480,
    width: 40,
    height: 50,
    velocityX: 1.8,
    minX: 3950,
    maxX: 4300,
    alive: true,
    animationTimer: 0,
  },
];

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
      //   SEDANG INVINCIBLE
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

// FINISH
const finish = {
  x: 5000,
  y: 330,
  width: 60,
  height: 200,
};

const checkpoint = { x: 2700, y: 430, width: 30, height: 100, active: false };

// COLLISION
function checkCollision(a, b) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

// FINISH CHECK
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

function checkCheckpoint() {
  if (checkpoint.active) {
    return;
  }

  if (checkCollision(player, checkpoint)) {
    checkpoint.active = true;
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

  pauseButton.classList.toggle("hidden", !gameRunning);
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

// LOSE LIFE
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

    const finalScore = document.getElementById("finalScore");

    if (finalScore) {
      finalScore.textContent = score;
    }

    // Simpan juga skor dari percobaan yang gagal jika menjadi skor tertinggi.
    saveBestScore();

    const gameOverBestScore = document.getElementById("gameOverBestScore");
    if (gameOverBestScore) {
      gameOverBestScore.textContent =
        Number(localStorage.getItem("bestScoreLevel1")) || 0;
    }

    const gameOverScreen = document.getElementById("gameOverScreen");

    if (gameOverScreen) {
      gameOverScreen.classList.remove("hidden");
    }

    stopStartScreenSound();
    playSound(sounds.gameOver);
  } else {
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
}

// WIN GAME
function saveBestScore() {
  const key = "bestScoreLevel1";
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

  localStorage.setItem("level2Unlocked", "true");

  sounds.background.pause();

  stopStartScreenSound();
  stopSound(sounds.gameOver);
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

// RESET GAME
function resetGame() {
  stopStartScreenSound();
  stopSound(sounds.gameOver);
  stopSound(sounds.deathPowered);
  stopSound(sounds.win);
  stopSound(sounds.pause);

  gameRunning = true;
  gameWon = false;
  gamePaused = false;
  hidePauseScreen();
  activatePauseHistoryGuard();
  checkpoint.active = false;
  sounds.background.currentTime = 0;
  if (musicEnabled) sounds.background.play().catch(() => {});
  score = 0;
  coinsCollected = 0;
  lives = 3;
  cameraX = 0;
  gameTime = 0;
  particles.length = 0;
  player.reset();

  coins.forEach((coin) => {
    coin.collected = false;
  });

  enemies.forEach((enemy, index) => {
    enemy.alive = true;
    enemy.animationTimer = 0;
    const startingPositions = [650, 1180, 2100, 3000, 4050];
    enemy.x = startingPositions[index];
    enemy.velocityX = Math.abs(enemy.velocityX);
  });

  questionBlocks.forEach((block) => {
    block.hit = false;
    block.offsetY = 0;
    block.velocityY = 0;
    block.coin = false;
    block.coinY = 0;
    block.coinVelocityY = 0;
    block.coinLife = 0;
  });

  mushrooms.forEach((mushroom) => {
    mushroom.x = 0;
    mushroom.y = 0;
    mushroom.velocityX = 2.2;
    mushroom.velocityY = 0;
    mushroom.active = false;
    mushroom.collected = false;
    mushroom.grounded = false;
  });

  updateUI();

  hideScreens();
  updatePauseButtonVisibility();
}

//  UI
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

// BACKGROUND
const backgroundImage = loadSprite("assets/background_level1.png");

function drawBackground() {
  if (backgroundImage.complete && backgroundImage.naturalWidth > 0) {
    ctx.drawImage(backgroundImage, 0, 0, GAME_WIDTH, GAME_HEIGHT);
  } else {
    const sky = ctx.createLinearGradient(0, 0, 0, GAME_HEIGHT);
    sky.addColorStop(0, "#38bdf8");
    sky.addColorStop(1, "#bae6fd");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
  }
}

function drawCloud(x, y) {
  ctx.fillStyle = "rgba(255,255,255,0.8)";
  ctx.fillRect(x, y + 10, 100, 30);
  ctx.fillRect(x + 20, y, 35, 30);
  ctx.fillRect(x + 45, y - 8, 40, 38);
  ctx.fillRect(x + 70, y + 5, 35, 30);
}

//  DRAW PLATFORMS - LEVEL 1
function drawPlatforms() {
  platforms.forEach((platform) => {
    const screenX = Math.floor(platform.x - cameraX);
    const y = Math.floor(platform.y);

    const width = platform.width;
    const height = platform.height;

    ctx.fillStyle = "rgba(0, 0, 0, 0.18)";
    ctx.fillRect(screenX + 4, y + height, width - 8, 5);

    ctx.fillStyle = "#8b5a2b";
    ctx.fillRect(screenX, y + 8, width, Math.max(0, height - 8));

    ctx.fillStyle = "#70451f";

    if (height > 20) {
      ctx.fillRect(screenX, y + 20, width, Math.max(0, height - 20));
    }

    ctx.fillStyle = "#5f3b1f";

    for (let x = 10; x < width - 5; x += 32) {
      if (height > 25) {
        ctx.fillRect(screenX + x, y + 25, 7, 5);
      }

      if (height > 45) {
        ctx.fillRect(screenX + x + 12, y + 42, 5, 4);
      }
    }

    ctx.fillStyle = "#15803d";

    ctx.fillRect(screenX, y, width, 8);

    ctx.fillStyle = "#22c55e";

    ctx.fillRect(screenX, y, width, 4);

    ctx.fillStyle = "#16a34a";

    for (let x = 5; x < width; x += 26) {
      ctx.fillRect(screenX + x, y - 3, 7, 4);

      if (x + 10 < width) {
        ctx.fillRect(screenX + x + 8, y - 2, 4, 3);
      }
    }

    ctx.fillStyle = "#a16207";

    for (let x = 18; x < width - 5; x += 42) {
      if (height > 30) {
        ctx.fillRect(screenX + x, y + 14, 9, 4);
      }

      if (height > 50) {
        ctx.fillRect(screenX + x + 15, y + 35, 6, 4);
      }
    }

    ctx.fillStyle = "#d6b27a";

    for (let x = 28; x < width - 8; x += 55) {
      if (height > 28) {
        ctx.fillRect(screenX + x, y + 12, 5, 4);
      }
    }

    ctx.fillStyle = "#6b4423";

    if (height > 12) {
      ctx.fillRect(screenX, y + height - 4, width, 4);
    }
  });
}

//  DRAW QUESTION BLOCKS
function drawQuestionBlocks() {
  questionBlocks.forEach((block) => {
    const screenX = Math.floor(block.x - cameraX);

    const screenY = Math.floor(block.y + block.offsetY);

    ctx.fillStyle = "rgba(0,0,0,0.18)";

    ctx.fillRect(screenX + 4, screenY + block.height + 3, block.width - 8, 4);

    if (!block.hit) {
      ctx.fillStyle = "#f59e0b";

      ctx.fillRect(screenX, screenY, block.width, block.height);

      ctx.fillStyle = "#fcd34d";

      ctx.fillRect(screenX + 4, screenY + 4, block.width - 8, 5);

      ctx.fillRect(screenX + 4, screenY + 4, 5, block.height - 8);

      ctx.strokeStyle = "#92400e";

      ctx.lineWidth = 4;

      ctx.strokeRect(
        screenX + 2,
        screenY + 2,
        block.width - 4,
        block.height - 4,
      );

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 30px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(
        "?",
        screenX + block.width / 2,
        screenY + block.height / 2 + 1,
      );
    } else {
      ctx.fillStyle = "#9ca3af";
      ctx.fillRect(screenX, screenY, block.width, block.height);
      ctx.fillStyle = "#d1d5db";
      ctx.fillRect(screenX + 4, screenY + 4, block.width - 8, 5);
      ctx.strokeStyle = "#4b5563";
      ctx.lineWidth = 4;
      ctx.strokeRect(
        screenX + 2,
        screenY + 2,
        block.width - 4,
        block.height - 4,
      );

      ctx.fillStyle = "#6b7280";
      ctx.fillRect(screenX + 14, screenY + 14, 16, 16);
    }

    if (block.coin) {
      const coinX = block.x + block.width / 2 - cameraX;
      const coinY = block.coinY;
      const scale = 0.75 + Math.abs(Math.sin(gameTime * 0.25)) * 0.25;

      ctx.save();
      ctx.translate(coinX, coinY);
      ctx.scale(scale, 1);
      ctx.fillStyle = "#facc15";
      ctx.fillRect(-8, -12, 16, 24);
      ctx.fillStyle = "#fde68a";
      ctx.fillRect(-4, -9, 5, 17);
      ctx.fillStyle = "#ca8a04";
      ctx.fillRect(4, -7, 4, 15);
      ctx.restore();
    }
  });

  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
}

//   DRAW COINS
function drawCoins() {
  coins.forEach((coin) => {
    if (coin.collected) {
      return;
    }

    const bob = Math.sin(gameTime * 0.12 + coin.x) * 5;
    const rotation = Math.abs(Math.sin(gameTime * 0.1 + coin.x));
    const screenX = coin.x - cameraX;
    const screenY = coin.y + bob;

    ctx.save();
    ctx.translate(screenX, screenY);
    ctx.scale(rotation * 0.6 + 0.4, 1);
    ctx.fillStyle = "rgba(250,204,21,0.2)";
    ctx.fillRect(-12, -17, 24, 34);

    ctx.fillStyle = "#facc15";
    ctx.fillRect(-8, -14, 16, 28);

    ctx.fillStyle = "#fde68a";
    ctx.fillRect(-4, -10, 5, 20);

    ctx.fillStyle = "#ca8a04";
    ctx.fillRect(4, -8, 4, 17);

    ctx.restore();
  });
}

// DRAW ENEMIES
function drawEnemies() {
  enemies.forEach((enemy) => {
    if (!enemy.alive) {
      return;
    }

    const screenX = Math.floor(enemy.x - cameraX);
    const screenY = Math.floor(enemy.y);

    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.fillRect(screenX + 4, screenY + enemy.height, enemy.width - 8, 4);

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

    const drawX = screenX + enemy.width / 2 - spriteWidth / 2;
    const drawY = screenY + enemy.height - spriteHeight;
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

// DRAW FINISH
function drawFinish() {
  const screenX = Math.floor(finish.x - cameraX);
  ctx.fillStyle = "#e5e7eb";
  ctx.fillRect(screenX + 28, finish.y, 6, finish.height);
  ctx.fillStyle = "#ef4444";
  ctx.beginPath();
  ctx.moveTo(screenX + 34, finish.y + 10);
  ctx.lineTo(screenX + 80, finish.y + 30);
  ctx.lineTo(screenX + 34, finish.y + 50);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#facc15";
  ctx.beginPath();
  ctx.arc(screenX + 31, finish.y, 7, 0, Math.PI * 2);
  ctx.fill();
}

// DRAW WORLD
function drawWorld() {
  ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
  drawBackground();
  drawPlatforms();
  drawQuestionBlocks();
  drawMushrooms();
  drawCoins();
  drawEnemies();
  drawFinish();
  drawParticles();
  player.draw();
  drawCheckpoint();
}

// Draw Check Point
function drawCheckpoint() {
  const screenX = Math.floor(checkpoint.x - cameraX);

  ctx.fillStyle = "#78350f";
  ctx.fillRect(screenX + 12, checkpoint.y, 6, checkpoint.height);
  ctx.fillStyle = checkpoint.active ? "#22c55e" : "#ef4444";
  ctx.fillRect(screenX + 18, checkpoint.y + 8, 28, 20);
  ctx.fillStyle = checkpoint.active ? "#86efac" : "#fca5a5";
  ctx.fillRect(screenX + 18, checkpoint.y + 8, 8, 20);
  ctx.fillStyle = "#facc15";
  ctx.fillRect(screenX + 10, checkpoint.y - 6, 10, 10);
  ctx.fillStyle = "rgba(0,0,0,0.2)";
  ctx.fillRect(screenX + 4, checkpoint.y + checkpoint.height, 24, 4);
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

const nextLevelButton = document.getElementById("nextLevelButton");

if (nextLevelButton) {
  nextLevelButton.addEventListener("click", () => {
    window.location.href = "level2.html";
  });
}

//  INITIALIZE
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
