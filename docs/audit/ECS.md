# Entity Component System (ECS) Audit - TinyAster

This document assesses the design, implementation, safety, and integration of the custom Entity Component System (ECS) engine driving TinyAster.

---

## Technical Audit Findings

### 1. Tight Coupling of Rendering to Physics Colliders

## Título
Inversión de Responsabilidades: El Dibujado de Entidades Depende de Componentes Físicos (Collider)

## Severidad
High

## Categoría
Arquitectura

## Ubicación
`packages/renderer-canvas/src/CanvasRenderer.ts` (línea 66-74) y `packages/renderer-skia/src/SkiaRenderer.ts` (línea 86-93)

## Descripción
En un ECS puro, los renderizadores deberían basar sus decisiones de dibujado exclusivamente en el componente de presentación (`Render` o similar) y sus propiedades estéticas (color, opacidad, textura). Sin embargo, TinyAster acopla fuertemente el renderizado a la presencia de un componente `Collider` (que es puramente físico). Si la entidad no posee un componente `Collider` habilitado, los renderizadores Canvas y Skia ignoran cualquier forma específica registrada y recurren a dibujar un círculo genérico de radio 5. Esto impide tener entidades visibles puras que carezcan de colisiones físicas (por ejemplo: estrellas de fondo, estelas de humo, partículas estéticas, indicadores de interfaz o efectos de pantalla).

## Evidencia
En `packages/renderer-canvas/src/CanvasRenderer.ts`:
```typescript
      const collider = world.getComponent(entity, colliderType) as ColliderComponent | undefined;
      if (collider && collider.enabled) {
        const shapeTypeStr = ShapeType[collider.shape.type];
        const drawer = this.shapeDrawers.get(shapeTypeStr);
        if (drawer) {
          drawer.draw(ctx, world, entity);
        }
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, 5, 0, Math.PI * 2);
        ctx.fill();
      }
```

## Consecuencias
- **Limitación en Diseño de Niveles y Efectos**: No es posible crear efectos de partículas de alto rendimiento o fondos estrellados complejos con formas personalizadas sin forzar la adición de un componente `Collider`, lo que además satura inútilmente la base de datos de colisiones físicas del `BroadPhase` y `NarrowPhase`.
- **Rendimiento Degradado en Física**: Añadir colisionadores "falsos" solo para poder dibujar sprites personalizados introduce una enorme penalización computacional en el sistema de colisiones.

## Solución propuesta
Desacoplar la lógica. El componente `Render` debe contener una propiedad `shape` o `sprite` (como ya ocurre parcialmente en FlappyBird). El renderizador debe buscar el tipo de renderizado a partir del componente `Render` y llamar a su correspondiente `ShapeDrawer`. La presencia de un `Collider` debe ser consultada únicamente por el motor físico (`CollisionSystem`), no por los renderizadores de gráficos.

## Dificultad
Media

## Prioridad
P1

## Dependencias
Ninguna.

---

### 2. Flush Desbalanceado y Desincronización del CommandBuffer

## Título
Riesgo de Estado Inconsistente: Ejecución Manual y Potencialmente Omitida del Flushing del CommandBuffer

## Severidad
Medium

## Categoría
Sincronización

## Ubicación
`packages/core/src/ecs/World.ts` (método `update` e invocaciones de `flush`)

## Descripción
Para evitar la invalidación de iteradores en los sistemas de simulación al crear o remover entidades/componentes sobre la marcha, el motor dispone de un `WorldCommandBuffer` para diferir estos cambios estructurales. No obstante, el vaciado (`flush()`) se ejecuta automáticamente de forma estricta al final del método `update()` de la clase `World`. Si un integrador externo del juego (como un puente React Native o el servidor Colyseus) manipula directamente componentes en caliente o despacha comandos fuera del método `update()`, el `CommandBuffer` se quedará sin vaciar hasta el siguiente tick, provocando un retraso artificial de un frame en la aparición o desaparición de entidades visuales.

## Evidencia
En `packages/core/src/ecs/World.ts`:
```typescript
  update(deltaTime: number): void {
    this._tick++;
    this.isUpdating = true;
    RandomService.lockGameplayContext = true;
    try {
      ...
    } finally {
      this.isUpdating = false;
      RandomService.lockGameplayContext = false;
    }
    this.flush(); // Se ejecuta al final del update
  }
```

## Consecuencias
- **Lag de Spawn de Proyectiles**: Los disparos del jugador creados a través de inputs diferidos pueden tardar exactamente un frame completo de simulación en registrarse físicamente, dando al usuario una sensación de "input lag" o respuesta tardía del control táctil.

## Solución propuesta
1. **Flushing explícito controlado por fases**: Permitir que ciertos sistemas cruciales fuercen un vaciado intermedio entre las fases críticas (ej. pasar de simulación física a detección de colisiones) si es estrictamente necesario.
2. **Alertas de Modificación Estructural**: Lanzar advertencias o aserciones de desarrollo si un sistema intenta crear/remover entidades en caliente saltándose el buffer durante la fase de ejecución principal del ciclo.

## Dificultad
Baja

## Prioridad
P2

## Dependencias
Ninguna.
