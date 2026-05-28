Decisión técnica recomendada

Hacer una extracción quirúrgica en este orden:

Crear packages/core y mover solo código agnóstico: World, Entity, Component, System, Query, WorldCommandBuffer, GameLoop, snapshots, RandomService, matemáticas, colisiones genéricas y tipos de renderer abstracto.
Eliminar de core todo lo que huela a juego: AsteroidComponent, ShipComponent, InvaderComponent, BallComponent, EnemyTagComponent, BlueprintKind = 'asteroid' | 'invader' | ..., eventos ship:*, asteroid:*, si:*, XPSystem, PaletteSystem, PlayerProfileService.

Convertir renderers en paquetes opcionales. El core solo debe exportar contratos como Renderer, RenderCommand, RenderSnapshot, ShapeDrawer.
Convertir Colyseus en adapter opcional. El core define NetworkTransport; @motor/network-colyseus implementa esa interfaz.

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