# Type Safety Audit - TinyAster

This document audits the use of TypeScript, type structures, casts, and overall safety policies across the entire monorepo.

---

## Technical Audit Findings

### 1. TypeScript Strict Checks Totally Disabled on Server

## Título
Compilación Laxa: `"strict": false` en la Configuración de TypeScript del Servidor

## Severidad
Critical

## Categoría
Tipos

## Ubicación
`server/tsconfig.json` (línea 6)

## Descripción
El archivo de configuración de TypeScript para el servidor autoritativo define `"strict": false`. Esto desactiva por completo la validación rigurosa de tipos en todo el backend del proyecto. Con esta configuración, se permiten comportamientos propensos a errores fatales de ejecución, tales como:
- Valores implícitamente tipados como `any`.
- Ausencia de chequeo sobre valores nulos o indefinidos (`strictNullChecks`), lo que expone al servidor a fallos catastróficos tipo `TypeError: Cannot read property ... of undefined`.
- Falta de verificación estricta para firmas de funciones, enlazado de `this`, y tipos de retorno.

## Evidencia
En `server/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "esnext",
    "module": "commonjs",
    "lib": ["esnext", "dom"],
    "strict": false,
    ...
```

## Consecuencias
- **Inestabilidad del Servidor en Producción**: Los errores de referencias nulas no son detectados en tiempo de compilación. Un fallo silencioso en un puntero puede tumbar la sala de juego (`Colyseus Room`) afectando a múltiples jugadores conectados simultáneamente.
- **Degradación de la Calidad del Código**: Los ingenieros pueden escribir código sin preocuparse de la nulabilidad o tipado adecuado, facilitando la proliferación de deudas técnicas difíciles de corregir a futuro.

## Solución propuesta
Activar `"strict": true` en `server/tsconfig.json`. Se debe proceder a corregir de inmediato todos los errores de tipado resultantes (que surgirán de forma masiva en `AsteroidsRoom.ts`, `schema/GameState.ts`, etc.), garantizando que todas las propiedades sean inicializadas o marcadas explícitamente como opcionales/anulables.

## Dificultad
Media

## Prioridad
P1

## Dependencias
Ninguna.

---

### 2. Uso Generalizado e Inseguro de "any" y Casts de Tipos en el Núcleo del Sistema

## Título
Bypass de Seguridad: Casts de Componentes Mediante Cadenas y Uso Descontrolado de 'any'

## Severidad
High

## Categoría
Tipos

## Ubicación
Múltiples archivos, notablemente en `packages/core/src/network/ReplicationSystem.ts` y `packages/renderer-canvas/src/CanvasRenderer.ts`

## Descripción
En lugar de aprovechar el registro fuertemente tipado de componentes que el propio ECS provee, varios subsistemas críticos recurren a aserciones de tipos arbitrarias (usando `as any`, `as Extract<...>`, o `as ComponentType<TRegistry>`) para saltarse el compilador. Esto anula todas las ventajas de usar TypeScript, transformando la validación estática de tipos en una mera ilusión de tipado en tiempo de desarrollo.

## Evidencia
En `packages/core/src/network/ReplicationSystem.ts`:
```typescript
const remoteQuery = world.query("Transform" as ComponentType<TRegistry>, "RemotePlayer" as ComponentType<TRegistry>);
for (const entity of remoteQuery) {
    const transform = world.getComponent(entity, "Transform" as ComponentType<TRegistry>) as any;
    const remote = world.getComponent(entity, "RemotePlayer" as ComponentType<TRegistry>) as any;
```
Y en `packages/renderer-canvas/src/CanvasRenderer.ts`:
```typescript
const transformType = "Transform" as Extract<keyof TRegistry, string>;
```

## Consecuencias
- **Errores de Refactorización Indetectables**: Si un desarrollador decide renombrar la propiedad `rotation` a `angle` en el componente `TransformComponent`, el compilador no detectará ninguna discrepancia en `ReplicationSystem` porque las variables están tipadas como `any`. La física fallará silenciosamente o explotará en tiempo de ejecución.
- **Pérdida de Autocompletado y DX**: El desarrollador pierde el soporte de IDEs (IntelliSense) al manipular las entidades dentro de estos sistemas clave.

## Solución propuesta
Refactorizar `ReplicationSystem` y los renderizadores para utilizar tipos genéricos de registro robustos. La clase `World` ya posee la firma adecuada de componentes; por tanto, los métodos deberían invocar directamente las claves del registro (ej. `world.getComponent(entity, "Transform")`) sin necesidad de forzar casts arbitrarios.

## Dificultad
Media

## Prioridad
P1

## Dependencias
Ninguna.

---

### 3. Falta de Tipado Fuerte en la Gestión de Eventos (EventBus)

## Título
Eventos Ciegos: Uso de Cadenas Arbitrarias en el Bus de Eventos (as any)

## Severidad
Medium

## Categoría
Tipos

## Ubicación
`server/src/AsteroidsRoom.ts` (línea 96) y `packages/core/src/events/EventBus.ts`

## Descripción
El motor implementa un bus de eventos (`EventBus`), pero el uso de este en las clases de juego carece de un mapeo estricto de eventos y payload correspondientes. En su lugar, se asume un tipado genérico extremadamente permisivo o directamente se castea el identificador del evento como `any`, permitiendo el registro de escuchas para eventos inexistentes o con parámetros incorrectos.

## Evidencia
En `server/src/AsteroidsRoom.ts`:
```typescript
this.world.getEventBus().on("game:over" as any, () => {
    this.state.gameOver = true;
    console.log(`[AsteroidsRoom] Game Over...`);
});
```

## Consecuencias
- **Suscripciones Huérfanas**: Si el núcleo del juego cambia el nombre del evento emitido de `"game:over"` a `"game_over"`, el servidor de Colyseus seguirá suscrito a `"game:over" as any` sin lanzar ningún aviso de error. El estado de la partida se quedará congelado en bucle sin finalizar jamás.

## Solución propuesta
Definir un diccionario fuertemente tipado de eventos en `AsteroidsEventRegistry` que asocie de manera unívoca el nombre del evento con la firma del callback esperado:
```typescript
export interface AsteroidsEventRegistry {
  "game:over": () => void;
  "player:joined": (player: PlayerInfo) => void;
}
```
Esto garantizará que `.on()` y `.emit()` sean estrictamente controlados en tiempo de compilación.

## Dificultad
Baja

## Prioridad
P2

## Dependencias
Ninguna.
