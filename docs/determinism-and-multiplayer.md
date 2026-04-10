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

## Arquitectura Multijugador (Lockstep / Snapshot Interpolation)

### Cliente
1. **Client-Side Prediction**: El cliente aplica localmente los inputs del jugador de forma inmediata (vía `predictLocalPlayer`).
2. **Input Buffering**: Se almacenan los inputs locales con su `tick` correspondiente y se envían al servidor.
3. **Interpolación de Entidades Remotas**: Las entidades de otros jugadores no se "teletransportan"; se interpolan suavemente entre los últimos dos snapshots recibidos del servidor utilizando un buffer de 100ms.
4. **Reconciliación**: Si la posición del servidor difiere significativamente (>5px) de la predicha localmente, el cliente realiza un "snap" a la posición autoritativa y re-aplica los inputs pendientes.

### Servidor (Colyseus)
- Es la autoridad final sobre el estado del mundo.
- Ejecuta la misma lógica ECS que el cliente.
- Mantiene un historial de snapshots para **Lag Compensation** (validación de hits en el pasado).

## Riesgos de Determinismo
- **[DETERMINISM][CRITICAL]**: Lógica duplicada entre sistemas ECS (`MovementSystem`) y funciones de predicción (`predictLocalPlayer`). Cualquier cambio en uno debe replicarse en el otro para evitar desincronización constante.
- **[DETERMINISM][HIGH]**: El uso de `Date.now()` para efectos visuales (como parpadeos de invulnerabilidad) puede causar que dos clientes vean estados distintos si sus relojes de sistema no están perfectamente sincronizados.
