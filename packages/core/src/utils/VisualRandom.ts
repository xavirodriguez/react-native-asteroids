import { RandomService } from "./RandomService";

// Shared instance for visual-only effects to avoid GC pressure in worklets
const visualRandom = new RandomService(Date.now());

export { visualRandom };
