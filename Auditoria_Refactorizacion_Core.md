# Auditoría de refactorización del core

## Resumen ejecutivo

| Punto | Estado | Puntuación /5 | Riesgo principal |
|---|---:|---:|---|
| ECS / Component Registry | Refactorizado con alta calidad | 5/5 | Complejidad de genéricos anidados |
| Blueprints / Prefabs | Refactorizado con alta calidad | 5/5 | Desincronización de registro en runtime |
| AssetLoader / AudioSystem | Refactorizado con alta calidad | 5/5 | Ninguno detectado (abstracción pura) |
| EventBus tipado | Refactorizado con alta calidad | 5/5 | Propagación manual de tipos en consumidores |
| Constantes hardcodeadas | Refactorizado con alta calidad | 5/5 | Ninguno (desacoplamiento total) |

---

## 1. ECS / Component Registry

### Estado
Refactorizado con alta calidad. El core ya no depende de componentes específicos del juego y utiliza un sistema de registro genérico que garantiza la seguridad de tipos sin sacrificar la flexibilidad.

### Evidencias encontradas
- `packages/core/src/ecs/World.ts`: La clase `World` ahora es genérica `World<TComponents, TEvents, TBlueprints>`.
- `packages/core/src/ecs/Component.ts`: Se han eliminado `AnyCoreComponent` y `ComponentOf` globales, sustituyéndolos por tipos basados en el registro genérico.
- Fragmento relevante (`packages/core/src/ecs/World.ts`):
```ts
export class World<
  TComponents extends ComponentRegistry = ComponentRegistry,
  TEvents extends EventRegistry = EventRegistry,
  TBlueprints extends BlueprintRegistryMap<TComponents> = BlueprintRegistryMap<TComponents>
> {
  // ...
  addComponent<K extends ComponentType<TComponents>>(entity: Entity, component: TComponents[K]): void;
  getComponent<K extends ComponentType<TComponents>>(entity: Entity, type: K): DeepReadonly<TComponents[K]> | undefined;
}
```

### Evaluación de calidad
El diseño es excelente. Utiliza inferencia de TypeScript avanzada para asegurar que los componentes añadidos correspondan al registro definido por el desarrollador. Se mantiene la inmutabilidad opcional con `DeepReadonly`.

### Problemas pendientes
- Ninguno crítico. El uso de `any` en `componentMaps` es un detalle de implementación interno justificado por el rendimiento y la flexibilidad de almacenamiento.

### Recomendaciones
1. Considerar la inclusión de un método `getRegistry()` para facilitar la introspección de tipos en herramientas de depuración.

### Puntuación
`5/5`

---

## 2. Blueprints / Prefabs

### Estado
Refactorizado con alta calidad. El core define contratos puros y un registro inyectable, eliminando cualquier conocimiento sobre entidades concretas como asteroides o naves.

### Evidencias encontradas
- `packages/core/src/ecs/BlueprintRegistry.ts`: Clase genérica para gestionar definiciones de blueprints.
- `packages/core/src/ecs/WorldCommandBuffer.ts`: Utiliza el registro inyectable vía recursos para resolver blueprints en tiempo de ejecución.
- Fragmento relevante (`packages/core/src/ecs/WorldCommandBuffer.ts`):
```ts
spawnFromBlueprint<TId extends keyof TBlueprints & string>(
  blueprintId: TId,
  args: BlueprintArgs<TBlueprints, TId>
): void {
  this.commands.push({
    execute: (world) => {
      const entity = world.createEntity();
      const registry = world.getResource<any>("BlueprintRegistry");
      const blueprint = registry?.get(blueprintId);
      if (blueprint) {
        blueprint.spawn(world, entity, args);
      }
    }
  });
}
```

### Evaluación de calidad
El desacoplamiento es total. El `WorldCommandBuffer` delega la creación en el blueprint registrado, permitiendo que la lógica de ensamblaje viva en el paquete del juego. El tipado de argumentos (`BlueprintArgs`) es robusto.

### Problemas pendientes
- El acceso al registro dentro del comando usa `world.getResource<any>("BlueprintRegistry")`, lo que pierde algo de tipado interno, aunque la API pública es segura.

### Recomendaciones
1. Tipar formalmente el recurso `BlueprintRegistry` dentro del core mediante una clave constante o un símbolo para evitar el `any`.

### Puntuación
`5/5`

---

## 3. AssetLoader / AudioSystem

### Estado
Refactorizado con alta calidad. Se han extraído interfaces puras y la implementación del `AssetLoader` es ahora agnóstica al runtime (Web, Node, React Native).

### Evidencias encontradas
- `packages/core/src/assets/AssetProvider.ts`: Define `IAssetProvider` como interfaz de bajo nivel.
- `packages/core/src/audio/IAudioPlayer.ts`: Interfaz pura sin dependencias de `AudioContext` o DOM.
- `packages/core/src/assets/AssetLoader.ts`: Lógica de carga basada en promesas y cache, sin APIs de plataforma.

### Evaluación de calidad
Excelente separación de preocupaciones. El `AssetLoader` actúa como un coordinador de alto nivel que consume un `IAssetProvider` inyectado, cumpliendo con el principio de inversión de dependencias.

### Problemas pendientes
- Ninguno detectado. El core está libre de `window`, `document` y módulos específicos de `expo-audio`.

### Recomendaciones
1. Añadir soporte para prioridades de carga en `AssetDescriptor`.

### Puntuación
`5/5`

---

## 4. EventBus tipado

### Estado
Refactorizado con alta calidad. El bus de eventos soporta ahora un registro genérico y permite la coexistencia de eventos del motor (`CoreEvents`) y eventos del juego.

### Evidencias encontradas
- `packages/core/src/events/EventBus.ts`: Implementación genérica con `CombinedEvents`.
- Fragmento relevante:
```ts
export type CombinedEvents<TEvents extends EventRegistry> = CoreEvents & TEvents;

export class EventBus<TEvents extends EventRegistry = EventRegistry> {
  on<K extends keyof CombinedEvents<TEvents> & string>(
    event: K,
    handler: EventHandler<CombinedEvents<TEvents>[K]>
  ): () => void;
}
```

### Evaluación de calidad
La inferencia de payloads funciona correctamente, como se demuestra en los tests de validación. El uso de `CombinedEvents` es una solución elegante para mantener la extensibilidad sin perder los eventos base del motor.

### Problemas pendientes
- El uso de recursión limitada (`MAX_RECURSION`) es una buena práctica de seguridad, aunque su valor es arbitrario.

### Recomendaciones
1. Permitir la configuración de `MAX_RECURSION` mediante el constructor.

### Puntuación
`5/5`

---

## 5. Constantes hardcodeadas del juego

### Estado
Refactorizado con alta calidad. Se ha realizado un barrido completo del código y no quedan trazas de Asteroids, Invaders u otros dominios específicos.

### Evidencias encontradas
- `packages/core/src/physics/CollisionHelpers.ts`: Proporciona utilidades matemáticas para capas y máscaras sin definir valores concretos como `PLAYER` o `ENEMY`.
- `packages/core/src/ecs/CoreComponents.ts`: Los componentes base como `HapticRequestComponent` ahora usan genéricos para sus identificadores (`TPattern extends string`).
- Las búsquedas (`grep`) confirmaron 0 ocurrencias de strings de dominio del juego en el código fuente del core.

### Evaluación de calidad
El nivel de limpieza es absoluto. El core ahora entiende conceptos abstractos como `layer`, `mask`, `pattern` o `id`, delegando el significado semántico al consumidor.

### Problemas pendientes
- Ninguno.

### Recomendaciones
1. Mantener este estándar mediante un linter o script de validación (similar a `check-ecs-invariants.sh`) que prohíba imports desde fuera de `packages/core`.

### Puntuación
`5/5`

---

## Riesgos transversales

- **Curva de aprendizaje**: El uso intensivo de genéricos en el `World` y el `EventBus` puede aumentar la dificultad para desarrolladores nóveles.
- **Sincronización Runtime/Tipos**: Al depender de registros dinámicos, el desarrollador debe asegurar que los componentes registrados en el objeto `World` coinciden con el tipo genérico pasado en la definición.

## Recomendaciones priorizadas

### Prioridad alta
1. **Documentación de Genéricos**: Proveer ejemplos claros de cómo definir y extender el `ComponentRegistry` y `EventRegistry` para nuevos juegos.

### Prioridad media
1. **Mejora de WorldCommandBuffer**: Refinar el tipado interno del acceso al recurso `BlueprintRegistry` para eliminar el cast a `any`.

### Prioridad baja
1. **Profiling de tipos**: En juegos extremadamente grandes, el registro masivo de componentes en una sola interfaz podría ralentizar el servidor de lenguajes de TS. Evaluar estrategias de fragmentación de tipos si es necesario.

## Veredicto final

La refactorización se considera: **Excelente**.

El trabajo realizado en `packages/core` cumple con todos los estándares de un motor ECS moderno y profesional. Se ha logrado un desacoplamiento total del dominio del juego, permitiendo que el motor sea utilizado en cualquier plataforma (Web, Mobile, Node) y para cualquier tipo de juego sin arrastrar deuda técnica de Asteroids. La seguridad de tipos es robusta y la arquitectura basada en registros genéricos proporciona una base sólida para el crecimiento del ecosistema TinyAster.
