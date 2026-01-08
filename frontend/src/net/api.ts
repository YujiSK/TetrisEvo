import { BACKEND_URL } from '../core/constants';
import { GameResult, Weights } from '../core/types';

/**
 * Post game result to backend
 */
export async function postLog(result: GameResult): Promise<void> {
    try {
        const response = await fetch(`${BACKEND_URL}/log`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(result),
        });

        if (!response.ok) {
            console.error('Failed to post log:', response.statusText);
        }
    } catch (error) {
        console.error('Failed to post log:', error);
    }
}

/**
 * Fetch current weights from backend
 */
export async function fetchWeights(): Promise<Weights | null> {
    try {
        const response = await fetch(`${BACKEND_URL}/weights`);

        if (!response.ok) {
            console.error('Failed to fetch weights:', response.statusText);
            return null;
        }

        return await response.json();
    } catch (error) {
        console.error('Failed to fetch weights:', error);
        return null;
    }
}

/**
 * Fetch summary statistics
 */
export async function fetchSummary(): Promise<Record<string, unknown> | null> {
    try {
        const response = await fetch(`${BACKEND_URL}/summary`);

        if (!response.ok) {
            console.error('Failed to fetch summary:', response.statusText);
            return null;
        }

        return await response.json();
    } catch (error) {
        console.error('Failed to fetch summary:', error);
        return null;
    }
}

/**
 * Generate a hash for weights (for display/comparison)
 */
export function hashWeights(weights: Weights): string {
    const str = JSON.stringify(weights);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16).padStart(8, '0');
}
