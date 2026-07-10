# Technical Debt Summary

## Current Status
The project has a solid foundation based on ECS and a clear separation of packages. However, there is significant technical debt in how the layers communicate and in the performance of the core engine.

## Critical Issues
1. **Architectural Leak**: React components are directly mutating the ECS world.
2. **Performance Bottlenecks**: Entity sorting and deep-cloning snapshots create high GC pressure.
3. **Type Safety Risks**: Widespread use of `any` and type assertions (`as`) bypasses compiler checks.

## Top 3 Priorities
1. **Decouple UI from ECS**: Introduce a command/input buffer between React and the engine.
2. **Optimize World Storage**: Use pre-sorted arrays or SoA for entity management.
3. **Strict Typing**: Enforce ESLint rules and refactor generics to eliminate `any`.

## Cross-References
- [ECS Design Details](./ECS.md)
- [Multiplayer & Serialization](./MULTIPLAYER.md)
- [React Integration Pitfalls](./REACT.md)
- [Roadmap](./TODO.md)
