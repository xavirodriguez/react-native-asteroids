# Contrato del Sistema de Colisiones y Física

## Propósito
Define el comportamiento del motor de colisiones 2D, la gestión de eventos y la integración con la dinámica de cuerpos rígidos.

## Ciclo de Vida de Colisiones
El `CollisionSystem2D` procesa las colisiones en cada frame siguiendo este orden:
1. **Reset**: Se limpian los buffers de eventos del frame anterior.
2. **Broad-phase**: Se identifican pares potenciales de colisión (Spatial Hash o Sweep & Prune).
3. **CCD (Continuous Collision Detection)**: Para entidades con `ContinuousColliderComponent`, se calcula el TOI (Time of Impact) para evitar túneles.
4. **Narrow-phase**: Test geométrico exacto entre formas (AABB, Círculo).
5. **Notificación**: Se pueblan los `CollisionEventsComponent` y se disparan callbacks.

## Capas y Máscaras
El filtrado de colisiones utiliza operaciones bitwise:
- **Layer**: Categoría a la que pertenece la entidad (potencia de 2).
- **Mask**: Con qué capas puede colisionar.
- **Regla**: Dos entidades A y B colisionan si `(A.layer & B.mask) !== 0` Y `(B.layer & A.mask) !== 0`.

## Triggers vs Colliders
- **Colliders**: Generan manifolds y son procesados por el `PhysicsSystem2D` para respuesta de impulsos.
- **Triggers**: Solo generan eventos de entrada (`enter`), estancia (`stay`) y salida (`exit`). No afectan al movimiento físico.

## Manejo de Eventos
Los eventos se almacenan en el componente `CollisionEvents` de la propia entidad:
- `collisions`: Lista de colisiones activas con datos de manifold (normal, profundidad).
- `triggersEntered / triggersExited`: Listas de entidades que cambiaron de estado en el frame actual.
- **Limpieza**: Los eventos son efímeros y se limpian automáticamente al inicio de cada frame de física.
