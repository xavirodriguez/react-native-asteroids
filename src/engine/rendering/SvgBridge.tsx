import React from "react";
import Svg, { Circle, Rect, Line, Polygon, Text as SvgText, G } from "react-native-svg";
import { DrawCommand, IRenderer } from "./IRenderer";

interface SvgBridgeProps {
  renderer: IRenderer;
  width: number;
  height: number;
}

/**
 * A component that translates IRenderer commands into React Native SVG elements.
 */
export const SvgBridge: React.FC<SvgBridgeProps> = ({ renderer, width, height }) => {
  const commands = renderer.getCommands();

  return (
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      {commands.map((cmd, i) => renderCommand(cmd, i))}
    </Svg>
  );
};

function renderCommand(cmd: DrawCommand, index: number): React.ReactNode {
  switch (cmd.type) {
    case "circle":
      return (
        <Circle
          key={index}
          cx={cmd.x}
          cy={cmd.y}
          r={cmd.radius}
          fill={cmd.fill ? cmd.color : "none"}
          stroke={cmd.fill ? "none" : cmd.color}
          strokeWidth={cmd.fill ? 0 : 1}
        />
      );
    case "rect":
      return (
        <Rect
          key={index}
          x={cmd.x}
          y={cmd.y}
          width={cmd.width}
          height={cmd.height}
          fill={cmd.fill ? cmd.color : "none"}
          stroke={cmd.fill ? "none" : cmd.color}
          strokeWidth={cmd.fill ? 0 : 1}
        />
      );
    case "line":
      return (
        <Line
          key={index}
          x1={cmd.x1}
          y1={cmd.y1}
          x2={cmd.x2}
          y2={cmd.y2}
          stroke={cmd.color}
          strokeWidth={cmd.width}
        />
      );
    case "polygon":
      const points = cmd.points.map(p => `${p.x},${p.y}`).join(" ");
      const transform = cmd.rotation ? `translate(${cmd.x}, ${cmd.y}) rotate(${(cmd.rotation * 180) / Math.PI})` : `translate(${cmd.x}, ${cmd.y})`;
      return (
        <G key={index} transform={transform}>
          <Polygon
            points={points}
            fill={cmd.fill ? cmd.color : "none"}
            stroke={cmd.fill ? "none" : cmd.color}
            strokeWidth={cmd.fill ? 0 : 1}
          />
        </G>
      );
    case "text":
      return (
        <SvgText
          key={index}
          x={cmd.x}
          y={cmd.y}
          fill={cmd.color}
          fontSize={cmd.fontSize}
          fontFamily="monospace"
        >
          {cmd.text}
        </SvgText>
      );
    default:
      return null;
  }
}
