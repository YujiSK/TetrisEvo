import { describe, it, expect } from 'vitest';
import {
    countHoles,
    getColumnHeights,
    getAggregateHeight,
    getBumpiness,
    getMaxHeight,
    getWells,
    evaluateBoard,
    scoreFeatures,
} from '../core/evaluator';
import { createEmptyBoard } from '../core/engine';
import { BOARD_WIDTH, TOTAL_HEIGHT } from '../core/constants';

describe('Evaluator', () => {
    describe('countHoles', () => {
        it('should return 0 for empty board', () => {
            const board = createEmptyBoard();
            expect(countHoles(board)).toBe(0);
        });

        it('should count holes correctly', () => {
            const board = createEmptyBoard();
            // Create a simple hole: block at row 10, empty at row 11
            board[TOTAL_HEIGHT - 5][5] = 'I'; // Block at height 5
            // Row below is empty = 1 hole (and more below)

            const holes = countHoles(board);
            expect(holes).toBe(4); // 4 empty cells below the block
        });

        it('should count multiple holes in different columns', () => {
            const board = createEmptyBoard();

            // Column 0: block at top, 3 empty below
            board[TOTAL_HEIGHT - 4][0] = 'I';
            // Column 5: block at top, 2 empty below
            board[TOTAL_HEIGHT - 3][5] = 'T';

            const holes = countHoles(board);
            expect(holes).toBe(3 + 2); // 5 holes total
        });
    });

    describe('getColumnHeights', () => {
        it('should return all zeros for empty board', () => {
            const board = createEmptyBoard();
            const heights = getColumnHeights(board);

            expect(heights).toHaveLength(BOARD_WIDTH);
            expect(heights.every(h => h === 0)).toBe(true);
        });

        it('should calculate heights correctly', () => {
            const board = createEmptyBoard();

            // Place block at different heights
            board[TOTAL_HEIGHT - 1][0] = 'I'; // Height 1
            board[TOTAL_HEIGHT - 5][3] = 'T'; // Height 5
            board[TOTAL_HEIGHT - 10][9] = 'O'; // Height 10

            const heights = getColumnHeights(board);

            expect(heights[0]).toBe(1);
            expect(heights[3]).toBe(5);
            expect(heights[9]).toBe(10);
        });
    });

    describe('getAggregateHeight', () => {
        it('should sum all heights', () => {
            const heights = [1, 2, 3, 4, 0, 0, 0, 0, 0, 5];
            expect(getAggregateHeight(heights)).toBe(15);
        });

        it('should return 0 for empty heights', () => {
            const heights = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
            expect(getAggregateHeight(heights)).toBe(0);
        });
    });

    describe('getBumpiness', () => {
        it('should return 0 for flat surface', () => {
            const heights = [5, 5, 5, 5, 5, 5, 5, 5, 5, 5];
            expect(getBumpiness(heights)).toBe(0);
        });

        it('should calculate bumpiness correctly', () => {
            const heights = [1, 3, 2, 4, 1, 1, 1, 1, 1, 1];
            // |1-3| + |3-2| + |2-4| + |4-1| + |1-1| * 5 = 2 + 1 + 2 + 3 + 0 = 8
            expect(getBumpiness(heights)).toBe(8);
        });
    });

    describe('getMaxHeight', () => {
        it('should return max height', () => {
            const heights = [1, 5, 3, 2, 8, 4, 2, 1, 0, 3];
            expect(getMaxHeight(heights)).toBe(8);
        });

        it('should return 0 for empty', () => {
            const heights = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
            expect(getMaxHeight(heights)).toBe(0);
        });
    });

    describe('getWells', () => {
        it('should return 0 for empty board', () => {
            const board = createEmptyBoard();
            expect(getWells(board)).toBe(0);
        });

        it('should detect well between blocks', () => {
            const board = createEmptyBoard();

            // Create a well at column 5
            // Columns 4 and 6 have blocks, column 5 is empty
            board[TOTAL_HEIGHT - 1][4] = 'I';
            board[TOTAL_HEIGHT - 1][6] = 'I';

            const wells = getWells(board);
            expect(wells).toBeGreaterThan(0);
        });

        it('should detect well at edge', () => {
            const board = createEmptyBoard();

            // Create a well at column 0 (left wall + block at column 1)
            board[TOTAL_HEIGHT - 1][1] = 'I';

            const wells = getWells(board);
            expect(wells).toBeGreaterThan(0);
        });
    });

    describe('evaluateBoard', () => {
        it('should return all features', () => {
            const board = createEmptyBoard();
            const features = evaluateBoard(board, 0);

            expect(features).toHaveProperty('linesCleared');
            expect(features).toHaveProperty('holes');
            expect(features).toHaveProperty('aggregateHeight');
            expect(features).toHaveProperty('bumpiness');
            expect(features).toHaveProperty('maxHeight');
            expect(features).toHaveProperty('wells');
        });

        it('should use provided linesCleared', () => {
            const board = createEmptyBoard();
            const features = evaluateBoard(board, 4);

            expect(features.linesCleared).toBe(4);
        });
    });

    describe('scoreFeatures', () => {
        it('should calculate weighted score correctly', () => {
            const features = {
                linesCleared: 2,
                holes: 3,
                aggregateHeight: 20,
                bumpiness: 5,
                maxHeight: 8,
                wells: 2,
            };

            const weights = {
                linesCleared: 1.0,
                holes: -1.0,
                aggregateHeight: -0.5,
                bumpiness: -0.2,
                maxHeight: -0.1,
                wells: -0.1,
            };

            const score = scoreFeatures(features, weights);

            // 2*1 + 3*(-1) + 20*(-0.5) + 5*(-0.2) + 8*(-0.1) + 2*(-0.1)
            // = 2 - 3 - 10 - 1 - 0.8 - 0.2 = -13
            expect(score).toBeCloseTo(-13, 5);
        });

        it('should handle missing weights', () => {
            const features = {
                linesCleared: 2,
                holes: 1,
                aggregateHeight: 10,
                bumpiness: 2,
                maxHeight: 5,
                wells: 1,
            };

            const weights = {
                linesCleared: 1.0,
                // other weights missing
            };

            const score = scoreFeatures(features, weights as any);
            expect(score).toBe(2); // Only linesCleared counts
        });
    });
});
