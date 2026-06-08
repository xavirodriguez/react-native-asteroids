
import { World } from "@tiny-aster/core";
export class DummySystem {
    update(world: World) {
        const comp = world.getComponent(1, "Transform");
        if (comp) {
            comp.x = 10; // Violation
        }
    }
}
