# Performance & Rendering Audit - TinyAster

This document details critical performance issues, rendering bottlenecks, memory allocation anomalies, and garbage collection pressure in the TinyAster engine.

---

## Technical Audit Findings

### 1. Full Sorting Inside the Render Hot-Paths

## Título
Inundación de Garbage Collector: O(N log N) Arrays Copy y Sorting en Cada Frame de Render

## Severidad
High

## Categoría
Performance

## Ubicación
`packages/renderer-canvas/src/CanvasRenderer.ts` (línea 19-30) y `packages/renderer-skia/src/SkiaRenderer.ts` (línea 47-51)

## Descripción
Tanto el renderizador de Canvas como el de Skia necesitan pintar las entidades basándose en su orden de capa (`render.order`). Sin embargo, para lograr esto, ambos renderizadores realizan una copia completa del array de entidades de la query y ejecutan un ordenamiento manual (`sort`) en *cada frame* (aproximadamente 60 veces por segundo). La operación `[...entities].sort(...)` reserva memoria heap para un nuevo array y ejecuta un algoritmo de ordenación O(N log N) en caliente, incrementando de forma masiva la presión sobre el recolector de basura (Garbage Collector) y provocando micro-stuttering (tirones de frames) notorios en dispositivos móviles de gama media o baja.

## Evidencia
En `packages/renderer-skia/src/SkiaRenderer.ts`:
```typescript
    const entities = world.query(transformType, renderType);

    // Sort by order to handle layering
    const sortedEntities = [...entities].sort((a, b) => {
      const renderA = world.getComponent(a, renderType) as RenderComponent | undefined;
      const renderB = world.getComponent(b, renderType) as RenderComponent | undefined;
      return (renderA?.order || 0) - (renderB?.order || 0);
    });
```

## Consecuencias
- **Pérdida de Fluidez (Framerate Drops)**: En dispositivos móviles, el Garbage Collector de JavaScript se ve forzado a pausar el hilo principal para liberar los miles de arrays efímeros creados y destruidos en cada segundo de juego, impidiendo mantener una tasa estable de 60 FPS.
- **Consumo Excesivo de Batería**: El ciclo CPU/GPU se mantiene sobrecargado ordenando colecciones de IDs que raramente alteran su prioridad de renderizado (z-index) entre frames.

## Solución propuesta
1. **Cachear y Marcar como Sucio**: Los renderizadores deben almacenar en caché la lista ordenada `sortedEntities`.
2. **Estructura Reactiva**: Solo se debe reordenar esta lista cuando ocurra un cambio estructural (ej. una entidad es creada, eliminada o su `Render.order` cambia). Dado que los cambios de z-index de capa son esporádicos durante una partida, el costo amortizado de ordenación pasaría de ser constante en cada frame a prácticamente nulo (O(1)).

## Dificultad
Media

## Prioridad
P1

## Dependencias
Ninguna.

---

### 2. O(N log N) Sorting en la Propiedad Pública de Entidades del World

## Título
Trampa de Rendimiento: El Getter de `World.entities` Ordena Todo el Conjunto en Cada Invocación

## Severidad
High

## Categoría
Performance

## Ubicación
`packages/core/src/ecs/World.ts` (líneas 147-150)

## Descripción
El getter público `.entities` expuesto por la clase `World` devuelve un array ordenado de todos los IDs de entidades activas. Para ello, realiza una conversión del set interno a un array y ejecuta `.sort((a, b) => a - b)`. Este getter es consultado con frecuencia en caliente (por ejemplo, en sistemas de depuración, serialización, o en el servidor al calcular el presupuesto de red). Al no contar con ningún mecanismo de caching o flag de "dirty" (a diferencia de las queries), cada acceso incurre en una penalización de rendimiento silenciosa de ordenación y reserva de memoria.

## Evidencia
En `packages/core/src/ecs/World.ts`:
```typescript
  public get entities(): ReadonlyArray<Entity> {
    return Array.from(this.activeEntities).sort((a, b) => a - b);
  }
```

## Consecuencias
- **Degradación Exponencial del Servidor**: El servidor autoritativo de Colyseus invoca esta propiedad varias veces por frame por cada cliente conectado en el bucle principal. Si la sala contiene 200 asteroides, 10 naves y cientos de proyectiles, la sobrecarga computacional de estar convirtiendo sets y ordenando vectores de forma redundante ralentiza drásticamente el tick de juego, induciendo lag a los jugadores.

## Solución propuesta
Almacenar una caché interna del array de entidades en la clase `World` (`cachedEntitiesArray`). Cuando un objeto es creado o eliminado (operaciones que alteran el set), se marca un flag `entitiesDirty = true`. El getter únicamente regenera y ordena el array cuando este flag esté en verdadero; en cualquier otra situación, retorna la referencia cacheada (O(1)).

## Dificultad
Baja

## Prioridad
P1

## Dependencias
Ninguna.

---

### 3. Clonación Recursiva Ineficiente de Componentes en Snapshots

## Título
Sobrecarga Computacional: Clonación Profunda de Componentes en Caliente para Rollbacks y Serialización

## Severidad
Medium

## Categoría
Performance

## Ubicación
`packages/core/src/ecs/ComponentCloner.ts`

## Descripción
La captura de snapshots del mundo para predicciones de red o guardado de estado se apoya en `ComponentCloner.cloneComponent`, que realiza una copia profunda recursiva manual inspeccionando todas las propiedades del objeto componente. El uso de llamadas recursivas en JS sobre objetos grandes genera una enorme cantidad de garbage objects efímeros e incrementa la profundidad del stack de ejecución.

## Evidencia
En `packages/core/src/ecs/ComponentCloner.ts`:
```typescript
  public static cloneComponent<T>(component: T): T {
    if (component === null || typeof component !== "object") {
      return component;
    }

    if (Array.isArray(component)) {
      return component.map(v => this.cloneComponent(v)) as unknown as T;
    }

    const clone = {} as any;
    for (const key in component) {
      if (Object.prototype.hasOwnProperty.call(component, key)) {
        clone[key] = this.cloneComponent((component as any)[key]);
      }
    }
    return clone;
  }
```

## Consecuencias
- **Picos de Latencia en Snapshots**: Cuando se capturan snapshots del estado de juego para el búfer de rollback de red (que ocurre típicamente a 60Hz), la CPU gasta la mayor parte de su tiempo de ejecución clonando de forma redundante valores estáticos de componentes que no se han modificado.

## Solución propuesta
1. **Snapshots Incrementales basados en Versiones**: Implementar Copy-On-Write o clonar únicamente aquellos componentes cuyo número de versión (`componentVersions`) sea mayor al último snapshot capturado.
2. **Reutilización de Objetos (Object Pooling)**: Permitir que los snapshots viejos del buffer reciclen sus estructuras de datos y arrays en lugar de descartarlos para que el Garbage Collector no sufra picos de recolección de memoria.

## Dificultad
Alta

## Prioridad
P2

## Dependencias
Ninguna.
