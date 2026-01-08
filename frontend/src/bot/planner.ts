import {
    GameState,
    MinoType,
    Placement,
    Action,
    Weights,
} from '../core/types';
import { BOARD_WIDTH, TOTAL_HEIGHT } from '../core/constants';
import { getPieceBlocks, getSpawnPosition } from '../core/pieces';
import { isValidPosition, getDropY } from '../core/srs';
import { evaluateBoard, scoreFeatures, cloneBoard } from '../core/evaluator';

/**
 * Generate all legal placements for a piece type
 */
export function generatePlacements(
    board: GameState['board'],
    pieceType: MinoType,
    weights: Weights
): Placement[] {
    const placements: Placement[] = [];

    // Try all rotations
    for (let rotation = 0; rotation < 4; rotation++) {
        // Try all x positions
        for (let x = -2; x < BOARD_WIDTH + 2; x++) {
            // Start from spawn position y
            const spawnY = getSpawnPosition(pieceType).y;

            // Check if this position is reachable (valid at spawn height)
            if (!isValidPosition(board, pieceType, rotation, x, spawnY)) {
                continue;
            }

            // Get where the piece would land
            const dropY = getDropY(board, pieceType, rotation, x, spawnY);

            // Simulate placing the piece
            const testBoard = cloneBoard(board);
            const blocks = getPieceBlocks(pieceType, rotation, x, dropY);

            // Place blocks on test board
            for (const block of blocks) {
                if (block.y >= 0 && block.y < TOTAL_HEIGHT) {
                    testBoard[block.y][block.x] = pieceType;
                }
            }

            // Find and clear complete lines
            let linesCleared = 0;
            for (let y = TOTAL_HEIGHT - 1; y >= 0; y--) {
                if (testBoard[y].every((cell) => cell !== null)) {
                    testBoard.splice(y, 1);
                    testBoard.unshift(Array.from({ length: BOARD_WIDTH }, () => null));
                    linesCleared++;
                    y++; // Check this row again
                }
            }

            // Evaluate the resulting board
            const features = evaluateBoard(testBoard, linesCleared);
            const score = scoreFeatures(features, weights);

            placements.push({
                rotation,
                x,
                y: dropY,
                score,
                features,
                useHold: false,
            });
        }
    }

    return placements;
}

/**
 * Find the best placement for the current piece
 */
export function findBestPlacement(
    state: GameState,
    weights: Weights,
    useHold: boolean = true
): Placement | null {
    if (!state.current) return null;

    let allPlacements: Placement[] = [];

    // Placements for current piece
    const currentPlacements = generatePlacements(
        state.board,
        state.current.type,
        weights
    );
    allPlacements.push(...currentPlacements);

    // Placements for hold piece (if enabled and available)
    if (useHold && !state.holdUsed) {
        const holdType = state.hold ?? state.next[0];
        if (holdType && holdType !== state.current.type) {
            const holdPlacements = generatePlacements(state.board, holdType, weights);
            for (const p of holdPlacements) {
                p.useHold = true;
            }
            allPlacements.push(...holdPlacements);
        }
    }

    if (allPlacements.length === 0) return null;

    // Sort by score (descending) and return best
    allPlacements.sort((a, b) => b.score - a.score);
    return allPlacements[0];
}

/**
 * Generate actions to reach a placement from current position
 */
export function generateActions(
    state: GameState,
    placement: Placement
): Action[] {
    if (!state.current) return [];

    const actions: Action[] = [];

    // Hold first if needed
    if (placement.useHold) {
        actions.push('HOLD');
        // After hold, the piece is at spawn position with rotation 0
        // We need to recalculate moves for the held piece
    }

    // Calculate rotations needed
    const currentRotation = placement.useHold ? 0 : state.current.rotation;
    let rotationsNeeded = (placement.rotation - currentRotation + 4) % 4;

    // Add rotations (prefer CW for fewer moves)
    if (rotationsNeeded === 3) {
        actions.push('ROT_CCW');
    } else {
        for (let i = 0; i < rotationsNeeded; i++) {
            actions.push('ROT_CW');
        }
    }

    // Calculate horizontal movement
    const currentX = placement.useHold
        ? getSpawnPosition(state.hold ?? state.next[0]).x
        : state.current.x;
    const dx = placement.x - currentX;

    if (dx > 0) {
        for (let i = 0; i < dx; i++) {
            actions.push('R');
        }
    } else if (dx < 0) {
        for (let i = 0; i < -dx; i++) {
            actions.push('L');
        }
    }

    // Hard drop to lock
    actions.push('HARD_DROP');

    return actions;
}

/**
 * Plan the next move
 */
export function plan(
    state: GameState,
    weights: Weights,
    useHold: boolean = true
): { actions: Action[]; score: number } | null {
    const best = findBestPlacement(state, weights, useHold);
    if (!best) return null;

    const actions = generateActions(state, best);
    return { actions, score: best.score };
}
