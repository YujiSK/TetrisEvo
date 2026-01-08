import { GameState, Action, GameResult, Plan, EndedReason } from '../core/types';
import { createGame, applyAction } from '../core/engine';
import { plan } from './planner';
import { getWeights, getWeightsHash, startWeightsPolling } from './weights';
import { postLog } from '../net/api';
import { getMaxHeight, getColumnHeights } from '../core/evaluator';
import { AI_TICK_INTERVAL } from '../core/constants';

// ===== Limit Constants =====
const MAX_PIECES_PER_GAME = 1500;      // 学習用途の鉄板。まずこれで止める
const MAX_LINES_PER_GAME = 3000;       // ほぼ到達しない保険
const MAX_TIME_MS_PER_GAME = 600_000;  // 10分で打ち切り（保険のみ）
const MAX_STEPS_PER_GAME = 50_000;     // AIアクション上限（保険）
const STALLED_LIMIT = 200;             // 200 tick 進まなければ強制終了

// ===== Game State =====
let gameState: GameState;
let gamesPlayed = 0;
let autoMode = false;
let autoInterval: number | null = null;
let currentPlan: Plan | null = null;
let actionIndex = 0;
let gameStartTime: string = '';
let gameStartMs = 0;
let stepsInGame = 0;

// 「進んでない」検知
let lastProgressKey = '';
let stalledTicks = 0;

// 終了理由を保持
let lastEndedReason: EndedReason = 'TOP_OUT';

// Callbacks for UI updates
let onStateChange: ((state: GameState, games: number, hash: string) => void) | null = null;
let onAutoChange: ((isAuto: boolean) => void) | null = null;

/**
 * Initialize the bot system
 */
export function initBot(
    onState: (state: GameState, games: number, hash: string) => void,
    onAuto: (isAuto: boolean) => void
): void {
    onStateChange = onState;
    onAutoChange = onAuto;

    // Start polling for weight updates
    startWeightsPolling();

    // Initialize first game
    resetGame();
}

/**
 * Get current game state
 */
export function getState(): GameState {
    return gameState;
}

/**
 * Apply an action manually
 */
export function apply(action: Action): void {
    if (gameState.gameOver) return;
    gameState = applyAction(gameState, action);
    notifyStateChange();
}

/**
 * Generate a unique seed for each game
 */
function generateUniqueSeed(): number {
    // Use crypto API if available for better randomness
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
        const arr = new Uint32Array(1);
        crypto.getRandomValues(arr);
        return arr[0];
    }
    // Fallback: mix Date.now with game counter
    return (Date.now() ^ (gamesPlayed * 2654435761)) >>> 0;
}

/**
 * Reset to a new game
 */
export function resetGame(seed?: number): void {
    const newSeed = seed ?? generateUniqueSeed();
    console.log(`Starting new game with seed: ${newSeed}`);
    gameState = createGame(newSeed);
    currentPlan = null;
    actionIndex = 0;
    gameStartTime = new Date().toISOString();
    gameStartMs = Date.now();
    stepsInGame = 0;
    lastProgressKey = '';
    stalledTicks = 0;
    lastEndedReason = 'TOP_OUT';
    notifyStateChange();
}

/**
 * Force end game with a reason
 */
function forceEndGame(reason: EndedReason): void {
    lastEndedReason = reason;
    gameState = { ...gameState, gameOver: true, endedReason: reason };
}

/**
 * Check limits and stall detection
 */
function checkLimitsAndStall(): void {
    // 1) 上限チェック
    if (gameState.pieces >= MAX_PIECES_PER_GAME) {
        forceEndGame('MAX_PIECES');
        return;
    }
    if (gameState.lines >= MAX_LINES_PER_GAME) {
        forceEndGame('MAX_LINES');
        return;
    }
    if (Date.now() - gameStartMs >= MAX_TIME_MS_PER_GAME) {
        forceEndGame('MAX_TIME');
        return;
    }
    if (stepsInGame >= MAX_STEPS_PER_GAME) {
        forceEndGame('MAX_STEPS');
        return;
    }

    // 2) 進捗がない（詰まり）検知
    const key = `${gameState.pieces}|${gameState.lines}|${gameState.score}|${gameState.current?.type ?? 'N'}|${gameState.current?.x ?? 0},${gameState.current?.y ?? 0},${gameState.current?.rotation ?? 0}`;

    if (key === lastProgressKey) {
        stalledTicks++;
        if (stalledTicks >= STALLED_LIMIT) {
            forceEndGame('STALLED');
            return;
        }
    } else {
        lastProgressKey = key;
        stalledTicks = 0;
    }
}

/**
 * Start auto mode
 */
export function startAuto(): void {
    if (autoMode) return;

    autoMode = true;
    onAutoChange?.(true);

    // ゲーム開始時刻系を初期化
    if (!gameStartTime) gameStartTime = new Date().toISOString();
    if (!gameStartMs) gameStartMs = Date.now();

    // Start game loop
    autoInterval = window.setInterval(autoTick, AI_TICK_INTERVAL);
    console.log('Auto mode started');
}

/**
 * Stop auto mode
 */
export function stopAuto(): void {
    if (!autoMode) return;

    autoMode = false;
    onAutoChange?.(false);

    if (autoInterval !== null) {
        clearInterval(autoInterval);
        autoInterval = null;
    }

    console.log('Auto mode stopped');
}

/**
 * Toggle auto mode
 */
export function toggleAuto(): void {
    if (autoMode) {
        stopAuto();
    } else {
        startAuto();
    }
}

/**
 * Auto tick - execute one action from the plan
 */
function autoTick(): void {
    if (!autoMode) return;

    // tickごとにステップ増加
    stepsInGame++;

    // 先に「上限」「詰まり」をチェックして強制終了できるようにする
    checkLimitsAndStall();

    // Handle game over
    if (gameState.gameOver) {
        // endedReasonが未設定なら、最低限保持しておく
        lastEndedReason = gameState.endedReason ?? lastEndedReason;
        handleGameOver();
        return;
    }

    // Get or create plan
    if (!currentPlan || actionIndex >= currentPlan.actions.length) {
        const weights = getWeights();
        currentPlan = plan(gameState, weights, true);
        actionIndex = 0;

        if (!currentPlan) {
            // No valid moves - game over
            forceEndGame('NO_VALID_PLAN');
            handleGameOver();
            return;
        }
    }

    // Execute next action
    const action = currentPlan.actions[actionIndex];
    gameState = applyAction(gameState, action);
    actionIndex++;

    if (action === 'HARD_DROP') {
        currentPlan = null;
    }

    notifyStateChange();
}

/**
 * Handle game over - log result and start new game
 */
async function handleGameOver(): Promise<void> {
    gamesPlayed++;

    // Calculate death features
    const heights = getColumnHeights(gameState.board);
    const deathMaxHeight = getMaxHeight(heights);

    const endedAtIso = new Date().toISOString();
    const durationMs = gameStartMs ? (Date.now() - gameStartMs) : 0;

    const endedReason: EndedReason = gameState.endedReason ?? lastEndedReason ?? 'TOP_OUT';

    // Create game result
    const result: GameResult = {
        gameId: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        seed: gameState.seed,
        startedAt: gameStartTime,
        endedAt: endedAtIso,
        lines: gameState.lines,
        pieces: gameState.pieces,
        score: gameState.score,
        tetrisCount: gameState.tetrisCount ?? 0,
        deathMaxHeight,
        weightsVersion: getWeightsHash(),
        endedReason,
        durationMs,
    };

    // Post log (don't await - fire and forget)
    postLog(result);

    console.log(
        `Game ${gamesPlayed} ended [${endedReason}]: seed=${result.seed} lines=${result.lines} pieces=${result.pieces} score=${result.score} tetris4p=${result.tetrisCount} duration=${durationMs}ms`
    );

    // Small delay before starting new game
    await new Promise(resolve => setTimeout(resolve, 200));

    // Start new game if still in auto mode
    if (autoMode) {
        resetGame();
    }
}

/**
 * Notify state change to UI
 */
function notifyStateChange(): void {
    onStateChange?.(gameState, gamesPlayed, getWeightsHash());
}

// Export for window.tetrisBot
export const tetrisBot = {
    getState,
    apply,
    startAuto,
    stopAuto,
    resetGame,
    toggleAuto,
};
