import { World } from "../core/World";
import {
  UIElementComponent,
  UIAnchor,
  UIValue,
  UIContainerComponent,
  UIWorldAttachComponent
} from "./UITypes";
import { Entity } from "../core/Entity";
import { GenericComponent, TransformComponent } from "../core/CoreComponents";
import { AbstractHierarchySystem } from "../systems/AbstractHierarchySystem";

/**
 * UI Layout Engine.
 *
 * Resolves positions and dimensions for user interface elements using an iterative
 * topological sort to handle hierarchical constraints. Supports anchors, relative units (%),
 * flex-like containers, and world-space attachments.
 */
export class UILayoutSystem extends AbstractHierarchySystem {
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

  public update(world: World, _deltaTime: number): void {
    this.wasDirty.clear();

    const order = this.getProcessingOrder(world, "UIElement");
    if (order.length === 0) return;

    // 2. Pre-group children by parent for container layout
    const childrenByParent = new Map<Entity, Entity[]>();
    for (const entity of order) {
      const element = world.getComponent<UIElementComponent>(entity, "UIElement")!;
      if (element.parentEntity !== null) {
        if (!childrenByParent.has(element.parentEntity)) {
          childrenByParent.set(element.parentEntity, []);
        }
        childrenByParent.get(element.parentEntity)!.push(entity);
      }
    }

    // 3. Iteratively process layout in topological order
    for (let i = 0; i < order.length; i++) {
      const entity = order[i];
      const element = world.getComponent<UIElementComponent>(entity, "UIElement");
      if (!element) continue;

      let parentDirty = false;
      if (element.parentEntity !== null) {
        parentDirty = this.wasDirty.has(element.parentEntity);
      }

      const isDirty = element.dirty || parentDirty;

      if (!isDirty) continue;

      // Check if this element is already laid out by its parent (if it's a container)
      // Actually, we can just process everything. If it's a root, we use viewport.
      // If it has a parent, we use parent's computed values.
      // EXCEPT if parent is a container, the parent should have already computed the child's position.

      const parentEntity = element.parentEntity;
      let isHandledByContainer = false;

      if (parentEntity !== null) {
        const parentContainer = world.getComponent<UIContainerComponent>(parentEntity, "UIContainer");
        if (parentContainer) {
          // Containers handle their children's positions.
          // Since we are in topological order, the parent container's layout was already triggered.
          isHandledByContainer = true;
        }
      }

      if (!isHandledByContainer) {
        if (parentEntity === null) {
          // Root or World Attached
          const worldAttach = world.getComponent<UIWorldAttachComponent>(entity, "UIWorldAttach");
          if (worldAttach) {
            this.resolveWorldPosition(world, entity, element, worldAttach);
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

            world.mutateComponent<UIElementComponent>(entity, "UIElement", el => {
              el.computedWidth = resolvedWidth;
              el.computedHeight = resolvedHeight;
              el.computedX = anchorPos.x + el.offsetX;
              el.computedY = anchorPos.y + el.offsetY;
              el.dirty = false;
            });
          }
        } else {
          // Normal child of a non-container UI element
          const parentElement = world.getComponent<UIElementComponent>(parentEntity, "UIElement");
          if (parentElement) {
            const resolvedWidth = this.resolveValue(element.width, parentElement.computedWidth);
            const resolvedHeight = this.resolveValue(element.height, parentElement.computedHeight);
            world.mutateComponent<UIElementComponent>(entity, "UIElement", el => {
              el.computedWidth = resolvedWidth;
              el.computedHeight = resolvedHeight;
              el.computedX = parentElement.computedX + el.offsetX;
              el.computedY = parentElement.computedY + el.offsetY;
              el.dirty = false;
            });
          }
        }
      } else {
        // Even if handled by container, we should clear dirty flag.
        // The container logic in the parent should have already updated this child.
        world.mutateComponent<UIElementComponent>(entity, "UIElement", el => {
          el.dirty = false;
        });
      }

      this.wasDirty.add(entity);

      // If this element is a container, it should layout its direct children now.
      // Even though those children are later in the 'order' array, we set their computedX/Y here.
      const container = world.getComponent<UIContainerComponent>(entity, "UIContainer");
      if (container) {
        this.layoutContainerChildren(world, entity, element, container, childrenByParent);
      }
    }
  }

  private layoutContainerChildren(
    world: World,
    parentEntity: Entity,
    parentElement: UIElementComponent,
    container: UIContainerComponent,
    childrenByParent: Map<Entity, Entity[]>
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

    const availableWidth = Math.max(0, parentElement.computedWidth - parentElement.padding.left - parentElement.padding.right);
    const availableHeight = Math.max(0, parentElement.computedHeight - parentElement.padding.top - parentElement.padding.bottom);

    for (const childEntity of sortedChildren) {
      const childElement = world.getComponent<UIElementComponent>(childEntity, "UIElement")!;

      const resolvedWidth = this.resolveValue(childElement.width, availableWidth);
      const resolvedHeight = this.resolveValue(childElement.height, availableHeight);

      const localCurrentX = currentX;
      const localCurrentY = currentY;

      world.mutateComponent<UIElementComponent>(childEntity, "UIElement", el => {
        el.computedWidth = resolvedWidth;
        el.computedHeight = resolvedHeight;

        if (container.direction === "horizontal") {
          el.computedX = localCurrentX + el.offsetX;
          el.computedY = this.alignInAxis(
            container.align,
            localCurrentY,
            availableHeight,
            resolvedHeight
          ) + el.offsetY;
        } else {
          el.computedY = localCurrentY + el.offsetY;
          el.computedX = this.alignInAxis(
            container.align,
            localCurrentX,
            availableWidth,
            resolvedWidth
          ) + el.offsetX;
        }
      });

      if (container.direction === "horizontal") {
        currentX += resolvedWidth + container.gap;
      } else {
        currentY += resolvedHeight + container.gap;
      }
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

  private resolveAnchorPosition(anchor: UIAnchor, vpW: number, vpH: number, elW: number, elH: number): { x: number, y: number } {
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

  private resolveWorldPosition(world: World, entity: Entity, element: UIElementComponent, attach: UIWorldAttachComponent): void {
    const targetTransform = world.getComponent<TransformComponent>(attach.targetEntity, "Transform");

    if (!targetTransform) return;

    let screenX = targetTransform.worldX !== undefined ? targetTransform.worldX : targetTransform.x;
    let screenY = targetTransform.worldY !== undefined ? targetTransform.worldY : targetTransform.y;

    if (attach.useCamera) {
      const gameState = world.getSingleton<GenericComponent>("GameState");
      const camera = gameState?.camera as Record<string, number> | undefined;
      if (camera) {
        screenX -= camera.x || 0;
        screenY -= camera.y || 0;
      }
    }

    const resolvedWidth = this.resolveValue(element.width, this.viewportWidth);
    const resolvedHeight = this.resolveValue(element.height, this.viewportHeight);
    const finalComputedX = screenX + attach.worldOffsetX - resolvedWidth / 2;
    const finalComputedY = screenY + attach.worldOffsetY - resolvedHeight / 2;

    world.mutateComponent<UIElementComponent>(entity, "UIElement", el => {
        el.computedWidth = resolvedWidth;
        el.computedHeight = resolvedHeight;
        el.computedX = finalComputedX;
        el.computedY = finalComputedY;
    });
  }
}
