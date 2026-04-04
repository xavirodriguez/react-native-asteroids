class SeededRandom {
    private seed: number;

    constructor(seed: number) {
        this.seed = seed;
    }

    next(): number {
        // Xorshift32 algorithm for deterministic PRNG
        this.seed ^= this.seed << 13;
        this.seed ^= this.seed >> 17;
        this.seed ^= this.seed << 5;
        return this.seed >>> 0;
    }

    nextInt(min: number, max: number): number {
        return Math.floor(this.next() / (0xFFFFFFFF + 1) * (max - min + 1)) + min;
    }

    nextRange(min: number, max: number): number {
        return this.nextInt(min, max);
    }
}