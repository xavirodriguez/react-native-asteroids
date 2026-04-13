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
export declare class FontRegistry {
    private static instance;
    private fonts;
    private systemFonts;
    private defaultFontName;
    private constructor();
    static getInstance(): FontRegistry;
    register(definition: BitmapFontDefinition): void;
    registerSystemFont(name: string, config: SystemFontConfig): void;
    get(name: string): BitmapFontDefinition | undefined;
    getSystemFont(name: string): SystemFontConfig | undefined;
    setDefault(name: string): void;
    getDefaultName(): string;
}
