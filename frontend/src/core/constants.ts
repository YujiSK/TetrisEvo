// Board dimensions
export const BOARD_WIDTH = 10;
export const BOARD_HEIGHT = 20;
export const BUFFER_HEIGHT = 4; // invisible buffer above visible area

// Total board height including buffer
export const TOTAL_HEIGHT = BOARD_HEIGHT + BUFFER_HEIGHT;

// Cell size in pixels
export const CELL_SIZE = 30;

// Preview cell size
export const PREVIEW_CELL_SIZE = 16;

// Next queue size
export const NEXT_QUEUE_SIZE = 3;

// Colors for each mino type
export const MINO_COLORS: Record<string, string> = {
    I: '#00f0f0', // Cyan
    O: '#f0f000', // Yellow
    T: '#a000f0', // Purple
    S: '#00f000', // Green
    Z: '#f00000', // Red
    J: '#0000f0', // Blue
    L: '#f0a000', // Orange
};

// Ghost piece opacity
export const GHOST_OPACITY = 0.3;

// Tick interval in ms (normal speed)
export const TICK_INTERVAL = 1000;

// AI tick interval (faster for training)
export const AI_TICK_INTERVAL = 50;

// Lock delay in ticks
export const LOCK_DELAY = 30;

// Weights polling interval
export const WEIGHTS_POLL_INTERVAL = 5000;

// Backend URL
export const BACKEND_URL = 'http://localhost:8000';

// Scoring
export const LINE_SCORES = [0, 100, 300, 500, 800]; // 0, 1, 2, 3, 4 lines
