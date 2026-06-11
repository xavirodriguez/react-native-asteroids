import { BitmapFontDefinition } from "./FontRegistry";

export interface TextMetrics {
  width: number;
  height: number;
  lines: string[];
}

export class TextMeasure {
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
