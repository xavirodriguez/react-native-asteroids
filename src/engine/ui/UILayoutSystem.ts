/**
 * @packageDocumentation
 * UI Layout Engine.
 * Resolves positioning and sizing for UI elements using anchors, relative units, and containers.
 */

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

/**
 * System that resolves the positioning and sizing of user interface (UI) elements.
 * Supports anchors, relative units (%), flow containers, and world-attached projections.
 *
 * @remarks
 * This system performs a recursive pass over the UI hierarchy. It translates high-level
 * layout rules (like "center this panel in the viewport" or "stack these buttons horizontally")
 * into concrete pixel coordinates stored in the `computed*` properties of {@link UIElementComponent}.
 *
 * Handles:
 * 1. Root elements (viewport-relative).
 * 2. World-attached elements (projections from 2D world space).
 * 3. Hierarchical inheritance (child offsets relative to parent).
 * 4. Flex-like containers (horizontal/vertical stacking).
 *
 * @responsibility Calculate final coordinates (`computedX`, `computedY`) and dimensions (`computedWidth`, `computedHeight`) for UI elements.
 * @queries `UIElement`, `UIContainer`, `UIWorldAttach`, `Transform`, `Position`, `GameState` (Singleton).
 * @mutates `UIElementComponent`.
 * @dependsOn `UIElementComponent`, `UIContainerComponent`, `UIWorldAttachComponent`.
 * @executionOrder Presentation Phase (before UI rendering).
 *
 * @conceptualRisk [LAYOUT_CASCADE] Uses recursion to resolve the layout. Very deep UI trees could cause stack overflow or performance issues.
 * @conceptualRisk [WORLD_SYNC] `UIWorldAttach` elements depend on the camera and `Transform`/`Position` components. If these are updated after the layout, the UI may "jitter" or lag behind the entity.
 */
export class UILayoutSystem extends System {
  /** Current width of the target rendering area. */
  private viewportWidth: number = 800;
  /** Current height of the target rendering area. */
  private viewportHeight: number = 600;

  /**
   * Initializes the layout system with initial viewport dimensions.
   *
   * @param viewportWidth - Render area width (default 800).
   * @param viewportHeight - Render area height (default 600).
   */
  constructor(viewportWidth?: number, viewportHeight?: number) {
    super();
    if (viewportWidth) this.viewportWidth = viewportWidth;
    if (viewportHeight) this.viewportHeight = viewportHeight;
  }

  /**
   * Updates the reference dimensions for layout calculations.
   * Useful when the game window is resized.
   *
   * @param width - New width.
   * @param height - New height.
   */
  public setViewportSize(width: number, height: number): void {
    this.viewportWidth = width;
    this.viewportHeight = height;
  }

  /**
   * Executes layout resolution for all entities with a `UIElement` component.
   *
   * @param world - The ECS world.
   * @param _deltaTime - Frame time (ignored by this system as it is purely positional).
   *
   * @sideEffect Updates the `computed*` properties of `UIElement` components.
   * @remarks
   * First, it builds a parent-child map to facilitate efficient hierarchical traversal.
   * Then, it starts the recursive layout from all root elements (those without a `parentEntity`).
   */
  public update(world: World, _deltaTime: number): void {
    const uiEntities = world.query("UIElement");
    if (uiEntities.length === 0) return;

    // Group elements by parent for hierarchical traversal
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

  /**
   * Recursively resolves the position and size of an element and its children.
   *
   * @param world - The ECS world.
   * @param entity - The UI entity to process.
   * @param childrenByParent - Pre-calculated map of hierarchical relationships.
   *
   * @conceptualRisk [ZALGO_MAPPING] If `childrenByParent` does not include all members of `uiEntities` from `update()`, some elements will be orphaned.
   */
  private layoutElement(world: World, entity: Entity, childrenByParent: Map<Entity | null, Entity[]>): void {
    const element = world.getComponent<UIElementComponent>(entity, "UIElement")!;

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

  /**
   * Specialized layout logic for elements with the {@link UIContainerComponent}.
   * Positions children in a stack (horizontal or vertical) with a specified gap.
   */
  private layoutContainerChildren(
    world: World,
    parentEntity: Entity,
    parentElement: UIElementComponent,
    container: UIContainerComponent,
    childrenByParent: Map<Entity | null, Entity[]>
  ): void {
    const children = childrenByParent.get(parentEntity);
    if (!children) return;

    // Sort by z-index to ensure correct visual order if they overlap slightly
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

        // Recursively layout children of this child
        this.layoutElement(world, childEntity, childrenByParent);
    }
  }

  /**
   * Helper to align an element within a container's axis.
   */
  private alignInAxis(align: string, start: number, total: number, size: number): number {
    switch (align) {
        case "center": return start + (total / 2) - (size / 2);
        case "end": return start + total - size;
        case "stretch": return start;
        case "start":
        default: return start;
    }
  }

  /**
   * Resolves a {@link UIValue} (pixels or percentage) into a concrete pixel number.
   */
  private resolveValue(uiValue: UIValue, parentSize: number): number {
    if (uiValue.unit === "px") return uiValue.value;
    return (uiValue.value / 100) * parentSize;
  }

  /**
   * Calculates the top-left coordinate for a given anchor point within a reference area.
   */
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

  /**
   * Projects a UI element onto screen coordinates based on a world entity.
   *
   * @param world - The ECS world.
   * @param element - The UI component to position.
   * @param attach - World-anchor definition.
   *
   * @remarks
   * Attempts to read `worldX/worldY` from `Transform` first, falling back to `x/y` if they don't exist.
   * If `useCamera` is enabled, it offsets the position by the global camera singleton state.
   *
   * @conceptualRisk [TYPE_UNSAFETY] Uses `any` to access `Transform`, `Position`, and `GameState`.
   * This hides potential errors if the structure of these components changes.
   */
  private resolveWorldPosition(world: World, element: UIElementComponent, attach: UIWorldAttachComponent): void {
      const targetTransform = world.getComponent<import("../core/CoreComponents").TransformComponent>(attach.targetEntity, "Transform");

      if (!targetTransform) return;

      let screenX = targetTransform.worldX !== undefined ? targetTransform.worldX : targetTransform.x;
      let screenY = targetTransform.worldY !== undefined ? targetTransform.worldY : targetTransform.y;

      if (attach.useCamera) {
          const gameState = world.getSingleton<Record<string, unknown>>("GameState");
          const camera = gameState?.camera as Record<string, number> | undefined;
          if (camera) {
              screenX -= camera.x || 0;
              screenY -= camera.y || 0;
          }
      }

      element.computedWidth = this.resolveValue(element.width, this.viewportWidth);
      element.computedHeight = this.resolveValue(element.height, this.viewportHeight);
      element.computedX = screenX + attach.worldOffsetX - element.computedWidth / 2;
      element.computedY = screenY + attach.worldOffsetY - element.computedHeight / 2;
  }
}
