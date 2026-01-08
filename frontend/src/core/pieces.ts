import { MinoType, Position } from './types';

/**
 * Piece shapes for all 7 minos in all 4 rotation states
 * Coordinates are relative to piece center, y increases downward
 */
export const PIECE_SHAPES: Record<MinoType, Position[][]> = {
    I: [
        // State 0: horizontal
        [{ x: -1, y: 0 }, { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }],
        // State 1: vertical
        [{ x: 0, y: -1 }, { x: 0, y: 0 }, { x: 0, y: 1 }, { x: 0, y: 2 }],
        // State 2: horizontal (offset)
        [{ x: -1, y: 0 }, { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }],
        // State 3: vertical (offset)
        [{ x: 0, y: -1 }, { x: 0, y: 0 }, { x: 0, y: 1 }, { x: 0, y: 2 }],
    ],
    O: [
        // O doesn't rotate - same for all states
        [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }],
        [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }],
        [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }],
        [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }],
    ],
    T: [
        // State 0: T pointing up
        [{ x: -1, y: 0 }, { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: -1 }],
        // State 1: T pointing right
        [{ x: 0, y: -1 }, { x: 0, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 0 }],
        // State 2: T pointing down
        [{ x: -1, y: 0 }, { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }],
        // State 3: T pointing left
        [{ x: 0, y: -1 }, { x: 0, y: 0 }, { x: 0, y: 1 }, { x: -1, y: 0 }],
    ],
    S: [
        // State 0: horizontal S
        [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: -1, y: 1 }, { x: 0, y: 1 }],
        // State 1: vertical S
        [{ x: 0, y: -1 }, { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }],
        // State 2: horizontal S (same as 0)
        [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: -1, y: 1 }, { x: 0, y: 1 }],
        // State 3: vertical S (same as 1)
        [{ x: 0, y: -1 }, { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }],
    ],
    Z: [
        // State 0: horizontal Z
        [{ x: -1, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }],
        // State 1: vertical Z
        [{ x: 1, y: -1 }, { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }],
        // State 2: horizontal Z (same as 0)
        [{ x: -1, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }],
        // State 3: vertical Z (same as 1)
        [{ x: 1, y: -1 }, { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }],
    ],
    J: [
        // State 0: J pointing up
        [{ x: -1, y: -1 }, { x: -1, y: 0 }, { x: 0, y: 0 }, { x: 1, y: 0 }],
        // State 1: J pointing right
        [{ x: 0, y: -1 }, { x: 1, y: -1 }, { x: 0, y: 0 }, { x: 0, y: 1 }],
        // State 2: J pointing down
        [{ x: -1, y: 0 }, { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }],
        // State 3: J pointing left
        [{ x: 0, y: -1 }, { x: 0, y: 0 }, { x: -1, y: 1 }, { x: 0, y: 1 }],
    ],
    L: [
        // State 0: L pointing up
        [{ x: 1, y: -1 }, { x: -1, y: 0 }, { x: 0, y: 0 }, { x: 1, y: 0 }],
        // State 1: L pointing right
        [{ x: 0, y: -1 }, { x: 0, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }],
        // State 2: L pointing down
        [{ x: -1, y: 0 }, { x: 0, y: 0 }, { x: 1, y: 0 }, { x: -1, y: 1 }],
        // State 3: L pointing left
        [{ x: -1, y: -1 }, { x: 0, y: -1 }, { x: 0, y: 0 }, { x: 0, y: 1 }],
    ],
};

/**
 * Get the absolute positions of a piece's blocks
 */
export function getPieceBlocks(
    type: MinoType,
    rotation: number,
    x: number,
    y: number
): Position[] {
    const shape = PIECE_SHAPES[type][rotation % 4];
    return shape.map((block) => ({
        x: x + block.x,
        y: y + block.y,
    }));
}

/**
 * Get spawn position for a piece type
 */
export function getSpawnPosition(type: MinoType): { x: number; y: number } {
    // Spawn at top center, slightly different for I and O
    if (type === 'I') {
        return { x: 4, y: 1 };
    } else if (type === 'O') {
        return { x: 4, y: 0 };
    } else {
        return { x: 4, y: 1 };
    }
}

/**
 * Get bounding box for a piece shape (for preview rendering)
 */
export function getPieceBounds(type: MinoType): {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
    width: number;
    height: number;
} {
    const shape = PIECE_SHAPES[type][0];
    let minX = Infinity,
        maxX = -Infinity,
        minY = Infinity,
        maxY = -Infinity;

    for (const block of shape) {
        minX = Math.min(minX, block.x);
        maxX = Math.max(maxX, block.x);
        minY = Math.min(minY, block.y);
        maxY = Math.max(maxY, block.y);
    }

    return {
        minX,
        maxX,
        minY,
        maxY,
        width: maxX - minX + 1,
        height: maxY - minY + 1,
    };
}
