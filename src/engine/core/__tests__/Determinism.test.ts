import { World } from "../World";
import { System } from "../System";
import { RandomService } from "../../utils/RandomService";
import { Component } from "../Component";

interface Position extends Component {
  type: "Position";
  x: number;
  y: number;
}

class RandomMovementSystem extends System {
  update(world: World, _deltaTime: number): void {
    const entities = world.query("Position");
    for (const entity of entities) {
      world.mutateComponent<Position>(entity, "Position", (pos) => {
        pos.x += world.gameplayRandom.nextRange(-1, 1);
        pos.y += world.gameplayRandom.nextRange(-1, 1);
      });
    }
  }
}

describe("Determinism Integration", () => {
  beforeEach(() => {
    RandomService.resetInstances();
  });

  it("produces identical states with the same seed", () => {
    const seed = 98765;
    const ticks = 10;
    const dt = 16.66;

    const world1 = new World();
    const world2 = new World();

    world1.addSystem(new RandomMovementSystem());
    const e1 = world1.createEntity();
    world1.addComponent(e1, { type: "Position", x: 0, y: 0 } as Position);

    world2.addSystem(new RandomMovementSystem());
    const e2 = world2.createEntity();
    world2.addComponent(e2, { type: "Position", x: 0, y: 0 } as Position);

    // Run World 1
    RandomService.getInstance("gameplay").setSeed(seed);
    for (let i = 0; i < ticks; i++) {
      world1.update(dt);
    }

    // Run World 2
    RandomService.getInstance("gameplay").setSeed(seed);
    for (let i = 0; i < ticks; i++) {
      world2.update(dt);
    }

    const state1 = world1.snapshot();
    const state2 = world2.snapshot();

    expect(state1.tick).toBe(ticks);
    expect(state2.tick).toBe(ticks);
    expect(state1.componentData).toEqual(state2.componentData);
    expect(state1.rngState).toEqual(state2.rngState);
  });

  it("produces different states with different seeds", () => {
    const world1 = new World();
    const world2 = new World();

    world1.addSystem(new RandomMovementSystem());
    const e1 = world1.createEntity();
    world1.addComponent(e1, { type: "Position", x: 0, y: 0 } as Position);

    world2.addSystem(new RandomMovementSystem());
    const e2 = world2.createEntity();
    world2.addComponent(e2, { type: "Position", x: 0, y: 0 } as Position);

    RandomService.getInstance("gameplay").setSeed(111);
    world1.update(16.66);

    RandomService.getInstance("gameplay").setSeed(222);
    world2.update(16.66);

    const state1 = world1.snapshot();
    const state2 = world2.snapshot();

    expect(state1.componentData).not.toEqual(state2.componentData);
  });

  it("restores state and continues deterministically", () => {
    const seed = 42;
    const world = new World();
    world.addSystem(new RandomMovementSystem());
    const e = world.createEntity();
    world.addComponent(e, { type: "Position", x: 0, y: 0 } as Position);

    RandomService.getInstance("gameplay").setSeed(seed);

    // Tick 5 times
    for(let i=0; i<5; i++) world.update(16.66);

    const snapshot = world.snapshot();
    const posAt5 = (world.getComponent(e, "Position") as Position).x;

    // Tick 5 more times
    for(let i=0; i<5; i++) world.update(16.66);
    const posAt10 = (world.getComponent(e, "Position") as Position).x;
    expect(posAt10).not.toBe(posAt5);

    // Restore to tick 5
    world.restore(snapshot);
    expect((world.getComponent(e, "Position") as Position).x).toBe(posAt5);
    expect(world.tick).toBe(5);

    // Tick 5 more times again
    for(let i=0; i<5; i++) world.update(16.66);
    expect((world.getComponent(e, "Position") as Position).x).toBe(posAt10);
  });
});
