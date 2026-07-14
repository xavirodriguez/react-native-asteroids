# Architectural Audit - Tiny Aster Engine

## Core Leaks into UI Layer
## Severidad
High
## Categoría
Arquitectura
## Ubicación
`src/app/asteroids/index.tsx`
`handleMultiplayerInput` y `useEffect` (sincronización multiplayer)
## Descripción
El componente de React (la vista) está manipulando directamente el mundo ECS, mutando componentes y gestionando la predicción/reconciliación local. Hay casts a `any` y `unknown` para acceder a propiedades internas de los juegos.
## Evidencia
```typescript
  useEffect(() => {
    if (isMulti && connected && game) {
      (game as unknown as AsteroidsGame).setMultiplayerMode(true);
    }
  }, [isMulti, connected, game]);

  // ...

  const localPlayer = world?.query("LocalPlayer" as any)[0];
  if (localPlayer !== undefined && world) {
    world.mutateComponent(localPlayer, "InputState" as any, (inputComp: any) => {
      // ...
    });
  }
```
## Consecuencias
- **Violación de Hexagonal Architecture**: La capa de infraestructura (UI) conoce y manipula detalles del dominio (ECS World).
- **Acoplamiento**: Si cambia la estructura de componentes ECS, hay que actualizar la UI.
- **Dificultad de Testeo**: La lógica de predicción y entrada está atrapada en un componente de React.
## Solución propuesta
Encapsular la lógica de entrada y sincronización multiplayer dentro de sistemas ECS dedicados o servicios de juego que la UI consuma a través de una API limpia (comandos).
## Dificultad
Alta
## Prioridad
P0

---

## Service Layer Responsibility Overlap
## Severidad
Medium
## Categoría
Arquitectura
## Ubicación
`src/services/`
## Descripción
Existen múltiples servicios (`DailyChallengeService`, `LeaderboardService`, `PlayerProfileService`) que se llaman directamente desde los componentes de React junto con lógica de juego.
## Evidencia
`src/app/asteroids/index.tsx` líneas 100-115 gestionan la sumisión de puntuaciones directamente en un `useEffect`.
## Consecuencias
- Lógica de negocio dispersa entre componentes y servicios.
- Difícil de reutilizar para otros juegos o plataformas sin duplicar orquestación.
## Solución propuesta
Introducir un "Game Coordinator" o "Use Case" que orqueste la interacción entre el juego, el perfil del jugador y los servicios externos.
## Dificultad
Media
## Prioridad
P2
