// Welcome Screen Background Animation
class WelcomeAnimation {
    constructor() {
        this.canvas = document.getElementById('welcomeCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.dots = [];
        this.numDots = 150; // Hundreds of dots
        this.animationFrame = null;
        this.isDimmed = false;
        this.spatialGrid = null; // For spatial partitioning optimization
        this.gridCellSize = 100; // Size of each cell in spatial grid
        
        this.setupCanvas();
        this.initDots();
        this.animate();
        
        // Handle window resize
        window.addEventListener('resize', () => this.handleResize());
    }
    
    setupCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.initializeSpatialGrid();
    }
    
    handleResize() {
        this.setupCanvas();
    }
    
    // Spatial partitioning for performance optimization
    initializeSpatialGrid() {
        this.gridCols = Math.ceil(this.canvas.width / this.gridCellSize);
        this.gridRows = Math.ceil(this.canvas.height / this.gridCellSize);
        this.spatialGrid = Array(this.gridRows).fill(null).map(() => 
            Array(this.gridCols).fill(null).map(() => [])
        );
    }
    
    updateSpatialGrid() {
        // Clear grid
        for (let row of this.spatialGrid) {
            for (let cell of row) {
                cell.length = 0;
            }
        }
        
        // Assign dots to grid cells
        for (let dot of this.dots) {
            const gridX = Math.floor(dot.x / this.gridCellSize);
            const gridY = Math.floor(dot.y / this.gridCellSize);
            if (gridX >= 0 && gridX < this.gridCols && gridY >= 0 && gridY < this.gridRows) {
                this.spatialGrid[gridY][gridX].push(dot);
            }
        }
    }
    
    getNeighborDots(dot) {
        const gridX = Math.floor(dot.x / this.gridCellSize);
        const gridY = Math.floor(dot.y / this.gridCellSize);
        const neighbors = [];
        
        // Check surrounding cells (3x3 grid around dot)
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                const nx = gridX + dx;
                const ny = gridY + dy;
                if (nx >= 0 && nx < this.gridCols && ny >= 0 && ny < this.gridRows) {
                    neighbors.push(...this.spatialGrid[ny][nx]);
                }
            }
        }
        
        return neighbors;
    }
    
    moveToGameScreen() {
        // Switch canvas to game screen
        const gameCanvas = document.getElementById('gameBackgroundCanvas');
        if (gameCanvas) {
            this.canvas = gameCanvas;
            this.ctx = gameCanvas.getContext('2d');
            this.isDimmed = true;
            this.setupCanvas();
        }
    }
    
    moveBackToWelcome() {
        // Switch canvas back to welcome screen
        const welcomeCanvas = document.getElementById('welcomeCanvas');
        if (welcomeCanvas) {
            this.canvas = welcomeCanvas;
            this.ctx = welcomeCanvas.getContext('2d');
            this.isDimmed = false;
            this.setupCanvas();
        }
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
    
    // Boids/Flocking algorithm for fish-like movement (optimized with spatial partitioning)
    applyFlockingBehavior(dot) {
        let separation = { x: 0, y: 0 };
        let alignment = { x: 0, y: 0 };
        let cohesion = { x: 0, y: 0 };
        let neighborCount = 0;
        
        // Get neighbors using spatial partitioning for better performance
        const nearbyDots = this.getNeighborDots(dot);
        
        // Check neighbors (only nearby dots now, huge performance improvement)
        for (let other of nearbyDots) {
            if (other === dot) continue;
            
            const dx = other.x - dot.x;
            const dy = other.y - dot.y;
            const distSq = dx * dx + dy * dy; // Use squared distance to avoid sqrt
            const maxDistSq = dot.neighborhoodRadius * dot.neighborhoodRadius;
            
            if (distSq < maxDistSq && distSq > 0) {
                neighborCount++;
                
                const dist = Math.sqrt(distSq);
                
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
        // Update spatial grid for efficient neighbor lookups
        this.updateSpatialGrid();
        
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
        // Clear with slight fade for trail effect (dimmed in game mode)
        const fadeAlpha = this.isDimmed ? 0.15 : 0.1;
        const bgColor = this.isDimmed ? 'rgba(255, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.1)';
        this.ctx.fillStyle = bgColor;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw dots (dimmed in game mode)
        const dotAlpha = this.isDimmed ? 0.3 : 1.0;
        for (let dot of this.dots) {
            this.ctx.beginPath();
            this.ctx.arc(dot.x, dot.y, dot.size, 0, Math.PI * 2);
            
            if (this.isDimmed) {
                // Convert hex to rgba with reduced opacity
                const r = parseInt(dot.color.slice(1, 3), 16);
                const g = parseInt(dot.color.slice(3, 5), 16);
                const b = parseInt(dot.color.slice(5, 7), 16);
                this.ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${dotAlpha})`;
            } else {
                this.ctx.fillStyle = dot.color;
            }
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
        triggerFullscreenOnLoad();
    });
} else {
    welcomeAnimation = new WelcomeAnimation();
    triggerFullscreenOnLoad();
}

// Trigger fullscreen as soon as page loads
function triggerFullscreenOnLoad() {
    // Small delay to ensure DOM is ready and user interaction is detected
    setTimeout(() => {
        const elem = document.documentElement;
        if (elem.requestFullscreen) {
            elem.requestFullscreen().catch(err => {
                console.log('Fullscreen on load not supported or denied:', err);
            });
        } else if (elem.webkitRequestFullscreen) { // Safari
            elem.webkitRequestFullscreen();
        } else if (elem.msRequestFullscreen) { // IE11
            elem.msRequestFullscreen();
        } else if (elem.mozRequestFullScreen) { // Firefox
            elem.mozRequestFullScreen();
        }
    }, 100);
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

    // Keep welcome animation running but move to game screen
    if (welcomeAnimation) {
        welcomeAnimation.moveToGameScreen();
    }

    document.getElementById('welcomeScreen').classList.remove('active');
    document.getElementById('gameScreen').classList.add('active');

    // Force fullscreen on supported browsers with cross-browser support
    const elem = document.documentElement;
    if (elem.requestFullscreen) {
        elem.requestFullscreen().catch(err => {
            console.log('Fullscreen not supported or denied:', err);
        });
    } else if (elem.webkitRequestFullscreen) { // Safari
        elem.webkitRequestFullscreen();
    } else if (elem.msRequestFullscreen) { // IE11
        elem.msRequestFullscreen();
    } else if (elem.mozRequestFullScreen) { // Firefox
        elem.mozRequestFullScreen();
    }

    game = new DotsAndBoxesGame(selectedGridSize, player1Color, player2Color);
});

// Exit game
document.getElementById('exitGame').addEventListener('click', () => {
    // Exit fullscreen with cross-browser support
    if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => { });
    } else if (document.webkitExitFullscreen) { // Safari
        document.webkitExitFullscreen();
    } else if (document.msExitFullscreen) { // IE11
        document.msExitFullscreen();
    } else if (document.mozCancelFullScreen) { // Firefox
        document.mozCancelFullScreen();
    }

    document.getElementById('gameScreen').classList.remove('active');
    document.getElementById('welcomeScreen').classList.add('active');
    game = null;
    
    // Move animation back to welcome screen
    if (welcomeAnimation) {
        welcomeAnimation.moveBackToWelcome();
    }
});

// Play again
document.getElementById('playAgain').addEventListener('click', () => {
    document.getElementById('winnerScreen').classList.remove('active');
    document.getElementById('welcomeScreen').classList.add('active');
    
    // Move animation back to welcome screen
    if (welcomeAnimation) {
        welcomeAnimation.moveBackToWelcome();
    }
});
