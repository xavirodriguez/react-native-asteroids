import { SceneManager } from "../SceneManager";
import { Scene } from "../Scene";
import { World } from "../../core/World";

// Concrete Scene for testing
class TestScene extends Scene {
  public onEnterCalled = false;
  public onExitCalled = false;
  public updateCalled = false;
  public renderCalled = false;

  constructor(world: World, name: string) {
    super(world);
    (this as any).name = name;
  }

  public onEnter() {
    this.onEnterCalled = true;
  }

  public onExit() {
    this.onExitCalled = true;
  }

  public update(dt: number) {
    this.world.update(dt);
    this.updateCalled = true;
  }

  public render(renderer: any) {
    renderer.render(this.world);
    this.renderCalled = true;
  }
}

describe("SceneManager", () => {
  let world: World;
  let sceneManager: SceneManager;

  beforeEach(() => {
    world = new World();
    sceneManager = new SceneManager();
  });

  it("should transition between scenes and trigger lifecycle hooks", async () => {
    const scene1 = new TestScene(world, "Scene1");
    const scene2 = new TestScene(world, "Scene2");

    sceneManager.register(scene1);
    sceneManager.register(scene2);

    await sceneManager.transitionTo(scene1);
    expect(sceneManager.getCurrentScene()).toBe(scene1);
    expect(scene1.onEnterCalled).toBe(true);

    await sceneManager.transitionTo(scene2);
    expect(scene1.onExitCalled).toBe(true);
    expect(scene2.onEnterCalled).toBe(true);
    expect(sceneManager.getCurrentScene()).toBe(scene2);
  });

  it("should support stacking scenes with push and pop", async () => {
    const scene1 = new TestScene(world, "Scene1");
    const scene2 = new TestScene(world, "Scene2");

    sceneManager.register(scene1);
    sceneManager.register(scene2);

    sceneManager.push(scene1);
    sceneManager.push(scene2);
    expect(sceneManager.getCurrentScene()).toBe(scene2);

    sceneManager.pop();
    expect(sceneManager.getCurrentScene()).toBe(scene1);
    expect(scene2.onExitCalled).toBe(true);
  });

  it("should delegate update and render to the current scene", async () => {
    const scene = new TestScene(world, "Scene");
    const mockRenderer = { render: jest.fn() };
    sceneManager.register(scene);
    sceneManager.push(scene);

    sceneManager.update(16);
    expect(scene.updateCalled).toBe(true);

    sceneManager.render(mockRenderer);
    expect(scene.renderCalled).toBe(true);
    expect(mockRenderer.render).toHaveBeenCalledWith(world);
  });
});
