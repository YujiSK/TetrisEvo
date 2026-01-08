import { Board, BoardFeatures, Weights } from './types';
import { BOARD_WIDTH, TOTAL_HEIGHT } from './constants';

/**
 * Calculate column heights (distance from top to first block)
 */
export function getColumnHeights(board: Board): number[] {
    const heights: number[] = [];

    for (let x = 0; x < BOARD_WIDTH; x++) {
        let height = 0;
        for (let y = 0; y < TOTAL_HEIGHT; y++) {
            if (board[y][x] !== null) {
                height = TOTAL_HEIGHT - y;
                break;
            }
        }
        heights.push(height);
    }

    return heights;
}

/**
 * Count holes (empty cells with at least one block above)
 */
export function countHoles(board: Board): number {
    let holes = 0;

    for (let x = 0; x < BOARD_WIDTH; x++) {
        let blockFound = false;
        for (let y = 0; y < TOTAL_HEIGHT; y++) {
            if (board[y][x] !== null) {
                blockFound = true;
            } else if (blockFound) {
                holes++;
            }
        }
    }

    return holes;
}

/**
 * Calculate aggregate height (sum of all column heights)
 */
export function getAggregateHeight(heights: number[]): number {
    return heights.reduce((sum, h) => sum + h, 0);
}

/**
 * Calculate bumpiness (sum of absolute height differences between adjacent columns)
 */
export function getBumpiness(heights: number[]): number {
    let bumpiness = 0;

    for (let i = 0; i < heights.length - 1; i++) {
        bumpiness += Math.abs(heights[i] - heights[i + 1]);
    }

    return bumpiness;
}

/**
 * Get maximum column height
 */
export function getMaxHeight(heights: number[]): number {
    return Math.max(...heights);
}

/**
 * Calculate wells (deep gaps between blocks)
 * A well is a sequence of empty cells that are surrounded by blocks on both sides
 */
export function getWells(board: Board): number {
    let wells = 0;

    for (let x = 0; x < BOARD_WIDTH; x++) {
        for (let y = 0; y < TOTAL_HEIGHT; y++) {
            if (board[y][x] === null) {
                // Check if blocked on left (or is left wall)
                const leftBlocked = x === 0 || board[y][x - 1] !== null;
                // Check if blocked on right (or is right wall)
                const rightBlocked = x === BOARD_WIDTH - 1 || board[y][x + 1] !== null;

                if (leftBlocked && rightBlocked) {
                    wells++;
                }
            }
        }
    }

    return wells;
}

/**
 * Count completed lines that would be cleared
 */
export function countCompleteLines(board: Board): number {
    let count = 0;

    for (let y = 0; y < TOTAL_HEIGHT; y++) {
        let complete = true;
        for (let x = 0; x < BOARD_WIDTH; x++) {
            if (board[y][x] === null) {
                complete = false;
                break;
            }
        }
        if (complete) count++;
    }

    return count;
}

/**
 * Check if board is ready for a Tetris (has a single well at edge)
 * Returns 1.0 if good Tetris well, 0.0 otherwise
 * A good Tetris well: one edge column (0 or 9) is at least 4 rows lower than adjacent
 */
export function getTetrisReady(heights: number[]): number {
    const leftWellDepth = heights[1] - heights[0];
    const rightWellDepth = heights[8] - heights[9];

    // Check left edge well (column 0)
    if (leftWellDepth >= 4) {
        // Make sure columns 1-9 are relatively flat
        const otherHeights = heights.slice(1);
        const otherMax = Math.max(...otherHeights);
        const otherMin = Math.min(...otherHeights);
        if (otherMax - otherMin <= 2) {
            return 1.0;
        }
    }

    // Check right edge well (column 9)
    if (rightWellDepth >= 4) {
        // Make sure columns 0-8 are relatively flat
        const otherHeights = heights.slice(0, 9);
        const otherMax = Math.max(...otherHeights);
        const otherMin = Math.min(...otherHeights);
        if (otherMax - otherMin <= 2) {
            return 1.0;
        }
    }

    // Partial credit for building towards Tetris
    if (leftWellDepth >= 2 || rightWellDepth >= 2) {
        return 0.5;
    }

    return 0.0;
}

/**
 * Calculate all board features
 */
export function evaluateBoard(board: Board, linesCleared: number = 0): BoardFeatures {
    const heights = getColumnHeights(board);

    return {
        linesCleared,
        holes: countHoles(board),
        aggregateHeight: getAggregateHeight(heights),
        bumpiness: getBumpiness(heights),
        maxHeight: getMaxHeight(heights),
        wells: getWells(board),
        tetrisReady: getTetrisReady(heights),
        tetrisBonus: linesCleared >= 4 ? 1.0 : 0.0,
    };
}

/**
 * Score a placement based on features and weights
 */
export function scoreFeatures(
    features: BoardFeatures,
    weights: Weights
): number {
    return (
        (weights.linesCleared ?? 0) * features.linesCleared +
        (weights.holes ?? 0) * features.holes +
        (weights.aggregateHeight ?? 0) * features.aggregateHeight +
        (weights.bumpiness ?? 0) * features.bumpiness +
        (weights.maxHeight ?? 0) * features.maxHeight +
        (weights.wells ?? 0) * features.wells +
        (weights.tetrisReady ?? 0) * features.tetrisReady +
        (weights.tetrisBonus ?? 0) * features.tetrisBonus
    );
}

/**
 * Create a deep copy of the board
 */
export function cloneBoard(board: Board): Board {
    return board.map(row => [...row]);
}
