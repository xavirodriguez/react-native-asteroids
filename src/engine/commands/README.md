# Command System

Este módulo implementa el **Command Pattern** adaptado a la arquitectura ECS del motor. Su objetivo es desacoplar por completo la captura de inputs de la ejecución lógica para facilitar el soporte futuro de Netcode Predictivo (Rollback) y sistemas de Replay.

## Componentes

### `CommandQueueComponent`
Almacena una cola de comandos pendientes para el tick actual y un histórico completo indexado por tick.

## Sistemas

### `CommandMapperSystem`
Lee el `InputStateComponent` y traduce las acciones semánticas (ej: `'FORWARD'`) en objetos de comando planos (`GameCommand`). Debe registrarse en la fase de entrada.

### `CommandInvokerSystem`
Consume los comandos de la cola y aplica las mutaciones físicas y lógicas correspondientes. Debe registrarse en la fase de simulación.

## Integración en `BaseGame`

Para utilizar el sistema de comandos, registra los sistemas en tu clase de juego (que extienda de `BaseGame`) durante la inicialización:

```typescript
import { SystemPhase } from './engine/core/System';
import { CommandMapperSystem } from './engine/commands/systems/CommandMapperSystem';
import { CommandInvokerSystem } from './engine/commands/systems/CommandInvokerSystem';

// ... en el método de inicialización o constructor de tu juego
this.world.addSystem(new CommandMapperSystem(), {
  phase: SystemPhase.Input
});

this.world.addSystem(new CommandInvokerSystem(), {
  phase: SystemPhase.Simulation
});
```

Asegúrate de que las entidades que deben responder a comandos posean el componente `CommandQueueComponent`:

```typescript
import { createCommandQueueComponent } from './engine/commands/types';

const player = world.createEntity();
world.addComponent(player, createCommandQueueComponent());
// ... añadir otros componentes como Transform, Velocity, etc.
```
