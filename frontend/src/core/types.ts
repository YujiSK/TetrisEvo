// ===== Mino Types =====
export type MinoType = 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L';

// ===== Actions =====
export type Action =
    | 'L'
    | 'R'
    | 'ROT_CW'
    | 'ROT_CCW'
    | 'SOFT_DROP'
    | 'HARD_DROP'
    | 'HOLD'
    | 'TICK';

// ===== Ended Reason =====
export type EndedReason =
    | 'TOP_OUT'       // 通常のゲームオーバー（スポーン不可）
    | 'NO_VALID_PLAN' // 合法手が見つからない
    | 'MAX_PIECES'    // ピース上限で打ち切り
    | 'MAX_LINES'     // ライン上限で打ち切り
    | 'MAX_TIME'      // 時間上限で打ち切り
    | 'MAX_STEPS'     // AIステップ上限で打ち切り
    | 'STALLED';      // 状態が進まない（保険）

// ===== Position =====
export interface Position {
    x: number;
    y: number;
}

// ===== Current Piece =====
export interface CurrentPiece {
    type: MinoType;
    rotation: number; // 0-3
    x: number;
    y: number;
}

// ===== Board =====
// null = empty, string = mino type color
export type Cell = MinoType | null;
export type Board = Cell[][];

// ===== Game State =====
export interface GameState {
    board: Board;
    current: CurrentPiece | null;
    next: MinoType[];
    hold: MinoType | null;
    holdUsed: boolean; // can only hold once per piece
    score: number;
    lines: number;
    pieces: number;
    tetrisCount: number; // 4列以上同時消し回数
    gameOver: boolean;
    endedReason?: EndedReason;
    seed: number;
    bagIndex: number;
    bag: MinoType[];
}

// ===== Game Result (for logging) =====
export interface GameResult {
    gameId: string;
    seed: number;
    startedAt: string;
    endedAt: string;
    lines: number;
    pieces: number;
    score: number;
    tetrisCount: number;
    deathMaxHeight: number;
    weightsVersion: string;
    endedReason: EndedReason;
    durationMs: number;
}

// ===== Features =====
export interface BoardFeatures {
    linesCleared: number;
    holes: number;
    aggregateHeight: number;
    bumpiness: number;
    maxHeight: number;
    wells: number;
    tetrisReady: number; // 1 if board has a good Tetris well at edge
    tetrisBonus: number; // 1 if this move clears 4 lines
}

// ===== Weights =====
export interface Weights {
    linesCleared: number;
    holes: number;
    aggregateHeight: number;
    bumpiness: number;
    maxHeight: number;
    wells: number;
    tetrisReady: number;
    tetrisBonus: number;
}

// ===== Placement (result of planning) =====
export interface Placement {
    rotation: number;
    x: number;
    y: number;
    score: number;
    features: BoardFeatures;
    useHold: boolean;
}

// ===== Plan (actions to execute) =====
export interface Plan {
    actions: Action[];
    score: number;
}

// ===== Worker Messages =====
export interface WorkerRequest {
    type: 'plan';
    state: GameState;
    weights: Weights;
    useHold: boolean;
    useNext: boolean;
}

export interface WorkerResponse {
    type: 'plan';
    plan: Plan | null;
}
