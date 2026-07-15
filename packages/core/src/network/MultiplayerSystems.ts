import { Packr } from "msgpackr";

const packr = new Packr({
    useRecords: false,
    structuredClone: true
});

export class ReplicationStateTracker {}
export class ClientAckTracker {
    public recordAck(sessionId: string, sequence: number, tick: number): void {}
    public nextSequence(sessionId: string): number { return 0; }
    public getLastAckedSequence(sessionId: string): number { return 0; }
    public getIdleTime(sessionId: string): number { return 0; }
}
export class NetworkDeltaSystem {
    constructor(tracker: ReplicationStateTracker) {}
    public generateDelta(world: any, sessionId: string, sequence: number, baselineAck: number, interestIds: Set<number>, forceFull: boolean): any { return {}; }
}
export class NetworkBudgetManager {
    public prioritize(sessionId: string, interest: any[], selfEntityId?: string): any[] { return interest; }
}
export class BinaryCompression {
    public static pack(packet: any): Uint8Array {
        return packr.pack(packet);
    }
    public static unpack<T = any>(packet: Uint8Array | ArrayBuffer | Buffer): T {
        const buf = packet instanceof Uint8Array ? packet : new Uint8Array(packet);
        return packr.unpack(buf) as T;
    }
}

import { System } from "../ecs/System";

export class InterestManagerSystem extends System<any, any> {
    public update(world: any, deltaTime: number): void {}
    public override onRegister(world: any): void {}
    public override dispose(): void {}
}
