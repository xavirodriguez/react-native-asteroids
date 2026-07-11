import { ComponentRegistry } from "./Component";
import { EventRegistry } from "../events/EventBus";
import { System, SystemPhase, SystemConfig } from "./System";
import { World } from "./World";
import { RandomService } from "../utils/RandomService";

/**
 * Orchestrates and executes ECS systems grouped by phases.
 */
export class Schedule<
  TComponents extends ComponentRegistry = ComponentRegistry,
  TEvents extends EventRegistry = EventRegistry
> {
  private systems: { system: System<TComponents, TEvents>; phase: string; priority: number }[] = [];
  private phases: string[];

  constructor(phases?: string[]) {
    this.phases = phases ?? [
      SystemPhase.Input,
      SystemPhase.Simulation,
      SystemPhase.Transform,
      SystemPhase.Collision,
      SystemPhase.GameRules,
      SystemPhase.Presentation
    ];
  }

  /**
   * Registers a system with the schedule and triggers its onRegister callback.
   */
  public addSystem(
    system: System<TComponents, TEvents>,
    config: SystemConfig = {},
    world: World<TComponents, TEvents, any>
  ): void {
    this.systems.push({
      system,
      phase: (config.phase as string) ?? SystemPhase.Simulation,
      priority: config.priority ?? 0
    });
    system.onRegister(world);
  }

  /**
   * Disposes and clears all registered systems in this schedule.
   */
  public clearSystems(): void {
    this.systems.forEach(s => s.system.dispose());
    this.systems = [];
  }

  /**
   * Updates all registered systems sequentially through execution phases.
   */
  public update(world: World<TComponents, TEvents, any>, deltaTime: number): void {
    world.isUpdating = true;
    RandomService.lockGameplayContext = true;
    try {
      for (const phase of this.phases) {
        const systems = this.systems
          .filter(s => s.phase === phase)
          .sort((a, b) => b.priority - a.priority);

        for (const reg of systems) {
          reg.system.update(world, deltaTime);
        }
      }
    } finally {
      world.isUpdating = false;
      RandomService.lockGameplayContext = false;
    }
    world.flush();
  }
}
