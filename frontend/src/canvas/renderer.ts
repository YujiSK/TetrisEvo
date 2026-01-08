import { GameState, MinoType } from '../core/types';
import { getPieceBlocks, PIECE_SHAPES } from '../core/pieces';
import { getGhostY } from '../core/engine';
import {
    BOARD_WIDTH,
    BOARD_HEIGHT,
    TOTAL_HEIGHT,
    CELL_SIZE,
    PREVIEW_CELL_SIZE,
    MINO_COLORS,
    GHOST_OPACITY,
    BUFFER_HEIGHT,
} from '../core/constants';

/**
 * Tetris Canvas Renderer
 */
export class Renderer {
    private ctx: CanvasRenderingContext2D;
    private holdCtx: CanvasRenderingContext2D;
    private nextCtx: CanvasRenderingContext2D;
    private width: number;
    private height: number;

    constructor(
        gameCanvas: HTMLCanvasElement,
        holdCanvas: HTMLCanvasElement,
        nextCanvas: HTMLCanvasElement
    ) {
        this.ctx = gameCanvas.getContext('2d')!;
        this.holdCtx = holdCanvas.getContext('2d')!;
        this.nextCtx = nextCanvas.getContext('2d')!;
        this.width = gameCanvas.width;
        this.height = gameCanvas.height;
    }

    /**
     * Render the complete game state
     */
    render(state: GameState): void {
        this.clear();
        this.drawGrid();
        this.drawBoard(state);
        this.drawGhost(state);
        this.drawCurrentPiece(state);
        this.drawHold(state);
        this.drawNext(state);
    }

    private clear(): void {
        this.ctx.fillStyle = '#0a0a15';
        this.ctx.fillRect(0, 0, this.width, this.height);

        this.holdCtx.fillStyle = '#0a0a15';
        this.holdCtx.fillRect(0, 0, 80, 60);

        this.nextCtx.fillStyle = '#0a0a15';
        this.nextCtx.fillRect(0, 0, 80, 180);
    }

    private drawGrid(): void {
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        this.ctx.lineWidth = 1;

        // Vertical lines
        for (let x = 0; x <= BOARD_WIDTH; x++) {
            this.ctx.beginPath();
            this.ctx.moveTo(x * CELL_SIZE, 0);
            this.ctx.lineTo(x * CELL_SIZE, this.height);
            this.ctx.stroke();
        }

        // Horizontal lines
        for (let y = 0; y <= BOARD_HEIGHT; y++) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y * CELL_SIZE);
            this.ctx.lineTo(this.width, y * CELL_SIZE);
            this.ctx.stroke();
        }
    }

    private drawBoard(state: GameState): void {
        for (let y = BUFFER_HEIGHT; y < TOTAL_HEIGHT; y++) {
            for (let x = 0; x < BOARD_WIDTH; x++) {
                const cell = state.board[y][x];
                if (cell) {
                    this.drawBlock(x, y - BUFFER_HEIGHT, cell);
                }
            }
        }
    }

    private drawGhost(state: GameState): void {
        if (!state.current) return;

        const ghostY = getGhostY(state);
        if (ghostY === null || ghostY === state.current.y) return;

        const blocks = getPieceBlocks(
            state.current.type,
            state.current.rotation,
            state.current.x,
            ghostY
        );

        for (const block of blocks) {
            if (block.y >= BUFFER_HEIGHT) {
                this.drawBlock(
                    block.x,
                    block.y - BUFFER_HEIGHT,
                    state.current.type,
                    GHOST_OPACITY
                );
            }
        }
    }

    private drawCurrentPiece(state: GameState): void {
        if (!state.current) return;

        const blocks = getPieceBlocks(
            state.current.type,
            state.current.rotation,
            state.current.x,
            state.current.y
        );

        for (const block of blocks) {
            if (block.y >= BUFFER_HEIGHT) {
                this.drawBlock(block.x, block.y - BUFFER_HEIGHT, state.current.type);
            }
        }
    }

    private drawBlock(
        x: number,
        y: number,
        type: MinoType,
        opacity: number = 1
    ): void {
        const color = MINO_COLORS[type];
        const px = x * CELL_SIZE;
        const py = y * CELL_SIZE;
        const size = CELL_SIZE - 1;

        // Fill
        this.ctx.globalAlpha = opacity;
        this.ctx.fillStyle = color;
        this.ctx.fillRect(px + 1, py + 1, size - 1, size - 1);

        // Highlight (top-left)
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        this.ctx.fillRect(px + 1, py + 1, size - 1, 3);
        this.ctx.fillRect(px + 1, py + 1, 3, size - 1);

        // Shadow (bottom-right)
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        this.ctx.fillRect(px + size - 3, py + 1, 3, size - 1);
        this.ctx.fillRect(px + 1, py + size - 3, size - 1, 3);

        this.ctx.globalAlpha = 1;
    }

    private drawHold(state: GameState): void {
        if (!state.hold) return;
        this.drawPreviewPiece(this.holdCtx, state.hold, 40, 30, state.holdUsed ? 0.4 : 1);
    }

    private drawNext(state: GameState): void {
        const spacing = 60;
        for (let i = 0; i < state.next.length; i++) {
            this.drawPreviewPiece(
                this.nextCtx,
                state.next[i],
                40,
                30 + i * spacing
            );
        }
    }

    private drawPreviewPiece(
        ctx: CanvasRenderingContext2D,
        type: MinoType,
        centerX: number,
        centerY: number,
        opacity: number = 1
    ): void {
        const shape = PIECE_SHAPES[type][0];
        const color = MINO_COLORS[type];
        const size = PREVIEW_CELL_SIZE;

        // Calculate bounds for centering
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        for (const block of shape) {
            minX = Math.min(minX, block.x);
            maxX = Math.max(maxX, block.x);
            minY = Math.min(minY, block.y);
            maxY = Math.max(maxY, block.y);
        }
        const width = (maxX - minX + 1) * size;
        const height = (maxY - minY + 1) * size;
        const offsetX = centerX - width / 2 - minX * size;
        const offsetY = centerY - height / 2 - minY * size;

        ctx.globalAlpha = opacity;

        for (const block of shape) {
            const px = offsetX + block.x * size;
            const py = offsetY + block.y * size;

            ctx.fillStyle = color;
            ctx.fillRect(px, py, size - 1, size - 1);

            // Simple highlight
            ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.fillRect(px, py, size - 1, 2);
            ctx.fillRect(px, py, 2, size - 1);
        }

        ctx.globalAlpha = 1;
    }
}
