import React, { useEffect, useMemo, useRef } from "react";
import { View, Dimensions } from "react-native";
import { useSharedValue, useFrameCallback } from "react-native-reanimated";
import { World } from "../engine/core/World";
import { SceneManager } from "../engine/core/scene/SceneManager";
import { MatterPhysicsAdapter } from "../engine/physics/matter/MatterPhysicsAdapter";
import { PhysicsSystem } from "../engine/physics/adapters/PhysicsSystem";
import { CameraSystem, useSharedCamera } from "../engine/camera/CameraSystem";
import { InputSystem } from "../engine/input/InputSystem";
import { CollisionRouter } from "../engine/collision/CollisionRouter";
import { GameCanvas } from "../engine/rendering/skia/GameCanvas";
import { TransformComponent, RenderableComponent, RigidBodyComponent, TagComponent } from "../engine/core/types/CoreTypes";
import { Entity } from "../engine/types/EngineTypes";

const { width, height } = Dimensions.get("window");

/**
 * Main Game Component: Bootstraps the engine and the demo scene.
 */
export const GameEngine: React.FC = () => {
  // 1. Initialize Core Systems
  const world = useMemo(() => new World(), []);
  const sceneManager = useMemo(() => new SceneManager(world), [world]);
  const physicsAdapter = useMemo(() => new MatterPhysicsAdapter(), []);
  const physicsSystem = useMemo(() => new PhysicsSystem(physicsAdapter), [physicsAdapter]);
  const sharedCamera = useSharedCamera({ x: 0, y: 0, zoom: 1 });
  const cameraSystem = useMemo(() => new CameraSystem(sharedCamera), [sharedCamera]);
  const inputSystem = useMemo(() => new InputSystem(cameraSystem), [cameraSystem]);
  const collisionRouter = useMemo(() => new CollisionRouter(physicsAdapter.getMatterEngine()), [physicsAdapter]);

  // 2. Shared Value for Render State (Sync with UI Thread)
  const renderSnapshot = useSharedValue({ entities: [] as any[] });

  // 3. Define Demo Scene
  useEffect(() => {
    sceneManager.registerScene({
      id: "level",
      onEnter: (w: World) => {
        // Create Player
        const player = w.createEntity();
        w.addComponent(player, { type: "Transform", x: width / 2, y: height / 2, rotation: 0, scaleX: 1, scaleY: 1 } as TransformComponent);
        w.addComponent(player, { type: "Tag", tags: ["player"] } as TagComponent);
        w.addComponent(player, {
          type: "Renderable",
          renderType: "circle",
          color: "cyan",
          opacity: 1,
          visible: true,
          zIndex: 1,
          size: { width: 40, height: 40, radius: 20 },
        } as RenderableComponent);

        const body = physicsAdapter.createBody(player, {
          x: width / 2,
          y: height / 2,
          radius: 20,
          isStatic: false,
          friction: 0.1,
          restitution: 0.5,
        });
        w.addComponent(player, { type: "RigidBody", bodyId: body.id, isStatic: false } as RigidBodyComponent);

        // Create Walls
        const wall = w.createEntity();
        w.addComponent(wall, { type: "Transform", x: width / 2, y: height - 50, rotation: 0, scaleX: 1, scaleY: 1 } as TransformComponent);
        w.addComponent(wall, { type: "Tag", tags: ["wall"] } as TagComponent);
        w.addComponent(wall, {
          type: "Renderable",
          renderType: "rect",
          color: "gray",
          opacity: 1,
          visible: true,
          zIndex: 1,
          size: { width: width - 40, height: 40 },
        } as RenderableComponent);

        const wallBody = physicsAdapter.createBody(wall, {
          x: width / 2,
          y: height - 50,
          width: width - 40,
          height: 40,
          isStatic: true,
        });
        w.addComponent(wall, { type: "RigidBody", bodyId: wallBody.id, isStatic: true } as RigidBodyComponent);

        cameraSystem.follow(player, { lerp: 0.05 });
        cameraSystem.setBounds({ minX: -1000, minY: -1000, maxX: 2000, maxY: 2000 });
      },
      onExit: (w: World) => { w.clear(); },
      update: (w: World, dt: number) => {
        physicsSystem.update(w, dt);
        cameraSystem.update(w, dt, { width, height });
      },
    });

    sceneManager.loadScene("level");
  }, [sceneManager, physicsAdapter, physicsSystem, cameraSystem]);

  // 4. Main Game Loop (Reanimated Frame Callback)
  useFrameCallback((frameInfo) => {
    if (!frameInfo.timeSinceFirstFrame) return;

    // Estimate dt if timeSinceLastFrame is missing in this version of Reanimated
    const dt = 16.6;

    // Update Logic (JS Thread - in reality, would be decoupled but for demo it's here)
    sceneManager.update(dt);

    // Snapshot state for the UI Thread
    const entities = world.query("Transform", "Renderable");
    const snapshot = entities.map((id) => ({
      id,
      transform: world.getComponent<TransformComponent>(id, "Transform")!,
      renderable: world.getComponent<RenderableComponent>(id, "Renderable")!,
    }));

    renderSnapshot.value = { entities: snapshot };
  });

  return (
    <View style={{ flex: 1, backgroundColor: "black" }}>
      <GameCanvas
        sharedCamera={sharedCamera}
        renderSnapshot={renderSnapshot}
        width={width}
        height={height}
      />
    </View>
  );
};
