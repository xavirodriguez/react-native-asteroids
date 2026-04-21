# Pipeline de Renderizado y Snapshots

El motor utiliza una arquitectura de renderizado basada en **snapshots** e **interpolación**, lo que permite un movimiento suave independientemente de la tasa de simulación.

## Arquitectura de Snapshot

A diferencia de los motores tradicionales que dibujan directamente el estado actual del mundo, este motor:
1. **Captura**: Al final del frame, se crea un objeto `RenderSnapshot` que contiene solo los datos necesarios para dibujar (posición, color, forma, etc.).
2. **Desacopla**: El proceso de dibujo no tiene acceso al `World` (excepto para consultar recursos globales como paletas).
3. **Inmuta**: Los datos en el snapshot son inmutables durante el dibujo, evitando bugs por mutación de estado a mitad del renderizado.

## Interpolación Visual (Smoothing)

Para evitar el "efecto judder" cuando los FPS de renderizado no coinciden exactamente con los 60Hz de la simulación, el motor realiza una interpolación lineal (LERP):

- **Tick N**: Posición actual (`TransformComponent`).
- **Tick N-1**: Posición anterior (`PreviousTransformComponent`).
- **Factor Alpha**: El tiempo "sobrante" en el acumulador del loop.
- **Fórmula**: `RenderPos = Previous + (Current - Previous) * Alpha`.

Esto garantiza que incluso en monitores de 120Hz o 144Hz, el movimiento sea perfectamente fluido.

## Backends de Renderizado

El motor soporta múltiples backends mediante la interfaz `Renderer`:

### 1. CanvasRenderer (Web/Dev)
- Utiliza el API `CanvasRenderingContext2D`.
- Ideal para web y prototipado rápido.
- Implementa una estrategia de "Zero-Allocation" pre-asignando objetos en el snapshot para evitar picos de GC.

### 2. SkiaRenderer (Mobile/Production)
- Utiliza `@shopify/react-native-skia` para renderizado acelerado por hardware.
- backend preferido para Android e iOS.
- Paridad total de drawers con el backend de Canvas.

## Ciclo de Vida de un Drawer

Los renderizadores son extensibles mediante `ShapeDrawers`:
1. Se registra una función para una clave de forma (ej: "ship").
2. El sistema de captura identifica entidades con esa forma.
3. El renderer invoca el drawer con el contexto (Canvas o Skia) y los datos interpolados.

## Optimizaciones de Rendimiento

- **Z-Indexing**: Los comandos de dibujo se ordenan por `zIndex` antes de ejecutarse para garantizar la profundidad correcta.
- **Command Buffers**: Las instrucciones de dibujo se agrupan para minimizar cambios de estado en el contexto de renderizado.
- **Culling Básico**: Los sistemas de renderizado pueden ignorar entidades que están fuera de la cámara (viewport) para ahorrar ciclos de CPU/GPU.
