import { System } from "../core/System";
import { World } from "../core/World";
import { EventBus } from "../core/EventBus";
import { PlayerProfileService } from "../../services/PlayerProfileService";
import { XP_TABLE } from "../../config/PassportConfig";

/**
 * Component to accumulate XP during a game session.
 */
export interface XPAccumulatorComponent {
  type: "XPAccumulator";
  pendingXP: number;
}

/**
 * Engine-level system to track XP events and update player profile.
 */
export class XPSystem extends System {
  private accumulator: XPAccumulatorComponent;

  constructor(private eventBus: EventBus) {
    super();
    this.accumulator = { type: "XPAccumulator", pendingXP: 0 };
    this.setupListeners();
  }

  private setupListeners() {
    this.eventBus.on("asteroid:destroyed", (data: { size: string }) => {
      this.accumulator.pendingXP += data.size === "large"
        ? XP_TABLE.asteroid_large_destroyed
        : XP_TABLE.asteroid_destroyed;
    });

    this.eventBus.on("asteroid:combo_changed", (data: { multiplier: number }) => {
      if (data.multiplier >= 5) this.accumulator.pendingXP += 25;
    });

    this.eventBus.on("flappy:near_miss", () => {
      this.accumulator.pendingXP += 10;
    });

    this.eventBus.on("si:kill", (data: { chain: number }) => {
      this.accumulator.pendingXP += data.chain >= 5
        ? XP_TABLE.si_chain_kill
        : XP_TABLE.si_kill;
    });

    this.eventBus.on("si:boss_defeated", () => {
      this.accumulator.pendingXP += 200;
    });

    this.eventBus.on("pong:set_won", () => {
      this.accumulator.pendingXP += XP_TABLE.pong_set_won;
    });

    this.eventBus.on("pong:charged_smash", () => {
      this.accumulator.pendingXP += 5;
    });

    this.eventBus.on("game:over", async () => {
      if (this.accumulator.pendingXP > 0) {
        const { leveledUp, newLevel } = await PlayerProfileService.addXP(this.accumulator.pendingXP);
        if (leveledUp) {
          this.eventBus.emit("level:up", { level: newLevel });
        }
        this.accumulator.pendingXP = 0;
      }
    });
  }

  public update(world: World, deltaTime: number): void {
    // Singleton registration if not present
    if (!world.getResource("XPAccumulator")) {
      world.setResource("XPAccumulator", this.accumulator);
    }
  }
}
