import { Platform } from "react-native";
import { World } from "../core/World";
import { Renderer } from "./Renderer";
import { Entity, PositionComponent, RenderComponent } from "../types/EngineTypes";

/**
 * Procedural Skia Renderer implementation.
 * Refactored to use a shape registry and effect hooks for extensibility.
 * Safe for Web by lazy-loading Skia.
 */
export class SkiaRenderer implements Renderer {
  public readonly type = "skia";
  private canvas: any = null;
  private width: number = 0;
  private height: number = 0;
  private paint: any = null;
  private shapeRegistry: Map<string, any> = new Map();
  private backgroundEffects: Map<string, any> = new Map();
  private foregroundEffects: Map<string, any> = new Map();

  constructor(canvas?: any) {
    if (canvas) {
      this.canvas = canvas;
    }

    if (Platform.OS !== "web") {
      try {
          const { Skia } = require("@shopify/react-native-skia");
          if (typeof Skia !== "undefined" && Skia.Paint) {
              this.paint = Skia.Paint();
          }
      } catch (e) {}
    }

    this.registerDefaultShapes();
  }

  private registerDefaultShapes(): void {
    if (Platform.OS === "web") return;
    try {
        const { Skia } = require("@shopify/react-native-skia");
        if (typeof Skia === "undefined" || !Skia.Color || !Skia.PaintStyle) return;

        this.registerShape("circle", (canvas: any, paint: any, render: any) => {
          paint.setColor(Skia.Color(render.color));
          paint.setStyle(Skia.PaintStyle.Fill);
          canvas.drawCircle(0, 0, render.size, paint);
        });

        this.registerShape("polygon", (canvas: any, paint: any, render: any) => {
          if (!render.vertices || render.vertices.length === 0) {
            paint.setColor(Skia.Color(render.color));
            paint.setStyle(Skia.PaintStyle.Fill);
            canvas.drawCircle(0, 0, render.size, paint);
            return;
          }

          if (!Skia.Path) return;
          const path = Skia.Path.Make();
          path.moveTo(render.vertices[0].x, render.vertices[0].y);
          for (let i = 1; i < render.vertices.length; i++) {
            path.lineTo(render.vertices[i].x, render.vertices[i].y);
          }
          path.close();

          const isHitFlash = render.hitFlashFrames && render.hitFlashFrames > 0;
          paint.setColor(isHitFlash ? Skia.Color("rgba(255, 255, 255, 0.5)") : Skia.Color("#333"));
          paint.setStyle(Skia.PaintStyle.Fill);
          canvas.drawPath(path, paint);

          paint.setColor(isHitFlash ? Skia.Color("white") : Skia.Color(render.color));
          paint.setStyle(Skia.PaintStyle.Stroke);
          paint.setStrokeWidth(2);
          canvas.drawPath(path, paint);
        });

        this.registerShape("line", (canvas: any, paint: any, render: any) => {
          paint.setColor(Skia.Color(render.color));
          paint.setStrokeWidth(2);
          canvas.drawLine(-render.size / 2, 0, render.size / 2, 0, paint);
        });
    } catch (e) {}
  }

  public registerShape(name: string, drawer: any): void {
    this.shapeRegistry.set(name, drawer);
  }

  public registerBackgroundEffect(name: string, effect: any): void {
    this.backgroundEffects.set(name, effect);
  }

  public registerForegroundEffect(name: string, effect: any): void {
    this.foregroundEffects.set(name, effect);
  }

  public setCanvas(canvas: any): void {
    this.canvas = canvas;
  }

  public setSize(width: number, height: number): void {
    this.width = width;
    this.height = height;
  }

  public clear(): void {
    if (Platform.OS === "web") return;
    try {
        const { Skia } = require("@shopify/react-native-skia");
        if (!this.canvas || typeof Skia === "undefined" || !Skia.Color) return;
        this.canvas.clear(Skia.Color("black"));
    } catch (e) {}
  }

  public render(world: World): void {
    if (Platform.OS === "web") return;
    try {
        const { Skia } = require("@shopify/react-native-skia");
        if (!this.canvas || typeof Skia === "undefined") return;
        const canvas = this.canvas;

        this.clear();

        this.backgroundEffects.forEach(effect => effect(canvas, world, this.width, this.height));

        canvas.save();

        const entities = world.query("Position", "Render");
        entities.forEach((entity) => {
          const pos = world.getComponent<PositionComponent>(entity, "Position")!;
          const render = world.getComponent<RenderComponent>(entity, "Render")!;
          if (render) {
            this.drawEntity(entity, { Position: pos, Render: render }, world);
          }
        });

        canvas.restore();

        this.foregroundEffects.forEach((effect: any) => effect(canvas, world, this.width, this.height));
    } catch (e) {}
  }

  public drawEntity(entity: Entity, components: Record<string, any>, world: World): void {
    if (!this.canvas) return;
    const canvas = this.canvas;
    const pos = components["Position"] as PositionComponent;
    const render = components["Render"] as RenderComponent;

    if (!pos || !render) return;

    canvas.save();
    canvas.translate(pos.x, pos.y);
    canvas.rotate((render.rotation * 180) / Math.PI, 0, 0);

    const drawer = this.shapeRegistry.get(render.shape);
    if (drawer) {
      drawer(canvas, entity, pos, render, world);
    }

    canvas.restore();
  }

}
