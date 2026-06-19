export const XP_TABLE = {
  asteroid_destroyed: 1,
  asteroid_large_destroyed: 3,
  pipe_passed: 2,
  si_kill: 1,
  si_chain_kill: 3,     // combo of 5+
  pong_set_won: 5,
  daily_completed: 20,
  daily_top10: 50,
};

export const LEVEL_THRESHOLDS = [
  0, 100, 250, 500, 900, 1500, 2400, 3600, 5200, 7500
  // Level 1 = 0 XP, Level 2 = 100 XP, etc.
];

export const PALETTE_UNLOCKS: Record<number, string[]> = {
  3:  ['palette_amber_crt'],
  5:  ['palette_gameboy'],
  7:  ['palette_neon_green'],
  9:  ['palette_cosmic_purple'],
};

export const TRAIL_UNLOCKS: Record<number, string[]> = {
  4:  ['trail_spark'],
  6:  ['trail_ghost'],
  8:  ['trail_rainbow'],
};
