# API Consistency & Protocol Contract Audit - TinyAster

This document audits the consistency of naming conventions, public interfaces, and network message payloads across client and server.

---

## Technical Audit Findings

### 1. Inconsistent Initialization Protocol Naming Across Game Instances

## Título
Inconsistencia Operativa: Uso Desalineado de Métodos de Inicialización (`initialize` contra `init`)

## Severidad
Medium

## Categoría
API

## Ubicación
`src/games/pong/PongGame.ts`, `src/games/asteroids/AsteroidsGame.ts` contra `src/games/flappybird/FlappyBirdGame.ts`

## Descripción
Las clases que representan los diferentes juegos de la arcade implementan firmas y métodos de inicialización completamente dispares. `AsteroidsGame` y `PongGame` exponen el método público asíncrono `initialize(): Promise<void>`. Por el contrario, `FlappyBirdGame` hereda o implementa la firma `init(): Promise<void>`. Esta discrepancia rompe el principio de consistencia de la interfaz de desarrollo (DX), impidiendo que el motor arcade administre el ciclo de vida de los juegos de manera homogénea empleando polimorfismo clásico.

## Evidencia
En `src/games/asteroids/AsteroidsGame.ts`:
```typescript
  public override async initialize(): Promise<void> {
    ...
```
En `src/games/flappybird/FlappyBirdGame.ts`:
```typescript
  public override async init(): Promise<void> {
    ...
```

## Consecuencias
- **DX Deficiente (Developer Experience)**: Los desarrolladores de nuevos módulos deben consultar constantemente la implementación interna de cada clase de juego para saber si deben invocar `.init()` o `.initialize()`.
- **Ruptura de Polimorfismo**: Dificulta enormemente la creación de un `SceneManager` o `ArcadeLoader` genérico capaz de arrancar, pausar o apagar juegos usando interfaces genéricas de ciclo de vida (`IGame`).

## Solución propuesta
Consolidar el contrato de ciclo de vida en la clase base abstracta `BaseGame`. Obligar a que todos los juegos expongan obligatoriamente la misma firma asíncrona unificada (p. ej., `initialize(): Promise<void>`). Marcar cualquier variante obsoleta (como `init()`) como `@deprecated` y proceder a su refactorización.

## Dificultad
Baja

## Prioridad
P2

## Dependencias
Ninguna.

---

### 2. Payload Polución: Falta de Validación y Schema Contract en los Mensajes de Red de Colyseus

## Título
Fragilidad del Contrato de Red: Mensajes Multijugador Serializados de Forma Cruda sin Esquema

## Severidad
Medium

## Categoría
API

## Ubicación
`server/src/AsteroidsRoom.ts` (líneas 75-80) y `packages/network-colyseus/src/ColyseusTransport.ts`

## Descripción
La comunicación de red en tiempo real entre el cliente y el servidor se realiza despachando mensajes serializados crudos (por ejemplo, el mensaje `"input"` de Colyseus) tipados internamente como `any`. No existe un sistema de aserciones o esquemas compartidos en el límite de la red (API Boundaries) que certifique que el payload recibido por la red coincida exactamente con la estructura de datos que los sistemas físicos del juego esperan procesar.

## Evidencia
En `server/src/AsteroidsRoom.ts`:
```typescript
    this.onMessage("input", (client: any, frame: InputFrame) => {
      const buffer = this.inputBuffers.get(client.sessionId) || [];
      buffer.push(frame); // Se asume ciegamente que frame cumple el tipo InputFrame
      this.inputBuffers.set(client.sessionId, buffer);
    });
```

## Consecuencias
- **Poliuria de Memoria por Inputs Maliciosos**: Si el cliente envía de forma accidental o deliberada un mensaje `"input"` con un formato de campos corrupto o tipos de datos erróneos en `actions`, el motor de simulación de Asteroids intentará procesarlo de todas formas, provocando fallas silenciosas en la simulación o deteniendo el ciclo del juego autoritativo para toda la sala.

## Solución propuesta
Implementar un sistema de tipos y esquemas de red unificados de extremo a extremo. Utilizar `zod` para validar los marcos de entrada (`InputFrame`) en cuanto ingresan por el puerto de red de Colyseus, descartando al instante cualquier payload que no cumpla de forma rigurosa con el formato establecido del juego.

## Dificultad
Media

## Prioridad
P2

## Dependencias
Ninguna.
