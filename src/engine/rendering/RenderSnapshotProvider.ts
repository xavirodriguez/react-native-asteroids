import { World } from "../core/World";
import { RenderSnapshot, UISnapshot } from "./RenderSnapshot";
import { Camera2DComponent, TransformComponent, PreviousTransformComponent, RenderComponent, GenericComponent } from "../core/CoreComponents";
import { RandomService } from "../utils/RandomService";
import { UIElementComponent, UIStyleComponent, UITextComponent, UIProgressBarComponent, UIButtonStateComponent } from "../ui/UITypes";

/**
 * Utility to generate standardized RenderSnapshots from the ECS World.
 * Ensures consistent interpolation, culling, and effect aggregation across all renderers.
 */
export class RenderSnapshotProvider {
    /**
     * Captures the visual state of the world into a reusable snapshot object.
     */
    public static createSnapshot(
        world: World,
        alpha: number,
        width: number,
        height: number,
        target: RenderSnapshot
    ): RenderSnapshot {
        // 0. Camera selection and data
        const cameras = world.query("Camera2D");
        let mainCam: Camera2DComponent | null = null;
        for (const camEntity of cameras) {
            const cam = world.getComponent<Camera2DComponent>(camEntity, "Camera2D")!;
            if (cam.isMain || !mainCam) {
                mainCam = cam;
                if (cam.isMain) break;
            }
        }

        target.cameraX = mainCam?.x ?? 0;
        target.cameraY = mainCam?.y ?? 0;
        target.cameraZoom = mainCam?.zoom ?? 1;

        // 1. Time and Base Game State
        const gameStateEntity = world.query("GameState")[0];
        const gameState = gameStateEntity ? world.getComponent<GenericComponent>(gameStateEntity, "GameState") : null;
        const serverTick = gameState && (gameState as Record<string, unknown>).serverTick !== undefined
            ? (gameState as Record<string, unknown>).serverTick as number
            : null;
        target.elapsedTime = serverTick !== null ? serverTick * (1000 / 60) : performance.now();

        // Visual viewport for culling in world space
        const cullMinX = target.cameraX;
        const cullMinY = target.cameraY;
        const cullMaxX = cullMinX + width / target.cameraZoom;
        const cullMaxY = cullMinY + height / target.cameraZoom;

        // 2. Aggregate Screenshake
        let shakeX = 0;
        let shakeY = 0;
        const shakeEntities = world.query("ScreenShake");
        const renderRandom = RandomService.getInstance("render");

        for (let i = 0; i < shakeEntities.length; i++) {
            const shake = world.getComponent<import("../core/CoreComponents").ScreenShakeComponent>(shakeEntities[i], "ScreenShake")!;
            if (shake.remaining > 0 || (shake as any).duration > 0) {
                shakeX += (renderRandom.next() - 0.5) * shake.intensity;
                shakeY += (renderRandom.next() - 0.5) * shake.intensity;
            }
        }

        if (mainCam && (mainCam.shakeOffsetX !== 0 || mainCam.shakeOffsetY !== 0)) {
            shakeX += mainCam.shakeOffsetX;
            shakeY += mainCam.shakeOffsetY;
        }

        target.shakeX = shakeX;
        target.shakeY = shakeY;

        // 3. Process Entities
        const entities = world.query("Transform", "Render");
        let count = 0;
        const maxEntities = target.entities.length;

        for (let i = 0; i < entities.length; i++) {
            if (count >= maxEntities) break;
            const entity = entities[i];

            const trans = world.getComponent<TransformComponent>(entity, "Transform")!;
            const prevTrans = world.getComponent<PreviousTransformComponent>(entity, "PreviousTransform");
            const render = world.getComponent<RenderComponent>(entity, "Render")!;
            const offset = world.getComponent<import("../core/CoreComponents").VisualOffsetComponent>(entity, "VisualOffset");

            const snap = target.entities[count];
            snap.id = entity;

            let x = trans.worldX ?? trans.x;
            let y = trans.worldY ?? trans.y;
            let rotation = trans.worldRotation ?? trans.rotation;
            const scaleX = trans.worldScaleX ?? (trans.scaleX ?? 1);
            const scaleY = trans.worldScaleY ?? (trans.scaleY ?? 1);

            if (prevTrans && alpha < 1) {
                const prevX = prevTrans.worldX !== undefined ? prevTrans.worldX : prevTrans.x;
                const prevY = prevTrans.worldY !== undefined ? prevTrans.worldY : prevTrans.y;
                const prevRot = prevTrans.worldRotation !== undefined ? prevTrans.worldRotation : prevTrans.rotation;

                x = prevX + (x - prevX) * alpha;
                y = prevY + (y - prevY) * alpha;

                let diff = rotation - prevRot;
                while (diff < -Math.PI) diff += Math.PI * 2;
                while (diff > Math.PI) diff -= Math.PI * 2;
                rotation = prevRot + diff * alpha;
            }

            snap.x = x + (offset?.x ?? 0);
            snap.y = y + (offset?.y ?? 0);
            snap.rotation = rotation + (offset?.rotation ?? 0);
            snap.scaleX = scaleX + (offset?.scaleX ?? 0);
            snap.scaleY = scaleY + (offset?.scaleY ?? 0);
            snap.opacity = render.data?.opacity !== undefined ? (render.data.opacity as number) : 1;
            snap.zIndex = render.zIndex ?? 0;
            snap.shape = render.shape;
            snap.color = render.color;
            snap.size = render.size;
            snap.vertices = render.vertices || null;
            snap.hitFlashFrames = render.hitFlashFrames || 0;
            snap.data = render.data ?? null;

            // Frustum Culling
            const halfSize = render.size / 2;
            const isVisible = !(snap.x + halfSize < cullMinX || snap.x - halfSize > cullMaxX ||
                                snap.y + halfSize < cullMinY || snap.y - halfSize > cullMaxY);

            if (isVisible) {
                count++;
            }
        }
        target.entityCount = count;

        // 4. Process UI
        const uiEntities = world.query("UIElement");
        let uiCount = 0;
        const maxUI = target.uiElements.length;

        for (let i = 0; i < uiEntities.length; i++) {
            if (uiCount >= maxUI) break;
            const entity = uiEntities[i];
            const el = world.getComponent<UIElementComponent>(entity, "UIElement")!;
            const snap = target.uiElements[uiCount];

            snap.id = entity;
            snap.elementType = el.elementType;
            snap.x = el.computedX;
            snap.y = el.computedY;
            snap.width = el.computedWidth;
            snap.height = el.computedHeight;
            snap.opacity = el.opacity;
            snap.visible = el.visible;
            snap.zIndex = el.zIndex;

            const style = world.getComponent<UIStyleComponent>(entity, "UIStyle");
            snap.style = style ? { ...style } : null;

            const text = world.getComponent<UITextComponent>(entity, "UIText");
            snap.text = text ? { ...text } : null;

            const pb = world.getComponent<UIProgressBarComponent>(entity, "UIProgressBar");
            snap.progressBar = pb ? { ...pb } : null;

            const btnState = world.getComponent<UIButtonStateComponent>(entity, "UIButtonState");
            snap.data = btnState ? { buttonState: btnState.state } : null;

            uiCount++;
        }
        target.uiCount = uiCount;

        return target;
    }
}
