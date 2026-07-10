# Expo & Metro Native Architecture Audit - TinyAster

This document audits the mobile native layer, Expo SDK compliance, and the Metro bundler configurations of the TinyAster app.

---

## Technical Audit Findings

### 1. Insecure and Lax Resolution Settings in Metro Bundler Configuration

## Título
Fragilidad del Bundling: Configuración Incompleta de Metro para Monorepos de pnpm

## Severidad
High

## Categoría
Expo

## Ubicación
`metro.config.js`

## Descripción
El proyecto utiliza un esquema monorepo con `pnpm`. pnpm se destaca por el uso agresivo de enlaces simbólicos (symlinks) en la carpeta `node_modules` para aislar y dediseñar las dependencias del proyecto. Sin embargo, Metro (el empaquetador nativo por defecto de Expo/React Native) es conocido por tener serias dificultades para seguir enlaces simbólicos y resolver paquetes alojados fuera de la raíz del proyecto. Si la configuración de `metro.config.js` no cuenta con reglas estrictas de resolución (`nodeModulesPaths`, `watchFolders`), las compilaciones locales y los despliegues nativos con EAS fallarán de forma aleatoria reportando errores tipo `Module not found` o importando múltiples instancias duplicadas de React.

## Evidencia
Al inspeccionar la estructura de directorios, tenemos múltiples paquetes interdependientes:
- `@tiny-aster/core`
- `@tiny-aster/network`
- `@tiny-aster/react-native`
Metro requiere de manera mandatoria conocer la ubicación exacta de las dependencias externas en pnpm a través de una configuración de `watchFolders` y `resolver.nodeModulesPaths`.

## Consecuencias
- **Fallos Inexplicables en Producción (EAS Build)**: EAS Build puede fallar al intentar generar el bundle de producción para iOS/Android porque Metro es incapaz de hallar el código transpilado de `@tiny-aster/core` o de resolver adecuadamente los assets estáticos dentro de la estructura anidada de `pnpm`.
- **Incompatibilidad de React Duplicado**: Al seguir symlinks sin bloquear rutas duplicadas, Metro puede terminar empaquetando dos copias físicas distintas de la librería `react` o `react-native`, rompiendo los Contextos y provocando cierres inesperados de la aplicación (crash).

## Solución propuesta
Refactorizar `metro.config.js` empleando el cargador compatible para monorepos estándar de Expo, registrando los directorios del espacio de trabajo de `pnpm` en los campos `watchFolders` e inyectando las rutas de resolución correctas en el resolver:
```javascript
const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, ".."); // Si se encuentra en una carpeta anidada

const config = getDefaultConfig(projectRoot);

// Registrar directorios para que Metro vigile cambios de código en otros paquetes
config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

module.exports = config;
```

## Dificultad
Media

## Prioridad
P1

## Dependencias
Ninguna.

---

### 2. Conflicto de Versión de Motores JS (Hermes vs JSC) y Carga de Trabajo de Skia

## Título
Rendimiento Nativo Comprometido: Ausencia de Configuración Explícita para el Motor Hermes en Expo

## Severidad
Medium

## Categoría
Expo

## Ubicación
`app.json` (o archivo de configuración de Expo)

## Descripción
Para correr de forma óptima el renderizador de Skia en dispositivos Android y iOS, es crucial el uso del motor JavaScript Hermes con el recolector de basura de nueva generación activado. Si el motor JS no se configura de forma explícita como `hermes` dentro de `app.json`, las plataformas pueden recurrir a JavaScriptCore (JSC) de manera por defecto. JSC carece de ciertas optimizaciones de recolector para llamadas intensivas de puentes JSI (JavaScript Interface), lo que causa caídas severas de FPS al renderizar dinámicamente gráficos de Skia mediante el lienzo Canvas nativo de Expo.

## Evidencia
Se debe corroborar el campo `jsEngine` dentro del manifiesto de configuración de la app móvil.

## Consecuencias
- **Bajo rendimiento en Android**: El recolector de basura de JSC en Android detendrá el hilo principal con mayor frecuencia para liberar los objetos pintados por Skia, arruinando la suavidad del juego a pesar de que el motor físico sea rápido.

## Solución propuesta
Asegurar que `app.json` defina de forma imperativa el motor `hermes` para ambas plataformas nativas clave:
```json
{
  "expo": {
    "jsEngine": "hermes",
    "ios": {
      "jsEngine": "hermes"
    },
    "android": {
      "jsEngine": "hermes"
    }
  }
}
```

## Dificultad
Baja

## Prioridad
P2

## Dependencias
Ninguna.
