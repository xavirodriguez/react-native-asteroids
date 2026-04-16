/**
 * @packageDocumentation
 * Text measurement and word-wrap utilities.
 * Calculates bounding boxes for text before it is rendered.
 */

import { BitmapFontDefinition } from "./FontRegistry";

/** Result of a text measurement operation. */
export interface TextMetrics {
  /** Maximum width of the text block in pixels. */
  width: number;
  /** Total height of the text block in pixels. */
  height: number;
  /** Array of individual lines after word wrapping. */
  lines: string[];
}

/**
 * Utilities for measuring text dimensions for both system and bitmap fonts.
 *
 * @responsibility Calculate pixel dimensions of strings.
 * @responsibility Implement word-wrap logic based on a maximum width.
 */
export class TextMeasure {
  /**
   * Measures text using the standard Canvas 2D `measureText` API.
   *
   * @param ctx - Canvas 2D context (needed for measurement).
   * @param text - The string to measure.
   * @param fontFamily - CSS font family string.
   * @param fontSize - Font size in pixels.
   * @param maxWidth - Optional width for word wrapping.
   * @returns A {@link TextMetrics} object.
   */
  public static measureSystem(
    ctx: CanvasRenderingContext2D,
    text: string,
    fontFamily: string,
    fontSize: number,
    maxWidth?: number
  ): TextMetrics {
    ctx.save();
    ctx.font = `${fontSize}px ${fontFamily}`;

    let lines: string[] = [text];
    if (maxWidth) {
        lines = this.wordWrapSystem(ctx, text, maxWidth);
    }

    let width = 0;
    for (const line of lines) {
        width = Math.max(width, ctx.measureText(line).width);
    }

    const height = lines.length * fontSize * 1.2;

    ctx.restore();
    return { width, height, lines };
  }

  /**
   * Measures text using a bitmap font definition.
   *
   * @param text - The string to measure.
   * @param font - The {@link BitmapFontDefinition} to use.
   * @param fontSize - Desired font size in pixels (used for scaling).
   * @param maxWidth - Optional width for word wrapping.
   * @returns A {@link TextMetrics} object.
   */
  public static measureBitmap(
    text: string,
    font: BitmapFontDefinition,
    fontSize: number,
    maxWidth?: number
  ): TextMetrics {
    const scale = fontSize / font.lineHeight;
    let lines: string[] = [text];

    if (maxWidth) {
        lines = this.wordWrapBitmap(text, font, scale, maxWidth);
    }

    let maxWidthPx = 0;
    for (const line of lines) {
        let lineWidth = 0;
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            const glyph = font.glyphs.get(char) || font.glyphs.get(" ");
            if (glyph) {
                lineWidth += glyph.xAdvance * scale;
            }
        }
        maxWidthPx = Math.max(maxWidthPx, lineWidth);
    }

    return {
        width: maxWidthPx,
        height: lines.length * font.lineHeight * scale,
        lines
    };
  }

  /**
   * Greedy word wrap algorithm for system fonts.
   */
  private static wordWrapSystem(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
    const words = text.split(" ");
    const lines: string[] = [];
    let currentLine = words[0];

    for (let i = 1; i < words.length; i++) {
        const word = words[i];
        const width = ctx.measureText(currentLine + " " + word).width;
        if (width < maxWidth) {
            currentLine += " " + word;
        } else {
            lines.push(currentLine);
            currentLine = word;
        }
    }
    lines.push(currentLine);
    return lines;
  }

  /**
   * Greedy word wrap algorithm for bitmap fonts.
   */
  private static wordWrapBitmap(text: string, font: BitmapFontDefinition, scale: number, maxWidth: number): string[] {
    const words = text.split(" ");
    const lines: string[] = [];
    let currentLine = words[0];

    const getWidth = (t: string) => {
        let w = 0;
        for (const char of t) {
            const glyph = font.glyphs.get(char) || font.glyphs.get(" ");
            if (glyph) w += glyph.xAdvance * scale;
        }
        return w;
    };

    for (let i = 1; i < words.length; i++) {
        const word = words[i];
        if (getWidth(currentLine + " " + word) < maxWidth) {
            currentLine += " " + word;
        } else {
            lines.push(currentLine);
            currentLine = word;
        }
    }
    lines.push(currentLine);
    return lines;
  }
}
