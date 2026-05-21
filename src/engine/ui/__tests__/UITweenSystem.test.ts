import { World } from "../../core/World";
import { UITweenSystem, UITweenComponent } from "../UITweenSystem";
import { UIElementComponent } from "../UITypes";

describe("UITweenSystem ECS Safety", () => {
    let world: World;
    let system: UITweenSystem;

    beforeEach(() => {
        world = new World();
        system = new UITweenSystem();
        world.addSystem(system);
    });

    it("should remove UITween component via CommandBuffer when animation completes", () => {
        const entity = world.createEntity();

        const element: UIElementComponent = {
            type: "UIElement",
            x: 0, y: 0, width: 100, height: 100,
            opacity: 0,
            visible: true,
            depth: 0,
            offsetX: 0,
            offsetY: 0
        };

        const tween: UITweenComponent = {
            type: "UITween",
            property: "opacity",
            startValue: 0,
            endValue: 1,
            duration: 100,
            currentTime: 0,
            easing: "linear",
            loop: false
        };

        world.addComponent(entity, element);
        world.addComponent(entity, tween);

        // Advance time to complete the tween
        world.update(101);

        // After world.update, the CommandBuffer should have been flushed
        expect(world.hasComponent(entity, "UITween")).toBe(false);
        const updatedElement = world.getComponent<UIElementComponent>(entity, "UIElement");
        expect(updatedElement?.opacity).toBe(1);
    });

    it("should NOT throw error during update when removing component", () => {
        const entity = world.createEntity();

        const element: UIElementComponent = {
            type: "UIElement",
            x: 0, y: 0, width: 100, height: 100,
            opacity: 0,
            visible: true,
            depth: 0,
            offsetX: 0,
            offsetY: 0
        };

        const tween: UITweenComponent = {
            type: "UITween",
            property: "opacity",
            startValue: 0,
            endValue: 1,
            duration: 100,
            currentTime: 99,
            easing: "linear",
            loop: false
        };

        world.addComponent(entity, element);
        world.addComponent(entity, tween);

        // This should not throw "Structural mutation during update is forbidden"
        expect(() => world.update(10)).not.toThrow();
    });
});
