import { World } from "../../core/World";
import { ParticleSystem } from "../ParticleSystem";
import { PrefabPool } from "../../utils/PrefabPool";
import { ParticleEmitterConfig, Entity } from "../../types/EngineTypes";

describe("ParticleSystem", () => {
  let world: World;
  let system: ParticleSystem;
  let mockPool: any;

  beforeEach(() => {
    world = new World();
    mockPool = {
      acquire: jest.fn(),
      release: jest.fn(),
    };
    system = new ParticleSystem(mockPool);
  });

  it("should spawn burst particles upon activation", () => {
    const config: ParticleEmitterConfig = {
      position: { x: 0, y: 0 },
      rate: 0,
      burst: 5,
      lifetime: { min: 1, max: 1 },
      speed: { min: 10, max: 20 },
      angle: { min: 0, max: 360 },
      size: { min: 2, max: 5 },
      color: ["#ff0000"],
      gravity: { x: 0, y: 0 },
      loop: false,
    };

    const emitter = world.createEntity();
    world.addComponent(emitter, {
      type: "ParticleEmitter",
      config,
      active: true,
      elapsed: 0,
    });

    system.update(world, 16);

    expect(mockPool.acquire).toHaveBeenCalledTimes(5);
  });

  it("should spawn particles based on rate over time", () => {
    const config: ParticleEmitterConfig = {
      position: { x: 0, y: 0 },
      rate: 10, // 10 particles per second
      burst: 0,
      lifetime: { min: 1, max: 1 },
      speed: { min: 10, max: 20 },
      angle: { min: 0, max: 360 },
      size: { min: 2, max: 5 },
      color: ["#ff0000"],
      gravity: { x: 0, y: 0 },
      loop: true,
    };

    const emitter = world.createEntity();
    world.addComponent(emitter, {
      type: "ParticleEmitter",
      config,
      active: true,
      elapsed: 0,
    });

    // Update with 500ms
    system.update(world, 500);

    expect(mockPool.acquire).toHaveBeenCalledTimes(5);
  });
});
