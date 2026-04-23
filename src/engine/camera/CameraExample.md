# Sistema de Cámara Profesional en TinyAsterEngine

Este documento describe cómo inicializar y utilizar el sistema de cámara profesional para el seguimiento de entidades y efectos visuales.

## 1. Inicialización en `BaseGame`

Para configurar una cámara que siga al jugador, inicializa el componente y el sistema en tu clase de juego.

```typescript
import { BaseGame } from "./engine/core/BaseGame";
import { Camera2D } from "./engine/camera/Camera2D";
import { Camera2DComponent } from "./engine/core/CoreComponents";

export class MyGame extends BaseGame {
  protected async init(): Promise<void> {
    await super.init();

    // 1. Crear la entidad de cámara
    const cameraEntity = this.world.createEntity();
    this.world.addComponent(cameraEntity, {
      type: "Camera2D",
      x: 0,
      y: 0,
      zoom: 1,
      smoothing: 0.1, // Factor de suavizado (Lerp)
      offset: { x: 0, y: 0 },
      shakeIntensity: 0,
      shakeOffsetX: 0,
      shakeOffsetY: 0,
      bounds: { minX: -1000, minY: -1000, maxX: 1000, maxY: 1000 },
      deadzone: { minX: -50, minY: -50, maxX: 50, maxY: 50 },
      targets: [],
      isMain: true
    } as Camera2DComponent);

    // 2. Registrar el CameraSystem en la fase TRANSFORM
    // Se ejecuta después de la simulación física pero antes del renderizado
    this.world.addSystem(new Camera2D({
      viewport: { width: 800, height: 600 }
    }), { phase: SystemPhase.Transform });
  }

  public setupPlayer(playerEntity: Entity): void {
      // Configurar la cámara para que siga al jugador
      Camera2D.follow(this.world, playerEntity);
  }
}
```

## 2. Características Principales

### Suavizado (Lerp)
La cámara utiliza interpolación exponencial. Un valor de `smoothing` de `0.1` proporciona un seguimiento suave. Un valor de `1.0` hace que el seguimiento sea instantáneo.

### Múltiples Objetivos
Puedes añadir objetivos adicionales para que la cámara encuentre el punto medio entre ellos:

```typescript
Camera2D.addTarget(this.world, bossEntity);
```

### Screen Shake
Activa vibraciones de cámara fácilmente:

```typescript
Camera2D.shake(this.world, 10); // Intensidad de 10 píxeles
```

### Frustum Culling
El `CanvasRenderer` descarta automáticamente las entidades que están fuera del área visible de la cámara, optimizando el rendimiento de GPU.
