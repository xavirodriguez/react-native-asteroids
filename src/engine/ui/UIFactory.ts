/**
 * @packageDocumentation
 * Factory for creating common UI elements.
 * Provides static methods to bootstrap Labels, Panels, Buttons, and Progress Bars.
 */

import { World } from "../core/World";
import { Entity } from "../core/Entity";
import {
    UIElementComponent,
    UIStyleComponent,
    UITextComponent,
    UIProgressBarComponent,
    UIButtonStateComponent,
    UIAnchor,
    UIValue,
    UIEdgeInsets
} from "./UITypes";

/**
 * UIFactory: Centralizes the creation of interface entities with their base components.
 *
 * @remarks
 * This factory ensures that every UI entity has the minimum set of components
 * required by the {@link UILayoutSystem} and {@link UIRenderer}.
 */
export class UIFactory {
    /**
     * Creates a text label entity.
     *
     * @param world - The ECS world.
     * @param config - Configuration for text, position, and style.
     * @returns The created Entity ID.
     */
    public static createLabel(world: World, config: {
        text: string;
        anchor: UIAnchor;
        offsetX?: number;
        offsetY?: number;
        fontSize?: number;
        color?: string;
        fontFamily?: string;
        zIndex?: number;
        parentEntity?: Entity | null;
    }): Entity {
        const entity = world.createEntity();
        const element: UIElementComponent = {
            type: "UIElement",
            elementType: "label",
            anchor: config.anchor,
            offsetX: config.offsetX ?? 0,
            offsetY: config.offsetY ?? 0,
            width: { value: 0, unit: "px" },
            height: { value: 0, unit: "px" },
            padding: { top: 0, right: 0, bottom: 0, left: 0 },
            visible: true,
            opacity: 1,
            zIndex: config.zIndex ?? 0,
            interactive: false,
            parentEntity: config.parentEntity ?? null,
            computedX: 0, computedY: 0, computedWidth: 0, computedHeight: 0
        };

        const style: UIStyleComponent = {
            type: "UIStyle",
            backgroundColor: null,
            borderColor: null,
            borderWidth: 0,
            borderRadius: 0,
            textColor: config.color ?? "white",
            fontSize: config.fontSize ?? 16,
            textAlign: "left",
            fontFamily: config.fontFamily ?? "monospace"
        };

        const text: UITextComponent = {
            type: "UIText",
            content: config.text,
            wordWrap: false,
            maxLines: 0
        };

        world.addComponent(entity, element);
        world.addComponent(entity, style);
        world.addComponent(entity, text);

        return entity;
    }

    /**
     * Creates a panel (rectangular container) entity.
     *
     * @param world - The ECS world.
     * @param config - Configuration for dimensions, position, and background.
     * @returns The created Entity ID.
     */
    public static createPanel(world: World, config: {
        anchor: UIAnchor;
        width: UIValue;
        height: UIValue;
        backgroundColor?: string;
        borderColor?: string;
        borderWidth?: number;
        borderRadius?: number;
        padding?: Partial<UIEdgeInsets>;
        zIndex?: number;
        parentEntity?: Entity | null;
    }): Entity {
        const entity = world.createEntity();
        const padding: UIEdgeInsets = {
            top: config.padding?.top ?? 0,
            right: config.padding?.right ?? 0,
            bottom: config.padding?.bottom ?? 0,
            left: config.padding?.left ?? 0
        };

        const element: UIElementComponent = {
            type: "UIElement",
            elementType: "panel",
            anchor: config.anchor,
            offsetX: 0,
            offsetY: 0,
            width: config.width,
            height: config.height,
            padding,
            visible: true,
            opacity: 1,
            zIndex: config.zIndex ?? 0,
            interactive: false,
            parentEntity: config.parentEntity ?? null,
            computedX: 0, computedY: 0, computedWidth: 0, computedHeight: 0
        };

        const style: UIStyleComponent = {
            type: "UIStyle",
            backgroundColor: config.backgroundColor ?? "rgba(0,0,0,0.5)",
            borderColor: config.borderColor ?? null,
            borderWidth: config.borderWidth ?? 0,
            borderRadius: config.borderRadius ?? 0,
            textColor: "white",
            fontSize: 16,
            textAlign: "left",
            fontFamily: "monospace"
        };

        world.addComponent(entity, element);
        world.addComponent(entity, style);

        return entity;
    }

    /**
     * Creates an interactive button entity.
     *
     * @param world - The ECS world.
     * @param config - Configuration for text, action ID, and style.
     * @returns The created Entity ID.
     *
     * @remarks
     * Buttons automatically include a {@link UIButtonStateComponent} to track hover/press states.
     */
    public static createButton(world: World, config: {
        text: string;
        anchor: UIAnchor;
        width: UIValue;
        height: UIValue;
        actionId: string;
        backgroundColor?: string;
        textColor?: string;
        zIndex?: number;
        parentEntity?: Entity | null;
    }): Entity {
        const entity = this.createPanel(world, {
            anchor: config.anchor,
            width: config.width,
            height: config.height,
            backgroundColor: config.backgroundColor ?? "#444",
            zIndex: config.zIndex,
            parentEntity: config.parentEntity
        });

        const element = world.getComponent<UIElementComponent>(entity, "UIElement")!;
        element.elementType = "button";
        element.interactive = true;

        const btnState: UIButtonStateComponent = {
            type: "UIButtonState",
            state: "idle",
            actionId: config.actionId,
            clicked: false
        };

        const text: UITextComponent = {
            type: "UIText",
            content: config.text,
            wordWrap: false,
            maxLines: 0
        };

        const style = world.getComponent<UIStyleComponent>(entity, "UIStyle")!;
        style.textAlign = "center";
        style.textColor = config.textColor ?? "white";

        world.addComponent(entity, btnState);
        world.addComponent(entity, text);

        return entity;
    }

    /**
     * Creates a progress bar entity.
     *
     * @param world - The ECS world.
     * @param config - Configuration for colors and initial value.
     * @returns The created Entity ID.
     */
    public static createProgressBar(world: World, config: {
        anchor: UIAnchor;
        width: UIValue;
        height: UIValue;
        fillColor: string;
        trackColor: string;
        initialValue?: number;
        zIndex?: number;
        parentEntity?: Entity | null;
    }): Entity {
        const entity = world.createEntity();
        const element: UIElementComponent = {
            type: "UIElement",
            elementType: "progressBar",
            anchor: config.anchor,
            offsetX: 0,
            offsetY: 0,
            width: config.width,
            height: config.height,
            padding: { top: 0, right: 0, bottom: 0, left: 0 },
            visible: true,
            opacity: 1,
            zIndex: config.zIndex ?? 0,
            interactive: false,
            parentEntity: config.parentEntity ?? null,
            computedX: 0, computedY: 0, computedWidth: 0, computedHeight: 0
        };

        const pb: UIProgressBarComponent = {
            type: "UIProgressBar",
            value: config.initialValue ?? 1,
            fillColor: config.fillColor,
            trackColor: config.trackColor,
            direction: "left-to-right"
        };

        world.addComponent(entity, element);
        world.addComponent(entity, pb);

        return entity;
    }
}
