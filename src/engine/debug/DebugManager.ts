import { BaseGame } from "../core/BaseGame";
import { World } from "../core/World";
import { Entity, WorldSnapshot } from "../types/EngineTypes";
import { EventBus } from "../core/EventBus";

export interface EventLogEntry {
  timestamp: number;
  event: string;
  payload: unknown;
}

export interface FrameStats {
  fps: number;
  frameTime: number;
  alpha: number;
  tick: number;
}

export interface StateDiff {
  entity: Entity;
  component: string;
  before: unknown;
  after: unknown;
}

export interface ColliderShapeInfo {
  entity: Entity;
  type: string;
  x: number;
  y: number;
  rotation: number;
  shape: any;
  isTrigger: boolean;
}

export class DebugManager {
  private static instance: DebugManager | null = null;
  private game: BaseGame<any, any> | null = null;
  private enabled = false;
  private startTime = performance.now();

  // Event Log
  private eventLog: EventLogEntry[] = [];
  private readonly MAX_EVENTS = 100;

  // Frame Stats
  private frameStats: FrameStats = { fps: 0, frameTime: 0, alpha: 0, tick: 0 };
  private lastFrameTime = 0;
  private frameCount = 0;
  private fpsUpdateTime = 0;

  // State Diff
  private lastSnapshot: WorldSnapshot | null = null;
  private lastDiff: StateDiff[] = [];
  private diffInterval = 10;

  // Subscriptions
  private unsubscribeRender: (() => void) | null = null;

  private constructor() {}

  public static getInstance(): DebugManager {
    if (!DebugManager.instance) {
      DebugManager.instance = new DebugManager();
    }
    return DebugManager.instance;
  }

  public attach(game: BaseGame<any, any>): void {
    if (this.game === game) return;
    this.detach();
    this.game = game;
    this.startTime = performance.now();
    this.enable();
  }

  public detach(): void {
    this.disable();
    this.game = null;
    this.eventLog = [];
    this.lastSnapshot = null;
    this.lastDiff = [];
  }

  public enable(): void {
    if (this.enabled || !this.game) return;
    this.enabled = true;

    const world = this.game.getWorld();
    world.debugMode = true;

    // Event Bus logging
    const eventBus = world.getResource<EventBus>("EventBus");
    if (eventBus) {
      eventBus.on("*", this.handleEvent);
    }

    // Frame Stats subscription
    this.unsubscribeRender = this.game.getGameLoop().subscribeRender(this.updateFrameStats);
  }

  public disable(): void {
    if (!this.enabled || !this.game) return;
    this.enabled = false;

    const world = this.game.getWorld();
    world.debugMode = false;

    const eventBus = world.getResource<EventBus>("EventBus");
    if (eventBus) {
      eventBus.off("*", this.handleEvent);
    }

    if (this.unsubscribeRender) {
      this.unsubscribeRender();
      this.unsubscribeRender = null;
    }
  }

  private handleEvent = (payload: unknown, event?: string): void => {
    this.eventLog.push({
      timestamp: performance.now() - this.startTime,
      event: event || "unknown",
      payload: payload
    });

    if (this.eventLog.length > this.MAX_EVENTS) {
      this.eventLog.shift();
    }
  };

  private updateFrameStats = (alpha: number, dt: number): void => {
    if (!this.game) return;
    const world = this.game.getWorld();

    this.frameCount++;
    const now = performance.now();
    const elapsed = now - this.fpsUpdateTime;

    if (elapsed >= 1000) {
      this.frameStats.fps = Math.round((this.frameCount * 1000) / elapsed);
      this.frameCount = 0;
      this.fpsUpdateTime = now;
    }

    this.frameStats.frameTime = dt;
    this.frameStats.alpha = alpha;
    this.frameStats.tick = world.tick;

    // State Diff logic
    if (world.tick % this.diffInterval === 0) {
      this.performStateDiff(world);
    }
  };

  private performStateDiff(world: World): void {
    const currentSnapshot = world.snapshot();
    if (this.lastSnapshot) {
      this.lastDiff = this.calculateDiff(this.lastSnapshot, currentSnapshot);
    }
    this.lastSnapshot = currentSnapshot;
  }

  private calculateDiff(before: WorldSnapshot, after: WorldSnapshot): StateDiff[] {
    const diffs: StateDiff[] = [];

    // Check for changed or new components
    for (const type in after.componentData) {
      const afterEntities = after.componentData[type];
      const beforeEntities = before.componentData[type] || {};

      for (const entityIdStr in afterEntities) {
        const entityId = parseInt(entityIdStr) as Entity;
        const afterComp = afterEntities[entityId];
        const beforeComp = beforeEntities[entityId];

        if (!beforeComp) {
          diffs.push({ entity: entityId, component: type, before: null, after: afterComp });
        } else if (JSON.stringify(beforeComp) !== JSON.stringify(afterComp)) {
          diffs.push({ entity: entityId, component: type, before: beforeComp, after: afterComp });
        }
      }
    }

    // Check for removed components
    for (const type in before.componentData) {
      const beforeEntities = before.componentData[type];
      const afterEntities = after.componentData[type] || {};

      for (const entityIdStr in beforeEntities) {
        const entityId = parseInt(entityIdStr) as Entity;
        if (!afterEntities[entityId]) {
          diffs.push({ entity: entityId, component: type, before: beforeEntities[entityId], after: null });
        }
      }
    }

    return diffs;
  }

  public getEntitySnapshot(): Array<{ id: Entity; components: Record<string, unknown> }> {
    if (!this.game) return [];
    const world = this.game.getWorld();
    return world.entities.map(entity => {
      const types = world.getEntityComponentTypes(entity);
      const components: Record<string, unknown> = {};
      types.forEach(type => {
        components[type] = world.getComponent(entity, type);
      });
      return { id: entity, components };
    });
  }

  public getSystemTimings(): Record<string, number> {
    if (!this.game) return {};
    return this.game.getWorld().getAllSystemTimings();
  }

  public getEventLog(): EventLogEntry[] {
    return [...this.eventLog];
  }

  public clearEventLog(): void {
    this.eventLog = [];
  }

  public getFrameStats(): FrameStats {
    return { ...this.frameStats };
  }

  public getLastDiff(): StateDiff[] {
    return [...this.lastDiff];
  }

  public getColliderShapes(): ColliderShapeInfo[] {
    if (!this.game) return [];
    const world = this.game.getWorld();
    const entities = world.query("Transform", "Collider2D");

    return entities.map(entity => {
      const transform = world.getComponent(entity, "Transform") as any;
      const collider = world.getComponent(entity, "Collider2D") as any;

      return {
        entity,
        type: collider.shape.type,
        x: (transform.worldX ?? transform.x) + collider.offsetX,
        y: (transform.worldY ?? transform.y) + collider.offsetY,
        rotation: transform.worldRotation ?? transform.rotation,
        shape: collider.shape,
        isTrigger: collider.isTrigger
      };
    });
  }

  public isEnabled(): boolean {
    return this.enabled;
  }
}
