import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Merges multiple Tailwind CSS class names into a single string.
 *
 * @param inputs - A variable number of class values (strings, arrays, or objects).
 * @returns A single string containing the merged and deduplicated class names.
 *
 * @remarks
 * This utility combines `clsx` for conditional class joining and `tailwind-merge`
 * to handle Tailwind-specific class conflicts (e.g., `px-2 px-4` becomes `px-4`).
 *
 * @example
 * ```typescript
 * const className = cn("px-2", isTrue && "bg-red-500", "px-4");
 * // result: "bg-red-500 px-4"
 * ```
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
