import React, { useEffect, useRef, useMemo } from "react";
import { View, StyleSheet, Dimensions, Platform } from "react-native";
import type { World } from "../src/engine/core/World";
import {
  type PositionComponent,
  type RenderComponent,
  type InputComponent,
  type HealthComponent,
  type TTLComponent,
  type ShipComponent,
  type GameStateComponent,
  GAME_CONFIG,
} from "../src/types/GameTypes";
import { drawStarField } from "../src/game/StarField";

interface CanvasRendererProps {
  world: World;
}

/**
 * Improvement 6: Bullet and fresh particle glow settings.
 */
const GLOW_CONFIG = {
  bullet: { color: "#ffffaa", blur: 12 },
  particle: { color: "#ffaa00", blur: 8 },
};

export const CanvasRenderer: React.FC<CanvasRendererProps> = ({ world }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const worldRef = useRef(world);
  worldRef.current = world;

  useEffect(() => {
    if (Platform.OS !== "web") return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;

    const render = () => {
      draw(ctx, worldRef.current);
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  // Support for mobile using a fallback or simply letting the web view render if applicable
  // In a real Expo project, we might use expo-2d-context or similar for native canvas.
  // For this task, we assume web-first or standard Canvas API availability.

  return (
    <View style={styles.container}>
      {Platform.OS === "web" ? (
      <canvas
        ref={canvasRef}
        width={GAME_CONFIG.SCREEN_WIDTH}
        height={GAME_CONFIG.SCREEN_HEIGHT}
        style={{
          width: GAME_CONFIG.SCREEN_WIDTH,
          height: GAME_CONFIG.SCREEN_HEIGHT,
        }}
      />
      ) : (
        <View style={{ width: GAME_CONFIG.SCREEN_WIDTH, height: GAME_CONFIG.SCREEN_HEIGHT, backgroundColor: 'black' }} />
      )}
    </View>
  );
};

function draw(ctx: CanvasRenderingContext2D, world: World) {
  const { SCREEN_WIDTH, SCREEN_HEIGHT } = GAME_CONFIG;

  // Clear background
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);

  const gameStateEntity = world.query("GameState")[0];
  const gameState = gameStateEntity
    ? world.getComponent<GameStateComponent>(gameStateEntity, "GameState")
    : null;

  // Improvement 4: Screen Shake
  let shakeX = 0;
  let shakeY = 0;
  if (gameState?.screenShake && gameState.screenShake.duration > 0) {
    shakeX = (Math.random() - 0.5) * gameState.screenShake.intensity;
    shakeY = (Math.random() - 0.5) * gameState.screenShake.intensity;
  }

  ctx.save();
  ctx.translate(shakeX, shakeY);

  // Improvement 3: Starfield
  if (gameState?.stars) {
    const shipEntity = world.query("Ship", "Position")[0];
    const shipPos = shipEntity
      ? world.getComponent<PositionComponent>(shipEntity, "Position")
      : { x: SCREEN_WIDTH / 2, y: SCREEN_HEIGHT / 2 };

    if (shipPos) drawStarField(ctx, gameState.stars, shipPos);
  }

  // Render Entities
  const entities = world.query("Position", "Render");
  entities.forEach((entity) => {
    const pos = world.getComponent<PositionComponent>(entity, "Position");
    const render = world.getComponent<RenderComponent>(entity, "Render");
    if (!pos || !render) return;

    drawEntity(ctx, world, entity, pos, render);
  });

  ctx.restore();

  // Improvement 10: CRT Effect (Scanlines and Vignette)
  if (gameState?.debugCRT) {
    drawCRTEffect(ctx);
  }
}

function drawEntity(
  ctx: CanvasRenderingContext2D,
  world: World,
  entity: number,
  pos: PositionComponent,
  render: RenderComponent
) {
  ctx.save();
  ctx.translate(pos.x, pos.y);
  ctx.rotate(render.rotation);

  // Improvement 9: Hit Flash
  if (render.hitFlashFrames && render.hitFlashFrames > 0) {
    ctx.shadowBlur = 0;
    ctx.globalCompositeOperation = "lighter";
    // We'll draw the shape in white later
  }

  // Improvement 6: Glow for bullets and fresh particles
  const isBullet = world.hasComponent(entity, "Bullet");
  const isParticle = render.shape === "particle";
  const ttl = world.getComponent<TTLComponent>(entity, "TTL");

  if (isBullet) {
    ctx.shadowColor = GLOW_CONFIG.bullet.color;
    ctx.shadowBlur = GLOW_CONFIG.bullet.blur;
  } else if (isParticle && ttl && (ttl.remaining / ttl.total) > 0.7) {
    ctx.shadowColor = GLOW_CONFIG.particle.color;
    ctx.shadowBlur = GLOW_CONFIG.particle.blur;
  }

  // Render shapes
  switch (render.shape) {
    case "triangle":
      drawShip(ctx, world, entity, render);
      break;
    case "polygon":
      drawPolygon(ctx, render);
      break;
    case "circle":
      drawCircle(ctx, render);
      break;
    case "particle":
      drawParticle(ctx, world, entity, render);
      break;
    case "line":
      drawLine(ctx, render);
      break;
    case "ufo":
      drawUfo(ctx, render);
      break;
    case "flash":
      drawFlash(ctx, world, entity, render);
      break;
  }

  ctx.restore();

  // Improvement 2: Ship Trail (Cyan)
  if (world.hasComponent(entity, "Ship") && render.trailPositions) {
    drawShipTrail(ctx, render.trailPositions, render.size);
  }
}

function drawShip(ctx: CanvasRenderingContext2D, world: World, entity: number, render: RenderComponent) {
  const size = render.size;
  const input = world.getComponent<InputComponent>(entity, "Input");
  const health = world.getComponent<HealthComponent>(entity, "Health");

  // Invulnerability blink
  if (health && health.invulnerableRemaining > 0) {
    if (Math.floor(Date.now() / 150) % 2 === 0) ctx.globalAlpha = 0.3;
  }

  // Improvement 8: Thrust Propulsion Flame
  if (input?.thrust) {
    const gradient = ctx.createLinearGradient(-size / 2, 0, -size * 1.5, 0);
    gradient.addColorStop(0, "orange");
    gradient.addColorStop(0.5, "yellow");
    gradient.addColorStop(1, "transparent");

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(-size / 2, size / 3);
    const flameLen = size * (1.2 + Math.random() * 0.3);
    ctx.lineTo(-flameLen, 0);
    ctx.lineTo(-size / 2, -size / 3);
    ctx.fill();
  }

  ctx.strokeStyle = render.color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(size, 0);
  ctx.lineTo(-size / 2, size / 2);
  ctx.lineTo(-size / 4, 0);
  ctx.lineTo(-size / 2, -size / 2);
  ctx.closePath();
  ctx.stroke();

  // Ship Details
  ctx.fillStyle = "red";
  ctx.fillRect(-size / 2, size / 6, size / 6, size / 8);
  ctx.fillRect(-size / 2, -size / 6 - size / 8, size / 6, size / 8);
}

function drawPolygon(ctx: CanvasRenderingContext2D, render: RenderComponent) {
  if (!render.vertices || render.vertices.length === 0) return;

  ctx.strokeStyle = render.color;
  ctx.lineWidth = 2;
  ctx.fillStyle = "#333";

  // Improvement 9: Hit Flash White Overlay
  if (render.hitFlashFrames && render.hitFlashFrames > 0) {
    ctx.strokeStyle = "white";
    ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
  }

  ctx.beginPath();
  ctx.moveTo(render.vertices[0].x, render.vertices[0].y);
  for (let i = 1; i < render.vertices.length; i++) {
    ctx.lineTo(render.vertices[i].x, render.vertices[i].y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  if (render.internalLines) {
    ctx.strokeStyle = "#222";
    ctx.lineWidth = 1;
    render.internalLines.forEach(line => {
      ctx.beginPath();
      ctx.moveTo(line.x1, line.y1);
      ctx.lineTo(line.x2, line.y2);
      ctx.stroke();
    });
  }
}

function drawCircle(ctx: CanvasRenderingContext2D, render: RenderComponent) {
  ctx.fillStyle = render.color;
  ctx.beginPath();
  ctx.arc(0, 0, render.size, 0, Math.PI * 2);
  ctx.fill();
}

function drawParticle(ctx: CanvasRenderingContext2D, world: World, entity: number, render: RenderComponent) {
  const ttl = world.getComponent<TTLComponent>(entity, "TTL");
  if (!ttl) return;

  // Improvement 1: Particle fade + dynamic color + shrink
  const lifeRatio = ttl.remaining / ttl.total;
  ctx.globalAlpha = lifeRatio;

  const hueVariation = (entity % 10) - 5;
  const hue = 20 + hueVariation;
  const lightness = 50 + (1 - lifeRatio) * 50;
  ctx.fillStyle = `hsl(${hue}, 100%, ${lightness}%)`;

  const size = render.size * lifeRatio;
  ctx.beginPath();
  ctx.arc(0, 0, size, 0, Math.PI * 2);
  ctx.fill();
}

function drawLine(ctx: CanvasRenderingContext2D, render: RenderComponent) {
  ctx.strokeStyle = render.color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-render.size / 2, 0);
  ctx.lineTo(render.size / 2, 0);
  ctx.stroke();
}

function drawFlash(ctx: CanvasRenderingContext2D, world: World, entity: number, render: RenderComponent) {
  const ttl = world.getComponent<TTLComponent>(entity, "TTL");
  if (!ttl) return;

  const alpha = (ttl.remaining / ttl.total) * 0.5;
  ctx.globalAlpha = alpha;
  ctx.fillStyle = "white";

  // Flash is a large blurred circle
  ctx.shadowColor = "white";
  ctx.shadowBlur = 20;

  ctx.beginPath();
  ctx.arc(0, 0, render.size, 0, Math.PI * 2);
  ctx.fill();
}

function drawUfo(ctx: CanvasRenderingContext2D, render: RenderComponent) {
  const size = render.size;
  ctx.strokeStyle = render.color;
  ctx.lineWidth = 1;

  // Body
  ctx.fillStyle = "rgba(150, 150, 150, 0.5)";
  ctx.beginPath();
  ctx.ellipse(0, 0, size, size / 2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Dome
  ctx.fillStyle = "rgba(0, 255, 255, 0.6)";
  ctx.beginPath();
  ctx.ellipse(0, -size / 4, size / 2, size / 3, 0, 0, Math.PI * 2);
  ctx.fill();

  // Lights
  ctx.fillStyle = "yellow";
  ctx.beginPath(); ctx.arc(-size / 2, 0, 1.5, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(0, size / 6, 1.5, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(size / 2, 0, 1.5, 0, Math.PI * 2); ctx.fill();
}

function drawShipTrail(ctx: CanvasRenderingContext2D, trail: { x: number; y: number }[], shipSize: number) {
  // Improvement 2: Ship Trail (Cyan arcs)
  trail.forEach((p, i) => {
    const ratio = i / trail.length;
    ctx.globalAlpha = ratio * 0.4;
    ctx.fillStyle = "#00ffff";
    ctx.beginPath();
    ctx.arc(p.x, p.y, (shipSize / 3) * ratio, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1.0;
}

function drawCRTEffect(ctx: CanvasRenderingContext2D) {
  const { SCREEN_WIDTH, SCREEN_HEIGHT } = GAME_CONFIG;

  // Improvement 10: Scanlines
  ctx.fillStyle = "rgba(0, 0, 0, 0.1)";
  for (let y = 0; y < SCREEN_HEIGHT; y += 4) {
    ctx.fillRect(0, y, SCREEN_WIDTH, 1);
  }

  // Improvement 10: Vignette
  const gradient = ctx.createRadialGradient(
    SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2, SCREEN_WIDTH / 4,
    SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2, SCREEN_WIDTH / 1.2
  );
  gradient.addColorStop(0, "transparent");
  gradient.addColorStop(1, "rgba(0, 0, 0, 0.4)");

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "black",
    alignItems: "center",
    justifyContent: "center",
  },
});
