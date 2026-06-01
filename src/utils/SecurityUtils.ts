/**
 * Security utilities for data integrity and validation.
 */

// Basic salt for score signing. In a production app, this should be
// more complex or rotated, but for MVP this prevents trivial spoofing.
const SCORE_SALT = "retro-arcade-v1-salt-99";

/**
 * Generates a signature for a score submission.
 *
 * @remarks
 * The signature is designed to be deterministic based on the provided inputs
 * and a shared salt to help prevent basic spoofing.
 *
 * @param gameId - The ID of the game.
 * @param dateKey - The daily date key.
 * @param playerId - The unique player ID.
 * @param score - The numeric score.
 * @returns A hash string representing the signature.
 */
export function generateScoreSignature(
  gameId: string,
  dateKey: string,
  playerId: string,
  score: number
): string {
  const payload = `${gameId}:${dateKey}:${playerId}:${score}:${SCORE_SALT}`;

  // Simple but effective string hash (Fowler-Noll-Vo variant or similar)
  let hash = 0;
  for (let i = 0; i < payload.length; i++) {
    const char = payload.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // Convert to 32bit integer
  }

  return (hash >>> 0).toString(16);
}
