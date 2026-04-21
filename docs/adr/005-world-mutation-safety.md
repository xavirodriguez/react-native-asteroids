# ADR 005: Seguridad de Mutación del Mundo vía WorldCommandBuffer y Protección Spiral of Death

## Contexto
En la arquitectura ECS, modificar la estructura del mundo (añadir/quitar componentes o entidades) mientras se itera sobre una `Query` es una operación peligrosa. Puede causar que entidades sean omitidas, procesadas dos veces o que los iteradores de lenguaje (como `forEach` o `for-of`) lancen errores o se comporten de forma impredecible. Además, el motor carecía de protección contra el "Spiral of Death" en el bucle de tiempo fijo.

## Problema
- **Invalidación de Iteradores**: Los sistemas a menudo necesitan eliminar entidades o componentes basándose en condiciones encontradas durante la iteración de una query.
- **Inconsistencia Mid-Frame**: Si un sistema elimina una entidad, los sistemas posteriores en el mismo frame podrían fallar al intentar acceder a componentes de una entidad que ya no existe lógicamente pero sigue en las listas de otros sistemas.
- **Spiral of Death**: Si la simulación física (Fixed Update) es consistentemente más lenta que el tiempo real, el acumulador de tiempo crece indefinidamente, bloqueando la aplicación.

## Decisión
1. **WorldCommandBuffer**: Se introduce un buffer de comandos que permite registrar operaciones estructurales (`createEntity`, `removeEntity`, `addComponent`, `removeComponent`) para ser ejecutadas de forma diferida.
2. **Ciclo de Flush Atómico**: Se añade un método `world.flush()` que aplica todos los comandos del buffer. Este método es invocado automáticamente por `BaseGame` al final de cada tick de simulación (después de la actualización de sistemas y jerarquías).
3. **Tick Cap en GameLoop**: Se implementa `maxUpdatesPerFrame` (por defecto 240) en el `GameLoop` para descartar tiempo acumulado si se excede el límite, evitando el colapso del rendimiento.

## Consecuencias
- **Positivas**:
    - Estabilidad total durante la iteración de sistemas; no hay riesgo de corromper iteradores.
    - Consistencia garantizada dentro del tick de simulación.
    - El motor es más robusto ante picos de carga de CPU.
- **Negativas**:
    - Los cambios estructurales no son visibles instantáneamente dentro del mismo tick (una entidad "marcada para eliminar" seguirá existiendo hasta el final del tick).
    - Pequeño overhead de memoria por el almacenamiento de comandos en el buffer.

## Plan de migración
- Se recomienda a los desarrolladores de sistemas utilizar `world.getCommandBuffer()` para cualquier cambio estructural realizado dentro de un loop de actualización.
- El `GameLoop` ya aplica la protección de forma transparente.
