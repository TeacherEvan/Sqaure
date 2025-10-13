// Welcome Screen Background Animation
class WelcomeAnimation {
    constructor() {
        this.canvas = document.getElementById('welcomeCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.dots = [];
        this.numDots = 150; // Hundreds of dots
        this.animationFrame = null;
        
        this.setupCanvas();
        this.initDots();
        this.animate();
        
        // Handle window resize
        window.addEventListener('resize', () => this.handleResize());
    }
    
    setupCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }
    
    handleResize() {
        this.setupCanvas();
    }
    
    initDots() {
        const colors = [
            '#FF0000', '#FF4500', '#FF6B00', '#FF8C00', '#FFA500',
            '#FFD700', '#FFFF00', '#00FF00', '#00FF7F', '#00FFFF',
            '#0080FF', '#0000FF', '#4B0082', '#8B00FF', '#FF00FF',
            '#FF1493', '#FF69B4', '#00CED1', '#20B2AA', '#3CB371',
            '#9370DB', '#BA55D3', '#FF6347', '#FF4500', '#DC143C'
        ];
        
        for (let i = 0; i < this.numDots; i++) {
            this.dots.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                vx: (Math.random() - 0.5) * 2,
                vy: (Math.random() - 0.5) * 2,
                color: colors[Math.floor(Math.random() * colors.length)],
                size: 3 + Math.random() * 4,
                neighborhoodRadius: 100,
                maxSpeed: 2,
                maxForce: 0.05
            });
        }
    }
    
    // Boids/Flocking algorithm for fish-like movement
    applyFlockingBehavior(dot) {
        let separation = { x: 0, y: 0 };
        let alignment = { x: 0, y: 0 };
        let cohesion = { x: 0, y: 0 };
        let neighborCount = 0;
        
        // Check neighbors
        for (let other of this.dots) {
            if (other === dot) continue;
            
            const dx = other.x - dot.x;
            const dy = other.y - dot.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist < dot.neighborhoodRadius && dist > 0) {
                neighborCount++;
                
                // Separation: steer away from neighbors
                if (dist < 25) {
                    separation.x -= dx / dist;
                    separation.y -= dy / dist;
                }
                
                // Alignment: steer towards average heading of neighbors
                alignment.x += other.vx;
                alignment.y += other.vy;
                
                // Cohesion: steer towards average position of neighbors
                cohesion.x += other.x;
                cohesion.y += other.y;
            }
        }
        
        if (neighborCount > 0) {
            // Average the alignment
            alignment.x /= neighborCount;
            alignment.y /= neighborCount;
            
            // Calculate cohesion center
            cohesion.x = cohesion.x / neighborCount - dot.x;
            cohesion.y = cohesion.y / neighborCount - dot.y;
        }
        
        // Apply forces with different weights
        const separationWeight = 1.5;
        const alignmentWeight = 1.0;
        const cohesionWeight = 1.0;
        
        dot.vx += separation.x * separationWeight * dot.maxForce;
        dot.vy += separation.y * separationWeight * dot.maxForce;
        dot.vx += alignment.x * alignmentWeight * dot.maxForce * 0.1;
        dot.vy += alignment.y * alignmentWeight * dot.maxForce * 0.1;
        dot.vx += cohesion.x * cohesionWeight * dot.maxForce * 0.01;
        dot.vy += cohesion.y * cohesionWeight * dot.maxForce * 0.01;
        
        // Limit speed
        const speed = Math.sqrt(dot.vx * dot.vx + dot.vy * dot.vy);
        if (speed > dot.maxSpeed) {
            dot.vx = (dot.vx / speed) * dot.maxSpeed;
            dot.vy = (dot.vy / speed) * dot.maxSpeed;
        }
    }
    
    updateDots() {
        for (let dot of this.dots) {
            // Apply flocking behavior
            this.applyFlockingBehavior(dot);
            
            // Update position
            dot.x += dot.vx;
            dot.y += dot.vy;
            
            // Wrap around edges
            if (dot.x < 0) dot.x = this.canvas.width;
            if (dot.x > this.canvas.width) dot.x = 0;
            if (dot.y < 0) dot.y = this.canvas.height;
            if (dot.y > this.canvas.height) dot.y = 0;
        }
    }
    
    draw() {
        // Clear with slight fade for trail effect
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw dots
        for (let dot of this.dots) {
            this.ctx.beginPath();
            this.ctx.arc(dot.x, dot.y, dot.size, 0, Math.PI * 2);
            this.ctx.fillStyle = dot.color;
            this.ctx.fill();
        }
    }
    
    animate() {
        this.updateDots();
        this.draw();
        this.animationFrame = requestAnimationFrame(() => this.animate());
    }
    
    stop() {
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }
    }
}

// Initialize welcome animation
let welcomeAnimation = null;

// Start animation when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        welcomeAnimation = new WelcomeAnimation();
    });
} else {
    welcomeAnimation = new WelcomeAnimation();
}

let selectedGridSize = null;

// Grid size selection
document.querySelectorAll('.grid-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.grid-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        selectedGridSize = parseInt(btn.dataset.size);
        document.getElementById('startGame').disabled = false;
    });
});

// Start game
document.getElementById('startGame').addEventListener('click', () => {
    const player1Color = document.getElementById('player1Color').value;
    const player2Color = document.getElementById('player2Color').value;

    // Stop welcome animation
    if (welcomeAnimation) {
        welcomeAnimation.stop();
    }

    document.getElementById('welcomeScreen').classList.remove('active');
    document.getElementById('gameScreen').classList.add('active');

    // Force fullscreen on supported browsers
    if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(err => {
            console.log('Fullscreen not supported or denied');
        });
    }

    game = new DotsAndBoxesGame(selectedGridSize, player1Color, player2Color);
});

// Exit game
document.getElementById('exitGame').addEventListener('click', () => {
    if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => { });
    }

    document.getElementById('gameScreen').classList.remove('active');
    document.getElementById('welcomeScreen').classList.add('active');
    game = null;
    
    // Restart welcome animation
    if (welcomeAnimation) {
        welcomeAnimation = new WelcomeAnimation();
    }
});

// Play again
document.getElementById('playAgain').addEventListener('click', () => {
    document.getElementById('winnerScreen').classList.remove('active');
    document.getElementById('welcomeScreen').classList.add('active');
    
    // Restart welcome animation
    if (welcomeAnimation) {
        welcomeAnimation = new WelcomeAnimation();
    }
});
