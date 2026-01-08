import {
    GameState,
    Board,
    MinoType,
    Action,
} from './types';
import {
    BOARD_WIDTH,
    TOTAL_HEIGHT,
    NEXT_QUEUE_SIZE,
    LINE_SCORES,
} from './constants';
import { BagRandomizer, generateSeed } from './rng';
import { getPieceBlocks, getSpawnPosition } from './pieces';
import { isValidPosition, tryRotate, tryMove, tryDrop, getDropY } from './srs';
import { cloneBoard } from './evaluator';

/**
 * Create an empty board
 */
export function createEmptyBoard(): Board {
    return Array.from({ length: TOTAL_HEIGHT }, () =>
        Array.from({ length: BOARD_WIDTH }, () => null)
    );
}

/**
 * Create a new game state
 */
export function createGame(seed?: number): GameState {
    const gameSeed = seed ?? generateSeed();
    const randomizer = new BagRandomizer(gameSeed);

    // Fill next queue
    const next: MinoType[] = [];
    for (let i = 0; i < NEXT_QUEUE_SIZE + 1; i++) {
        next.push(randomizer.next());
    }

    const firstPiece = next.shift()!;
    const spawnPos = getSpawnPosition(firstPiece);

    const state: GameState = {
        board: createEmptyBoard(),
        current: {
            type: firstPiece,
            rotation: 0,
            x: spawnPos.x,
            y: spawnPos.y,
        },
        next,
        hold: null,
        holdUsed: false,
        score: 0,
        lines: 0,
        pieces: 1,
        tetrisCount: 0,
        gameOver: false,
        seed: gameSeed,
        bagIndex: randomizer.getIndex(),
        bag: randomizer.getBag(),
    };

    // Check if spawn position is valid
    if (!isValidPosition(state.board, firstPiece, 0, spawnPos.x, spawnPos.y)) {
        state.gameOver = true;
    }

    return state;
}

/**
 * Spawn the next piece
 */
export function spawnNext(state: GameState): GameState {
    const randomizer = new BagRandomizer(state.seed, state.bag, state.bagIndex);
    const nextPiece = state.next[0];
    const newNext = [...state.next.slice(1), randomizer.next()];
    const spawnPos = getSpawnPosition(nextPiece);

    const newState: GameState = {
        ...state,
        current: {
            type: nextPiece,
            rotation: 0,
            x: spawnPos.x,
            y: spawnPos.y,
        },
        next: newNext,
        holdUsed: false,
        pieces: state.pieces + 1,
        bagIndex: randomizer.getIndex(),
        bag: randomizer.getBag(),
    };

    // Check for game over
    if (!isValidPosition(newState.board, nextPiece, 0, spawnPos.x, spawnPos.y)) {
        return { ...newState, gameOver: true, endedReason: 'TOP_OUT' };
    }

    return newState;
}

/**
 * Lock the current piece and clear lines
 */
export function lockPiece(state: GameState): GameState {
    if (!state.current || state.gameOver) return state;

    const newBoard = cloneBoard(state.board);
    const blocks = getPieceBlocks(
        state.current.type,
        state.current.rotation,
        state.current.x,
        state.current.y
    );

    // Place blocks
    for (const block of blocks) {
        if (block.y >= 0 && block.y < TOTAL_HEIGHT) {
            newBoard[block.y][block.x] = state.current.type;
        }
    }

    // Find complete lines
    const completeLines: number[] = [];
    for (let y = 0; y < TOTAL_HEIGHT; y++) {
        if (newBoard[y].every((cell) => cell !== null)) {
            completeLines.push(y);
        }
    }

    // Clear lines
    for (const y of completeLines) {
        newBoard.splice(y, 1);
        newBoard.unshift(Array.from({ length: BOARD_WIDTH }, () => null));
    }

    const linesCleared = completeLines.length;
    const scoreGain = LINE_SCORES[linesCleared] ?? 0;
    const addTetris = linesCleared >= 4 ? 1 : 0;

    // Debug logging
    if (linesCleared > 0) {
        console.log('[lineClear]', { linesCleared });
    }
    if (linesCleared >= 4) {
        console.log('[TETRIS!]', { linesCleared, newTetrisCount: (state.tetrisCount ?? 0) + 1 });
    }

    return {
        ...state,
        board: newBoard,
        current: null,
        score: state.score + scoreGain,
        lines: state.lines + linesCleared,
        tetrisCount: (state.tetrisCount ?? 0) + addTetris,
    };
}

/**
 * Move piece left
 */
export function moveLeft(state: GameState): GameState {
    if (!state.current || state.gameOver) return state;

    const result = tryMove(
        state.board,
        state.current.type,
        state.current.rotation,
        state.current.x,
        state.current.y,
        -1
    );

    if (result) {
        return {
            ...state,
            current: { ...state.current, x: result.x },
        };
    }

    return state;
}

/**
 * Move piece right
 */
export function moveRight(state: GameState): GameState {
    if (!state.current || state.gameOver) return state;

    const result = tryMove(
        state.board,
        state.current.type,
        state.current.rotation,
        state.current.x,
        state.current.y,
        1
    );

    if (result) {
        return {
            ...state,
            current: { ...state.current, x: result.x },
        };
    }

    return state;
}

/**
 * Rotate piece clockwise
 */
export function rotateCW(state: GameState): GameState {
    if (!state.current || state.gameOver) return state;

    const result = tryRotate(
        state.board,
        state.current.type,
        state.current.rotation,
        state.current.x,
        state.current.y,
        true
    );

    if (result) {
        return {
            ...state,
            current: {
                ...state.current,
                rotation: result.rotation,
                x: result.x,
                y: result.y,
            },
        };
    }

    return state;
}

/**
 * Rotate piece counter-clockwise
 */
export function rotateCCW(state: GameState): GameState {
    if (!state.current || state.gameOver) return state;

    const result = tryRotate(
        state.board,
        state.current.type,
        state.current.rotation,
        state.current.x,
        state.current.y,
        false
    );

    if (result) {
        return {
            ...state,
            current: {
                ...state.current,
                rotation: result.rotation,
                x: result.x,
                y: result.y,
            },
        };
    }

    return state;
}

/**
 * Soft drop (move down one)
 */
export function softDrop(state: GameState): GameState {
    if (!state.current || state.gameOver) return state;

    const result = tryDrop(
        state.board,
        state.current.type,
        state.current.rotation,
        state.current.x,
        state.current.y
    );

    if (result) {
        return {
            ...state,
            current: { ...state.current, y: result.y },
        };
    }

    return state;
}

/**
 * Hard drop (instant drop and lock)
 */
export function hardDrop(state: GameState): GameState {
    if (!state.current || state.gameOver) return state;

    const dropY = getDropY(
        state.board,
        state.current.type,
        state.current.rotation,
        state.current.x,
        state.current.y
    );

    const droppedState: GameState = {
        ...state,
        current: { ...state.current, y: dropY },
    };

    const lockedState = lockPiece(droppedState);
    return spawnNext(lockedState);
}

/**
 * Hold piece
 */
export function hold(state: GameState): GameState {
    if (!state.current || state.gameOver || state.holdUsed) return state;

    const currentType = state.current.type;

    if (state.hold === null) {
        // First hold - take from next queue
        const randomizer = new BagRandomizer(state.seed, state.bag, state.bagIndex);
        const nextPiece = state.next[0];
        const newNext = [...state.next.slice(1), randomizer.next()];
        const spawnPos = getSpawnPosition(nextPiece);

        const newState: GameState = {
            ...state,
            current: {
                type: nextPiece,
                rotation: 0,
                x: spawnPos.x,
                y: spawnPos.y,
            },
            hold: currentType,
            holdUsed: true,
            next: newNext,
            bagIndex: randomizer.getIndex(),
            bag: randomizer.getBag(),
        };

        if (!isValidPosition(newState.board, nextPiece, 0, spawnPos.x, spawnPos.y)) {
            return { ...newState, gameOver: true };
        }

        return newState;
    } else {
        // Swap with held piece
        const heldType = state.hold;
        const spawnPos = getSpawnPosition(heldType);

        const newState: GameState = {
            ...state,
            current: {
                type: heldType,
                rotation: 0,
                x: spawnPos.x,
                y: spawnPos.y,
            },
            hold: currentType,
            holdUsed: true,
        };

        if (!isValidPosition(newState.board, heldType, 0, spawnPos.x, spawnPos.y)) {
            return { ...newState, gameOver: true };
        }

        return newState;
    }
}

/**
 * Tick (auto-drop)
 */
export function tick(state: GameState): GameState {
    if (!state.current || state.gameOver) return state;

    const result = tryDrop(
        state.board,
        state.current.type,
        state.current.rotation,
        state.current.x,
        state.current.y
    );

    if (result) {
        return {
            ...state,
            current: { ...state.current, y: result.y },
        };
    } else {
        // Can't drop - lock and spawn next
        const lockedState = lockPiece(state);
        return spawnNext(lockedState);
    }
}

/**
 * Apply an action to the game state
 */
export function applyAction(state: GameState, action: Action): GameState {
    switch (action) {
        case 'L':
            return moveLeft(state);
        case 'R':
            return moveRight(state);
        case 'ROT_CW':
            return rotateCW(state);
        case 'ROT_CCW':
            return rotateCCW(state);
        case 'SOFT_DROP':
            return softDrop(state);
        case 'HARD_DROP':
            return hardDrop(state);
        case 'HOLD':
            return hold(state);
        case 'TICK':
            return tick(state);
        default:
            return state;
    }
}

/**
 * Get ghost position (where piece will land)
 */
export function getGhostY(state: GameState): number | null {
    if (!state.current) return null;

    return getDropY(
        state.board,
        state.current.type,
        state.current.rotation,
        state.current.x,
        state.current.y
    );
}
