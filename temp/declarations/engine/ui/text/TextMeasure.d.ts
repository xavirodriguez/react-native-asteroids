import { BitmapFontDefinition } from "./FontRegistry";
export interface TextMetrics {
    width: number;
    height: number;
    lines: string[];
}
export declare class TextMeasure {
    static measureSystem(ctx: CanvasRenderingContext2D, text: string, fontFamily: string, fontSize: number, maxWidth?: number): TextMetrics;
    static measureBitmap(text: string, font: BitmapFontDefinition, fontSize: number, maxWidth?: number): TextMetrics;
    private static wordWrapSystem;
    private static wordWrapBitmap;
}
