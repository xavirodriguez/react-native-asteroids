# Registro de Cambios de Auditoría TSDoc

## [2026-07-20] Auditoría TSDoc - Cobertura de Contratos e Invariantes del Motor

### Archivos Documentados de Forma Exhaustiva

1. `packages/core/src/ecs/World.ts` (Core ECS Container)
2. `packages/core/src/runtime/BaseGame.ts` (Game Lifecycle & Loop Coordination)
3. `packages/core/src/network/ReplicationSystem.ts` (Client Prediction, LERP & Reconciliation)

---

### Ejemplos Representativos de Cambios (Antes/Después)

#### 1. Consulta de Componentes (`World.ts` -> `getComponent`)

**Antes:**
```typescript
  /**
   * Returns the component of the specified type associated with an entity.
   *
   * @remarks
   * Object.freeze is applied shallowly to the returned component in DEV mode (__DEV__ === true) to prevent silent mutations.
   * Wrapping is NOT deep-freezing for performance reasons. Direct mutations on nested objects might not throw TypeError at runtime.
   * Under production mode (__DEV__ === false or NODE_ENV === 'production'), Object.freeze is a complete no-op and returns the component directly to avoid any runtime overhead.
   *
   * @param entity - The entity to retrieve the component for.
   * @param type - The component type.
   * @remarks
   * This is a shallow freeze only when __DEV__ is true. Do not deep freeze due to performance reasons.
   */
```

**Después:**
```typescript
  /**
   * Devuelve el componente del tipo especificado asociado a una entidad.
   *
   * @remarks
   * Diseñado para minimizar allocations en producción. En modo desarrollo (`__DEV__` es true),
   * se aplica `Object.freeze` de forma superficial para prevenir mutaciones silenciosas accidentales.
   *
   * @precondition La entidad `entity` debe ser válida y estar activa en el World.
   * @postcondition Devuelve el componente correspondiente o `undefined` si no existe. El componente devuelto en desarrollo es de solo lectura superficial.
   * @invariant El componente devuelto nunca debe ser mutado de forma directa sin usar `mutateComponent`.
   * @throws Ninguno.
   * @sideEffect Ninguno.
   * @conceptualRisk [MEMORY] Devolver la referencia directa en producción permite mutación silenciosa externa sin actualizar `stateVersion`.
   * @conceptualRisk [GC_PRESSURE] El congelamiento en desarrollo se hace de forma superficial para no penalizar el rendimiento con deep freezing.
   *
   * @param entity - El ID de la entidad de la que se obtendrá el componente.
   * @param type - El tipo o clave identificadora del componente.
   * @returns La referencia del componente (congelada superficialmente en desarrollo) o `undefined`.
   */
```

#### 2. Reconciliación de red (`ReplicationSystem.ts` -> `reconcile`)

**Antes:**
```typescript
    /**
     * Reconciles local state with the server state.
     * Replays all inputs that haven't been acknowledged by the server yet.
     */
```

**Después:**
```typescript
    /**
     * Reconcilia el estado lógico del jugador con el estado autoritativo recibido del servidor.
     *
     * @remarks
     * Descarta inputs ya procesados por el servidor, restablece la física local al último tick del servidor,
     * y vuelve a aplicar (replays) todos los inputs pendientes que aún no han sido confirmados para ponerse al día.
     *
     * @precondition El servidor debe haber enviado un tick y estado válidos (`serverState`).
     * @postcondition El estado local del jugador local coincide exactamente con la simulación del servidor extrapolada con los comandos locales pendientes.
     * @invariant Los inputs confirmados son removidos por completo de la cola `inputQueue`.
     * @throws Ninguno.
     * @sideEffect Restablece y muta `Transform` y `Velocity` del jugador local.
     * @conceptualRisk [GC_PRESSURE] El rollback continuo y la re-simulación de múltiples ticks acumulados genera allocations frecuentes al mutar componentes, pudiendo causar stutters bajo alta latencia o pérdida de paquetes de red.
     *
     * @param world - El World de la simulación.
     * @param serverTick - El último número de tick procesado y confirmado por el servidor.
     * @param serverState - El estado autoritativo (posición y velocidad) del jugador remoto en dicho tick del servidor.
     */
```

---

### Decisiones de Criterio Tomadas

- **Idioma Consistente:** Se adoptó estrictamente español para las descripciones e inglés para los tags de TSDoc (`@precondition`, `@postcondition`, `@invariant`, `@conceptualRisk`, etc.), logrando una perfecta legibilidad.
- **Transparencia Técnica:** Se documentaron los riesgos reales de Garbage Collector (GC Pressure) debido a Object.freeze superficial y a la clonación en caliente de componentes durante la reconciliación o snapshots, ayudando a los desarrolladores a ser conscientes de estos trade-offs de rendimiento.
- **Protección de Invariantes:** Se explicitó bajo qué condiciones se lanzan errores y las precondiciones necesarias para el reciclaje de IDs de entidad e invalidaciones de cachés.

---

### Riesgos Conceptuales Detectados y Registrados

1. **`[MEMORY]` en `World.ts`** — En producción, la falta de congelación de componentes permite mutaciones accidentales sin disparar el versionado del estado, pudiendo desincronizar snapshots.
2. **`[GC_PRESSURE]` en `ReplicationSystem.ts`** — La reconciliación repetitiva (rollback y replay de inputs) puede sobrecargar el Garbage Collector móvil ante tirones de red importantes.
3. **`[LIFECYCLE]` en `BaseGame.ts`** — Cualquier interacción con referencias de un World destruido manipulará stale data de forma silenciosa.
