import { RenderSystem } from "../RenderSystem";
import { World } from "../../core/World";
import { SceneGraph } from "../../core/SceneGraph";
import { Renderer, RenderCommand } from "../RenderTypes";

describe("RenderSystem", () => {
  let world: World;
  let sceneGraph: SceneGraph;
  let mockRenderer: jest.Mocked<Renderer>;
  let renderSystem: RenderSystem;

  beforeEach(() => {
    world = new World();
    sceneGraph = new SceneGraph();
    mockRenderer = {
      beginFrame: jest.fn(),
      submit: jest.fn(),
      endFrame: jest.fn(),
    };
    renderSystem = new RenderSystem(mockRenderer, sceneGraph);
  });

  it("should generate sorted render commands", () => {
    const e1 = world.createEntity();
    const e2 = world.createEntity();

    world.addComponent(e1, {
      type: "Renderable",
      shape: "rect",
      zOrder: 10,
      visible: true,
      width: 10,
      height: 10,
      color: "red",
      textureId: null
    });

    world.addComponent(e2, {
      type: "Renderable",
      shape: "circle",
      zOrder: 5,
      visible: true,
      width: 5,
      height: 5,
      color: "blue",
      textureId: null
    });

    sceneGraph.addNode(e1);
    sceneGraph.addNode(e2);
    sceneGraph.updateTransforms();

    renderSystem.update(world, 0.5);

    expect(mockRenderer.beginFrame).toHaveBeenCalledWith(0.5);
    expect(mockRenderer.submit).toHaveBeenCalledTimes(2);

    const calls = mockRenderer.submit.mock.calls;
    // e2 has zOrder 5, e1 has zOrder 10. e2 should be first.
    expect(calls[0][0].entityId).toBe(e2);
    expect(calls[1][0].entityId).toBe(e1);

    expect(mockRenderer.endFrame).toHaveBeenCalled();
  });

  it("should skip invisible renderables", () => {
    const e1 = world.createEntity();
    world.addComponent(e1, {
      type: "Renderable",
      shape: "rect",
      zOrder: 0,
      visible: false,
      width: 10,
      height: 10,
      color: "red",
      textureId: null
    });

    sceneGraph.addNode(e1);
    sceneGraph.updateTransforms();

    renderSystem.update(world, 0);
    expect(mockRenderer.submit).not.toHaveBeenCalled();
  });
});
