import { useMemo } from "react";
import { World, ComponentRegistry, BlueprintRegistryMap, EventRegistry } from "@tiny-aster/core";

/**
 * Hook to provide a memoized ECS World instance.
 */
export function useWorld<
  TComponents extends ComponentRegistry = ComponentRegistry,
  TEvents extends EventRegistry = EventRegistry,
  TBlueprints extends BlueprintRegistryMap<TComponents> = BlueprintRegistryMap<TComponents>
>() {
  return useMemo(() => new World<TComponents, TEvents, TBlueprints>(), []);
}
