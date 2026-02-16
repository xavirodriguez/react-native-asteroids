## Sistema de Renderizado

### Arquitectura de Renderizado

El sistema de renderizado implementa una separación clara entre la lógica de juego y la representación visual, utilizando React y `react-native-svg` como capa de presentación sobre el motor ECS.

### GameRenderer Component

El componente `GameRenderer` (`components/GameRenderer.tsx`) actúa como puente entre el `World` ECS y la representación SVG nativa:

```typescript
// Propiedades del componente
interface GameRendererProps {
  world: World;
}

// Consulta de entidades renderizables
const renderables = world.query("Position", "Render");
```

### Sistema de Consultas ECS

El renderizado utiliza el sistema de queries del ECS para obtener solo entidades con componentes `Position` y `Render`. La query se ejecuta en cada ciclo de renderizado de React, filtrando automáticamente entidades sin representación visual.

### Transformaciones SVG Cross-Platform

Para garantizar la compatibilidad óptima entre plataformas (iOS, Android y Web) con `react-native-svg`, cada entidad renderable se posiciona y rota mediante la propiedad `transform` en lugar de coordenadas individuales:

```typescript
// Cálculo de transformación (Posición + Rotación)
const rotationDegrees = (render.rotation * 180) / Math.PI;
const transform = `translate(${pos.x}, ${pos.y}) rotate(${rotationDegrees})`;
```

**Nota importante**: La rotación se convierte de radianes (usado internamente por el motor físico) a grados (requerido por los componentes SVG) multiplicando por `180/π`.

### Componentes de Forma (Shapes)

El sistema utiliza componentes de `react-native-svg` definidos en `RenderComponent.shape` (`src/types/GameTypes.ts`):

#### 1. Triangle (Nave del jugador)

Representado mediante el componente `Polygon`. La nave incluye efectos visuales adicionales como propulsores y un núcleo pulsante:

```typescript
<Polygon
  points={`${render.size},0 ${-render.size / 2},${render.size / 2} ${-render.size / 4},0 ${-render.size / 2},${-render.size / 2}`}
  fill="#DDDDDD"
  stroke="#FFFFFF"
  strokeWidth="1"
/>
```

#### 2. Circle (Asteroides y balas)

Representado mediante el componente `Circle`. Para máxima compatibilidad, se utiliza `transform` para el posicionamiento:

```typescript
<Circle
  cx="0"
  cy="0"
  r={render.size}
  fill="#999"
  stroke={render.color}
  strokeWidth="2"
  transform={transform}
/>
```

#### 3. Line (Efectos o trazos)

Representado mediante el componente `Line`.

```typescript
<Line
  x1={-render.size / 2}
  y1={0}
  x2={render.size / 2}
  y2={0}
  stroke={render.color}
  strokeWidth="2"
  transform={transform}
/>
```

### Configuración del Viewport SVG

El contenedor SVG está configurado con dimensiones fijas y estilos definidos mediante `StyleSheet`:

```typescript
<Svg
  width={GAME_CONFIG.SCREEN_WIDTH}  // 800px
  height={GAME_CONFIG.SCREEN_HEIGHT} // 600px
  viewBox={`0 0 ${GAME_CONFIG.SCREEN_WIDTH} ${GAME_CONFIG.SCREEN_HEIGHT}`}
  style={styles.svg}
/>
```

### Integración con el ciclo de vida de React

El `GameRenderer` se re-ejecuta cada frame gracias a la suscripción en `App.tsx`. Aunque se realiza una nueva query en cada render, el uso de componentes nativos de `react-native-svg` permite un rendimiento fluido en dispositivos móviles.

### Análisis de Performance

1. **Uso de `transform`**: Centraliza el posicionamiento y la rotación en una sola propiedad optimizada para el motor de renderizado.
2. **Representación Declarativa**: Permite a React gestionar el ciclo de vida de los elementos visuales basándose en el estado del ECS.
3. **Escalabilidad**: El sistema soporta la adición de nuevas formas o efectos complejos (como el núcleo pulsante de la nave) de manera sencilla.

### Estilos Aplicados

Los estilos se gestionan mediante `StyleSheet` de React Native:

```typescript
const styles = StyleSheet.create({
  container: {
    backgroundColor: "black",
  },
  svg: {
    borderWidth: 1,
    borderColor: "#1F2937",
    backgroundColor: "black",
  },
});
```
