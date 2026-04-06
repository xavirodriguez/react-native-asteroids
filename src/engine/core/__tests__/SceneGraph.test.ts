import { SceneGraph } from "../SceneGraph";

describe("SceneGraph", () => {
  let sceneGraph: SceneGraph;

  beforeEach(() => {
    sceneGraph = new SceneGraph();
  });

  it("should calculate correct world transform for a single node", () => {
    const entity = 1;
    sceneGraph.addNode(entity);
    sceneGraph.setLocalTransform(entity, { x: 10, y: 20 });

    sceneGraph.updateTransforms();

    const world = sceneGraph.getWorldTransform(entity);
    expect(world?.x).toBe(10);
    expect(world?.y).toBe(20);
  });

  it("should calculate correct world transform for a child node", () => {
    const parent = 1;
    const child = 2;

    sceneGraph.addNode(parent);
    sceneGraph.addNode(child, parent);

    sceneGraph.setLocalTransform(parent, { x: 100, y: 100 });
    sceneGraph.setLocalTransform(child, { x: 50, y: 50 });

    sceneGraph.updateTransforms();

    const worldChild = sceneGraph.getWorldTransform(child);
    expect(worldChild?.x).toBe(150);
    expect(worldChild?.y).toBe(150);
  });

  it("should propagate transforms through rotation", () => {
    const parent = 1;
    const child = 2;

    sceneGraph.addNode(parent);
    sceneGraph.addNode(child, parent);

    // Rotate parent 90 degrees (PI/2)
    sceneGraph.setLocalTransform(parent, { x: 0, y: 0, rotation: Math.PI / 2 });
    sceneGraph.setLocalTransform(child, { x: 10, y: 0 }); // Relative to parent

    sceneGraph.updateTransforms();

    const worldChild = sceneGraph.getWorldTransform(child);
    // At 90 degrees, child (10, 0) should be at (0, 10) in world space
    expect(worldChild?.x).toBeCloseTo(0);
    expect(worldChild?.y).toBeCloseTo(10);
  });

  it("should propagate dirty flag to children", () => {
    const parent = 1;
    const child = 2;

    sceneGraph.addNode(parent);
    sceneGraph.addNode(child, parent);
    sceneGraph.updateTransforms(); // Clears all dirty flags

    sceneGraph.setLocalTransform(parent, { x: 200 }); // Parent is now dirty
    sceneGraph.updateTransforms();

    const worldChild = sceneGraph.getWorldTransform(child);
    expect(worldChild?.x).toBe(200); // Child should have updated despite not being dirty itself
  });

  it("should support reparenting", () => {
    const root1 = 1;
    const root2 = 2;
    const child = 3;

    sceneGraph.addNode(root1);
    sceneGraph.addNode(root2);
    sceneGraph.addNode(child, root1);

    sceneGraph.setLocalTransform(root1, { x: 100 });
    sceneGraph.setLocalTransform(root2, { x: 500 });
    sceneGraph.setLocalTransform(child, { x: 10 });

    sceneGraph.updateTransforms();
    expect(sceneGraph.getWorldTransform(child)?.x).toBe(110);

    sceneGraph.setParent(child, root2);
    sceneGraph.updateTransforms();
    expect(sceneGraph.getWorldTransform(child)?.x).toBe(510);
  });
});
