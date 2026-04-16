# Guía de Onboarding para Desarrolladores de Motor

Bienvenido al desarrollo de TinyAsterEngine. Esta guía te ayudará a extender el juego de forma segura.

## Cómo Crear un Nuevo Sistema

1. Crea un archivo en `src/engine/systems/` o `src/games/tu_juego/systems/`.
2. Extiende la clase `System`.
3. Define tu lógica en el método `update`.
4. **Importante**: No guardes estado en el sistema. Si necesitas guardar algo (como un temporizador), crea un nuevo componente y asígnalo a una entidad singleton.

```typescript
export class MiNuevoSystem extends System {
  update(world: World, deltaTime: number) {
    const entities = world.query("MiComponente");
    // Lógica aquí...
  }
}
```

## Cómo Añadir un Nuevo Componente

1. Añade la interfaz en `src/engine/core/CoreComponents.ts` (si es genérico) o en los tipos de tu juego.
2. Asegúrate de incluir el campo `type`.
3. Documenta las unidades (píxeles, milisegundos, radianes).

```typescript
export interface MiComponente extends Component {
  type: "MiComponente";
  valor: number; // en píxeles
}
```

## Reglas de Oro para el Determinismo
- **NUNCA** uses `Math.random()`. Usa `RandomService.getInstance("gameplay").next()`.
- **NUNCA** uses `Date.now()`. Usa el `deltaTime` proporcionado por el sistema o mantén un contador de ticks.
- **NUNCA** asumas el orden de ejecución de las entidades dentro de una query.

## Cómo Depurar
- Activa el modo debug: `world.debugMode = true`.
- Usa el `SystemProfiler` para ver el coste de tus sistemas.
- Visualiza colisiones añadiendo el componente `DebugConfig` al World.

## Flujo de Trabajo para Nuevas Funcionalidades
1. Define los datos (Componentes).
2. Define la lógica (Systems).
3. Define la visualización (ShapeDrawers).
4. Registra todo en la clase de tu juego (extensión de `BaseGame`).
