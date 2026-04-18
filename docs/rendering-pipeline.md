# Pipeline de Renderizado (Rendering Pipeline)

## Filosofía: Zero-Allocation y Snapshots
El sistema de renderizado de TinyAsterEngine está diseñado para ser completamente independiente de la simulación. Utiliza una arquitectura basada en **Snapshots** y buffers de comandos para garantizar que el renderizado no afecte el determinismo ni genere presión sobre el recolector de basura (GC).

## Componentes del Pipeline

### 1. RenderSnapshot
Cada frame, el renderer captura una "foto" del estado actual del mundo.
- **Doble Buffering**: Se utilizan dos objetos de snapshot (`snapshotA` y `snapshotB`) que se intercambian para evitar colisiones de lectura/escritura.
- **Interpolación Lineal (Lerp)**: Si el frame de renderizado ocurre entre dos ticks de simulación, el sistema interpola las posiciones entre `PreviousTransform` y `Transform` usando el factor `alpha`.

### 2. CommandBuffer
En lugar de dibujar directamente mientras itera por las entidades, el motor genera una lista de comandos abstractos (`DrawCommand`).
- **Abstracción**: Los sistemas de presentación no saben si están dibujando en Canvas o Skia.
- **Sorting**: Los comandos se ordenan por su `zIndex` antes de la ejecución.
- **Zero-Allocation**: Se utilizan pools de comandos pre-asignados para evitar instanciaciones en cada frame.
- **Firma del Comando**: Incluye posición interpolada, rotación, escala, color, tamaño y datos personalizados para el drawer.

### 3. Backends de Renderizado (Skia vs Canvas)
El motor abstrae el dibujo mediante la interfaz `Renderer<Context>`.

#### Skia (Native/GPU)
- **Implementación**: Utiliza `@shopify/react-native-skia`.
- **Ventajas**: Renderizado acelerado por hardware (GPU), soporte nativo para efectos complejos y filtros de imagen.
- **Uso**: Recomendado para dispositivos móviles reales.

#### Canvas (Web/2D)
- **Implementación**: Context2D estándar del navegador.
- **Ventajas**: Alta compatibilidad, sin dependencias nativas pesadas.
- **Uso**: Desarrollo rápido en navegador y despliegues web.

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
