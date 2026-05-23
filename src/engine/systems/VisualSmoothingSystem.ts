import { World } from "../core/World";
import { System } from "../core/System";
import { VisualOffsetComponent } from "../core/CoreComponents";

/**
 * System that smooths out visual discrepancies caused by rollback corrections.
 * It gradually decays the VisualOffsetComponent values towards zero using
 * framerate-independent exponential decay.
 *
 * @remarks
 * This system should run in the Presentation phase.
 */
export class VisualSmoothingSystem extends System {
    /**
     * Target half-life for the decay in milliseconds.
     * Higher values = slower, smoother correction.
     * Lower values = faster, snappier correction.
     */
    private smoothingHalfLife = 50;

    public update(world: World, deltaTime: number): void {
        const entities = world.query("VisualOffset");
        if (entities.length === 0) return;

        // Framerate-independent decay factor
        // formula: factor = 0.5 ^ (deltaTime / halfLife)
        const decayFactor = Math.pow(0.5, deltaTime / this.smoothingHalfLife);

        for (const entity of entities) {
            world.mutateComponent<VisualOffsetComponent>(entity, "VisualOffset", offset => {
                // Decay position offset
                offset.x *= decayFactor;
                offset.y *= decayFactor;

                // Decay rotation offset
                offset.rotation *= decayFactor;

                // Decay scale offset
                offset.scaleX *= decayFactor;
                offset.scaleY *= decayFactor;

                // If offsets are small enough, remove the component to save processing
                if (Math.abs(offset.x) < 0.05 &&
                    Math.abs(offset.y) < 0.05 &&
                    Math.abs(offset.rotation) < 0.005) {
                    world.getCommandBuffer().removeComponent(entity, "VisualOffset");
                }
            });
        }
    }
}
