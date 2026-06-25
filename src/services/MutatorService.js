"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MutatorService = void 0;
const async_storage_1 = __importDefault(require("@react-native-async-storage/async-storage"));
const MutatorConfig_1 = require("../config/MutatorConfig");
const ServerTimeService_1 = require("./ServerTimeService");
const MUTATORS_ENABLED_KEY = "settings:mutators_enabled";
/**
 * Weekly Mutator Management Service.
 *
 * @responsibility Handle the selection and rotation of global gameplay mutators.
 * @responsibility Ensure cross-client seed consistency for periodic events.
 */
class MutatorService {
    static cachedMutators = null;
    static cachedSeed = null;
    static lockedSeed = null;
    static lockedSeedSource = null;
    /**
     * Locks the current seed for the duration of a game session.
     * Intended to help ensure mutators don't change if the server week transitions during a match.
     */
    static lockSessionSeed(forceSeed) {
        if (forceSeed !== undefined) {
            this.lockedSeed = forceSeed;
            this.lockedSeedSource = "server";
            return;
        }
        const serverSeed = ServerTimeService_1.ServerTimeService.getWeekSeed();
        if (serverSeed !== null) {
            this.lockedSeed = serverSeed;
            this.lockedSeedSource = "server";
        }
        else {
            this.lockedSeed = this.getISOWeekNumber(new Date(ServerTimeService_1.ServerTimeService.getCorrectedTime()));
            this.lockedSeedSource = "local-fallback";
        }
    }
    /**
     * Unlocks the session seed.
     */
    static unlockSessionSeed() {
        this.lockedSeed = null;
        this.lockedSeedSource = null;
    }
    /**
     * Returns the mutators active for the current week.
     *
     * @param forceSeed - Optional seed to bypass server/local time logic.
     */
    static getWeeklyMutators(forceSeed) {
        let source = "local-fallback";
        let seed;
        if (forceSeed !== undefined) {
            seed = forceSeed;
            source = "server";
        }
        else if (this.lockedSeed !== null) {
            seed = this.lockedSeed;
            source = this.lockedSeedSource || "server";
        }
        else {
            const serverSeed = ServerTimeService_1.ServerTimeService.getWeekSeed();
            if (serverSeed !== null) {
                seed = serverSeed;
                source = "server";
            }
            else {
                seed = this.getISOWeekNumber(new Date(ServerTimeService_1.ServerTimeService.getCorrectedTime()));
                source = "local-fallback";
            }
        }
        // Cache to avoid recalculating every frame
        if (this.cachedSeed === seed && this.cachedMutators) {
            return { mutators: this.cachedMutators, source };
        }
        // Seed-based selection intended for cross-client consistency.
        const hash = this.stringToHash(String(seed));
        const m1 = MutatorConfig_1.MUTATORS[Math.abs(hash) % MutatorConfig_1.MUTATORS.length];
        const m2 = MutatorConfig_1.MUTATORS[Math.abs(hash + 1) % MutatorConfig_1.MUTATORS.length];
        const mutators = m1.id === m2.id ? [m1] : [m1, m2];
        this.cachedSeed = seed;
        this.cachedMutators = mutators;
        return { mutators, source };
    }
    /**
     * Filters weekly mutators for a specific game.
     */
    static getActiveMutatorsForGame(gameId, forceSeed) {
        const { mutators } = this.getWeeklyMutators(forceSeed);
        return mutators.filter(m => m.games.includes(gameId) || m.games.includes('all'));
    }
    /**
     * Checks if mutator mode is globally enabled by the player.
     */
    static async isMutatorModeEnabled() {
        const data = await async_storage_1.default.getItem(MUTATORS_ENABLED_KEY);
        return data === null ? true : data === "true";
    }
    /**
     * Toggles the global mutator mode.
     */
    static async setMutatorModeEnabled(enabled) {
        await async_storage_1.default.setItem(MUTATORS_ENABLED_KEY, String(enabled));
    }
    /**
     * Simple hash function for string seeds.
     */
    static stringToHash(s) {
        let hash = 0;
        for (let i = 0; i < s.length; i++) {
            hash = ((hash << 5) - hash) + s.charCodeAt(i);
            hash |= 0;
        }
        return hash;
    }
    /**
     * Calcula el número de semana ISO para una fecha dada (fallback).
     * Usa métodos UTC para ayudar a mantener la consistencia con el servidor.
     */
    static getISOWeekNumber(date) {
        const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
        const dayNum = d.getUTCDay() || 7;
        d.setUTCDate(d.getUTCDate() + 4 - dayNum);
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    }
}
exports.MutatorService = MutatorService;
