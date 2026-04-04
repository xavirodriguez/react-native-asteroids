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
    this.name = name;
  }

  public onEnter() {
    this.onEnterCalled = true;
  }

  public onExit() {
    this.onExitCalled = true;
  }

  public onUpdate(dt: number, world: World) {
    super.onUpdate(dt, world);
    this.updateCalled = true;
  }

  public onRender(alpha: number) {
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

    await sceneManager.push("Scene1");
    expect(sceneManager.current()).toBe(scene1);
    expect(scene1.onEnterCalled).toBe(true);

    await sceneManager.replace("Scene2");
    expect(scene1.onExitCalled).toBe(true);
    expect(scene2.onEnterCalled).toBe(true);
    expect(sceneManager.current()).toBe(scene2);
  });

  it("should support stacking scenes with push and pop", async () => {
    const scene1 = new TestScene(world, "Scene1");
    const scene2 = new TestScene(world, "Scene2");

    sceneManager.register(scene1);
    sceneManager.register(scene2);

    await sceneManager.push("Scene1");
    await sceneManager.push("Scene2");
    expect(sceneManager.current()).toBe(scene2);

    await sceneManager.pop();
    expect(sceneManager.current()).toBe(scene1);
    expect(scene2.onExitCalled).toBe(true);
  });

  it("should delegate update and render to the current scene", async () => {
    const scene = new TestScene(world, "Scene");
    sceneManager.register(scene);
    await sceneManager.push("Scene");

    sceneManager.update(16);
    expect(scene.updateCalled).toBe(true);

    sceneManager.render(0.5);
    expect(scene.renderCalled).toBe(true);
  });
});
