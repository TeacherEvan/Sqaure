class DotsAndBoxesGame {
    constructor(gridSize, player1Color, player2Color) {
        this.gridSize = gridSize;
        this.player1Color = player1Color;
        this.player2Color = player2Color;
        this.currentPlayer = 1;
        this.scores = { 1: 0, 2: 0 };
        this.lines = new Set();
        this.squares = {};
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.dotRadius = 1.6; // 5 times smaller than 8
        this.lineWidth = 2; // Doubled from 1 for better visibility
        this.selectedDot = null;
        this.pulsatingLines = [];

        // Multi-touch support
        this.activeTouches = new Map(); // Track multiple touches by identifier
        this.touchVisuals = []; // Visual feedback for touch points

        // Animation system for completed squares
        this.squareAnimations = []; // Active square animations
        this.particles = []; // Particle effects for celebrations
        this.kissEmojis = []; // Kiss emoji animations for completed squares

        // Zoom state
        this.zoomLevel = 1;
        this.zoomTargetX = 0;
        this.zoomTargetY = 0;
        this.isZooming = false;

        this.setupCanvas();
        this.setupEventListeners();
        this.draw();
        this.updateUI();
        this.animate();
    }

    setupCanvas() {
        const container = this.canvas.parentElement;
        const maxWidth = container.clientWidth - 40;
        const maxHeight = container.clientHeight - 40;

        // Calculate optimal grid dimensions for landscape
        // If gridSize is passed as a single number, create landscape layout
        if (typeof this.gridSize === 'number') {
            const aspectRatio = maxWidth / maxHeight;

            // Optimize grid for landscape (width > height)
            if (aspectRatio > 1.5) {
                // Calculate cols and rows to fill landscape nicely
                const totalSquares = (this.gridSize - 1) * (this.gridSize - 1);
                this.gridCols = Math.ceil(Math.sqrt(totalSquares * aspectRatio));
                this.gridRows = Math.ceil(totalSquares / (this.gridCols - 1)) + 1;

                // Ensure we have at least the minimum dimensions
                this.gridCols = Math.max(this.gridCols, Math.ceil(this.gridSize * 1.2));
                this.gridRows = Math.max(this.gridRows, Math.ceil(this.gridSize * 0.6));
            } else {
                // Use square grid for non-landscape displays
                this.gridCols = this.gridSize;
                this.gridRows = this.gridSize;
            }
        } else {
            // If gridSize is an object with rows and cols
            this.gridCols = this.gridSize.cols || this.gridSize;
            this.gridRows = this.gridSize.rows || this.gridSize;
        }

        // Calculate cell size based on available space
        const cellSizeWidth = Math.floor(maxWidth / (this.gridCols - 1));
        const cellSizeHeight = Math.floor(maxHeight / (this.gridRows - 1));
        const cellSize = Math.min(cellSizeWidth, cellSizeHeight);

        // Allow smaller cell sizes now that dots are smaller
        this.cellSize = Math.max(8, Math.min(cellSize, 40));

        this.canvas.width = (this.gridCols - 1) * this.cellSize + 40;
        this.canvas.height = (this.gridRows - 1) * this.cellSize + 40;
        this.offsetX = 20;
        this.offsetY = 20;

        // Remove old event listeners if they exist
        const oldCanvas = this.canvas;
        const newCanvas = oldCanvas.cloneNode(true);
        oldCanvas.parentNode.replaceChild(newCanvas, oldCanvas);
        this.canvas = newCanvas;
        this.ctx = newCanvas.getContext('2d');

        // Multi-touch event listeners
        this.canvas.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
        this.canvas.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
        this.canvas.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false });
        this.canvas.addEventListener('touchcancel', this.handleTouchEnd.bind(this), { passive: false });

        // Keep mouse support
        this.canvas.addEventListener('click', this.handleClick.bind(this));
        this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));

        // Start animation loop
        this.animate();
    }

    setupEventListeners() {
        window.addEventListener('resize', () => {
            this.setupCanvas();
            this.draw();
        });
    }

    getNearestDot(x, y) {
        const col = Math.round((x - this.offsetX) / this.cellSize);
        const row = Math.round((y - this.offsetY) / this.cellSize);

        if (row >= 0 && row < this.gridRows && col >= 0 && col < this.gridCols) {
            const dotX = this.offsetX + col * this.cellSize;
            const dotY = this.offsetY + row * this.cellSize;
            const distance = Math.sqrt(Math.pow(x - dotX, 2) + Math.pow(y - dotY, 2));

            if (distance <= this.cellSize * 0.3) {
                return { row, col };
            }
        }
        return null;
    }

    handleMouseMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const dot = this.getNearestDot(x, y);
        if (dot && this.selectedDot && this.areAdjacent(this.selectedDot, dot)) {
            this.canvas.style.cursor = 'pointer';
        } else if (dot) {
            this.canvas.style.cursor = 'pointer';
        } else {
            this.canvas.style.cursor = 'default';
        }
    }

    areAdjacent(dot1, dot2) {
        const rowDiff = Math.abs(dot1.row - dot2.row);
        const colDiff = Math.abs(dot1.col - dot2.col);
        return (rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1);
    }

    getLineKey(dot1, dot2) {
        const [first, second] = [dot1, dot2].sort((a, b) =>
            a.row === b.row ? a.col - b.col : a.row - b.row
        );
        return `${first.row},${first.col}-${second.row},${second.col}`;
    }

    checkForSquares(lineKey) {
        const [start, end] = lineKey.split('-').map(s => {
            const [row, col] = s.split(',').map(Number);
            return { row, col };
        });

        const completedSquares = [];
        const isHorizontal = start.row === end.row;

        if (isHorizontal) {
            // Check square above
            if (start.row > 0) {
                const squareKey = `${start.row - 1},${Math.min(start.col, end.col)}`;
                if (this.isSquareComplete(start.row - 1, Math.min(start.col, end.col))) {
                    this.squares[squareKey] = this.currentPlayer;
                    completedSquares.push(squareKey);
                }
            }
            // Check square below
            if (start.row < this.gridRows - 1) {
                const squareKey = `${start.row},${Math.min(start.col, end.col)}`;
                if (this.isSquareComplete(start.row, Math.min(start.col, end.col))) {
                    this.squares[squareKey] = this.currentPlayer;
                    completedSquares.push(squareKey);
                }
            }
        } else {
            // Check square to the left
            if (start.col > 0) {
                const squareKey = `${Math.min(start.row, end.row)},${start.col - 1}`;
                if (this.isSquareComplete(Math.min(start.row, end.row), start.col - 1)) {
                    this.squares[squareKey] = this.currentPlayer;
                    completedSquares.push(squareKey);
                }
            }
            // Check square to the right
            if (start.col < this.gridCols - 1) {
                const squareKey = `${Math.min(start.row, end.row)},${start.col}`;
                if (this.isSquareComplete(Math.min(start.row, end.row), start.col)) {
                    this.squares[squareKey] = this.currentPlayer;
                    completedSquares.push(squareKey);
                }
            }
        }

        return completedSquares;
    }

    isSquareComplete(row, col) {
        const top = this.getLineKey({ row, col }, { row, col: col + 1 });
        const bottom = this.getLineKey({ row: row + 1, col }, { row: row + 1, col: col + 1 });
        const left = this.getLineKey({ row, col }, { row: row + 1, col });
        const right = this.getLineKey({ row, col: col + 1 }, { row: row + 1, col: col + 1 });

        return this.lines.has(top) && this.lines.has(bottom) &&
            this.lines.has(left) && this.lines.has(right) &&
            !this.squares[`${row},${col}`];
    }

    isAdjacent(dot1, dot2) {
        return this.areAdjacent(dot1, dot2);
    }

    handleClick(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const dot = this.getNearestDot(x, y);
        if (!dot) return;

        if (!this.selectedDot) {
            this.selectedDot = dot;
            this.isZooming = true;
            this.draw();
        } else {
            if (this.areAdjacent(this.selectedDot, dot)) {
                const lineKey = this.getLineKey(this.selectedDot, dot);

                if (!this.lines.has(lineKey)) {
                    this.lines.add(lineKey);
                    this.pulsatingLines.push({
                        line: lineKey,
                        player: this.currentPlayer,
                        time: Date.now()
                    });

                    const completedSquares = this.checkForSquares(lineKey);

                    if (completedSquares.length === 0) {
                        this.currentPlayer = this.currentPlayer === 1 ? 2 : 1;
                        // Reset zoom when turn changes
                        this.isZooming = false;
                    } else {
                        this.scores[this.currentPlayer] += completedSquares.length;
                        // Trigger animations for completed squares
                        completedSquares.forEach(squareKey => {
                            this.triggerSquareAnimation(squareKey);
                        });
                        // Keep zoom active since same player continues
                    }

                    this.updateUI();
                    this.checkGameOver();
                }
            }

            this.selectedDot = null;
            this.draw();
        }
    }

    handleTouchStart(e) {
        e.preventDefault();

        for (let i = 0; i < e.changedTouches.length; i++) {
            const touch = e.changedTouches[i];
            const rect = this.canvas.getBoundingClientRect();
            const x = touch.clientX - rect.left;
            const y = touch.clientY - rect.top;

            // Store touch info
            this.activeTouches.set(touch.identifier, { x, y, startTime: Date.now() });

            // Add touch visual
            this.touchVisuals.push({
                x, y,
                id: touch.identifier,
                startTime: Date.now(),
                duration: 300
            });

            // Process the touch as a click
            this.processTouchClick(x, y);
        }

        this.draw();
    }

    handleTouchMove(e) {
        e.preventDefault();

        for (let i = 0; i < e.changedTouches.length; i++) {
            const touch = e.changedTouches[i];
            const rect = this.canvas.getBoundingClientRect();
            const x = touch.clientX - rect.left;
            const y = touch.clientY - rect.top;

            // Update touch position
            if (this.activeTouches.has(touch.identifier)) {
                this.activeTouches.set(touch.identifier, {
                    x, y,
                    startTime: this.activeTouches.get(touch.identifier).startTime
                });
            }

            // Update selected dot for last touch only
            if (i === e.changedTouches.length - 1) {
                this.updateSelectedDot(x, y);
            }
        }
    }

    handleTouchEnd(e) {
        e.preventDefault();

        for (let i = 0; i < e.changedTouches.length; i++) {
            const touch = e.changedTouches[i];
            this.activeTouches.delete(touch.identifier);
        }

        // Clear selected dot if no touches remain
        if (this.activeTouches.size === 0) {
            this.selectedDot = null;
            this.draw();
        }
    }

    processTouchClick(x, y) {
        const dot = this.getNearestDot(x, y);
        if (!dot) return;

        const distance = Math.sqrt(
            Math.pow(x - (this.offsetX + dot.col * this.cellSize), 2) +
            Math.pow(y - (this.offsetY + dot.row * this.cellSize), 2)
        );

        if (distance > this.cellSize * 0.3) return;

        if (!this.selectedDot) {
            this.selectedDot = dot;
            this.isZooming = true;
        } else {
            if (this.isAdjacent(this.selectedDot, dot)) {
                const lineKey = this.getLineKey(this.selectedDot, dot);

                if (!this.lines.has(lineKey)) {
                    this.lines.add(lineKey);
                    this.pulsatingLines.push({ lineKey, timestamp: Date.now() });

                    const completedSquares = this.checkForSquares(lineKey);

                    if (completedSquares.length > 0) {
                        // Trigger animations for completed squares
                        completedSquares.forEach(squareKey => {
                            this.triggerSquareAnimation(squareKey);
                        });

                        this.scores[this.currentPlayer] += completedSquares.length;
                        // Keep zoom active since same player continues
                    } else {
                        this.currentPlayer = this.currentPlayer === 1 ? 2 : 1;
                        // Reset zoom when turn changes
                        this.isZooming = false;
                    }

                    this.updateUI();

                    if (this.isGameOver()) {
                        setTimeout(() => this.showWinner(), 1000);
                    }
                }
            }
            this.selectedDot = null;
        }

        this.draw();
    }

    updateSelectedDot(x, y) {
        const dot = this.getNearestDot(x, y);
        if (!dot) return;

        const distance = Math.sqrt(
            Math.pow(x - (this.offsetX + dot.col * this.cellSize), 2) +
            Math.pow(y - (this.offsetY + dot.row * this.cellSize), 2)
        );

        if (distance <= this.cellSize * 0.3) {
            this.selectedDot = dot;
            this.draw();
        }
    }

    triggerSquareAnimation(squareKey) {
        const [row, col] = squareKey.split(',').map(Number);
        const centerX = this.offsetX + (col + 0.5) * this.cellSize;
        const centerY = this.offsetY + (row + 0.5) * this.cellSize;

        // Add kiss emoji animation
        this.kissEmojis.push({
            x: centerX,
            y: centerY,
            startTime: Date.now(),
            duration: 1000 // 1 second as specified
        });

        // Add square scale animation
        this.squareAnimations.push({
            squareKey,
            startTime: Date.now(),
            duration: 600,
            centerX,
            centerY
        });

        // Create particle burst (scaled down for smaller cells)
        const playerColor = this.currentPlayer === 1 ? this.player1Color : this.player2Color;
        const particleCount = 15; // Reduced from 20

        for (let i = 0; i < particleCount; i++) {
            const angle = (Math.PI * 2 * i) / particleCount;
            const speed = 1 + Math.random() * 2; // Reduced from 2 + Math.random() * 3

            this.particles.push({
                x: centerX,
                y: centerY,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                color: playerColor,
                size: 1.5 + Math.random() * 2, // Reduced from 3 + Math.random() * 4
                life: 1.0,
                decay: 0.015 + Math.random() * 0.01
            });
        }
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Save context and apply zoom if active
        this.ctx.save();
        
        if (this.zoomLevel > 1.01 && this.selectedDot) {
            const zoomX = this.offsetX + this.selectedDot.col * this.cellSize;
            const zoomY = this.offsetY + this.selectedDot.row * this.cellSize;
            
            // Translate to zoom point, scale, then translate back
            this.ctx.translate(this.canvas.width / 2, this.canvas.height / 2);
            this.ctx.scale(this.zoomLevel, this.zoomLevel);
            this.ctx.translate(
                -zoomX + (this.canvas.width / 2 - zoomX) / this.zoomLevel,
                -zoomY + (this.canvas.height / 2 - zoomY) / this.zoomLevel
            );
        }

        // Draw touch visuals (before other elements)
        this.drawTouchVisuals();

        // Draw dots
        for (let row = 0; row < this.gridRows; row++) {
            for (let col = 0; col < this.gridCols; col++) {
                const x = this.offsetX + col * this.cellSize;
                const y = this.offsetY + row * this.cellSize;

                this.ctx.fillStyle = '#333';
                this.ctx.beginPath();
                this.ctx.arc(x, y, this.dotRadius, 0, Math.PI * 2);
                this.ctx.fill();

                // Selected dot highlighting moved to end of draw() for better visibility
            }
        }

        // Draw lines
        for (const lineKey of this.lines) {
            const [start, end] = lineKey.split('-').map(s => {
                const [row, col] = s.split(',').map(Number);
                return { row, col };
            });

            const pulsating = this.pulsatingLines.find(p => p.line === lineKey);
            const player = pulsating?.player || this.getLinePlayer(lineKey);

            this.ctx.strokeStyle = player === 1 ? this.player1Color : this.player2Color;
            this.ctx.lineWidth = this.lineWidth;
            this.ctx.lineCap = 'round';

            this.ctx.beginPath();
            this.ctx.moveTo(
                this.offsetX + start.col * this.cellSize,
                this.offsetY + start.row * this.cellSize
            );
            this.ctx.lineTo(
                this.offsetX + end.col * this.cellSize,
                this.offsetY + end.row * this.cellSize
            );
            this.ctx.stroke();
        }

        // Draw completed squares
        for (const [squareKey, player] of Object.entries(this.squares)) {
            const [row, col] = squareKey.split(',').map(Number);
            const x = this.offsetX + col * this.cellSize;
            const y = this.offsetY + row * this.cellSize;

            this.ctx.fillStyle = player === 1 ? this.player1Color + '40' : this.player2Color + '40';
            this.ctx.fillRect(x, y, this.cellSize, this.cellSize);

            this.ctx.fillStyle = player === 1 ? this.player1Color : this.player2Color;
            // Scale font size based on cell size
            const fontSize = Math.max(8, Math.min(this.cellSize / 2, 20));
            this.ctx.font = `bold ${fontSize}px Arial`;
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(player.toString(), x + this.cellSize / 2, y + this.cellSize / 2);
        }

        // Draw completed squares with animations
        this.drawSquaresWithAnimations();

        // Draw particles on top
        this.drawParticles();

        // Draw kiss emojis
        this.drawKissEmojis();

        // Draw selected dot with enhanced visibility
        if (this.selectedDot) {
            const x = this.offsetX + this.selectedDot.col * this.cellSize;
            const y = this.offsetY + this.selectedDot.row * this.cellSize;

            const playerColor = this.currentPlayer === 1 ? this.player1Color : this.player2Color;
            
            // Outer pulsing ring
            const pulseScale = 1 + Math.sin(Date.now() / 200) * 0.2;
            this.ctx.strokeStyle = playerColor;
            this.ctx.lineWidth = 3;
            this.ctx.beginPath();
            this.ctx.arc(x, y, (this.dotRadius + 8) * pulseScale, 0, Math.PI * 2);
            this.ctx.stroke();

            // Inner solid ring
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.arc(x, y, this.dotRadius + 5, 0, Math.PI * 2);
            this.ctx.stroke();

            // Redraw the dot itself to ensure it's visible
            this.ctx.fillStyle = playerColor;
            this.ctx.beginPath();
            this.ctx.arc(x, y, this.dotRadius * 2, 0, Math.PI * 2);
            this.ctx.fill();
        }

        // Restore context after zoom
        this.ctx.restore();
    }

    drawTouchVisuals() {
        const now = Date.now();

        this.touchVisuals.forEach(tv => {
            const age = now - tv.startTime;
            const progress = age / tv.duration;
            const alpha = 1 - progress;
            const radius = 10 + progress * 15; // Scaled down from 20 + progress * 30

            this.ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.6})`;
            this.ctx.lineWidth = 1.5; // Scaled down from 3
            this.ctx.beginPath();
            this.ctx.arc(tv.x, tv.y, radius, 0, Math.PI * 2);
            this.ctx.stroke();

            // Inner dot
            this.ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.8})`;
            this.ctx.beginPath();
            this.ctx.arc(tv.x, tv.y, 4, 0, Math.PI * 2); // Scaled down from 8
            this.ctx.fill();
        });
    }

    drawSquaresWithAnimations() {
        const now = Date.now();

        for (const squareKey in this.squares) {
            const player = this.squares[squareKey];
            const color = player === 1 ? this.player1Color : this.player2Color;
            const [row, col] = squareKey.split(',').map(Number);

            const x = this.offsetX + col * this.cellSize;
            const y = this.offsetY + row * this.cellSize;

            // Check if this square has an active animation
            const animation = this.squareAnimations.find(a => a.squareKey === squareKey);

            if (animation) {
                const age = now - animation.startTime;
                const progress = age / animation.duration;

                // Easing function (ease-out-back)
                const easeProgress = 1 - Math.pow(1 - progress, 3);
                const scale = 0.3 + easeProgress * 0.7;
                const alpha = Math.min(progress * 2, 1);

                // Glow effect
                const glowIntensity = Math.sin(progress * Math.PI) * 0.5;
                this.ctx.shadowColor = color;
                this.ctx.shadowBlur = 20 * glowIntensity;

                // Draw scaled square
                this.ctx.save();
                this.ctx.translate(animation.centerX, animation.centerY);
                this.ctx.scale(scale, scale);
                this.ctx.translate(-animation.centerX, -animation.centerY);

                this.ctx.fillStyle = color + Math.floor(alpha * 0.25 * 255).toString(16).padStart(2, '0');
                this.ctx.fillRect(x, y, this.cellSize, this.cellSize);

                this.ctx.restore();
                this.ctx.shadowBlur = 0;
            } else {
                // Normal square rendering
                this.ctx.fillStyle = color + '40';
                this.ctx.fillRect(x, y, this.cellSize, this.cellSize);
            }

            // Draw player number
            this.ctx.fillStyle = color;
            this.ctx.font = `bold ${this.cellSize * 0.4}px Arial`;
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(player, x + this.cellSize / 2, y + this.cellSize / 2);
        }
    }

    drawParticles() {
        this.particles.forEach(p => {
            this.ctx.fillStyle = p.color + Math.floor(p.life * 255).toString(16).padStart(2, '0');
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            this.ctx.fill();
        });
    }

    drawKissEmojis() {
        const now = Date.now();
        
        this.kissEmojis.forEach(kiss => {
            const age = now - kiss.startTime;
            const progress = age / kiss.duration;
            
            if (progress >= 1) return;
            
            // Ease-out for scale (grow then shrink slightly)
            const scaleProgress = progress < 0.5 ? progress * 2 : 1;
            const scale = 0.5 + scaleProgress * 1.5;
            
            // Fade out in second half
            const alpha = progress < 0.5 ? 1 : 1 - ((progress - 0.5) * 2);
            
            // Move upward slightly
            const yOffset = progress * -20;
            
            this.ctx.save();
            this.ctx.globalAlpha = alpha;
            this.ctx.font = `${this.cellSize * scale}px Arial`;
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText('💋', kiss.x, kiss.y + yOffset);
            this.ctx.restore();
        });
    }

    getLinePlayer(lineKey) {
        // Determine which player drew the line based on when it was added
        for (const pulsating of this.pulsatingLines) {
            if (pulsating.line === lineKey) {
                return pulsating.player;
            }
        }
        return 1; // Default
    }

    animate() {
        // Update particles
        this.particles = this.particles.filter(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.15; // Gravity
            p.life -= p.decay;
            return p.life > 0;
        });

        // Clean up old animations
        const now = Date.now();
        this.squareAnimations = this.squareAnimations.filter(anim =>
            now - anim.startTime < anim.duration
        );
        this.touchVisuals = this.touchVisuals.filter(tv =>
            now - tv.startTime < tv.duration
        );
        this.kissEmojis = this.kissEmojis.filter(kiss =>
            now - kiss.startTime < kiss.duration
        );

        // Update zoom smoothly
        if (this.isZooming && this.selectedDot) {
            const targetZoom = 1.5;
            this.zoomLevel += (targetZoom - this.zoomLevel) * 0.1;
        } else {
            this.zoomLevel += (1 - this.zoomLevel) * 0.1;
        }

        // Redraw if animations are active or zooming
        if (this.particles.length > 0 || this.squareAnimations.length > 0 || 
            this.touchVisuals.length > 0 || this.kissEmojis.length > 0 ||
            Math.abs(this.zoomLevel - 1) > 0.01 || this.selectedDot) {
            this.draw();
        }

        requestAnimationFrame(() => this.animate());
    }

    updateUI() {
        document.getElementById('player1Score').textContent = this.scores[1];
        document.getElementById('player2Score').textContent = this.scores[2];

        document.getElementById('player1Info').classList.toggle('active', this.currentPlayer === 1);
        document.getElementById('player2Info').classList.toggle('active', this.currentPlayer === 2);

        document.getElementById('player1Info').style.color = this.player1Color;
        document.getElementById('player2Info').style.color = this.player2Color;

        document.getElementById('turnIndicator').textContent = `Player ${this.currentPlayer}'s Turn`;
        document.getElementById('turnIndicator').style.color = this.currentPlayer === 1 ? this.player1Color : this.player2Color;
    }

    checkGameOver() {
        const totalSquares = (this.gridRows - 1) * (this.gridCols - 1);
        const completedSquares = Object.keys(this.squares).length;

        if (completedSquares === totalSquares) {
            setTimeout(() => this.showWinner(), 500);
        }
    }

    isGameOver() {
        const totalSquares = (this.gridRows - 1) * (this.gridCols - 1);
        const completedSquares = Object.keys(this.squares).length;
        return completedSquares === totalSquares;
    }

    showWinner() {
        const winner = this.scores[1] > this.scores[2] ? 1 :
            this.scores[2] > this.scores[1] ? 2 : 0;

        const winnerText = winner === 0 ? "It's a Tie!" :
            `Player ${winner} Wins! (${this.scores[winner]} - ${this.scores[winner === 1 ? 2 : 1]})`;

        document.getElementById('winnerText').textContent = winnerText;
        document.getElementById('gameScreen').classList.remove('active');
        document.getElementById('winnerScreen').classList.add('active');
    }
}

let game = null;
