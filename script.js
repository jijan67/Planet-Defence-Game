// Game Variables
let canvas, ctx;
let cW, cH;
let player, bullets = [], asteroids = [], explosions = [];
let playing = false;
let gameOver = false;
let destroyed = 0;
let highScore = localStorage.getItem('planetDefenceHighScore') || 0;
let soundEnabled = true;
let planet = { 
    deg: 0,
    visible: true  // Add visibility state for planet
};
let particleSystems = [];
let lastFrameTime = 0;
let deltaTime = 0;
let gameStartTime = 0;

// Sound management
const sounds = {
    laser: new Audio('https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3'),
    explosion: new Audio('https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3'),
    gameOver: new Audio('https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3'),
    highScore: new Audio('https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3'),
    background: new Audio('https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3')
};

// Initialize sound system
function initSounds() {
    Object.values(sounds).forEach(sound => {
        sound.load();
        sound.addEventListener('error', (e) => {
            console.error('Audio loading error:', e);
        });
    });
    
    sounds.laser.volume = 0.3;
    sounds.explosion.volume = 0.4;
    sounds.gameOver.volume = 0.5;
    sounds.highScore.volume = 0.6;
    sounds.background.volume = 0.2;
    sounds.background.loop = true;
}

// DOM Elements
let startScreen, gameOverScreen, highScoreScreen;
let finalScoreEl, recordScoreEl, newRecordEl, scoreEl, highScoreEl, soundToggle;

// Game Assets
const sprites = {
    planet: new Image(),
    player: new Image(),
    asteroid1: new Image(),
    asteroid2: new Image(),
    asteroid3: new Image(),
    asteroid4: new Image(),
    laser: new Image(),
    explosion: new Image(),
    background: new Image()
};

// Initialize Game
function initGame() {
    // Initialize DOM elements
    canvas = document.getElementById('canvas');
    ctx = canvas.getContext('2d');
    startScreen = document.getElementById('start-screen');
    gameOverScreen = document.getElementById('game-over-screen');
    highScoreScreen = document.getElementById('high-score-screen');
    finalScoreEl = document.getElementById('final-score');
    recordScoreEl = document.getElementById('record-score');
    newRecordEl = document.getElementById('new-record');
    scoreEl = document.getElementById('score');
    highScoreEl = document.getElementById('high-score');
    soundToggle = document.getElementById('sound-toggle');

    // Set up initial state
    updateCanvasSize();
    highScoreEl.textContent = `High Score: ${highScore}`;

    // Load assets
    loadAssets();
}

// Load all game assets
function loadAssets() {
    let assetsLoaded = 0;
    const totalAssets = Object.keys(sprites).length;

    // Load sprite images with correct paths
    sprites.planet.src = 'images/planet.png';
    sprites.player.src = 'images/spaceship.png';
    sprites.asteroid1.src = 'images/asteroid1.png';
    sprites.asteroid2.src = 'images/asteroid2.png';
    sprites.asteroid3.src = 'images/asteroid3.png';
    sprites.asteroid4.src = 'images/asteroid4.png';
    sprites.laser.src = 'images/laser.png';
    sprites.explosion.src = 'images/explosion.png';
    sprites.background.src = 'images/space-background.jpg';

    // Set up load handlers for all sprites
    Object.keys(sprites).forEach(key => {
        const img = sprites[key];
        img.onload = () => {
            assetsLoaded++;
            console.log(`Loaded ${key}`);
            if (assetsLoaded === totalAssets) {
                console.log('All assets loaded');
                setupGame();
            }
        };
        img.onerror = () => {
            console.error(`Failed to load ${key}`);
        };
    });

    // Initialize sounds
    initSounds();
}

// Set up game after assets are loaded
function setupGame() {
    // Set up event listeners
    setupEventListeners();
    
    // Start animation loop
    requestAnimationFrame(gameLoop);
    
    // Show start screen
    startScreen.classList.remove('hidden');
}

// Set up all event listeners
function setupEventListeners() {
    // Canvas event listeners
    canvas.addEventListener('click', handleCanvasClick);
    canvas.addEventListener('mousemove', handleCanvasMouseMove);
    
    // Window resize
    window.addEventListener('resize', updateCanvasSize);
    
    // Button listeners
    document.getElementById('start-button').addEventListener('click', startGame);
    document.getElementById('restart-button').addEventListener('click', restartGame);
    document.getElementById('continue-button').addEventListener('click', continueAfterHighScore);
    
    // Sound toggle
    soundToggle.addEventListener('click', toggleSound);
}

// Handle canvas clicks (shooting)
function handleCanvasClick(e) {
    e.preventDefault();
    
    if (playing) {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        fireBullet(x, y);
    }
}

// Enhanced bullet firing with animation
function fireBullet(targetX, targetY) {
    if (!playing) return;
    
    if (soundEnabled) {
        sounds.laser.currentTime = 0;
        sounds.laser.play().catch(e => console.error('Laser sound play failed:', e));
    }
    
    const angle = Math.atan2(targetX - cW/2, -(targetY - cH/2));
    
    // Calculate bullet start position from ship's front
    const shipFrontOffset = player.height / 2;
    const startX = cW/2 + Math.sin(player.angle) * shipFrontOffset;
    const startY = cH/2 - Math.cos(player.angle) * shipFrontOffset;
    
    // Create muzzle flash
    const flash = document.createElement('div');
    flash.className = 'muzzle-flash';
    flash.style.cssText = `
        left: ${startX}px;
        top: ${startY}px;
        width: 20px;
        height: 20px;
        transform: translate(-50%, -50%);
    `;
    canvas.parentElement.appendChild(flash);
    setTimeout(() => flash.remove(), 150);
    
    // Create bullet trail
    const trail = document.createElement('div');
    trail.className = 'bullet-trail';
    const trailLength = 40;
    trail.style.cssText = `
        left: ${startX}px;
        top: ${startY}px;
        width: 3px;
        height: ${trailLength}px;
        transform-origin: top;
        transform: rotate(${angle}rad) translateX(-50%);
    `;
    canvas.parentElement.appendChild(trail);
    setTimeout(() => trail.remove(), 200);
    
    // Create bullet
    const bullet = {
        x: -8,
        y: -shipFrontOffset - 20, // Start from ship's front
        width: 24,
        height: 48,
        speed: 15,
        angle: angle,
        realX: startX,
        realY: startY,
        targetX: targetX,
        targetY: targetY,
        destroyed: false
    };
    
    bullets.push(bullet);
    
    // Add screen shake effect
    addScreenShake(0.5);
}

// Add screen shake effect
function addScreenShake(intensity) {
    const container = canvas.parentElement;
    const originalTransform = container.style.transform || '';
    
    function shake(frame) {
        if (frame >= 5) {
            container.style.transform = originalTransform;
            return;
        }
        
        const offsetX = (Math.random() - 0.5) * intensity * 2;
        const offsetY = (Math.random() - 0.5) * intensity * 2;
        container.style.transform = `${originalTransform} translate(${offsetX}px, ${offsetY}px)`;
        
        requestAnimationFrame(() => shake(frame + 1));
    }
    
    shake(0);
}

// Handle mouse movement (player rotation)
function handleCanvasMouseMove(e) {
    if (playing) {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        player.angle = Math.atan2(x - cW/2, -(y - cH/2));
    }
}

// Update canvas size on window resize
function updateCanvasSize() {
    cW = canvas.width = window.innerWidth;
    cH = canvas.height = window.innerHeight - 40; // Account for footer
    
    // Center player
    if (player) {
        player.x = cW / 2;
        player.y = cH / 2;
    }
}

// Toggle sound
function toggleSound() {
    soundEnabled = !soundEnabled;
    
    if (soundEnabled) {
        soundToggle.innerHTML = '🔊';
        if (playing) sounds.background.play();
    } else {
        soundToggle.innerHTML = '🔇';
        sounds.background.pause();
    }
}

// Start game with sound initialization
function startGame() {
    initSounds();
    gameStartTime = Date.now();
    resetGame();
    startScreen.classList.add('hidden');
    canvas.classList.add('playing');
    playing = true;
    
    if (soundEnabled) {
        sounds.background.play().catch(e => console.error('Background music play failed:', e));
    }
}

// Restart the game after game over
function restartGame() {
    resetGame();
    gameOverScreen.classList.add('hidden');
    playing = true;
    
    if (soundEnabled) {
        sounds.background.play();
    }
}

// Continue after high score celebration
function continueAfterHighScore() {
    highScoreScreen.classList.add('hidden');
    gameOverScreen.classList.remove('hidden');
}

// Reset game state
function resetGame() {
    player = {
        x: cW / 2,
        y: cH / 2,
        width: 70,
        height: 90,
        angle: 0
    };
    
    // Reset planet visibility
    planet.visible = true;
    
    bullets = [];
    asteroids = [];
    explosions = [];
    particleSystems = [];
    destroyed = 0;
    gameOver = false;
    
    // Update score display
    scoreEl.textContent = '0';
}

// Game loop
function gameLoop(timestamp) {
    // Calculate delta time for smooth animations
    if (!lastFrameTime) lastFrameTime = timestamp;
    deltaTime = (timestamp - lastFrameTime) / 1000; // Convert to seconds
    lastFrameTime = timestamp;
    
    // Clear canvas
    ctx.clearRect(0, 0, cW, cH);
    
    // Draw game elements
    drawGame();
    
    // Update game state if playing
    if (playing) {
        updateGame();
    }
    
    // Continue animation loop
    requestAnimationFrame(gameLoop);
}

// Draw all game elements
function drawGame() {
    // Draw background (handled by CSS)
    
    // Draw planet
    drawPlanet();
    
    // Draw player if game is active
    if (playing || gameOver) {
        drawPlayer();
    }
    
    // Draw active bullets
    if (playing && bullets.length > 0) {
        updateBullets();
    }
    
    // Draw asteroids
    if (playing && asteroids.length > 0) {
        updateAsteroids();
    }
    
    // Draw explosions
    updateExplosions();
    
    // Draw particle systems
    updateParticleSystems();
    
    // Draw score
    if (playing) {
        // Score is shown in HUD elements
        scoreEl.textContent = destroyed;
    }
}

// Draw the planet
function drawPlanet() {
    if (!planet.visible) return; // Don't draw if planet is not visible
    
    ctx.save();
    ctx.translate(cW/2, cH/2);
    
    // Draw planet glow
    const gradient = ctx.createRadialGradient(0, 0, 90, 0, 0, 150);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.1)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 0, 150, 0, Math.PI * 2);
    ctx.fill();
    
    // Rotate planet
    planet.deg += 0.05 * deltaTime * 60;
    ctx.rotate(planet.deg * (Math.PI / 180));
    
    // Draw planet
    ctx.drawImage(sprites.planet, -100, -100, 200, 200);
    
    ctx.restore();
}

// Draw the player spaceship
function drawPlayer() {
    ctx.save();
    ctx.translate(cW/2, cH/2);
    ctx.rotate(player.angle);
    
    // Draw engine flame
    if (playing) {
        ctx.fillStyle = 'rgba(255, 100, 0, 0.7)';
        ctx.beginPath();
        ctx.moveTo(-10, player.height/2);
        ctx.lineTo(0, player.height/2 + 20 + Math.random() * 10);
        ctx.lineTo(10, player.height/2);
        ctx.closePath();
        ctx.fill();
    }
    
    // Draw player ship
    ctx.drawImage(
        sprites.player,
        -player.width/2,
        -player.height/2,
        player.width,
        player.height
    );
    
    ctx.restore();
}

// Update and draw bullets
function updateBullets() {
    for (let i = 0; i < bullets.length; i++) {
        if (!bullets[i].destroyed) {
            const bullet = bullets[i];
            
            ctx.save();
            ctx.translate(cW/2, cH/2);
            ctx.rotate(bullet.angle);
            
            // Draw bullet glow
            ctx.shadowColor = 'rgb(0, 200, 255)';
            ctx.shadowBlur = 10;
            
            // Draw bullet
            ctx.drawImage(
                sprites.laser,
                bullet.x,
                bullet.y -= bullet.speed,
                bullet.width,
                bullet.height
            );
            
            ctx.restore();
            
            // Calculate real coordinates for collision detection
            bullet.realX = cW/2 + Math.sin(bullet.angle) * -bullet.y;
            bullet.realY = cH/2 - Math.cos(bullet.angle) * -bullet.y;
            
            // Check collisions with asteroids
            checkBulletCollisions(bullet, i);
        }
    }
    
    // Remove destroyed bullets
    bullets = bullets.filter(bullet => !bullet.destroyed);
}

// Check bullet collisions with asteroids
function checkBulletCollisions(bullet, bulletIndex) {
    for (let j = 0; j < asteroids.length; j++) {
        if (!asteroids[j].destroyed) {
            const asteroid = asteroids[j];
            const distance = Math.sqrt(
                Math.pow(asteroid.realX - bullet.realX, 2) + 
                Math.pow(asteroid.realY - bullet.realY, 2)
            );
            
            const asteroidRadius = asteroid.width / (2 * asteroid.size);
            const bulletRadius = bullet.width / 4;
            
            if (distance < asteroidRadius + bulletRadius) {
                // Increment score
                destroyed += 1;
                scoreEl.textContent = destroyed;
                
                // Update high score in real-time if current score is higher
                if (destroyed > highScore) {
                    highScore = destroyed;
                    localStorage.setItem('planetDefenceHighScore', highScore);
                    highScoreEl.textContent = `High Score: ${highScore}`;
                    
                    // Add visual feedback for new high score
                    scoreEl.classList.add('high-score-pulse');
                    setTimeout(() => scoreEl.classList.remove('high-score-pulse'), 1000);
                }
                
                // Mark as destroyed
                asteroid.destroyed = true;
                bullet.destroyed = true;
                
                // Create explosion and particles
                createExplosion(asteroid.realX, asteroid.realY, asteroid.size);
                
                // Play explosion sound
                if (soundEnabled) {
                    const explosionSound = sounds.explosion.cloneNode();
                    explosionSound.volume = sounds.explosion.volume;
                    explosionSound.play().catch(e => console.error('Explosion sound play failed:', e));
                }
                
                break;
            }
        }
    }
}

// Enhanced explosion effect
function createExplosion(x, y, size) {
    // Create main explosion
    explosions.push({
        x: x,
        y: y,
        size: size,
        frame: 0,
        maxFrames: 24,
        width: 128,
        height: 128,
        frameX: 0,
        frameY: 0,
        frameWidth: 128,
        frameHeight: 128,
        timer: 0
    });
    
    // Create particle effects
    createParticleSystem(x, y, size);
    
    // Create shockwave
    createShockwave(x, y, size);
    
    if (soundEnabled) {
        sounds.explosion.currentTime = 0;
        sounds.explosion.play().catch(e => console.error('Explosion sound play failed:', e));
    }
}

// Create shockwave effect
function createShockwave(x, y, size) {
    const shockwave = document.createElement('div');
    shockwave.className = 'explosion';
    shockwave.style.cssText = `
        position: absolute;
        left: ${x}px;
        top: ${y}px;
        width: ${100 / size}px;
        height: ${100 / size}px;
        border-radius: 50%;
        background: radial-gradient(circle, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0) 70%);
        transform: translate(-50%, -50%);
    `;
    canvas.parentElement.appendChild(shockwave);
    setTimeout(() => shockwave.remove(), 500);
}

// Planet destruction animation
function planetDestructionAnimation() {
    // Hide the planet immediately when destruction starts
    planet.visible = false;
    
    // Create large explosion at planet center
    createExplosion(cW/2, cH/2, 0.5); // Large central explosion
    
    // Create multiple explosions around the planet
    for(let i = 0; i < 8; i++) {
        const angle = (Math.PI * 2 / 8) * i;
        const distance = 80;
        const x = cW/2 + Math.cos(angle) * distance;
        const y = cH/2 + Math.sin(angle) * distance;
        setTimeout(() => {
            createExplosion(x, y, 1);
        }, i * 100);
    }

    // Create planet fragments
    const fragments = [];
    const fragmentCount = 32; // More fragments for better effect
    const fragmentSize = 40;
    const colors = ['#FF5500', '#FF8800', '#FFAA00', '#FFCC00']; // Fire colors
    
    for (let i = 0; i < fragmentCount; i++) {
        const angle = (Math.PI * 2 / fragmentCount) * i;
        const fragment = document.createElement('div');
        fragment.className = 'planet-fragment';
        
        // Random starting position within planet radius
        const startRadius = Math.random() * 50;
        const startX = cW/2 + Math.cos(angle) * startRadius;
        const startY = cH/2 + Math.sin(angle) * startRadius;
        
        fragment.style.cssText = `
            left: ${startX}px;
            top: ${startY}px;
            width: ${fragmentSize}px;
            height: ${fragmentSize}px;
            background: url(${sprites.planet.src}) center/cover;
            filter: brightness(1.5) drop-shadow(0 0 10px ${colors[Math.floor(Math.random() * colors.length)]});
        `;
        
        // Create glowing trail for each fragment
        const trail = document.createElement('div');
        trail.className = 'fragment-trail';
        trail.style.cssText = `
            position: absolute;
            left: ${startX}px;
            top: ${startY}px;
            width: ${fragmentSize/2}px;
            height: ${fragmentSize * 2}px;
            background: linear-gradient(to bottom, rgba(255,100,0,0.8), transparent);
            transform-origin: center top;
            transform: rotate(${angle}rad);
        `;
        
        canvas.parentElement.appendChild(trail);
        canvas.parentElement.appendChild(fragment);
        
        // Animate fragment
        const speed = 2 + Math.random() * 2;
        const rotation = 360 + Math.random() * 720;
        const distance = 300 + Math.random() * 200;
        
        const animation = fragment.animate([
            { 
                transform: 'translate(-50%, -50%) rotate(0deg)',
                opacity: 1
            },
            { 
                transform: `translate(
                    calc(-50% + ${Math.cos(angle) * distance}px), 
                    calc(-50% + ${Math.sin(angle) * distance}px)
                ) rotate(${rotation}deg)`,
                opacity: 0
            }
        ], {
            duration: 2000,
            easing: 'cubic-bezier(0.4, 0, 0.2, 1)'
        });
        
        // Animate trail
        trail.animate([
            { 
                transform: `rotate(${angle}rad) scale(1)`,
                opacity: 0.8
            },
            { 
                transform: `rotate(${angle}rad) scale(0.1)`,
                opacity: 0
            }
        ], {
            duration: 1000,
            easing: 'ease-out'
        });
        
        fragments.push({ element: fragment, trail, animation });
        
        // Create particle burst
        setTimeout(() => {
            createParticleSystem(startX, startY, 0.5);
        }, i * (2000 / fragmentCount));
    }
    
    // Play destruction sound effects
    if (soundEnabled) {
        // Play multiple explosion sounds for bigger effect
        for(let i = 0; i < 3; i++) {
            setTimeout(() => {
                const explosionSound = sounds.explosion.cloneNode();
                explosionSound.volume = 0.3;
                explosionSound.playbackRate = 0.5 + (i * 0.2); // Different pitches
                explosionSound.play().catch(e => console.error('Explosion sound play failed:', e));
            }, i * 200);
        }
        
        // Play main destruction sound
        setTimeout(() => {
            sounds.gameOver.volume = 0.5;
            sounds.gameOver.play().catch(e => console.error('Game over sound play failed:', e));
        }, 500);
    }
    
    // Remove fragments after animation
    setTimeout(() => {
        fragments.forEach(f => {
            f.element.remove();
            f.trail.remove();
        });
    }, 2000);
}

// Update game state
function updateGame() {
    // Spawn asteroids more frequently
    if (asteroids.length < 10 + Math.floor(destroyed / 8)) { // Increased base asteroids and reduced score threshold
        spawnAsteroid();
    }
    
    // Check for game over
    checkGameOver();
}

// Update and draw asteroids
function updateAsteroids() {
    const planetCenterX = cW/2;
    const planetCenterY = cH/2;
    
    for (let i = 0; i < asteroids.length; i++) {
        if (!asteroids[i].destroyed) {
            const asteroid = asteroids[i];
            
            // Calculate distance to planet
            const distanceToPlanet = Math.sqrt(
                Math.pow(asteroid.realX - planetCenterX, 2) + 
                Math.pow(asteroid.realY - planetCenterY, 2)
            );
            
            // Increase speed based on proximity to planet (gravity effect)
            const gravityMultiplier = Math.max(1, 800 / distanceToPlanet);
            
            // Move asteroid with increased speed near planet
            asteroid.moveDistance += asteroid.speed * gravityMultiplier * deltaTime;
            
            ctx.save();
            ctx.translate(asteroid.startX, asteroid.startY);
            ctx.rotate(asteroid.angle);
            
            // Update rotation
            asteroid.rotation += asteroid.rotationSpeed * deltaTime;
            
            // Draw asteroid
            ctx.save();
            ctx.translate(
                asteroid.moveDistance * Math.cos(0),
                asteroid.moveDistance * Math.sin(0)
            );
            ctx.rotate(asteroid.rotation);
            
            ctx.drawImage(
                sprites[`asteroid${asteroid.type}`],
                -asteroid.width / (2 * asteroid.size),
                -asteroid.height / (2 * asteroid.size),
                asteroid.width / asteroid.size,
                asteroid.height / asteroid.size
            );
            
            ctx.restore();
            ctx.restore();
            
            // Calculate real position for collision detection
            asteroid.realX = asteroid.startX + Math.cos(asteroid.angle) * asteroid.moveDistance;
            asteroid.realY = asteroid.startY + Math.sin(asteroid.angle) * asteroid.moveDistance;
        }
    }
    
    // Remove destroyed asteroids
    asteroids = asteroids.filter(asteroid => !asteroid.destroyed);
}

// Spawn a new asteroid
function spawnAsteroid() {
    // Determine spawn position outside the screen
    let startX, startY, angle;
    
    // Random side of the screen
    const side = Math.floor(Math.random() * 4);
    
    switch (side) {
        case 0: // Top
            startX = Math.random() * cW;
            startY = -100;
            angle = Math.PI / 2 + (Math.random() * 0.5 - 0.25);
            break;
        case 1: // Right
            startX = cW + 100;
            startY = Math.random() * cH;
            angle = Math.PI + (Math.random() * 0.5 - 0.25);
            break;
        case 2: // Bottom
            startX = Math.random() * cW;
            startY = cH + 100;
            angle = -Math.PI / 2 + (Math.random() * 0.5 - 0.25);
            break;
        case 3: // Left
            startX = -100;
            startY = Math.random() * cH;
            angle = 0 + (Math.random() * 0.5 - 0.25);
            break;
    }
    
    const timePlaying = (Date.now() - gameStartTime) / 1000; // Time in seconds
    const speedMultiplier = 1 + (timePlaying / 60); // Speed increases every minute
    
    // Create asteroid with increased speed
    const asteroid = {
        startX: startX,
        startY: startY,
        moveDistance: 0,
        width: 128,
        height: 128,
        realX: startX,
        realY: startY,
        angle: angle,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 3,
        size: 1 + Math.random() * 2,
        speed: (2 + Math.random() * 3 + (destroyed * 0.08)) * speedMultiplier,
        destroyed: false,
        type: Math.floor(Math.random() * 4) + 1  // Random asteroid type (1-4)
    };
    
    asteroids.push(asteroid);
}

// Check for game over (asteroid hitting planet)
function checkGameOver() {
    for (let i = 0; i < asteroids.length; i++) {
        if (!asteroids[i].destroyed) {
            const asteroid = asteroids[i];
            const distance = Math.sqrt(
                Math.pow(asteroid.realX - cW/2, 2) + 
                Math.pow(asteroid.realY - cH/2, 2)
            );
            
            // If asteroid hits planet
            if (distance < 100 + (asteroid.width / (2 * asteroid.size))) {
                gameOver = true;
                playing = false;
                
                // Stop background music
                sounds.background.pause();
                
                // Play game over sound
                if (soundEnabled) {
                    sounds.gameOver.play().catch(e => console.error('Game over sound play failed:', e));
                }
                
                // Run planet destruction animation
                planetDestructionAnimation();
                
                setTimeout(() => {
                    if (destroyed > highScore) {
                        highScore = destroyed;
                        localStorage.setItem('planetDefenceHighScore', highScore);
                        showHighScoreCelebration();
                    } else {
                        showGameOverScreen();
                    }
                }, 2000);
                
                break;
            }
        }
    }
}

// High score celebration
function showHighScoreCelebration() {
    highScoreScreen.classList.remove('hidden');
    newRecordEl.textContent = destroyed;
    newRecordEl.classList.add('high-score-animation');
    
    if (soundEnabled) {
        sounds.highScore.play().catch(e => console.error('High score sound play failed:', e));
    }
    
    // Create celebration effects
    createFireworks();
    createFloatingScore();
}

// Create fireworks animation
function createFireworks() {
    const fireworksContainer = document.querySelector('.fireworks');
    fireworksContainer.innerHTML = '';
    
    // Create multiple fireworks
    for (let i = 0; i < 5; i++) {
        setTimeout(() => {
            const firework = document.createElement('div');
            firework.className = 'firework';
            
            // Random position
            const left = 10 + Math.random() * 80;
            const top = 10 + Math.random() * 80;
            
            // Random color
            const hue = Math.floor(Math.random() * 360);
            
            firework.style.cssText = `
                position: absolute;
                left: ${left}%;
                top: ${top}%;
                width: 6px;
                height: 6px;
                border-radius: 50%;
                background-color: hsl(${hue}, 100%, 75%);
                box-shadow: 0 0 12px 2px hsl(${hue}, 100%, 60%);
                animation: explode 1s forwards;
                z-index: 5;
            `;
            
            fireworksContainer.appendChild(firework);
            
            // Create particles for this firework
            for (let j = 0; j < 30; j++) {
                const particle = document.createElement('div');
                const angle = Math.random() * Math.PI * 2;
                const speed = 2 + Math.random() * 3;
                const size = 1 + Math.random() * 2;
                
                particle.style.cssText = `
                    position: absolute;
                    left: ${left}%;
                    top: ${top}%;
                    width: ${size}px;
                    height: ${size}px;
                    border-radius: 50%;
                    background-color: hsl(${hue}, 100%, 70%);
                    box-shadow: 0 0 4px 1px hsl(${hue}, 100%, 50%);
                    transform: translate(-50%, -50%);
                    animation: particle 1.5s ease-out forwards;
                `;
                
                fireworksContainer.appendChild(particle);
            }
        }, i * 300);
    }
}

// Create floating score animation
function createFloatingScore() {
    const score = destroyed.toString();
    const container = document.createElement('div');
    container.style.cssText = `
        position: absolute;
        left: 50%;
        top: 40%;
        transform: translate(-50%, -50%);
        display: flex;
        gap: 10px;
    `;
    
    score.split('').forEach((digit, i) => {
        const span = document.createElement('span');
        span.textContent = digit;
        span.className = 'celebration-text';
        span.style.animationDelay = `${i * 0.1}s`;
        container.appendChild(span);
    });
    
    highScoreScreen.appendChild(container);
}

// Update and draw explosions
function updateExplosions() {
    for (let i = 0; i < explosions.length; i++) {
        const explosion = explosions[i];
        
        explosion.timer += deltaTime;
        
        if (explosion.timer >= 0.05) { // Frame rate control
            explosion.frame++;
            explosion.timer = 0;
            
            // Update frame coordinates
            explosion.frameX = (explosion.frame % 5) * explosion.frameWidth;
            explosion.frameY = Math.floor(explosion.frame / 5) * explosion.frameHeight;
        }
        
        if (explosion.frame < explosion.maxFrames) {
            ctx.save();
            
            // Draw explosion
            ctx.drawImage(
                sprites.explosion,
                explosion.frameX, explosion.frameY,
                explosion.frameWidth, explosion.frameHeight,
                explosion.x - (explosion.width / explosion.size) / 2,
                explosion.y - (explosion.height / explosion.size) / 2,
                explosion.width / explosion.size,
                explosion.height / explosion.size
            );
            
            ctx.restore();
        }
    }
    
    // Remove finished explosions
    explosions = explosions.filter(explosion => explosion.frame < explosion.maxFrames);
}

// Update and draw particle systems
function updateParticleSystems() {
    for (let i = 0; i < particleSystems.length; i++) {
        const particles = particleSystems[i];
        let allDead = true;
        
        for (let j = 0; j < particles.length; j++) {
            const particle = particles[j];
            
            if (particle.life > 0) {
                allDead = false;
                
                // Update particle position
                particle.x += particle.vx;
                particle.y += particle.vy;
                
                // Decrease life
                particle.life -= deltaTime * 0.8;
                
                // Draw particle
                ctx.save();
                ctx.globalAlpha = particle.life;
                ctx.fillStyle = particle.color;
                ctx.beginPath();
                ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
        }
        
        if (allDead) {
            particleSystems.splice(i, 1);
            i--;
        }
    }
}

// Initialize game when DOM is loaded
window.addEventListener('DOMContentLoaded', initGame);

// Add CSS for fireworks animations
const style = document.createElement('style');
style.textContent = `
@keyframes explode {
    0% { transform: scale(1); opacity: 1; }
    20% { transform: scale(10); opacity: 1; }
    100% { transform: scale(0); opacity: 0; }
}

@keyframes particle {
    0% { opacity: 1; }
    100% { opacity: 0; }
}
`;
document.head.appendChild(style);

// Show game over screen
function showGameOverScreen() {
    gameOverScreen.classList.remove('hidden');
    finalScoreEl.textContent = `Score: ${destroyed}`;
    recordScoreEl.textContent = `Record: ${highScore}`;
    canvas.classList.remove('playing');
}

// Create particle system
function createParticleSystem(x, y, size) {
    const colors = ['#FF5500', '#FFAA00', '#FFFF00', '#FF2200'];
    const particles = [];
    
    const particleCount = Math.floor(20 / size);
    
    for (let i = 0; i < particleCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 1 + Math.random() * 3;
        const particleSize = 2 + Math.random() * 4;
        
        particles.push({
            x: x,
            y: y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            size: particleSize,
            color: colors[Math.floor(Math.random() * colors.length)],
            life: 1.0
        });
    }
    
    particleSystems.push(particles);
}