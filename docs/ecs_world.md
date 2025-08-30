# ECS World - Documentación Técnica

## Descripción General

El módulo `src/game/ecs-world.ts` implementa el núcleo del patrón **Entity-Component-System (ECS)** utilizado por el juego Asteroids. Proporciona las abstracciones fundamentales para gestionar entidades, componentes y sistemas de manera desacoplada y performante.

## Arquitectura ECS

### Conceptos Clave

- **Entidad**: ID numérico único (`Entity = number`)
- **Componente**: Datos puros sin lógica (`Component` interface)
- **Sistema**: Lógica de procesamiento (`System` abstract class)

La clase `World` actúa como registro central que coordina estas tres abstracciones.

## API de la Clase World

### Constructor

```typescript
constructor();
```

**Inicialización automática**:

- `entities: Set<Entity>` - Vacío inicial
- `components: Map<ComponentType, Map<Entity, Component>>` - Doble mapa para indexación O(1)
- `systems: System[]` - Array vacío de sistemas
- `nextEntityId: number = 1` - Contador incremental de IDs

### Gestión de Entidades

#### `createEntity(): Entity`

**Propósito**: Genera una nueva entidad con ID único autoincrementado.

**Algoritmo**:

```typescript
const id = this.nextEntityId++; // Atomic increment
this.entities.add(id); // Add to active set
return id; // Return unique ID
```

**Complejidad**: O(1)
**Thread Safety**: ❌ No thread-safe (single-threaded JS)

**Uso típico**:

```typescript
const ship = world.createEntity(); // ID: 1
const asteroid = world.createEntity(); // ID: 2
```

#### `removeEntity(entity: Entity): void`

**Propósito**: Elimina entidad y TODOS sus componentes asociados.

**Algoritmo de limpieza**:

```typescript
// Fase 1: Eliminar de todos los mapas de componentes
this.components.forEach((componentMap) => {
  componentMap.delete(entity); // O(1) per component type
});

// Fase 2: Eliminar del set de entidades activas
this.entities.delete(entity); // O(1)
```

**Complejidad**: O(C) donde C = número de tipos de componentes registrados
**Garantías**: Eliminación completa, sin memory leaks

**⚠️ Importante**: Esta operación es **irreversible**. Todos los componentes se pierden permanentemente.

#### `getAllEntities(): Entity[]`

**Propósito**: Retorna snapshot de todas las entidades activas.

```typescript
return Array.from(this.entities); // Copia del Set interno
```

**Complejidad**: O(n) donde n = número total de entidades
**Uso**: Debugging, herramientas de desarrollo, serialización

### Gestión de Componentes

#### `addComponent<T extends Component>(entity: Entity, component: T): void`

**Propósito**: Asocia un componente tipado a una entidad específica.

**Algoritmo de indexación**:

```typescript
const type = component.type; // Extract component type
if (!this.components.has(type)) {
  // Lazy initialization
  this.components.set(type, new Map()); // Create type index
}
this.components.get(type)!.set(entity, component); // Store component
```

**Estructura de datos resultante**:

```
components: {
  "Position" => { 1 => {type:"Position", x:100, y:200}, 3 => {...} }
  "Velocity" => { 1 => {type:"Velocity", dx:50, dy:0}, 2 => {...} }
  "Health"   => { 1 => {type:"Health", current:3, max:3} }
}
```

**Complejidad**: O(1) para inserción y búsqueda
**Comportamiento**: Si la entidad ya tiene ese tipo de componente, lo **sobrescribe**

#### `getComponent<T extends Component>(entity: Entity, type: ComponentType): T | undefined`

**Propósito**: Recupera un componente tipado de una entidad.

```typescript
return this.components.get(type)?.get(entity) as T;
```

**Complejidad**: O(1) - doble hash lookup
**Type Safety**: Cast explícito `as T` - el caller debe garantizar el tipo correcto
**Retorno**: `undefined` si la entidad no posee ese componente

**Ejemplo de uso seguro**:

```typescript
const pos = world.getComponent<PositionComponent>(ship, "Position");
if (pos) {
  pos.x += 10; // Safe access
}

// Pattern recomendado con assertion
const pos = world.getComponent<PositionComponent>(ship, "Position")!;
```

#### `removeComponent(entity: Entity, type: ComponentType): void`

**Propósito**: Elimina un componente específico de una entidad.

```typescript
this.components.get(type)?.delete(entity);
```

**Complejidad**: O(1)
**Comportamiento**: Operación silenciosa si el componente no existe
**Caso de uso**: Remover temporalmente capacidades (ej: deshabilitar input)

### Sistema de Queries

#### `query(...componentTypes: ComponentType[]): Entity[]`

**Propósito**: Encuentra todas las entidades que poseen TODOS los componentes especificados.

**Algoritmo de filtrado**:

```typescript
return Array.from(this.entities).filter((entity) =>
  componentTypes.every(
    (type) => this.components.get(type)?.has(entity) // Check component existence
  )
);
```

**Análisis de Complejidad**:

- **Tiempo**: O(n × m) donde:
  - n = número total de entidades
  - m = número de tipos de componentes en la query
- **Espacio**: O(k) donde k = número de entidades que coinciden

**Optimizaciones Internas**:

- ✅ Usa `?.has()` para evitar excepciones con tipos no registrados
- ✅ `every()` hace short-circuit en la primera falla
- ❌ No implementa indexación inversa para queries comunes

**Ejemplos de uso**:

```typescript
// Query simple: entidades renderizables
const renderables = world.query("Position", "Render"); // O(n×2)

// Query compleja: naves del jugador
const ships = world.query("Position", "Velocity", "Input", "Health"); // O(n×4)

// Query vacía devuelve array vacío
const missing = world.query("NonExistentComponent"); // []
```

**Patterns de Performance**:

✅ **Recomendado**:

```typescript
// Cache queries en sistemas que se ejecutan cada frame
class RenderSystem extends System {
  update(world: World) {
    const renderables = world.query("Position", "Render")  // Una vez por frame
    renderables.forEach(...)
  }
}
```

❌ **Evitar**:

```typescript
// Multiple queries por entidad
entities.forEach((entity) => {
  const hasPos = world.query("Position").includes(entity); // O(n) per entity!
});
```

### Gestión de Sistemas

#### `addSystem(system: System): void`

**Propósito**: Registra un sistema en el game loop.

```typescript
this.systems.push(system); // Append to execution order
```

**Orden de ejecución**: Los sistemas se ejecutan en el **orden de registro** durante `world.update()`.

**Ejemplo de setup típico**:

```typescript
// Orden crítico para gameplay correcto
world.addSystem(new InputSystem()); // 1. Procesar input
world.addSystem(new MovementSystem()); // 2. Aplicar física
world.addSystem(new CollisionSystem()); // 3. Detectar colisiones
world.addSystem(new TTLSystem()); // 4. Limpiar entidades expiradas
world.addSystem(new GameStateSystem()); // 5. Actualizar estado global
```

#### `update(deltaTime: number): void`

**Propósito**: Ejecuta todos los sistemas registrados en secuencia.

```typescript
this.systems.forEach((system) => system.update(this, deltaTime));
```

**Parámetros**:

- `deltaTime: number` - Milisegundos transcurridos desde el último frame
- Se pasa `this` para dar acceso completo al World

**Complejidad**: O(S × C_s) donde:

- S = número de sistemas registrados
- C_s = complejidad del sistema individual

**Invariantes garantizados**:

- Ejecución **secuencial** (no paralela)
- Cada sistema ve el estado actualizado por sistemas anteriores
- `deltaTime` es consistente para todos los sistemas en el frame

## Clase Abstracta System

### Definición

```typescript
export abstract class System {
  abstract update(world: World, deltaTime: number): void;
}
```

**Contrato**: Todos los sistemas deben implementar `update()` con esta signatura.

### Implementación Típica

```typescript
class ExampleSystem extends System {
  update(world: World, deltaTime: number): void {
    // 1. Query entidades relevantes
    const entities = world.query("ComponentA", "ComponentB");

    // 2. Procesar cada entidad
    entities.forEach((entity) => {
      const compA = world.getComponent<ComponentA>(entity, "ComponentA")!;
      const compB = world.getComponent<ComponentB>(entity, "ComponentB")!;

      // 3. Aplicar lógica de negocio
      // 4. Modificar componentes directamente
    });
  }
}
```

## Patterns de Uso Avanzados

### 1. Eliminación Diferida (Evitar Concurrent Modification)

❌ **Problemático**:

```typescript
const entities = world.query("TTL");
entities.forEach((entity) => {
  const ttl = world.getComponent<TTL>(entity, "TTL")!;
  if (ttl.remaining <= 0) {
    world.removeEntity(entity); // ⚠️ Modifica durante iteración
  }
});
```

✅ **Correcto**:

```typescript
const entities = world.query("TTL");
const toRemove: Entity[] = [];

// Fase 1: Identificar entidades a eliminar
entities.forEach((entity) => {
  const ttl = world.getComponent<TTL>(entity, "TTL")!;
  if (ttl.remaining <= 0) {
    toRemove.push(entity);
  }
});

// Fase 2: Eliminación en lote
toRemove.forEach((entity) => world.removeEntity(entity));
```

### 2. Component Pooling para Performance

```typescript
class ComponentPool<T extends Component> {
  private pool: T[] = [];

  acquire(): T | undefined {
    return this.pool.pop();
  }

  release(component: T): void {
    // Reset component state
    this.pool.push(component);
  }
}
```

### 3. Query Caching

```typescript
class CachedQuerySystem extends System {
  private cachedRenderables: Entity[] = []
  private cacheValid = false

  update(world: World, deltaTime: number): void {
    if (!this.cacheValid) {
      this.cachedRenderables = world.query("Position", "Render")
      this.cacheValid = true
    }

    // Use cached results
    this.cachedRenderables.forEach(...)
  }

  invalidateCache(): void {
    this.cacheValid = false
  }
}
```

## Limitaciones y Trade-offs

### Ventajas del Diseño Actual

✅ **Simplicidad**: API minimalista, fácil de entender
✅ **Flexibilidad**: Composición dinámica de entidades  
✅ **Desacoplamiento**: Sistemas independientes entre sí
✅ **Type Safety**: TypeScript generics para componentes

### Limitaciones Identificadas

❌ **Performance**: Queries O(n×m) sin optimización
❌ **Memory**: No pooling de componentes
❌ **Concurrencia**: No thread-safe  
❌ **Eventos**: No sistema de messaging entre sistemas
❌ **Serialización**: No soporte built-in para save/load

### Mejoras Sugeridas

1. **Indexación Inversa**: Mantener índices por tipo de componente
2. **Archetype System**: Agrupar entidades por composición de componentes
3. **Event Bus**: Sistema de eventos desacoplado
4. **Component Pools**: Reutilización de objetos para GC
5. **Query DSL**: Sintaxis más expresiva para queries complejas

```typescript
// Ejemplo de mejora potencial
world
  .query()
  .with("Position", "Render")
  .without("Destroyed")
  .orderBy((entity) => entity.id)
  .limit(100)
  .execute();
```

## Debugging y Herramientas

### Inspección del Estado

```typescript
// Diagnostics helpers (no implementados)
world.getEntityCount(); // Número total de entidades
world.getComponentTypes(); // Lista de tipos registrados
world.getEntitiesWithComponent("Health"); // Filtrar por componente único
world.dumpEntity(entityId); // Serializar entidad completa
```

### Profiling de Queries

```typescript
class ProfiledWorld extends World {
  private queryStats = new Map<string, { count: number; totalTime: number }>();

  query(...types: ComponentType[]): Entity[] {
    const key = types.join(",");
    const start = performance.now();

    const result = super.query(...types);

    const time = performance.now() - start;
    const stats = this.queryStats.get(key) || { count: 0, totalTime: 0 };
    stats.count++;
    stats.totalTime += time;
    this.queryStats.set(key, stats);

    return result;
  }
}
```

## Conclusión

El módulo `ecs-world.ts` implementa un ECS funcional y minimalista que cumple los requisitos del juego Asteroids. Aunque tiene limitaciones de performance para aplicaciones más complejas, su diseño simple facilita el mantenimiento y la comprensión del código.

Para proyectos más grandes, considerar migrar a implementaciones optimizadas como [bitECS](https://github.com/NateTheGreatt/bitECS) o [Ecsy](https://github.com/ecsyjs/ecsy).
