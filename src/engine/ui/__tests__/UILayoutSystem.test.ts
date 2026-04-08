import { World } from "../../core/World";
import { UILayoutSystem } from "../UILayoutSystem";
import { UIElementComponent } from "../UITypes";
import { UIFactory } from "../UIFactory";

describe("UILayoutSystem", () => {
    let world: World;
    let system: UILayoutSystem;

    beforeEach(() => {
        world = new World();
        system = new UILayoutSystem(800, 600);
        world.addSystem(system);
    });

    it("should position root element with top-left anchor", () => {
        const label = UIFactory.createLabel(world, {
            text: "Hello",
            anchor: "top-left",
            offsetX: 10,
            offsetY: 20
        });

        system.update(world, 16.66);

        const element = world.getComponent<UIElementComponent>(label, "UIElement")!;
        expect(element.computedX).toBe(10);
        expect(element.computedY).toBe(20);
    });

    it("should position root element with center anchor", () => {
        const panel = UIFactory.createPanel(world, {
            anchor: "center",
            width: { value: 100, unit: "px" },
            height: { value: 50, unit: "px" }
        });

        system.update(world, 16.66);

        const element = world.getComponent<UIElementComponent>(panel, "UIElement")!;
        expect(element.computedX).toBe(350);
        expect(element.computedY).toBe(275);
    });

    it("should layout children in a horizontal container", () => {
        const parent = UIFactory.createPanel(world, {
            anchor: "top-left",
            width: { value: 200, unit: "px" },
            height: { value: 100, unit: "px" }
        });

        world.addComponent(parent, {
            type: "UIContainer",
            direction: "horizontal",
            align: "start",
            gap: 10
        });

        const child1 = UIFactory.createPanel(world, {
            anchor: "top-left",
            width: { value: 50, unit: "px" },
            height: { value: 50, unit: "px" },
            parentEntity: parent
        });

        const child2 = UIFactory.createPanel(world, {
            anchor: "top-left",
            width: { value: 50, unit: "px" },
            height: { value: 50, unit: "px" },
            parentEntity: parent
        });

        system.update(world, 16.66);

        const el1 = world.getComponent<UIElementComponent>(child1, "UIElement")!;
        const el2 = world.getComponent<UIElementComponent>(child2, "UIElement")!;

        expect(el1.computedX).toBe(0);
        expect(el2.computedX).toBe(60);
    });
});
