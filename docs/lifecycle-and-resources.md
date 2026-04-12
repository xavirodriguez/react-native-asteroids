# Ciclo de Vida y Gestión de Recursos

## Ciclo de Vida del Motor (`BaseGame`)

El motor sigue un ciclo de vida estricto orquestado por la clase `BaseGame`:

1.  **Constructor**: Inicialización de subsistemas (`World`, `GameLoop`, `UnifiedInput`, `SceneManager`) y registro de `EventBus` como recurso global.
2.  **`init()`**:
    - Registro de sistemas de motor (XP, Palette).
    - Ejecución de `registerSystems()` (específico del juego).
    - Ejecución de `initializeEntities()`.
3.  **`start()`**: Inicia el latido del `GameLoop`.
4.  **`pause()` / `resume()`**: Detiene o reanuda la simulación lógica. Notifica a la escena y a los listeners de la UI.
5.  **`restart()`**:
    - Limpieza asíncrona vía `runLifecycleAsync`.
    - Reseteo del `World` o de la escena activa.
    - Re-inicialización completa de entidades.
6.  **`destroy()`**:
    - `stop()` del loop.
    - `cleanup()` del sistema de entrada (eliminación de listeners de `window`).
    - Limpieza de suscriptores de UI.

## Gestión de Recursos (Resources API)

El `World` proporciona un almacén de **Recursos** para datos que no encajan en el modelo de entidades/componentes:

- **Singletons Globales**: Servicios compartidos como el `EventBus`.
- **Estado de Red**: Lista de sesiones conectadas (`connectedSessions`).
- **Configuración Dinámica**: Parámetros de mutadores activos.

### Event Bus
El motor utiliza un `EventBus` tipado para la comunicación desacoplada:
- **Namespacing**: Soporta eventos con nombres como `game:score_changed`.
- **Wildcards**: Permite suscribirse a patrones como `entity:*`.
- **Ownership**: El `EventBus` reside como un recurso en el `World` y también como un componente singleton para ser accesible por los sistemas.

## Invariantes de Recursos
- Los recursos deben ser registrados preferiblemente durante la fase de `init()`.
- Los sistemas no deben depender de la existencia de un recurso a menos que sea un contrato garantizado por el motor (e.g., `EventBus`).

## Riesgos de Ciclo de Vida
- **[LIFECYCLE][MEDIUM]**: El reinicio del mundo no limpia automáticamente los recursos (Resources), lo que puede llevar a estados "sucios" si un recurso guarda datos de la sesión anterior.
- **[LIFECYCLE][LOW]**: Las escenas (`SceneManager`) tienen su propio ciclo de vida que debe estar sincronizado con el del `BaseGame`.
