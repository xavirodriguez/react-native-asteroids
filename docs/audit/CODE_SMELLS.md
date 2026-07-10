# Code Smells & Bad Practices Audit - TinyAster

This document lists general code smells, violations of software engineering principles (SOLID, DRY, KISS, YAGNI), duplicate code, hardcoded magical numbers, and dead code within the codebase.

---

## Technical Audit Findings

### 1. Completely Empty Subsystem Implementations

## Título
Código Fantasma: `AsteroidInputSystem` Está Completamente Vacío de Lógica

## Severidad
High

## Categoría
Complejidad

## Ubicación
`src/games/asteroids/systems/AsteroidInputSystem.ts` (y su contraparte compilada `.js`)

## Descripción
La clase `AsteroidInputSystem` está registrada formalmente dentro de `AsteroidsGame.ts` para ejecutarse durante la fase de entrada/simulación. Sin embargo, su código fuente se encuentra absolutamente vacío de lógica: no procesa movimientos, rotación de la nave, disparos, ni ninguna de las acciones fundamentales del jugador. Este es un code smell crítico de "Dead Code" o esqueleto abandonado que confunde al desarrollador, simulando un procesamiento que en realidad ocurre en otro lugar o simplemente no ocurre en absoluto.

## Evidencia
En `src/games/asteroids/systems/AsteroidInputSystem.ts`:
```typescript
export class AsteroidInputSystem extends System<AsteroidsComponentRegistry, AsteroidsEventRegistry> {
  constructor(bulletPool: BulletPool, particlePool: ParticlePool, config: AsteroidConfig) {
    super();
  }

  public update(world: World<AsteroidsComponentRegistry, AsteroidsEventRegistry>, deltaTime: number): void {
      // Input handling logic
  }
  public onRegister(world: World<AsteroidsComponentRegistry, AsteroidsEventRegistry>): void {}
  public dispose(): void {}
}
```

## Consecuencias
- **DX Deficiente y Confusión**: Un desarrollador que busque modificar el comportamiento de entrada de la nave espacial asumirá de inmediato que debe editar esta clase, perdiendo tiempo valioso al descubrir que el método `update` de este sistema nunca procesa los inputs reales.
- **Acumulación de Esqueletos de Código**: Incrementa innecesariamente el peso del bundle de la app y la cantidad de archivos a mantener con código sin utilidad alguna.

## Solución propuesta
Implementar en `AsteroidInputSystem.ts` el mapeo real de entrada para el jugador local, leyendo el componente `Input` y transformándolo en fuerzas físicas (velocidad, rotación angular, creación de balas en el `BulletPool`) o en su defecto, eliminar por completo la clase si la lógica de entrada fue intencionalmente unificada en otro componente general para evitar la existencia de código muerto.

## Dificultad
Baja

## Prioridad
P1

## Dependencias
Ninguna.

---

### 2. Violación de DRY: Duplicación de Lógica Física de Navegación en Sistemas de Red

## Título
Física Duplicada: `ReplicationSystem` Re-implementa Manualmente la Aceleración y Velocidad de la Nave

## Severidad
High

## Categoría
Duplicación

## Ubicación
`packages/core/src/network/ReplicationSystem.ts` (líneas 37-52, 79-94)

## Descripción
El método `reconcile` y el bucle de actualización en `ReplicationSystem` duplican de forma literal la matemática de empuje, aceleración y fricción de las naves espaciales: calculan cosenos y senos de la rotación multiplicados por una constante mágica de fuerza (`power = 150`) para recalcular la velocidad. Esta lógica es una violación flagrante del principio DRY (Don't Repeat Yourself), pues esa misma matemática física debería residir de forma exclusiva en los sistemas físicos del juego (como el movimiento e impulso).

## Evidencia
En `packages/core/src/network/ReplicationSystem.ts`:
```typescript
            // Client-Side Prediction: apply input locally before server confirmation
            if (input.thrust) {
                const power = 150;
                const ax = Math.cos(transform.rotation) * power;
                const ay = Math.sin(transform.rotation) * power;
                velocity.vx += ax * (deltaTime / 1000);
                velocity.vy += ay * (deltaTime / 1000);
            }
```

## Consecuencias
- **Pérdida de Sincronismo Inevitable**: Si el diseñador del juego decide modificar la potencia de la nave de `150` a `220` (o añadir mejoras/power-ups de velocidad en el juego), pero olvida actualizar las líneas cableadas dentro de `ReplicationSystem`, la predicción local del cliente calculará una trayectoria distinta a la del juego real. El servidor detectará trampas o forzará continuas correcciones de posición, provocando que la nave del jugador "tiemble" (jittering) violentamente de forma perpetua.

## Solución propuesta
1. **Determinismo y Simulación Reentrante**: El bucle de reconciliación en `ReplicationSystem` no debe implementar operaciones matemáticas de forma manual. En su lugar, debe cambiar las entradas (inputs) del componente correspondiente y delegar el avance físico invocando directamente a los sistemas físicos autorizados (`MovementSystem`, etc.) para que simulen un paso de tick controlado.

## Dificultad
Alta

## Prioridad
P0

## Dependencias
Ninguna.

---

### 3. Valores Mágicos Cableados (Hardcoded Magic Numbers)

## Título
Constantes Ocultas: Configuración Física y de Red Cableada en Código de Producción

## Severidad
Medium

## Categoría
Otro

## Ubicación
Múltiples archivos, por ejemplo, `packages/core/src/network/ReplicationSystem.ts` (constante `power = 150`, factor de lerp `alpha = 0.15`, tick delta `dt = 16.66`)

## Descripción
El código fuente contiene numerosas constantes físicas y de sincronización de red acopladas directamente en las líneas de los métodos en vez de extraerlas a ficheros de configuración global o esquemas de opciones. Por ejemplo, la tasa de tick de reconciliación se asume fija en `16.66` ms y la tasa de interpolación visual en `0.15`.

## Evidencia
En `packages/core/src/network/ReplicationSystem.ts`:
```typescript
                const alpha = 0.15; // Interpolation factor
                transform.x += (remote.targetX - transform.x) * alpha;
...
                const dt = 16.66; // Standard tick delta (should ideally be dynamic)
```

## Consecuencias
- **Rigidez del Código**: Es imposible experimentar dinámicamente con diferentes tasas de interpolación visual o físicas bajo entornos con alta latencia sin tener que recompilar y reconstruir el motor entero.
- **Incompatibilidad de Frecuencia**: Si la pantalla del móvil corre a 120Hz, asumir un factor rígido o delta fijo de `16.66` de forma implícita desajustará el ritmo y la suavidad del juego.

## Solución propuesta
Extraer todas las constantes numéricas a los archivos de configuración JSON del juego (como `config/asteroids.json` o `config/pong.json`) y validarlos empleando sus respectivos esquemas de Zod. Los sistemas deben consumir estos valores estrictamente desde el recurso `GameConfig` del `World`.

## Dificultad
Baja

## Prioridad
P2

## Dependencias
Ninguna.
