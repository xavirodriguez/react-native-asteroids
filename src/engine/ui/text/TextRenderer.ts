/**
 * @packageDocumentation
 * Text rendering pipeline.
 * Dispatches drawing calls for both system and bitmap fonts to the Canvas context.
 */

import { BitmapFontDefinition } from "./FontRegistry";
import { TextMeasure } from "./TextMeasure";

/**
 * Utilities for rendering text in Canvas 2D.
 *
 * @responsibility Abstract standard and bitmap text drawing operations.
 * @responsibility Handle text alignment and multi-line rendering.
 */
export class TextRenderer {
  /**
   * Draws text using native browser/system fonts.
   *
   * @param ctx - Canvas 2D rendering context.
   * @param text - The string to render.
   * @param x - Anchor X coordinate.
   * @param y - Anchor Y coordinate.
   * @param fontSize - Size in pixels.
   * @param color - Text fill color.
   * @param fontFamily - CSS font family.
   * @param align - Horizontal alignment relative to (x, y).
   * @param maxWidth - Optional width for wrapping.
   *
   * @sideEffect Mutates context state and draws glyphs.
   */
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

  /**
   * Draws text by copying glyphs from a bitmap font texture.
   *
   * @param ctx - Canvas 2D rendering context.
   * @param text - The string to render.
   * @param font - The font definition metadata.
   * @param fontTexture - The image containing the glyph sheet.
   * @param x - Anchor X coordinate.
   * @param y - Anchor Y coordinate.
   * @param fontSize - Desired font size (scales the bitmap glyphs).
   * @param _color - Optional color overlay (requires context globalCompositeOperation tricks).
   * @param align - Horizontal alignment relative to (x, y).
   * @param maxWidth - Optional width for wrapping.
   *
   * @remarks
   * Currently, the standard `drawImage` does not support direct coloring. Tinting would require
   * an offscreen buffer or a specific shader in a WebGL renderer.
   */
  public static drawBitmapText(
    ctx: CanvasRenderingContext2D,
    text: string,
    font: BitmapFontDefinition,
    fontTexture: HTMLImageElement | ImageBitmap,
    x: number, y: number,
    fontSize: number,
    _color: string,
    align: "left" | "center" | "right",
    maxWidth?: number
  ): void {
    const scale = fontSize / font.lineHeight;
    const metrics = TextMeasure.measureBitmap(text, font, fontSize, maxWidth);

    ctx.save();

    let currentY = y;
    for (const line of metrics.lines) {
        let currentX = x;

        // Manual alignment calculation for bitmap fonts
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

        // Draw individual characters
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
