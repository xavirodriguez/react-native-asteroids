# Architectural Audit - TinyAster

This document audits the architectural design of TinyAster, assessing its conformity to Hexagonal Architecture (Ports and Adapters), Clean Architecture, Domain-Driven Design (DDD), and standard Game Engine patterns.

---

## Technical Audit Findings

### 1. Severe Package Boundary Leakage and Layer Contamination

## Título
Inversión de Dependencias Rota: El Servidor Autoritativo Importa Directamente el Cliente React Native

## Severidad
Critical

## Categoría
Arquitectura

## Ubicación
`server/src/AsteroidsRoom.ts` (líneas 5-6, 11-12) y `src/games/asteroids/AsteroidsGame.ts`

## Descripción
El servidor multijugador autoritativo (basado en Node.js y Colyseus) importa de manera directa clases de juego del cliente ubicadas en el directorio de la aplicación React Native principal (`../../src/games/asteroids/AsteroidsGame`). A su vez, `AsteroidsGame.ts` importa tipos y utilidades desde `@tiny-aster/react-native`, el cual es un paquete adaptado específicamente para interfaces móviles con dependencias de React y Expo. Esto rompe completamente los principios de la Arquitectura Hexagonal y la Clean Architecture, donde el núcleo del simulador del juego (Domain) debería ser totalmente agnóstico de la plataforma de entrega (React Native, Servidor Headless, etc.).

## Evidencia
En `server/src/AsteroidsRoom.ts`:
```typescript
import { AsteroidsGame } from "../../src/games/asteroids/AsteroidsGame";
import { createShip, createAsteroid } from "../../src/games/asteroids/EntityFactory";
import { AsteroidsComponentRegistry, AsteroidsEventRegistry } from "../../src/games/asteroids/types/AsteroidRegistry";
```
Y en `src/games/asteroids/AsteroidsGame.ts`:
```typescript
import { InputFrame } from "@tiny-aster/react-native";
```

## Consecuencias
- **Fallo Completo de Compilación**: El compilador de TypeScript del servidor (`tsc`) falla al intentar construir el proyecto porque intenta procesar las declaraciones y tipos de React Native/Skia que no están disponibles ni soportados en el entorno de backend headless (Node.js).
- **Imposibilidad de Despliegue Independiente**: El servidor no puede empaquetarse de manera ligera ni ser desplegado de forma aislada en contenedores Docker u ofertas Cloud (como ECS o Kubernetes) sin arrastrar todo el código fuente y las dependencias de React Native, Expo y assets móviles.

## Solución propuesta
1. **Extraer el Núcleo del Juego (Game Domain) a un Módulo Puro**: Separar el estado, las entidades, los sistemas de simulación pura y los componentes de Asteroids en un paquete independiente dentro del monorepo (por ejemplo, `packages/game-asteroids-core`). Este nuevo paquete solo debe depender de `@tiny-aster/core` y de Types estándar de TypeScript (puros).
2. **Eliminar dependencias de `@tiny-aster/react-native`**: Los tipos compartidos de red, como `InputFrame` o `ReplayFrame` que actualmente residen incorrectamente en `@tiny-aster/react-native/src/hooks/NetTypes.ts`, deben moverse a un paquete de protocolo agnóstico (p. ej., `@tiny-aster/network` o directamente a `@tiny-aster/core/src/network`).
3. **Inyección de Dependencias para Presentación**: Toda lógica visual o de audio (como pre-carga de imágenes y efectos visuales de partículas que no afectan el estado autoritativo) debe registrarse a través de interfaces o "Puertos" implementados por el cliente visual. El core de juego headless no debe conocer que existe Skia o Canvas.

## Dificultad
Alta

## Prioridad
P0

## Dependencias
- Corrección de la ubicación de `NetTypes.ts`.

---

### 2. Ubicación Errónea de Tipos de Protocolo de Red (NetTypes)

## Título
Fuga de Capa de Presentación: Tipos de Red Acoplados a React Native

## Severidad
High

## Categoría
Acoplamiento

## Ubicación
`packages/react-native/src/hooks/NetTypes.ts`

## Descripción
Los tipos fundamentales para el protocolo de sincronización multijugador, la reconciliación y la predicción (tales como `InputFrame`, `PredictedState`, `EntitySnapshot`, `ReplayFrame` y `ReplayData`) están definidos dentro del paquete `@tiny-aster/react-native`. Este paquete está destinado exclusivamente a contener adaptadores React Native (Hooks como `useGameLoop`, `useWorld`, interfaces táctiles, etc.). Colocar tipos puros de dominio de red aquí obliga a cualquier módulo que requiera sincronización (incluidos `@tiny-aster/core` y los archivos de lógica del juego) a importar desde `@tiny-aster/react-native`.

## Evidencia
En `packages/react-native/src/index.ts`:
```typescript
export * from "./hooks/NetTypes";
```
Y su uso en `src/games/asteroids/AsteroidsGame.ts`:
```typescript
import { InputFrame } from "@tiny-aster/react-native";
```

## Consecuencias
- **Acoplamiento Circular**: Se introduce un acoplamiento donde el núcleo de simulación de juego depende de utilidades de interfaz visual sólo para obtener interfaces de red básicas.
- **Incompatibilidad del Servidor**: El servidor no puede utilizar estas interfaces comunes sin verse obligado a incluir el SDK de React Native en su árbol de resolución de módulos.

## Solución propuesta
Mover `NetTypes.ts` fuera del paquete `@tiny-aster/react-native`. El destino idóneo es `@tiny-aster/core/src/network/` o un paquete de contratos de red agnóstico (`@tiny-aster/network`). De esta forma, tanto el cliente móvil (React Native), el cliente web, como el servidor headless (Colyseus) pueden importar las interfaces del protocolo sin contaminarse mutuamente.

## Dificultad
Baja

## Prioridad
P0

## Dependencias
Ninguna.

---

### 3. Falta de Separación de Capas (Functional Core, Imperative Shell)

## Título
Acoplamiento de Efectos Secundarios y Lógica de Simulación de Sonidos

## Severidad
Medium

## Categoría
Arquitectura

## Ubicación
`src/games/flappybird/FlappyBirdGame.ts` (función `onPreloadAssets`, constructor)

## Descripción
El juego de Flappy Bird inicializa y realiza llamadas directas a un objeto global/instancia `audio` (`this.audio.loadSFX(...)`) directamente dentro de la inicialización de la clase del juego. En una arquitectura de motor limpia (Functional Core, Imperative Shell), la lógica del juego (Core) debe limitarse a simular ticks numéricos y despachar eventos puramente semánticos (`"audio:play", "flap"`). La carga real de archivos multimedia (música, MP3, texturas) y el subsistema de reproducción nativo de audio de Expo/Web representan efectos secundarios (Imperative Shell) y deben registrarse fuera del bucle de simulación.

## Evidencia
En `src/games/flappybird/FlappyBirdGame.ts`:
```typescript
  private async onPreloadAssets(): Promise<void> {
    const audio = this.audio;
    try {
      await Promise.all([
        audio.loadSFX("flap", "/audio/flap.mp3"),
        ...
```

## Consecuencias
- **Dificultad de Pruebas Unitarias**: Para testear el estado de juego de FlappyBird se requiere mockear de forma agresiva todo el hardware de audio y los cargadores nativos, o de lo contrario las pruebas fallarán en entornos de integración continua (CI) donde el hardware de audio no existe.
- **Falta de Portabilidad**: Si se desea correr este juego en un servidor headless para prevenir trampas, el servidor colapsará al intentar cargar el archivo `.mp3` local o inicializar el subsistema de audio de Expo.

## Solución propuesta
Abstraer el audio mediante un Bus de Eventos (`EventBus`). La clase de juego únicamente emite un evento semántico `world.getEventBus().emit("audio:trigger", { sound: "flap" })`. Un adaptador visual externo en React Native (dentro de la interfaz de la App) escucha este bus y ejecuta la API de reproducción de audio nativa de Expo. La clase `FlappyBirdGame` no debe referenciar ni mantener un objeto `audio` de forma directa en su núcleo.

## Dificultad
Media

## Prioridad
P2

## Dependencias
Ninguna.
