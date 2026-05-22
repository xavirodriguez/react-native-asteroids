# Known Issues - Retro Arcade MVP

This document tracks known limitations, non-critical bugs, and architectural constraints identified during the development of the Retro Arcade MVP.

## 🕹️ Gameplay & Engine

### 1. Mutator Clock Dependency
- **Issue**: The `MutatorService` relies on the client's system clock to determine the active weekly mutator.
- **Impact**: Players with incorrect system dates may see different mutators than others. In multiplayer, this could lead to non-deterministic behavior if one client applies mutators and the other doesn't.
- **Workaround**: Users are encouraged to keep their system time synchronized. A future fix will involve fetching authoritative time from the server.

### 2. Physics Tunneling (CCD)
- **Issue**: Very fast-moving entities (like bullets or high-speed ships) might pass through thin obstacles if the movement per frame exceeds the obstacle's width.
- **Impact**: Occasional missed collisions in Asteroids or Space Invaders.
- **Status**: Continuous Collision Detection (CCD) is implemented but may need further tuning for extreme speeds.

### 3. Audio Latency on Cold Start
- **Issue**: On some mobile devices and web browsers, the first time a sound is played, there might be a slight delay.
- **Impact**: Initial SFX might feel slightly out of sync.
- **Workaround**: `AssetLoader` preloads sounds, but platform power-saving modes sometimes defer the actual decoding.

## 🌐 Networking & Multiplayer

### 4. Deterministic Drift in Flappy/Space Invaders
- **Issue**: While Asteroids uses full state reconciliation, Flappy Bird and Space Invaders use a simplified entity tracking and interpolation system.
- **Impact**: Under extreme network conditions (high packet loss), these games might show "ghosting" or delayed destruction of entities compared to the server's authoritative state.
- **Note**: The networking logic was centralized into a generic `NetworkManager` to improve maintainability and extensibility.

### 5. Rate Limiting Persistence
- **Issue**: Server-side rate limiting for score submissions is currently in-memory.
- **Impact**: Restarting the server resets the rate limit counters.
- **Status**: Acceptable for MVP as scores are still validated via salted hashes.

## 📱 Platform Specifics

### 6. Web Performance (Skia)
- **Issue**: The Skia renderer on web requires WebAssembly (WASM) and may have higher initial load times.
- **Workaround**: The engine defaults to the standard Canvas renderer on web for better compatibility.

### 7. Android Haptics
- **Issue**: Haptic feedback intensity might vary significantly between different Android manufacturers.
- **Status**: Standardized patterns are used via `expo-haptics`.
