import { BitmapFontDefinition } from "./FontRegistry";
import { TextMeasure } from "./TextMeasure";

export class TextRenderer {
  public static drawSystemText(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number, y: number,
    fontSize: number,
    color: string,
    fontFamily: string,
    align: "left" | "center" | "right",
    maxWidth?: number
  ): void {
    ctx.save();
    ctx.font = `${fontSize}px ${fontFamily}`;
    ctx.fillStyle = color;
    ctx.textAlign = align;
    ctx.textBaseline = "top";

    const metrics = TextMeasure.measureSystem(ctx, text, fontFamily, fontSize, maxWidth);

    let currentY = y;
    for (const line of metrics.lines) {
        ctx.fillText(line, x, currentY);
        currentY += fontSize * 1.2;
    }

    ctx.restore();
  }

  public static drawBitmapText(
    ctx: CanvasRenderingContext2D,
    text: string,
    font: BitmapFontDefinition,
    fontTexture: HTMLImageElement | ImageBitmap,
    x: number, y: number,
    fontSize: number,
    color: string,
    align: "left" | "center" | "right",
    maxWidth?: number
  ): void {
    const scale = fontSize / font.lineHeight;
    const metrics = TextMeasure.measureBitmap(text, font, fontSize, maxWidth);

    ctx.save();

    let currentY = y;
    for (const line of metrics.lines) {
        let currentX = x;
        if (align === "center") {
            let lineWidth = 0;
            for (const char of line) {
                const glyph = font.glyphs.get(char) || font.glyphs.get(" ");
                if (glyph) lineWidth += glyph.xAdvance * scale;
            }
            currentX -= lineWidth / 2;
        } else if (align === "right") {
            let lineWidth = 0;
            for (const char of line) {
                const glyph = font.glyphs.get(char) || font.glyphs.get(" ");
                if (glyph) lineWidth += glyph.xAdvance * scale;
            }
            currentX -= lineWidth;
        }

        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            const glyph = font.glyphs.get(char) || font.glyphs.get(" ");
            if (glyph) {
                ctx.drawImage(
                    fontTexture,
                    glyph.x, glyph.y, glyph.width, glyph.height,
                    currentX + glyph.xOffset * scale,
                    currentY + glyph.yOffset * scale,
                    glyph.width * scale,
                    glyph.height * scale
                );
                currentX += glyph.xAdvance * scale;
            }
        }
        currentY += font.lineHeight * scale;
    }

    ctx.restore();
  }
}
