import { World } from "../ecs/World";
import { ComponentRegistry } from "../ecs/Component";
import { NetworkManager } from "./NetworkManager";
import { NullTransport } from "./NullTransport";
import { InputFrame, ServerUpdatePayload, DeltaSnapshotPayload, FullSnapshotPayload } from "./NetTypes";

/**
 * Handles replication, prediction, and server updates for games.
 * @public
 */
export class NetworkController<TComponents extends ComponentRegistry = ComponentRegistry> {
  public networkManager?: NetworkManager;
  public lastProcessedFullStateVersion = -1;
  public isMultiplayer = false;
  private world: World<TComponents, any, any>;
  private runSimStep: (deltaTime: number, isResimulating: boolean) => void;

  constructor(world: World<TComponents, any, any>, runSimStep?: (deltaTime: number, isResimulating: boolean) => void) {
    this.world = world;
    this.runSimStep = runSimStep ?? ((dt) => world.update(dt));
  }

  public setMultiplayerMode(active: boolean) {
    this.isMultiplayer = active;
    if (!active) {
      this.networkManager?.setTransport(new NullTransport());
    }
  }

  public applyInputToEntity(entityId: number, input: InputFrame) {
    if (!this.world.hasComponent(entityId, "Input" as any)) {
      this.world.addComponent(entityId, {
        type: "Input",
        rotateLeft: false,
        rotateRight: false,
        thrust: false,
        shoot: false,
        hyperspace: false,
        rotationAmount: 0
      } as any);
    }
    this.world.mutateComponent(entityId, "Input" as any, (inputComp: any) => {
      inputComp.rotateLeft = input.actions.includes("rotateLeft");
      inputComp.rotateRight = input.actions.includes("rotateRight");
      inputComp.thrust = input.actions.includes("thrust");
      inputComp.shoot = input.actions.includes("shoot");
      inputComp.hyperspace = input.actions.includes("hyperspace");
      inputComp.rotationAmount = input.axes?.horizontal ?? 0;
    });
  }

  public predictLocalPlayer(input: InputFrame, deltaTime: number) {
    const localPlayer = this.world.query("LocalPlayer" as any)[0];
    if (localPlayer !== undefined) {
      this.applyInputToEntity(localPlayer, input);
    }

    // Actual simulation step
    this.runSimulationStep(deltaTime, false);

    if (this.isMultiplayer && this.networkManager) {
      const strategy = this.networkManager.getStrategy();
      if (strategy.recordPrediction) {
        strategy.recordPrediction(input, this.world);
      }
    }
  }

  public runSimulationStep(deltaTime: number, isResimulating: boolean) {
    this.runSimStep(deltaTime, isResimulating);
  }

  public updateFromServer(payload: ServerUpdatePayload, localSessionId?: string) {
    if (!this.isMultiplayer || !payload || !this.networkManager) return;

    if (payload.kind === "delta") {
        this.handleDeltaServerUpdate(payload, localSessionId);
    } else if (payload.kind === "full") {
        this.handleFullServerUpdate(payload, localSessionId);
    }
  }

  private handleDeltaServerUpdate(payload: DeltaSnapshotPayload, localSessionId?: string) {
    const serverTick = payload.tick;
    const delta = payload.delta;

    if (!this.networkManager) return;

    this.networkManager.processServerUpdate(serverTick, delta as any, localSessionId);

    const eventBus = this.world.getEventBus();
    if (eventBus && (delta as any).stateVersion !== undefined) {
      eventBus.emit("net:ack_version" as any, { version: (delta as any).stateVersion, tick: serverTick } as any);
    }
  }

  private handleFullServerUpdate(payload: FullSnapshotPayload, localSessionId?: string) {
    if (!this.networkManager) return;
    const authoritativeSnapshot = payload.fullWorldState;

    if (authoritativeSnapshot.stateVersion === this.lastProcessedFullStateVersion) return;
    this.lastProcessedFullStateVersion = authoritativeSnapshot.stateVersion;

    const serverTick = payload.serverTick;
    this.networkManager.processServerUpdate(serverTick, authoritativeSnapshot, localSessionId);
  }
}
