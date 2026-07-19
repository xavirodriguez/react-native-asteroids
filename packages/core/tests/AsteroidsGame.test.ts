import { AsteroidsGame } from "../src/games/asteroids/AsteroidsGame";
import { WorldSnapshot } from "../src/snapshots/WorldSnapshot";
import { ServerUpdatePayload } from "../src/network/NetTypes";

describe("AsteroidsGame Network & Prediction Tests", () => {
  let game: AsteroidsGame;

  beforeEach(async () => {
    game = new AsteroidsGame({ headless: true, isMultiplayer: true });
    await game.init();
  });

  afterEach(() => {
    game.destroy();
  });

  it("should update player input and advance simulation during predictLocalPlayer", () => {
    // Create a local player entity
    const world = game.getWorld();
    const localPlayer = world.createEntity();
    world.addComponent(localPlayer, { type: "LocalPlayer" } as any);
    world.addComponent(localPlayer, {
      type: "Transform",
      x: 0,
      y: 0,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      worldX: 0,
      worldY: 0,
      worldRotation: 0,
      worldScaleX: 1,
      worldScaleY: 1,
      dirty: false
    } as any);
    world.addComponent(localPlayer, {
      type: "Input",
      rotateLeft: false,
      rotateRight: false,
      thrust: false,
      shoot: false,
      hyperspace: false,
      rotationAmount: 0
    } as any);

    // Call predictLocalPlayer with thrust action
    const inputFrame = {
      tick: 1,
      actions: ["thrust"],
      axes: { horizontal: 1.0 }
    };

    game.predictLocalPlayer(inputFrame, 0.016);

    // Verify player Input component is updated
    const inputComp = world.getComponent(localPlayer, "Input") as any;
    expect(inputComp.thrust).toBe(true);
    expect(inputComp.rotationAmount).toBe(1.0);
  });

  it("should process delta updates from server via handleDeltaServerUpdate", () => {
    const world = game.getWorld();
    const eventBus = world.getEventBus();
    const ackSpy = jest.fn();
    eventBus.on("net:ack_version" as any, ackSpy);

    const payload: ServerUpdatePayload = {
      kind: "delta",
      tick: 42,
      delta: {
        stateVersion: 100
      } as any
    };

    game.updateFromServer(payload, "my-session-id");

    // Event bus should emit ack version event
    expect(ackSpy).toHaveBeenCalledWith({ version: 100, tick: 42 }, "net:ack_version");
  });

  it("should process full updates from server via handleFullServerUpdate", () => {
    const payload: ServerUpdatePayload = {
      kind: "full",
      serverTick: 100,
      fullWorldState: {
        stateVersion: 200,
        entities: [],
        componentData: {},
        nextEntityId: 1,
        freeEntities: [],
        structureVersion: 0,
        seed: 123,
        tick: 100
      }
    };

    // Spy on processServerUpdate to verify it gets called
    const networkManager = (game as any).networkManager;
    const processSpy = jest.spyOn(networkManager, "processServerUpdate");

    game.updateFromServer(payload, "my-session-id");

    expect(processSpy).toHaveBeenCalledWith(100, payload.fullWorldState, "my-session-id");
    expect((game as any).lastProcessedFullStateVersion).toBe(200);
  });
});
