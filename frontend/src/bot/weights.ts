import { Weights } from '../core/types';
import { fetchWeights, hashWeights } from '../net/api';
import { WEIGHTS_POLL_INTERVAL } from '../core/constants';

// Default weights - Tetris-priority strategy
const DEFAULT_WEIGHTS: Weights = {
    linesCleared: 0.2,      // Low reward for any line clear
    holes: -0.60,           // Strong penalty for holes
    aggregateHeight: -0.40, // Moderate height penalty
    bumpiness: -0.10,       // Low bumpiness penalty (allow Tetris wells)
    maxHeight: -0.20,       // Moderate max height penalty
    wells: 0.0,             // No penalty for wells (Tetris needs them!)
    tetrisReady: 0.50,      // Bonus for having a Tetris-ready well
    tetrisBonus: 5.0,       // HUGE bonus for 4-line clear
};

let currentWeights: Weights = { ...DEFAULT_WEIGHTS };
let currentHash: string = hashWeights(currentWeights);
let pollInterval: number | null = null;
let onUpdateCallback: ((weights: Weights, hash: string) => void) | null = null;

/**
 * Get current weights
 */
export function getWeights(): Weights {
    return currentWeights;
}

/**
 * Get current weights hash
 */
export function getWeightsHash(): string {
    return currentHash;
}

/**
 * Set callback for weight updates
 */
export function onWeightsUpdate(
    callback: (weights: Weights, hash: string) => void
): void {
    onUpdateCallback = callback;
}

/**
 * Fetch and update weights from backend
 */
async function updateWeights(): Promise<void> {
    const weights = await fetchWeights();

    if (weights) {
        const newHash = hashWeights(weights);

        if (newHash !== currentHash) {
            currentWeights = weights;
            currentHash = newHash;
            console.log('Weights updated:', currentHash);

            if (onUpdateCallback) {
                onUpdateCallback(currentWeights, currentHash);
            }
        }
    }
}

/**
 * Start polling for weight updates
 */
export function startWeightsPolling(): void {
    if (pollInterval !== null) return;

    // Initial fetch
    updateWeights();

    // Start polling
    pollInterval = window.setInterval(updateWeights, WEIGHTS_POLL_INTERVAL);
    console.log('Started weights polling');
}

/**
 * Stop polling for weight updates
 */
export function stopWeightsPolling(): void {
    if (pollInterval !== null) {
        clearInterval(pollInterval);
        pollInterval = null;
        console.log('Stopped weights polling');
    }
}

/**
 * Get default weights (for offline mode)
 */
export function getDefaultWeights(): Weights {
    return { ...DEFAULT_WEIGHTS };
}
