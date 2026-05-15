import { World } from "../../core/World";
import { StatusEffectSystem } from "../StatusEffectSystem";

describe("StatusEffectSystem (Deprecated)", () => {
  let world: World;
  let system: StatusEffectSystem;

  beforeEach(() => {
    world = new World();
    system = new StatusEffectSystem();
  });

  it("should be a no-op", () => {
     // This test ensures the system exists but does nothing,
     // as logic was moved to ModifierSystem to prevent double-decrements.
     expect(() => system.update(world, 16)).not.toThrow();
  });
});
