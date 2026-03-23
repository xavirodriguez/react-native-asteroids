import React, { useMemo } from "react";
import { View, StyleSheet } from "react-native";
import { Canvas, Group, Circle, Path, Skia, Line, Rect, BlurMask, Oval } from "@shopify/react-native-skia";
import { RenderFrame, RenderableEntity } from "./RenderBridge";
import { GAME_CONFIG, RenderComponent } from "../../types/GameTypes";

interface SkiaRendererProps {
  frame: RenderFrame;
}

/**
 * Component responsible for rendering the game world using @shopify/react-native-skia.
 * Completely generic: renders based on shape and component properties only.
 */
export const SkiaRenderer: React.FC<SkiaRendererProps> = React.memo(({ frame }) => {
  const { entities, screenShake, stars } = frame;

  const shakeTransform = useMemo(() => {
    if (screenShake && screenShake.duration > 0) {
      const { intensity } = screenShake;
      const dx = (Math.random() - 0.5) * intensity;
      const dy = (Math.random() - 0.5) * intensity;
      return [{ translateX: dx }, { translateY: dy }];
    }
    return [];
  }, [screenShake]);

  return (
    <View style={styles.container}>
      <Canvas style={styles.canvas}>
        <Group transform={shakeTransform}>
          {stars && <StarfieldRenderer stars={stars} />}
          {entities.map((entity) => (
            <EntityRenderer key={entity.id} entity={entity} />
          ))}
        </Group>
      </Canvas>
    </View>
  );
});

const StarfieldRenderer: React.FC<{ stars: any[] }> = ({ stars }) => {
  return (
    <Group>
      {stars.map((star, index) => {
        return (
          <Circle
            key={index}
            cx={star.x}
            cy={star.y}
            r={star.size}
            color="white"
            opacity={star.brightness}
          />
        );
      })}
    </Group>
  );
};

const EntityRenderer: React.FC<{ entity: RenderableEntity }> = ({ entity }) => {
  const { pos, render } = entity;
  if (render.shape === "particle") return null;

  const transform = [
    { translateX: pos.x },
    { translateY: pos.y },
    { rotate: render.rotation },
  ];

  if (render.scale !== undefined) {
    transform.push({ scale: render.scale } as any);
  }

  return (
    <Group transform={transform} opacity={render.opacity ?? 1.0}>
      <ShapeRenderer render={render} />
    </Group>
  );
};

const ShapeRenderer: React.FC<{ render: RenderComponent }> = ({ render }) => {
  switch (render.shape) {
    case "triangle":
      return <TriangleShape render={render} />;
    case "circle":
      return <CircleShape render={render} />;
    case "polygon":
      return <PolygonShape render={render} />;
    case "line":
      return <LineShape render={render} />;
    case "ufo":
      return <UfoShape render={render} />;
    case "flash":
      return <FlashShape render={render} />;
    default:
      return null;
  }
};

const TriangleShape: React.FC<{ render: RenderComponent }> = ({ render }) => {
  const { size, color } = render;
  const path = useMemo(() => {
    const p = Skia.Path.Make();
    p.moveTo(size, 0);
    p.lineTo(-size / 2, size / 2);
    p.lineTo(-size / 4, 0);
    p.lineTo(-size / 2, -size / 2);
    p.close();
    return p;
  }, [size]);

  return (
    <Group>
      <Path path={path} color="#DDDDDD" />
      <Path path={path} color={color} style="stroke" strokeWidth={1} />
      <Rect x={-size / 2} y={size / 6} width={size / 6} height={size / 8} color="#FF0000" opacity={0.8} />
      <Rect x={-size / 2} y={-size / 6 - size / 8} width={size / 6} height={size / 8} color="#FF0000" opacity={0.8} />
    </Group>
  );
};

const CircleShape: React.FC<{ render: RenderComponent }> = ({ render }) => {
  return (
    <Group>
      <Circle cx={0} cy={0} r={render.size * 3} color="#FFFF00" opacity={0.3}>
        <BlurMask blur={4} style="normal" />
      </Circle>
      <Circle cx={0} cy={0} r={render.size} color="#FFFFFF" />
    </Group>
  );
};

const PolygonShape: React.FC<{ render: RenderComponent }> = ({ render }) => {
  const { vertices, color, internalLines } = render;
  const path = useMemo(() => {
    if (!vertices || vertices.length === 0) return Skia.Path.Make();
    const p = Skia.Path.Make();
    p.moveTo(vertices[0].x, vertices[0].y);
    vertices.slice(1).forEach(v => p.lineTo(v.x, v.y));
    p.close();
    return p;
  }, [vertices]);

  return (
    <Group>
      <Path path={path} color="#333" />
      <Path path={path} color={color} style="stroke" strokeWidth={2} />
      {internalLines?.map((line, i) => (
        <Line key={i} p1={{ x: line.x1, y: line.y1 }} p2={{ x: line.x2, y: line.y2 }} color="#222" strokeWidth={1} />
      ))}
    </Group>
  );
};

const LineShape: React.FC<{ render: RenderComponent }> = ({ render }) => {
  const halfSize = render.size / 2;
  return <Line p1={{ x: -halfSize, y: 0 }} p2={{ x: halfSize, y: 0 }} color={render.color} strokeWidth={2} />;
};

const UfoShape: React.FC<{ render: RenderComponent }> = ({ render }) => {
  const { size, color } = render;
  return (
    <Group>
      <Oval x={-size} y={-size / 2} width={size * 2} height={size} color="#999" />
      <Oval x={-size} y={-size / 2.5} width={size * 2} height={size / 1.25} color={color} style="stroke" strokeWidth={1} />
      <Circle cx={-size / 2} cy={0} r={1.5} color="yellow" />
      <Circle cx={0} cy={size / 6} r={1.5} color="yellow" />
      <Circle cx={size / 2} cy={0} r={1.5} color="yellow" />
    </Group>
  );
};

const FlashShape: React.FC<{ render: RenderComponent }> = ({ render }) => {
  return (
    <Circle cx={0} cy={0} r={render.size} color="white" opacity={0.5}>
      <BlurMask blur={20} style="normal" />
    </Circle>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "black" },
  canvas: { width: GAME_CONFIG.SCREEN_WIDTH, height: GAME_CONFIG.SCREEN_HEIGHT, backgroundColor: "black" },
});
