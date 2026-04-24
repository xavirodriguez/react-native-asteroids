import { World } from "../World";
import { System } from "../System";
import { Entity } from "../../types/EngineTypes";
import { Component } from "../Component";

interface TestComponent extends Component {
  type: "Test";
  value: number;
}

class MutationSystem extends System {
  public entityToCreate: Entity | undefined;
  public entityToRemove: Entity | undefined;

  constructor() {
    super();
  }

  update(world: World): void {
    // 1. Crear entidad (diferida)
    this.entityToCreate = world.createEntity();

    // 2. Añadir componente (diferida)
    world.addComponent(this.entityToCreate, { type: "Test", value: 42 } as TestComponent);

    // 3. Eliminar entidad si existe (diferida)
    if (this.entityToRemove !== undefined) {
      world.removeEntity(this.entityToRemove);
    }
  }
}

describe("World Structural Mutation Safety", () => {
  let world: World;

  beforeEach(() => {
    world = new World();
  });

  it("should defer entity creation during update until flush is called", () => {
    const system = new MutationSystem();
    world.addSystem(system);

    // Ejecutar un update
    world.update(16);

    // La entidad fue "reservada" pero no debería estar activa en el mundo todavía
    expect(system.entityToCreate).toBeDefined();

    // Verificamos que world.update aplicó los cambios ya que llama a flush()
    const entitiesAfterUpdate = world.getAllEntities();
    expect(entitiesAfterUpdate).toContain(system.entityToCreate);
  });

  it("should not reflect changes during system update", () => {
    const entity = world.createEntity();
    world.flush();

    expect(world.getAllEntities()).toContain(entity);

    // Simulamos un sistema que intenta borrar la entidad
    const system = new class extends System {
      update(w: World) {
        w.removeEntity(entity);
        // Durante el update, la entidad sigue ahí
        expect(w.getAllEntities()).toContain(entity);
      }
    };

    world.addSystem(system);
    world.update(16);

    // Después del update (y su flush automático), ya no debería estar
    expect(world.getAllEntities()).not.toContain(entity);
  });

  it("should allow adding components to newly created entities during the same update", () => {
    let createdEntity: Entity = 0;
    const system = new class extends System {
      update(w: World) {
        createdEntity = w.createEntity();
        w.addComponent(createdEntity, { type: "Test", value: 100 } as TestComponent);

        // No debería tener el componente todavía
        expect(w.hasComponent(createdEntity, "Test")).toBe(false);
      }
    };

    world.addSystem(system);
    world.update(16);

    // Tras el flush
    expect(world.hasComponent(createdEntity, "Test")).toBe(true);
    expect((world.getComponent(createdEntity, "Test") as TestComponent).value).toBe(100);
  });

  it("should handle recursive flushes if commands are added during flush", () => {
     // Este caso es más avanzado: un comando CREATE_ENTITY con un callback que añade un componente.
     // El flush del buffer debería procesar los nuevos comandos añadidos por el callback.

     const buffer = world.getCommandBuffer();
     let componentAdded = false;

     buffer.createEntity(undefined, (entity) => {
        world.addComponent(entity, { type: "Test", value: 1 } as TestComponent);
        componentAdded = true;
     });

     world.flush();

     expect(componentAdded).toBe(true);
     const entities = world.getAllEntities();
     expect(entities.length).toBe(1);
     expect(world.hasComponent(entities[0], "Test")).toBe(true);
  });

  it("should maintain consistent entity IDs during deferred creation", () => {
      let reservedId: Entity = 0;
      const system = new class extends System {
          update(w: World) {
              reservedId = w.createEntity();
              // Verificamos que el ID se mantiene tras el flush
          }
      };

      world.addSystem(system);
      world.update(16);

      const entities = world.getAllEntities();
      expect(entities).toContain(reservedId);
      expect(entities.length).toBe(1);
  });

  it("should allow immediate component mutation with notifyStateChange", () => {
    const entity = world.createEntity();
    const component: TestComponent = { type: "Test", value: 10 };
    world.addComponent(entity, component);
    world.flush();

    const initialStateVersion = world.stateVersion;

    const success = world.mutateComponent<TestComponent>(entity, "Test", (c) => {
      c.value = 20;
    });

    expect(success).toBe(true);
    expect(world.getComponent<TestComponent>(entity, "Test")?.value).toBe(20);
    expect(world.stateVersion).toBeGreaterThan(initialStateVersion);
    expect(world.isRenderDirty()).toBe(true);
  });

  it("should return false when mutating a non-existent component", () => {
    const entity = world.createEntity();
    world.flush();

    const success = world.mutateComponent<TestComponent>(entity, "NonExistent", (c) => {
      c.value = 20;
    });

    expect(success).toBe(false);
  });

  it("should allow deferred component mutation via CommandBuffer", () => {
    const entity = world.createEntity();
    const component: TestComponent = { type: "Test", value: 10 };
    world.addComponent(entity, component);
    world.flush();

    const initialStateVersion = world.stateVersion;
    const buffer = world.getCommandBuffer();

    buffer.mutateComponent<TestComponent>(entity, "Test", (c) => {
      c.value = 30;
    });

    // Not applied yet
    expect(world.getComponent<TestComponent>(entity, "Test")?.value).toBe(10);
    expect(world.stateVersion).toBe(initialStateVersion);

    world.flush();

    expect(world.getComponent<TestComponent>(entity, "Test")?.value).toBe(30);
    expect(world.stateVersion).toBeGreaterThan(initialStateVersion);
  });

  it("should allow mutating singletons", () => {
    const entity = world.createEntity();
    world.addComponent(entity, { type: "Test", value: 100 } as TestComponent);
    world.flush();

    const success = world.mutateSingleton<TestComponent>("Test", (c) => {
      c.value = 200;
    });

    expect(success).toBe(true);
    expect(world.getSingleton<TestComponent>("Test")?.value).toBe(200);
  });

  it("should return false when mutating a non-existent singleton", () => {
    const success = world.mutateSingleton<TestComponent>("NonExistent", (c) => {
      c.value = 200;
    });

    expect(success).toBe(false);
  });

  it("should allow mutating resources via mutateResource", () => {
    const resource = { score: 100 };
    world.setResource("GameData", resource);

    const initialStateVersion = world.stateVersion;

    world.mutateResource<{ score: number }>("GameData", (r) => {
      r.score = 200;
    });

    expect(world.getResource<{ score: number }>("GameData")?.score).toBe(200);
    expect(world.stateVersion).toBeGreaterThan(initialStateVersion);
  });

  it("should return a frozen entities array in __DEV__", () => {
    world.createEntity();
    world.flush();

    const entities = world.entities;
    expect(Object.isFrozen(entities)).toBe(true);

    if (process.env.NODE_ENV !== "production") {
        expect(() => (entities as any).push(999)).toThrow();
    }
  });

  it("should cache entities array and invalidate on structural changes", () => {
    const e1 = world.createEntity();
    world.flush();

    const entities1 = world.entities;
    expect(entities1).toContain(e1);

    const entities2 = world.entities;
    expect(entities1).toBe(entities2); // Same reference (cached)

    const e2 = world.createEntity();
    world.flush();

    const entities3 = world.entities;
    expect(entities3).not.toBe(entities1); // New reference (invalidated)
    expect(entities3).toContain(e1);
    expect(entities3).toContain(e2);
  });
});
