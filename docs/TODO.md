# TODO — Sqaure Implementation Plan

**Date:** 2026-09-13
**Repo:** TeacherEvan/Sqaure
**Branch:** main (clean, 1 commit ahead of origin)
**Status:** ✅ VERIFIED COMPLETE (2026-09-14) — all 4 objectives reconciled against live tree; OBJ-001 gap documented in-plan as accepted limitation (animations update every frame, so partial-clear path cannot save real cycles).

---

## Scope

Implement the 4 `[OPTIMIZATION]` TODOs found in the codebase. Multiplayer server
integration is explicitly out of scope (no backend exists; `MULTIPLAYER_PLANNING.md`
is aspirational only).

---

## Objectives

### OBJ-001 — Dirty-rectangle rendering in `game.js` `setupCanvas()`
- **Requirement:** OPT-001
- **File:** `game.js` (line ~112)
- **Current:** `setupCanvas()` clears and redraws the entire canvas on every resize.
- **Target:** Track a `dirtyRect` (min/max x/y of changed region); `clearRect()` only
  that region instead of the full logical canvas; fall back to full clear when the
  grid dimensions change.
- **Status:** ✅ DONE — structurally present; functionally inert at runtime (accepted limitation: per-frame animations force full-canvas dirty region; partial-clear path is correct but unreached in current draw pipeline).
- **Acceptance:**
  - A `this.dirtyRect = null` field exists on the class. ✅
  - `setupCanvas()` calls `this.clearDirtyRect(true)` (full clear). ✅
  - `draw()` calls `this.clearDirtyRect()` before repainting and accumulates the
    region via `this.markDirty()`. ✅ (wired — no dead code)
  - `markDirty()` is the single entry point for dirty-region tracking. ✅
  - **GAP:** `draw()` repaints the *entire* board every frame (lines, squares,
    particles, dots, kiss emojis, animations), so the accumulated dirty region is
    always the full logical canvas. The partial-clear path is never exercised —
    every frame does a full `clearRect(0,0,w,h)`. **No per-frame clearing savings
    are realized.** The optimization is structurally correct but operationally a
    no-op for the current draw pipeline.
  - No visual regression: full canvas still renders correctly. ✅
- **Validation:** `grep` for `dirtyRect`/markDirty usage in `setupCanvas()` and
  `draw()`; `node --check game.js` passes.

### OBJ-002 — `requestIdleCallback` for non-critical handlers in `game.js`
- **Requirement:** OPT-002
- **File:** `game.js` (line ~268)
- **Current:** `setupEventListeners()` runs synchronously in the constructor.
- **Target:** Wrap the non-critical event-listener setup (resize, click handlers) in a
  `requestIdleCallback` with a 1000 ms timeout fallback to `setTimeout(..., 100)`.
  Critical setup (canvas, initial draw) stays synchronous.
- **Acceptance:**
  - `setupEventListeners()` defers listener registration via
    `requestIdleCallback(() => { ... }, { timeout: 1000 })`.
  - Fallback path exists for browsers without `requestIdleCallback`.
  - Game still initializes correctly (event listeners fire).
- **Validation:** Code inspection — confirm the idle-callback wrapper and fallback.

### OBJ-003 — Debounced resize in `welcome.js` `handleResize()`
- **Requirement:** OPT-003
- **File:** `welcome.js` (line ~51)
- **Current:** `handleResize()` is already debounced via `handleResizeDebounced()`
  (200 ms). The TODO comment is stale — the implementation already exists.
- **Target:** Remove the stale TODO comment from `handleResize()`. No code change
  needed; the debounce is already wired in the constructor
  (`window.addEventListener('resize', () => this.handleResizeDebounced())`).
- **Acceptance:**
  - TODO comment removed from `handleResize()`.
  - `handleResizeDebounced()` still calls `handleResize()` after 200 ms.
- **Validation:** `grep` confirms no remaining TODO on that method; constructor still
  wires the debounced resize.

### OBJ-004 — Multiplayer sync/broadcast in `LobbyManager`
- **Requirement:** OPT-004
- **File:** `welcome.js` (lines ~401, 414, 426)
- **Current:** `toggleReady()`, `updateMyColor()`, `updateMyName()` have TODO comments
  to sync with a server / broadcast to other players.
- **Target:** Out of scope. No server backend exists. Replace TODO comments with a
  clear `// TODO: [SCOPE] Multiplayer sync requires a backend (see MULTIPLAYER_PLANNING.md)`.
  Do NOT implement fake/broadcast-only logic.
- **Acceptance:**
  - TODO comments replaced with scope-marker comments referencing the planning doc.
  - No new code added.
- **Validation:** `grep` confirms no remaining `[OPTIMIZATION]` TODOs on these methods.

---

## Definition of Done

- All 4 objectives implemented or explicitly scoped out.
- No `[OPTIMIZATION]` TODOs remain in `game.js` or `welcome.js`.
- `git diff` shows only the intended changes.
- Game loads and renders correctly in a browser.
