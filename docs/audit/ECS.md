# ECS Audit - Tiny Aster Engine

## World Entities Sort Performance
## Severidad
Medium
## Categoría
Performance
## Ubicación
`packages/core/src/ecs/World.ts`
`get entities()` y `getAllEntities()`
## Descripción
Cada vez que se accede a `world.entities` o `world.getAllEntities()`, se crea un nuevo array a partir de un `Set` y se ordena por ID (O(N log N)).
## Evidencia
```typescript
  public get entities(): ReadonlyArray<Entity> {
    return Array.from(this.activeEntities).sort((a, b) => a - b);
  }
```
## Consecuencias
- Alta presión sobre el Garbage Collector (GC) debido a la creación constante de arrays.
- Degradación del rendimiento en sistemas que no usen `Query` y dependan de iterar sobre todas las entidades.
## Solución propuesta
Mantener un array de entidades ya ordenado que se actualice solo en cambios estructurales, o usar una estructura de datos que mantenga el orden.
## Dificultad
Baja
## Prioridad
P1

---

## Query Dirty Sort Performance
## Severidad
Low
## Categoría
Performance
## Ubicación
`packages/core/src/ecs/Query.ts`
`getEntities()`
## Descripción
Las queries utilizan un flag `isDirty` para re-ordenar las entidades de forma perezosa. Aunque es mejor que el enfoque de `World.ts`, sigue implicando un ordenamiento O(N log N) en el primer acceso tras un cambio.
## Evidencia
```typescript
    if (this.isDirty) {
      this.sortedEntities = Array.from(this.entities).sort((a, b) => a - b);
      this.isDirty = false;
    }
```
## Consecuencias
Picos de latencia (jitter) cuando muchas queries se marcan como dirty en un mismo frame.
## Solución propuesta
Utilizar una estructura de datos como un árbol binario balanceado o insertar de forma ordenada en un array para mantener O(N) o mejor.
## Dificultad
Media
## Prioridad
P2

---

## CommandBuffer Access to Private World State
## Severidad
Medium
## Categoría
Arquitectura
## Ubicación
`packages/core/src/ecs/WorldCommandBuffer.ts`
`createEntity(entity: number)`
## Descripción
El `WorldCommandBuffer` accede a propiedades privadas de `World` haciendo un cast a `unknown` y luego a un tipo parcial. Esto rompe el encapsulamiento y es frágil ante refactorizaciones.
## Evidencia
```typescript
        const w = world as unknown as { activeEntities: Set<number>, _structureVersion: number };
        w.activeEntities.add(entity);
        w._structureVersion++;
```
## Consecuencias
- Acoplamiento fuerte entre `World` y `WorldCommandBuffer`.
- Posibles errores si se cambian los nombres de las propiedades internas de `World`.
## Solución propuesta
Proveer un método público o protegido en `World` (si se usa herencia o amistad entre clases) para activar entidades reservadas.
## Dificultad
Baja
## Prioridad
P2
