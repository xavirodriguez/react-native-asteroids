# Monorepo Dependencies Audit - TinyAster

This document assesses the quality of dependency declarations, version mismatches, package manager settings, and workspace isolation inside the TinyAster monorepo.

---

## Technical Audit Findings

### 1. Hard Installation Blockers due to Severe Peer Dependency Mismatches

## Título
Incompatibilidad de Ecosistema: Conflictos de Dependencias Pares de React y React Native con Expo 55

## Severidad
Critical

## Categoría
Dependencies

## Ubicación
`package.json` (raíz)

## Descripción
El archivo de dependencias del proyecto raíz solicita la versión de React `19.2.0` y React Native `0.83.6`. Sin embargo, la versión de Expo instalada (`~55.0.26`) y varios de sus paquetes de ecosistema nativos nativos (como `jest-expo` o `@shopify/react-native-skia`) esperan de manera mandatoria versiones estables anteriores de React (como `React 18`) y React Native (como `0.76` o inferior). Esto produce una discrepancia severa de Dependencias Pares (Peer Dependencies), obligando al desarrollador a forzar la instalación empleando banderas sumamente peligrosas como `--legacy-peer-deps` o omitiendo validaciones clave de consistencia en el instalador.

## Evidencia
En el archivo `package.json` raíz:
```json
  "dependencies": {
    ...
    "expo": "~55.0.26",
    ...
    "react": "19.2.0",
    "react-dom": "19.2.0",
    "react-native": "0.83.6",
```
Al intentar correr `npm install` o `pnpm install` sin forzar la omisión de dependencias de pares, el motor de paquetes aborta la instalación reportando un árbol de resolución bloqueado.

## Consecuencias
- **Comportamiento Inestable en Tiempo de Ejecución (Crashes)**: Correr React Native `0.83` con librerías nativas adaptadas para Expo SDK 55 (diseñado para React 18) puede gatillar fallas fatales de memoria a nivel del motor JSI o errores extraños de renderizado difíciles de depurar en producción.
- **Ruptura de Herramientas de Test**: El suite de Jest no puede emular de forma correcta el entorno de ejecución móvil debido a que los presets de `jest-expo` chocan con la arquitectura de React 19.

## Solución propuesta
Realizar un downgrade de las dependencias raíz a las versiones de React y React Native oficialmente recomendadas por el Expo SDK v55 instalado (típicamente `React 18.3.1` y `React Native 0.76.x` o las correspondientes). Se puede emplear la herramienta utilitaria `npx expo install --fix` para alinear de manera automatizada todas las dependencias del proyecto con el SDK nativo oficial.

## Dificultad
Media

## Prioridad
P0

## Dependencias
Ninguna.

---

### 2. Duplicación de Declaraciones de Scripts en Módulos Internos

## Título
Mantenimiento Ineficiente: Redundancia y Desalineación de Scripts en los package.json del Monorepo

## Severidad
Medium

## Categoría
DX

## Ubicación
Múltiples archivos `package.json` de los subpaquetes (`packages/*/package.json`)

## Descripción
No existe un estándar consolidado de scripts de ciclo de vida para las dependencias internas del monorepo. Mientras que el paquete raíz utiliza Turbo para orquestar las tareas (`pnpm exec turbo run test`), ciertos subpaquetes implementan comandos manuales directos en sus propios scripts o asumen rutas rígidas de compilación. Esto desaprovecha los beneficios de caching distribuido y ejecución paralela inteligente que ofrece Turborepo.

## Evidencia
En `packages/core/package.json` el script de test puede estar invocando directamente a `jest` sin heredar configuraciones globales, mientras que el pipeline de CI llama a `pnpm exec jest --runInBand` de forma aislada.

## Consecuencias
- **Pérdida de Eficiencia en CI**: El pipeline de compilación gasta valioso tiempo de ejecución reconstruyendo paquetes que no han sufrido modificaciones, elevando los costos de infraestructura de servidores de integración continua.

## Solución propuesta
Definir un estándar de pipeline estricto en el archivo `turbo.json` de la raíz del monorepo, especificando los inputs y outputs de las tareas de `build`, `lint` y `test` para que Turbo pueda gestionar la caché de manera impecable a nivel de todo el monorepo.

## Dificultad
Baja

## Prioridad
P2

## Dependencias
Ninguna.
