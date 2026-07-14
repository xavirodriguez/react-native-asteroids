# Security Audit - Tiny Aster Engine

## Client-Side Score Validation Risk
## Severidad
High
## Categoría
Seguridad
## Ubicación
`src/app/asteroids/index.tsx`
## Descripción
La puntuación se calcula enteramente en el cliente y se envía al servidor sin validación de integridad.
## Evidencia
```typescript
      LeaderboardService.submitDailyScore(
        "asteroids",
        DailyChallengeService.getDateKey(),
        score,
        // ...
      );
```
## Consecuencias
Vulnerabilidad crítica ante trampas (cheating) en las tablas de clasificación globales.
## Solución propuesta
Implementar validación en el servidor re-simulando el juego a partir del snapshot inicial y el buffer de entradas del jugador.
## Dificultad
Alta
## Prioridad
P1
