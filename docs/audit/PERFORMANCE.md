# Performance Audit - Tiny Aster Engine

## Rendering Jitter due to JS Thread Load
## Severidad
High
## Categoría
Performance
## Ubicación
`src/components/CanvasRenderer.tsx` (implementaciones de renderizado)
## Descripción
El renderizado se realiza en el hilo de JS. Si hay lógica pesada de ECS o de React (re-renders), el framerate bajará y se producirán tirones (jitter).
## Evidencia
El uso de `CanvasRenderer` integrado en el ciclo de React.
## Consecuencias
Experiencia de juego pobre, especialmente en dispositivos de gama baja.
## Solución propuesta
Mover la lógica de renderizado a un hilo dedicado (usando Skia `onDraw` optimizado o `Worklets` de Reanimated) y separar la simulación del renderizado.
## Dificultad
Alta
## Prioridad
P1

---

## Heavy Asset Loading in Main Thread
## Severidad
Medium
## Categoría
Performance
## Ubicación
`packages/core/src/assets/AssetLoader.ts`
## Descripción
La carga de assets no parece estar paralelizada o gestionada fuera del flujo principal de forma eficiente.
## Evidencia
Referencia en `SUMMARY.md` sobre problemas de carga de assets.
## Consecuencias
Tiempos de carga prolongados y bloqueo de la UI durante la carga.
## Solución propuesta
Implementar un sistema de carga progresiva y cacheo agresivo.
## Dificultad
Media
## Prioridad
P2
