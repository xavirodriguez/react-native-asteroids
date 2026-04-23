# Resumen de Revisión Técnico-Editorial - TinyAsterEngine

## 1. Archivos Modificados
Se ha realizado una pasada exhaustiva por la superficie pública e interna del motor (`src/engine`), modificando los siguientes archivos clave:

- **Core ECS**: `World.ts`, `GameLoop.ts`, `EntityPool.ts`, `Query.ts`, `System.ts`, `EventBus.ts`.
- **Física y Colisiones**: `CollisionSystem2D.ts`, `PhysicsSystem2D.ts`, `ContinuousCollision.ts`, `SpatialHash.ts`.
- **Rendering e Input**: `CanvasRenderer.ts`, `SkiaRenderer.ts`, `Renderer.ts`, `UnifiedInputSystem.ts`.
- **Utilidades y Sistemas**: `RandomService.ts`, `AssetLoader.ts`, `HierarchySystem.ts`, `MovementSystem.ts`.
- **Debug y Tipos**: `StateHasher.ts`, `index.ts`, `EngineTypes.ts`.

## 2. Tipos de Problemas Corregidos

- **Moderación de Garantías**: Sustitución de lenguaje absolutista ("garantiza", "siempre", "exactamente") por términos basados en intención de diseño ("destinado a", "busca", "bajo condiciones controladas").
- **Saneamiento de Determinismo**: Clarificación de que el determinismo es reproducible pero dependiente de factores como el orden de iteración, la plataforma y la ausencia de side-effects.
- **Realismo en Rendimiento**: Cambio de claims "zero-allocation" por "reducción/mitigación de presión sobre el GC", reconociendo las limitaciones de las estructuras de datos actuales.
- **Visibilidad de Warnings**: Incremento de la prominencia de advertencias críticas, especialmente respecto a mutaciones estructurales del `World` durante actualizaciones y colisiones.
- **Alineación de Contratos**: Conversión de `@precondition` o `@contract` en recomendaciones o descripciones operativas cuando el código no realiza un enforcement estricto.

## 3. Ejemplos Representativos (Before/After)

### Caso: Determinismo en GameLoop
- **Antes**: "Esto rompe el determinismo temporal estricto en favor de la estabilidad operativa."
- **Después**: "Esto sacrifica la precisión temporal absoluta en favor de la estabilidad del entorno."

### Caso: Zero-Allocation en CanvasRenderer
- **Antes**: "Utiliza una estrategia diseñada para minimizar las alocaciones por frame..."
- **Después**: "Utiliza una estrategia destinada a mitigar las alocaciones por frame..."

### Caso: Restauración de Estado en World
- **Antes**: "Referencias a objetos complejos pueden no restaurarse exactamente si no son POJOs."
- **Después**: "Referencias a objetos complejos (clases, mapas, sets) no se restaurarán fielmente si no son POJOs serializables."

## 4. Decisiones de Criterio Tomadas

- **Honestidad Técnica**: Se priorizó informar al desarrollador sobre los riesgos (ej. lag visual en jerarquías profundas, tunneling en física) por encima de presentar el motor como infalible.
- **Consistencia de Idioma**: Se respetó el bilingüismo del proyecto (Español para el core del motor, Inglés para dinámica/simulación) manteniendo la precisión técnica en ambos.
- **Uso de @internal**: Se marcaron propiedades privadas de clases que estaban expuestas en TypeScript pero no destinadas a la API pública para reducir el ruido en la documentación generada.
- **Preservación de Firma**: No se alteraron firmas de métodos ni lógica funcional, asegurando que el saneamiento fuera puramente documental y de metadatos de tipo.

## 5. Observaciones Adicionales
- Se detectó que `SkiaRenderer.ts` aún no implementa el modelo completo de snapshots del `CanvasRenderer`. La documentación se actualizó para reflejar este estado como una "recomendación de evolución" en lugar de un contrato cumplido.
- Las pruebas unitarias (145 tests) confirmaron que los cambios en la visibilidad y documentación no introdujeron regresiones en el comportamiento esperado del motor.
