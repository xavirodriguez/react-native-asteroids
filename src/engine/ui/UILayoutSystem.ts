import { System } from "../core/System";
import { World } from "../core/World";
import {
  UIElementComponent,
  UIAnchor,
  UIValue,
  UIContainerComponent,
  UIWorldAttachComponent
} from "./UITypes";
import { Entity } from "../core/Entity";

export class UILayoutSystem extends System {
  private viewportWidth: number = 800;
  private viewportHeight: number = 600;

  constructor(viewportWidth?: number, viewportHeight?: number) {
    super();
    if (viewportWidth) this.viewportWidth = viewportWidth;
    if (viewportHeight) this.viewportHeight = viewportHeight;
  }

  public setViewportSize(width: number, height: number): void {
    this.viewportWidth = width;
    this.viewportHeight = height;
  }

  public update(world: World, deltaTime: number): void {
    const uiEntities = world.query("UIElement");
    if (uiEntities.length === 0) return;

    const childrenByParent = new Map<Entity | null, Entity[]>();
    for (const entity of uiEntities) {
        const element = world.getComponent<UIElementComponent>(entity, "UIElement")!;
        const parent = element.parentEntity;
        if (!childrenByParent.has(parent)) {
            childrenByParent.set(parent, []);
        }
        childrenByParent.get(parent)!.push(entity);
    }

    const rootElements = childrenByParent.get(null) || [];

    for (const entity of rootElements) {
      this.layoutElement(world, entity, childrenByParent);
    }
  }

  private layoutElement(world: World, entity: Entity, childrenByParent: Map<Entity | null, Entity[]>): void {
    const element = world.getComponent<UIElementComponent>(entity, "UIElement")!;

    // Damage numbers and other transient UI might use manual offsets
    // Resolve Root Position based on Anchor
    if (element.parentEntity === null) {
        const worldAttach = world.getComponent<UIWorldAttachComponent>(entity, "UIWorldAttach");
        if (worldAttach) {
            this.resolveWorldPosition(world, element, worldAttach);
        } else {
            const resolvedWidth = this.resolveValue(element.width, this.viewportWidth);
            const resolvedHeight = this.resolveValue(element.height, this.viewportHeight);

            const anchorPos = this.resolveAnchorPosition(
                element.anchor,
                this.viewportWidth,
                this.viewportHeight,
                resolvedWidth,
                resolvedHeight
            );

            element.computedWidth = resolvedWidth;
            element.computedHeight = resolvedHeight;
            element.computedX = anchorPos.x + element.offsetX;
            element.computedY = anchorPos.y + element.offsetY;
        }
    }

    const container = world.getComponent<UIContainerComponent>(entity, "UIContainer");
    if (container) {
        this.layoutContainerChildren(world, entity, element, container, childrenByParent);
    } else {
        const children = childrenByParent.get(entity);
        if (children) {
            for (const child of children) {
                const childElement = world.getComponent<UIElementComponent>(child, "UIElement")!;
                // Inherit parent position if not set otherwise
                childElement.computedX = element.computedX + childElement.offsetX;
                childElement.computedY = element.computedY + childElement.offsetY;
                childElement.computedWidth = this.resolveValue(childElement.width, element.computedWidth);
                childElement.computedHeight = this.resolveValue(childElement.height, element.computedHeight);
                this.layoutElement(world, child, childrenByParent);
            }
        }
    }
  }

  private layoutContainerChildren(
    world: World,
    parentEntity: Entity,
    parentElement: UIElementComponent,
    container: UIContainerComponent,
    childrenByParent: Map<Entity | null, Entity[]>
  ): void {
    const children = childrenByParent.get(parentEntity);
    if (!children) return;

    const sortedChildren = [...children].sort((a, b) => {
        const elA = world.getComponent<UIElementComponent>(a, "UIElement")!;
        const elB = world.getComponent<UIElementComponent>(b, "UIElement")!;
        return elA.zIndex - elB.zIndex;
    });

    let currentX = parentElement.computedX + parentElement.padding.left;
    let currentY = parentElement.computedY + parentElement.padding.top;

    const availableWidth = parentElement.computedWidth - parentElement.padding.left - parentElement.padding.right;
    const availableHeight = parentElement.computedHeight - parentElement.padding.top - parentElement.padding.bottom;

    for (const childEntity of sortedChildren) {
        const childElement = world.getComponent<UIElementComponent>(childEntity, "UIElement")!;

        const resolvedWidth = this.resolveValue(childElement.width, availableWidth);
        const resolvedHeight = this.resolveValue(childElement.height, availableHeight);

        childElement.computedWidth = resolvedWidth;
        childElement.computedHeight = resolvedHeight;

        if (container.direction === "horizontal") {
            childElement.computedX = currentX + childElement.offsetX;
            childElement.computedY = this.alignInAxis(
                container.align,
                currentY,
                availableHeight,
                resolvedHeight
            ) + childElement.offsetY;

            currentX += resolvedWidth + container.gap;
        } else {
            childElement.computedY = currentY + childElement.offsetY;
            childElement.computedX = this.alignInAxis(
                container.align,
                currentX,
                availableWidth,
                resolvedWidth
            ) + childElement.offsetX;

            currentY += resolvedHeight + container.gap;
        }

        this.layoutElement(world, childEntity, childrenByParent);
    }
  }

  private alignInAxis(align: string, start: number, total: number, size: number): number {
    switch (align) {
        case "center": return start + (total / 2) - (size / 2);
        case "end": return start + total - size;
        case "stretch": return start;
        case "start":
        default: return start;
    }
  }

  private resolveValue(uiValue: UIValue, parentSize: number): number {
    if (uiValue.unit === "px") return uiValue.value;
    return (uiValue.value / 100) * parentSize;
  }

  private resolveAnchorPosition(anchor: UIAnchor, vpW: number, vpH: number, elW: number, elH: number): {x: number, y: number} {
    switch (anchor) {
        case "top-left": return { x: 0, y: 0 };
        case "top-center": return { x: vpW / 2 - elW / 2, y: 0 };
        case "top-right": return { x: vpW - elW, y: 0 };
        case "center-left": return { x: 0, y: vpH / 2 - elH / 2 };
        case "center": return { x: vpW / 2 - elW / 2, y: vpH / 2 - elH / 2 };
        case "center-right": return { x: vpW - elW, y: vpH / 2 - elH / 2 };
        case "bottom-left": return { x: 0, y: vpH - elH };
        case "bottom-center": return { x: vpW / 2 - elW / 2, y: vpH - elH };
        case "bottom-right": return { x: vpW - elW, y: vpH - elH };
        default: return { x: 0, y: 0 };
    }
  }

  private resolveWorldPosition(world: World, element: UIElementComponent, attach: UIWorldAttachComponent): void {
      const targetTransform = world.getComponent<any>(attach.targetEntity, "Transform") ||
                              world.getComponent<any>(attach.targetEntity, "Position");

      if (!targetTransform) return;

      let screenX = targetTransform.worldX !== undefined ? targetTransform.worldX : targetTransform.x;
      let screenY = targetTransform.worldY !== undefined ? targetTransform.worldY : targetTransform.y;

      if (attach.useCamera) {
          const gameState = world.getSingleton<any>("GameState");
          if (gameState?.camera) {
              screenX -= gameState.camera.x || 0;
              screenY -= gameState.camera.y || 0;
          }
      }

      element.computedWidth = this.resolveValue(element.width, this.viewportWidth);
      element.computedHeight = this.resolveValue(element.height, this.viewportHeight);
      element.computedX = screenX + attach.worldOffsetX - element.computedWidth / 2;
      element.computedY = screenY + attach.worldOffsetY - element.computedHeight / 2;
  }
}
