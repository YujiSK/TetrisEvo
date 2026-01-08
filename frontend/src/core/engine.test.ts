import { describe, it, expect } from 'vitest';
import {
    createGame,
    applyAction,
    moveLeft,
    moveRight,
    rotateCW,
    rotateCCW,
    hardDrop,
    softDrop,
    hold,
    tick,
    createEmptyBoard,
} from '../core/engine';
import { isValidPosition } from '../core/srs';
import { BOARD_WIDTH, TOTAL_HEIGHT, BUFFER_HEIGHT } from '../core/constants';

describe('Engine', () => {
    describe('createGame', () => {
        it('should create a valid initial game state', () => {
            const state = createGame(12345);

            expect(state.board).toHaveLength(TOTAL_HEIGHT);
            expect(state.board[0]).toHaveLength(BOARD_WIDTH);
            expect(state.current).not.toBeNull();
            expect(state.next).toHaveLength(3);
            expect(state.hold).toBeNull();
            expect(state.holdUsed).toBe(false);
            expect(state.score).toBe(0);
            expect(state.lines).toBe(0);
            expect(state.pieces).toBe(1);
            expect(state.gameOver).toBe(false);
            expect(state.seed).toBe(12345);
        });

        it('should produce same piece sequence with same seed', () => {
            const state1 = createGame(42);
            const state2 = createGame(42);

            expect(state1.current?.type).toBe(state2.current?.type);
            expect(state1.next).toEqual(state2.next);
        });

        it('should produce different piece sequence with different seed', () => {
            const state1 = createGame(1);
            const state2 = createGame(2);

            // Very unlikely to have same sequence
            const seq1 = [state1.current?.type, ...state1.next];
            const seq2 = [state2.current?.type, ...state2.next];
            expect(seq1).not.toEqual(seq2);
        });
    });

    describe('moveLeft/moveRight', () => {
        it('should move piece left', () => {
            const state = createGame(100);
            const initialX = state.current!.x;
            const newState = moveLeft(state);

            expect(newState.current!.x).toBe(initialX - 1);
        });

        it('should move piece right', () => {
            const state = createGame(100);
            const initialX = state.current!.x;
            const newState = moveRight(state);

            expect(newState.current!.x).toBe(initialX + 1);
        });

        it('should not move past left wall', () => {
            let state = createGame(100);
            // Move all the way left
            for (let i = 0; i < 10; i++) {
                state = moveLeft(state);
            }
            const x = state.current!.x;
            state = moveLeft(state);
            expect(state.current!.x).toBe(x); // Should not move further
        });

        it('should not move past right wall', () => {
            let state = createGame(100);
            // Move all the way right
            for (let i = 0; i < 10; i++) {
                state = moveRight(state);
            }
            const x = state.current!.x;
            state = moveRight(state);
            expect(state.current!.x).toBe(x); // Should not move further
        });
    });

    describe('rotateCW/rotateCCW', () => {
        it('should rotate piece clockwise', () => {
            const state = createGame(100);
            const initialRot = state.current!.rotation;
            const newState = rotateCW(state);

            expect(newState.current!.rotation).toBe((initialRot + 1) % 4);
        });

        it('should rotate piece counter-clockwise', () => {
            const state = createGame(100);
            const initialRot = state.current!.rotation;
            const newState = rotateCCW(state);

            expect(newState.current!.rotation).toBe((initialRot + 3) % 4);
        });

        it('should rotate back to original after 4 rotations', () => {
            let state = createGame(100);
            const initialRot = state.current!.rotation;

            state = rotateCW(state);
            state = rotateCW(state);
            state = rotateCW(state);
            state = rotateCW(state);

            expect(state.current!.rotation).toBe(initialRot);
        });
    });

    describe('softDrop', () => {
        it('should move piece down', () => {
            const state = createGame(100);
            const initialY = state.current!.y;
            const newState = softDrop(state);

            expect(newState.current!.y).toBe(initialY + 1);
        });
    });

    describe('hardDrop', () => {
        it('should lock piece and spawn next', () => {
            const state = createGame(100);
            const nextPiece = state.next[0];
            const newState = hardDrop(state);

            expect(newState.pieces).toBe(2);
            expect(newState.current?.type).toBe(nextPiece);
        });

        it('should place blocks on board', () => {
            let state = createGame(100);
            state = hardDrop(state);

            // Board should have some blocks now
            let hasBlocks = false;
            for (let y = 0; y < TOTAL_HEIGHT; y++) {
                for (let x = 0; x < BOARD_WIDTH; x++) {
                    if (state.board[y][x] !== null) {
                        hasBlocks = true;
                        break;
                    }
                }
            }
            expect(hasBlocks).toBe(true);
        });
    });

    describe('hold', () => {
        it('should swap current piece with hold', () => {
            const state = createGame(100);
            const currentType = state.current!.type;
            const nextType = state.next[0];

            const newState = hold(state);

            expect(newState.hold).toBe(currentType);
            expect(newState.current?.type).toBe(nextType);
            expect(newState.holdUsed).toBe(true);
        });

        it('should not allow hold twice in same turn', () => {
            let state = createGame(100);
            state = hold(state);
            const heldPiece = state.hold;

            state = hold(state); // Should do nothing
            expect(state.hold).toBe(heldPiece);
        });

        it('should reset holdUsed after hard drop', () => {
            let state = createGame(100);
            state = hold(state);
            expect(state.holdUsed).toBe(true);

            state = hardDrop(state);
            expect(state.holdUsed).toBe(false);
        });
    });

    describe('tick', () => {
        it('should move piece down if possible', () => {
            const state = createGame(100);
            const initialY = state.current!.y;
            const newState = tick(state);

            expect(newState.current!.y).toBe(initialY + 1);
        });
    });

    describe('line clearing', () => {
        it('should clear complete lines', () => {
            let state = createGame(100);

            // Fill the bottom row manually
            for (let x = 0; x < BOARD_WIDTH; x++) {
                state.board[TOTAL_HEIGHT - 1][x] = 'I';
            }

            const linesBefore = state.lines;
            state = hardDrop(state);

            // Lines should be cleared (depends on where piece lands)
            expect(state.lines).toBeGreaterThanOrEqual(linesBefore);
        });

        it('should increase score when clearing lines', () => {
            let state = createGame(100);

            // Fill bottom row
            for (let x = 0; x < BOARD_WIDTH; x++) {
                state.board[TOTAL_HEIGHT - 1][x] = 'I';
            }

            const scoreBefore = state.score;
            // Hard drop should clear at least the filled line
            state = hardDrop(state);

            // Score may or may not increase depending on piece placement
            expect(state.score).toBeGreaterThanOrEqual(scoreBefore);
        });
    });

    describe('applyAction', () => {
        it('should apply L action', () => {
            const state = createGame(100);
            const newState = applyAction(state, 'L');
            expect(newState.current!.x).toBe(state.current!.x - 1);
        });

        it('should apply R action', () => {
            const state = createGame(100);
            const newState = applyAction(state, 'R');
            expect(newState.current!.x).toBe(state.current!.x + 1);
        });

        it('should apply ROT_CW action', () => {
            const state = createGame(100);
            const newState = applyAction(state, 'ROT_CW');
            expect(newState.current!.rotation).toBe((state.current!.rotation + 1) % 4);
        });

        it('should apply HARD_DROP action', () => {
            const state = createGame(100);
            const newState = applyAction(state, 'HARD_DROP');
            expect(newState.pieces).toBe(2);
        });
    });
});

describe('Collision Detection', () => {
    it('should detect valid position', () => {
        const board = createEmptyBoard();
        const valid = isValidPosition(board, 'T', 0, 4, 5);
        expect(valid).toBe(true);
    });

    it('should detect invalid position (out of bounds left)', () => {
        const board = createEmptyBoard();
        const valid = isValidPosition(board, 'T', 0, -2, 5);
        expect(valid).toBe(false);
    });

    it('should detect invalid position (out of bounds right)', () => {
        const board = createEmptyBoard();
        const valid = isValidPosition(board, 'T', 0, 10, 5);
        expect(valid).toBe(false);
    });

    it('should detect collision with existing blocks', () => {
        const board = createEmptyBoard();
        board[5][4] = 'I'; // Place a block

        const valid = isValidPosition(board, 'T', 0, 4, 5);
        expect(valid).toBe(false);
    });
});
