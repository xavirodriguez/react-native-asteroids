/**
 * Security utilities for data integrity and validation on the server.
 * MUST MATCH CLIENT IMPLEMENTATION.
 */

const SCORE_SALT = "retro-arcade-v1-salt-99";

export function generateScoreSignature(
  gameId: string,
  dateKey: string,
  playerId: string,
  score: number
): string {
  const payload = `${gameId}:${dateKey}:${playerId}:${score}:${SCORE_SALT}`;

  let hash = 0;
  for (let i = 0; i < payload.length; i++) {
    const char = payload.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }

  return (hash >>> 0).toString(16);
}
