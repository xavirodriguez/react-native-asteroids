# Testing Strategy & Automated Specs Audit - TinyAster

This document audits the quality, coverage, reliability, and gaps of the testing infrastructure in the TinyAster project.

---

## Technical Audit Findings

### 1. Complete Absence of Tests for Rendering Layers and Native Integrations

## Título
Zona Ciega de Calidad: Cero Pruebas Unitarias o Integradas para Renderizadores (Canvas/Skia)

## Severidad
Medium

## Categoría
Testing

## Ubicación
Paquetes `packages/renderer-canvas/` and `packages/renderer-skia/`

## Descripción
Mientras que el paquete central `@tiny-aster/core` dispone de pruebas unitarias robustas para el motor ECS y el GameLoop, los paquetes encargados de la visualización en pantalla (`renderer-canvas` y `renderer-skia`) carecen absolutamente de archivos de prueba (`.test.ts` o `.spec.ts`). No existe ninguna especificación que valide que un canvas renderice de forma correcta las entidades, que se apliquen adecuadamente las rotaciones de cámara, o que se administre la opacidad de los componentes de renderizado.

## Evidencia
Al ejecutar el listado de archivos de test del proyecto:
- `packages/core/tests/` contiene múltiples suites (`ecs.test.ts`, `snapshots.test.ts`, etc.).
- `packages/renderer-canvas/` y `packages/renderer-skia/` no tienen ninguna carpeta `tests/` ni especificaciones configuradas.

## Consecuencias
- **Regresiones Visuales Silenciosas**: Cualquier optimización o alteración en la lógica de cálculo de matrices del renderizador (por ejemplo, coordenadas locales vs globales en Skia) puede romper visualmente el juego (hacer que los asteroides no se pinten o floten fuera de la pantalla) sin que el sistema de CI/CD alerte de ningún problema.
- **Dificultad de Actualización de Librerías**: Actualizar `@shopify/react-native-skia` es una tarea sumamente arriesgada, ya que no hay un suite de pruebas automatizadas que pueda verificar que los métodos nativos sigan comportándose como se espera en TinyAster.

## Solución propuesta
1. **Pruebas de Integración con Canvas Virtual (jsdom)**: Para `renderer-canvas`, configurar pruebas unitarias con `jest-canvas-mock` para validar que los comandos de contexto de dibujo (`translate`, `rotate`, `arc`, `fill`) se invoquen de forma idónea en base al estado del World ECS.
2. **Pruebas de instantáneas visuales (Visual Regression Testing)**: Implementar una suite de pruebas de regresión visual básica empleando Playwright o screenshots para validar que los frames clave renderizados coincidan con snapshots estables de referencia.

## Dificultad
Alta

## Prioridad
P2

## Dependencias
Ninguna.

---

### 2. Cero Cobertura de Pruebas Automatizadas para Predicción y Reconciliación Multijugador

## Título
Fragilidad del Netcode: Ausencia Total de Pruebas de Red y de Simulaciones de Condiciones de Red Hostiles

## Severidad
High

## Categoría
Testing

## Ubicación
Paquetes `packages/network/`, `packages/network-colyseus/` y sistemas en `@tiny-aster/core/src/network/`

## Descripción
El netcode del juego (predicción en cliente, reconciliación con rollback de inputs y delta-compresión) es la parte más compleja, volátil y propensa a desincronizaciones de cualquier motor de videojuegos. Pese a esto, no existe ninguna prueba integrada automatizada que simule la pérdida de paquetes, latencia artificial o desorden de mensajes para comprobar la estabilidad de la reconciliación local del cliente frente a las actualizaciones autoritativas del servidor.

## Evidencia
La carpeta de pruebas `packages/core/tests/` no incluye ninguna suite que instancie un `ReplicationSystem`, aplique un retraso a la entrega de datos, y verifique matemáticamente que la corrección del cliente coincida eventualmente de forma idéntica con el estado de referencia del servidor.

## Consecuencias
- **Desincronizaciones (Desync) Indetectables**: Los fallos en el cálculo de fricciones, el truncamiento de posiciones o las discrepancias de interpolación angular entre cliente y servidor solo pueden detectarse mediante pruebas manuales jugando con dos dispositivos, lo que hace el proceso de depuración extremadamente costoso y propenso a errores humanos.
- **Inestabilidad en Actualizaciones**: Cualquier cambio menor en la lógica física del juego (como el rozamiento o empuje) puede romper la fidelidad de la simulación multijugador sin que salte ninguna alerta en el entorno de desarrollo automatizado (CI).

## Solución propuesta
1. **Mockear el Transporte de Red**: Crear una suite de pruebas donde se simule el bucle cliente-servidor de forma determinista y síncrona en memoria.
2. **Simular Jitter y Latencia**: Introducir perturbaciones artificiales controladas (retrasar snapshots del servidor en X ticks, reordenar inputs) y corroborar que el método `reconcile()` de `ReplicationSystem` converja exactamente al mismo estado del servidor sin derivas de posición.

## Dificultad
Muy Alta

## Prioridad
P1

## Dependencias
Mover `NetTypes.ts` para que las pruebas de red puedan ejecutarse de forma agnóstica en entornos Jest estándar.

---

### 3. Fallas en la Configuración Global de Pruebas (Falta de Turborepo y Configuración Errónea de Compilación del Servidor)

## Título
Falla en la Integración Continua (CI): Error en la Compilación del Servidor en el Pipeline

## Severidad
Critical

## Categoría
CI/CD

## Ubicación
Configuración de compilación global del proyecto y de `asteroides-server`

## Descripción
La compilación global del proyecto a través de `pnpm test` o `pnpm build` falla de manera catastrófica en el servidor autoritativo debido a discrepancias de tipado (la propiedad `seed` no existe en la interfaz de configuración) y la importación de dependencias cliente-servidor corruptas que involucran a `@tiny-aster/react-native`. Al fallar la compilación, el pipeline de CI/CD del proyecto queda inoperable, impidiendo la verificación automática del código nuevo.

## Evidencia
Salida del comando de construcción del proyecto:
```bash
asteroides-server:build: src/AsteroidsRoom.ts(65,9): error TS2353: Object literal may only specify known properties, and 'seed' does not exist in type 'BaseGameConfig'.
asteroides-server:build: ../src/games/asteroids/AsteroidsGame.ts(24,28): error TS2307: Cannot find module '@tiny-aster/react-native' or its corresponding type declarations.
asteroides-server:build: ../src/games/asteroids/systems/AsteroidGameStateSystem.ts(32,26): error TS2339: Property 'game' does not exist on type 'AsteroidGameStateSystem'.
```

## Consecuencias
- **Pipeline de Integración Continua Roto**: La calidad del software no puede ser garantizada mediante procesos automáticos porque el build del backend headless bloquea el paso de tests.
- **Bloqueo de Deployments**: Es imposible realizar despliegues ágiles del servidor a producción ya que el transpilador de TypeScript rechaza emitir archivos de salida debido a errores críticos de declaración cruzada.

## Solución propuesta
1. **Corregir la Interfaz `BaseGameConfig`**: Asegurar que acepte opcionalmente la propiedad `seed` o herede correctamente.
2. **Limpiar las Fronteras**: Rediseñar la carga del módulo del juego en el servidor Colyseus para que la inicialización se apoye únicamente en un dominio compartido 100% libre de React Native y librerías móviles.

## Dificultad
Media

## Prioridad
P0

## Dependencias
- Corrección de la fuga de dependencias en `ARCHITECTURE.md`.
