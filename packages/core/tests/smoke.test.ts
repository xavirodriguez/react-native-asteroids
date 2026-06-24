import { World, System, Component, ComponentRegistry } from "../src";

interface SmokeRegistry extends ComponentRegistry {
  Position: { type: "Position"; x: number; y: number };
  Velocity: { type: "Velocity"; vx: number; vy: number };
}

class MovementSystem extends System<SmokeRegistry> {
  update(world: World<SmokeRegistry>, deltaTime: number): void {
    const entities = world.query("Position", "Velocity");
    for (const entity of entities) {
      const pos = world.getComponent(entity, "Position")!;
      const vel = world.getComponent(entity, "Velocity")!;

      world.mutateComponent(entity, "Position", (p) => {
        p.x += vel.vx * deltaTime;
        p.y += vel.vy * deltaTime;
      });
    }
  }
}

describe("Smoke Test de Tipado", () => {
  it("debería permitir crear un mundo con tipos inferidos correctamente", () => {
    const world = new World<SmokeRegistry>();
    const entity = world.createEntity();

    const pos: SmokeRegistry["Position"] = { type: "Position", x: 0, y: 0 };
    const vel: SmokeRegistry["Velocity"] = { type: "Velocity", vx: 10, vy: 5 };

    world.addComponent(entity, pos);
    world.addComponent(entity, vel);

    const system = new MovementSystem();
    system.update(world, 1);

    const updatedPos = world.getComponent(entity, "Position");
    expect(updatedPos?.x).toBe(10);
    expect(updatedPos?.y).toBe(5);
  });

  it("debería detectar errores de tipos en compilación (validación manual)", () => {
    // Este test es para verificar la experiencia del desarrollador con los tipos
    const world = new World<SmokeRegistry>();
    const entity = world.createEntity();

    // Si descomentas esto, el compilador debería fallar:
    // world.getComponent(entity, "NonExistent");

    expect(world).toBeDefined();
  });
});
