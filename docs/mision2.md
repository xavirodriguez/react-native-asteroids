Eres un Ingeniero de Software Senior especializado en React Native, Expo, pnpm monorepos y motores de videojuegos ECS. Tu misión es centralizar la lógica de progresión (XP) y desafíos diarios (Daily Challenges) creando un "Game Bridge", eliminando la deuda técnica de código duplicado en las vistas de los juegos.

Garantiza que tu intervención sea estrictamente idempotente.

## Directivas de Arquitectura (Obligatorias)

- **Separación de Responsabilidades (UI vs Lógica):** Las pantallas de juego (`index.tsx`) son lienzos de presentación. No deben contener lógica directa de llamadas a servicios de red o almacenamiento (`DailyChallengeService`, `LeaderboardService`, `PlayerProfileService`).
- **DRY (Don't Repeat Yourself):** Toda lógica de ciclo de vida post-partida (Game Over, cálculo de XP, envío de puntuaciones) debe existir en un único Hook centralizado.

## Fase 0: Diagnóstico e Idempotencia

Antes de modificar ningún archivo, verifica el estado actual:

1. Inspecciona `src/app/flappybird/index.tsx` y `src/app/asteroids/index.tsx`. Busca el bloque de `useEffect` que contiene llamadas a `DailyChallengeService.markAttemptAsUsed` y `LeaderboardService.submitDailyScore` (~20 líneas repetidas).
2. Verifica si ya existe un archivo llamado `useGameSession.ts` (o similar) en tu carpeta de hooks (`src/hooks/`).
   Si el bloque duplicado ya no existe en las pantallas y el hook centralizado ya está implementado, documenta que el entorno está sano y **termina la ejecución sin hacer cambios**.

## Misión 1: Crear el Game Bridge (useGameSession)

Si la Fase 0 detecta código duplicado:

1. Crea un nuevo custom hook `src/hooks/useGameSession.ts`.
2. Este hook debe recibir como parámetros mínimos: `gameId` (string), `isDaily` (boolean), `seed` (number | undefined), y un objeto `gameState` (que contenga `isGameOver` y `score`).
3. Implementa dentro del hook la lógica segura para reaccionar al Game Over:
   - **Progresión Base:** Llama a `PlayerProfileService.addXP()` (ej. score \* 10) y `PlayerProfileService.updateStats()`.
   - **Daily Challenge:** Si `isDaily` es true y `seed` está presente, llama a `DailyChallengeService.markAttemptAsUsed()`, recupera el perfil del jugador, y envía el score con `LeaderboardService.submitDailyScore()`.
4. El hook debe retornar estados útiles para la UI (ej. `showDailyResults`). Asegúrate de usar dependencias correctas o referencias (`useRef`) para evitar enviar el score más de una vez por partida.

## Misión 2: Limpieza Quirúrgica en Pantallas

1. Abre los 4 archivos principales de las pantallas de juego:
   - `src/app/asteroids/index.tsx`
   - `src/app/flappybird/index.tsx`
   - `src/app/pong/index.tsx`
   - `src/app/space-invaders/index.tsx`
2. Elimina el bloque duplicado de `useEffect` relacionado con los Daily Challenges y la gestión manual de `dailySubmittedRef`.
3. Importa e inyecta el nuevo `useGameSession` en cada una de estas pantallas, pasándole los parámetros correspondientes (`gameId`, `isDaily`, `seed`, `gameState`).
4. Usa el estado retornado por el hook (ej. `showDailyResults`) para condicionar el renderizado de modales o UI de resultados.

## Validación Final

1. Ejecuta el typechecker (`pnpm tsc --noEmit` o equivalente) para asegurar que el nuevo hook tipa correctamente con el resto de la app.
2. Comprueba que no hay importaciones huérfanas en los 4 archivos modificados en la Misión 2.
3. Imprime un reporte indicando cuántas líneas de código duplicado se eliminaron en total y confirma que el flujo de XP ahora está conectado.
