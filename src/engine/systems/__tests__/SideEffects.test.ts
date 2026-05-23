import { World } from "../../core/World";
import { ParticleSystem } from "../ParticleSystem";
import { FeedbackSystem } from "../FeedbackSystem";
import { JuiceSystem } from "../JuiceSystem";

describe("Side Effect Suppression during Re-simulation", () => {
  let world: World;

  beforeEach(() => {
    world = new World();
  });

  it("ParticleSystem should not update during re-simulation", () => {
    const mockPool = { acquire: jest.fn() } as any;
    const system = new ParticleSystem(mockPool);

    const e = world.createEntity();
    world.addComponent(e, {
        type: "ParticleEmitter",
        config: { rate: 10, burst: 0, loop: true, angle: {min:0, max:0}, speed: {min:1, max:1}, lifetime: {min:1, max:1}, size: {min:1, max:1}, color: ["#fff"] },
        active: true,
        elapsed: 0
    } as any);

    world.isReSimulating = true;
    system.update(world, 1000);

    expect(mockPool.acquire).not.toHaveBeenCalled();

    world.isReSimulating = false;
    system.update(world, 1000);
    expect(mockPool.acquire).toHaveBeenCalled();
  });

  it("FeedbackSystem should not trigger haptics during re-simulation", () => {
    const system = new FeedbackSystem();
    const e = world.createEntity();
    world.addComponent(e, { type: "HapticRequest", pattern: "shoot" } as any);

    world.isReSimulating = true;
    system.update(world, 16);
    world.flush(); // Consumir comandos de removeComponent
    expect(world.hasComponent(e, "HapticRequest")).toBe(false);
  });

  it("JuiceSystem should not update animations during re-simulation", () => {
    const system = new JuiceSystem();
    const e = world.createEntity();
    const juice = {
        type: "Juice",
        animations: [{ property: "opacity", target: 0, duration: 1000, elapsed: 0 }]
    };
    world.addComponent(e, juice as any);
    world.addComponent(e, { type: "Render", data: { opacity: 1 } } as any);

    world.isReSimulating = true;
    system.update(world, 500);

    const juiceComp = world.getComponent(e, "Juice") as any;
    expect(juiceComp.animations[0].elapsed).toBe(0); // Should not advance

    world.isReSimulating = false;
    system.update(world, 500);
    expect(juiceComp.animations[0].elapsed).toBe(500); // Should advance
  });
});
