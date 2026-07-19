import { System } from "../ecs/System";
import { World } from "../ecs/World";
import { ComponentRegistry } from "../ecs/Component";

/**
 * Interface representing a component mutator.
 * @public
 */
export interface Mutator<TComponents extends ComponentRegistry = ComponentRegistry, K extends keyof TComponents & string = keyof TComponents & string> {
  componentType: K;
  mutate: (component: TComponents[K], world: World<TComponents>) => void;
}

/**
 * System designed to perform arbitrary mutations on entity components.
 *
 * @remarks
 * This system provides a general-purpose update hook. Care should be taken
 * when performing structural changes (adding/removing components or entities)
 * directly; use the {@link WorldCommandBuffer} for safer modifications.
 * @public
 */
export class MutatorSystem<TComponents extends ComponentRegistry = ComponentRegistry> extends System<TComponents> {
  private mutators: Mutator<TComponents>[];

  constructor(mutators: Mutator<TComponents>[] = []) {
      super();
      this.mutators = mutators;
  }

  public update(world: World<TComponents>, _deltaTime: number): void {
    for (const mutator of this.mutators) {
      if (mutator && mutator.componentType && typeof mutator.mutate === "function") {
        const entities = world.query(mutator.componentType as any);
        for (const entity of entities) {
          world.mutateComponent(entity, mutator.componentType as any, (comp) => {
            mutator.mutate(comp, world);
          });
        }
      }
    }
  }

  public override onRegister(world: World<TComponents>): void {}
  public override dispose(): void {}
}
