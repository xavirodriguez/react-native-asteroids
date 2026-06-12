import { EntityPayload, DeltaPacket } from "./ReplicationTypes";

export interface ReplicationSchema {
    componentType: string;
    reliable: boolean;
    sendRate: number;
    importance: 'critical' | 'high' | 'medium' | 'low';
}

export interface INetworkGame {
    updateFromServer(serverState: Record<string, unknown>, localSessionId?: string): void;
    predictLocalPlayer(input: any, deltaTime: number): void;
    applyInputToEntity(entityId: number, input: any): void;
}

export { EntityPayload, DeltaPacket };
