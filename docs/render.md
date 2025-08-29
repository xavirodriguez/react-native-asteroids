## Sistema de Renderizado

### Arquitectura de Renderizado

El sistema de renderizado implementa una separación clara entre la lógica de juego y la representación visual, utilizando React como capa de presentación sobre el motor ECS.

### GameRenderer Component

El componente `GameRenderer` (`components/GameRenderer.tsx`) actúa como puente entre el `World` ECS y la representación SVG:

```typescript
// Línea 7: Recibe el mundo como prop
interface GameRendererProps {
  world: World;
}

// Líneas 11-12: Query por entidades renderizables
const renderables = world.query("Position", "Render");
```

### Sistema de Consultas ECS

El renderizado utiliza el sistema de queries del ECS para obtener solo entidades con componentes `Position` y `Render`. La query se ejecuta en cada render de React (línea 11), filtrando automáticamente entidades sin representación visual.

### Transformaciones SVG

Cada entidad renderable se transforma mediante coordenadas SVG con el patrón:

```typescript
// Líneas 16-19: Cálculo de transformación
const transform = `translate(${pos.x}, ${pos.y}) rotate(${
  (render.rotation * 180) / Math.PI
})`;
```

**Nota importante**: La rotación se convierte de radianes (usado internamente) a grados (requerido por SVG) multiplicando por `180/π`.

### Tipos de Formas Renderizables

El sistema soporta 3 tipos de formas definidas en `RenderComponent.shape` (`src/types/GameTypes.ts` línea 19):

#### 1. Triangle (Nave del jugador)

```typescript
// Líneas 22-30: Polígono con 3 vértices
<polygon
  points={`${render.size},0 ${-render.size / 2},${-render.size / 2} ${
    -render.size / 2
  },${render.size / 2}`}
  stroke="#CCC" // Hardcodeado, ignora render.color
  transform={transform}
/>
```

**Bug identificado**: El color está hardcodeado como `"#CCC"` (línea 26) en lugar de usar `render.color`.

#### 2. Circle (Asteroides y balas)

```typescript
// Líneas 32-40: Círculo centrado
<circle
  cx={pos.x}
  cy={pos.y}
  r={render.size}
  stroke={render.color} // Usa el color correcto
/>
```

#### 3. Line (Sin uso actual)

```typescript
// Líneas 42-51: Línea horizontal
<line
  x1={pos.x - render.size / 2}
  x2={pos.x + render.size / 2}
  stroke={render.color}
  transform={transform}
/>
```

### Configuración del Viewport SVG

El SVG container está configurado con dimensiones fijas:

```typescript
// Líneas 57-62: Configuración del viewport
<svg
  width={GAME_CONFIG.SCREEN_WIDTH} // 800px
  height={GAME_CONFIG.SCREEN_HEIGHT} // 600px
  viewBox={`0 0 ${GAME_CONFIG.SCREEN_WIDTH} ${GAME_CONFIG.SCREEN_HEIGHT}`}
  className="border border-gray-800"
/>
```

### Mapeo de Entidades a Elementos

El renderizado utiliza un mapeo directo entidad→elemento:

```typescript
// Línea 65: Mapeo con key único por entidad
{
  renderables.map(renderEntity);
}

// Línea 14: Key generation
const key = `entity-${entity}`;
```

Esta estrategia garantiza que React pueda trackear cambios de entidades individuales, aunque puede causar re-renders innecesarios cuando las posiciones cambian.

### Integración con el Game Loop

El `GameRenderer` se re-ejecuta cada 16ms debido al `forceUpdate({})` en `App.tsx` línea 29. Esto significa:

1. **App timer (16ms)** → `forceUpdate()` → React re-render
2. **React re-render** → `GameRenderer` re-ejecuta → Nueva query al `World`
3. **Nueva query** → Renderizado de todas las entidades visibles

### Problemas de Performance Identificados

1. **Query en cada render**: `world.query()` se ejecuta en cada frame sin memoización
2. **Re-render completo**: Todas las entidades se re-renderizan aunque solo algunas cambien posición
3. **Falta de culling**: No hay eliminación de entidades fuera del viewport
4. **Transform calculations**: Los cálculos de `transform` se repiten en cada frame

### Estilos CSS Aplicados

El contenedor SVG recibe estilos Tailwind:

```typescript
// Línea 56: Styling del container
<div className="flex-1 bg-black">

// Línea 63: Border del juego
className="border border-gray-800"
```
