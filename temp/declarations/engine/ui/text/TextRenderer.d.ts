import { BitmapFontDefinition } from "./FontRegistry";
export declare class TextRenderer {
    static drawSystemText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, fontSize: number, color: string, fontFamily: string, align: "left" | "center" | "right", maxWidth?: number): void;
    static drawBitmapText(ctx: CanvasRenderingContext2D, text: string, font: BitmapFontDefinition, fontTexture: HTMLImageElement | ImageBitmap, x: number, y: number, fontSize: number, color: string, align: "left" | "center" | "right", maxWidth?: number): void;
}
