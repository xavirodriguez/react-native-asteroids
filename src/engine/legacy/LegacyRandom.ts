import { RandomService } from "../utils/RandomService";

/**
 * @deprecated Prefer using {@link RandomService.getGameplayRandom} or {@link RandomService.getRenderRandom}.
 * Global static methods will be removed in future versions.
 */
export const LegacyRandom = {
  setSeed: (seed: number) => RandomService.getGameplayRandom().setSeed(seed),
  next: () => RandomService.getGameplayRandom().next(),
  nextRange: (min: number, max: number) => RandomService.getGameplayRandom().nextRange(min, max),
  chance: (p: number) => RandomService.getGameplayRandom().chance(p),
  nextInt: (min: number, max: number) => RandomService.getGameplayRandom().nextInt(min, max),
  nextSign: () => RandomService.getGameplayRandom().nextSign(),
};
