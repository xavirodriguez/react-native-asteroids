"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RandomService = void 0;
/**
 * A service for generating pseudo-random numbers.
 *
 * @remarks
 * This service uses a Linear Congruential Generator (LCG) designed to provide
 * consistent results across platforms when provided with the same seed,
 * intended to support reproducible simulations under controlled conditions.
 *
 * @warning
 * **Non-Cryptographic**: This generator is not cryptographically secure and is expected to
 * show patterns over large sequences. It is optimized for speed and reproducibility
 * rather than high-quality randomness.
 */
class RandomService {
    seed;
    /**
     * Global flag to lock the gameplay context, intended to prevent
     * unintentional use of the gameplay RNG during non-simulation phases.
     */
    static lockGameplayContext = false;
    constructor(seed = Math.random()) {
        this.seed = seed;
    }
    setSeed(seed) {
        this.seed = seed;
    }
    getSeed() {
        return this.seed;
    }
    /**
     * Returns a pseudo-random number between 0 and 1.
     *
     * @remarks
     * This operation mutates the internal seed.
     */
    next() {
        this.seed = (this.seed * 9301 + 49297) % 233280;
        return this.seed / 233280;
    }
    range(min, max) {
        return min + this.next() * (max - min);
    }
    rangeInt(min, max) {
        return Math.floor(this.range(min, max));
    }
    nextRange(min, max) {
        return this.range(min, max);
    }
    nextInt(min, max) {
        return this.rangeInt(min, max);
    }
}
exports.RandomService = RandomService;
