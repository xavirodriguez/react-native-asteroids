# 📊 Grafo de Dependencias (DEPENDENCY_GRAPH.md)

Este documento describe el mapa de dependencias arquitectónicas del motor, ilustrando cómo la resolución de los problemas raíz (Root Causes) desbloquea y soluciona múltiples bugs y limitaciones derivados de forma paralela.

---

## 🗺️ Mapa Visual de Dependencias (Mermaid)

```mermaid
graph TD
    %% Root Causes (Nivel 1)
    RC1[Estabilización del Ciclo de Vida] --> |Resuelve| B1[BUG-001: Fugas de memoria al reiniciar]
    RC1 --> |Desbloquea| EP1[Épica 1: Ciclo de Vida Robusto]

    RC2[Separación de Core y Plataforma] --> |Resuelve| B2[Crashes de importación en Headless]
    RC2 --> |Desbloquea| EP2[Épica 2: Core Portable Headless]

    RC3[API de Mutación ECS Segura] --> |Resuelve| B3[Inconsistencia de Estados en Rollback]
    RC3 --> |Desbloquea| EP4[Épica 4: Determinismo y Rendimiento SoA]

    RC4[Queries y Tipado Fuerte ECS] --> |Resuelve| B4[Corrupción estructural de queries en vivo]
    RC4 --> |Desbloquea| EP4

    RC5[Módulo de Gameplay Compartido] --> |Resuelve| B5[Duplicación de Sistemas de Combos y Loot]
    RC5 --> |Desbloquea| EP3[Épica 3: Migración e Integración de Juegos]

    %% Dependencies between Epics
    EP1 --> EP3
    EP2 --> EP3
    EP4 --> EP3
```

---

## ⛓️ Análisis de Relaciones e Impactos

### 1. **Ciclo de Vida de BaseGame ➔ BUG-001 y Épica de Estabilidad**
* **Dependencia**: La estabilización del ciclo de vida (`init`, `start`, `stop`, `restart`, `destroy`) es un pre-requisito absoluto para que cualquier juego pueda ejecutarse continuamente sin degradar el dispositivo.
* **Impacto**: Corregir el método `destroy()` para liberar sistemas e invalidar listeners del `EventBus` elimina instantáneamente el bug de acumulación de handlers de `AsteroidComboSystem` y de cualquier futuro sistema que use el bus de eventos global.

### 2. **Desacoplamiento de UI/Plataforma ➔ Servidor Colyseus**
* **Dependencia**: Para ejecutar simulaciones de red autoritativas en el backend (Colyseus), el `@tiny-aster/core` no debe importar React Native, Reanimated ni Skia.
* **Impacto**: La limpieza de fronteras y subpath exports permite compilar el core de manera ligera y modular. Esto elimina la necesidad de mockear librerías de UI en los tests automatizados y en el servidor headless.

### 3. **API de Mutación e Inmutabilidad ➔ Determinismo en Re-simulación**
* **Dependencia**: El rollback netcode requiere tomar snapshots deterministas del mundo y restaurar estados previos sin efectos secundarios.
* **Impacto**: Forzar que las escrituras se realicen mediante `world.mutateComponent` y que las mutaciones estructurales se canalicen únicamente a través de `world.commands` (CommandBuffer estructural) garantiza que las referencias de los componentes nunca se desalineen ni queden corruptas durante pasos de predicción o reconciliación de red.

### 4. **Abstracción de Gameplay Común ➔ Paridad de Características de Juegos**
* **Dependencia**: Al unificar la lógica de loot y combos bajo un espacio común, evitamos que las correcciones aplicadas a un juego queden desactualizadas en otros.
* **Impacto**: La creación de un `@tiny-aster/gameplay` permite migrar con seguridad Space Invaders, Asteroids y Pong para usar sistemas compartidos de puntuación, control táctil unificado y buffers de entrada sin reescribir código repetitivo.
