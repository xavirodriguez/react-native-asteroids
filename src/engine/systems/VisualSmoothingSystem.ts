import { World } from "../core/World";
import { System } from "../core/System";
import { VisualOffsetComponent } from "../core/CoreComponents";

/**
 * System that smooths out visual discrepancies caused by rollback corrections.
 * It gradually decays the VisualOffsetComponent values towards zero.
 *
 * @remarks
 * This system should run in the Presentation phase.
 */
export class VisualSmoothingSystem extends System {
    /** Decay rate per millisecond. */
    private decayRate = 0.05;

    public update(world: World, deltaTime: number): void {
        const entities = world.query("VisualOffset");

        for (const entity of entities) {
            world.mutateComponent<VisualOffsetComponent>(entity, "VisualOffset", offset => {
                // Decay position offset
                offset.x *= Math.pow(this.decayRate, deltaTime / 1000);
                offset.y *= Math.pow(this.decayRate, deltaTime / 1000);

                // Decay rotation offset
                offset.rotation *= Math.pow(this.decayRate, deltaTime / 1000);

                // Decay scale offset
                offset.scaleX *= Math.pow(this.decayRate, deltaTime / 1000);
                offset.scaleY *= Math.pow(this.decayRate, deltaTime / 1000);

                // If offsets are small enough, remove the component to save processing
                if (Math.abs(offset.x) < 0.01 &&
                    Math.abs(offset.y) < 0.01 &&
                    Math.abs(offset.rotation) < 0.001) {
                    world.getCommandBuffer().removeComponent(entity, "VisualOffset");
                }
            });
        }
    }
}
