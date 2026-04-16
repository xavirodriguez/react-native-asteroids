/**
 * @packageDocumentation
 * Font registration and management.
 * Handles both bitmap fonts and standard system fonts.
 */

/** Definition for a single character glyph in a bitmap font sheet. */
export interface BitmapFontGlyph {
  char: string;
  x: number;
  y: number;
  width: number;
  height: number;
  /** Horizontal offset for rendering the glyph relative to the cursor. */
  xOffset: number;
  /** Vertical offset for rendering the glyph relative to the baseline. */
  yOffset: number;
  /** How much to advance the cursor after rendering this glyph. */
  xAdvance: number;
}

/** Complete definition for a bitmap font, mapping characters to sheet regions. */
export interface BitmapFontDefinition {
  name: string;
  /** The asset key for the associated font texture. */
  textureKey: string;
  /** Default vertical distance between consecutive lines. */
  lineHeight: number;
  /** Baseline offset from the top. */
  base: number;
  /** Map of characters to their glyph data. */
  glyphs: Map<string, BitmapFontGlyph>;
  /** Optional kerning adjustments between character pairs. */
  kernings?: Map<string, number>;
}

/** Simple configuration for native system fonts. */
export interface SystemFontConfig {
    /** CSS-like font family name (e.g., "Arial", "monospace"). */
    family: string;
    /** Expected line height in pixels. */
    lineHeight: number;
}

/**
 * Registry singleton for font management.
 *
 * @remarks
 * This class provides a centralized store for all available fonts in the engine.
 * It is pre-populated with default system fonts.
 *
 * @responsibility Store and retrieve bitmap and system font definitions.
 */
export class FontRegistry {
  private static instance: FontRegistry;
  private fonts: Map<string, BitmapFontDefinition> = new Map();
  private systemFonts: Map<string, SystemFontConfig> = new Map();
  private defaultFontName: string = "monospace";

  private constructor() {
      this.registerSystemFont("monospace", { family: "monospace", lineHeight: 20 });
      this.registerSystemFont("sans-serif", { family: "sans-serif", lineHeight: 22 });
      this.registerSystemFont("default", { family: "monospace", lineHeight: 20 });
  }

  /**
   * Gets the singleton instance.
   */
  public static getInstance(): FontRegistry {
    if (!FontRegistry.instance) {
      FontRegistry.instance = new FontRegistry();
    }
    return FontRegistry.instance;
  }

  /**
   * Registers a new bitmap font definition.
   */
  public register(definition: BitmapFontDefinition): void {
    this.fonts.set(definition.name, definition);
  }

  /**
   * Registers a new system font configuration.
   */
  public registerSystemFont(name: string, config: SystemFontConfig): void {
      this.systemFonts.set(name, config);
  }

  /**
   * Retrieves a bitmap font by its name.
   */
  public get(name: string): BitmapFontDefinition | undefined {
    return this.fonts.get(name);
  }

  /**
   * Retrieves a system font by its name.
   */
  public getSystemFont(name: string): SystemFontConfig | undefined {
      return this.systemFonts.get(name);
  }

  /**
   * Sets the default font to use when none is specified.
   */
  public setDefault(name: string): void {
    this.defaultFontName = name;
  }

  /**
   * Returns the name of the current default font.
   */
  public getDefaultName(): string {
    return this.defaultFontName;
  }
}
