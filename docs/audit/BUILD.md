# Build Workflow & Compilation Audit - TinyAster

This document audits the monorepo build pipelines, compiler options, workspaces configuration, and the contamination of source folders by transpile artifacts.

---

## Technical Audit Findings

### 1. Source Folder Contamination by In-Place Compilations

## Título
Contaminación de Directorio Source: Fuga de Archivos Transpilados (.js y .js.map) dentro de `/src`

## Severidad
Critical

## Categoría
Build

## Ubicación
Toda la estructura del repositorio, afectando principalmente a `packages/core/src/`, `server/src/`, y `src/games/`

## Descripción
Debido a la ausencia de directivas restrictivas de salida de compilación en el compilador de TypeScript (`tsconfig.json`) o por scripts de empaquetado mal configurados, ejecutar compilaciones locales o suites de pruebas genera archivos transpilados `.js` y `.js.map` directamente al lado de los archivos fuente `.ts` originales dentro de la carpeta `/src`. Estos archivos compilados son capturados erróneamente por git (marcando "A" o modificado en el estatus del repositorio) y provocan colapsos masivos en las herramientas de análisis estático (como ESLint), las cuales intentan analizar sintaxis de JavaScript compilada de Node/CommonJS bajo reglas estrictas de módulos ESNext de TypeScript.

## Evidencia
Al correr `git status` tras el build inicial:
```bash
A  packages/core/src/assets/AssetLoader.js
A  packages/core/src/audio/IAudioPlayer.js
A  packages/core/src/config/BaseConfigSchema.js
...
A  server/src/AsteroidsRoom.js
A  server/src/DailyLeaderboardStore.js
...
A  src/games/asteroids/AsteroidsGame.js
```
Y al correr `pnpm lint`, se reportan más de **1,200 errores críticos de análisis estático** por variables globales CommonJS no definidas (`exports is not defined`, `require is not defined`) dentro de los archivos fugados.

## Consecuencias
- **Inoperabilidad del Linter**: Es imposible usar `eslint` para prevenir bugs reales en el código porque el reporte queda inundado con miles de falsos positivos de los archivos compilados fugados.
- **Conflictos de Fusión de Git Catastróficos**: El historial de cambios de git se contamina con commits gigantescos que contienen código máquina compilado y source maps, complicando las ramas de características y las revisiones de código de los desarrolladores.

## Solución propuesta
1. **Configurar Salidas Correctas (`outDir`)**: Garantizar que el archivo `server/tsconfig.json` y cualquier configuración interna del compilador redirijan la salida transpilada de forma estricta hacia una carpeta temporal `dist` o `build`.
2. **Ignorar Artifacts en Git**: Añadir patrones de exclusión robustos en `.gitignore` para bloquear la subida de archivos `.js` y `.js.map` ubicados dentro de directorios `/src/`.
3. **Limpieza Automatizada**: Crear un script utilitario en `package.json` (`clean:artifacts`) para eliminar de forma recursiva cualquier archivo `.js` y `.js.map` generado de forma accidental en las carpetas `/src/`.

## Dificultad
Media

## Prioridad
P0

## Dependencias
Ninguna.

---

### 2. Bypass de Límites del Espacio de Trabajo (Workspace Boundaries) en Ruta del Servidor

## Título
Acoplamiento Inseguro: La Configuración de TypeScript del Servidor Bypassa el Espacio de Trabajo e Importa Fuentes Directas

## Severidad
High

## Categoría
Build

## Ubicación
`server/tsconfig.json` (línea 16-18)

## Descripción
El servidor Colyseus define una ruta alternativa (`paths`) para `@tiny-aster/core` que apunta de manera directa al directorio de código fuente (`../packages/core/src/index.ts`) en lugar de depender de la versión empaquetada y distribuida del módulo a través de los mecanismos estándar de workspaces de `pnpm`. Esto elude el ciclo de vida de compilación nativo del monorepo e introduce dependencias cruzadas frágiles que pueden provocar inconsistencias entre las declaraciones de tipo del paquete compilado y el código que se simula en caliente en el backend.

## Evidencia
En `server/tsconfig.json`:
```json
    "paths": {
      "@tiny-aster/core": ["../packages/core/src/index.ts"]
    }
```

## Consecuencias
- **Ruptura de la Modularidad**: El servidor está acoplado de forma rígida a la estructura física del disco de desarrollo local. No se puede distribuir o testear el paquete del servidor de forma aislada sin que la ruta relativa de la carpeta superior se mantenga exactamente idéntica.

## Solución propuesta
Eliminar la directiva `paths` de `@tiny-aster/core` en `server/tsconfig.json`. La resolución de este módulo debe ser administrada de forma automática por `pnpm` enlazando simbólicamente el paquete compilado en `packages/core/dist` mediante el archivo de manifiesto `package.json`.

## Dificultad
Baja

## Prioridad
P1

## Dependencias
Ninguna.
