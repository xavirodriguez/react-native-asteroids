Eres un Ingeniero de Software Senior especializado en TypeScript, arquitectura de motores ECS y patrones de diseño orientados a objetos. Tu misión es unificar el ciclo de inicialización de todos los juegos resolviendo la inconsistencia de APIs y reparando el patrón "Template Method" roto en el motor base.

Garantiza que tu intervención sea estrictamente idempotente.

## Directivas de Arquitectura (Obligatorias)

- **Control de Flujo Jerárquico (Template Method):** La clase padre (`BaseGame`) debe poseer el control absoluto del ciclo de vida (`init`, `restart`). Las subclases nunca deben sobreescribir el flujo principal, solo deben implementar _hooks_ específicos de ciclo de vida definidos por el padre (ej. `onRegisterSystems`).
- **Consistencia de API (Liskov Substitution):** Todos los juegos instanciados deben inicializarse exactamente de la misma manera. Métodos custom como `initialize()` o `registerSystemsAsync()` fuera del control del padre están prohibidos.

## Fase 0: Diagnóstico e Idempotencia

Antes de modificar ningún archivo, verifica el estado actual:

1. Inspecciona `packages/core/src/runtime/BaseGame.ts`. Verifica si ya expone hooks protegidos asíncronos como `protected async onRegisterSystems(): Promise<void>`.
2. Inspecciona `src/games/space-invaders/SpaceInvadersGame.ts`. Verifica si el método `registerSystemsAsync()` ya fue eliminado a favor del hook estándar del padre.
3. Inspecciona `src/games/pong/PongGame.ts`. Verifica si sigue existiendo el método `initialize()` en lugar de heredar `init()`.
   Si `BaseGame` ya define los hooks asíncronos y las subclases los están utilizando correctamente, documenta que el entorno está sano y **termina la ejecución sin hacer cambios**.

## Misión 1: Blindar el Contrato en `BaseGame`

Si la Fase 0 detecta el Template Method roto:

1. En `BaseGame.ts`, refactoriza el método `init(config)` para que sea el único punto de entrada (idealmente `final` si TS lo soportase estrictamente). Debe ejecutar secuencialmente: carga de configuración, un nuevo hook `await this.onRegisterSystems()`, un hook `await this.onInitializeEntities()`, y finalmente `this.start()`.
2. Añade las firmas base (pueden estar vacías o lanzar _NotImplemented_) para los hooks:
   - `protected async onRegisterSystems(): Promise<void>`
   - `protected async onInitializeEntities(): Promise<void>`
   - `protected async onBeforeRestart(): Promise<void>`
3. Refactoriza el método `restart(seed?)` para que sea asíncrono. Debe llamar a `await this.onBeforeRestart()` ANTES de limpiar el mundo y el `sceneManager`, previniendo fugas de memoria, y luego reconstruir el mundo llamando a los nuevos hooks.

## Misión 2: Unificar las Subclases de Juegos

Modifica los archivos de los juegos para que obedezcan el nuevo contrato del padre:

1. **SpaceInvadersGame:** Elimina el método vacío `registerSystems()` y el método `registerSystemsAsync()`. Mueve toda esa lógica al nuevo hook `protected async onRegisterSystems()`. Asegúrate de limpiar el `sceneManager` en `onBeforeRestart()`.
2. **PongGame:** Elimina su método custom `initialize()`. Mueve su lógica de inyección de inputs y red al hook `onRegisterSystems()`.
3. **FlappyBirdGame:** Adapta su lógica de inicialización para utilizar los hooks `onRegisterSystems` y `onInitializeEntities` en lugar de sobreescribir `init` de forma inconsistente.

## Validación Final

1. Ejecuta el typechecker (`pnpm tsc --noEmit` o equivalente) para asegurar que las firmas de los overrides en las subclases coinciden perfectamente con `BaseGame`.
2. Ejecuta los tests unitarios ejecutando `pnpm --filter @tiny-aster/core test` para confirmar que el ciclo de vida del motor no ha sufrido regresiones.
3. Imprime un reporte confirmando la eliminación de métodos no estándar (`initialize`, `registerSystemsAsync`) y la correcta adopción del patrón Template Method.
