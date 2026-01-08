import { Renderer } from './canvas/renderer';
import { updateHUD, updateAutoButton } from './ui/hud';
import { tetrisBot, initBot, apply, toggleAuto, resetGame } from './bot/bot';
import { GameState, Action } from './core/types';

// Attach bot to window for console access
declare global {
    interface Window {
        tetrisBot: typeof tetrisBot;
    }
}
window.tetrisBot = tetrisBot;

// Canvas elements
const gameCanvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const holdCanvas = document.getElementById('hold-canvas') as HTMLCanvasElement;
const nextCanvas = document.getElementById('next-canvas') as HTMLCanvasElement;

// Create renderer
const renderer = new Renderer(gameCanvas, holdCanvas, nextCanvas);

// State change callback
function onStateChange(state: GameState, games: number, weightsHash: string): void {
    renderer.render(state);
    updateHUD(state, games, weightsHash);
}

// Auto mode change callback
function onAutoChange(isAuto: boolean): void {
    updateAutoButton(isAuto);
}

// Initialize bot
initBot(onStateChange, onAutoChange);

// Button handlers
const autoBtn = document.getElementById('auto-btn');
const resetBtn = document.getElementById('reset-btn');

autoBtn?.addEventListener('click', () => {
    toggleAuto();
});

resetBtn?.addEventListener('click', () => {
    resetGame();
});

// Keyboard controls (for manual play / debugging)
const keyMap: Record<string, Action> = {
    ArrowLeft: 'L',
    ArrowRight: 'R',
    ArrowUp: 'ROT_CW',
    KeyZ: 'ROT_CCW',
    KeyX: 'ROT_CW',
    ArrowDown: 'SOFT_DROP',
    Space: 'HARD_DROP',
    KeyC: 'HOLD',
    ShiftLeft: 'HOLD',
};

document.addEventListener('keydown', (e) => {
    const action = keyMap[e.code];
    if (action) {
        e.preventDefault();
        apply(action);
    }
});

// Initial render
renderer.render(tetrisBot.getState());

console.log('Tetris AI initialized');
console.log('Use window.tetrisBot.startAuto() to start auto-play');
console.log('Use window.tetrisBot.stopAuto() to stop');
console.log('Or click the "Auto Start" button');
