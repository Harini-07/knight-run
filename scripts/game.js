// ========================================
// GAME CONFIGURATION & CONSTANTS
// ========================================

let canvas = document.getElementById('gameCanvas');
if (!canvas) {
    // Fallback: create a canvas if missing to avoid runtime errors
    canvas = document.createElement('canvas');
    canvas.id = 'gameCanvas';
    canvas.style.width = '800px';
    canvas.style.height = '400px';
    document.body && document.body.appendChild(canvas);
}
const ctx = canvas.getContext && canvas.getContext('2d');

canvas.width = 800;
canvas.height = 400;

// Global error handlers to aid debugging when the page is missing elements
function showErrorOverlay(msg) {
    try {
        let overlay = document.getElementById('gameErrorOverlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'gameErrorOverlay';
            overlay.style.position = 'fixed';
            overlay.style.left = '10px';
            overlay.style.right = '10px';
            overlay.style.top = '10px';
            overlay.style.padding = '12px';
            overlay.style.background = 'rgba(0,0,0,0.85)';
            overlay.style.color = 'white';
            overlay.style.zIndex = 99999;
            overlay.style.fontFamily = 'monospace';
            overlay.style.fontSize = '12px';
            overlay.style.borderRadius = '6px';
            overlay.style.maxHeight = '40vh';
            overlay.style.overflow = 'auto';
            document.body && document.body.appendChild(overlay);
        }
        overlay.textContent = 'Game error: ' + msg;
        console.error('Game error:', msg);
    } catch (e) {
        console.error('Failed to show error overlay', e);
    }
}

window.addEventListener('error', (ev) => {
    const message = ev && ev.message ? ev.message : String(ev);
    showErrorOverlay(message + ' — see console for stack');
});

window.addEventListener('unhandledrejection', (ev) => {
    const reason = ev && ev.reason ? (ev.reason.stack || ev.reason) : 'Unhandled rejection';
    showErrorOverlay(String(reason));
});

// Load knight sprite sheet
const knightSprite = new Image();
knightSprite.src = 'assets/sprites/knight_spritesheet.png';
let spriteLoaded = false;
knightSprite.onload = () => { 
    spriteLoaded = true; 
    // Redraw to show spritesheet knight instead of pixel fallback
    if (typeof draw === 'function') draw();
};

// Load heart sprite
const heartSprite = new Image();
heartSprite.src = 'assets/sprites/heart_sprite.png';
let heartSpriteLoaded = false;
let processedHeartSprite = null; // Cached processed heart with transparent background

heartSprite.onload = () => { 
    // Process heart sprite to remove white background
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = heartSprite.width;
    tempCanvas.height = heartSprite.height;
    const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
    tempCtx.drawImage(heartSprite, 0, 0);
    
    const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
        // Make white/near-white pixels transparent
        if (data[i] > 240 && data[i + 1] > 240 && data[i + 2] > 240) {
            data[i + 3] = 0;
        }
    }
    tempCtx.putImageData(imageData, 0, 0);
    processedHeartSprite = tempCanvas;
    heartSpriteLoaded = true;
};

// Load gem sprite (rare collectible)
const gemSprite = new Image();
gemSprite.src = 'assets/images/gem.png';
let gemSpriteLoaded = false;
let processedGemSprite = null; // Cached processed gem with transparent background

gemSprite.onload = () => {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = gemSprite.width;
    tempCanvas.height = gemSprite.height;
    const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
    tempCtx.drawImage(gemSprite, 0, 0);

    // Remove white / near-white background like other processed sprites
    const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
        if (data[i] > 240 && data[i + 1] > 240 && data[i + 2] > 240) {
            data[i + 3] = 0;
        }
    }
    tempCtx.putImageData(imageData, 0, 0);

    processedGemSprite = tempCanvas;
    gemSpriteLoaded = true;
    if (typeof draw === 'function') draw();
};

gemSprite.onerror = () => {
    console.warn('Failed to load gem sprite from:', gemSprite.src);
};

// Load princess sprite sheet
const princessSprite = new Image();
princessSprite.src = 'assets/sprites/KNIGHT/princess/princess_sprites.png';
let princessSpriteLoaded = false;
let princessFrameCache = new Map();

// Princess sprite frames from JSON:
// Frame A (index 0): Idle Balcony Pose - standing calmly, looking left
// Frame B (index 1): Commanding Gesture - raising hand, casting spell for heart rain
// Frame C (index 2): Empty Tower State - tower without princess (environment asset)
// Frame D (index 3): Running Frame A - right leg forward (landscape 1536x1024)
// Frame E (index 4): Running Frame B - left leg forward (landscape 1536x1024)
const PRINCESS_SPRITE_FRAMES = {
    0: { sx: 1, sy: 1, sw: 1024, sh: 1536 },    // Frame A: Idle Balcony
    1: { sx: 1027, sy: 1, sw: 1024, sh: 1536 }, // Frame B: Commanding Gesture
    2: { sx: 2053, sy: 1, sw: 1024, sh: 1536 }, // Frame C: Empty Tower
    3: { sx: 3079, sy: 1, sw: 1536, sh: 1024 }, // Frame D: Running A (landscape)
    4: { sx: 4617, sy: 1, sw: 1536, sh: 1024 }  // Frame E: Running B (landscape)
};

princessSprite.onload = () => {
    princessSpriteLoaded = true;
    // Pre-process frames to remove white background
    for (let i = 0; i <= 4; i++) {
        const rect = PRINCESS_SPRITE_FRAMES[i];
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = rect.sw;
        tempCanvas.height = rect.sh;
        const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
        tempCtx.drawImage(princessSprite, rect.sx, rect.sy, rect.sw, rect.sh, 0, 0, rect.sw, rect.sh);
        
        const imageData = tempCtx.getImageData(0, 0, rect.sw, rect.sh);
        const data = imageData.data;
        for (let j = 0; j < data.length; j += 4) {
            if (data[j] > 240 && data[j + 1] > 240 && data[j + 2] > 240) {
                data[j + 3] = 0;
            }
        }
        tempCtx.putImageData(imageData, 0, 0);
        princessFrameCache.set(i, tempCanvas);
    }
    if (typeof draw === 'function') draw();
};

princessSprite.onerror = () => {
    console.error('Failed to load princess sprite from:', princessSprite.src);
};

// Elements spritesheet (sunflower, teddy, obstacle)
const elementsSprite = new Image();
elementsSprite.src = 'assets/sprites/elements.png';
let elementsSpriteLoaded = false;
let elementsFrameCache = new Map();
let elementsFrameTrim = new Map();

// Elements sprite frames from JSON:
// Frame 0: Obstacles (spikes) - 1536x1024 at (1, 1)
// Frame 1: Sunflower - 1024x1536 at (1539, 1)
// Frame 2: Teddy Bear - 1536x1024 at (2565, 1)
const ELEMENTS_SPRITE_FRAMES = {
    0: { sx: 1, sy: 1, sw: 1536, sh: 1024 },    // Obstacles
    1: { sx: 1539, sy: 1, sw: 1024, sh: 1536 }, // Sunflower
    2: { sx: 2565, sy: 1, sw: 1536, sh: 1024 }  // Teddy Bear
};

elementsSprite.onload = () => {
    elementsSpriteLoaded = true;
    // Pre-process frames to remove white background
    for (let i = 0; i <= 2; i++) {
        const rect = ELEMENTS_SPRITE_FRAMES[i];
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = rect.sw;
        tempCanvas.height = rect.sh;
        const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
        tempCtx.drawImage(elementsSprite, rect.sx, rect.sy, rect.sw, rect.sh, 0, 0, rect.sw, rect.sh);
        
        const imageData = tempCtx.getImageData(0, 0, rect.sw, rect.sh);
        const data = imageData.data;
        for (let j = 0; j < data.length; j += 4) {
            if (data[j] > 240 && data[j + 1] > 240 && data[j + 2] > 240) {
                data[j + 3] = 0;
            }
        }
        tempCtx.putImageData(imageData, 0, 0);
        // Compute bottom transparent trim so we can align sprite bottoms to ground
        try {
            const trim = computeBottomTrim(tempCanvas);
            elementsFrameTrim.set(i, trim);
        } catch (e) {
            elementsFrameTrim.set(i, 0);
        }
        elementsFrameCache.set(i, tempCanvas);
    }
};

elementsSprite.onerror = () => {
    console.error('Failed to load elements sprite from:', elementsSprite.src);
};

// Eagle sprite (optional) - if provided, will be used for flying enemies
const eagleSprite = new Image();
eagleSprite.src = 'assets/sprites/eagle_spritesheet.png';
let eagleSpriteLoaded = false;
let processedEagleSprite = null;
eagleSprite.onload = () => {
    try {
        // Create processed canvas removing white background and caching
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = eagleSprite.width;
        tempCanvas.height = eagleSprite.height;
        const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
        tempCtx.drawImage(eagleSprite, 0, 0);
        try {
            const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
            const data = imageData.data;
            for (let i = 0; i < data.length; i += 4) {
                if (data[i] > 240 && data[i + 1] > 240 && data[i + 2] > 240) {
                    data[i + 3] = 0;
                }
            }
            tempCtx.putImageData(imageData, 0, 0);
            processedEagleSprite = tempCanvas;
        } catch (e) {
            // Some environments may restrict getImageData; fall back to raw sprite
            processedEagleSprite = eagleSprite;
        }
        eagleSpriteLoaded = true;
    } catch (err) {
        console.warn('Failed to process eagle sprite', err);
        eagleSpriteLoaded = true;
        processedEagleSprite = eagleSprite;
    }
};
eagleSprite.onerror = () => {
    console.warn('No eagle sprite found at', eagleSprite.src, '- using pixel fallback');
};

// Spike sprite (optional) - use a dedicated spikes spritesheet if provided
const spikeSprite = new Image();
spikeSprite.src = 'assets/sprites/spikes_spritesheet.png';
let spikeSpriteLoaded = false;
let processedSpikeSprite = null;
let processedSpikeTrim = 0;
spikeSprite.onload = () => {
    try {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = spikeSprite.width;
        tempCanvas.height = spikeSprite.height;
        const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
        tempCtx.drawImage(spikeSprite, 0, 0);
        try {
            const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
            const data = imageData.data;
            for (let i = 0; i < data.length; i += 4) {
                if (data[i] > 240 && data[i + 1] > 240 && data[i + 2] > 240) {
                    data[i + 3] = 0;
                }
            }
            tempCtx.putImageData(imageData, 0, 0);
            // compute bottom transparent trim for precise ground alignment
            try {
                processedSpikeTrim = computeBottomTrim(tempCanvas);
            } catch (e) {
                processedSpikeTrim = 0;
            }
            processedSpikeSprite = tempCanvas;
        } catch (e) {
            processedSpikeSprite = spikeSprite;
        }
        spikeSpriteLoaded = true;
    } catch (err) {
        console.warn('Failed to process spike sprite', err);
        spikeSpriteLoaded = true;
        processedSpikeSprite = spikeSprite;
    }
};
spikeSprite.onerror = () => {
    // Not fatal; elements frame will be used as fallback
    console.info('No spike spritesheet found at', spikeSprite.src);
};

// Sprite sheet layout - horizontal strip (16918×1026)
// All 11 frames (A-K) in a single row, each 1536×1024
const SPRITE_FRAME_WIDTH = 1536;
const SPRITE_FRAME_HEIGHT = 1024;
// Frames A-K in order (horizontal strip layout)
const KNIGHT_SPRITE_FRAMES = {
    1:  { sx: 1, sy: 1, sw: 1536, sh: 1024 },      // A: Grayscale run left
    2:  { sx: 1539, sy: 1, sw: 1536, sh: 1024 },   // B: Grayscale run right
    3:  { sx: 3077, sy: 1, sw: 1536, sh: 1024 },   // C: Color run left
    4:  { sx: 4615, sy: 1, sw: 1536, sh: 1024 },   // D: Color run right
    5:  { sx: 6153, sy: 1, sw: 1536, sh: 1024 },   // E: Victory stance
    6:  { sx: 7691, sy: 1, sw: 1536, sh: 1024 },   // F: Confused (waist-deep)
    7:  { sx: 9229, sy: 1, sw: 1536, sh: 1024 },   // G: Panic (sinking)
    8:  { sx: 10767, sy: 1, sw: 1536, sh: 1024 },  // H: Buried
    9:  { sx: 12305, sy: 1, sw: 1536, sh: 1024 },  // I: Triumphant leap
    10: { sx: 13843, sy: 1, sw: 1536, sh: 1024 },  // J: Arms wide open
    11: { sx: 15381, sy: 1, sw: 1536, sh: 1024 }   // K: Hugging princess
};
// Frame constants based on A-K ordering:
// A(1), B(2): Grayscale run cycle
// C(3), D(4): Color run cycle
const FRAME_GRAY_RUN_LEFT = 1;  // Frame A
const FRAME_GRAY_RUN_RIGHT = 2; // Frame B
const FRAME_COLOR_RUN_LEFT = 3; // Frame C
const FRAME_COLOR_RUN_RIGHT = 4;// Frame D
const knightFrameCache = new Map();
let knightAnimFrame = 0;
let animTimer = 0;

// Probability that a collectible requires direct collision (can't be run-through)
const COLLECTION_REQUIRE_CHANCE = {
    heart: 0.95,
    sunflower: 0.9,
    teddy: 0.35,
    gem: 1
};

// Visual tweak: vertical offset to apply to spike drawing so the visible spike bottom aligns with ground
const SPIKE_Y_OFFSET = 6;

// Utility: compute how many fully-transparent rows are at the bottom of a canvas
function computeBottomTrim(canvas) {
    if (!canvas || !canvas.getContext) return 0;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    if (w === 0 || h === 0) return 0;
    const imageData = ctx.getImageData(0, 0, w, h);
    const data = imageData.data;
    for (let y = h - 1; y >= 0; y--) {
        let rowHasPixel = false;
        const rowStart = y * w * 4;
        for (let x = 0; x < w; x++) {
            if (data[rowStart + x * 4 + 3] !== 0) { rowHasPixel = true; break; }
        }
        if (rowHasPixel) return h - 1 - y;
    }
    return h;
}

function getKnightSpriteFrame() {
    // Before game starts - show idle stance
    if (!gameRunning && !gameWon) {
        return 5; // Frame E: Idle/ready stance
    }
    
    if (gameWon) {
        // Phase 0: Setup - Knight standing triumphantly
        if (cinematicPhase === 0) return 5; // Frame E: Victory stance
        
        // Phase 1: Offering - Knight sends collectibles to princess
        if (cinematicPhase === 1) return 5; // Frame E: Victory stance
        
        // Phase 2: Heart apocalypse - Hearts rain down on knight
        // Drowning starts 3 seconds into this phase
        if (cinematicPhase === 2) {
            if (knightDrownLevel >= 1) return 6; // Frame F: Waist-deep, confused
            return 5; // Frame E: Still standing
        }
        
        // Phase 3: Drowning sequence - F → G → H
        if (cinematicPhase === 3) {
            if (knightDrownLevel === 1) return 6;  // Frame F: Waist-deep, confused
            if (knightDrownLevel === 2) return 7;  // Frame G: Sinking deeper, panicked
            return 8; // Frame H: Buried (only hair/glasses/plume visible)
        }
        
        // Phase 4: Comeback - Knight bursts out of hearts
        if (cinematicPhase === 4) return 9; // Frame I: Triumphant leap
        
        // Phase 5: Princess runs to knight
        if (cinematicPhase === 5) {
            if (princessRunProgress >= 1) return 11; // Frame K: Hugging princess
            return 10; // Frame J: Arms wide open
        }
        
        // Phase 6: Resolution
        if (cinematicPhase >= 6) return 11; // Frame K: Hugging princess
    }

    // Normal gameplay - running animation
    if (colorRevealed) {
        return knightAnimFrame === 0 ? FRAME_COLOR_RUN_LEFT : FRAME_COLOR_RUN_RIGHT; // Frames C-D: Color run
    }
    return knightAnimFrame === 0 ? FRAME_GRAY_RUN_LEFT : FRAME_GRAY_RUN_RIGHT; // Frames A-B: Grayscale run
}

function getSpriteSourceRect(frameIndex) {
    return KNIGHT_SPRITE_FRAMES[frameIndex];
}

function getProcessedKnightFrame(frameIndex) {
    if (knightFrameCache.has(frameIndex)) return knightFrameCache.get(frameIndex);
    const rect = getSpriteSourceRect(frameIndex);
    if (!rect) return null;

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = rect.sw;
    tempCanvas.height = rect.sh;
    const tempCtx = tempCanvas.getContext('2d', { willReadFrequently: true });
    tempCtx.drawImage(knightSprite, rect.sx, rect.sy, rect.sw, rect.sh, 0, 0, rect.sw, rect.sh);

    const imageData = tempCtx.getImageData(0, 0, rect.sw, rect.sh);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
        if (data[i] > 240 && data[i + 1] > 240 && data[i + 2] > 240) {
            data[i + 3] = 0;
        }
    }
    tempCtx.putImageData(imageData, 0, 0);

    knightFrameCache.set(frameIndex, tempCanvas);
    return tempCanvas;
}

// Game state
let gameRunning = false;
let gameWon = false;
let colorRevealed = false;
let colorTransitionProgress = 0;

// Cinematic ending state
let cinematicPhase = 0; // 0=setup, 1=offering, 2=heart apocalypse, 3=drowning, 4=comeback, 5=reversal, 6=resolution
let cinematicTimer = 0;
let floatingItems = []; // Items floating to princess
let heartRain = []; // Hearts falling from sky
let heartPile = []; // Hearts piled on ground
let knightDrownLevel = 0; // 0=standing, 1=chest, 2=neck, 3=helmet, 4=gone, 5=burst out
let princessSurprised = false;
let comebackHappened = false;
let princessRunProgress = 0; // 0=at castle, 1=at knight
let embraceStartTime = null; // phase-5 timer value when embrace begins

// Dialogue typing effect state
let lastDialogueKey = '';
let dialogueFullyTyped = false;

// Physics
const GRAVITY = 0.6;
const JUMP_VELOCITY = -12; // Balanced jump height
const SLIDE_DURATION = 600; // ms

// Game progression
const TARGET_DISTANCE = 700; // meters to win
const PRINCESS_APPEAR_DISTANCE = 650; // princess/castle appears late

let gameSpeed = 40; // Much faster speed
let distance = 0;
let frameCount = 0;

// Collectibles
let heartsCollected = 0;
let sunflowersCollected = 0;
let teddiesCollected = 0;
let gemSpawnedThisRun = false;

function refreshCollectibleUI() {
    const heartsEl = document.getElementById('hearts');
    if (heartsEl) heartsEl.textContent = `❤️ ${heartsCollected}`;

    const sunEl = document.getElementById('sunflowers');
    if (sunEl) sunEl.textContent = `🌻 ${sunflowersCollected}`;

    const teddiesEl = document.getElementById('teddies');
    if (teddiesEl) teddiesEl.textContent = `🧸 ${teddiesCollected}`;

    const scoreEl = document.getElementById('score');
    if (scoreEl) scoreEl.textContent = heartsCollected;
}

// ========================================
// WORLD SECTIONS (Time-based progression)
// ========================================

function getCurrentSection() {
    if (distance < 200) return 'meadow';
    if (distance < 600) return 'forest';
    if (distance < PRINCESS_APPEAR_DISTANCE) return 'castle_road';
    return 'castle_gate';
}

// ========================================
// KNIGHT (Player)
// ========================================
const knight = {
    x: 100,
    y: 0,
    width: 40,
    height: 60,
    velocityY: 0,

    // States
    state: 'running', // running, jumping, sliding, hurt, victory
    jumping: false,
    sliding: false,
    downPressed: false,
    slideStartTime: 0,
    slideCooldown: 0,

    hasShield: false,
    shieldExpiresAtDistance: 0,
    hurtTime: 0,

    groundY: canvas.height - 60 - 60,

    draw() {
        ctx.save();
        ctx.imageSmoothingEnabled = false;

        let drawY = this.y;
        if (this.state === 'sliding') drawY += 30;
        if (this.hurtTime > 0) ctx.globalAlpha = 0.6;

        // Shield aura
        if (this.hasShield) {
            const cx = this.x + 22;
            const cy = drawY + 30;
            const pulse = 0.5 + (Math.sin(frameCount * 0.2) + 1) * 0.5;
            const baseAlpha = colorRevealed ? 0.34 : 0.28;

            // Outer soft glow
            ctx.fillStyle = colorRevealed
                ? `rgba(255,215,0,${(baseAlpha * 0.55 + pulse * 0.12).toFixed(3)})`
                : `rgba(215,215,215,${(baseAlpha * 0.45 + pulse * 0.10).toFixed(3)})`;
            ctx.beginPath();
            ctx.arc(cx, cy, 48 + pulse * 3, 0, Math.PI * 2);
            ctx.fill();

            // Inner glow
            ctx.fillStyle = colorRevealed
                ? `rgba(255,240,140,${(baseAlpha + pulse * 0.16).toFixed(3)})`
                : `rgba(235,235,235,${(baseAlpha * 0.8 + pulse * 0.12).toFixed(3)})`;
            ctx.beginPath();
            ctx.arc(cx, cy, 36 + pulse * 2, 0, Math.PI * 2);
            ctx.fill();

            // Crisp ring to make shield state obvious
            ctx.strokeStyle = colorRevealed
                ? `rgba(255,245,180,${(0.65 + pulse * 0.2).toFixed(3)})`
                : `rgba(245,245,245,${(0.55 + pulse * 0.18).toFixed(3)})`;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(cx, cy, 30 + pulse, 0, Math.PI * 2);
            ctx.stroke();

            // Small sparkle pips orbiting the ring
            for (let i = 0; i < 4; i++) {
                const ang = frameCount * 0.08 + i * (Math.PI / 2);
                const sx = cx + Math.cos(ang) * (34 + pulse * 2);
                const sy = cy + Math.sin(ang) * (34 + pulse * 2);
                ctx.fillStyle = colorRevealed
                    ? 'rgba(255,255,210,0.9)'
                    : 'rgba(245,245,245,0.85)';
                ctx.fillRect(Math.floor(sx - 1), Math.floor(sy - 1), 3, 3);
            }
        }

        // Try to use spritesheet, fallback to pixel art
        if (spriteLoaded) {
            const frameIndex = getKnightSpriteFrame();
            const rect = getSpriteSourceRect(frameIndex);
            const processedFrame = getProcessedKnightFrame(frameIndex);

            if (rect && processedFrame) {
                // Before game starts: bigger and black & white
                const isPreGame = !gameRunning && !gameWon;
                const targetHeight = isPreGame ? 120 : 80;
                const targetWidth = Math.round(targetHeight * (rect.sw / rect.sh));
                
                // Apply grayscale filter before game starts
                if (isPreGame) {
                    ctx.filter = 'grayscale(100%)';
                }
                
                // Use ground position for pre-game, otherwise use current drawY
                const knightDrawY = isPreGame ? (this.groundY - 60) : (drawY - 10);
                
                ctx.drawImage(
                    processedFrame,
                    0, 0, rect.sw, rect.sh,
                    this.x - 20, knightDrawY, targetWidth, targetHeight
                );
                
                // Reset filter
                if (isPreGame) {
                    ctx.filter = 'none';
                }
            }
        } else {
            // Fallback to pixel art
            const px = (x, y, w, h) => ctx.fillRect(Math.floor(x), Math.floor(y), w, h);
            const skin = colorRevealed ? '#ffdbac' : '#aaa';
            const hair = colorRevealed ? '#5a3825' : '#444';
            const armor = colorRevealed ? '#708090' : '#777';
            const armorLight = colorRevealed ? '#a8b8c8' : '#999';
            const cape = colorRevealed ? '#dc143c' : '#666';
            const sword = colorRevealed ? '#dcdcdc' : '#999';

            if (this.state === 'sliding') {
                ctx.fillStyle = cape;
                px(this.x - 5, drawY + 6, 20, 14);
                ctx.fillStyle = armor;
                px(this.x + 6, drawY + 8, 26, 12);
                ctx.fillStyle = armorLight;
                px(this.x + 10, drawY + 10, 8, 6);
                ctx.fillStyle = skin;
                px(this.x + 32, drawY + 4, 18, 18);
                ctx.fillStyle = hair;
                px(this.x + 30, drawY - 2, 22, 10);
                ctx.fillStyle = '#000';
                px(this.x + 38, drawY + 10, 2, 2);
                px(this.x + 44, drawY + 10, 2, 2);
                ctx.fillStyle = sword;
                px(this.x + 50, drawY + 14, 14, 3);
            } else {
                const step = Math.sin(frameCount * 0.18) * 2;
                ctx.fillStyle = cape;
                px(this.x, drawY + 10, 12, 45);
                px(this.x - 4, drawY + 30, 8, 28);
                ctx.fillStyle = armor;
                px(this.x + 16, drawY + 44 + step, 8, 14);
                px(this.x + 28, drawY + 44 - step, 8, 14);
                ctx.fillStyle = '#3a2a1a';
                px(this.x + 14, drawY + 56 + step, 12, 4);
                px(this.x + 26, drawY + 56 - step, 12, 4);
                ctx.fillStyle = armor;
                px(this.x + 12, drawY + 18, 24, 28);
                ctx.fillStyle = armorLight;
                px(this.x + 16, drawY + 22, 8, 20);
                ctx.fillStyle = armor;
                px(this.x + 6, drawY + 20 - step, 8, 18);
                px(this.x + 36, drawY + 20 + step, 8, 18);
                ctx.fillStyle = skin;
                px(this.x + 7, drawY + 36 - step, 6, 6);
                px(this.x + 37, drawY + 36 + step, 6, 6);
                ctx.fillStyle = sword;
                px(this.x + 42, drawY + 22 + step, 3, 10);
                px(this.x + 44, drawY + 18 + step, 3, 10);
                px(this.x + 46, drawY + 14 + step, 3, 10);
                px(this.x + 48, drawY + 10 + step, 3, 6);
                ctx.fillStyle = '#ffd700';
                px(this.x + 38, drawY + 36 + step, 8, 3);
                ctx.fillStyle = skin;
                px(this.x + 18, drawY - 2, 20, 20);
                ctx.fillStyle = hair;
                px(this.x + 14, drawY - 10, 28, 12);
                px(this.x + 10, drawY - 4, 8, 12);
                px(this.x + 34, drawY - 4, 8, 12);
                ctx.fillStyle = '#000';
                px(this.x + 22, drawY + 4, 2, 2);
                px(this.x + 30, drawY + 4, 2, 2);
                px(this.x + 21, drawY + 2, 4, 2);
                px(this.x + 29, drawY + 2, 4, 2);
                ctx.fillStyle = '#c44';
                px(this.x + 25, drawY + 12, 4, 2);
            }
        }

        ctx.restore();
    },

    update(deltaTime) {
        if (this.hurtTime > 0) this.hurtTime -= deltaTime;
        if (this.slideCooldown > 0) this.slideCooldown -= deltaTime;

        if (this.state === 'sliding' && !this.downPressed) {
            this.state = 'running';
            this.sliding = false;
        }

        this.velocityY += GRAVITY;
        this.y += this.velocityY;

        if (this.y >= this.groundY) {
            this.y = this.groundY;
            this.velocityY = 0;
            this.jumping = false;
            if (this.state === 'jumping') this.state = 'running';
        }

        if (this.y < this.groundY && this.state !== 'sliding') {
            this.state = 'jumping';
        }
    },

    jump() {
        if (!this.jumping && this.state !== 'sliding') {
            this.velocityY = JUMP_VELOCITY;
            this.jumping = true;
            this.state = 'jumping';
        }
    },

    slide() {
        if (!this.sliding && this.slideCooldown <= 0 && !this.jumping) {
            this.state = 'sliding';
            this.sliding = true;
            this.slideStartTime = Date.now();
        }
    },

    getHitbox() {
        if (this.state === 'sliding') {
            return { x: this.x + 6, y: this.y + 40, width: 28, height: 20 };
        }
        return { x: this.x + 10, y: this.y + 10, width: 20, height: 25 };
    },

    takeDamage() {
        if (this.hasShield) {
            // Sunflower power: stay invulnerable until distance-based expiry.
            this.hurtTime = 150;
            return false;
        }
        if (this.hurtTime > 0) return false;
        return true;
    },

    reset() {
        this.y = this.groundY;
        this.velocityY = 0;
        this.state = 'running';
        this.jumping = false;
        this.sliding = false;
        this.downPressed = false;
        this.hasShield = false;
        this.shieldExpiresAtDistance = 0;
        this.hurtTime = 0;
        this.slideCooldown = 0;
    }
};


// ========================================
// OBSTACLES
// ========================================

class Obstacle {
    constructor(x, type) {
        this.x = x;
        this.type = type; // 'spikes', 'fire', 'eagle', 'bat', 'chain'
        this.passed = false;
        
        switch(type) {
            case 'spikes':
                this.width = 60;
                this.height = 40;
                this.y = canvas.height - 40 - this.height; // On ground line
                break;
            case 'fire':
                this.width = 45;
                this.height = 35;
                this.y = canvas.height - 60 - this.height; // On ground line
                this.animFrame = 0;
                break;
            // (arrow removed) flying enemies use 'eagle' now


            case 'bat':
                this.width = 40;
                this.height = 25;
                this.y = canvas.height - 60 - 45; // Head height - slide under
                this.wobble = 0;
                break;

            case 'eagle':
                this.width = 120;
                this.height = 80;

                this.y = 0; 

                this.swoopOffset = 0;
                break;


            }
        }
    
    draw() {
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        
        // Helper for pixel rectangles
        const px = (x, y, w, h) => ctx.fillRect(Math.floor(x), Math.floor(y), w, h);
        
        switch(this.type) {
            case 'spikes':
                // Use first frame of elements spritesheet as ground obstacle
                {
                    const groundY = canvas.height - 60;
                    const targetWidth = 60;
                    const targetHeight = 40;
                    const drawY = groundY - targetHeight + SPIKE_Y_OFFSET;
                    // Keep internal y in sync with drawn position so hitbox matches
                    this.y = drawY;

                    if (spikeSpriteLoaded && processedSpikeSprite) {
                        // Use dedicated spike spritesheet (processed to transparent background)
                        const src = processedSpikeSprite;
                        ctx.save();
                        ctx.imageSmoothingEnabled = true;
                        ctx.filter = 'grayscale(100%)';
                        try {
                            if (src instanceof HTMLCanvasElement) {
                                const trim = processedSpikeTrim || 0;
                                const srcH = Math.max(1, src.height - trim);
                                ctx.drawImage(src, 0, 0, src.width, srcH, this.x, drawY, targetWidth, targetHeight);
                            } else {
                                const sw = src.width || targetWidth;
                                const sh = src.height || targetHeight;
                                const srcH = Math.max(1, sh - (processedSpikeTrim || 0));
                                ctx.drawImage(src, 0, 0, sw, srcH, this.x, drawY, targetWidth, targetHeight);
                            }
                        } catch (e) {
                            // fallback to simple draw if slicing fails
                            ctx.drawImage(src, this.x, drawY, targetWidth, targetHeight);
                        }
                        ctx.filter = 'none';
                        ctx.restore();
                    } else if (elementsSpriteLoaded && elementsFrameCache.has(0)) {
                        const frame = elementsFrameCache.get(0);
                        const trim = elementsFrameTrim.get(0) || 0;
                        ctx.save();
                        ctx.imageSmoothingEnabled = true;
                        ctx.filter = 'grayscale(100%)';
                        // frame is a cached canvas — draw it directly and scale to target
                        try {
                            const srcH = Math.max(1, frame.height - trim);
                            ctx.drawImage(frame, 0, 0, frame.width, srcH, this.x, drawY, targetWidth, targetHeight);
                        } catch (e) {
                            // fallback to explicit source rect if needed
                            ctx.drawImage(frame, 0, 0, frame.width || 1536, Math.max(1, (frame.height || 1024) - trim), this.x, drawY, targetWidth, targetHeight);
                        }
                        ctx.filter = 'none';
                        ctx.restore();
                    } else {
                        // Fallback: PIXEL ART METAL SPIKES, positioned relative to ground
                        const spikeBase = colorRevealed ? '#4a4a4a' : '#333';
                        const spikeTip = colorRevealed ? '#888' : '#555';
                        const spikeShine = colorRevealed ? '#aaa' : '#666';
                        for (let i = 0; i < 3; i++) {
                            const sx = this.x + i * 14;
                            ctx.fillStyle = spikeBase;
                            px(sx + 2, drawY + 22, 10, 8);
                            ctx.fillStyle = spikeTip;
                            px(sx + 4, drawY + 14, 6, 10);
                            px(sx + 5, drawY + 8, 4, 8);
                            ctx.fillStyle = spikeShine;
                            px(sx + 4, drawY + 14, 2, 6);
                            px(sx + 5, drawY + 8, 1, 4);
                        }
                    }
                }
                break;
                
            case 'fire':
                // PIXEL ART FIRE PIT
                const pitColor = colorRevealed ? '#5a3a2a' : '#333';
                const fireOrange = colorRevealed ? '#ff6a00' : '#666';
                const fireYellow = colorRevealed ? '#ffcc00' : '#888';
                const fireRed = colorRevealed ? '#ff2200' : '#444';
                
                const flicker = Math.floor(frameCount / 5) % 3;
                
                // Stone pit base
                ctx.fillStyle = pitColor;
                px(this.x, this.y + 27, this.width, 8);
                px(this.x + 2, this.y + 25, this.width - 4, 4);
                
                // Flames - animated
                // Left flame
                ctx.fillStyle = fireRed;
                px(this.x + 6, this.y + 12 + flicker, 8, 15 - flicker);
                ctx.fillStyle = fireOrange;
                px(this.x + 8, this.y + 8 + flicker, 4, 12 - flicker);
                ctx.fillStyle = fireYellow;
                px(this.x + 9, this.y + 10 + flicker, 2, 6);
                
                // Center flame (tallest)
                ctx.fillStyle = fireRed;
                px(this.x + 16, this.y + 6 - flicker, 12, 21 + flicker);
                ctx.fillStyle = fireOrange;
                px(this.x + 18, this.y + 2 - flicker, 8, 18 + flicker);
                ctx.fillStyle = fireYellow;
                px(this.x + 20, this.y + 4 - flicker, 4, 12);
                
                // Right flame
                ctx.fillStyle = fireRed;
                px(this.x + 30, this.y + 14 - flicker, 8, 13 + flicker);
                ctx.fillStyle = fireOrange;
                px(this.x + 32, this.y + 10 - flicker, 4, 10 + flicker);
                ctx.fillStyle = fireYellow;
                px(this.x + 33, this.y + 12 - flicker, 2, 5);
                
                // Embers
                if (flicker === 0) {
                    ctx.fillStyle = fireYellow;
                    px(this.x + 10, this.y + 2, 2, 2);
                    px(this.x + 28, this.y + 6, 2, 2);
                }
                break;
                
            // 'arrow' removed — flying enemies now drawn as 'eagle' (handled in 'eagle' case)
                
            case 'bat':
                // PIXEL ART BAT
                const batBody = colorRevealed ? '#3a2050' : '#222';
                const batWing = colorRevealed ? '#5a3070' : '#333';
                const batEye = colorRevealed ? '#ff0000' : '#666';
                
                const batY = this.y + Math.sin(this.wobble) * 4;
                const wingUp = Math.sin(this.wobble * 3) > 0;
                const wingOffset = wingUp ? -4 : 4;
                
                // Wings
                ctx.fillStyle = batWing;
                // Left wing
                px(this.x, batY + 8 + wingOffset, 12, 8);
                px(this.x + 2, batY + 6 + wingOffset, 8, 4);
                px(this.x + 4, batY + 14 + wingOffset, 6, 4);
                // Right wing
                px(this.x + 28, batY + 8 + wingOffset, 12, 8);
                px(this.x + 30, batY + 6 + wingOffset, 8, 4);
                px(this.x + 30, batY + 14 + wingOffset, 6, 4);
                
                // Body
                ctx.fillStyle = batBody;
                px(this.x + 14, batY + 6, 12, 14);
                
                // Head
                px(this.x + 16, batY + 2, 8, 6);
                
                // Ears
                px(this.x + 14, batY - 2, 4, 4);
                px(this.x + 22, batY - 2, 4, 4);
                
                // Eyes
                ctx.fillStyle = batEye;
                px(this.x + 17, batY + 4, 2, 2);
                px(this.x + 21, batY + 4, 2, 2);
                
                // Fangs
                ctx.fillStyle = '#fff';
                px(this.x + 18, batY + 8, 1, 2);
                px(this.x + 21, batY + 8, 1, 2);
                
                this.wobble += 0.12;
                break;
                
            case 'eagle':
                if (processedEagleSprite) {
                    ctx.save();

                    if (!colorRevealed) {
                        ctx.filter = 'grayscale(100%)';
                    }

                    ctx.drawImage(
                        processedEagleSprite,
                        0, 0,
                        processedEagleSprite.width,
                        processedEagleSprite.height,
                        this.x,
                        this.y,
                        this.width,
                        this.height
                    );

                    ctx.filter = 'none';
                    ctx.restore();
                } else {
                    ctx.fillStyle = 'red';
                    ctx.fillRect(this.x, this.y, this.width, this.height);
                }
                break;

        }
        
        ctx.restore();
    }
    
    getColoredColor() {
        switch(this.type) {
            case 'spikes': return '#696969'; // Metallic gray
            case 'fire': return '#ff6347'; // Warm orange/red
            case 'bat': return '#483d8b'; // Deep purple
            case 'eagle': return '#8b4513'; // Brown eagle
            default: return '#000';
        }
    }
    
    update() {
        this.x -= gameSpeed;
        
        // Update eagle swooping position
            if (this.type === 'eagle') {
                const amplitude = 3;

                // Recalculate base every frame
                const groundLine = canvas.height - 60; // actual ground line
                const base = groundLine - this.height - 30; 
                
                this.y = base + Math.sin(this.swoopOffset) * amplitude;
                this.swoopOffset += 0.03;
            }
        }

    getHitbox() {
        if (this.type === 'spikes') {
            return {
                x: this.x + 10,
                y: this.y + 5,
                width: this.width - 20,
                height: 35
            };
        }
        // arrows removed; flying enemy 'eagle' handled below
        if (this.type === 'bat') {
            return {
                x: this.x + 8,
                y: this.y + Math.sin(this.wobble) * 4 + 4,
                width: this.width - 16,
                height: this.height - 8
            };
        }
        
        if (this.type === 'eagle') {
            return {
                // Wider + lower body hitbox so running under eagle is dangerous,
                // while sliding can still pass beneath most swoops.
                x: this.x + 8,
                y: this.y + 18,
                width: this.width - 16,
                height: this.height - 22

            };
        }

        return {
            x: this.x + 5,
            y: this.y + 5,
            width: this.width - 10,
            height: this.height - 10
        };
    };

}

// ========================================
// COLLECTIBLES
// ========================================

class Collectible {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.width = 25;
        this.height = 25;
        this.collected = false;
        this.floatOffset = Math.random() * Math.PI * 2;
        // Randomize whether this collectible requires a direct collision to collect
        const chance = (COLLECTION_REQUIRE_CHANCE && COLLECTION_REQUIRE_CHANCE[this.type]) ? COLLECTION_REQUIRE_CHANCE[this.type] : 0.5;
        this.mustCollide = Math.random() < chance;
        // If this collectible spawns noticeably above the knight's head, require an explicit jump collision
        try {
            const ground = (typeof knight !== 'undefined' && knight.groundY) ? knight.groundY : (canvas.height - 120);
            if (this.y < ground - 60) {
                this.mustCollide = true;
            }
        } catch (e) {
            // ignore
        }
    }
    
    draw() {
        if (this.collected) return;
        
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        
        const floatY = this.y + Math.sin(Date.now() * 0.004 + this.floatOffset) * 4;
        const sparkle = Math.floor(Date.now() / 200) % 3;
        
        // Helper for pixel rectangles
        const px = (x, y, w, h) => ctx.fillRect(Math.floor(x), Math.floor(y), w, h);
        
        switch(this.type) {
            case 'heart':
                // Use heart sprite
                if (heartSpriteLoaded) {
                    const heartSize = 70; // Larger hearts
                    const aspectRatio = 1538 / 1026;
                    const drawWidth = heartSize * aspectRatio;
                    const drawHeight = heartSize;
                    // Apply grayscale filter if color not revealed
                    if (!colorRevealed) {
                        ctx.filter = 'grayscale(100%)';
                    }
                    ctx.drawImage(processedHeartSprite, 0, 0, processedHeartSprite.width, processedHeartSprite.height, this.x, floatY, drawWidth, drawHeight);
                    ctx.filter = 'none';
                    
                    // Sparkle effect
                    if (sparkle === 0) {
                        ctx.fillStyle = '#fff';
                        px(this.x + 5, floatY + 2, 3, 3);
                    }
                } else {
                    // Fallback to pixel art heart
                    const heartMain = colorRevealed ? '#ff2255' : '#666';
                    const heartLight = colorRevealed ? '#ff6688' : '#888';
                    
                    ctx.fillStyle = heartMain;
                    px(this.x + 2, floatY + 4, 8, 6);
                    px(this.x + 14, floatY + 4, 8, 6);
                    px(this.x, floatY + 8, 24, 8);
                    px(this.x + 2, floatY + 14, 20, 4);
                    px(this.x + 4, floatY + 18, 16, 4);
                    px(this.x + 6, floatY + 22, 12, 3);
                    px(this.x + 9, floatY + 25, 6, 2);
                    
                    ctx.fillStyle = heartLight;
                    px(this.x + 4, floatY + 5, 4, 3);
                    px(this.x + 3, floatY + 8, 3, 4);
                    
                    if (sparkle === 0) {
                        ctx.fillStyle = '#fff';
                        px(this.x + 5, floatY + 2, 2, 2);
                    }
                }
                break;
                
            case 'sunflower':
                // Sunflower from spritesheet (black and white, larger)
                if (elementsSpriteLoaded) {
                    const frame = elementsFrameCache.get(1);
                    if (frame) {
                        const targetHeight = 60;
                        const targetWidth = Math.round(targetHeight * (1024 / 1536));
                        ctx.save();
                        ctx.filter = 'grayscale(100%)';
                        ctx.drawImage(frame, 0, 0, 1024, 1536, this.x, floatY, targetWidth, targetHeight);
                        ctx.restore();
                    }
                } else {
                    // Fallback pixel sunflower (black and white, larger)
                    ctx.fillStyle = '#bbb';
                    px(this.x + 10, floatY, 20, 14);
                    px(this.x + 10, floatY + 34, 20, 14);
                    px(this.x, floatY + 10, 14, 20);
                    px(this.x + 26, floatY + 10, 14, 20);
                    ctx.fillStyle = '#888';
                    px(this.x + 10, floatY + 10, 20, 20);
                }
                if (sparkle === 1) {
                    ctx.fillStyle = '#fff';
                    px(this.x + 34, floatY + 8, 3, 3);
                }
                break;
            case 'gem': {
                if (gemSpriteLoaded && processedGemSprite) {
                    // Render similarly to heart sprite: scaled and optionally grayscale pre-reveal
                    const gemHeight = 44;
                    const aspectRatio = processedGemSprite.width / processedGemSprite.height;
                    const drawWidth = gemHeight * aspectRatio;
                    const drawHeight = gemHeight;

                    if (!colorRevealed) {
                        ctx.filter = 'grayscale(100%)';
                    }
                    ctx.drawImage(
                        processedGemSprite,
                        0, 0, processedGemSprite.width, processedGemSprite.height,
                        this.x - 2, floatY + 2, drawWidth, drawHeight
                    );
                    ctx.filter = 'none';
                } else {
                    // Fallback pixel gem
                    const gemMain = colorRevealed ? '#40c9ff' : '#9f9f9f';
                    const gemMid = colorRevealed ? '#2a93c7' : '#7f7f7f';
                    const gemLight = colorRevealed ? '#e6f8ff' : '#d7d7d7';
                    const gemCore = colorRevealed ? '#8be9ff' : '#bdbdbd';

                    ctx.fillStyle = colorRevealed ? 'rgba(95,220,255,0.22)' : 'rgba(220,220,220,0.2)';
                    px(this.x + 6, floatY + 4, 34, 34);
                    ctx.fillStyle = gemMain;
                    px(this.x + 18, floatY + 2, 10, 6);
                    px(this.x + 12, floatY + 8, 22, 8);
                    px(this.x + 8, floatY + 16, 30, 8);
                    px(this.x + 12, floatY + 24, 22, 8);
                    px(this.x + 16, floatY + 32, 14, 6);
                    ctx.fillStyle = gemMid;
                    px(this.x + 8, floatY + 16, 4, 8);
                    px(this.x + 34, floatY + 16, 4, 8);
                    px(this.x + 14, floatY + 26, 4, 6);
                    px(this.x + 28, floatY + 26, 4, 6);
                    ctx.fillStyle = gemLight;
                    px(this.x + 20, floatY + 4, 4, 4);
                    px(this.x + 16, floatY + 10, 5, 4);
                    px(this.x + 21, floatY + 14, 6, 4);
                    ctx.fillStyle = gemCore;
                    px(this.x + 20, floatY + 20, 6, 6);
                }

                if (sparkle !== 1) {
                    ctx.fillStyle = '#fff';
                    px(this.x + 36, floatY + 6, 3, 3);
                    if (sparkle === 0) px(this.x + 4, floatY + 20, 2, 2);
                }
                break;
            }
            case 'teddy':
                // Teddy from spritesheet (black and white, larger)
                if (elementsSpriteLoaded) {
                    const frame = elementsFrameCache.get(2);
                    if (frame) {
                        const targetHeight = 48;
                        const targetWidth = Math.round(targetHeight * (1536 / 1024));
                        ctx.save();
                        ctx.filter = 'grayscale(100%)';
                        ctx.drawImage(frame, 0, 0, 1536, 1024, this.x, floatY, targetWidth, targetHeight);
                        ctx.restore();
                    }
                } else {
                    // Fallback pixel art teddy bear (black and white, larger)
                    ctx.fillStyle = '#bbb';
                    px(this.x + 4, floatY + 4, 10, 10);
                    px(this.x + 28, floatY + 4, 10, 10);
                    ctx.fillStyle = '#888';
                    px(this.x + 6, floatY + 6, 5, 5);
                    px(this.x + 30, floatY + 6, 5, 5);
                    ctx.fillStyle = '#bbb';
                    px(this.x + 8, floatY + 12, 32, 28);
                    ctx.fillStyle = '#222';
                    px(this.x + 15, floatY + 20, 6, 6);
                    px(this.x + 27, floatY + 20, 6, 6);
                }
                if (sparkle === 2) {
                    ctx.fillStyle = '#fff';
                    px(this.x + 38, floatY + 12, 3, 3);
                }
                break;
        }
        
        ctx.restore();
    }
    
    update() {
        this.x -= gameSpeed;
    }
    
    
    getHitbox() {
    let w = this.width;
    let h = this.height;

    switch(this.type) {
        case 'heart':
            w = 80;
            h = 60;
            break;
        case 'sunflower':
            w = 40;
            h = 60;
            break;
        case 'teddy':
            w = 60;
            h = 45;
            break;
        case 'gem':
            w = 46;
            h = 42;
            break;
    }

    const floatY = this.y + Math.sin(Date.now() * 0.004 + this.floatOffset) * 4;

    return {
        x: this.x + 10,
        y: floatY + 10,  // align properly with visual sprite
        width: w - 20,
        height: h - 20
    };
}
};

// ========================================
// PRINCESS
// ========================================
class Princess {
    constructor() {
        this.x = canvas.width + 100;
        this.y = canvas.height - 180;
        this.width = 50;
        this.height = 80;
        this.visible = false;
    }
    
    // Get princess sprite frame based on cinematic phase
    getPrincessFrame() {
        // Frame A (0): Idle Balcony Pose - phases 0-1 (knight arrives, offering)
        // Frame B (1): Commanding Gesture - phases 2-4 (heart rain, drowning, comeback)
        // Frame C (2): Empty Tower - used as background when princess leaves
        // Frame D (3): Running Frame A - phase 5 while running (alternates)
        // Frame E (4): Running Frame B - phase 5 while running (alternates)
        
        if (cinematicPhase >= 5) {
            if (princessRunProgress < 1) {
                // Alternate between running frames D and E for animation
                const runFrame = Math.floor(cinematicTimer / 150) % 2;
                return runFrame === 0 ? 3 : 4; // Alternate D and E
            }
            return 3; // Frame D: Use running frame for embrace (no tower)
        }
        if (cinematicPhase >= 2) {
            return 1; // Frame B: Commanding hearts
        }
        return 0; // Frame A: Idle on balcony
    }
    
    draw() {
        if (!this.visible) return;
        
        ctx.save();
        ctx.imageSmoothingEnabled = false;
        
        // Use spritesheet - Frame A/B include the tower with princess
        if (princessSpriteLoaded) {
            const frameIndex = this.getPrincessFrame();
            const rect = PRINCESS_SPRITE_FRAMES[frameIndex];
            const processedFrame = princessFrameCache.get(frameIndex);
            
            if (rect && processedFrame) {
                const groundY = canvas.height - 60;
                // Frame A and B include the tower, so draw them at full size
                const targetHeight = 340;
                const targetWidth = Math.round(targetHeight * (rect.sw / rect.sh));
                const drawX = canvas.width - targetWidth - 20;
                const drawY = groundY - targetHeight;
                
                // Keep tower/princess grayscale until color reveal
                if (!colorRevealed) {
                    ctx.filter = 'grayscale(100%)';
                }

                ctx.drawImage(
                    processedFrame,
                    0, 0, rect.sw, rect.sh,
                    drawX, drawY, targetWidth, targetHeight
                );
                // Reset filter and restore
                ctx.filter = 'none';
                ctx.restore();
                return; // Don't draw pixel fallback
            }
        }
        // No pixel fallback - sprites required
        ctx.restore();
    }
    
    update() {
        // Princess doesn't move once placed
    }
}


// Draw castle using spritesheet Frame C (Empty Tower)
function drawSpriteCastle() {
    if (princessSpriteLoaded) {
        const emptyTowerRect = PRINCESS_SPRITE_FRAMES[2];
        const emptyTowerFrame = princessFrameCache.get(2);
        
        if (emptyTowerRect && emptyTowerFrame) {
            const groundY = canvas.height - 60;
            const towerHeight = 340;
            const towerWidth = Math.round(towerHeight * (emptyTowerRect.sw / emptyTowerRect.sh));
            const towerX = canvas.width - towerWidth - 20;
            const towerY = groundY - towerHeight;

            ctx.save();

            // 👇 APPLY GRAYSCALE BEFORE COLOR REVEAL
            if (!colorRevealed) {
                ctx.filter = 'grayscale(100%)';
            }

            ctx.drawImage(
                emptyTowerFrame,
                0, 0,
                emptyTowerRect.sw, emptyTowerRect.sh,
                towerX, towerY,
                towerWidth, towerHeight
            );

            ctx.filter = 'none';
            ctx.restore();
        }
    }
}



// ========================================
// BACKGROUND & LAYERS
// ========================================

function drawBackground() {
    ctx.imageSmoothingEnabled = false;
    const px = (x, y, w, h) => ctx.fillRect(Math.floor(x), Math.floor(y), w, h);
    const groundY = canvas.height - 60;


    // 1. SOFT SUNSET SKY (original)
    const sky = ctx.createLinearGradient(0, 0, 0, groundY);
    if (colorRevealed) {
        sky.addColorStop(0, '#c85f7f');
        sky.addColorStop(0, '#d96b8a');   // deeper rose top
        sky.addColorStop(0.35, '#f27d9a'); // vibrant pink
        sky.addColorStop(0.65, '#f48c6a'); // strong coral
        sky.addColorStop(1, '#f5a65b');    // glowing sunset orange
    } else {
        sky.addColorStop(0, '#d9d9d9');
        sky.addColorStop(0.55, '#bfbfbf');
        sky.addColorStop(1, '#9e9e9e');
    }
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, canvas.width, groundY);

    if (!colorRevealed) {
        const moonGlow = ctx.createRadialGradient(
            canvas.width * 0.72, 90, 20,
            canvas.width * 0.72, 90, 280
        );
        moonGlow.addColorStop(0, 'rgba(235, 235, 235, 0.22)');
        moonGlow.addColorStop(1, 'rgba(235,235,235,0)');
        ctx.fillStyle = moonGlow;
        ctx.fillRect(0, 0, canvas.width, groundY);
    }

    if (colorRevealed) {
        const glow = ctx.createLinearGradient(
            0,
            groundY - 180,
            0,
            groundY
        );

        glow.addColorStop(0, 'rgba(255,180,120,0)');
        glow.addColorStop(1, 'rgba(255,180,120,0.3)');

        ctx.fillStyle = glow;
        ctx.fillRect(0, groundY - 180, canvas.width, 180);
    }


        // ==========================
        // MOVING CLOUD BANKS (VISIBLE)
        // ==========================

        const cloudSpeed = 0.7;   // noticeable
        const cloudDrift = frameCount * cloudSpeed;

        


        ctx.fillStyle = colorRevealed
            ? 'rgba(255, 180, 243, 0.38)'
            : 'rgba(224,224,224,0.42)';

        for (let i = -5; i < 10; i++) {

            const x = i * 320 - cloudDrift;

            const y =
                groundY - 260 +
                Math.sin(frameCount * 0.015 + i) * 6;

            px(x, y, 260, 30);
            px(x + 40, y - 18, 180, 24);
            px(x + 80, y - 32, 100, 18);
        }

        if (!colorRevealed) {
            ctx.fillStyle = 'rgba(162,162,162,0.22)';
            for (let i = -4; i < 9; i++) {
                const x = i * 360 - cloudDrift * 0.45;
                const y = groundY - 210 + Math.sin(frameCount * 0.01 + i * 0.8) * 4;
                px(x, y, 300, 22);
                px(x + 55, y - 10, 190, 14);
            }
        }


     // ==========================
// TINY FLYING BIRDS
// ==========================

const birdSpeed = 0.6;
const birdDrift = frameCount * birdSpeed;

ctx.fillStyle = colorRevealed ? '#3b2f2f' : '#666';

for (let i = 0; i < 3; i++) {

    const x = (canvas.width + 200) - ((birdDrift + i * 250) % (canvas.width + 400));

    const baseY = groundY - 300 + Math.sin(i * 2.3) * 15;

    const flap = Math.sin(frameCount * 0.15 + i) * 2;

    const y = baseY + flap;

    // Simple flying "V" bird
    px(x, y, 3, 2);
    px(x - 3, y - 1, 3, 2);
    px(x + 3, y - 1, 3, 2);
}

    // ==========================
    // 3. ATMOSPHERIC MIST BAND
    // ==========================

    const mist = ctx.createLinearGradient(0, groundY - 200, 0, groundY - 60);

    mist.addColorStop(0, 'rgba(255,220,200,0)');
    mist.addColorStop(1, colorRevealed
        ? 'rgba(255,210,180,0.35)'
        : 'rgba(200,200,200,0.3)'
    );

    ctx.fillStyle = mist;
    ctx.fillRect(0, groundY - 200, canvas.width, 140);

    if (!colorRevealed) {
        const horizonSoftener = ctx.createLinearGradient(0, groundY - 150, 0, groundY - 70);
        horizonSoftener.addColorStop(0, 'rgba(220,220,220,0)');
        horizonSoftener.addColorStop(1, 'rgba(220,220,220,0.24)');
        ctx.fillStyle = horizonSoftener;
        ctx.fillRect(0, groundY - 150, canvas.width, 80);
    }

   

    // ==========================
    // 5. SOFT FLOATING LIGHT PARTICLES
    // ==========================

    if (colorRevealed) {
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        for (let i = 0; i < 12; i++) {
            const x = (frameCount * 0.25 + i * 80) % canvas.width;
            const y = 120 + Math.sin(frameCount * 0.02 + i) * 18;
            px(x, y, 2, 2);
        }
    } else {
        for (let i = 0; i < 10; i++) {
            const pulse = 0.12 + (Math.sin(frameCount * 0.05 + i) + 1) * 0.08;
            ctx.fillStyle = `rgba(238,238,238,${pulse})`;
            const x = (frameCount * 0.18 + i * 96) % canvas.width;
            const y = 130 + Math.sin(frameCount * 0.018 + i) * 24;
            px(x, y, 2, 2);
        }
    }

    // ==========================
    // 6. SUBTLE VIGNETTE
    // ==========================

    if (colorRevealed) {
        const vignette = ctx.createRadialGradient(
            canvas.width / 2,
            canvas.height / 2,
            100,
            canvas.width / 2,
            canvas.height / 2,
            canvas.height
        );

        vignette.addColorStop(0, 'rgba(0,0,0,0)');
        vignette.addColorStop(1, 'rgba(0,0,0,0.18)');

        ctx.fillStyle = vignette;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else {
        const grayVignette = ctx.createRadialGradient(
            canvas.width / 2,
            canvas.height / 2,
            130,
            canvas.width / 2,
            canvas.height / 2,
            canvas.height
        );
        grayVignette.addColorStop(0, 'rgba(0,0,0,0)');
        grayVignette.addColorStop(1, 'rgba(20,20,20,0.22)');
        ctx.fillStyle = grayVignette;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
}


function drawGround() {

    const groundY = canvas.height - 60;
    const px = (x, y, w, h) => ctx.fillRect(Math.floor(x), Math.floor(y), w, h);

    if (colorRevealed) {
        // ===================================================
        // BASE GROUND GRADIENT
        // ===================================================

        const groundGrad = ctx.createLinearGradient(0, groundY, 0, groundY + 60);
        groundGrad.addColorStop(0, '#7b5548');
        groundGrad.addColorStop(0.6, '#5c3c32');
        groundGrad.addColorStop(1, '#3a231d');
        ctx.fillStyle = groundGrad;
        ctx.fillRect(0, groundY, canvas.width, 60);

        // Warm sunset tint (right side stronger)
        const warmTint = ctx.createLinearGradient(0, groundY, canvas.width, groundY);
        warmTint.addColorStop(0, 'rgba(200,140,110,0.05)');
        warmTint.addColorStop(1, 'rgba(255,180,130,0.28)');
        ctx.fillStyle = warmTint;
        ctx.fillRect(0, groundY, canvas.width, 60);

        // ===================================================
        // MAGICAL HORIZON GLOW
        // ===================================================

        const horizonGlow = ctx.createLinearGradient(
            0,
            groundY - 140,
            0,
            groundY
        );

        horizonGlow.addColorStop(0, 'rgba(255,210,170,0)');
        horizonGlow.addColorStop(1, 'rgba(255,210,170,0.15)');

        ctx.fillStyle = horizonGlow;
        ctx.fillRect(0, groundY - 140, canvas.width, 140);

        // ===================================================
        // SOFT GROUND MIST (fairy softness)
        // ===================================================

        const mist = ctx.createLinearGradient(
            0,
            groundY - 80,
            0,
            groundY
        );

        mist.addColorStop(0, 'rgba(255,220,200,0)');
        mist.addColorStop(1, 'rgba(255,220,200,0.18)');

        ctx.fillStyle = mist;
        ctx.fillRect(0, groundY - 80, canvas.width, 80);

        // ===================================================
        // GRASS TRIM
        // ===================================================

        ctx.fillStyle = '#6ba76e';
        ctx.fillRect(0, groundY, canvas.width, 6);

        // ===================================================
        // ENCHANTED SOIL + GRASS MAGIC
        // ===================================================

        const magicShift = frameCount * 0.45;

        // Subtle glowing veins in the top soil layer
        ctx.fillStyle = 'rgba(255, 206, 150, 0.18)';
        for (let i = 0; i < 26; i++) {
            const vx = ((i * 61 - magicShift) % canvas.width + canvas.width) % canvas.width;
            const vy = groundY + 9 + (i % 3) * 6;
            px(vx, vy, 8, 2);
            if (i % 2 === 0) px(vx + 3, vy + 2, 4, 1);
        }

        // Tiny rune-like glimmers that pulse softly
        for (let i = 0; i < 10; i++) {
            const pulse = 0.08 + (Math.sin(frameCount * 0.08 + i * 1.7) + 1) * 0.12;
            ctx.fillStyle = `rgba(220, 190, 255, ${pulse.toFixed(3)})`;
            const rx = ((i * 113 - magicShift * 0.7 + 40) % canvas.width + canvas.width) % canvas.width;
            const ry = groundY + 14 + (i % 4) * 8;
            // pixel diamond/rune
            px(rx + 1, ry, 2, 1);
            px(rx, ry + 1, 4, 1);
            px(rx + 1, ry + 2, 2, 1);
        }

        // Magical grass-tip highlights along the trim
        for (let i = 0; i < 34; i++) {
            const gx = ((i * 37 - magicShift * 0.8) % canvas.width + canvas.width) % canvas.width;
            const gPulse = 0.12 + (Math.sin(frameCount * 0.06 + i) + 1) * 0.16;
            ctx.fillStyle = `rgba(180, 255, 230, ${gPulse.toFixed(3)})`;
            px(gx, groundY + (i % 2), 2, 2);
        }

        // =======================================
        // PERFECT TREE <space> BUSH <space> PATTERN
        // =======================================
        


const SPACING = 230;  // larger spacing prevents overlap
const scroll = frameCount * 0.35;

const totalSlots = Math.ceil(canvas.width / SPACING) + 2;

for (let i = 0; i < totalSlots; i++) {

    const x = (i * SPACING - scroll % SPACING) - SPACING;
    const baseY = groundY ;

    // EVEN = TREE
    if (i % 2 === 0) {
        const treeScale = 0.9 + Math.abs(Math.sin((i + 1) * 1.2)) * 0.28;
        const canopyWidth = Math.round(84 * treeScale);
        const trunkWidth = Math.max(10, Math.round(12 * treeScale));
        const trunkHeight = Math.round(78 * treeScale);
        const trunkX = Math.round(x + canopyWidth / 2 - trunkWidth / 2);
        const canopyTopY = Math.round(baseY - trunkHeight - 84 * treeScale);

        // Trunk
        ctx.fillStyle = '#6a3f2c';
        px(trunkX, baseY - trunkHeight, trunkWidth, trunkHeight);

        // Root base
        ctx.fillStyle = '#4a2e20';
        px(trunkX - 3, baseY - 6, trunkWidth + 6, 6);

        // Lower canopy mass
        ctx.fillStyle = '#355a43';
        px(x + 6, canopyTopY + 56, canopyWidth - 12, Math.round(42 * treeScale));

        // Side canopy clusters
        px(x - 2, canopyTopY + 66, Math.round(20 * treeScale), Math.round(24 * treeScale));
        px(x + canopyWidth - Math.round(20 * treeScale), canopyTopY + 66, Math.round(20 * treeScale), Math.round(24 * treeScale));

        // Mid canopy
        ctx.fillStyle = '#4f7a55';
        px(x + 14, canopyTopY + 34, canopyWidth - 28, Math.round(36 * treeScale));
        px(x + 6, canopyTopY + 46, Math.round(16 * treeScale), Math.round(18 * treeScale));
        px(x + canopyWidth - Math.round(22 * treeScale), canopyTopY + 46, Math.round(16 * treeScale), Math.round(18 * treeScale));

        // Top canopy crown
        ctx.fillStyle = '#74a26d';
        px(x + 22, canopyTopY + 14, canopyWidth - 44, Math.round(24 * treeScale));
        px(x + 28, canopyTopY + 2, canopyWidth - 56, Math.round(14 * treeScale));

        // Tiny highlight flecks for magical softness
        ctx.fillStyle = 'rgba(255,230,190,0.35)';
        px(x + Math.round(canopyWidth * 0.35), canopyTopY + Math.round(28 * treeScale), 2, 2);
        px(x + Math.round(canopyWidth * 0.58), canopyTopY + Math.round(22 * treeScale), 2, 2);

    }

     else {

        // ===== BUSH =====
        const bushWidth = 80;
        const bushHeight = 34;

        // base
        ctx.fillStyle = '#3f6a4f';
        px(x, baseY - bushHeight + 10, bushWidth, bushHeight - 10);

        // mid
        ctx.fillStyle = '#5f8f63';
        px(x + 10, baseY - bushHeight, bushWidth - 20, 22);

        // highlight
        ctx.fillStyle = '#7fbf7f';
        px(x + 24, baseY - bushHeight - 8, bushWidth - 48, 12);

        // flowers
        const flowerColors = ['#ff7aa2', '#ffd166', '#ff99c8'];

        for (let f = 0; f < 4; f++) {

            const fx = x + 26 + f * 16;
            const fy = baseY - bushHeight + 6;

            const color = flowerColors[f % flowerColors.length];

            // Soft glow
            ctx.fillStyle = 'rgba(255,200,150,0.15)';
            px(fx - 2, fy - 2, 10, 10);

            // Petals (cross shape)
            ctx.fillStyle = color;
            px(fx, fy, 6, 6);         // center body
            px(fx - 2, fy + 2, 2, 2); // left petal
            px(fx + 6, fy + 2, 2, 2); // right petal
            px(fx + 2, fy - 2, 2, 2); // top petal
            px(fx + 2, fy + 6, 2, 2); // bottom petal

            // Center
            ctx.fillStyle = '#ffdd88';
            px(fx + 2, fy + 2, 2, 2);
        }

    }
}

        
        // ===================================================
        // FLOATING FAIRY SPARKLES
        // ===================================================

        for (let i = 0; i < 8; i++) {

            const pulse = 0.6 + Math.sin(frameCount * 0.08 + i) * 0.4;
            ctx.fillStyle = `rgba(255,240,200,${pulse})`;

            const sx = (i * 140 + frameCount * 0.4) % canvas.width;
            const sy = groundY - 40 - Math.sin(frameCount * 0.02 + i) * 25;

            px(sx, sy, 2, 2);
        }

        // ===================================================
        // STRONG FOREGROUND DEPTH STRIP
        // ===================================================

        ctx.fillStyle = '#1a0f0c';
        ctx.fillRect(0, groundY + 50, canvas.width, 12);

        ctx.fillStyle = '#2e3d2f';
        for (let i = 0; i < canvas.width; i += 15) {
            const h = 4 + Math.round(Math.sin(i * 0.1) * 2);
            px(i, groundY - h, 2, h);
        }

    } else {

        // Black & White Mode

        const bwGround = ctx.createLinearGradient(0, groundY, 0, groundY + 60);
        bwGround.addColorStop(0, '#d8d8d8');
        bwGround.addColorStop(0.6, '#bcbcbc');
        bwGround.addColorStop(1, '#9e9e9e');
        ctx.fillStyle = bwGround;
        ctx.fillRect(0, groundY, canvas.width, 60);

        // top trim + soft fog near the horizon line
        ctx.fillStyle = '#8e8e8e';
        ctx.fillRect(0, groundY, canvas.width, 5);

        const bwHaze = ctx.createLinearGradient(0, groundY - 70, 0, groundY + 8);
        bwHaze.addColorStop(0, 'rgba(224,224,224,0)');
        bwHaze.addColorStop(1, 'rgba(224,224,224,0.23)');
        ctx.fillStyle = bwHaze;
        ctx.fillRect(0, groundY - 70, canvas.width, 78);

        ctx.fillStyle = '#b8b8b8';
        for (let i = 0; i < 28; i++) {
            const x = ((i * 31 - frameCount * 0.85) % canvas.width + canvas.width) % canvas.width;
            const y = groundY + 8 + (i % 4) * 4;
            px(x, y, 4, 2);
            if (i % 3 === 0) px(x + 2, y + 2, 2, 1);
        }

        // tiny shimmer specks so grayscale still feels alive
        for (let i = 0; i < 10; i++) {
            const pulse = 0.08 + (Math.sin(frameCount * 0.07 + i * 1.4) + 1) * 0.1;
            ctx.fillStyle = `rgba(242,242,242,${pulse})`;
            const sx = ((i * 93 - frameCount * 0.35) % canvas.width + canvas.width) % canvas.width;
            const sy = groundY + 12 + (i % 3) * 9;
            px(sx, sy, 2, 2);
        }

        // Trees + bushes in run phase (grayscale style)
        const SPACING_BW = 230;
        const scrollBW = frameCount * 0.35;
        const totalSlotsBW = Math.ceil(canvas.width / SPACING_BW) + 2;

        for (let i = 0; i < totalSlotsBW; i++) {
            const x = (i * SPACING_BW - scrollBW % SPACING_BW) - SPACING_BW;
            const baseY = groundY;

            if (i % 2 === 0) {
                const treeScale = 0.9 + Math.abs(Math.sin((i + 1) * 1.2)) * 0.28;
                const canopyWidth = Math.round(84 * treeScale);
                const trunkWidth = Math.max(10, Math.round(12 * treeScale));
                const trunkHeight = Math.round(78 * treeScale);
                const trunkX = Math.round(x + canopyWidth / 2 - trunkWidth / 2);
                const canopyTopY = Math.round(baseY - trunkHeight - 84 * treeScale);

                ctx.fillStyle = '#4f4f4f';
                px(trunkX, baseY - trunkHeight, trunkWidth, trunkHeight);
                ctx.fillStyle = '#3f3f3f';
                px(trunkX - 3, baseY - 6, trunkWidth + 6, 6);

                ctx.fillStyle = '#676767';
                px(x + 6, canopyTopY + 56, canopyWidth - 12, Math.round(42 * treeScale));
                px(x - 2, canopyTopY + 66, Math.round(20 * treeScale), Math.round(24 * treeScale));
                px(x + canopyWidth - Math.round(20 * treeScale), canopyTopY + 66, Math.round(20 * treeScale), Math.round(24 * treeScale));

                ctx.fillStyle = '#7b7b7b';
                px(x + 14, canopyTopY + 34, canopyWidth - 28, Math.round(36 * treeScale));
                px(x + 6, canopyTopY + 46, Math.round(16 * treeScale), Math.round(18 * treeScale));
                px(x + canopyWidth - Math.round(22 * treeScale), canopyTopY + 46, Math.round(16 * treeScale), Math.round(18 * treeScale));

                ctx.fillStyle = '#939393';
                px(x + 22, canopyTopY + 14, canopyWidth - 44, Math.round(24 * treeScale));
                px(x + 28, canopyTopY + 2, canopyWidth - 56, Math.round(14 * treeScale));
            } else {
                const bushWidth = 80;
                const bushHeight = 34;

                ctx.fillStyle = '#5f5f5f';
                px(x, baseY - bushHeight + 10, bushWidth, bushHeight - 10);

                ctx.fillStyle = '#797979';
                px(x + 10, baseY - bushHeight, bushWidth - 20, 22);

                ctx.fillStyle = '#8f8f8f';
                px(x + 24, baseY - bushHeight - 8, bushWidth - 48, 12);
            }
        }
    }

    // Ground Line
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    ctx.lineTo(canvas.width, groundY);
    ctx.stroke();
}



// ========================================
// COLLISION DETECTION
// ========================================

function checkCollision(box1, box2) {
    return box1.x < box2.x + box2.width &&
           box1.x + box1.width > box2.x &&
           box1.y < box2.y + box2.height &&
           box1.y + box1.height > box2.y;
}

// ========================================
// GAME OBJECTS MANAGEMENT
// ========================================

let obstacles = [];
let collectibles = [];
let princess = null;

function spawnObstacle() {
    const section = getCurrentSection();
    let types, weights;
    // Different obstacles for different sections, with weights
    switch(section) {
        case 'meadow':
            types = ['spikes'];
            weights = [1];
            break;
        case 'forest':
            if (distance >= 200) {
                types = ['spikes', 'eagle'];
                weights = [0.7, 0.3];
            } else {
                types = ['spikes'];
                weights = [1];
            }
            break;
        case 'castle_road':
            types = ['spikes', 'eagle'];
            weights = [0.5, 0.5];
            break;
        case 'castle_gate':
            // Only stop obstacles after princess appears
            if (!princess) {
                types = ['spikes', 'eagle', 'bat'];
                weights = [0.4, 0.4, 0.2];
            } else {
                types = [];
                weights = [];
            }
            break;
    }
    // Weighted random selection with enforced alternation for eagle/spikes
    let type = types[0];
    if (types.length > 1) {
        // If last obstacle is spikes, prefer eagle, and vice versa
        const last = obstacles.length > 0 ? obstacles[obstacles.length-1].type : null;
        const canAlternate = types.includes('spikes') && types.includes('eagle');
        if (canAlternate && last) {
            if (last === 'spikes') {
                type = 'eagle';
            } else if (last === 'eagle') {
                type = 'spikes';
            } else {
                // Pick randomly
                type = types[Math.floor(Math.random() * types.length)];
            }
        } else {
            // Weighted random as fallback
            let r = Math.random();
            let sum = 0;
            for (let i = 0; i < types.length; i++) {
                sum += weights[i];
                if (r < sum) {
                    type = types[i];
                    break;
                }
            }
        }
    }
    obstacles.push(new Obstacle(canvas.width + 50, type));
}

function spawnCollectible() {
    // Weighted selection: gem is intentionally very rare,
    // but guarantee at least one gem appears before the run ends.
    const mustForceGem = !gemSpawnedThisRun && distance >= TARGET_DISTANCE * 0.55;
    const r = Math.random();
    let type;
    if (mustForceGem) {
        type = 'gem';
    } else if (r < 0.30) type = 'heart';
    else if (r < 0.55) type = 'sunflower';
    else if (r < 0.985) type = 'teddy';
    else type = 'gem';

    if (type === 'gem') {
        gemSpawnedThisRun = true;
    }

    const x = canvas.width + 50 + Math.random() * 100;
    // Vary spawn height by type so some are on ground, some at mid/head, some high
    let y;
    const baseGround = knight && knight.groundY ? knight.groundY : (canvas.height - 120);
    const SAFE_JUMP_MAX_HEIGHT = 104; // keep within reliable reachable jump range
    switch(type) {
        case 'heart':
            // High but reachable
            y = baseGround - 68 - Math.random() * 32; // 68..100
            if (Math.random() < 0.12) y = baseGround - 52 - Math.random() * 10; // easier variant
            break;
        case 'sunflower': {
            const MAX_JUMP_HEIGHT = 100;   // safe reachable height
            const MIN_HEIGHT = 50;         // not too low

            y = baseGround - MIN_HEIGHT - Math.random() * (MAX_JUMP_HEIGHT - MIN_HEIGHT);
            break;
        }

        case 'teddy':
            // Mid level — small jump or run depending on spawn
            if (Math.random() < 0.25) {
                y = baseGround - 10 - Math.random() * 6; // ground
            } else {
                y = baseGround - 70 - Math.random() * 20; // mid
            }
            break;
        case 'gem':
            // Special, but still reachable
            y = baseGround - 78 - Math.random() * 22; // 78..100
            break;
        default:
            y = baseGround - 70 - Math.random() * 30;
    }

    // Final safety clamp so no collectible spawns above jumpable range
    if (y < baseGround - SAFE_JUMP_MAX_HEIGHT) {
        y = baseGround - SAFE_JUMP_MAX_HEIGHT + Math.random() * 6;
    }

    collectibles.push(new Collectible(x, y, type));
}

function spawnPrincess() {
    if (!princess && distance >= PRINCESS_APPEAR_DISTANCE) {
        princess = new Princess();
        princess.visible = true;
        // Stop spawning obstacles
    }
}

// ========================================
// CINEMATIC ENDING SYSTEM
// ========================================

function startCinematicEnding() {
    gameWon = true;
    cinematicPhase = 0; // Start with setup (dramatic pause)
    cinematicTimer = 0;
    knightDrownLevel = 0;
    princessSurprised = false;
    embraceStartTime = null;
    comebackHappened = false;
    heartPile = [];
    
    // Reset dialogue typing state
    lastDialogueKey = '';
    dialogueFullyTyped = false;
    
    // Create floating items from collectibles
    floatingItems = [];
    const startX = knight.x + 20;
    const startY = knight.y;
    
    const heartsToSend = Math.max(0, Math.floor(heartsCollected));
    const sunflowersToSend = Math.max(0, Math.floor(sunflowersCollected));
    const teddiesToSend = Math.max(0, Math.floor(teddiesCollected));

    // Add hearts - target below princess face (around hands/body area)
    for (let i = 0; i < heartsToSend; i++) {
        floatingItems.push({
            type: 'heart',
            x: startX + Math.random() * 20 - 10,
            y: startY,
            targetX: canvas.width - 150 + Math.random() * 50,
            targetY: 160 + Math.random() * 40,
            progress: 0,
            delay: i * 150
        });
    }
    
    // Add sunflowers - target below princess face
    for (let i = 0; i < sunflowersToSend; i++) {
        floatingItems.push({
            type: 'sunflower',
            x: startX + Math.random() * 20 - 10,
            y: startY,
            targetX: canvas.width - 140 + Math.random() * 50,
            targetY: 170 + Math.random() * 40,
            progress: 0,
            delay: (heartsToSend + i) * 150
        });
    }
    
    // Add teddies - target below princess face
    for (let i = 0; i < teddiesToSend; i++) {
        floatingItems.push({
            type: 'teddy',
            x: startX + Math.random() * 20 - 10,
            y: startY,
            targetX: canvas.width - 130 + Math.random() * 50,
            targetY: 180 + Math.random() * 40,
            progress: 0,
            delay: (heartsToSend + sunflowersToSend + i) * 150
        });
    }
}

function updateCinematicEnding(deltaTime) {
    cinematicTimer += deltaTime;
    
    switch(cinematicPhase) {
        case 0: // SETUP - Dramatic Pause, "You took long enough"
            if (!colorRevealed) {
                colorRevealed = true;
                document.body.classList.add('colorful');
            }

            if (cinematicTimer > 9800) {
                cinematicPhase = 1;
                cinematicTimer = 0;
            }
            break;
            
        case 1: // PHASE 1 - The Offering (items float up)
            // Update floating items
            floatingItems.forEach(item => {
                if (cinematicTimer > item.delay * 2) {
                    item.progress = Math.min(1, item.progress + deltaTime * 0.0004);
                    const t = item.progress;
                    const arcHeight = 180;
                    item.currentX = item.x + (item.targetX - item.x) * t;
                    item.currentY = item.y + (item.targetY - item.y) * t - Math.sin(t * Math.PI) * arcHeight;
                }
            });
            
            if (cinematicTimer > 10000) {
                cinematicPhase = 2;
                cinematicTimer = 0;
                // Start heart rain - LOTS of hearts, ONLY on knight!
                const knightCenter = knight.x + 60; // Center on knight sprite
                for (let i = 0; i < 80; i++) {
                    heartRain.push({
                        x: knightCenter + (Math.random() - 0.5) * 100, // Above knight
                        y: -50 - Math.random() * 300, // Start closer to screen
                        size: 25 + Math.random() * 20, // Smaller hearts (25-45)
                        speed: 8 + Math.random() * 7, // Much faster (8-15)
                        wobble: Math.random() * Math.PI * 2,
                        rotation: Math.random() * Math.PI * 2
                    });
                }
            }
            break;
            
        case 2: // PHASE 2 - Heart Apocalypse (hearts rain, bonk knight)
            // Update heart rain - only on knight!
            const knightCenter2 = knight.x + 60; // Center on knight sprite
            heartRain.forEach(heart => {
                heart.y += heart.speed;
                heart.x += Math.sin(heart.wobble) * 0.8;
                heart.wobble += 0.06;
                heart.rotation += 0.02;
                
                // Hearts land and pile up around knight
                const groundLevel = canvas.height - 60;


                if (heart.y > groundLevel) { // Hearts reach actual ground
                    // Add to pile around knight
                    heartPile.push({
                        x: knightCenter2 + (Math.random() - 0.5) * 80,
                        y: groundLevel - Math.random() * 10,
                        size: heart.size,
                        rotation: heart.rotation
                    });
                    heart.y = -100 - Math.random() * 200; // Reset to top
                    heart.x = knightCenter2 + (Math.random() - 0.5) * 100; // Stay above knight
                }
            });
            
            // Add more hearts continuously - above knight
            if (heartRain.length < 120) {
                heartRain.push({
                    x: knightCenter2 + (Math.random() - 0.5) * 100,
                    y: -50,
                    size: 25 + Math.random() * 20, // Smaller hearts (25-45)
                    speed: 8 + Math.random() * 7, // Much faster (8-15)
                    wobble: Math.random() * Math.PI * 2,
                    rotation: Math.random() * Math.PI * 2
                });
            }
            
            // Color reveal starts
            colorTransitionProgress = Math.min(1, cinematicTimer / 4000);
            
            if (cinematicTimer > 10000) {
                cinematicPhase = 3;
                cinematicTimer = 0;
            }
            break;
            
        case 3: // PHASE 3 - The DROWNING (knight sinks into hearts)
            // Keep hearts piling on knight!
            const knightCenter3 = knight.x + 60; // Center on knight sprite
            heartRain.forEach(heart => {
                heart.y += heart.speed * 1.5; // Faster!
                heart.x += Math.sin(heart.wobble) * 0.5;
                heart.wobble += 0.04;
                const groundLevel = canvas.height - 60;


                if (heart.y > groundLevel) {
                    heartPile.push({
                        x: knightCenter3 + (Math.random() - 0.5) * 80,
                        y: groundLevel - heartPile.length * 0.3 - Math.random() * 5,

                        size: heart.size,
                        rotation: heart.rotation
                    });
                    heart.y = -50 - Math.random() * 100;
                    heart.x = knightCenter3 + (Math.random() - 0.5) * 100;
                }
            });
            
            // Knight drowning progression: equal timing for F, G, and H
            if (cinematicTimer < 2500) {
                knightDrownLevel = 1; // Frame F
            } else if (cinematicTimer < 5000) {
                knightDrownLevel = 2; // Frame G
            } else if (cinematicTimer < 7500) {
                knightDrownLevel = 3; // Frame H
            } else {
                knightDrownLevel = 4; // Gone! Just plume tip
            }
            
            if (cinematicTimer > 10000) {
                cinematicPhase = 4;
                cinematicTimer = 0;
                // Stop adding new hearts
                heartRain = [];
            }
            break;
            
        case 4: // PHASE 4 - THE COMEBACK (knight bursts out)
            if (cinematicTimer > 2000 && !comebackHappened) {
                comebackHappened = true;
                knightDrownLevel = 5; // BURST OUT!
                
                // Explode hearts outward
                heartPile.forEach(heart => {
                    heart.vx = (Math.random() - 0.5) * 15;
                    heart.vy = -Math.random() * 20 - 10;
                });
            }
            
            // Animate exploding hearts
            if (comebackHappened) {
                heartPile.forEach(heart => {
                    if (heart.vx !== undefined) {
                        heart.x += heart.vx;
                        heart.y += heart.vy;
                        heart.vy += 0.5; // Gravity
                        heart.rotation += 0.1;
                    }
                });
                // Remove hearts that fell off screen
                heartPile = heartPile.filter(h => h.y < canvas.height + 100);
            }
            
            if (cinematicTimer > 8000) {
                cinematicPhase = 5;
                cinematicTimer = 0;
            }
            break;
            
        case 5: // PHASE 5 - Princess runs to knight
            // Princess runs from castle to knight
            if (!princessRunProgress) princessRunProgress = 0;
            princessRunProgress = Math.min(1, princessRunProgress + deltaTime * 0.0002);
            
            // A few hearts pop out
            if (cinematicTimer < 1000 && Math.random() < 0.1) {
                heartPile.push({
                    x: knight.x + 20,
                    y: canvas.height - 100,
                    size: 20,
                    vx: (Math.random() - 0.5) * 8,
                    vy: -Math.random() * 10 - 5,
                    rotation: 0
                });
            }
            
            // Update popped hearts
            heartPile.forEach(heart => {
                if (heart.vx !== undefined) {
                    heart.x += heart.vx;
                    heart.y += heart.vy;
                    heart.vy += 0.4;
                }
            });
            
            // When princess reaches knight, they embrace
            if (princessRunProgress >= 1 && !princessSurprised) {
                princessSurprised = true;
                embraceStartTime = cinematicTimer;
            }
            
            const postEmbraceTime = embraceStartTime === null ? 0 : (cinematicTimer - embraceStartTime);
            if (embraceStartTime !== null && postEmbraceTime > 27500) {
                cinematicPhase = 6;
                cinematicTimer = 0;
                // Show final screen immediately so download can be triggered without extra wait.
                const winDistanceEl = document.getElementById('winDistance');
                if (winDistanceEl) winDistanceEl.textContent = Math.floor(distance) + 'm';
                const winHeartsEl = document.getElementById('winHearts');
                if (winHeartsEl) winHeartsEl.textContent = heartsCollected;
                const winSunEl = document.getElementById('winSunflowers');
                if (winSunEl) winSunEl.textContent = sunflowersCollected;
                const winTeddyEl = document.getElementById('winTeddies');
                if (winTeddyEl) winTeddyEl.textContent = teddiesCollected;
                const winScreenEl = document.getElementById('winScreen');
                if (winScreenEl) winScreenEl.classList.remove('hidden');
            }
            break;
            
        case 6: // PHASE 6 - Resolution
            // Peaceful ending, slow remaining hearts
            heartPile = heartPile.filter(h => h.y < canvas.height + 50);
            break;
    }
}

function drawCinematicEnding() {
    ctx.imageSmoothingEnabled = false;
    const px = (x, y, w, h) => ctx.fillRect(Math.floor(x), Math.floor(y), w, h);
    
    // Helper to draw heart using sprite
    function drawPixelHeart(hx, hy, size, rotation) {
        ctx.save();
        ctx.translate(hx, hy);
        ctx.rotate(rotation || 0);
        
        if (heartSpriteLoaded && processedHeartSprite) {
            // Use heart sprite (1538×1026)
            const targetSize = size;
            const aspectRatio = 1538 / 1026;
            const drawWidth = targetSize * aspectRatio;
            const drawHeight = targetSize;
            ctx.drawImage(processedHeartSprite, 0, 0, processedHeartSprite.width, processedHeartSprite.height, -drawWidth/2, -drawHeight/2, drawWidth, drawHeight);
        } else {
            // Fallback to pixel heart if sprite not loaded
            const s = size / 20;
            ctx.fillStyle = '#ff1493';
            px(-6*s, -6*s, 4*s, 2*s);
            px(2*s, -6*s, 4*s, 2*s);
            px(-8*s, -4*s, 6*s, 2*s);
            px(2*s, -4*s, 6*s, 2*s);
            px(-8*s, -2*s, 16*s, 2*s);
            px(-6*s, 0*s, 12*s, 2*s);
            px(-4*s, 2*s, 8*s, 2*s);
            px(-2*s, 4*s, 4*s, 2*s);
            px(-1*s, 6*s, 2*s, 2*s);
        }
        
        ctx.restore();
    }
    
    // Draw background and ground
    drawBackground();
    drawGround();
    
    // Draw castle using spritesheet Frame C (Empty Tower) - don't draw old pixel castle
    // The tower is drawn as part of drawCinematicPrincess
    
    // Draw heart pile (on ground, behind characters during drowning)
    if (cinematicPhase >= 2 && cinematicPhase <= 4) {
        heartPile.forEach(heart => {
            drawPixelHeart(heart.x, heart.y, heart.size, heart.rotation);
        });
    }
    
    // Draw heart rain (falling)
    heartRain.forEach(heart => {
        if (heart.y > -50 && heart.y < canvas.height + 50) {
            drawPixelHeart(heart.x, heart.y, heart.size, heart.rotation);
        }
    });
    
    // Draw princess (on balcony or in reversal)
    if (princess) {
        drawCinematicPrincess();
    }
    
    // Draw knight (with drowning states)
    drawCinematicKnight();
    
    // Draw floating items (phase 1) - use sprites for sunflower and teddy
    floatingItems.forEach(item => {
        if (item.progress > 0 && item.currentX !== undefined) {
            if (item.type === 'heart') {
                drawPixelHeart(item.currentX, item.currentY, 28, 0);
            } else if (item.type === 'sunflower') {
                // Draw sunflower from spritesheet
                if (elementsSpriteLoaded) {
                    const frame = elementsFrameCache.get(1);
                    if (frame) {
                        const size = 32;
                        ctx.drawImage(frame, 0, 0, 1024, 1536, item.currentX - size/2, item.currentY - size/2, size, size * 1.5);
                    }
                } else {
                    // Fallback pixel sunflower
                    ctx.fillStyle = '#ffd700';
                    px(item.currentX - 10, item.currentY - 10, 20, 20);
                    ctx.fillStyle = '#8b4513';
                    px(item.currentX - 5, item.currentY - 5, 10, 10);
                }
            } else {
                // Draw teddy from spritesheet
                if (elementsSpriteLoaded) {
                    const frame = elementsFrameCache.get(2);
                    if (frame) {
                        const size = 32;
                        ctx.drawImage(frame, 0, 0, 1536, 1024, item.currentX - size/2, item.currentY - size/2, size * 1.5, size);
                    }
                } else {
                    // Fallback pixel teddy
                    ctx.fillStyle = '#8b6914';
                    px(item.currentX - 8, item.currentY - 6, 16, 14);
                    px(item.currentX - 10, item.currentY - 10, 6, 6);
                    px(item.currentX + 4, item.currentY - 10, 6, 6);
                }
            }
        }
    });
    
    // Draw exploding hearts (phase 4-6)
    if (cinematicPhase >= 4) {
        heartPile.forEach(heart => {
            if (heart.vx !== undefined) {
                drawPixelHeart(heart.x, heart.y, heart.size, heart.rotation);
            }
        });
    }
    
    // Draw speech bubbles and effects
    drawCinematicUI();
}

function drawCinematicPrincess() {
    if (!princess) return;
    
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    
    // Use spritesheet for princess
    if (princessSpriteLoaded) {
        const groundY = canvas.height - 60;
        
        // Tower position and size - used for all phases
        const towerHeight = 340; // Much bigger tower
        const emptyTowerRect = PRINCESS_SPRITE_FRAMES[2];
        const towerWidth = Math.round(towerHeight * (emptyTowerRect.sw / emptyTowerRect.sh));
        const towerX = canvas.width - towerWidth - 20;
        const towerY = groundY - towerHeight;
        
        // Phase 5+: Draw empty tower (Frame C) and running/idle princess
        if (cinematicPhase >= 5) {
            // Always draw empty tower (Frame C) - during running AND embrace
            const emptyTowerFrame = princessFrameCache.get(2);
            if (emptyTowerRect && emptyTowerFrame) {
                ctx.drawImage(
                    emptyTowerFrame,
                    0, 0, emptyTowerRect.sw, emptyTowerRect.sh,
                    towerX, towerY, towerWidth, towerHeight
                );
            }
            
            // Only draw princess while running, not during embrace (knight handles embrace)
            if (princessRunProgress < 1) {
                const frameIndex = princess.getPrincessFrame();
                const rect = PRINCESS_SPRITE_FRAMES[frameIndex];
                const processedFrame = princessFrameCache.get(frameIndex);
                
                if (rect && processedFrame) {
                    const startX = canvas.width - 120;
                    // Frame D/E are landscape (1536x1024)
                    const targetHeight = 120;
                    const targetWidth = Math.round(targetHeight * (rect.sw / rect.sh));
                    
                    // Princess should stop with her left edge near knight's right edge
                    const knightTargetX = knight.x + 100 + targetWidth / 2;
                    const currentX = startX - (startX - knightTargetX) * princessRunProgress;
                    
                    const drawX = currentX - targetWidth / 2;
                    // Adjust Y so princess feet touch ground properly
                    const drawY = groundY - targetHeight + 35;
                    
                    ctx.drawImage(
                        processedFrame,
                        0, 0, rect.sw, rect.sh,
                        drawX, drawY, targetWidth, targetHeight
                    );
                }
            }
            // During embrace (princessRunProgress >= 1), don't draw princess - she's with knight
        } else {
            // Princess on balcony (phases 0-4) - draw Frame A or B which includes tower
            const frameIndex = princess.getPrincessFrame();
            const rect = PRINCESS_SPRITE_FRAMES[frameIndex];
            const processedFrame = princessFrameCache.get(frameIndex);
            
            if (rect && processedFrame) {
                // Frame A and B include the tower, so draw them big
                const targetHeight = 340;
                const targetWidth = Math.round(targetHeight * (rect.sw / rect.sh));
                const drawX = canvas.width - targetWidth - 20;
                const drawY = groundY - targetHeight;
                
                ctx.drawImage(
                    processedFrame,
                    0, 0, rect.sw, rect.sh,
                    drawX, drawY, targetWidth, targetHeight
                );
            }
        }
    }
    
    ctx.restore();
}

function drawCinematicKnight() {
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    const px = (x, y, w, h) => ctx.fillRect(Math.floor(x), Math.floor(y), w, h);
    
    const groundY = canvas.height - 60;
    const kx = knight.x;
    
    // Frame I (comeback) should be bigger
    const isFrameI = cinematicPhase === 4 && comebackHappened;
    const targetHeight = isFrameI ? 150 : 120; // Larger for Frame I
    
    // Position knight so feet touch ground
    let ky = groundY - targetHeight + 15;
    
    // Use spritesheet for all cinematic phases
    if (spriteLoaded) {
        const frameIndex = getKnightSpriteFrame();
        const rect = getSpriteSourceRect(frameIndex);
        const processedFrame = getProcessedKnightFrame(frameIndex);

        if (rect && processedFrame) {
            const targetWidth = Math.round(targetHeight * (rect.sw / rect.sh));
            ctx.drawImage(processedFrame, 0, 0, rect.sw, rect.sh, kx - 10, ky, targetWidth, targetHeight);
        }
        
        // Add dramatic effects for comeback phase
        if (cinematicPhase === 4 && comebackHappened) {
            // Dramatic golden lines
            ctx.fillStyle = '#ffd700';
            for (let i = 0; i < 8; i++) {
                const angle = (i / 8) * Math.PI * 2 + Date.now() * 0.002;
                const innerR = 45;
                const outerR = 60 + Math.sin(Date.now() * 0.01 + i) * 8;
                const cx = kx + 30;
                const cy = ky + 35;
                px(cx + Math.cos(angle) * innerR, cy + Math.sin(angle) * innerR, 4, 4);
                px(cx + Math.cos(angle) * outerR, cy + Math.sin(angle) * outerR, 3, 3);
            }
        }
        
        // Floating heart when embracing - use sprite
        if (cinematicPhase >= 5 && princessRunProgress >= 1) {
            const heartY = ky - 35 - Math.sin(Date.now() * 0.003) * 8;
            if (heartSpriteLoaded && processedHeartSprite) {
                const heartSize = 25;
                const aspectRatio = 1538 / 1026;
                ctx.drawImage(processedHeartSprite, 0, 0, processedHeartSprite.width, processedHeartSprite.height, kx + 45, heartY, heartSize * aspectRatio, heartSize);
            } else {
                ctx.fillStyle = '#ff1493';
                px(kx + 50, heartY, 4, 4);
                px(kx + 56, heartY, 4, 4);
                px(kx + 48, heartY + 3, 14, 6);
                px(kx + 51, heartY + 9, 8, 4);
                px(kx + 54, heartY + 13, 2, 2);
            }
        }
        
        // Sweat drop in phase 0
        if (cinematicPhase === 0 && cinematicTimer > 1500) {
            ctx.fillStyle = '#87ceeb';
            px(kx + 58, ky + 5, 3, 5);
        }
    } else {
        // Fallback to pixel art (keep existing code for non-spritesheet fallback)
        drawFullKnight(kx, ky);
    }
    
    ctx.restore();
}

function drawFullKnight(knightX, knightY) {
    ctx.imageSmoothingEnabled = false;
    const px = (x, y, w, h) => ctx.fillRect(Math.floor(x), Math.floor(y), w, h);
    
    // Colors - Western knight styling
    const skinColor = '#ffdbac';
    const hairColor = '#5a3825';
    const armorColor = colorRevealed ? '#708090' : '#555';
    const armorLight = colorRevealed ? '#a8b8c8' : '#777';
    const capeColor = colorRevealed ? '#dc143c' : '#555';
    const capeDark = colorRevealed ? '#8b0000' : '#333';
    const swordColor = colorRevealed ? '#c0c0c0' : '#888';
    
    // Cape
    ctx.fillStyle = capeColor;
    px(knightX, knightY + 10, 12, 48);
    px(knightX - 5, knightY + 35, 10, 25);
    ctx.fillStyle = capeDark;
    px(knightX + 2, knightY + 15, 5, 40);
    
    // Hair (long, flowing)
    ctx.fillStyle = hairColor;
    px(knightX + 5, knightY - 8, 28, 14);
    px(knightX + 25, knightY + 2, 12, 22);
    px(knightX + 2, knightY + 2, 10, 20);
    
    // Face
    ctx.fillStyle = skinColor;
    px(knightX + 10, knightY - 3, 18, 18);
    
    // Eyes
    ctx.fillStyle = '#4a6fa5';
    px(knightX + 13, knightY + 3, 4, 4);
    px(knightX + 21, knightY + 3, 4, 4);
    ctx.fillStyle = '#000';
    px(knightX + 14, knightY + 4, 2, 2);
    px(knightX + 22, knightY + 4, 2, 2);
    ctx.fillStyle = '#fff';
    px(knightX + 14, knightY + 4, 1, 1);
    px(knightX + 22, knightY + 4, 1, 1);
    
    // Eyebrows
    ctx.fillStyle = hairColor;
    px(knightX + 12, knightY, 5, 2);
    px(knightX + 21, knightY, 5, 2);
    
    // Nose
    ctx.fillStyle = '#e8c89c';
    px(knightX + 18, knightY + 7, 2, 3);
    
    // Mouth
    ctx.fillStyle = '#c44';
    px(knightX + 16, knightY + 12, 5, 2);
    
    // Body (armor)
    ctx.fillStyle = armorColor;
    px(knightX + 10, knightY + 16, 20, 28);
    ctx.fillStyle = armorLight;
    px(knightX + 12, knightY + 19, 6, 22);
    
    // Arms
    ctx.fillStyle = armorColor;
    px(knightX + 30, knightY + 18, 8, 20);
    px(knightX, knightY + 18, 8, 20);
    
    // Hands
    ctx.fillStyle = skinColor;
    px(knightX + 31, knightY + 36, 6, 6);
    px(knightX + 1, knightY + 36, 6, 6);
    
    // Sword (in right hand)
    ctx.fillStyle = swordColor;
    px(knightX + 35, knightY + 20, 4, 30);
    ctx.fillStyle = '#ffd700';
    px(knightX + 31, knightY + 48, 12, 4);
    ctx.fillStyle = '#5a3a2a';
    px(knightX + 34, knightY + 52, 6, 10);
    
    // Legs
    ctx.fillStyle = armorColor;
    px(knightX + 12, knightY + 44, 7, 15);
    px(knightX + 21, knightY + 44, 7, 15);
    
    // Boots
    ctx.fillStyle = '#3a2a1a';
    px(knightX + 11, knightY + 56, 9, 5);
    px(knightX + 20, knightY + 56, 9, 5);
}

function drawCinematicUI() {
    ctx.save();
    
    // Typing effect helper - returns typed portion of text
    function getTypedText(text, dialogueKey, startTime, charsPerSecond = 20) {
        const elapsed = cinematicTimer - startTime;
        const charsToShow = Math.floor(elapsed * charsPerSecond / 1000);
        
        // Reset typing when dialogue changes
        if (lastDialogueKey !== dialogueKey) {
            lastDialogueKey = dialogueKey;
            dialogueFullyTyped = false;
        }
        
        if (charsToShow >= text.length) {
            dialogueFullyTyped = true;
            return text;
        }
        return text.substring(0, charsToShow);
    }
    
    // Helper function to draw speech bubble with speaker indicator
    function drawSpeechBubble(x, y, width, height, text, speaker, dialogueKey, startTime, tailSide = 'auto', charsPerSecond = 20) {
        const isKnight = speaker === 'knight';
        const isPrincess = speaker === 'princess';
        const pointerSide = tailSide === 'auto'
            ? (isKnight ? 'left' : (isPrincess ? 'right' : 'down'))
            : tailSide;
        const palette = isKnight
            ? {
                top: '#f8e8d5',
                mid: '#ecd3b6',
                bottom: '#d8b188',
                border: '#5f4128',
                trim: '#c79a62',
                text: '#2f1c0f',
                tagOuter: '#4e331f',
                tagInner: '#6a4529',
                tagText: '#ffe5c7'
            }
            : {
                top: '#ffe8f1',
                mid: '#f6cede',
                bottom: '#e6aec4',
                border: '#7d415c',
                trim: '#d98eae',
                text: '#3a1f2f',
                tagOuter: '#743a53',
                tagInner: '#92516c',
                tagText: '#ffe8f2'
            };
        const corner = 15;

        function drawBubbleBody(px, py, pw, ph) {
            ctx.beginPath();
            ctx.moveTo(px + corner, py);
            ctx.lineTo(px + pw - corner, py);
            ctx.quadraticCurveTo(px + pw, py, px + pw, py + corner);
            ctx.lineTo(px + pw, py + ph - corner);
            ctx.quadraticCurveTo(px + pw, py + ph, px + pw - corner, py + ph);
            ctx.lineTo(px + corner, py + ph);
            ctx.quadraticCurveTo(px, py + ph, px, py + ph - corner);
            ctx.lineTo(px, py + corner);
            ctx.quadraticCurveTo(px, py, px + corner, py);
            ctx.closePath();
        }

        // Shadow
        ctx.fillStyle = 'rgba(26,12,10,0.34)';
        ctx.beginPath();
        ctx.ellipse(x + width / 2 + 4, y + height + 10, width / 2 + 5, 9, 0, 0, Math.PI * 2);
        ctx.fill();

        // Bubble body: gradient parchment + royal trim
        const bubbleGrad = ctx.createLinearGradient(0, y, 0, y + height);
        bubbleGrad.addColorStop(0, palette.top);
        bubbleGrad.addColorStop(0.55, palette.mid);
        bubbleGrad.addColorStop(1, palette.bottom);
        ctx.fillStyle = bubbleGrad;
        ctx.strokeStyle = palette.border;
        ctx.lineWidth = 3;
        drawBubbleBody(x, y, width, height);
        ctx.fill();
        ctx.stroke();

        // Inner trim ring
        ctx.strokeStyle = palette.trim;
        ctx.lineWidth = 1.5;
        drawBubbleBody(x + 3, y + 3, width - 6, height - 6);
        ctx.stroke();

        // Decorative corner studs
        ctx.fillStyle = palette.trim;
        ctx.fillRect(x + 8, y + 7, 3, 3);
        ctx.fillRect(x + width - 11, y + 7, 3, 3);
        ctx.fillRect(x + 8, y + height - 10, 3, 3);
        ctx.fillRect(x + width - 11, y + height - 10, 3, 3);
        
        // Pointer (tail) - positioned based on speaker
        ctx.fillStyle = palette.bottom;
        ctx.strokeStyle = palette.border;
        ctx.lineWidth = 3;
        ctx.beginPath();
        if (pointerSide === 'left') {
            // Pointer on left corner
            ctx.moveTo(x, y + height - 15);
            ctx.lineTo(x - 15, y + height + 5);
            ctx.lineTo(x + 15, y + height);
        } else if (pointerSide === 'right') {
            // Pointer on right corner
            ctx.moveTo(x + width, y + height - 15);
            ctx.lineTo(x + width + 15, y + height + 5);
            ctx.lineTo(x + width - 15, y + height);
        } else if (pointerSide === 'downRight') {
            // Pointer at bottom-right corner
            ctx.moveTo(x + width - 22, y + height);
            ctx.lineTo(x + width + 8, y + height + 18);
            ctx.lineTo(x + width - 6, y + height);
        } else if (pointerSide === 'downMidRight') {
            // Pointer between left edge and center, angled to the right
            const anchor = x + Math.floor(width * 0.38);
            ctx.moveTo(anchor - 12, y + height);
            ctx.lineTo(anchor + 18, y + height + 18);
            ctx.lineTo(anchor + 8, y + height);
        } else {
            // Default down pointer
            ctx.moveTo(x + width/2 - 10, y + height);
            ctx.lineTo(x + width/2, y + height + 20);
            ctx.lineTo(x + width/2 + 10, y + height);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        
        // Cover the line where bubble meets pointer
        ctx.fillStyle = palette.bottom;
        ctx.strokeStyle = palette.bottom;
        ctx.lineWidth = 4;
        if (pointerSide === 'left') {
            ctx.beginPath();
            ctx.moveTo(x + 1, y + height - 18);
            ctx.lineTo(x + 1, y + height - 5);
            ctx.stroke();
        } else if (pointerSide === 'right') {
            ctx.beginPath();
            ctx.moveTo(x + width - 1, y + height - 18);
            ctx.lineTo(x + width - 1, y + height - 5);
            ctx.stroke();
        } else if (pointerSide === 'downRight') {
            ctx.beginPath();
            ctx.moveTo(x + width - 20, y + height - 1);
            ctx.lineTo(x + width - 8, y + height - 1);
            ctx.stroke();
        } else if (pointerSide === 'downMidRight') {
            const anchor = x + Math.floor(width * 0.38);
            ctx.beginPath();
            ctx.moveTo(anchor - 10, y + height - 1);
            ctx.lineTo(anchor + 9, y + height - 1);
            ctx.stroke();
        }

        // Speaker tag for clear attribution
        const speakerLabel = isKnight ? 'KNIGHT' : (isPrincess ? 'PRINCESS' : 'NARRATOR');
        ctx.font = 'bold 10px "Cinzel", Georgia, serif';
        const tagPaddingX = 8;
        const tagHeight = 14;
        const tagWidth = Math.ceil(ctx.measureText(speakerLabel).width) + tagPaddingX * 2;
        const tagX = x + 12;
        const tagY = y - 11;

        ctx.fillStyle = palette.tagOuter;
        ctx.fillRect(tagX, tagY, tagWidth, tagHeight);
        ctx.fillStyle = palette.tagInner;
        ctx.fillRect(tagX + 1, tagY + 1, tagWidth - 2, tagHeight - 2);
        ctx.strokeStyle = palette.border;
        ctx.lineWidth = 2;
        ctx.strokeRect(tagX, tagY, tagWidth, tagHeight);

        ctx.fillStyle = palette.tagText;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(speakerLabel, tagX + tagPaddingX, tagY + tagHeight / 2 + 0.5);


        // Get typed text
        const displayText = startTime ? getTypedText(text, dialogueKey, startTime, charsPerSecond) : text;

        // Text - medieval font, smaller size, wrap if needed
        ctx.fillStyle = palette.text;
        ctx.font = 'bold 13px "Cinzel", Georgia, serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        // Word wrap
        const maxTextWidth = width - 24;
        let lines = [];
        let words = displayText.split(' ');
        let currentLine = '';
        for (let i = 0; i < words.length; i++) {
            let testLine = currentLine + (currentLine ? ' ' : '') + words[i];
            if (ctx.measureText(testLine).width > maxTextWidth && currentLine) {
                lines.push(currentLine);
                currentLine = words[i];
            } else {
                currentLine = testLine;
            }
        }
        if (currentLine) lines.push(currentLine);
        const lineHeight = 16;
        const textY = y + height/2 - (lines.length-1)*lineHeight/2 + 6;
        for (let i = 0; i < lines.length; i++) {
            ctx.fillText(lines[i], x + width/2, textY + i*lineHeight);
        }

        // Typing cursor
        if (startTime && !dialogueFullyTyped) {
            const lastLine = lines[lines.length-1] || '';
            const textWidth = ctx.measureText(lastLine).width;
            ctx.fillStyle = palette.text;
            if (Math.floor(cinematicTimer / 300) % 2 === 0) {
                ctx.fillText('|', x + width/2 + textWidth/2 + 2, textY + (lines.length-1)*lineHeight);
            }
        }

        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
    }
    
    // Phase 0 opening exchange (sequential, slower)
    if (cinematicPhase === 0 && cinematicTimer > 1600 && cinematicTimer < 5600) {
        drawSpeechBubble(
            canvas.width - 440, 40,
            230, 45,
            'Took you long enough, Sir Knight.',
            'princess',
            'phase0',
            1600,
            'auto',
            9
        );
    }

    // Phase 0 follow-up: Knight reply (after princess line)
    if (cinematicPhase === 0 && cinematicTimer > 6000 && cinematicTimer < 9500) {
        drawSpeechBubble(
            knight.x + 95, canvas.height - 235,
            180, 40,
            'There where birds',
            'knight',
            'phase0_knight_reply',
            6000,
            'left',
            8
        );
    }

    // Phase 3: "Oops" when knight is drowning - Princess speaking, slightly more right
    if (cinematicPhase === 3 && knightDrownLevel >= 4) {
        drawSpeechBubble(
            canvas.width - 360, 40,
            120, 45,
            'I wanted dramatic',
            'princess',
            'phase3',
            null
        );
    }
    
    // Phase 4: Comeback explosion effect
    if (cinematicPhase === 4 && comebackHappened) {
        // Screen shake effect (subtle)
        if (cinematicTimer < 500) {
            ctx.save();
            ctx.translate(
                Math.sin(cinematicTimer * 0.1) * 3,
                Math.cos(cinematicTimer * 0.1) * 3
            );
            ctx.restore();
        }
        
        // Dramatic text
        if (cinematicTimer > 600 && cinematicTimer < 5200) {
            ctx.fillStyle = '#ffd700';
            ctx.font = 'bold 28px "Cinzel", Georgia, serif';
            ctx.textAlign = 'center';
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 3;
            ctx.strokeText('THAT TICKLED', canvas.width / 2, 60);
            ctx.fillText('THAT TICKLED', canvas.width / 2, 60);
            ctx.textAlign = 'left';
        }
    }
    
    // Phase 5: Knight and princess conversation - proper positioning
    if (cinematicPhase === 5) {
        // Only show dialogue after princess reaches knight
        if (princessRunProgress >= 1 && embraceStartTime !== null) {
            const embraceTimer = cinematicTimer - embraceStartTime;

            // Flash effect when they embrace
            if (embraceTimer > 200 && embraceTimer < 1200) {
                const flashAlpha = Math.max(0, 0.4 - (embraceTimer - 200) * 0.0004);
                ctx.fillStyle = `rgba(251, 177, 224, ${flashAlpha})`;
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            }
            
            // Heart pops around the couple
            if (embraceTimer > 200 && embraceTimer < 3800) {
                const popSize = 30 + Math.sin(embraceTimer * 0.005) * 10;
                ctx.font = `${popSize}px Arial`;
                ctx.fillText('💖', knight.x + 80, canvas.height - 140);
                ctx.fillText('💕', knight.x - 20, canvas.height - 120);
                ctx.fillText('💗', knight.x + 50, canvas.height - 160);
            }
            
            // Phase 5 dialogue timing (sequential, non-overlapping)
            const line1Start = 1200;
            const line1End = 7000;
            const line2Start = 7600;
            const line2End = 13600;
            const line3Start = 14200;
            const line3End = 19600;
            const line4Start = 20200;
            const line4End = 26200;

            const line1AbsStart = embraceStartTime + line1Start;
            const line2AbsStart = embraceStartTime + line2Start;
            const line3AbsStart = embraceStartTime + line3Start;
            const line4AbsStart = embraceStartTime + line4Start;

            // Knight: first line
            if (embraceTimer > line1Start && embraceTimer < line1End) {
                drawSpeechBubble(
                    knight.x - 60, canvas.height - 235,
                    220, 40,
                    'Was that love… or an assassination attempt?',
                    'knight',
                    'phase5_knight1',
                    line1AbsStart,
                    'downMidRight',
                    8
                );
            }

            // Princess: second line
            if (embraceTimer > line2Start && embraceTimer < line2End) {
                drawSpeechBubble(
                    knight.x + 120, canvas.height - 240,
                    220, 40,
                    'I was being affectionate. You\'re dramatic.',
                    'princess',
                    'phase5_princess1',
                    line2AbsStart,
                    'left',
                    8
                );
            }

            // Knight follow-up
            if (embraceTimer > line3Start && embraceTimer < line3End) {
                drawSpeechBubble(
                    knight.x - 60, canvas.height - 235,
                    220, 40,
                    'Careful. I might return it.',
                    'knight',
                    'phase5_knight2',
                    line3AbsStart,
                    'downMidRight',
                    8
                );
            }

            // Princess: finale line
            if (embraceTimer > line4Start && embraceTimer < line4End) {
                drawSpeechBubble(
                    knight.x + 120, canvas.height - 240,
                    220, 40,
                    'I dare you. \n Happy Valentine\'s Day.',
                    'princess',
                    'phase5_finale',
                    line4AbsStart,
                    'left',
                    8
                );
            }
        }
    }
    
    // Phase 6: hold a soft fade while final modal appears
    if (cinematicPhase === 6) {
        // Semi-transparent overlay only (avoid duplicate "Love Conquers All" text)
        ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    
    ctx.restore();
}

// ========================================
// GAME UPDATE LOOP
// ========================================

let lastFrameTime = Date.now();

function updateGame() {
    const currentTime = Date.now();
    const deltaTime = currentTime - lastFrameTime;
    lastFrameTime = currentTime;
    
    if (gameWon) {
        updateCinematicEnding(deltaTime);
        return;
    }
    
    // Update distance
    distance += gameSpeed * 0.1;
    if (distance >= TARGET_DISTANCE) {
        winGame();
        return; // stop processing collisions
    }

    const distEl = document.getElementById('distance');
    if (distEl) distEl.textContent = Math.floor(distance) + 'm';
    
    // Increase speed gradually (slower progression)
    if (frameCount % 500 === 0 && gameSpeed < 6) {
        gameSpeed += 0.1;
    }
    
    // Update knight
    knight.update(deltaTime);
    if (knight.hasShield && distance >= knight.shieldExpiresAtDistance) {
        knight.hasShield = false;
        knight.shieldExpiresAtDistance = 0;
    }
    
    // Spawn princess
    spawnPrincess();
    
    // Spawn obstacles (stop when princess appears)
    // Add buffer at start - don't spawn for first 3 seconds
    if (!princess && frameCount > 180 && frameCount % 120 === 0) {
        spawnObstacle();
    }
    
    // Spawn collectibles
    if (frameCount % 100 === 0) {
        spawnCollectible();
    }
    
    // Update obstacles
    obstacles.forEach((obstacle, index) => {
        obstacle.update();

        // Eagle special-case: only dangerous when NOT sliding
        if (!obstacle.passed) {
            const knightBox = knight.getHitbox();
            const obsBox = obstacle.getHitbox();

            if (obstacle.type === 'eagle') {
                const horizOverlap =
                    knightBox.x < obsBox.x + obsBox.width &&
                    knightBox.x + knightBox.width > obsBox.x;

                // Ducking/sliding should avoid eagle hits.
                // If the player successfully ducks through, treat that eagle as passed
                // so it cannot kill immediately after the slide animation ends.
                if (knight.state === 'sliding' || knight.sliding) {
                    if (horizOverlap) {
                        obstacle.passed = true;
                    }
                } else {
                    // Only kill if knight's upper body overlaps eagle
                    const knightTop = knightBox.y;
                    const knightBottom = knightBox.y + knightBox.height;

                    const eagleTop = obsBox.y;
                    const eagleBottom = obsBox.y + obsBox.height;

                    const verticalOverlap =
                        knightBottom > eagleTop &&
                        knightTop < eagleBottom;

                    if (verticalOverlap && checkCollision(knightBox, obsBox)) {
                        if (knight.takeDamage()) {
                            endGame();
                            return; // stop further obstacle checks
                        }
                    }
                }
            }


            else {

                // Normal obstacles
                if (checkCollision(knightBox, obsBox)) {
                    if (knight.takeDamage()) {
                        endGame();
                    }
                }

            }
        }

        
        // Mark as passed
        if (obstacle.x + obstacle.width < knight.x && !obstacle.passed) {
            obstacle.passed = true;
        }
        
        // Remove off-screen
        if (obstacle.x + obstacle.width < 0) {
            obstacles.splice(index, 1);
        }
    });
    
    // Update collectibles
    collectibles.forEach((collectible, index) => {
        if (!collectible.collected) {
            collectible.update();
            
            // Check collection - accept either tight collision or horizontal overlap (more forgiving for run-through)
            const kBox = knight.getHitbox();
            const cBox = collectible.getHitbox();
            const horizCollect = kBox.x < cBox.x + cBox.width && kBox.x + kBox.width > cBox.x;
            // Use per-instance mustCollide flag (randomized) to decide if direct collision is required
            // If mustCollide is set, require the knight to be actively jumping and approaching from below
            let isCollected;
            if (collectible.mustCollide) {
                const kBottom = kBox.y + kBox.height;
                const cMid = cBox.y + cBox.height * 0.5;
                const approachingFromBelow = (typeof knight !== 'undefined') ? (knight.jumping && kBottom < cMid) : false;
                isCollected = approachingFromBelow && checkCollision(kBox, cBox);
            } else {
                isCollected = checkCollision(kBox, cBox) || horizCollect;
            }
            if (isCollected) {
                collectible.collected = true;
                
                switch(collectible.type) {
                    case 'heart':
                        heartsCollected++;
                        refreshCollectibleUI();
                        break;
                    case 'sunflower':
                        sunflowersCollected++;
                        knight.hasShield = true; // Sunflower gives shield power
                        knight.shieldExpiresAtDistance = distance + 100; // lasts for 100m
                        refreshCollectibleUI();
                        break;
                    case 'teddy':
                        teddiesCollected++;
                        refreshCollectibleUI();
                        break;
                    case 'gem':
                        // Triple all currently collected items
                        heartsCollected *= 3;
                        sunflowersCollected *= 3;
                        teddiesCollected *= 3;
                        refreshCollectibleUI();
                        break;
                }
            }
        }
        
        if (collectible.x + collectible.width < 0) {
            collectibles.splice(index, 1);
        }
    });
    
    // Check win condition
    if (distance >= TARGET_DISTANCE) {
        winGame();
    }
}

// ========================================
// RENDERING
// ========================================

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Always draw background and ground, even during run phase
    if (gameWon) {
        drawCinematicEnding();
        return;
    }
    drawBackground();
    // Only draw castle after 650m
    if (distance >= PRINCESS_APPEAR_DISTANCE) {
        drawSpriteCastle();
    }
    drawGround();
    obstacles.forEach(obstacle => obstacle.draw());
    collectibles.forEach(collectible => collectible.draw());
    if (princess) {
        princess.draw();
    }
    knight.draw();

    // Global pre-reveal grade: keep grayscale feel with a very light pink tint.
    if (!colorRevealed) {
        ctx.save();
        ctx.fillStyle = 'rgba(251, 177, 224, 0.15)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.restore();
    }
}

// ========================================
// GAME LOOP
// ========================================

function gameLoop() {
    if (!gameRunning) return;
    
    frameCount++;
    
    // Update knight animation frame (alternate every 10 frames)
    animTimer++;
    if (animTimer >= 10) {
        animTimer = 0;
        knightAnimFrame = (knightAnimFrame + 1) % 2;
    }
    
    updateGame();
    draw();
    
    requestAnimationFrame(gameLoop);
}

// ========================================
// GAME STATE MANAGEMENT
// ========================================

function startGame() {
    gameRunning = true;
    gameWon = false;
    colorRevealed = false;
    colorTransitionProgress = 0;
    distance = 0;
    frameCount = 0;
    gameSpeed = 3; // Fixed: was 6, should be 3
    heartsCollected = 0;
    sunflowersCollected = 0;
    teddiesCollected = 0;
    gemSpawnedThisRun = false;
    
    // Reset cinematic state
    cinematicPhase = 0;
    cinematicTimer = 0;
    floatingItems = [];
    heartRain = [];
    heartPile = [];
    knightDrownLevel = 0;
    princessSurprised = false;
    embraceStartTime = null;
    comebackHappened = false;
    princessRunProgress = 0;
    
    knight.reset();
    
    obstacles = [];
    collectibles = [];
    princess = null;
    
    document.body.classList.remove('colorful');
    const distanceEl = document.getElementById('distance'); if (distanceEl) distanceEl.textContent = '0m';
    const scoreEl = document.getElementById('score'); if (scoreEl) scoreEl.textContent = '0';
    const heartsEl = document.getElementById('hearts'); if (heartsEl) heartsEl.textContent = '❤️ 0';
    const sunEl = document.getElementById('sunflowers'); if (sunEl) sunEl.textContent = '🌻 0';
    const teddiesEl = document.getElementById('teddies'); if (teddiesEl) teddiesEl.textContent = '🧸 0';
    const introScreenEl = document.getElementById('introScreen'); if (introScreenEl) introScreenEl.classList.add('hidden');
    const gameOverEl = document.getElementById('gameOver'); if (gameOverEl) gameOverEl.classList.add('hidden');
    const winScreenEl = document.getElementById('winScreen'); if (winScreenEl) winScreenEl.classList.add('hidden');
    const couponTermsEl = document.getElementById('couponTermsModal'); if (couponTermsEl) couponTermsEl.classList.add('hidden');
    const startBtnEl = document.getElementById('startBtn'); if (startBtnEl) startBtnEl.textContent = 'Restart Game';
    
    lastFrameTime = Date.now();
    
    gameLoop();
}

function endGame() {
    gameRunning = false;
    
    const finalScoreEl = document.getElementById('finalScore'); if (finalScoreEl) finalScoreEl.textContent = heartsCollected;
    const finalHeartsEl = document.getElementById('finalHearts'); if (finalHeartsEl) finalHeartsEl.textContent = heartsCollected;
    const finalSunEl = document.getElementById('finalSunflowers'); if (finalSunEl) finalSunEl.textContent = sunflowersCollected;
    const finalTeddyEl = document.getElementById('finalTeddies'); if (finalTeddyEl) finalTeddyEl.textContent = teddiesCollected;
    const gameOverEl2 = document.getElementById('gameOver'); if (gameOverEl2) gameOverEl2.classList.remove('hidden');
}

function winGame() {
    gameRunning = false;
    
    // Start the cinematic ending!
    startCinematicEnding();
    
    // Continue rendering for cinematic
    gameRunning = true;
}

function downloadPrincessCoupon() {
    const couponPath = 'assets/images/coupon2.png';
    const link = document.createElement('a');
    link.href = couponPath;
    link.download = 'special-coupon.png';
    link.rel = 'noopener';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function showCouponTermsModal() {
    const modal = document.getElementById('couponTermsModal');
    const consequences = document.getElementById('termsConsequences');
    const authority = document.getElementById('termsAuthority');
    const acceptBtn = document.getElementById('acceptPowerBtn');

    if (!modal || !consequences || !authority || !acceptBtn) return;

    consequences.checked = false;
    authority.checked = false;
    acceptBtn.disabled = true;
    modal.classList.remove('hidden');
}

function hideCouponTermsModal() {
    const modal = document.getElementById('couponTermsModal');
    if (modal) modal.classList.add('hidden');
}

function updateCouponTermsAcceptState() {
    const consequences = document.getElementById('termsConsequences');
    const authority = document.getElementById('termsAuthority');
    const acceptBtn = document.getElementById('acceptPowerBtn');

    if (!consequences || !authority || !acceptBtn) return;
    acceptBtn.disabled = !(consequences.checked && authority.checked);
}

// ========================================
// INPUT HANDLING
// ========================================

// Keyboard
document.addEventListener('keydown', (e) => {
    if (!gameRunning || gameWon) return;
    
    if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault();
        knight.jump();
    } else if (e.code === 'ArrowDown') {
        e.preventDefault();
        knight.downPressed = true;
        knight.slide();
    }
});

document.addEventListener('keyup', (e) => {
    if (e.code === 'ArrowDown') {
        knight.downPressed = false;
        if (gameRunning && !gameWon && knight.state === 'sliding' && !knight.jumping) {
            knight.state = 'running';
            knight.sliding = false;
        }
    }
});

// Touch/Mobile
let touchStartY = 0;

canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (!gameRunning || gameWon) return;
    
    touchStartY = e.touches[0].clientY;
});

canvas.addEventListener('touchend', (e) => {
    e.preventDefault();
    if (!gameRunning || gameWon) return;
    
    const touchEndY = e.changedTouches[0].clientY;
    const diff = touchStartY - touchEndY;
    
    if (Math.abs(diff) > 30) {
        if (diff > 0) {
            knight.jump(); // Swipe up
        } else {
            knight.slide(); // Swipe down
        }
    } else {
        knight.jump(); // Tap
    }
});

// Mouse click as fallback
canvas.addEventListener('click', () => {
    if (gameRunning && !gameWon) {
        knight.jump();
    }
});

// ========================================
// UI BUTTONS
// ========================================

const startBtnEl = document.getElementById('startBtn'); if (startBtnEl) startBtnEl.addEventListener('click', startGame);
const introStartBtnEl = document.getElementById('introStartBtn'); if (introStartBtnEl) introStartBtnEl.addEventListener('click', startGame);
const restartBtnEl = document.getElementById('restartBtn'); if (restartBtnEl) restartBtnEl.addEventListener('click', startGame);
const playAgainBtnEl = document.getElementById('playAgainBtn'); if (playAgainBtnEl) playAgainBtnEl.addEventListener('click', startGame);
const downloadCouponBtnEl = document.getElementById('downloadCouponBtn'); if (downloadCouponBtnEl) downloadCouponBtnEl.addEventListener('click', showCouponTermsModal);
const acceptPowerBtnEl = document.getElementById('acceptPowerBtn'); if (acceptPowerBtnEl) acceptPowerBtnEl.addEventListener('click', () => { hideCouponTermsModal(); downloadPrincessCoupon(); });
const notReadyBtnEl = document.getElementById('notReadyBtn'); if (notReadyBtnEl) notReadyBtnEl.addEventListener('click', hideCouponTermsModal);
const termsConsequencesEl = document.getElementById('termsConsequences'); if (termsConsequencesEl) termsConsequencesEl.addEventListener('change', updateCouponTermsAcceptState);
const termsAuthorityEl = document.getElementById('termsAuthority'); if (termsAuthorityEl) termsAuthorityEl.addEventListener('change', updateCouponTermsAcceptState);

// ========================================
// INITIAL RENDER
// ========================================


// Normal initial render (no auto-start)
try {
    if (typeof draw === 'function' && ctx) draw();
} catch (e) {
    showErrorOverlay(e && (e.stack || e.message) ? (e.stack || e.message) : String(e));
}

try {
    if (typeof draw === 'function' && ctx) draw();
} catch (e) {
    showErrorOverlay(e && (e.stack || e.message) ? (e.stack || e.message) : String(e));
}

// ===== Debug helpers =====
// Call from the browser console to test only the cinematic ending.
// Example: `testCinematicOnly({ hearts: 40, sunflowers: 6, teddies: 2 })`
let _cinematicTestRAF = null;
window.testCinematicOnly = function(opts = {}) {
    try {
        opts = opts || {};
        // Ensure required globals are set
        heartsCollected = typeof opts.hearts === 'number' ? opts.hearts : (heartsCollected || 20);
        sunflowersCollected = typeof opts.sunflowers === 'number' ? opts.sunflowers : (sunflowersCollected || 5);
        teddiesCollected = typeof opts.teddies === 'number' ? opts.teddies : (teddiesCollected || 2);

        // Create princess object if missing so castle is drawn correctly
        if (!princess) {
            try { princess = new Princess(); } catch (e) { princess = { visible: true, getPrincessFrame: () => 0 }; }
        }
        princess.visible = true;

        // Force color reveal for cinematic look
        colorRevealed = true;
        document.body && document.body.classList && document.body.classList.add('colorful');

        // Start cinematic state
        startCinematicEnding();
        gameWon = true;
        cinematicPhase = typeof opts.phase === 'number' ? opts.phase : 0;
        cinematicTimer = 0;

        // Local loop only for cinematic rendering (doesn't run normal game updates)
        lastFrameTime = Date.now();
        function _loop() {
            const now = Date.now();
            const delta = now - lastFrameTime;
            lastFrameTime = now;
            try {
                updateCinematicEnding(delta);
                drawCinematicEnding();
            } catch (err) {
                console.error('Cinematic test error', err);
                stopCinematicTest();
                return;
            }
            _cinematicTestRAF = requestAnimationFrame(_loop);
        }
        // Start loop
        if (_cinematicTestRAF) cancelAnimationFrame(_cinematicTestRAF);
        _loop();
        console.info('Cinematic test started — call stopCinematicTest() to stop.');
    } catch (err) {
        console.error('Failed to start cinematic test', err);
    }
};

window.stopCinematicTest = function() {
    if (_cinematicTestRAF) {
        cancelAnimationFrame(_cinematicTestRAF);
        _cinematicTestRAF = null;
        console.info('Cinematic test stopped.');
    }
};
