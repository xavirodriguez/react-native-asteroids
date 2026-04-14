# Contrato de Colisiones y Eventos

El sistema de física y colisiones (`PhysicsSystem2D` + `CollisionSystem2D`) gestiona la detección y resolución de contactos entre entidades.

## Ciclo de Vida de los Eventos

Los eventos de colisión se gestionan mediante el `CollisionEventsComponent`.

1.  **Detección**: Ocurre en la fase de `Collision`.
2.  **Escritura**: El sistema limpia el `CollisionEventsComponent` del frame anterior y escribe los nuevos contactos.
3.  **Consumo**: Los sistemas de gameplay (GameRules) deben leer estos eventos en el mismo frame.
4.  **Limpieza**: Al inicio del siguiente ciclo de colisión, los arrays `collisions`, `triggersEntered` y `triggersExited` se vacían.

## Tipos de Contacto

*   **Collision**: Contacto físico entre cuerpos sólidos. Genera un `manifold` con normal y profundidad de penetración.
*   **Trigger**: Solapamiento con un collider marcado como `isTrigger: true`. No genera resolución física, solo notificaciones de entrada/salida.

## Capas y Máscaras (Filtering)

El motor utiliza un sistema de bits para filtrar colisiones:
*   `layer`: Bit representativo de la entidad.
*   `mask`: Máscara de bits con los que esta entidad puede colisionar.

La colisión ocurre si: `(A.layer & B.mask) !== 0 && (B.layer & A.mask) !== 0`.

## Continuous Collision Detection (CCD)

Entidades de alta velocidad (balas, proyectiles) deben usar el componente `ContinuousColliderComponent`. Esto activa un ray-casting o barrido entre la posición anterior y la actual para evitar el "tunneling" (atravesar paredes).
