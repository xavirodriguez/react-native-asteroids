"use strict";
/**
 * Security utilities for data integrity and validation on the server.
 *
 * @remarks
 * The signature logic is intended to match the client implementation to
 * allow for verification of score integrity.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateScoreSignature = generateScoreSignature;
const SCORE_SALT = "retro-arcade-v1-salt-99";
function generateScoreSignature(gameId, dateKey, playerId, score) {
    const payload = `${gameId}:${dateKey}:${playerId}:${score}:${SCORE_SALT}`;
    let hash = 0;
    for (let i = 0; i < payload.length; i++) {
        const char = payload.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash |= 0;
    }
    return (hash >>> 0).toString(16);
}
