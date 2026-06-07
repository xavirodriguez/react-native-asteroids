# Guía de Integración del Sistema de Comandos

Esta guía detalla cómo integrar el nuevo sistema de comandos desacoplado en el pipeline de simulación del motor.

## 1. Registro de Sistemas

Para que el sistema funcione según lo previsto, se recomienda registrar los sistemas en las fases adecuadas en la clase base del juego (ej. `BaseGame` o el archivo principal de tu juego).

```typescript
import { SystemPhase } from "../engine/core/System";
import { CommandMapperSystem } from "../engine/commands/systems/CommandMapperSystem";
import { CommandInvokerSystem } from "../engine/commands/systems/CommandInvokerSystem";

// En el método onEnter o de inicialización:
this.world.addSystem(new CommandMapperSystem(), {
  phase: SystemPhase.Input,
  priority: 10
});

this.world.addSystem(new CommandInvokerSystem(), {
  phase: SystemPhase.Simulation,
  priority: 100 // Ejecutar antes que otros sistemas de simulación/física
});
```

## 2. Configuración de Entidades

Las entidades que se pretenda controlar mediante comandos requieren el componente `CommandQueueComponent`.

```typescript
import { createCommandQueueComponent } from "../engine/commands/types";

// Al crear un jugador o entidad controlable:
const player = world.createEntity();
world.addComponent(player, createCommandQueueComponent());
// Añadir también Transform, Velocity, etc.
```

## 3. Flujo de Ejecución

1. **Fase INPUT (`CommandMapperSystem`)**: Lee el estado de `InputStateComponent` y genera objetos `GameCommand` planos que se insertan en la cola `pending` de la entidad.
2. **Fase SIMULATION (`CommandInvokerSystem`)**: Consume la cola `pending`, ejecuta la lógica de simulación (mutando componentes como `Transform` o `Velocity`) y limpia la cola al finalizar.
3. **Fase SIMULATION/PHYSICS**: Los sistemas de física discretos aplican la integración basada en las velocidades ya actualizadas por los comandos.

## 4. Ventajas para Rollback y Replays

- **Serialización**: Los comandos en `CommandQueueComponent.history` están diseñados como POJOs puros para facilitar la serialización.
- **Reproducibilidad**: Se busca evitar lógica oculta o efectos secundarios fuera de `world.mutateComponent` para ayudar a mantener la consistencia entre clientes.
- **Previsibilidad**: En una simulación ideal, el estado del mundo en el tick $N$ depende del estado en $N-1$ y los comandos del tick $N$.
