import { World } from "../core/World";
import {
    UIElementComponent,
    UIStyleComponent,
    UITextComponent,
    UIProgressBarComponent,
    UIImageComponent,
    UIButtonStateComponent
} from "./UITypes";
import { TextRenderer } from "./text/TextRenderer";

export function renderUI(ctx: CanvasRenderingContext2D, world: World): void {
    const uiEntities = world.query("UIElement");

    const sortedEntities = [...uiEntities].sort((a, b) => {
        const elA = world.getComponent<UIElementComponent>(a, "UIElement")!;
        const elB = world.getComponent<UIElementComponent>(b, "UIElement")!;
        return elA.zIndex - elB.zIndex;
    });

    for (const entity of sortedEntities) {
        const element = world.getComponent<UIElementComponent>(entity, "UIElement")!;
        if (!element.visible) continue;

        ctx.save();
        ctx.globalAlpha = element.opacity;

        switch (element.elementType) {
            case "panel":
                renderPanel(ctx, entity, world, element);
                break;
            case "label":
                renderLabel(ctx, entity, world, element);
                break;
            case "button":
                renderButton(ctx, entity, world, element);
                break;
            case "progressBar":
                renderProgressBar(ctx, entity, world, element);
                break;
            case "image":
                renderImage(ctx, entity, world, element);
                break;
            case "container":
                if (world.hasComponent(entity, "UIStyle")) {
                    renderPanel(ctx, entity, world, element);
                }
                break;
        }

        ctx.restore();
    }
}

function renderPanel(ctx: CanvasRenderingContext2D, entity: any, world: World, element: UIElementComponent): void {
    const style = world.getComponent<UIStyleComponent>(entity, "UIStyle");
    if (!style || !style.backgroundColor) return;

    ctx.fillStyle = style.backgroundColor;
    if (style.borderRadius > 0) {
        drawRoundedRect(ctx, element.computedX, element.computedY, element.computedWidth, element.computedHeight, style.borderRadius);
        ctx.fill();
        if (style.borderColor && style.borderWidth > 0) {
            ctx.strokeStyle = style.borderColor;
            ctx.lineWidth = style.borderWidth;
            ctx.stroke();
        }
    } else {
        ctx.fillRect(element.computedX, element.computedY, element.computedWidth, element.computedHeight);
        if (style.borderColor && style.borderWidth > 0) {
            ctx.strokeStyle = style.borderColor;
            ctx.lineWidth = style.borderWidth;
            ctx.strokeRect(element.computedX, element.computedY, element.computedWidth, element.computedHeight);
        }
    }
}

function renderLabel(ctx: CanvasRenderingContext2D, entity: any, world: World, element: UIElementComponent): void {
    const text = world.getComponent<UITextComponent>(entity, "UIText");
    const style = world.getComponent<UIStyleComponent>(entity, "UIStyle");
    if (!text || !style) return;

    let textX = element.computedX;
    if (style.textAlign === "center") {
        textX = element.computedX + element.computedWidth / 2;
    } else if (style.textAlign === "right") {
        textX = element.computedX + element.computedWidth;
    }

    TextRenderer.drawSystemText(
        ctx,
        text.content,
        textX,
        element.computedY,
        style.fontSize,
        style.textColor,
        style.fontFamily,
        style.textAlign,
        text.wordWrap ? element.computedWidth : undefined
    );
}

function renderButton(ctx: CanvasRenderingContext2D, entity: any, world: World, element: UIElementComponent): void {
    const btnState = world.getComponent<UIButtonStateComponent>(entity, "UIButtonState");
    const style = world.getComponent<UIStyleComponent>(entity, "UIStyle");

    if (style) {
        ctx.save();
        if (btnState?.state === "pressed") {
            ctx.globalAlpha *= 0.8;
        } else if (btnState?.state === "hovered") {
            ctx.globalAlpha *= 1.1;
        }
        renderPanel(ctx, entity, world, element);
        ctx.restore();
    }

    if (world.hasComponent(entity, "UIText")) {
        renderLabel(ctx, entity, world, element);
    }
}

function renderProgressBar(ctx: CanvasRenderingContext2D, entity: any, world: World, element: UIElementComponent): void {
    const pb = world.getComponent<UIProgressBarComponent>(entity, "UIProgressBar")!;
    const style = world.getComponent<UIStyleComponent>(entity, "UIStyle");

    ctx.fillStyle = pb.trackColor;
    ctx.fillRect(element.computedX, element.computedY, element.computedWidth, element.computedHeight);

    ctx.fillStyle = pb.fillColor;
    const fillWidth = element.computedWidth * Math.max(0, Math.min(1, pb.value));
    ctx.fillRect(element.computedX, element.computedY, fillWidth, element.computedHeight);

    if (style?.borderColor && style.borderWidth > 0) {
        ctx.strokeStyle = style.borderColor;
        ctx.lineWidth = style.borderWidth;
        ctx.strokeRect(element.computedX, element.computedY, element.computedWidth, element.computedHeight);
    }
}

function renderImage(ctx: CanvasRenderingContext2D, entity: any, world: World, element: UIElementComponent): void {
    // Placeholder for image rendering
}

function drawRoundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
}
