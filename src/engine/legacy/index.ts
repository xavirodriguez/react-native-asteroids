import { AnyCoreComponent as ModernAnyCoreComponent, ComponentOf as ModernComponentOf } from "../core/CoreComponents";

// Legacy types for backward compatibility during transition
export type AnyCoreComponent = ModernAnyCoreComponent;
export type ComponentOf<T extends string> = ModernComponentOf<T extends ModernAnyCoreComponent["type"] ? T : never>;
