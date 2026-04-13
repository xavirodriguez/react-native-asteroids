# Arquitectura de Entrada (Input Architecture)

## Propósito
La capa de entrada de TinyAsterEngine abstrae los eventos de hardware (teclado, gestos táctiles) en **Acciones Semánticas** y **Ejes**. Esto permite que los sistemas de juego reaccionen a intenciones (e.g., "saltar", "disparar") en lugar de teclas específicas.

## Flujo de Datos de Entrada

1.  **Hardware Listeners**: `UnifiedInputSystem` registra listeners globales en `window` para eventos de `keydown`, `keyup`, `pointerdown` y `pointerup`.
2.  **Raw Input State**: El sistema mantiene un conjunto (`Set`) de teclas y gestos actualmente activos.
3.  **Binding Mapping**: El sistema traduce las entradas crudas a acciones semánticas utilizando un mapa de configuración definido por el juego.
4.  **InputState Singleton**: El estado traducido se inyecta en un componente singleton `InputStateComponent` en el `World`.
5.  **System Consumption**: Los sistemas (e.g., `ShipControlSystem`) consultan el singleton para tomar decisiones de lógica.

## Conceptos Clave

### Acciones Semánticas
Son banderas booleanas que indican si una acción está activa.
- Ejemplo: `bind("shoot", ["Space", "TouchTap"])`.

### Ejes (Axes)
Son valores normalizados (típicamente entre -1.0 y 1.0) para movimiento continuo.
- Ejemplo: `bindAxis("horizontal", ["ArrowRight"], ["ArrowLeft"])`.

### Overrides Programáticos
El sistema permite forzar el estado de una acción mediante `setOverride(action, isPressed)`.
- **Casos de Uso**: Controles en pantalla (botones de la UI de React), comandos recibidos por red en modo multijugador, o tutoriales guiados.
- **Prioridad**: Los overrides tienen prioridad sobre la entrada de hardware o se combinan con ella (OR lógico).

## Integración con React Native
Para los controles táctiles complejos (como joysticks virtuales), se recomienda utilizar `BaseGame.setInput(partialInput)` desde los componentes de React, lo que utiliza internamente el mecanismo de overrides para inyectar el estado en el motor ECS.

## Riesgos y Limitaciones
- **[INPUT_DRIFT][HIGH]**: `getInputState()` (usado para red) actualmente ignora los `overrides`, lo que puede causar que un jugador remoto no vea las acciones realizadas a través de botones táctiles de la UI.
- **[LIFECYCLE][HIGH]**: Los listeners se registran globalmente y deben ser limpiados explícitamente mediante `unifiedInput.cleanup()` al destruir el juego para evitar fugas de memoria y efectos fantasma en otras partes de la app de Expo.
