# Determinismo y Multijugador

## Timestep Fijo (60 Hz)
El motor utiliza un **Game Loop con acumulador**.
- La lógica de juego siempre recibe un `fixedDeltaTime` de 16.66ms.
- Esto garantiza que la física sea consistente independientemente de si el dispositivo renderiza a 30, 60 o 120 FPS.
- **Protección contra Spiral of Death**: Si el dispositivo es demasiado lento, el acumulador se capa a `maxDeltaTime` (100ms) para evitar que el motor intente recuperar demasiados frames y se bloquee.

## Fuentes de Aleatoriedad
El uso de `Math.random()` está prohibido en la lógica de simulación.
- Se debe utilizar `RandomService.getInstance("gameplay")`.
- Este servicio utiliza un generador PRNG (Pseudo-Random Number Generator) con una semilla (`seed`) compartida.
- **Visuales**: Para efectos no críticos (como el parpadeo de una estrella o el humo de una explosión), se usa `RandomService.getInstance("render")` para evitar "quemar" la semilla de la simulación.

## Arquitectura Multijugador (Deterministic Lockstep)

El motor implementa un modelo de **Deterministic Lockstep** para garantizar la paridad total del estado entre clientes.

### Cliente
1. **Client-Side Prediction**: El cliente aplica localmente los inputs del jugador de forma inmediata en la simulación ECS.
2. **Input Buffering (`InputBuffer.ts`)**: Se almacenan los inputs locales e internacionales indexados por `tick`.
3. **Lockstep Stalling**: La simulación se detiene (`BaseGame._isTickReady`) si faltan inputs de algún jugador para el tick actual, garantizando que todos procesen exactamente lo mismo.
4. **Estado Checksum**: Se generan hashes del estado del mundo (`StateHasher`) para detectar desincronizaciones ("divergence") de forma proactiva.

### Servidor (Colyseus)
- Actúa como relé determinista de inputs.
- Opcionalmente puede ejecutar la simulación para actuar como autoridad y prevenir trampas (Server Authority).

## Riesgos de Determinismo
- **[DETERMINISM][CRITICAL]**: Lógica duplicada entre sistemas ECS (`MovementSystem`) y funciones de predicción (`predictLocalPlayer`). Cualquier cambio en uno debe replicarse en el otro para evitar desincronización constante.
- **[DETERMINISM][HIGH]**: El uso de `Date.now()` para efectos visuales (como parpadeos de invulnerabilidad) puede causar que dos clientes vean estados distintos si sus relojes de sistema no están perfectamente sincronizados.
