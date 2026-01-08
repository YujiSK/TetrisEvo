import { GameState } from '../core/types';

/**
 * Update HUD elements with game state
 */
export function updateHUD(state: GameState, gamesPlayed: number, weightsHash: string): void {
    const scoreEl = document.getElementById('score');
    const linesEl = document.getElementById('lines');
    const piecesEl = document.getElementById('pieces');
    const tetrisEl = document.getElementById('tetris');
    const gamesEl = document.getElementById('games');
    const weightsEl = document.getElementById('weights-hash');

    if (scoreEl) scoreEl.textContent = state.score.toLocaleString();
    if (linesEl) linesEl.textContent = state.lines.toLocaleString();
    if (piecesEl) piecesEl.textContent = state.pieces.toLocaleString();
    if (tetrisEl) tetrisEl.textContent = (state.tetrisCount ?? 0).toLocaleString();
    if (gamesEl) gamesEl.textContent = gamesPlayed.toLocaleString();
    if (weightsEl) weightsEl.textContent = weightsHash.slice(0, 8);
}

/**
 * Update auto button state
 */
export function updateAutoButton(isAuto: boolean): void {
    const btn = document.getElementById('auto-btn');
    if (!btn) return;

    if (isAuto) {
        btn.classList.add('active');
        btn.innerHTML = '<span class="auto-indicator on"></span>Auto Stop';
    } else {
        btn.classList.remove('active');
        btn.innerHTML = '<span class="auto-indicator off"></span>Auto Start';
    }
}

/**
 * Show game over overlay (optional)
 */
export function showGameOver(): void {
    // Could add a visual game over effect here
    console.log('Game Over');
}
