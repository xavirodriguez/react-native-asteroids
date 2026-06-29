"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InterestManagerSystem = exports.BinaryCompression = exports.NetworkBudgetManager = exports.NetworkDeltaSystem = exports.ClientAckTracker = exports.ReplicationStateTracker = void 0;
class ReplicationStateTracker {
}
exports.ReplicationStateTracker = ReplicationStateTracker;
class ClientAckTracker {
    recordAck(sessionId, sequence, tick) { }
    nextSequence(sessionId) { return 0; }
    getLastAckedSequence(sessionId) { return 0; }
    getIdleTime(sessionId) { return 0; }
}
exports.ClientAckTracker = ClientAckTracker;
class NetworkDeltaSystem {
    constructor(tracker) { }
    generateDelta(world, sessionId, sequence, baselineAck, interestIds, forceFull) { return {}; }
}
exports.NetworkDeltaSystem = NetworkDeltaSystem;
class NetworkBudgetManager {
    prioritize(sessionId, interest, selfEntityId) { return interest; }
}
exports.NetworkBudgetManager = NetworkBudgetManager;
class BinaryCompression {
    static pack(packet) { return packet; }
    static unpack(packet) { return packet; }
}
exports.BinaryCompression = BinaryCompression;
const System_1 = require("../ecs/System");
class InterestManagerSystem extends System_1.System {
    update(world, deltaTime) { }
    onRegister(world) { }
    dispose() { }
}
exports.InterestManagerSystem = InterestManagerSystem;
