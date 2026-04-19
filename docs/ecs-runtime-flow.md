# Flujo de Ejecución ECS (Runtime Flow)

## Entidades
Una **Entidad** es simplemente un identificador numérico único (`number`). El motor utiliza un `EntityPool` para reciclar IDs y minimizar la fragmentación de la memoria y mejorar la localidad de los datos.

## Componentes
Los **Componentes** son POJOs (Plain Old JavaScript Objects) que contienen exclusivamente datos.
- Deben implementar la interfaz `Component` con un discriminador `type`.
- Son procesados por referencia para máximo rendimiento.
- **Principio 6 (Object Pool Ownership)**: El `World` garantiza que los componentes recuperados vía `getSingleton` sean mutables (descongelándolos si es necesario).
- **Invariantes Estructurales**: Componentes como `Transform` incluyen validaciones (ej: no auto-parentesco) durante el `addComponent`.

## Sistemas
Los **Sistemas** encapsulan toda la lógica del juego.
- Son clases que extienden `System`.
- Implementan un método `update(world, deltaTime)`.
- Deben ser, idealmente, sin estado (stateless), operando solo sobre los componentes que consultan.

## World
El **World** es el orquestador central:
- Mantiene el índice de entidades y componentes (`componentMaps`).
- **Almacenamiento**: Utiliza `Map<Entity, Component>` por tipo para acceso O(1) y `Set<Entity>` por tipo para indexación de queries.
- Gestiona el **versionado estructural** (`world.version`): se incrementa en cada cambio estructural (añadir/quitar entidad o componente), permitiendo invalidar cachés de forma eficiente.
- **Rollback y Persistencia**: Soporta `snapshot()` y `restore(state)` nativamente. Durante la restauración, reconstruye los índices y queries sin romper las referencias externas.
- Proporciona acceso a **Recursos**: Singletons globales que no pertenecen a ninguna entidad (e.g., configuración de red, EventBus).

## Queries Reactivas
Las consultas a entidades están altamente optimizadas mediante la clase `Query`:
- **Caché Incremental**: Las queries mantienen una lista interna de entidades que se actualiza solo cuando el `world.version` cambia.
- **Filtrado Eficiente**: Al realizar una consulta de múltiples tipos de componentes, el motor comienza filtrando por el tipo de componente menos frecuente (menor tamaño de Set) para reducir drásticamente el espacio de búsqueda.

### Riesgos Detectados
- **[MUTABLE_CACHE_LEAK]**: `Query.getEntities()` devuelve una referencia al array interno. Si un sistema modifica este array (e.g. `.sort()` o `.pop()`), corromperá la query para todos los demás sistemas. *Estado: Documentado en TSDoc como ReadonlyArray.*
- **[ENTITY_DOUBLE_RELEASE]**: `EntityPool` no valida si un ID ya ha sido liberado. *Estado: FIXED mediante `pooledSet` en `EntityPool.ts`.*
- **[STRUCTURAL_CHANGE_COST]**: Añadir o quitar componentes en hot-loops incrementa `world.version` y notifica a todas las queries interesadas.
- **[ID_REUSE_STALE_REFS]**: Riesgo inherente a la reutilización de IDs numéricos. Se recomienda no persistir IDs de entidades entre frames de forma externa al World.
