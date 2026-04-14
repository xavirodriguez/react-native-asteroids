# Arquitectura de Entrada (Input Architecture)

## Propósito
El sistema de entrada de TinyAsterEngine abstrae el hardware físico (teclado, touch, gamepad) en **acciones semánticas** (ej: "jump", "fire", "thrust"). Esto permite que la lógica del juego sea agnóstica al dispositivo de entrada.

## El Componente InputState
Toda la entrada del usuario se consolida en un único componente singleton `InputStateComponent` en el `World`.
- `actions`: Un mapa de acciones booleanas (`Map<string, boolean>`).
- `axes`: Un mapa de valores numéricos de precisión (`Map<string, number>`), normalmente entre -1 y 1.

## UnifiedInputSystem
Es el sistema encargado de actualizar el `InputState` en cada frame.

### 1. Bindings
Permite mapear múltiples teclas o gestos a una misma acción:
```typescript
inputSystem.bind("shoot", ["Space", "TouchTap", "GamepadButton1"]);
```

### 2. Overrides (Puente con React/UI)
Es la característica más potente para la integración con React Native. Los botones de la UI (JSX) no necesitan acceso al `World` directamente; simplemente llaman a `setOverride`:
```typescript
<Button onPressIn={() => game.setInput({ thrust: true })} />
```
El sistema combina los overrides con la entrada física real: `isPressed = hardwarePressed || overridePressed`.

## Flujo de Datos
1. **Hardware Events**: Los listeners de `window` (Keydown/Pointer) capturan el estado crudo.
2. **System Update**: En la fase `Input`, el `UnifiedInputSystem` consulta los bindings y los overrides.
3. **World State**: Se actualiza el componente `InputState`.
4. **Gameplay Systems**: Los sistemas de movimiento o combate consultan el `InputState` para decidir qué hacer.

## Multijugador y Predicción
Para juegos en red, el estado de entrada se captura en cada tick y se envía al servidor como un `InputFrame`.
- **Determinismo**: Solo las acciones en el `InputState` deben afectar la simulación física.
- **Riesgo [INPUT_DRIFT]**: Actualmente, `getInputState()` (usado para red) solo lee entradas de hardware e ignora los overrides de la UI. Esto significa que si un jugador usa botones táctiles en pantalla, el servidor no recibirá esas acciones.

## Lifecycle
El `UnifiedInputSystem` gestiona listeners globales en `window`. Es **crítico** llamar a `cleanup()` al destruir el juego para evitar fugas de memoria y que eventos de un juego afecten al siguiente.
