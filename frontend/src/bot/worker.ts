import { GameState, Weights, WorkerRequest, WorkerResponse, Plan } from '../core/types';
import { plan } from './planner';

// WebWorker context
const ctx: Worker = self as unknown as Worker;

/**
 * Handle messages from main thread
 */
ctx.onmessage = (event: MessageEvent<WorkerRequest>) => {
    const { type, state, weights, useHold } = event.data;

    if (type === 'plan') {
        const result = plan(state, weights, useHold);

        const response: WorkerResponse = {
            type: 'plan',
            plan: result,
        };

        ctx.postMessage(response);
    }
};
