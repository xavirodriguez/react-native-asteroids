# Pipeline de Renderizado (Rendering Pipeline)

## Filosofía: Zero-Allocation y Snapshots
El sistema de renderizado de TinyAsterEngine está diseñado para ser completamente independiente de la simulación. Utiliza una arquitectura basada en **Snapshots** y buffers de comandos para garantizar que el renderizado no afecte el determinismo ni genere presión sobre el recolector de basura (GC).

## Componentes del Pipeline

### 1. RenderSnapshot
Cada frame, el renderer captura una "foto" del estado actual del mundo.
- **Doble Buffering**: Se utilizan dos objetos de snapshot (`snapshotA` y `snapshotB`) que se intercambian para evitar colisiones de lectura/escritura.
- **Interpolación Lineal (Lerp)**: Si el frame de renderizado ocurre entre dos ticks de simulación, el sistema interpola las posiciones entre `PreviousTransform` y `Transform` usando el factor `alpha`.

### 2. CommandBuffer
En lugar de dibujar directamente mientras itera por las entidades, el motor genera una lista de comandos.
- **Pooling**: Los objetos de comando se reutilizan de un pool interno.
- **Sorting**: Permite ordenar todas las entidades por su `zIndex` de forma global antes de enviar los comandos al backend (Canvas/Skia).

### 3. Backends de Renderizado
El motor abstrae el dibujo mediante la interfaz `Renderer`.
- **CanvasRenderer**: Utilizado en Web, aprovecha la API de Context2D.
- **SkiaRenderer**: Utilizado en Native (Expo), aprovecha el rendimiento de GPU mediante Shopify Skia.
- **SVG**: Utilizado para renderizado estático o de baja frecuencia.

## Flujo de un Frame de Renderizado

1. **createSnapshot(world, alpha)**:
   - Itera sobre entidades con `Transform` y `Render`.
   - Calcula posiciones interpoladas.
   - Aplica Screen Shake si está activo.
   - Almacena datos en el snapshot actual.

2. **renderSnapshot(snapshot)**:
   - **Clear**: Limpia el buffer con el color de fondo.
   - **Background Effects**: Dibuja efectos globales (ej: Starfield).
   - **Command Generation**: Pobla el `CommandBuffer` a partir del snapshot.
   - **Sort**: Ordena los comandos por profundidad.
   - **Execute**: Itera los comandos y llama a los `ShapeDrawers` correspondientes.
   - **Foreground Effects**: Capas visuales superiores.
   - **UI Sync**: Renderiza la capa de React Native/Overlay.

## Extensibilidad: ShapeDrawers
Cualquier juego puede extender el motor registrando nuevos dibujadores:
```typescript
renderer.registerShape("ship", (ctx, entity, pos, render, world) => {
  // Lógica de dibujo específica del backend
});
```

## Riesgos y Optimización
- **[GC_PRESSURE]**: El snapshot pre-asigna espacio para 2000 entidades (`MAX_ENTITIES`). Exceder este límite causará que las entidades dejen de renderizarse.
- **[STALE_DATA]**: Si un sistema muta la posición local después de que el `HierarchySystem` ha corrido, el render mostrará la posición anterior del mundo (lag visual de 1 frame).
