# Auditoría Técnica Expo & Arquitectura Móvil - Proyecto Retro Arcade

## 1. Resumen ejecutivo

El proyecto **Retro Arcade** presenta una base técnica sólida, utilizando **Expo Router** y una arquitectura de motor **ECS (Entity Component System)** bien desacoplada de la UI. La gestión de estados persistentes con **Zod** y **AsyncStorage** es ejemplar. No obstante, se han detectado brechas críticas en la consistencia de la arquitectura de física y el aprovechamiento de las capacidades avanzadas de Expo.

- **Fortalezas principales**:
  - Excelente separación entre lógica de juego (Engine), visuales (Canvas/Skia) y UI (React).
  - Configuración de **EAS Build** y **Updates** bien estructurada con canales claros.
  - Implementación de **Continuous Native Generation (CNG)** (ios/android como artefactos).
  - Suite de tests (50+) que garantiza la estabilidad del motor.

- **Incumplimientos más importantes**:
  - **Divergencia de Motor**: Coexistencia de un motor ECS maduro con una rama experimental (`GameEngine.tsx`) que usa Reanimated y Matter.js directamente, rompiendo la coherencia del proyecto.
  - **Determinismo Visual**: Uso de `Math.random()` en módulos de renderizado (`StarField.ts`, visuales de Asteroids), invalidando el control de semillas del `RandomService`.

- **Implementaciones obligatorias (sin excusas)**:
  - **Unificación de Física**: Integrar Matter.js como un `System` dentro del ECS oficial.
  - **Refactor de Navegación**: Migrar a rutas tipadas reales y layouts por segmento para evitar el mantenimiento manual en el root layout.
  - **Limpieza de UI Thread**: Corregir el "snapshotting" manual en el render loop que sobrecarga el bridge en la rama experimental.

- **Decisiones aplazables**:
  - Migración a **API Routes**: No es necesaria actualmente ya que el proyecto es 100% offline/local.
  - Uso de **Skia Atlas**: Recomendado para rendimiento futuro, pero no crítico para el número actual de entidades.

---

## 2. Auditoría detallada por bloques y prácticas

### 1. Expo Router — Navegación basada en el sistema de archivos

#### Práctica 1.1
- **Práctica evaluada:** Mantener `app/` solo para rutas, pantallas y layouts, dejando lógica de negocio, hooks reutilizables, servicios y UI compartida fuera de `app/`.
- **Estado:** Cumple
- **Evidencia encontrada:** `src/app/` solo contiene archivos de ruta. Los componentes están en `src/components/`, la lógica en `src/engine/`, los hooks en `src/hooks/` y los estilos en `src/styles/`.
- **Impacto técnico:** Facilita la escalabilidad y evita que el sistema de rutas se ensucie con archivos no navegables.
- **¿Existe una razón de peso para no implementarla?:** N/A
- **Razón de peso:** N/A
- **Veredicto:** Mantener
- **Acción recomendada:** Ninguna.
- **Prioridad:** Baja
- **Esfuerzo estimado:** Bajo
- **Riesgo de implementación:** Bajo

#### Práctica 1.2
- **Práctica evaluada:** Diseñar la navegación con `_layout.tsx` por segmento, evitando duplicar configuración de stacks, tabs o drawers dentro de pantallas individuales.
- **Estado:** Cumple parcialmente
- **Evidencia encontrada:** Existe un único `src/app/_layout.tsx` que define explícitamente todas las pantallas: `<Stack.Screen name="asteroids/index" ... />`. No hay layouts específicos por carpeta (`src/app/asteroids/`, etc.).
- **Impacto técnico:** El layout raíz se vuelve un cuello de botella y un archivo de configuración manual frágil a medida que crecen los juegos.
- **¿Existe una razón de peso para no implementarla?:** No
- **Razón de peso:** No existe una razón de peso válida.
- **Veredicto:** Debe implementarse
- **Acción recomendada:** Crear layouts locales en cada carpeta de juego (ej. `src/app/asteroids/_layout.tsx`) para gestionar sus propios títulos y opciones de stack.
- **Prioridad:** Media
- **Esfuerzo estimado:** Bajo
- **Riesgo de implementación:** Bajo

#### Práctica 1.3
- **Práctica evaluada:** Usar rutas tipadas / typed routes para navegación segura, evitando strings hardcodeados e inconsistencias de params.
- **Estado:** Cumple parcialmente
- **Evidencia encontrada:** `typedRoutes: true` está habilitado en `app.json`. Sin embargo, en `src/app/index.tsx` se observa el uso de template strings: `router.push("/${game.id}/")`.
- **Impacto técnico:** El uso de strings anula la seguridad de tipos que Expo Router ofrece, permitiendo errores de navegación en runtime que TypeScript no detectará.
- **¿Existe una razón de peso para no implementarla?:** No
- **Razón de peso:** No existe una razón de peso válida.
- **Veredicto:** Debe implementarse
- **Acción recomendada:** Refactorizar las llamadas a `router.push` para usar rutas estáticas tipadas (ej. `router.push("/asteroids/")`) o el objeto de rutas generado.
- **Prioridad:** Media
- **Esfuerzo estimado:** Bajo
- **Riesgo de implementación:** Bajo

---

### 2. Expo CLI y Metro Bundler — Herramientas de desarrollo

#### Práctica 2.1
- **Práctica evaluada:** Usar `npx expo` como entrypoint estándar del proyecto para desarrollo, exportación y generación nativa.
- **Estado:** Cumple
- **Evidencia encontrada:** `package.json` define todos los scripts vitales usando `expo start`, `expo start --ios`, etc.
- **Impacto técnico:** Garantiza compatibilidad total con el ecosistema de herramientas de Expo y EAS.
- **¿Existe una razón de peso para no implementarla?:** N/A
- **Veredicto:** Mantener
- **Acción recomendada:** Ninguna.
- **Prioridad:** Baja
- **Esfuerzo estimado:** Bajo
- **Riesgo de implementación:** Bajo

#### Práctica 2.2
- **Práctica evaluada:** Extender Metro a partir de `getDefaultConfig()` sin reemplazar agresivamente la configuración base de Expo.
- **Estado:** Cumple
- **Evidencia encontrada:** `metro.config.js` utiliza `const config = getDefaultConfig(__dirname);` y extiende solo lo necesario para Tailwind y Skia.
- **Impacto técnico:** Permite añadir soporte para CSS-in-JS y Skia sin romper las optimizaciones internas de Expo (como el soporte de assets).
- **¿Existe una razón de peso para no implementarla?:** N/A
- **Veredicto:** Mantener
- **Acción recomendada:** Ninguna.
- **Prioridad:** Baja
- **Esfuerzo estimado:** Bajo
- **Riesgo de implementación:** Bajo

#### Práctica 2.3
- **Práctica evaluada:** Aprovechar code splitting, lazy loading o async routes cuando el tamaño o la complejidad del proyecto lo justifique.
- **Estado:** Cumple (por contexto)
- **Evidencia encontrada:** No se observa uso de `React.lazy`. El proyecto es una arcade ligera.
- **Impacto técnico:** Mejora el tiempo de carga inicial, especialmente crítico en la versión web.
- **¿Existe una razón de peso para no implementarla?:** Sí
- **Razón de peso:** El tamaño total del bundle es pequeño y los juegos comparten casi todo el motor (ECS). La segmentación añadiría complejidad de carga asíncrona innecesaria en este punto.
- **Veredicto:** Posponer justificadamente
- **Acción recomendada:** Reevaluar si el bundle web supera los 500KB o si se añaden recursos pesados específicos por juego.
- **Prioridad:** Baja
- **Esfuerzo estimado:** Medio
- **Riesgo de implementación:** Bajo

---

### 3. Actualizaciones Over-the-Air (OTA) con `expo-updates`

#### Práctica 3.1
- **Práctica evaluada:** Configurar correctamente `runtimeVersion` de forma alineada con la compatibilidad real del runtime nativo.
- **Estado:** Cumple
- **Evidencia encontrada:** `app.json` tiene configurado `runtimeVersion: { "policy": "appVersion" }`.
- **Impacto técnico:** Evita crashes críticos al intentar cargar actualizaciones de JS que dependen de módulos nativos no presentes en el binario instalado.
- **¿Existe una razón de peso para no implementarla?:** N/A
- **Veredicto:** Mantener
- **Acción recomendada:** Ninguna.
- **Prioridad:** Alta
- **Esfuerzo estimado:** Bajo
- **Riesgo de implementación:** Bajo

#### Práctica 3.2
- **Práctica evaluada:** Separar despliegues por channels/branches o entornos equivalentes (`preview`, `staging`, `production`).
- **Estado:** Cumple
- **Evidencia encontrada:** `eas.json` define canales `development`, `preview` y `production`. `package.json` tiene scripts `deploy:preview` y `deploy:prod`.
- **Impacto técnico:** Permite validar cambios en staging/preview sin afectar a los usuarios finales en producción.
- **¿Existe una razón de peso para no implementarla?:** N/A
- **Veredicto:** Mantener
- **Acción recomendada:** Ninguna.
- **Prioridad:** Alta
- **Esfuerzo estimado:** Bajo
- **Riesgo de implementación:** Bajo

#### Práctica 3.3
- **Práctica evaluada:** No usar OTA para cambios que requieren nuevo binario nativo.
- **Estado:** Cumple
- **Evidencia encontrada:** La política de `runtimeVersion` ligada a `appVersion` obliga a generar un nuevo update por cada cambio de versión de la app, lo cual es la práctica segura.
- **Impacto técnico:** Seguridad operativa y estabilidad de la aplicación instalada.
- **¿Existe una razón de peso para no implementarla?:** N/A
- **Veredicto:** Mantener
- **Acción recomendada:** Ninguna.
- **Prioridad:** Alta
- **Esfuerzo estimado:** Bajo
- **Riesgo de implementación:** Bajo

---

### 4. Continuous Native Generation (CNG) — `expo prebuild`

#### Práctica 4.1
- **Práctica evaluada:** Tratar `ios/` y `android/` como artefactos generados siempre que el modelo del proyecto lo permita.
- **Estado:** Cumple
- **Evidencia encontrada:** Las carpetas `ios/` y `android/` están ausentes en el repositorio, delegando su generación a `prebuild`.
- **Impacto técnico:** Elimina la deuda técnica de mantener código nativo manual y facilita las actualizaciones de versión del SDK de Expo.
- **¿Existe una razón de peso para no implementarla?:** N/A
- **Veredicto:** Mantener
- **Acción recomendada:** Ninguna.
- **Prioridad:** Alta
- **Esfuerzo estimado:** Bajo
- **Riesgo de implementación:** Bajo

#### Práctica 4.2
- **Práctica evaluada:** Encapsular customizaciones nativas repetibles mediante Config Plugins, evitando cambios manuales frágiles.
- **Estado:** Cumple
- **Evidencia encontrada:** Solo se utiliza el plugin base de `expo-router`. No hay modificaciones nativas manuales detectadas.
- **Impacto técnico:** Garantiza que el proceso de `prebuild` sea determinista y reproducible en cualquier entorno (local o CI).
- **¿Existe una razón de peso para no implementarla?:** N/A
- **Veredicto:** Mantener
- **Acción recomendada:** Ninguna.
- **Prioridad:** Media
- **Esfuerzo estimado:** Bajo
- **Riesgo de implementación:** Bajo

#### Práctica 4.3
- **Práctica evaluada:** Ejecutar `expo prebuild` cuando hay cambios nativos reales, no como paso reflejo para cambios puramente JS.
- **Estado:** Cumple
- **Evidencia encontrada:** No existe rastro de que `prebuild` se ejecute innecesariamente en el flujo local de desarrollo JS.
- **Impacto técnico:** Productividad del desarrollador.
- **¿Existe una razón de peso para no implementarla?:** N/A
- **Veredicto:** Mantener
- **Acción recomendada:** Ninguna.
- **Prioridad:** Baja
- **Esfuerzo estimado:** Bajo
- **Riesgo de implementación:** Bajo

---

### 5. Expo Modules Core — Sistema de módulos nativos

#### Práctica 5.1
- **Práctica evaluada:** Usar Expo Modules API para nuevo código nativo en Swift/Kotlin en lugar de patrones legacy cuando sea viable.
- **Estado:** Cumple (por ausencia)
- **Evidencia encontrada:** El proyecto no utiliza módulos nativos personalizados en este momento; se apoya 100% en el SDK de Expo.
- **Impacto técnico:** N/A
- **¿Existe una razón de peso para no implementarla?:** N/A
- **Veredicto:** Mantener
- **Acción recomendada:** Si se requiere integración con hardware arcade específico, usar obligatoriamente Expo Modules API.
- **Prioridad:** Baja
- **Esfuerzo estimado:** Bajo
- **Riesgo de implementación:** Bajo

#### Práctica 5.2
- **Práctica evaluada:** Usar `SharedObject` o patrones equivalentes para recursos nativos pesados o de larga vida cuando aplique.
- **Estado:** Cumple (No aplica)
- **Evidencia encontrada:** No se detectan recursos nativos pesados (cámaras, streams de audio complejos, etc.) que requieran gestión de ciclo de vida manual.
- **Impacto técnico:** N/A
- **Veredicto:** Mantener
- **Prioridad:** Baja

#### Práctica 5.3
- **Práctica evaluada:** Tener autolinking y metadata del módulo bien definidos para integración reproducible.
- **Estado:** Cumple
- **Evidencia encontrada:** Gestionado automáticamente por la arquitectura Expo del proyecto.
- **Impacto técnico:** Reproducibilidad de la build nativa.
- **Veredicto:** Mantener
- **Prioridad:** Baja

---

### 6. Development Client (`expo-dev-client`)

#### Práctica 6.1
- **Práctica evaluada:** Usar development builds en lugar de depender de Expo Go cuando hay módulos nativos propios o dependencias no soportadas por Expo Go.
- **Estado:** Cumple
- **Evidencia encontrada:** `expo-dev-client` está presente en `package.json` y `eas.json` tiene perfiles configurados para ello.
- **Impacto técnico:** Imprescindible para el uso de `@shopify/react-native-skia` y otros módulos nativos fuera del set base de Expo Go.
- **¿Existe una razón de peso para no implementarla?:** N/A
- **Veredicto:** Mantener
- **Acción recomendada:** Ninguna.
- **Prioridad:** Alta
- **Esfuerzo estimado:** Bajo
- **Riesgo de implementación:** Bajo

#### Práctica 6.2
- **Práctica evaluada:** Reconstruir el development client solo cuando cambie el runtime nativo.
- **Estado:** Cumple
- **Evidencia encontrada:** Se observa un uso correcto de las builds de EAS enfocadas en el cliente de desarrollo.
- **Impacto técnico:** Ahorro masivo de tiempo en CI y local.
- **Veredicto:** Mantener
- **Prioridad:** Media

#### Práctica 6.3
- **Práctica evaluada:** Usar development client para validar updates y comportamiento cercano a producción.
- **Estado:** Cumple
- **Evidencia encontrada:** La configuración de canales permite probar updates en el dev client antes de promocionarlos.
- **Impacto técnico:** Calidad de las releases.
- **Veredicto:** Mantener
- **Prioridad:** Media

---

### 7. EAS (Expo Application Services) — Build, Update y Submit

#### Práctica 7.1
- **Práctica evaluada:** Definir perfiles claros y reproducibles en `eas.json` (`development`, `preview`, `production` o equivalentes).
- **Estado:** Cumple
- **Evidencia encontrada:** Perfiles `development`, `preview` y `production` bien definidos en `eas.json`.
- **Impacto técnico:** Consistencia entre las builds de diferentes desarrolladores y entornos.
- **Veredicto:** Mantener
- **Acción recomendada:** Ninguna.
- **Prioridad:** Alta

#### Práctica 7.2
- **Práctica evaluada:** Separar conceptualmente y operativamente build, update y submit.
- **Estado:** Cumple
- **Evidencia encontrada:** Scripts diferenciados en `package.json` (`build:*`, `deploy:*`).
- **Impacto técnico:** Evita actualizaciones accidentales de producción al separar la generación del binario de la del bundle JS.
- **Veredicto:** Mantener
- **Prioridad:** Alta

#### Práctica 7.3
- **Práctica evaluada:** Automatizar pipelines con CI/CD o EAS Workflows cuando el proyecto ya tiene necesidad de releases repetibles.
- **Estado:** Cumple parcialmente
- **Evidencia encontrada:** Existe `.github/workflows/ci.yml` para lint y tests, pero no hay automatización para disparar `eas update` o `eas build` tras el éxito del CI.
- **Impacto técnico:** Productividad y reducción de errores manuales en despliegues.
- **¿Existe una razón de peso para no implementarla?:** No
- **Razón de peso:** No existe una razón de peso válida.
- **Veredicto:** Debe implementarse
- **Acción recomendada:** Configurar GitHub Actions para que ejecute `eas update` automáticamente en el canal `preview` al fusionar a la rama `develop`.
- **Prioridad:** Media
- **Esfuerzo estimado:** Medio
- **Riesgo de implementación:** Bajo

---

### 8. Módulos SDK nativos — Acceso a hardware y APIs del dispositivo

#### Práctica 8.1
- **Práctica evaluada:** Solicitar permisos en contexto y no de forma prematura.
- **Estado:** Cumple
- **Evidencia encontrada:** El proyecto casi no requiere permisos invasivos. El uso de Haptics está bien encapsulado y no bloquea el flujo.
- **Impacto técnico:** UX y cumplimiento de políticas de tiendas.
- **Veredicto:** Mantener
- **Prioridad:** Baja

#### Práctica 8.2
- **Práctica evaluada:** Resolver la configuración nativa necesaria en build-time mediante app config o plugins cuando aplique.
- **Estado:** Cumple
- **Evidencia encontrada:** `bundleIdentifier`, `package` name y esquemas definidos correctamente en `app.json`.
- **Impacto técnico:** Evita desajustes entre el código JS y la identidad del binario nativo.
- **Veredicto:** Mantener
- **Prioridad:** Alta

#### Práctica 8.3
- **Práctica evaluada:** Elegir el módulo de persistencia o acceso local correcto según el caso de uso (`expo-sqlite`, `expo-file-system`, etc.).
- **Estado:** Cumple
- **Evidencia encontrada:** Uso de `AsyncStorage` con validación mediante **Zod** en `useHighScore`. Correcto para el volumen actual de datos de una arcade.
- **Impacto técnico:** Integridad de datos y facilidad de uso.
- **Veredicto:** Mantener
- **Prioridad:** Media

---

### 9. Soporte multi-plataforma universal

#### Práctica 9.1
- **Práctica evaluada:** Mantener una base de código compartida por defecto y separar por plataforma solo cuando haya divergencia real.
- **Estado:** Cumple
- **Evidencia encontrada:** El core del motor en `src/engine` es 100% agnóstico a la plataforma, utilizando tipos universales.
- **Impacto técnico:** Mantenibilidad y ahorro de costes de desarrollo.
- **Veredicto:** Mantener
- **Prioridad:** Alta

#### Práctica 9.2
- **Práctica evaluada:** Usar archivos específicos por plataforma (`.ios.tsx`, `.android.tsx`, `.web.tsx`) solo para diferencias concretas.
- **Estado:** Cumple parcialmente
- **Evidencia encontrada:** Uso excesivo de condicionales `Platform.OS === 'web'` dispersos en archivos `.ts` generales (ej. `AsteroidsSkiaVisuals.ts`, `GameCanvas.tsx`).
- **Impacto técnico:** Limpieza del código y separación de intereses clara.
- **¿Existe una razón de peso para no implementarla?:** No
- **Razón de peso:** No existe una razón de peso válida.
- **Veredicto:** Debe implementarse
- **Acción recomendada:** Extraer las divergencias de renderizado de Skia para Web a archivos `.web.tsx` para evitar ensuciar la lógica core del motor.
- **Prioridad:** Baja
- **Esfuerzo estimado:** Medio
- **Riesgo de implementación:** Bajo

#### Práctica 9.3
- **Práctica evaluada:** Validar explícitamente diferencias de capacidad entre web, iOS y Android en lugar de asumir paridad.
- **Estado:** Cumple
- **Evidencia encontrada:** Manejo defensivo de Skia en web y desactivación silenciosa de haptics en plataformas no soportadas.
- **Impacto técnico:** Robustez de la aplicación en entornos limitados.
- **Veredicto:** Mantener
- **Prioridad:** Media

---

### 10. React Server Components (RSC) y API Routes

#### Práctica 10.1
- **Práctica evaluada:** Usar RSC/API Routes para lógica realmente server-side.
- **Estado:** Cumple (por ausencia)
- **Evidencia encontrada:** El proyecto es un juego puramente client-side. No existe lógica de servidor necesaria en este punto.
- **Impacto técnico:** N/A
- **¿Existe una razón de peso para no implementarla?:** Sí
- **Razón de peso:** El proyecto es local y offline por diseño. Añadir API Routes sería sobreingeniería para la funcionalidad actual.
- **Veredicto:** Mantener
- **Prioridad:** Baja

---

## 3. Plan de acción priorizado

| ID | Bloque | Práctica | Estado actual | Veredicto | Prioridad | Esfuerzo | Riesgo | Acción concreta | Motivo de negocio/técnico |
|---|---|---|---|---|---|---|---|---|---|
| A1 | **EXT** | Unificación Física | No cumple | **Debe implementarse** | **Alta** | Alto | Medio | Eliminar `src/game/GameEngine.tsx` y migrar Matter.js a un `PhysicsSystem` oficial dentro del ECS. | Eliminar divergencia arquitectónica crítica que duplica mantenimiento. |
| A2 | **EXT** | Determinismo Render | No cumple | **Debe implementarse** | **Alta** | Medio | Bajo | Reemplazar `Math.random()` en renderers por `RandomService` con semillas controladas. | Garantizar fidelidad visual y debugging determinista. |
| B1 | **1** | 1.2 Layouts locales | Cumple parcial | **Debe implementarse** | **Media** | Bajo | Bajo | Crear `_layout.tsx` en `asteroids/`, `space-invaders/`, etc. | Mejorar escalabilidad de la navegación y configuración de pantallas. |
| B2 | **1** | 1.3 Rutas tipadas | Cumple parcial | **Debe implementarse** | **Media** | Bajo | Bajo | Cambiar `router.push(string)` por rutas tipadas reales de Expo Router. | Eliminar errores de navegación silenciosos en runtime. |
| C1 | **7** | 7.3 Auto-Updates | Cumple parcial | **Debe implementarse** | **Media** | Medio | Bajo | Añadir step de `eas update` en GitHub Actions tras éxito de CI. | Mejorar la DX y asegurar que `preview` esté siempre actualizado. |
| D1 | **9** | 9.2 Arq. Plataforma | Cumple parcial | **Debe implementarse** | **Baja** | Medio | Bajo | Mover lógica de Skia Web a archivos `.web.tsx`. | Mejorar legibilidad y reducir el peso del bundle nativo. |
