export interface BitmapFontGlyph {
  char: string;
  x: number;
  y: number;
  width: number;
  height: number;
  xOffset: number;
  yOffset: number;
  xAdvance: number;
}

export interface BitmapFontDefinition {
  name: string;
  textureKey: string;
  lineHeight: number;
  base: number;
  glyphs: Map<string, BitmapFontGlyph>;
  kernings?: Map<string, number>;
}

export interface SystemFontConfig {
    family: string;
    lineHeight: number;
}

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

  public static getInstance(): FontRegistry {
    if (!FontRegistry.instance) {
      FontRegistry.instance = new FontRegistry();
    }
    return FontRegistry.instance;
  }

  public register(definition: BitmapFontDefinition): void {
    this.fonts.set(definition.name, definition);
  }

  public registerSystemFont(name: string, config: SystemFontConfig): void {
      this.systemFonts.set(name, config);
  }

  public get(name: string): BitmapFontDefinition | undefined {
    return this.fonts.get(name);
  }

  public getSystemFont(name: string): SystemFontConfig | undefined {
      return this.systemFonts.get(name);
  }

  public setDefault(name: string): void {
    this.defaultFontName = name;
  }

  public getDefaultName(): string {
    return this.defaultFontName;
  }
}
