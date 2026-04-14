# Contrato de Snapshot y Restore

El sistema de Snapshots permite capturar y restaurar el estado completo del mundo ECS. Este mecanismo es crítico para implementar Rollback en multijugador, Guardado de Partida y Debugging.

## Estructura del Snapshot

Un snapshot capturado mediante `world.snapshot()` contiene:
*   `entities`: Lista ordenada por ID de entidades activas.
*   `componentData`: Mapa de `TipoComponente -> EntityID -> DatosPlanos`.
*   `nextEntityId`: Próximo ID a asignar.
*   `freeEntities`: Pool de IDs reciclables.
*   `version`: Contador de mutaciones del mundo.
*   `seed`: Semilla actual del generador aleatorio de gameplay.

## Reglas de Serialización (Contrato del Componente)

Para que un componente sea compatible con el sistema de snapshots, debe cumplir:

1.  **Datos Planos (Plain Objects)**: Solo se serializan propiedades que no sean funciones.
2.  **No Referencias Circulares**: El objeto debe ser serializable mediante `JSON.stringify`.
3.  **Estado Atómico**: El componente debe contener todo el estado necesario para recrear su comportamiento.

### Excepciones y Casos Especiales

*   **ReclaimableComponent**: La función `onReclaim` se restaura automáticamente si el pool correspondiente está registrado en los recursos del mundo.
*   **StateMachineComponent**: El estado interno de la FSM debe ser capaz de serializarse. Actualmente, las funciones de transición se omiten y deben ser re-vinculadas al restaurar si son dinámicas.

## Proceso de Restauración

Al llamar a `world.restore(snapshot)`:
1.  Se limpian todos los mapas de componentes actuales.
2.  Se reconstruyen los índices y sets de componentes por entidad.
3.  **Invalidación de Queries**: Todas las queries activas se reconstruyen para reflejar el nuevo estado, manteniendo las referencias de los objetos `Query`.
4.  **Reseteo de RNG**: La semilla del `RandomService` se sincroniza con la del snapshot para asegurar determinismo.
