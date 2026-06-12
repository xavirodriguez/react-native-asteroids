import { System } from "../ecs/System";
import { World } from "../ecs/World";
import { Camera2DComponent, TransformComponent } from "../ecs/CoreComponents";

/**
 * System responsible for updating Camera positions based on targets and constraints.
 * Supports smoothing, deadzones, bounding boxes, and screen shake.
 *
 * API status: Public
 */
export class Camera2DSystem extends System {
  /**
   * Updates all cameras in the world.
   *
   * @param world - The ECS world.
   * @param deltaTime - Elapsed time in milliseconds [ms].
   */
  public update(world: World, deltaTime: number): void {
    if (world.isReSimulating) return;

    const dtSeconds = deltaTime / 1000;
    const cameras = world.query("Camera2D");

    for (let i = 0; i < cameras.length; i++) {
      const entity = cameras[i];
      const cam = world.getComponent<Camera2DComponent>(entity, "Camera2D")!;

      let targetX = cam.x;
      let targetY = cam.y;

      // 1. Determine base target position
      const actualTarget = cam.targetEntity ?? cam.target;
      if (actualTarget !== undefined && world.hasEntity(actualTarget)) {
        const tPos = world.getComponent<TransformComponent>(actualTarget, "Transform");
        if (tPos) {
          targetX = (tPos.worldX ?? tPos.x);
          targetY = (tPos.worldY ?? tPos.y);
        }
      } else if (cam.targets && cam.targets.length > 0) {
        let sumX = 0;
        let sumY = 0;
        let count = 0;
        for (const tId of cam.targets) {
          if (world.hasEntity(tId)) {
            const tPos = world.getComponent<TransformComponent>(tId, "Transform");
            if (tPos) {
              sumX += (tPos.worldX ?? tPos.x);
              sumY += (tPos.worldY ?? tPos.y);
              count++;
            }
          }
        }
        if (count > 0) {
          targetX = sumX / count;
          targetY = sumY / count;
        }
      }

      // Apply offset
      targetX += cam.offset.x;
      targetY += cam.offset.y;

      // 2. Apply Deadzone
      let finalTargetX = cam.x;
      let finalTargetY = cam.y;

      const diffX = targetX - cam.x;
      const diffY = targetY - cam.y;

      if (diffX < cam.deadzone.minX) finalTargetX = targetX - cam.deadzone.minX;
      else if (diffX > cam.deadzone.maxX) finalTargetX = targetX - cam.deadzone.maxX;

      if (diffY < cam.deadzone.minY) finalTargetY = targetY - cam.deadzone.minY;
      else if (diffY > cam.deadzone.maxY) finalTargetY = targetY - cam.deadzone.maxY;

      // 3. Smoothing / Interpolation
      const smoothing = Math.max(0, Math.min(1, cam.smoothing * dtSeconds));
      finalTargetX = cam.x + (finalTargetX - cam.x) * smoothing;
      finalTargetY = cam.y + (finalTargetY - cam.y) * smoothing;

      // 4. World Bounds Constraints
      if (cam.bounds) {
        finalTargetX = Math.max(cam.bounds.minX, Math.min(cam.bounds.maxX, finalTargetX));
        finalTargetY = Math.max(cam.bounds.minY, Math.min(cam.bounds.maxY, finalTargetY));
      }

      // 5. Update Component with Shake
      world.mutateComponent<Camera2DComponent>(entity, "Camera2D", (c) => {
        c.x = finalTargetX;
        c.y = finalTargetY;

        if (c.shakeIntensity > 0) {
          c.shakeOffsetX = (Math.random() * 2 - 1) * c.shakeIntensity;
          c.shakeOffsetY = (Math.random() * 2 - 1) * c.shakeIntensity;

          // Simple decay
          c.shakeIntensity = Math.max(0, c.shakeIntensity - 50 * dtSeconds);
        } else {
          c.shakeOffsetX = 0;
          c.shakeOffsetY = 0;
        }
      });
    }
  }
}
