# Network Architecture and Synchronization

TinyAsterEngine is designed to support a **server-authoritative model with client-side prediction and reconciliation (rollback)**.

## 📡 Communication Pipeline

The synchronization flow is designed to help mitigate latency and maintain consistency under controlled network conditions:

1.  **Input Capture**: The client records player actions and attempts to transmit them to the server associated with a local `tick`.
2.  **Local Prediction**: The client applies the input to its local simulation, intended to provide immediate visual feedback.
3.  **Authoritative Simulation**: The server acts as the primary source of truth, designed to validate inputs and execute authoritative game logic.
4.  **Delta Replication**: The server aims to optimize bandwidth by primarily sending detected changes (deltas) in component states.
5.  **Reconciliation (Rollback)**: In case of a detected discrepancy between predicted and authoritative state, the client aims to restore the server state and re-simulate local ticks up to the current time.

## 🗜️ Optimization Strategies

To manage multiple entities, the engine includes mechanisms designed to help reduce network load:

### 1. Interest Management
Uses spatial partitioning techniques (such as `SpatialGrid`) to help determine entity relevance for each player. This aims to limit data transmission to what is potentially visible or interactable.

### 2. Delta Compression
Instead of transmitting the full world state, the system attempts to use component versioning (`stateVersion`) to send only data that has mutated since the last acknowledged message.

### 3. Quantization
Floating-point values (positions, rotations) are quantized to fixed-precision integers before transmission to help reduce data size.

### 4. Binary Serialization (MessagePack)
Uses `BinaryCompression` to pack objects into a compact binary format, aiming to reduce the overhead of repetitive JSON keys.

## ⚠️ Conceptual Risks

*   **[ROLLBACK_SYNC]**: If the client state history is too short, excessive lag may prevent accurate reconciliation.
*   **[BINARY_COMPATIBILITY]**: Changes in component schemas typically require synchronized updates between client and server to help ensure correct deserialization.
*   **[TICK_DRIFT]**: Clock drift between clients and server may cause inputs to arrive "in the future" or far "in the past" of the server, potentially affecting simulation consistency.
