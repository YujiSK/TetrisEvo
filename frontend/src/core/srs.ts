import { MinoType, Position } from './types';
import { getPieceBlocks } from './pieces';
import { BOARD_WIDTH, TOTAL_HEIGHT } from './constants';
import type { Board } from './types';

/**
 * SRS (Super Rotation System) - Simplified Implementation
 * Wall kick tables for I piece and general pieces (JLSTZ)
 */

// Wall kick offsets for JLSTZ pieces
// Format: [fromState][toState] = array of (x, y) offsets to try
const JLSTZ_KICKS: Record<string, Position[]> = {
    '0>1': [{ x: 0, y: 0 }, { x: -1, y: 0 }, { x: -1, y: -1 }, { x: 0, y: 2 }, { x: -1, y: 2 }],
    '1>0': [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: -2 }, { x: 1, y: -2 }],
    '1>2': [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: -2 }, { x: 1, y: -2 }],
    '2>1': [{ x: 0, y: 0 }, { x: -1, y: 0 }, { x: -1, y: -1 }, { x: 0, y: 2 }, { x: -1, y: 2 }],
    '2>3': [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: -1 }, { x: 0, y: 2 }, { x: 1, y: 2 }],
    '3>2': [{ x: 0, y: 0 }, { x: -1, y: 0 }, { x: -1, y: 1 }, { x: 0, y: -2 }, { x: -1, y: -2 }],
    '3>0': [{ x: 0, y: 0 }, { x: -1, y: 0 }, { x: -1, y: 1 }, { x: 0, y: -2 }, { x: -1, y: -2 }],
    '0>3': [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: -1 }, { x: 0, y: 2 }, { x: 1, y: 2 }],
};

// Wall kick offsets for I piece
const I_KICKS: Record<string, Position[]> = {
    '0>1': [{ x: 0, y: 0 }, { x: -2, y: 0 }, { x: 1, y: 0 }, { x: -2, y: 1 }, { x: 1, y: -2 }],
    '1>0': [{ x: 0, y: 0 }, { x: 2, y: 0 }, { x: -1, y: 0 }, { x: 2, y: -1 }, { x: -1, y: 2 }],
    '1>2': [{ x: 0, y: 0 }, { x: -1, y: 0 }, { x: 2, y: 0 }, { x: -1, y: -2 }, { x: 2, y: 1 }],
    '2>1': [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: -2, y: 0 }, { x: 1, y: 2 }, { x: -2, y: -1 }],
    '2>3': [{ x: 0, y: 0 }, { x: 2, y: 0 }, { x: -1, y: 0 }, { x: 2, y: -1 }, { x: -1, y: 2 }],
    '3>2': [{ x: 0, y: 0 }, { x: -2, y: 0 }, { x: 1, y: 0 }, { x: -2, y: 1 }, { x: 1, y: -2 }],
    '3>0': [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: -2, y: 0 }, { x: 1, y: 2 }, { x: -2, y: -1 }],
    '0>3': [{ x: 0, y: 0 }, { x: -1, y: 0 }, { x: 2, y: 0 }, { x: -1, y: -2 }, { x: 2, y: 1 }],
};

/**
 * Check if a piece position is valid (no collision)
 */
export function isValidPosition(
    board: Board,
    type: MinoType,
    rotation: number,
    x: number,
    y: number
): boolean {
    const blocks = getPieceBlocks(type, rotation, x, y);

    for (const block of blocks) {
        // Check bounds
        if (block.x < 0 || block.x >= BOARD_WIDTH) return false;
        if (block.y < 0 || block.y >= TOTAL_HEIGHT) return false;

        // Check collision with existing blocks
        if (board[block.y][block.x] !== null) return false;
    }

    return true;
}

/**
 * Get wall kick offsets for a rotation
 */
function getKickOffsets(type: MinoType, fromRot: number, toRot: number): Position[] {
    const key = `${fromRot}>${toRot}`;

    if (type === 'O') {
        // O piece doesn't rotate
        return [{ x: 0, y: 0 }];
    }

    if (type === 'I') {
        return I_KICKS[key] || [{ x: 0, y: 0 }];
    }

    return JLSTZ_KICKS[key] || [{ x: 0, y: 0 }];
}

/**
 * Try to rotate a piece with wall kicks
 * Returns the new position if successful, null if rotation fails
 */
export function tryRotate(
    board: Board,
    type: MinoType,
    currentRotation: number,
    x: number,
    y: number,
    clockwise: boolean
): { rotation: number; x: number; y: number } | null {
    const newRotation = clockwise
        ? (currentRotation + 1) % 4
        : (currentRotation + 3) % 4;

    const kicks = getKickOffsets(type, currentRotation, newRotation);

    for (const kick of kicks) {
        const newX = x + kick.x;
        const newY = y - kick.y; // Note: SRS uses positive y as up, we use positive y as down

        if (isValidPosition(board, type, newRotation, newX, newY)) {
            return { rotation: newRotation, x: newX, y: newY };
        }
    }

    return null;
}

/**
 * Try to move a piece horizontally
 */
export function tryMove(
    board: Board,
    type: MinoType,
    rotation: number,
    x: number,
    y: number,
    dx: number
): { x: number } | null {
    const newX = x + dx;

    if (isValidPosition(board, type, rotation, newX, y)) {
        return { x: newX };
    }

    return null;
}

/**
 * Try to move a piece down
 */
export function tryDrop(
    board: Board,
    type: MinoType,
    rotation: number,
    x: number,
    y: number
): { y: number } | null {
    const newY = y + 1;

    if (isValidPosition(board, type, rotation, x, newY)) {
        return { y: newY };
    }

    return null;
}

/**
 * Get the y position after hard drop
 */
export function getDropY(
    board: Board,
    type: MinoType,
    rotation: number,
    x: number,
    y: number
): number {
    let dropY = y;

    while (isValidPosition(board, type, rotation, x, dropY + 1)) {
        dropY++;
    }

    return dropY;
}
