# Security Audit - TinyAster

This document audits potential security concerns, lack of parameter validation, vulnerability exposures, and authoritative state verification inside the TinyAster server and client codebase.

---

## Technical Audit Findings

### 1. Zero Input Validation on Authoritative Game Room Options

## Título
Inyección de Estado: Ausencia de Validación de Parámetros en la Creación de Salas del Servidor

## Severidad
High

## Categoría
Seguridad

## Ubicación
`server/src/AsteroidsRoom.ts` (método `onCreate`)

## Descripción
El método `onCreate` de la sala de juego Colyseus recibe un objeto genérico `options` enviado directamente por el cliente al unirse o crear una partida. Este objeto es consumido de forma ciega sin pasar por ningún tipo de validación o sanitización. Un atacante malintencionado podría enviar un valor alterado para la variable `seed` (por ejemplo, strings gigantes o tipos inesperados) o inyectar propiedades de red no reconocidas que alteren el flujo del generador de números aleatorios (`RandomService`), pudiendo colapsar el servidor o forzar un estado determinista predecible para realizar trampas.

## Evidencia
En `server/src/AsteroidsRoom.ts`:
```typescript
  async onCreate(options: { seed?: number, replicationMode?: 'legacy' | 'interest' | 'delta' | 'budget' | 'binary' }) {
    if (options.replicationMode) {
        this.REPLICATION_MODE = options.replicationMode;
    }
    this.newClients.clear();
    this.setState(new AsteroidsState());
    this.state.seed = options.seed || Math.floor(Math.random() * 0xFFFFFFFF);
```

## Consecuencias
- **Denegación de Servicio (DoS)**: Un payload corrupto o un tipo inválido en la propiedad `seed` puede gatillar excepciones no controladas en los bucles de física que congelen o tumben el hilo principal de Node.js, dejando desconectados a todos los usuarios de la plataforma de forma simultánea.
- **Predicción de la Partida (Exploits)**: Al poder forzar una semilla arbitraria preestablecida, un jugador tramposo puede conocer de antemano el patrón exacto de aparición y trayectoria de todos los asteroides del mapa para obtener una puntuación récord perfecta de forma fraudulenta.

## Solución propuesta
Implementar un esquema de validación robusto con `zod` al inicio del método `onCreate` de la sala:
```typescript
import { z } from "zod";

const RoomOptionsSchema = z.object({
  seed: z.number().int().positive().optional(),
  replicationMode: z.enum(['legacy', 'interest', 'delta', 'budget', 'binary']).optional()
});

...
  async onCreate(rawOptions: any) {
    const options = RoomOptionsSchema.parse(rawOptions);
    ...
```
Cualquier payload que no se ajuste de forma estricta al contrato debe ser rechazado de forma inmediata con un código de error de red seguro.

## Dificultad
Baja

## Prioridad
P1

## Dependencias
Ninguna.

---

### 2. Guardado Inseguro de Puntajes del Leaderboard Autorizado

## Título
Vulnerabilidad de Manipulación de Puntajes: Escritura Cruda de Leaderboard sin Sanitizar Sesiones

## Severidad
Medium

## Categoría
Seguridad

## Ubicación
`server/src/AsteroidsRoom.ts` (línea 116-121)

## Descripción
Cuando un jugador abandona la partida (`onLeave`), el servidor registra su puntuación de forma directa llamando al almacenamiento local `leaderboardStore.addScore`. Pese a ser teóricamente seguro porque el servidor es autoritativo, el proceso no valida de forma estricta si el usuario completó la ronda de manera honesta o si la desconexión fue simulada deliberadamente para retener un estado de juego ventajoso, ni se limpian de manera segura los caracteres del nombre del jugador (`player.name`) antes de almacenarlos en el leaderboard.

## Evidencia
En `server/src/AsteroidsRoom.ts`:
```typescript
  async onLeave(client: Client, _code: number) {
    const player = this.state.players.get(client.sessionId);
    if (player && player.score > 0) {
        const dateKey = getDateKey();
        console.log(`[AsteroidsRoom] Recording authoritative score for ${player.name}: ${player.score}`);
        leaderboardStore.addScore("asteroids", dateKey, player.sessionId, player.score, player.name, true);
    }
```

## Consecuencias
- **Inyección de Código en Tablas de Clasificación (XSS)**: Si el nombre del jugador (`player.name`) es renderizado posteriormente de forma cruda en una página de administración web sin escapar caracteres HTML, un atacante que se registre con un nombre tipo `<script>alert(1)</script>` podría ejecutar scripts maliciosos en los navegadores de los administradores.

## Solución propuesta
Sanitizar y filtrar rigurosamente el string del nombre del jugador (`player.name`) antes de registrarlo en la base de datos o líderboard, limitando su longitud a caracteres alfanuméricos simples y eliminando cualquier elemento que sugiera marcado HTML o scripts ejecutables.

## Dificultad
Baja

## Prioridad
P2

## Dependencias
Ninguna.
