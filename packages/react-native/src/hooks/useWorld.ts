import { useMemo } from "react";
import { World, ComponentRegistry, BlueprintRegistryMap } from "@tiny-aster/core";

/**
 * Hook to provide a memoized ECS World instance.
 */
export function useWorld<
  TComponents extends ComponentRegistry = ComponentRegistry,
  TBlueprints extends BlueprintRegistryMap<TComponents> = BlueprintRegistryMap<TComponents>
>() {
  return useMemo(() => new World<TComponents, any, TBlueprints>(), []);
}
