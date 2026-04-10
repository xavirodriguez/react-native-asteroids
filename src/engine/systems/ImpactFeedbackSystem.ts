import { System } from "../core/System";
import { World } from "../core/World";
import { EventBus } from "../core/EventBus";
import { ScreenShakeComponent } from "../types/EngineTypes";

export class ImpactFeedbackSystem extends System {
  private hitStopFrames = 0;

  constructor(private eventBus: EventBus) {
    super();
    this.setupListeners();
  }

  private setupListeners() {
    this.eventBus.on("big_impact", (data: { intensity: "high" | "medium" }) => {
      this.hitStopFrames = data.intensity === "high" ? 5 : 3;
    });

    this.eventBus.on("explosion", (data: { x: number, y: number, radius: number }) => {
      // Chromatic aberration or other effects could be triggered here
      // For now, let's just trigger a small shake as well
    });
  }

  public update(world: World, deltaTime: number): void {
    if (this.hitStopFrames > 0) {
      this.hitStopFrames--;
      // How to skip world update?
      // BaseGame.gameLoop.subscribeUpdate() handles the world update.
      // This system is part of world.update(), so we can't easily skip other systems from here
      // unless we modify BaseGame.
    }
  }

  public shouldSkipUpdate(): boolean {
    return this.hitStopFrames > 0;
  }
}
