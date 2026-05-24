import { RandomService } from "../../../../engine/utils/RandomService";

describe("SpaceInvadersCollisionSystem - Determinism Guard", () => {
  it("should enforce deterministic streams and throw error on render stream during locked context", () => {
    RandomService.lockGameplayContext = true;

    expect(() => {
      RandomService.getInstance("gameplay");
    }).not.toThrow();

    expect(() => {
      RandomService.getRenderRandom();
    }).toThrow("Deterministic violation");

    RandomService.lockGameplayContext = false;
  });
});
