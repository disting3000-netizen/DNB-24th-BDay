/* Operation Baby Launcher — vanilla JS game */

const ASSET_PATHS = {
  baby: 'stickers/images/Baby/baby_sticker.png',
  slingshot: 'stickers/images/Baby/slingshot_sticker.png',
  pillow: 'stickers/images/Baby/dogbed_sticker.png',
  cloud: 'stickers/images/Baby/cloud_sticker.png',
  moon: 'stickers/images/Baby/moon_sticker.png',
  geese: 'stickers/images/Baby/geese_sticker.png',
  star: 'baby/assets/star.svg',
  sky: 'baby/assets/sky_background.svg',
  launchTrail: 'baby/assets/launch_trail.svg',
  confetti: 'baby/assets/success_confetti.svg'
};

const GAME_STATE = {
  READY: 'ready',
  DRAGGING: 'dragging',
  FLYING: 'flying',
  SUCCESS: 'success',
  FAILED: 'failed'
};

const GRAVITY = 1000;
const MAX_PULL = 150;
const POWER_SCALE = 7.8;
const BABY_RADIUS = 34 * 0.9;
const PILLOW_W = 240 * 0.8;
const PILLOW_H = 140 * 0.8;
const PILLOW_HIT_W = PILLOW_W * 0.5;
const PILLOW_HIT_H = PILLOW_H * 0.5;
const LEVEL2_PILLOW_SPEED = 1.1 * 1.5 * 1.5;
const LEVEL3_PLUS_PILLOW_SPEED = 1.6 * 1.5;
const MOON_PULL_STRENGTH = 480;
const GEESE_TRAIL_DISTANCE = 88;
const TRAJECTORY_STEPS = 14;
const TRAJECTORY_STEP_SEC = 0.08;

// ---------------------------------------------------------------------------
// AssetLoader
// ---------------------------------------------------------------------------
class AssetLoader {
  static async loadAll() {
    const entries = Object.entries(ASSET_PATHS);
    const images = {};

    await Promise.all(entries.map(([key, src]) => new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        images[key] = img;
        resolve();
      };
      img.onerror = () => {
        console.warn(`Missing asset: ${src}`);
        resolve();
      };
      img.src = src;
    })));

    return images;
  }
}

// ---------------------------------------------------------------------------
// LevelManager
// ---------------------------------------------------------------------------
class LevelManager {
  constructor() {
    this.level = 1;
    this.maxLevel = 5;
    this.elapsed = 0;
    this.clouds = [];
    this.moon = null;
    this.geese = null;
  }

  hasClouds() {
    return this.level >= 3;
  }

  hasMoon() {
    return this.level >= 4;
  }

  hasGeese() {
    return this.level >= 5;
  }

  resetClouds(width, height) {
    this.clouds = [
      { x: width * 0.35, y: height * 0.38, vx: 55, width: 130, height: 72 },
      { x: width * 0.55, y: height * 0.48, vx: -65, width: 130, height: 72 },
      { x: width * 0.72, y: height * 0.32, vx: 48, width: 130, height: 72 }
    ];
  }

  resetMoon(width, height) {
    this.moon = {
      x: width * 0.58,
      y: height * 0.2,
      size: 110
    };
  }

  resetGeese(width, height, anchorX, anchorY) {
    this.geese = {
      x: anchorX - GEESE_TRAIL_DISTANCE,
      y: anchorY,
      width: 140,
      height: 95,
      active: false
    };
  }

  activateGeese(babyX, babyY, babyVx, babyVy) {
    if (!this.geese) {
      return;
    }

    this.geese.active = true;
    this.syncGeeseToBaby(babyX, babyY, babyVx, babyVy);
  }

  syncGeeseToBaby(babyX, babyY, babyVx, babyVy) {
    if (!this.geese) {
      return;
    }

    const speed = Math.hypot(babyVx, babyVy);
    if (speed > 1) {
      this.geese.x = babyX - (babyVx / speed) * GEESE_TRAIL_DISTANCE;
      this.geese.y = babyY - (babyVy / speed) * GEESE_TRAIL_DISTANCE;
      return;
    }

    this.geese.x = babyX - GEESE_TRAIL_DISTANCE;
    this.geese.y = babyY;
  }

  setupLevelFeatures(width, height, anchorX, anchorY) {
    if (this.hasClouds()) {
      this.resetClouds(width, height);
    } else {
      this.clouds = [];
    }

    if (this.hasMoon()) {
      this.resetMoon(width, height);
    } else {
      this.moon = null;
    }

    if (this.hasGeese()) {
      this.resetGeese(width, height, anchorX, anchorY);
    } else {
      this.geese = null;
    }
  }

  setLevel(level) {
    this.level = Math.min(this.maxLevel, Math.max(1, level));
    this.elapsed = 0;
  }

  update(deltaSeconds, width, height) {
    this.elapsed += deltaSeconds;

    if (this.hasClouds()) {
      this.clouds.forEach((cloud) => {
        cloud.x += cloud.vx * deltaSeconds;
        if (cloud.x < -cloud.width) {
          cloud.x = width + cloud.width;
        }
        if (cloud.x > width + cloud.width) {
          cloud.x = -cloud.width;
        }
      });
    }
  }

  updateGeese(babyX, babyY, babyVx, babyVy, babyFlying) {
    if (!this.geese || !this.geese.active || !babyFlying) {
      return;
    }

    this.syncGeeseToBaby(babyX, babyY, babyVx, babyVy);
  }

  applyMoonPull(physics, deltaSeconds) {
    if (!this.moon || physics.state !== GAME_STATE.FLYING) {
      return;
    }

    const dx = this.moon.x - physics.x;
    const dy = this.moon.y - physics.y;
    const distance = Math.hypot(dx, dy);
    if (distance < 30) {
      return;
    }

    const pull = MOON_PULL_STRENGTH / (distance * 0.008 + 1);
    physics.vx += (dx / distance) * pull * deltaSeconds;
    physics.vy += (dy / distance) * pull * deltaSeconds;
  }

  getPillowRect(width, height) {
    let centerX = width * 0.78;

    if (this.level === 2) {
      centerX += Math.sin(this.elapsed * LEVEL2_PILLOW_SPEED) * 90;
    } else if (this.level >= 3) {
      centerX += Math.sin(this.elapsed * LEVEL3_PLUS_PILLOW_SPEED) * 120;
    }

    const centerY = height * 0.7;
    return {
      x: centerX - PILLOW_W / 2,
      y: centerY - PILLOW_H / 2,
      width: PILLOW_W,
      height: PILLOW_H,
      hitX: centerX - PILLOW_HIT_W / 2,
      hitY: centerY - PILLOW_HIT_H / 2,
      hitWidth: PILLOW_HIT_W,
      hitHeight: PILLOW_HIT_H,
      centerX,
      centerY
    };
  }

  getCloudRects() {
    return this.clouds.map((cloud) => ({
      x: cloud.x,
      y: cloud.y,
      width: cloud.width,
      height: cloud.height
    }));
  }

  getMoon() {
    return this.moon;
  }

  getGeese() {
    return this.geese;
  }
}

// ---------------------------------------------------------------------------
// PhysicsEngine
// ---------------------------------------------------------------------------
class PhysicsEngine {
  constructor() {
    this.reset();
  }

  reset(anchorX, anchorY) {
    this.state = GAME_STATE.READY;
    this.x = anchorX;
    this.y = anchorY;
    this.vx = 0;
    this.vy = 0;
    this.dragX = anchorX;
    this.dragY = anchorY;
    this.power = 0;
    this.angleDeg = 0;
    this.bounceTime = 0;
  }

  startDrag(x, y, anchorX, anchorY) {
    this.state = GAME_STATE.DRAGGING;
    this.dragX = x;
    this.dragY = y;
    this.updateDragMetrics(anchorX, anchorY);
  }

  updateDrag(x, y, anchorX, anchorY) {
    this.dragX = x;
    this.dragY = y;
    this.updateDragMetrics(anchorX, anchorY);
  }

  updateDragMetrics(anchorX, anchorY) {
    const dx = this.dragX - anchorX;
    const dy = this.dragY - anchorY;
    const distance = Math.hypot(dx, dy);
    const clamped = Math.min(distance, MAX_PULL);
    this.power = Math.round(clamped * POWER_SCALE);
    const launchAngle = Math.atan2(-dy, -dx);
    this.angleDeg = Math.round((launchAngle * 180) / Math.PI);
  }

  release(anchorX, anchorY) {
    const dx = this.dragX - anchorX;
    const dy = this.dragY - anchorY;
    const distance = Math.min(Math.hypot(dx, dy), MAX_PULL);
    const speed = distance * POWER_SCALE;
    const angle = Math.atan2(-dy, -dx);

    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.x = anchorX;
    this.y = anchorY;
    this.state = GAME_STATE.FLYING;
  }

  update(deltaSeconds) {
    if (this.state === GAME_STATE.FLYING) {
      this.vy += GRAVITY * deltaSeconds;
      this.x += this.vx * deltaSeconds;
      this.y += this.vy * deltaSeconds;
    }

    if (this.state === GAME_STATE.SUCCESS) {
      this.bounceTime += deltaSeconds;
    }
  }

  getTrajectoryPoints(anchorX, anchorY) {
    const dx = this.dragX - anchorX;
    const dy = this.dragY - anchorY;
    const distance = Math.min(Math.hypot(dx, dy), MAX_PULL);
    const speed = distance * POWER_SCALE;
    const angle = Math.atan2(-dy, -dx);

    let simX = anchorX;
    let simY = anchorY;
    let simVx = Math.cos(angle) * speed;
    let simVy = Math.sin(angle) * speed;
    const points = [];

    for (let step = 0; step < TRAJECTORY_STEPS; step += 1) {
      simVy += GRAVITY * TRAJECTORY_STEP_SEC;
      simX += simVx * TRAJECTORY_STEP_SEC;
      simY += simVy * TRAJECTORY_STEP_SEC;
      points.push({ x: simX, y: simY });
    }

    return points;
  }
}

// ---------------------------------------------------------------------------
// CollisionSystem
// ---------------------------------------------------------------------------
class CollisionSystem {
  static circleRectOverlap(cx, cy, radius, rect) {
    const closestX = Math.max(rect.x, Math.min(cx, rect.x + rect.width));
    const closestY = Math.max(rect.y, Math.min(cy, rect.y + rect.height));
    const dx = cx - closestX;
    const dy = cy - closestY;
    return dx * dx + dy * dy < radius * radius;
  }

  static check(physics, pillowRect, cloudRects, width, height) {
    if (physics.state !== GAME_STATE.FLYING) {
      return null;
    }

    if (
      CollisionSystem.circleRectOverlap(physics.x, physics.y, BABY_RADIUS, {
        x: pillowRect.hitX,
        y: pillowRect.hitY,
        width: pillowRect.hitWidth,
        height: pillowRect.hitHeight
      })
    ) {
      return 'success';
    }

    for (const cloud of cloudRects) {
      if (CollisionSystem.circleRectOverlap(physics.x, physics.y, BABY_RADIUS * 0.85, cloud)) {
        return 'cloud';
      }
    }

    if (physics.y - BABY_RADIUS > height + 40 || physics.x < -120 || physics.x > width + 120) {
      return 'miss';
    }

    return null;
  }
}

// ---------------------------------------------------------------------------
// Renderer
// ---------------------------------------------------------------------------
class Renderer {
  constructor(canvas, images) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.images = images;
    this.trailParticles = [];
    this.confettiParticles = [];
    this.decorStars = [];
  }

  resize(width, height) {
    this.canvas.width = width;
    this.canvas.height = height;
    this.decorStars = Array.from({ length: 18 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height * 0.55,
      size: 4 + Math.random() * 10,
      alpha: 0.35 + Math.random() * 0.5
    }));
  }

  clear() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  drawBackground(width, height) {
    const sky = this.images.sky;
    if (sky) {
      this.ctx.drawImage(sky, 0, 0, width, height);
    } else {
      const gradient = this.ctx.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, '#7ec8ff');
      gradient.addColorStop(1, '#b8e4ff');
      this.ctx.fillStyle = gradient;
      this.ctx.fillRect(0, 0, width, height);
    }

    const starImg = this.images.star;
    this.decorStars.forEach((star) => {
      if (starImg) {
        this.ctx.globalAlpha = star.alpha;
        this.ctx.drawImage(starImg, star.x, star.y, star.size, star.size);
      }
    });
    this.ctx.globalAlpha = 1;
  }

  drawSlingshot(anchorX, anchorY, width, height) {
    const img = this.images.slingshot;
    if (img) {
      const maxW = 140;
      const maxH = 190;
      const scale = Math.min(maxW / img.naturalWidth, maxH / img.naturalHeight);
      const drawW = img.naturalWidth * scale;
      const drawH = img.naturalHeight * scale;
      const x = anchorX - drawW * 0.5;
      const y = anchorY - drawH * 0.15;
      this.ctx.drawImage(img, x, y, drawW, drawH);
    }
  }

  drawPillow(rect) {
    const img = this.images.pillow;
    if (img) {
      const scale = Math.min(rect.width / img.naturalWidth, rect.height / img.naturalHeight);
      const drawW = img.naturalWidth * scale;
      const drawH = img.naturalHeight * scale;
      const x = rect.centerX - drawW / 2;
      const y = rect.centerY - drawH / 2;
      this.ctx.drawImage(img, x, y, drawW, drawH);
    } else {
      this.ctx.fillStyle = '#ffe8f0';
      this.ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
    }
  }

  drawClouds(cloudRects) {
    const img = this.images.cloud;
    cloudRects.forEach((cloud) => {
      if (img) {
        this.ctx.drawImage(img, cloud.x, cloud.y, cloud.width, cloud.height);
      }
    });
  }

  drawMoon(moon) {
    if (!moon) {
      return;
    }

    const img = this.images.moon;
    const size = moon.size;
    if (img) {
      this.ctx.drawImage(img, moon.x - size / 2, moon.y - size / 2, size, size);
    } else {
      this.ctx.fillStyle = '#f5f0c8';
      this.ctx.beginPath();
      this.ctx.arc(moon.x, moon.y, size / 2, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }

  drawGeese(geese) {
    if (!geese || !geese.active) {
      return;
    }

    const img = this.images.geese;
    if (img) {
      const scale = Math.min(geese.width / img.naturalWidth, geese.height / img.naturalHeight);
      const drawW = img.naturalWidth * scale;
      const drawH = img.naturalHeight * scale;
      this.ctx.drawImage(img, geese.x - drawW / 2, geese.y - drawH / 2, drawW, drawH);
    } else {
      this.ctx.fillStyle = '#ffffff';
      this.ctx.fillRect(geese.x - geese.width / 2, geese.y - geese.height / 2, geese.width, geese.height);
    }
  }

  drawBand(anchorX, anchorY, babyX, babyY, isDragging) {
    if (!isDragging) {
      return;
    }

    const leftForkX = anchorX - 22;
    const rightForkX = anchorX + 22;
    const forkY = anchorY - 8;

    this.ctx.strokeStyle = '#4a3728';
    this.ctx.lineWidth = 5;
    this.ctx.lineCap = 'round';

    this.ctx.beginPath();
    this.ctx.moveTo(leftForkX, forkY);
    this.ctx.lineTo(babyX, babyY);
    this.ctx.stroke();

    this.ctx.beginPath();
    this.ctx.moveTo(rightForkX, forkY);
    this.ctx.lineTo(babyX, babyY);
    this.ctx.stroke();
  }

  drawTrajectory(points) {
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    points.forEach((point, index) => {
      const radius = Math.max(2, 5 - index * 0.2);
      this.ctx.beginPath();
      this.ctx.arc(point.x, point.y, radius, 0, Math.PI * 2);
      this.ctx.fill();
    });
  }

  drawBaby(physics, anchorX, anchorY) {
    const img = this.images.baby;
    let drawX = physics.x;
    let drawY = physics.y;
    let scale = 1;

    if (physics.state === GAME_STATE.DRAGGING) {
      drawX = physics.dragX;
      drawY = physics.dragY;
    } else if (physics.state === GAME_STATE.READY) {
      drawX = anchorX;
      drawY = anchorY;
    } else if (physics.state === GAME_STATE.SUCCESS) {
      scale = 1 + Math.sin(physics.bounceTime * 10) * 0.08;
      drawY += Math.sin(physics.bounceTime * 10) * 6;
    }

    const drawH = BABY_RADIUS * 2 * scale;
    if (img) {
      const drawW = drawH * (img.naturalWidth / img.naturalHeight);
      this.ctx.drawImage(img, drawX - drawW / 2, drawY - drawH / 2, drawW, drawH);
    } else {
      this.ctx.fillStyle = '#ffd6a5';
      this.ctx.beginPath();
      this.ctx.arc(drawX, drawY, BABY_RADIUS * scale, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }

  spawnTrail(x, y) {
    this.trailParticles.push({
      x,
      y,
      life: 0.45,
      maxLife: 0.45,
      size: 16 + Math.random() * 10
    });
  }

  updateTrail(deltaSeconds) {
    this.trailParticles = this.trailParticles.filter((particle) => {
      particle.life -= deltaSeconds;
      return particle.life > 0;
    });
  }

  drawTrail() {
    const img = this.images.launchTrail;
    this.trailParticles.forEach((particle) => {
      const alpha = particle.life / particle.maxLife;
      this.ctx.globalAlpha = alpha * 0.75;
      if (img) {
        this.ctx.drawImage(
          img,
          particle.x - particle.size / 2,
          particle.y - particle.size / 2,
          particle.size,
          particle.size
        );
      }
    });
    this.ctx.globalAlpha = 1;
  }

  burstConfetti(x, y) {
    const colors = ['#ff6b6b', '#4ecdc4', '#ffe066', '#a29bfe', '#ff9f43'];
    for (let index = 0; index < 48; index += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 120 + Math.random() * 220;
      this.confettiParticles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 80,
        life: 1.4 + Math.random() * 0.6,
        maxLife: 2,
        size: 6 + Math.random() * 8,
        color: colors[index % colors.length],
        rotation: Math.random() * Math.PI
      });
    }
  }

  updateConfetti(deltaSeconds) {
    this.confettiParticles = this.confettiParticles.filter((particle) => {
      particle.life -= deltaSeconds;
      particle.vy += GRAVITY * 0.35 * deltaSeconds;
      particle.x += particle.vx * deltaSeconds;
      particle.y += particle.vy * deltaSeconds;
      particle.rotation += deltaSeconds * 4;
      return particle.life > 0;
    });
  }

  drawConfetti() {
    const img = this.images.confetti;
    this.confettiParticles.forEach((particle) => {
      const alpha = Math.max(0, particle.life / particle.maxLife);
      this.ctx.save();
      this.ctx.globalAlpha = alpha;
      this.ctx.translate(particle.x, particle.y);
      this.ctx.rotate(particle.rotation);
      if (img) {
        this.ctx.drawImage(img, -particle.size / 2, -particle.size / 2, particle.size, particle.size);
      } else {
        this.ctx.fillStyle = particle.color;
        this.ctx.fillRect(-particle.size / 2, -particle.size / 2, particle.size, particle.size);
      }
      this.ctx.restore();
    });
    this.ctx.globalAlpha = 1;
  }

  clearEffects() {
    this.trailParticles = [];
    this.confettiParticles = [];
  }
}

const INTRO_MESSAGE = 'SAVE THE BABY YOU NEED TO SAVE THE BABY SAVE IT HAAAAAAAALP';
const INTRO_TYPE_SPEED_MS = 32;

// ---------------------------------------------------------------------------
// IntroController
// ---------------------------------------------------------------------------
class IntroController {
  constructor(elements, onComplete) {
    this.el = elements;
    this.onComplete = onComplete;
    this.isTyping = false;
    this.waitingForClick = false;

    this.el.overlay.addEventListener('click', () => this.advance());
    this.el.box.addEventListener('click', (event) => {
      event.stopPropagation();
      this.advance();
    });
  }

  hide() {
    this.el.overlay.classList.add('intro-overlay--hidden');
  }

  show() {
    this.el.overlay.classList.remove('intro-overlay--hidden');
  }

  start() {
    this.resetPanel();
    this.show();
    this.typeMessage(INTRO_MESSAGE, () => this.showContinuePrompt());
  }

  resetPanel() {
    this.el.typewriter.textContent = '';
    this.el.continue.classList.remove('intro-continue--visible');
    this.el.cursor.classList.remove('intro-cursor--hidden');
    this.waitingForClick = false;
  }

  showContinuePrompt() {
    this.waitingForClick = true;
    this.el.cursor.classList.add('intro-cursor--hidden');
    this.el.continue.classList.add('intro-continue--visible');
  }

  typeMessage(message, onComplete) {
    this.isTyping = true;
    let charIndex = 0;
    const text = window.GameAudio
      ? window.GameAudio.replacePlayerText(message)
      : message;

    const typeNextCharacter = () => {
      if (charIndex < text.length) {
        const char = text.charAt(charIndex);
        this.el.typewriter.textContent += char;
        if (window.GameAudio) {
          window.GameAudio.playTypeChar(char);
        }
        charIndex += 1;
        window.setTimeout(typeNextCharacter, INTRO_TYPE_SPEED_MS);
        return;
      }
      this.isTyping = false;
      onComplete();
    };

    typeNextCharacter();
  }

  advance() {
    if (this.isTyping || !this.waitingForClick) {
      return;
    }

    this.hide();
    this.onComplete();
  }
}

// ---------------------------------------------------------------------------
// UIController
// ---------------------------------------------------------------------------
class UIController {
  constructor(elements) {
    this.el = elements;
    this.preLaunchLines = ['Ready for takeoff.', 'All systems baby.'];
    this.inFlightLines = ['Wheeeee!', 'This seems unsafe.'];
    this.successSubLines = ['Professional baby delivery.'];
    this.failureLines = [
      'Baby delivered to wrong address.',
      'Baby has entered low Earth orbit.',
      'Baby adopted by local pigeons.',
      'Delivery attempt unsuccessful.',
      'Baby discovered a new country.'
    ];
    this.failureSubLines = ['Management has been notified.'];
  }

  showLoaded() {
    this.el.loadingScreen.classList.add('loading-screen--hidden');
    this.el.uiOverlay.classList.remove('ui-overlay--hidden');
  }

  setLevel(level, maxLevel) {
    this.el.levelIndicator.textContent = `Level ${level} / ${maxLevel}`;
  }

  setDragHud(visible, power, angle) {
    this.el.dragHud.hidden = !visible;
    this.el.dragHud.classList.toggle('is-visible', visible);
    if (visible) {
      this.el.powerReadout.textContent = `Power: ${power}`;
      this.el.angleReadout.textContent = `Angle: ${angle}°`;
    }
  }

  setCommentary(text) {
    this.el.commentary.textContent = text || '';
  }

  pickRandom(list) {
    return list[Math.floor(Math.random() * list.length)];
  }

  hideModal() {
    this.el.resultModal.hidden = true;
    this.el.resultModal.classList.remove('is-open');
    this.el.btnRetry.hidden = true;
    this.el.btnReplay.hidden = true;
    this.el.btnNext.hidden = true;
  }

  showSuccess(level, maxLevel, onReplay, onNext) {
    this.el.resultModal.hidden = false;
    this.el.resultModal.classList.add('is-open');
    this.el.resultTitle.textContent = 'Delivery Successful!';
    this.el.resultMessage.textContent = 'Baby safely launched.';
    this.el.resultSubmessage.textContent = this.pickRandom(this.successSubLines);
    this.el.btnRetry.hidden = true;
    this.el.btnReplay.hidden = false;
    this.el.btnNext.hidden = level >= maxLevel;

    this.el.btnReplay.onclick = onReplay;
    this.el.btnNext.onclick = onNext;
  }

  showFailure(onRetry) {
    this.el.resultModal.hidden = false;
    this.el.resultModal.classList.add('is-open');
    this.el.resultTitle.textContent = 'Delivery Failed!';
    this.el.resultMessage.textContent = this.pickRandom(this.failureLines);
    this.el.resultSubmessage.textContent = this.pickRandom(this.failureSubLines);
    this.el.btnRetry.hidden = false;
    this.el.btnReplay.hidden = true;
    this.el.btnNext.hidden = true;
    this.el.btnRetry.onclick = onRetry;
  }
}

// ---------------------------------------------------------------------------
// InputController
// ---------------------------------------------------------------------------
class InputController {
  constructor(canvas, game) {
    this.canvas = canvas;
    this.game = game;
    this.activePointerId = null;

    canvas.addEventListener('pointerdown', (event) => this.onPointerDown(event));
    canvas.addEventListener('pointermove', (event) => this.onPointerMove(event));
    canvas.addEventListener('pointerup', (event) => this.onPointerUp(event));
    canvas.addEventListener('pointercancel', (event) => this.onPointerUp(event));
  }

  getCanvasPoint(event) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * this.canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * this.canvas.height
    };
  }

  isNearBaby(x, y) {
    const babyX = this.game.physics.state === GAME_STATE.DRAGGING
      ? this.game.physics.dragX
      : this.game.anchorX;
    const babyY = this.game.physics.state === GAME_STATE.DRAGGING
      ? this.game.physics.dragY
      : this.game.anchorY;
    return Math.hypot(x - babyX, y - babyY) < BABY_RADIUS * 3;
  }

  onPointerDown(event) {
    if (
      !this.game.introComplete
      || this.game.physics.state !== GAME_STATE.READY
      || this.game.ui.el.resultModal.classList.contains('is-open')
      || !this.game.el.victoryOverlay.classList.contains('victory-overlay--hidden')
    ) {
      return;
    }

    const point = this.getCanvasPoint(event);
    if (!this.isNearBaby(point.x, point.y)) {
      return;
    }

    this.activePointerId = event.pointerId;
    this.canvas.classList.add('is-dragging');
    this.canvas.setPointerCapture(event.pointerId);
    this.game.physics.startDrag(point.x, point.y, this.game.anchorX, this.game.anchorY);
    this.game.ui.setDragHud(true, this.game.physics.power, this.game.physics.angleDeg);
  }

  onPointerMove(event) {
    if (this.activePointerId !== event.pointerId || this.game.physics.state !== GAME_STATE.DRAGGING) {
      return;
    }

    const point = this.getCanvasPoint(event);
    this.game.physics.updateDrag(point.x, point.y, this.game.anchorX, this.game.anchorY);
    this.game.ui.setDragHud(true, this.game.physics.power, this.game.physics.angleDeg);
  }

  onPointerUp(event) {
    if (this.activePointerId !== event.pointerId) {
      return;
    }

    this.activePointerId = null;
    this.canvas.classList.remove('is-dragging');
    this.game.ui.setDragHud(false, 0, 0);

    if (this.game.physics.state === GAME_STATE.DRAGGING) {
      this.game.physics.release(this.game.anchorX, this.game.anchorY);
      this.game.onBabyLaunched();
      this.game.ui.setCommentary(this.game.ui.pickRandom(this.game.ui.inFlightLines));
      this.game.inFlightCommentaryShown = true;
    }
  }
}

// ---------------------------------------------------------------------------
// Game
// ---------------------------------------------------------------------------
class Game {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.el = {
      loadingScreen: document.getElementById('loading-screen'),
      uiOverlay: document.getElementById('ui-overlay'),
      levelIndicator: document.getElementById('level-indicator'),
      dragHud: document.getElementById('drag-hud'),
      powerReadout: document.getElementById('power-readout'),
      angleReadout: document.getElementById('angle-readout'),
      commentary: document.getElementById('commentary'),
      resultModal: document.getElementById('result-modal'),
      resultTitle: document.getElementById('result-title'),
      resultMessage: document.getElementById('result-message'),
      resultSubmessage: document.getElementById('result-submessage'),
      btnRetry: document.getElementById('btn-retry'),
      btnReplay: document.getElementById('btn-replay'),
      btnNext: document.getElementById('btn-next'),
      victoryOverlay: document.getElementById('victory-overlay'),
      victorySticker: document.getElementById('victory-sticker'),
      mapReturn: document.getElementById('map-return')
    };

    this.levelManager = new LevelManager();
    this.physics = new PhysicsEngine();
    this.ui = new UIController(this.el);
    this.images = null;
    this.renderer = null;
    this.input = null;

    this.anchorX = 0;
    this.anchorY = 0;
    this.lastFrameTime = null;
    this.inFlightCommentaryShown = false;
    this.introComplete = true;
    this.victoryAudio = new Audio('audio/victory.mp3');
    this.geeseAudio = new Audio('audio/angry_geese.mp3');

    this.intro = new IntroController({
      overlay: document.getElementById('intro-overlay'),
      box: document.getElementById('intro-box'),
      typewriter: document.getElementById('intro-typewriter'),
      cursor: document.getElementById('intro-cursor'),
      continue: document.getElementById('intro-continue')
    }, () => {
      this.introComplete = true;
    });

    this.el.mapReturn.addEventListener('click', () => {
      localStorage.setItem('baby-challenge-complete', 'true');
      sessionStorage.setItem('baby-map-animate', 'true');
      window.location.href = 'Map.html';
    });

    window.addEventListener('resize', () => this.onResize());
  }

  async init() {
    try {
      this.images = await AssetLoader.loadAll();
      this.renderer = new Renderer(this.canvas, this.images);
      this.input = new InputController(this.canvas, this);
      this.onResize();

      const savedLevel = Number.parseInt(localStorage.getItem('baby-level-unlocked') || '1', 10);
      this.levelManager.setLevel(savedLevel);
      this.resetOverlays();

      if (this.levelManager.level === 1) {
        this.introComplete = false;
        this.intro.start();
      } else {
        this.introComplete = true;
        this.intro.hide();
      }

      this.startLevel();

      this.lastFrameTime = null;
      requestAnimationFrame((time) => this.loop(time));
    } catch (error) {
      console.error('Game init failed', error);
    } finally {
      this.ui.showLoaded();
    }
  }

  resetOverlays() {
    this.el.victoryOverlay.classList.add('victory-overlay--hidden');
    this.el.victoryOverlay.classList.remove('is-active');
    this.el.mapReturn.classList.remove('is-visible');
  }

  onResize() {
    if (!this.renderer) {
      return;
    }

    const width = window.innerWidth;
    const height = window.innerHeight;
    this.renderer.resize(width, height);
    this.anchorX = width * 0.15;
    this.anchorY = height * 0.62;
    if (this.physics.state === GAME_STATE.READY) {
      this.physics.reset(this.anchorX, this.anchorY);
    }
    if (this.levelManager.hasClouds() && this.levelManager.clouds.length > 0) {
      this.levelManager.resetClouds(width, height);
    }
    if (this.levelManager.hasMoon()) {
      this.levelManager.resetMoon(width, height);
    }
    if (this.levelManager.hasGeese()) {
      this.levelManager.resetGeese(width, height, this.anchorX, this.anchorY);
    }
  }

  onBabyLaunched() {
    if (!this.levelManager.hasGeese()) {
      return;
    }

    this.levelManager.activateGeese(
      this.physics.x,
      this.physics.y,
      this.physics.vx,
      this.physics.vy
    );
    this.geeseAudio.currentTime = 0;
    this.geeseAudio.play().catch(() => {});
  }

  startLevel() {
    this.resetOverlays();
    this.ui.hideModal();
    this.ui.setLevel(this.levelManager.level, this.levelManager.maxLevel);
    this.ui.setCommentary(this.ui.pickRandom(this.ui.preLaunchLines));
    this.renderer.clearEffects();
    this.physics.reset(this.anchorX, this.anchorY);
    this.inFlightCommentaryShown = false;
    this.levelManager.elapsed = 0;
    this.levelManager.setupLevelFeatures(this.canvas.width, this.canvas.height, this.anchorX, this.anchorY);
    this.geeseAudio.pause();
    this.geeseAudio.currentTime = 0;
  }

  handleCollision(result, pillowRect) {
    if (result === 'success') {
      this.physics.state = GAME_STATE.SUCCESS;
      this.physics.x = pillowRect.centerX;
      this.physics.y = pillowRect.centerY - 10;
      this.physics.vx = 0;
      this.physics.vy = 0;
      this.physics.bounceTime = 0;
      this.renderer.burstConfetti(pillowRect.centerX, pillowRect.centerY);
      this.geeseAudio.pause();

      if (this.levelManager.level >= this.levelManager.maxLevel) {
        localStorage.setItem('baby-level-unlocked', String(this.levelManager.maxLevel));
        window.setTimeout(() => this.startFinalVictory(), 1800);
        return;
      }

      this.ui.showSuccess(
        this.levelManager.level,
        this.levelManager.maxLevel,
        () => this.startLevel(),
        () => {
          const nextLevel = this.levelManager.level + 1;
          localStorage.setItem('baby-level-unlocked', String(nextLevel));
          this.levelManager.setLevel(nextLevel);
          this.startLevel();
        }
      );
      return;
    }

    if (result === 'cloud' || result === 'miss') {
      this.physics.state = GAME_STATE.FAILED;
      this.geeseAudio.pause();
      this.ui.showFailure(() => this.startLevel());
    }
  }

  async startFinalVictory() {
    this.ui.hideModal();
    this.el.victoryOverlay.classList.remove('victory-overlay--hidden');
    this.el.victoryOverlay.classList.add('is-active');

    const sticker = this.el.victorySticker;
    const startSize = Math.min(window.innerWidth, window.innerHeight) * 0.18;
    const endSize = Math.min(window.innerWidth, window.innerHeight) * 0.42;

    sticker.style.width = `${startSize}px`;
    sticker.style.transform = 'translate(0, 0)';

    this.victoryAudio.currentTime = 0;
    this.victoryAudio.play().catch(() => {});

    await new Promise((resolve) => window.setTimeout(resolve, 200));

    sticker.style.width = `${endSize}px`;

    await new Promise((resolve) => window.setTimeout(resolve, 2300));

    const stickerRect = sticker.getBoundingClientRect();
    this.el.mapReturn.style.top = `${stickerRect.bottom + 16}px`;
    this.el.mapReturn.style.left = `${stickerRect.left + stickerRect.width / 2}px`;
    this.el.mapReturn.style.transform = 'translateX(-50%)';
    this.el.mapReturn.classList.add('is-visible');
  }

  loop(now) {
    if (this.lastFrameTime === null) {
      this.lastFrameTime = now;
      requestAnimationFrame((time) => this.loop(time));
      return;
    }

    const deltaSeconds = Math.min((now - this.lastFrameTime) / 1000, 0.033);
    this.lastFrameTime = now;

    const width = this.canvas.width;
    const height = this.canvas.height;

    this.levelManager.update(deltaSeconds, width, height);
    this.levelManager.applyMoonPull(this.physics, deltaSeconds);
    this.physics.update(deltaSeconds);
    const babyFlying = this.physics.state === GAME_STATE.FLYING;
    const babyX = this.physics.state === GAME_STATE.DRAGGING
      ? this.physics.dragX
      : babyFlying
        ? this.physics.x
        : this.anchorX;
    const babyY = this.physics.state === GAME_STATE.DRAGGING
      ? this.physics.dragY
      : babyFlying
        ? this.physics.y
        : this.anchorY;
    const babyVx = babyFlying ? this.physics.vx : 0;
    const babyVy = babyFlying ? this.physics.vy : 0;

    this.levelManager.updateGeese(
      babyX,
      babyY,
      babyVx,
      babyVy,
      babyFlying
    );

    const pillowRect = this.levelManager.getPillowRect(width, height);
    const cloudRects = this.levelManager.getCloudRects();
    const geese = this.levelManager.getGeese();

    if (babyFlying) {
      this.renderer.spawnTrail(this.physics.x, this.physics.y);
      const collision = CollisionSystem.check(
        this.physics,
        pillowRect,
        cloudRects,
        width,
        height
      );
      if (collision) {
        this.handleCollision(collision, pillowRect);
      }
    }

    this.renderer.updateTrail(deltaSeconds);
    this.renderer.updateConfetti(deltaSeconds);

    this.renderer.clear();
    this.renderer.drawBackground(width, height);
    this.renderer.drawMoon(this.levelManager.getMoon());
    this.renderer.drawClouds(cloudRects);
    this.renderer.drawSlingshot(this.anchorX, this.anchorY, width, height);
    this.renderer.drawPillow(pillowRect);
    this.renderer.drawTrail();

    if (this.physics.state === GAME_STATE.DRAGGING) {
      const trajectory = this.physics.getTrajectoryPoints(this.anchorX, this.anchorY);
      this.renderer.drawTrajectory(trajectory);
      this.renderer.drawBand(this.anchorX, this.anchorY, this.physics.dragX, this.physics.dragY, true);
    }

    this.renderer.drawBaby(this.physics, this.anchorX, this.anchorY);
    this.renderer.drawGeese(geese);
    this.renderer.drawConfetti();

    requestAnimationFrame((time) => this.loop(time));
  }
}

window.addEventListener('DOMContentLoaded', () => {
  if (window.GameAudio) {
    window.GameAudio.initBgm('sky_bgm.mp3');
  }

  const game = new Game();
  game.init();
});
