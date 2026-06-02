# TinyAster Roadmap

## Fase 1: Consolidación del Core (Completada)

Se ha consolidado `@tiny-aster/core` como el paquete canónico del motor, logrando un desacoplamiento total del dominio del juego y de las APIs de plataforma.

### Logros:
- **Extracción Quirúrgica**: Se movió todo el código agnóstico (ECS, Physics, Loop, Systems) a `packages/core`.
- **Pureza Arquitectónica**: Eliminación de componentes específicos (`AsteroidComponent`, `ShipComponent`, etc.) del core. Ahora se usan registros genéricos.
- **Contratos de Renderizado**: El core exporta `Renderer`, `ShapeDrawer` y tipos abstractos. Las implementaciones (Skia/Canvas) viven fuera.
- **Abstracción de Red**: `NetworkTransport` es una interfaz en el core. Se creó `@tiny-aster/network-colyseus` como adapter opcional.
- **Capa de Compatibilidad**: `src/engine/index.ts` ahora re-exporta `@tiny-aster/core`.

### Siguientes Pasos:
1. **Formalizar Monorepo**: Mover la aplicación raíz a `apps/asteroids`.
2. **Paquetes de Renderizado**: Crear `@tiny-aster/renderer-skia` y `@tiny-aster/renderer-canvas`.
3. **Paquete React Native**: Extraer hooks y componentes específicos a `@tiny-aster/react-native`.

Añadir package.json real de librería:
{
  "name": "@tiny-aster/core",
  "version": "0.1.0",
  "type": "module",
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "require": "./dist/index.cjs"
    }
  },
  "sideEffects": false,
  "files": ["dist", "README.md", "LICENSE"]
}

Mantener apps/asteroids como consumidor real del paquete. Si Asteroids no puede compilar importando solo @tiny-aster/core y @tiny-aster/react-native, la extracción no está terminada.