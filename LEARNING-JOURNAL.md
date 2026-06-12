# Learning Journal - React Native Asteroids Refactor

## Semana 1: Diagnóstico y Limpieza Profunda

### Día 1: Análisis Final y Auditoría de Tipos
**Estado Inicial:**
- Se han identificado 70 ocurrencias de `any` en `packages/core/src`.
- Muchos `any` están en sistemas core (`MovementSystem`, `ParticleSystem`) y utilidades (`Juice.ts`), lo que debilita la seguridad de tipos del motor.
- El `WorldCommandBuffer` usa `any` para las funciones de comando y el parámetro `world` en `flush`, lo que impide la inferencia correcta al usarlo desde los sistemas.

**Hallazgos Clave:**
1. **ECS e Infraestructura:** `WorldCommandBuffer` y `World` aún tienen fugas de tipos. Se requiere que el CommandBuffer conozca el tipo de World con el que trabaja.
2. **Sistemas Core:** `MovementSystem` usa casts a `any` para obtener componentes como `Transform` y `Velocity`. Esto debe resolverse usando componentes core estandarizados o genéricos.
3. **EventBus:** Usa `any` en los payloads internos de los listeners.
4. **Acoplamiento Ligero:** Aunque el core es bastante independiente, hay menciones de `any` en `BaseGameStateSystem` que podrían tiparse mejor.

**Decisiones Arquitectónicas:**
- Se priorizará el tipado estricto en el `World` y `WorldCommandBuffer` para asegurar que los desarrolladores de juegos tengan autocompletado y validación real.
- Los sistemas core se refactorizarán para usar los tipos genéricos del `World` en lugar de casts manuales.

---
*(Próxima actualización: Día 2 - Configuración de Monorepo)*
