# Copilot Instructions: Dots and Boxes Game

## Project Overview
Browser-based implementation of the classic Dots and Boxes game with customizable grid sizes and player colors. Pure vanilla JavaScript with HTML5 Canvas rendering—no frameworks or build tools.

## Architecture Pattern

**Three-Screen Flow:**
1. **Welcome Screen** (`welcome.js`) - Grid selection (10x10, 20x20, 30x30) and color pickers
2. **Game Screen** (`game.js`) - Canvas-based gameplay with `DotsAndBoxesGame` class
3. **Winner Screen** - Results display with play-again option

**State Management:** Single `DotsAndBoxesGame` instance stored in global `game` variable. Screen transitions use `.active` class toggling on `.screen` elements.

## Core Game Mechanics

### Data Structures
- **Lines:** `Set` of string keys like `"1,2-1,3"` (normalized with sorted coordinates)
- **Squares:** Object map `{"row,col": playerNumber}` tracking completed squares
- **Coordinates:** All positions use `{row, col}` objects (0-indexed from top-left)

### Key Algorithms
**Square Detection (`checkForSquares`):** After each line draw, checks 2-4 adjacent potential squares:
- Horizontal lines check squares above and below
- Vertical lines check squares left and right
- Only marks squares if all 4 sides exist in `this.lines`

**Turn Logic:** Player retains turn when completing square(s), otherwise switches to opponent.

**Canvas Coordinate System:**
```javascript
screenX = this.offsetX + col * this.cellSize
screenY = this.offsetY + row * this.cellSize
```

## Critical Implementation Details

### Line Key Generation
Always normalize line keys with sorted coordinates to prevent duplicates:
```javascript
getLineKey(dot1, dot2) {
    const [first, second] = [dot1, dot2].sort((a, b) =>
        a.row === b.row ? a.col - b.col : a.row - b.row
    );
    return `${first.row},${first.col}-${second.row},${second.col}`;
}
```

### Responsive Canvas Sizing
Canvas recalculates on window resize to fit container while maintaining playability:
- `cellSize` ranges from 20px (minimum) to 80px (maximum)
- 20px offset margins (`offsetX`, `offsetY`) prevent edge clipping
- Fullscreen triggered on game start (with graceful fallback)

### Visual Feedback System
- **Pulsating Lines:** New lines animate for 2 seconds via `pulsatingLines` array with timestamps
- **Selected Dot:** Highlighted with colored ring matching current player
- **Active Player:** Header `.player-info` gets `.active` class for pulsing animation

## UI Conventions

### Player Representation
- Player 1: Default red (`#FF0000`)
- Player 2: Default blue (`#0000FF`)
- Completed squares: Semi-transparent player color (`color + '40'` alpha)
- Player numbers (1 or 2) rendered in square centers

### Screen Transitions
```javascript
// Pattern used throughout welcome.js
oldScreen.classList.remove('active');
newScreen.classList.add('active');
```
Only one `.screen` element should have `.active` at a time.

## Development Workflow

**No build process.** Open `index.html` directly in browser or use live server.

**File Load Order (critical):**
```html
<script src="game.js"></script>  <!-- DotsAndBoxesGame class must load first -->
<script src="welcome.js"></script>  <!-- Depends on game.js global -->
```

**Testing Grid Sizes:** Use 10x10 for quick tests. 30x30 validates canvas performance and scoring.

## Common Modifications

**Adding Grid Size:** Update `index.html` grid buttons and adjust responsive thresholds in `setupCanvas()` if going beyond 30x30.

**Changing Game Rules:** Modify `checkForSquares()` return logic and turn-switching in `handleClick()` event handler.

**Styling Player Info:** Colors dynamically set via inline styles in `updateUI()`, not CSS variables.

## Mobile Considerations

Landscape-only orientation enforced via CSS overlay (see media query at end of `styles.css`). Portrait mode shows rotation prompt covering entire screen.
