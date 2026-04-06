import { SceneManager } from "../SceneManager";
import { Scene } from "../Scene";
import { World } from "../../core/World";
import { Renderer } from "../../rendering/Renderer";

// Mock Renderer
const mockRenderer = {
  clear: jest.fn(),
  render: jest.fn(),
  setSize: jest.fn(),
} as unknown as Renderer;

// Concrete Scene for testing
class TestScene extends Scene {
  public onEnterCalled = false;
  public onExitCalled = false;
  public updateCalled = false;
  public renderCalled = false;

  constructor(world: World) {
    super(world);
  }

  public onEnter() {
    this.onEnterCalled = true;
  }

  public onExit() {
    this.onExitCalled = true;
  }

  public update(deltaTime: number) {
    super.update(deltaTime);
    this.updateCalled = true;
  }

  public render(renderer: Renderer) {
    super.render(renderer);
    this.renderCalled = true;
  }
}

describe("SceneManager", () => {
  let world: World;
  let sceneManager: SceneManager;

  beforeEach(() => {
    world = new World();
    sceneManager = new SceneManager();
    jest.clearAllMocks();
  });

  it("should transition between scenes and trigger lifecycle hooks", async () => {
    const scene1 = new TestScene(world);
    const scene2 = new TestScene(world);

    await sceneManager.transitionTo(scene1);
    expect(sceneManager.getCurrentScene()).toBe(scene1);
    expect(scene1.onEnterCalled).toBe(true);

    await sceneManager.transitionTo(scene2);
    expect(scene1.onExitCalled).toBe(true);
    expect(scene2.onEnterCalled).toBe(true);
    expect(sceneManager.getCurrentScene()).toBe(scene2);
  });

  it("should delegate update and render to the current scene", async () => {
    const scene = new TestScene(world);
    await sceneManager.transitionTo(scene);

    sceneManager.update(16);
    expect(scene.updateCalled).toBe(true);

    sceneManager.render(mockRenderer);
    expect(scene.renderCalled).toBe(true);
    expect(mockRenderer.render).toHaveBeenCalledWith(world);
  });

  it("should not fail if update/render is called with no scene", () => {
    expect(() => sceneManager.update(16)).not.toThrow();
    expect(() => sceneManager.render(mockRenderer)).not.toThrow();
  });
});
