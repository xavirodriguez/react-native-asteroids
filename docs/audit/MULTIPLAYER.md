# Multiplayer Audit - Tiny Aster Engine

## Expensive Snapshot Deep Cloning
## Severidad
High
## Categoría
Performance
## Ubicación
`packages/core/src/snapshots/SnapshotSerializer.ts`
`snapshot` y `deltaSnapshot`
## Descripción
Ambos métodos de snapshot realizan un clonado profundo recursivo de cada propiedad de cada componente de cada entidad. Esto se hace usando un `ComponentCloner.cloneComponent(val)`.
## Evidencia
```typescript
        const compAsRecord = component as unknown as Record<string, unknown>;
        for (const key in compAsRecord) {
          const val = compAsRecord[key];
          if (typeof val !== "function") {
            serializedComp[key] = ComponentCloner.cloneComponent(val);
          }
        }
```
## Consecuencias
- **GC Thrashing**: En juegos con muchas entidades (ej: Asteroides), generar snapshots frecuentes para rollback o replicación saturará el recolector de basura.
- **CPU Overhead**: El costo de iterar y clonar recursivamente objetos planos es alto comparado con un enfoque de Data Oriented Design (Arrays Tipados).
## Solución propuesta
Migrar a una arquitectura de componentes basada en arrays planos (SoA - Structure of Arrays) donde el snapshot sea simplemente un `memcpy` o `slice` de un `TypedArray`.
## Dificultad
Muy Alta
## Prioridad
P1

---

## Lack of Binary Serialization in Transport
## Severidad
Medium
## Categoría
Networking
## Ubicación
`packages/network-colyseus/src/ColyseusTransport.ts`
## Descripción
El transporte de Colyseus parece estar enviando objetos JSON planos (a través del SDK de Colyseus que usa msgpack por defecto, pero el motor no parece estar optimizando la estructura de datos antes de enviarla).
## Evidencia
`public send(type: string, message: any): void` recibe un `any` y lo envía directamente.
## Consecuencias
- **Bandwidth**: Enviar nombres de propiedades repetitivamente en cada mensaje de red es ineficiente.
- **Latencia**: Mayor tiempo de serialización/deserialización en el cliente y servidor.
## Solución propuesta
Implementar un protocolo binario estricto (ej: con `Buffer` o `ArrayBuffer`) para los mensajes frecuentes de entrada y sincronización de estado.
## Dificultad
Media
## Prioridad
P2

---

## Non-Deterministic Random Seed Synchronization
## Severidad
Medium
## Categoría
Sincronización
## Ubicación
`packages/core/src/snapshots/SnapshotSerializer.ts`
`snapshot` método.
## Descripción
El snapshot captura el estado del RNG, pero la restauración depende de que la lógica que usa ese RNG sea perfectamente determinista y se ejecute en el mismo orden.
## Evidencia
`rngState: world.gameplayRandom.getSeed(),`
## Consecuencias
Si una rama de código condicional usa el RNG en un cliente pero no en otro debido a una ligera desincronización de entrada, las semillas divergirán permanentemente a pesar de restaurar el snapshot, a menos que el estado completo del generador (no solo la semilla inicial) se restaure correctamente.
## Solución propuesta
Asegurar que el `RandomService` permita capturar y restaurar su estado interno completo (ej: el estado de 32 bits de un LCG o Mersenne Twister) y no solo la semilla.
## Dificultad
Media
## Prioridad
P2
