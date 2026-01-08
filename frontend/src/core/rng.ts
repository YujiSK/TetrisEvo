import { MinoType } from './types';

/**
 * Seeded pseudo-random number generator (Mulberry32)
 * Deterministic and reproducible with the same seed
 */
export class RNG {
    private state: number;

    constructor(seed: number) {
        this.state = seed;
    }

    /**
     * Returns a float between 0 and 1
     */
    next(): number {
        let t = (this.state += 0x6d2b79f5);
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }

    /**
     * Returns an integer between 0 and max-1
     */
    nextInt(max: number): number {
        return Math.floor(this.next() * max);
    }

    /**
     * Shuffle array in place using Fisher-Yates
     */
    shuffle<T>(array: T[]): T[] {
        for (let i = array.length - 1; i > 0; i--) {
            const j = this.nextInt(i + 1);
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    /**
     * Get current state (for saving)
     */
    getState(): number {
        return this.state;
    }

    /**
     * Set state (for restoring)
     */
    setState(state: number): void {
        this.state = state;
    }
}

const MINO_TYPES: MinoType[] = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];

/**
 * 7-bag randomizer
 * Generates a shuffled bag of all 7 pieces, then next bag, etc.
 */
export class BagRandomizer {
    private rng: RNG;
    private bag: MinoType[];
    private index: number;

    constructor(seed: number, existingBag?: MinoType[], existingIndex?: number) {
        this.rng = new RNG(seed);
        if (existingBag && existingIndex !== undefined) {
            this.bag = existingBag;
            this.index = existingIndex;
        } else {
            this.bag = this.generateBag();
            this.index = 0;
        }
    }

    private generateBag(): MinoType[] {
        const bag = [...MINO_TYPES];
        return this.rng.shuffle(bag);
    }

    next(): MinoType {
        if (this.index >= this.bag.length) {
            this.bag = this.generateBag();
            this.index = 0;
        }
        return this.bag[this.index++];
    }

    peek(count: number): MinoType[] {
        const result: MinoType[] = [];
        let tempBag = [...this.bag];
        let tempIndex = this.index;
        const tempRng = new RNG(this.rng.getState());

        for (let i = 0; i < count; i++) {
            if (tempIndex >= tempBag.length) {
                tempBag = [...MINO_TYPES];
                tempRng.shuffle(tempBag);
                tempIndex = 0;
            }
            result.push(tempBag[tempIndex++]);
        }

        return result;
    }

    getBag(): MinoType[] {
        return [...this.bag];
    }

    getIndex(): number {
        return this.index;
    }

    getSeed(): number {
        return this.rng.getState();
    }
}

/**
 * Generate a random seed
 */
export function generateSeed(): number {
    return Math.floor(Math.random() * 2147483647);
}
