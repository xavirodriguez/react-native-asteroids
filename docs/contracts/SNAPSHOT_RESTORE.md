# Contrato de Snapshot y Restauración del Mundo

## Propósito
Este documento define los requisitos y garantías para la serialización (`snapshot`) y restauración (`restore`) del estado del mundo ECS. Este contrato es crítico para el determinismo, el soporte de rollback en juegos multijugador y el guardado de partidas.

## Estructura del Snapshot
Un snapshot es un objeto plano (POJO) que debe contener:
- **entities**: Lista de IDs de entidades activas, ordenada por ID.
- **componentData**: Mapa de `ComponentType -> EntityID -> Data`.
- **nextEntityId**: El siguiente ID de entidad a asignar.
- **freeEntities**: Lista de IDs de entidades disponibles en el pool.
- **version**: Contador de cambios estructurales del mundo.
- **seed**: Estado actual del generador de números aleatorios de gameplay.

## Reglas de Serialización
1. **Solo Datos Planos**: Los componentes deben contener únicamente datos primitivos, objetos planos o arrays.
2. **Exclusión de Funciones**: No se deben serializar métodos, callbacks ni referencias circulares.
3. **Determinismo**: La restauración de un snapshot debe resultar en un estado del mundo idéntico al momento de la captura, incluyendo el estado del RNG.
4. **Caché de Queries**: Al restaurar, todas las queries activas deben invalidarse y reconstruirse para reflejar el nuevo estado.

## Requisitos de Componentes
Para asegurar una restauración correcta, los componentes que gestionan recursos externos (como pools o callbacks) deben implementar una lógica de "re-vinculación":
- El componente `Reclaimable` debe restaurar su callback `onReclaim` a partir de los recursos disponibles en el mundo tras la restauración.

## Garantías
- El `World` garantiza que la restauración es una operación atómica.
- No se mantienen referencias a los objetos de datos del snapshot original (se utiliza `structuredClone`).
