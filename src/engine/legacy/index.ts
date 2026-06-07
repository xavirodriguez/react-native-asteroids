/**
 * @packageDocumentation
 * Legacy types and utilities for backward compatibility.
 *
 * @warning These exports are considered deprecated and may be removed in future versions.
 * New code should use the modern equivalents in the core modules.
 */

import { AnyCoreComponent as ModernAnyCoreComponent, ComponentOf as ModernComponentOf } from "@tiny-aster/core";

/** @deprecated Use core components directly. */
export type AnyCoreComponent = ModernAnyCoreComponent;
/** @deprecated Use core components directly. */
export type ComponentOf<T extends string> = ModernComponentOf<T extends ModernAnyCoreComponent["type"] ? T : never>;
