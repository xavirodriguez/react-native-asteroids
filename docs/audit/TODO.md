# Technical Debt Roadmap - TinyAster

This document maps out a phased, actionable refactoring plan to address the technical debt, performance issues, and architectural anomalies identified in the TinyAster audit.

---

## Roadmap Overview

```
 ┌──────────────────────────────────────┐
 │ Phase 1: Isolation & Build Recovery  │  ◄── Solve build errors & transpilation artifact leaks
 └──────────────────┬───────────────────┘
                    ▼
 ┌──────────────────────────────────────┐
 │ Phase 2: Architecture & Boundaries  │  ◄── Enforce Clean Hexagonal boundaries & move NetTypes
 └──────────────────┬───────────────────┘
                    ▼
 ┌──────────────────────────────────────┐
 │ Phase 3: Type Safety & Validation    │  ◄── Enable "strict": true on server, remove raw 'any's
 └──────────────────┬───────────────────┘
                    ▼
 ┌──────────────────────────────────────┐
 │ Phase 4: Performance & Optimization  │  ◄── Cache sorted entity lists, fix World.entities sorting
 └──────────────────┬───────────────────┘
                    ▼
 ┌──────────────────────────────────────┐
 │ Phase 5: Testing & Simulation        │  ◄── Add simulated network specs, mock virtual Canvas tests
 └──────────────────────────────────────┘
```

---

## Refactoring Roadmap Phases

### Fase 1: Errores Críticos y Recuperación de Build

Estas tareas son bloqueantes de producción e impiden compilar el backend headless o ejecutar controles de calidad confiables.

#### 1.1. Detener la Contaminación de Archivos `.js` en `/src`
- **Prioridad**: P0
- **Esfuerzo estimado**: Bajo (1-2 días)
- **Riesgo**: Bajo
- **Descripción**: Configurar la directiva `"outDir": "./dist"` de forma rigurosa en todos los `tsconfig.json`. Implementar scripts de limpieza automatizados (`clean:artifacts`) para purgar los archivos `.js` y `.js.map` que se fugaron en la carpeta `/src/`, y excluirlos explícitamente en el archivo `.gitignore` global.
- **Dependencias**: Ninguna.

#### 1.2. Resolver Incompatibilidad de Dependencias Pares
- **Prioridad**: P0
- **Esfuerzo estimado**: Medio (2-3 días)
- **Riesgo**: Alto (puede requerir pruebas físicas exhaustivas en simuladores iOS/Android)
- **Descripción**: Realizar un downgrade controlado de las dependencias de React y React Native a las versiones oficialmente validadas por Expo SDK v55, eliminando la necesidad de forzar las instalaciones mediante `--legacy-peer-deps`.
- **Dependencias**: Ninguna.

---

### Fase 2: Arquitectura y Límites de Dominio

Enfoque en reestablecer la Arquitectura Hexagonal y aislar el núcleo físico del motor de las plataformas nativas visuales.

#### 2.1. Desacoplar el Servidor Autoritativo del Cliente React Native
- **Prioridad**: P0
- **Esfuerzo estimado**: Alto (4-5 días)
- **Riesgo**: Alto (puede alterar el arranque del juego)
- **Descripción**: Extraer la simulación física y el estado puro del bucle de juego de Asteroids a un submódulo de dominio agnóstico. Eliminar de raíz cualquier importación cruzada entre el servidor de Colyseus y la aplicación móvil de React Native.
- **Dependencias**: 1.1, 1.2.

#### 2.2. Reubicar `NetTypes.ts` a un Paquete de Red Agnóstico
- **Prioridad**: P0
- **Esfuerzo estimado**: Bajo (1 día)
- **Riesgo**: Bajo
- **Descripción**: Mover las interfaces comunes del protocolo (`InputFrame`, etc.) fuera de `@tiny-aster/react-native/src/hooks/` y colocarlas bajo un subpaquete agnóstico como `@tiny-aster/core/src/network/` o similar.
- **Dependencias**: Ninguna.

---

### Fase 3: Seguridad de Tipos y Validación de API

Erradicar los casts inseguros (`as any`) y blindar los endpoints de red del servidor Colyseus.

#### 3.1. Habilitar la Configuración Estricta de TypeScript en el Servidor
- **Prioridad**: P1
- **Esfuerzo estimado**: Medio (2-3 días)
- **Riesgo**: Medio
- **Descripción**: Cambiar `"strict": false` por `"strict": true` en `server/tsconfig.json` y resolver de forma minuciosa todos los errores de referencias nulas u opcionales resultantes.
- **Dependencias**: 2.1.

#### 3.2. Implementar Validación de Entrada de Red con Esquemas Zod
- **Prioridad**: P1
- **Esfuerzo estimado**: Bajo (1-2 días)
- **Riesgo**: Bajo
- **Descripción**: Validar e interceptar todos los payloads de juego (`options`, `seed`, `InputFrame`) enviados por los clientes al servidor Colyseus utilizando validadores rígidos de `zod`.
- **Dependencias**: Ninguna.

---

### Fase 4: Rendimiento y Optimización de Renderizado

Resolver los cuellos de botella de renderizado O(N log N) que merman la fluidez en dispositivos móviles.

#### 4.1. Eliminar Re-ordenamiento Constante en Render Hot-Paths
- **Prioridad**: P1
- **Esfuerzo estimado**: Medio (2 días)
- **Riesgo**: Bajo
- **Descripción**: Implementar un caché reactivo para las listas ordenadas de entidades (`sortedEntities`) en `CanvasRenderer` y `SkiaRenderer`. Reordenar la lista únicamente tras detecciones de modificaciones estructurales del World o de cambios de z-index de las entidades.
- **Dependencias**: Ninguna.

#### 4.2. Optimizar el Getter de `World.entities` de la Clase Central ECS
- **Prioridad**: P1
- **Esfuerzo estimado**: Bajo (1 día)
- **Riesgo**: Bajo
- **Descripción**: Almacenar en caché el array de entidades en la clase `World` y reconstruirlo/ordenarlo lazily únicamente bajo un flag dirty de creación o destrucción de entidades.
- **Dependencias**: Ninguna.

---

### Fase 5: Estrategia de Testing y Coherencia Física

Mitigar el riesgo de regresiones físicas y desincronizaciones de red en integraciones futuras.

#### 5.1. Corregir Discrepancia Escalar de Integración Física en Red
- **Prioridad**: P0
- **Esfuerzo estimado**: Medio (2 días)
- **Riesgo**: Alto (requiere re-ajustar las velocidades de la nave)
- **Descripción**: Unificar el cómputo de la delta de tiempo física a una escala común en todo el motor (fijar si se opera en segundos o en milisegundos de forma estricta), eliminando la deriva catastrófica de 1000x en `ReplicationSystem`.
- **Dependencias**: Ninguna.

#### 5.2. Crear una Suite de Pruebas de Red y Reconciliación Simulada
- **Prioridad**: P1
- **Esfuerzo estimado**: Alto (4-5 días)
- **Riesgo**: Bajo
- **Descripción**: Diseñar especificaciones de prueba en memoria que simulen la latencia de red, jitter y pérdida de paquetes, validando que el método `reconcile` converja matemáticamente sin error frente al estado del servidor.
- **Dependencias**: 5.1.
