
import { World } from "../engine/core/World";
export class DummySystem {
    update(world: World) {
        const comp = world.getComponent(1, "Transform");
        if (comp) {
            comp.x = 10; // Violation
        }
    }
}
