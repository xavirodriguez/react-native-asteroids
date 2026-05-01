/**
 * Visual styling service that manages color themes (palettes).
 *
 * This module defines the color structure used across the engine to maintain
 * visual consistency. Systems like `PaletteSystem` use these definitions
 * to skin entities based on their tags (e.g., Player, Enemy, UI).
 *
 * @packageDocumentation
 */

/**
 * Defines a set of harmonized colors for the game engine.
 */
export interface Palette {
  /** Main color used for primary actors, player, and key UI elements. */
  primary: string;
  /** Secondary color used for backgrounds, particles, or less prominent actors. */
  secondary: string;
  /** High-contrast color used for highlights, power-ups, or critical warnings. */
  accent: string;
}

/**
 * Registry of available color themes.
 *
 * @remarks
 * New palettes should be added here to be automatically available in the Profile settings.
 * The `palette_default` key must always exist as a fallback.
 */
export const PALETTES: Record<string, Palette> = {
  palette_default:        { primary: '#FFFFFF', secondary: '#888888', accent: '#FFFF00' },
  palette_amber_crt:      { primary: '#FFB000', secondary: '#7A5000', accent: '#FFF0A0' },
  palette_gameboy:        { primary: '#8BAC0F', secondary: '#306230', accent: '#E0F8D0' },
  palette_neon_green:     { primary: '#39FF14', secondary: '#003300', accent: '#CCFFCC' },
  palette_cosmic_purple:  { primary: '#BF5FFF', secondary: '#4B0082', accent: '#E8CCFF' },
};
