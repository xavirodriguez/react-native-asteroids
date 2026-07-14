# Type Safety Audit - Tiny Aster Engine

## Permissive ESLint Overrides for Core
## Severidad
Medium
## Categoría
Tipos
## Ubicación
`eslint.config.mjs`
## Descripción
Aunque existen reglas estrictas para el core (`packages/core/src/**/*.ts`), el resto del proyecto (incluyendo los juegos y hooks de integración) permite el uso de `any` con solo un aviso (`warn`).
## Evidencia
```javascript
      "@typescript-eslint/no-explicit-any": "warn",
```
En el análisis inicial se encontraron **181 instancias de `any`**.
## Consecuencias
- Falsa sensación de seguridad de tipos.
- Errores en tiempo de ejecución difíciles de rastrear al pasar datos no validados entre la UI y el motor.
- Dificulta la refactorización segura.
## Solución propuesta
Cambiar `@typescript-eslint/no-explicit-any` a `error` globalmente y forzar el uso de genéricos o tipos más específicos (ej: `InputState`).
## Dificultad
Media (debido a la cantidad de cambios)
## Prioridad
P1

---

## Excessive Type Assertion (Casting)
## Severidad
High
## Categoría
Tipos
## Ubicación
General (353 ocurrencias)
## Descripción
Uso excesivo de `as`, `as any` y `as unknown as Type` para saltarse las restricciones del compilador, especialmente en la integración con el motor.
## Evidencia
`src/app/asteroids/index.tsx`:
`(game as unknown as AsteroidsGame).setMultiplayerMode(true);`
`world?.query("LocalPlayer" as any)`
## Consecuencias
- Riesgo crítico de `TypeError` en tiempo de ejecución.
- El compilador no puede verificar que el objeto realmente tenga los métodos o propiedades esperados.
## Solución propuesta
Refactorizar los genéricos en `useGame` y las clases base para que el tipado fluya correctamente sin necesidad de casts manuales.
## Dificultad
Alta
## Prioridad
P1

---

## Stringly-Typed ECS World Queries
## Severidad
Medium
## Categoría
Tipos
## Ubicación
`packages/core/src/ecs/World.ts`
## Descripción
Aunque el `World` usa genéricos para los componentes, las consultas a menudo se degradan a strings o requieren `as any` porque los registros de componentes no están bien propagados.
## Evidencia
`world?.query("LocalPlayer" as any)`
## Consecuencias
Cambiar el nombre de un componente o tipo no activará errores del compilador en las queries de la UI.
## Solución propuesta
Asegurar que todas las queries utilicen el tipo `ComponentType<TComponents>` derivado del registro del juego.
## Dificultad
Media
## Prioridad
P2
