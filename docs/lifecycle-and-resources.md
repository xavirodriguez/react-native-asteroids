# Ciclo de Vida y Gestión de Recursos

## Ciclo de Vida del Motor (`BaseGame`)

El motor sigue un ciclo de vida estricto orquestado por la clase `BaseGame`:

1.  **Instanciación**: Creación del `World`, `GameLoop` y sistemas de infraestructura.
2.  **`init()`**:
    - Carga de recursos externos (assets).
    - Registro de sistemas core (XP, Palette, Mutators).
    - Registro de sistemas específicos del juego.
    - Inicialización de entidades iniciales.
3.  **`start()`**: Inicia el latido del `GameLoop`.
4.  **`pause()` / `resume()`**: Detiene o reanuda el procesamiento de ticks, manteniendo el estado intacto.
5.  **`restart()`**:
    - Ejecuta el hook opcional `_onBeforeRestart`.
    - Delega el reinicio a la escena actual o limpia el `World` global.
    - Re-inicializa entidades.
6.  **`destroy()`**: Detiene el loop, limpia listeners y libera referencias para el GC.

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
