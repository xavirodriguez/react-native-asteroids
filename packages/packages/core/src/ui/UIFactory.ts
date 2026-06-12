import { World } from "../index";
import { Entity } from "../ecs/Entity";
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
 * Factoría para la creación simplificada de elementos de interfaz de usuario.
 */
export class UIFactory {
    /**
     * Crea una etiqueta de texto (Label).
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
        const commands = world.getCommandBuffer();
        const entity = world.isUpdating ? world.reserveEntityId() : world.createEntity();

        if (world.isUpdating) {
            commands.addCommand(w => (w as any).activeEntities.add(entity));
        }

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

        if (world.isUpdating) {
            commands.addComponent(entity, element);
            commands.addComponent(entity, style);
            commands.addComponent(entity, text);
        } else {
            world.addComponent(entity, element);
            world.addComponent(entity, style);
            world.addComponent(entity, text);
        }

        return entity;
    }

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
        const commands = world.getCommandBuffer();
        const entity = world.isUpdating ? world.reserveEntityId() : world.createEntity();

        if (world.isUpdating) {
            commands.addCommand(w => (w as any).activeEntities.add(entity));
        }

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

        if (world.isUpdating) {
            commands.addComponent(entity, element);
            commands.addComponent(entity, style);
        } else {
            world.addComponent(entity, element);
            world.addComponent(entity, style);
        }

        return entity;
    }

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

        const commands = world.getCommandBuffer();

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

        if (world.isUpdating) {
            commands.mutateComponent(entity, "UIElement", (element: any) => {
                element.elementType = "button";
                element.interactive = true;
            });
            commands.mutateComponent(entity, "UIStyle", (style: any) => {
                style.textAlign = "center";
                style.textColor = config.textColor ?? "white";
            });
            commands.addComponent(entity, btnState);
            commands.addComponent(entity, text);
        } else {
            world.mutateComponent(entity, "UIElement", (element: any) => {
                element.elementType = "button";
                element.interactive = true;
            });

            world.mutateComponent(entity, "UIStyle", (style: any) => {
                style.textAlign = "center";
                style.textColor = config.textColor ?? "white";
            });

            world.addComponent(entity, btnState);
            world.addComponent(entity, text);
        }

        return entity;
    }

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
        const commands = world.getCommandBuffer();
        const entity = world.isUpdating ? world.reserveEntityId() : world.createEntity();

        if (world.isUpdating) {
            commands.addCommand(w => (w as any).activeEntities.add(entity));
        }

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

        if (world.isUpdating) {
            commands.addComponent(entity, element);
            commands.addComponent(entity, pb);
        } else {
            world.addComponent(entity, element);
            world.addComponent(entity, pb);
        }

        return entity;
    }
}
