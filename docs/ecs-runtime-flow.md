# Flujo de Ejecución ECS (Runtime Flow)

## Entidades
Una **Entidad** es simplemente un identificador numérico único (`number`). El motor utiliza un `EntityPool` para reciclar IDs y minimizar la fragmentación de la memoria y mejorar la localidad de los datos.

## Componentes
Los **Componentes** son POJOs (Plain Old JavaScript Objects) que contienen exclusivamente datos.
- Deben implementar la interfaz `Component` con un discriminador `type`.
- Son procesados por referencia para máximo rendimiento.
- **Principio 6 (Object Pool Ownership)**: El `World` garantiza que los componentes recuperados vía `getSingleton` sean mutables (descongelándolos si es necesario).

## Sistemas
Los **Sistemas** encapsulan toda la lógica del juego.
- Son clases que extienden `System`.
- Implementan un método `update(world, deltaTime)`.
- Deben ser, idealmente, sin estado (stateless), operando solo sobre los componentes que consultan.

## World
El **World** es el orquestador central:
- Mantiene el índice de entidades y componentes (`componentMaps`).
- Gestiona el **versionado estructural** (`world.version`): se incrementa en cada cambio estructural (añadir/quitar entidad o componente), permitiendo invalidar cachés de forma eficiente.
- Proporciona acceso a **Recursos**: Singletons globales que no pertenecen a ninguna entidad (e.g., configuración de red, bus de eventos).
- Implementa el **Principio 6**: El `World` garantiza que los componentes singleton recuperados sean mutables (descongelándolos si es necesario).

## Queries Reactivas
Las consultas a entidades están altamente optimizadas mediante la clase `Query`:
- **Caché Incremental**: Las queries mantienen una lista interna de entidades que se actualiza solo cuando el `world.version` cambia.
- **Filtrado Eficiente**: Al realizar una consulta de múltiples tipos de componentes, el motor comienza filtrando por el tipo de componente menos frecuente (menor tamaño de Set) para reducir drásticamente el espacio de búsqueda.
- **Notificación Selectiva**: Cuando un componente cambia en una entidad, solo se notifican las queries que están interesadas en ese tipo de componente.

### Ciclo de Vida de una Entidad
1. **Creación**: `world.createEntity()` solicita un ID al pool.
2. **Población**: `world.addComponent(entity, component)` asocia datos a la entidad. Las queries se actualizan de forma reactiva.
3. **Simulación**: Los sistemas operan sobre la entidad en cada tick.
4. **Destrucción**: `world.removeEntity(entity)` limpia todos los componentes y devuelve el ID al pool para su reutilización.

### Riesgos Detectados
- **[MUTABLE_CACHE_LEAK]**: `Query.getEntities()` devuelve una referencia al array interno. Si un sistema modifica este array (e.g. `.sort()` o `.pop()`), corromperá la query para todos los demás sistemas.
- **[ENTITY_ID_REUSE]**: Al reutilizar IDs, las referencias externas a un ID pueden volverse "stale" si apuntan a una entidad que ya ha sido reciclada.
