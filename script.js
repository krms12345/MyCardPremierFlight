const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const cardImage = document.getElementById('cardImage');
const appleImage = document.getElementById('appleImage');
const googleImage = document.getElementById('googleImage');
const posImage = document.getElementById('posImage');

// UI Elements
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const scoreDisplay = document.getElementById('score-display');
const roeDisplay = document.getElementById('roe-display');
const npsDisplay = document.getElementById('nps-display');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');
const finalScoreDisplay = document.getElementById('final-score');
const bestScoreDisplay = document.getElementById('best-score');
const finalRoeDisplay = document.getElementById('final-roe');
const finalNpsDisplay = document.getElementById('final-nps');

// Game Constants and Variables
const CANVAS_WIDTH = 400;
const CANVAS_HEIGHT = 600;

// Card dimensions (scaled down from original ratio)
const CARD_WIDTH = 64;
const CARD_HEIGHT = 40;

let frames = 0;
let score = 0;
let bestScore = localStorage.getItem('myCardBestScore') || 0;
let gameState = 'START'; // START, PLAYING, GAMEOVER

let milestoneTimer = 0;
let milestoneText = '';
let npsMilestoneTimer = 0;
let npsMilestoneText = '';
let currentROE = 0;
let currentNPS = 0;

let celebrationParticles = [];

function triggerCelebration() {
    for (let i = 0; i < 60; i++) {
        celebrationParticles.push({
            x: CANVAS_WIDTH / 2,
            y: CANVAS_HEIGHT / 2,
            vx: (Math.random() - 0.5) * 10,
            vy: (Math.random() - 0.5) * 10 - 2,
            life: 60 + Math.random() * 40,
            color: ['#ffcc00', '#d9272e', '#4285f4', '#34a853', '#ffffff', '#e3000f'][Math.floor(Math.random() * 6)]
        });
    }
}

function updateAndDrawCelebrations() {
    for (let i = 0; i < celebrationParticles.length; i++) {
        let p = celebrationParticles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += gravity; // Gravity pull
        p.life--;
        
        if (p.life > 0) {
            ctx.fillStyle = p.color;
            ctx.globalAlpha = p.life / 100;
            ctx.beginPath();
            ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1.0;
        } else {
            celebrationParticles.splice(i, 1);
            i--;
        }
    }
}

function checkMilestone(oldScore, newScore) {
    if (newScore > 0 && Math.floor(newScore / 20) > Math.floor(oldScore / 20)) {
        currentROE += 1;
        roeDisplay.innerText = `ROE: ${currentROE}%`;
        milestoneText = '+1% ROE';
        milestoneTimer = 120;
        
        if (currentROE > 0 && currentROE % 5 === 0) {
            triggerCelebration();
        }
    }
}

// Physics
const gravity = 0.25;
const jumpStrength = -5.5;

// The Player Object (MyCard)
const card = {
    x: 50,
    y: 150,
    velocity: 0,
    rotation: 0,
    
    draw: function() {
        ctx.save();
        ctx.translate(this.x + CARD_WIDTH / 2, this.y + CARD_HEIGHT / 2);
        
        // Rotate based on velocity
        this.rotation = Math.min(Math.PI / 4, Math.max(-Math.PI / 4, (this.velocity * 0.1)));
        ctx.rotate(this.rotation);
        
        // Add shadow for premium feel
        ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
        ctx.shadowBlur = 10;
        ctx.shadowOffsetY = 5;
        
        // Draw the image
        if (cardImage.complete) {
            ctx.drawImage(cardImage, -CARD_WIDTH / 2, -CARD_HEIGHT / 2, CARD_WIDTH, CARD_HEIGHT);
        } else {
            // Fallback rectangle if image not loaded
            ctx.fillStyle = '#d4a373';
            ctx.fillRect(-CARD_WIDTH / 2, -CARD_HEIGHT / 2, CARD_WIDTH, CARD_HEIGHT);
        }
        
        ctx.restore();
    },
    
    update: function() {
        this.velocity += gravity;
        this.y += this.velocity;
        
        // Floor collision
        if (this.y + CARD_HEIGHT >= CANVAS_HEIGHT) {
            this.y = CANVAS_HEIGHT - CARD_HEIGHT;
            gameOver();
        }
        
        // Ceiling collision
        if (this.y <= 0) {
            this.y = 0;
            this.velocity = 0;
        }
    },
    
    jump: function() {
        this.velocity = jumpStrength;
    },
    
    reset: function() {
        this.y = 150;
        this.velocity = 0;
        this.rotation = 0;
    }
};

// Obstacles (Flying horizontally)
const obstacles = {
    items: [],
    width: 64,
    height: 40,
    dx: 3, // slightly faster for more challenge
    
    draw: function() {
        for (let i = 0; i < this.items.length; i++) {
            let p = this.items[i];
            
            // Skip drawing if it's a collected bonus
            if (p.isBonus && p.collected) continue;
            
            let eX = p.x;
            let eY = p.y;
            let eW = this.width;
            let eH = this.height;
            
            // Determine colors based on bank type
            let bgColor = '#222';
            let textColor = '#fff';
            let hasChip = false;
            
            if (p.type === 'CBA') {
                bgColor = '#ffcc00'; textColor = '#000'; hasChip = true;
            } else if (p.type === 'ANZ') {
                bgColor = '#004165'; textColor = '#fff'; hasChip = true;
            } else if (p.type === 'WBC') {
                bgColor = '#d9272e'; textColor = '#fff'; hasChip = true;
            } else if (p.type === 'NAB') {
                bgColor = '#000000'; textColor = '#fff'; hasChip = true;
            } else if (p.type === 'Apple Pay' || p.type === 'Google Pay') {
                bgColor = '#ffffff'; textColor = '#333'; hasChip = false;
            } else if (p.type === 'POS Terminal') {
                bgColor = '#444444'; textColor = '#39ff14'; hasChip = false;
            }
            
            if (p.isBonus) {
                ctx.shadowColor = 'rgba(212, 163, 115, 0.8)';
                ctx.shadowBlur = 15;
            }
            
            let isImageDrawn = false;
            // Draw card body
            if (p.type === 'Apple Pay' && appleImage.complete && appleImage.naturalWidth > 0) {
                ctx.drawImage(appleImage, eX, eY, eW, eH);
                isImageDrawn = true;
            } else if (p.type === 'Google Pay' && googleImage.complete && googleImage.naturalWidth > 0) {
                ctx.drawImage(googleImage, eX, eY, eW, eH);
                isImageDrawn = true;
            } else if (p.type === 'POS Terminal' && posImage.complete && posImage.naturalWidth > 0) {
                ctx.drawImage(posImage, eX, eY, eW, eH);
                isImageDrawn = true;
            } else {
                ctx.fillStyle = bgColor;
                if (ctx.roundRect) {
                    ctx.beginPath();
                    ctx.roundRect(eX, eY, eW, eH, [5]);
                    ctx.fill();
                } else {
                    ctx.fillRect(eX, eY, eW, eH);
                }
            }
            
            ctx.shadowBlur = 0; // reset shadow
            
            // Add red outline if it's a bonus
            if (p.isBonus) {
                ctx.strokeStyle = '#ff0000';
                ctx.lineWidth = 2;
                if (ctx.roundRect) {
                    ctx.beginPath();
                    ctx.roundRect(eX, eY, eW, eH, [5]);
                    ctx.stroke();
                } else {
                    ctx.strokeRect(eX, eY, eW, eH);
                }
            }
            
            if (!isImageDrawn) {
                if (hasChip) {
                    // Draw chip
                    ctx.fillStyle = '#e6d3a8'; // Goldish chip color
                    ctx.fillRect(eX + 8, eY + 14, 12, 12);
                }
                
                if (p.type === 'POS Terminal') {
                    // Screen
                    ctx.fillStyle = '#222';
                    ctx.fillRect(eX + 4, eY + 4, eW - 8, 14);
                    // Keypad
                    ctx.fillStyle = '#111';
                    for(let r=0; r<2; r++) {
                        for(let c=0; c<3; c++) {
                            ctx.fillRect(eX + 12 + c*14, eY + 22 + r*7, 8, 4);
                        }
                    }
                }
                
                // Special accents
                if (p.type === 'NAB') {
                    ctx.fillStyle = '#e3000f'; // NAB Red
                    ctx.beginPath();
                    ctx.arc(eX + eW - 12, eY + 12, 4, 0, Math.PI * 2);
                    ctx.fill();
                } else if (p.type === 'Google Pay') {
                    // Google colored dots fallback
                    const colors = ['#4285f4', '#ea4335', '#fbbc04', '#34a853'];
                    for(let c=0; c<4; c++) {
                        ctx.fillStyle = colors[c];
                        ctx.beginPath();
                        ctx.arc(eX + 12 + c*8, eY + 12, 3, 0, Math.PI * 2);
                        ctx.fill();
                    }
                }
                
                // Text
                ctx.fillStyle = textColor;
                ctx.textAlign = 'right';
                
                if (p.type === 'POS Terminal') {
                    ctx.font = 'bold 9px monospace';
                    ctx.fillText('TAP', eX + eW - 6, eY + 15);
                } else if (p.type === 'Apple Pay' || p.type === 'Google Pay') {
                    ctx.font = 'bold 10px sans-serif';
                    ctx.fillText(p.type, eX + eW - 6, eY + 32);
                } else {
                    ctx.font = 'bold 12px sans-serif';
                    ctx.fillText(p.type, eX + eW - 8, eY + 32);
                }
            }
        }
    },
    
    update: function() {
        // Add new obstacle every 70 frames
        if (frames % 70 === 0) {
            let yPosition = Math.random() * (CANVAS_HEIGHT - this.height - 40) + 20;
            
            // Determine type (20% bonus, otherwise split between obstacles)
            let type = '';
            let isBonus = false;
            let rand = Math.random();
            
            if (rand < 0.2) {
                isBonus = true;
                const bonusTypes = ['NAB', 'Apple Pay', 'Google Pay', 'POS Terminal'];
                type = bonusTypes[Math.floor(Math.random() * bonusTypes.length)];
            }
            else if (rand < 0.46) type = 'CBA';
            else if (rand < 0.73) type = 'ANZ';
            else type = 'WBC';
            
            this.items.push({
                x: CANVAS_WIDTH,
                y: yPosition,
                type: type,
                isBonus: isBonus,
                passed: false,
                collected: false
            });
        }
        
        let currentSpeed = this.dx + Math.floor(score / 100) * 0.5;
        
        for (let i = 0; i < this.items.length; i++) {
            let p = this.items[i];
            p.x -= currentSpeed;
            
            // Remove off-screen obstacles
            if (p.x + this.width < 0) {
                this.items.shift();
                i--;
                continue;
            }
            
            // Collision detection (AABB)
            if (card.x + CARD_WIDTH > p.x && 
                card.x < p.x + this.width &&
                card.y + CARD_HEIGHT > p.y &&
                card.y < p.y + this.height) {
                
                if (p.isBonus) {
                    if (!p.collected) {
                        let oldScore = score;
                        score += 5; // Bonus points!
                        checkMilestone(oldScore, score);
                        if (p.type === 'NAB') {
                            currentNPS++;
                            npsDisplay.innerText = `NPS: ${currentNPS}`;
                            npsMilestoneText = '+1 NPS';
                            npsMilestoneTimer = 120;
                            if (currentNPS > 0 && currentNPS % 5 === 0) {
                                triggerCelebration();
                            }
                        }
                        p.collected = true;
                        scoreDisplay.innerText = score;
                    }
                } else {
                    gameOver();
                }
            }
            
            // Score update for dodging obstacle
            if (p.x + this.width < card.x && !p.passed && !p.isBonus) {
                let oldScore = score;
                score++;
                checkMilestone(oldScore, score);
                p.passed = true;
                scoreDisplay.innerText = score;
            }
        }
    },
    
    reset: function() {
        this.items = [];
    }
};

// Background effect (subtle moving lines/particles)
const bg = {
    particles: [],
    
    init: function() {
        for(let i=0; i<30; i++) {
            this.particles.push({
                x: Math.random() * CANVAS_WIDTH,
                y: Math.random() * CANVAS_HEIGHT,
                size: Math.random() * 2 + 1,
                speed: Math.random() * 1 + 0.5,
                opacity: Math.random() * 0.5 + 0.1
            });
        }
    },
    
    draw: function() {
        ctx.fillStyle = '#1a1210';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        
        this.particles.forEach(p => {
            ctx.fillStyle = `rgba(212, 163, 115, ${p.opacity})`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
            
            if (gameState === 'PLAYING') {
                p.x -= p.speed;
                if (p.x < 0) p.x = CANVAS_WIDTH;
            }
        });
    }
};

bg.init();

// Game Loop
let lastTime = 0;
const targetFPS = 60;
const frameInterval = 1000 / targetFPS;

function loop(timestamp) {
    requestAnimationFrame(loop);
    
    if (!lastTime) lastTime = timestamp;
    let elapsed = timestamp - lastTime;
    
    // Cap at target FPS
    if (elapsed > frameInterval) {
        lastTime = timestamp - (elapsed % frameInterval);
        
        // Clear canvas and draw background
        bg.draw();
        
        if (gameState === 'PLAYING') {
            obstacles.update();
            card.update();
        }
        
        obstacles.draw();
        card.draw();
        
        if (milestoneTimer > 0) {
            ctx.save();
            ctx.fillStyle = `rgba(212, 163, 115, ${Math.min(1, milestoneTimer / 30)})`; // Fades out
            ctx.font = 'bold 36px Outfit, sans-serif';
            ctx.textAlign = 'center';
            ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
            ctx.shadowBlur = 10;
            ctx.shadowOffsetY = 2;
            ctx.fillText(milestoneText, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 3 - (120 - milestoneTimer) * 0.5);
            ctx.restore();
            
            if (gameState === 'PLAYING') {
                milestoneTimer--;
            }
        }
        
        if (npsMilestoneTimer > 0) {
            ctx.save();
            ctx.fillStyle = `rgba(227, 0, 15, ${Math.min(1, npsMilestoneTimer / 30)})`; // NAB Red fade out
            ctx.font = 'bold 36px Outfit, sans-serif';
            ctx.textAlign = 'center';
            ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
            ctx.shadowBlur = 10;
            ctx.shadowOffsetY = 2;
            ctx.fillText(npsMilestoneText, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 3 + 40 - (120 - npsMilestoneTimer) * 0.5);
            ctx.restore();
            
            if (gameState === 'PLAYING') {
                npsMilestoneTimer--;
            }
        }
        
        updateAndDrawCelebrations();
        
        if (gameState === 'PLAYING') {
            frames++;
        }
    }
}

// Controls
function jumpAction() {
    if (gameState === 'START' || gameState === 'GAMEOVER') return;
    card.jump();
}

window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        if (gameState === 'PLAYING') {
            jumpAction();
        } else if (gameState === 'START') {
            startGame();
        } else if (gameState === 'GAMEOVER') {
            // Optional: prevent instant restart on game over
        }
    }
});

canvas.addEventListener('mousedown', jumpAction);
canvas.addEventListener('touchstart', (e) => {
    e.preventDefault(); // Prevent scrolling
    jumpAction();
});

// Game State Management
function startGame() {
    gameState = 'PLAYING';
    startScreen.classList.remove('active');
    scoreDisplay.style.opacity = '1';
    roeDisplay.style.opacity = '1';
    npsDisplay.style.opacity = '1';
    scoreDisplay.innerText = score;
    card.jump(); // Initial jump
}

function gameOver() {
    gameState = 'GAMEOVER';
    
    // Update Best Score
    if (score > bestScore) {
        bestScore = score;
        localStorage.setItem('myCardBestScore', bestScore);
    }
    
    // Update UI
    scoreDisplay.style.opacity = '0';
    roeDisplay.style.opacity = '0';
    npsDisplay.style.opacity = '0';
    finalScoreDisplay.innerText = score;
    bestScoreDisplay.innerText = bestScore;
    finalRoeDisplay.innerText = `${currentROE}%`;
    finalNpsDisplay.innerText = currentNPS;
    
    gameOverScreen.classList.add('active');
}

function resetGame() {
    score = 0;
    frames = 0;
    milestoneTimer = 0;
    npsMilestoneTimer = 0;
    celebrationParticles = [];
    currentROE = 0;
    currentNPS = 0;
    scoreDisplay.innerText = score;
    roeDisplay.innerText = `ROE: ${currentROE}%`;
    npsDisplay.innerText = `NPS: ${currentNPS}`;
    card.reset();
    obstacles.reset();
    gameState = 'START';
    gameOverScreen.classList.remove('active');
    startScreen.classList.add('active');
}

// Event Listeners for UI Buttons
startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', resetGame);

// Start the loop
cardImage.onload = () => {
    requestAnimationFrame(loop);
};

// Fallback if image fails to load or is already loaded
if (cardImage.complete) {
    requestAnimationFrame(loop);
}
