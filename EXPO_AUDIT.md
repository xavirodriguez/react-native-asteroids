# Auditoría Técnica de Expo y Arquitectura Móvil - Proyecto Asteroides

## 1. Resumen ejecutivo

Tras una auditoría exhaustiva del proyecto "Asteroides", el estado general es de un **prototipo técnico de alta calidad en su lógica de motor (ECS)** pero con un **desaprovechamiento crítico de las capacidades de Expo y su ecosistema moderno**. El proyecto se comporta más como una aplicación de React Native "ejected" o tradicional que como una aplicación moderna basada en Expo SDK 55.

**Fortalezas principales:**
- **Arquitectura ECS robusta:** Separación clara entre motor (`src/engine`) y juegos (`src/games`).
- **CNG (Continuous Native Generation) puro:** Ausencia de carpetas `ios/` y `android/`, respetando el modelo de prebuild.
- **Configuración de EAS:** Perfiles definidos en `eas.json`.
- **Persistencia validada:** Uso de Zod para validar datos locales en `useHighScore.ts`.

**Incumplimientos más importantes:**
- **Navegación Anti-pattern:** El uso de estado React para cambiar entre juegos en `index.tsx` ignora por completo a Expo Router, rompiendo deep linking y gestión de historial.
- **Configuración de OTA inexistente:** Falta de `runtimeVersion` y estrategia de canales, lo que hace que los despliegues Over-the-Air sean peligrosos o impredecibles.
- **Falta de automatización CI/CD:** No hay workflows de GitHub Actions para automatizar builds o tests.

**Implementaciones imperativas (Sin excusa):**
- Migrar el selector de juegos de `index.tsx` a una estructura de archivos en `app/` (vía Expo Router).
- Configurar `runtimeVersion` (ej. `{"policy": "appVersion"}`) y política de actualizaciones en `app.json`.
- Mover `GameEngine.tsx` y `globals.css` fuera de `src/app/` (excepto si son requeridos por convención de layout).

**Decisiones justificadamente aplazables:**
- Adopción de RSC (React Server Components): El proyecto es puramente client-side (juegos), no aporta valor inmediato.
- Lazy loading: El bundle actual es pequeño, aunque será necesario al añadir más juegos.

---

## 2. Auditoría detallada por bloques y prácticas

### 1. Expo Router — Navegación basada en el sistema de archivos

#### Práctica 1.1
- **Práctica evaluada:** Mantener `app/` solo para rutas, pantallas y layouts.
- **Estado:** Cumple parcialmente
- **Evidencia encontrada:** `src/app/GameEngine.tsx` y `src/app/globals.css` están dentro de la carpeta de rutas. `index.tsx` contiene múltiples componentes de "Vista" integrados.
- **Impacto técnico:** Dificulta la lectura de la estructura de navegación y mezcla definición de rutas con lógica de componentes.
- **¿Existe una razón de peso para no implementarla?:** No
- **Razón de peso:** No existe una razón de peso válida.
- **Veredicto:** Debe implementarse
- **Acción recomendada:** Mover `GameEngine.tsx` a `src/components/` y la lógica de los juegos de `index.tsx` a archivos separados (ej. `src/app/asteroids/index.tsx`).
- **Prioridad:** Media
- **Esfuerzo estimado:** Bajo
- **Riesgo de implementación:** Bajo

#### Práctica 1.2
- **Práctica evaluada:** Diseñar navegación con `_layout.tsx` por segmento, evitando duplicar configuraciones.
- **Estado:** No cumple
- **Evidencia encontrada:** `src/app/_layout.tsx` es un `Slot` básico. La "navegación" real ocurre vía `useState<GameType | null>` en `index.tsx`.
- **Impacto técnico:** Se pierde el manejo de Back button nativo, deep linking para juegos específicos y optimización de stack de navegación.
- **¿Existe una razón de peso para no implementarla?:** No
- **Razón de peso:** No existe una razón de peso válida.
- **Veredicto:** Debe implementarse
- **Acción recomendada:** Crear rutas `/asteroids`, `/space-invaders`, etc., y usar `router.push()` para navegar.
- **Prioridad:** Alta
- **Esfuerzo estimado:** Medio
- **Riesgo de implementación:** Bajo

#### Práctica 1.3
- **Práctica evaluada:** Usar rutas tipadas / typed routes.
- **Estado:** Cumple (Configuración) / No cumple (Uso)
- **Evidencia encontrada:** `experiments.typedRoutes: true` en `app.json`, pero no hay navegación que las utilice.
- **Impacto técnico:** Preparado para el futuro, pero sin beneficio actual.
- **¿Existe una razón de peso para no implementarla?:** No
- **Razón de peso:** No existe una razón de peso válida.
- **Veredicto:** Mantener (y usar tras refactorización de 1.2)
- **Acción recomendada:** Implementar navegación programática usando las rutas generadas.
- **Prioridad:** Baja
- **Esfuerzo estimado:** Muy bajo
- **Riesgo de implementación:** Nulo

---

### 2. Expo CLI y Metro Bundler — Herramientas de desarrollo

#### Práctica 2.1
- **Práctica evaluada:** Usar `npx expo` como entrypoint estándar.
- **Estado:** Cumple
- **Evidencia encontrada:** `package.json` define scripts usando `expo start`, `expo ios`, etc.
- **Impacto técnico:** Asegura compatibilidad con el ecosistema Expo y versiones de SDK.
- **¿Existe una razón de peso para no implementarla?:** N/A
- **Razón de peso:** N/A
- **Veredicto:** Mantener
- **Acción recomendada:** Ninguna.
- **Prioridad:** Baja
- **Esfuerzo estimado:** Nulo
- **Riesgo de implementación:** Nulo

#### Práctica 2.2
- **Práctica evaluada:** Extender Metro a partir de `getDefaultConfig()`.
- **Estado:** Cumple
- **Evidencia encontrada:** `metro.config.js` usa `const config = getDefaultConfig(__dirname);` y añade soporte para CSS y Skia.
- **Impacto técnico:** Evita romper la resolución de assets y módulos estándar de Expo.
- **¿Existe una razón de peso para no implementarla?:** N/A
- **Razón de peso:** N/A
- **Veredicto:** Mantener
- **Acción recomendada:** Ninguna.
- **Prioridad:** Baja
- **Esfuerzo estimado:** Nulo
- **Riesgo de implementación:** Nulo

#### Práctica 2.3
- **Práctica evaluada:** Code splitting y lazy loading.
- **Estado:** No cumple
- **Evidencia encontrada:** Todos los componentes y lógica de todos los juegos se importan estáticamente en `index.tsx`.
- **Impacto técnico:** Aumenta el tiempo de carga inicial innecesariamente para juegos que el usuario quizás no juegue.
- **¿Existe una razón de peso para no implementarla?:** Sí
- **Razón de peso:** El tamaño actual del proyecto es pequeño y el impacto en performance es insignificante por ahora.
- **Veredicto:** Posponer justificadamente
- **Acción recomendada:** Introducir `React.lazy` cuando el número de juegos supere los 5 o se incluyan assets pesados.
- **Prioridad:** Baja
- **Esfuerzo estimado:** Bajo
- **Riesgo de implementación:** Bajo

---

### 3. Actualizaciones Over-the-Air (OTA) con `expo-updates`

#### Práctica 3.1
- **Práctica evaluada:** Configurar `runtimeVersion` alineada con el runtime nativo.
- **Estado:** No cumple
- **Evidencia encontrada:** Ausencia de `runtimeVersion` en `app.json`.
- **Impacto técnico:** Riesgo crítico de enviar código JS incompatible con el runtime nativo instalado, causando crashes inmediatos.
- **¿Existe una razón de peso para no implementarla?:** No
- **Razón de peso:** No existe una razón de peso válida.
- **Veredicto:** **Debe implementarse**
- **Acción recomendada:** Definir `"runtimeVersion": { "policy": "appVersion" }` en `app.json`.
- **Prioridad:** Alta
- **Esfuerzo estimado:** Muy bajo
- **Riesgo de implementación:** Medio (requiere nuevos builds nativos).

#### Práctica 3.2
- **Práctica evaluada:** Separar despliegues por channels/branches.
- **Estado:** No cumple
- **Evidencia encontrada:** No hay configuración de `updates` ni mapeo de canales en `eas.json`.
- **Impacto técnico:** Imposibilidad de testear updates en staging antes de enviarlos a producción.
- **¿Existe una razón de peso para no implementarla?:** No
- **Razón de peso:** No existe una razón de peso válida.
- **Veredicto:** **Debe implementarse**
- **Acción recomendada:** Configurar `channel` en los perfiles de `eas.json` y el plugin `expo-updates` en `app.json`.
- **Prioridad:** Alta
- **Esfuerzo estimado:** Bajo
- **Riesgo de implementación:** Bajo

#### Práctica 3.3
- **Práctica evaluada:** No usar OTA para cambios nativos.
- **Estado:** Cumple (por omisión)
- **Evidencia encontrada:** No hay uso activo de OTA, lo que evita errores accidentales en este ámbito.
- **Impacto técnico:** Seguridad operacional.
- **¿Existe una razón de peso para no implementarla?:** N/A
- **Razón de peso:** N/A
- **Veredicto:** Mantener
- **Acción recomendada:** Documentar el proceso de release nativo vs JS para el equipo.
- **Prioridad:** Baja
- **Esfuerzo estimado:** Nulo
- **Riesgo de implementación:** Nulo

---

### 4. Continuous Native Generation (CNG) — `expo prebuild`

#### Práctica 4.1
- **Práctica evaluada:** Tratar `ios/` y `android/` como artefactos generados.
- **Estado:** Cumple completamente
- **Evidencia encontrada:** Las carpetas nativas no están en el repositorio.
- **Impacto técnico:** Máxima mantenibilidad y facilidad de actualización de SDK.
- **¿Existe una razón de peso para no implementarla?:** N/A
- **Razón de peso:** N/A
- **Veredicto:** Mantener
- **Acción recomendada:** Continuar con este modelo. No hacer "eject" ni commit de carpetas nativas.
- **Prioridad:** Alta
- **Esfuerzo estimado:** Nulo
- **Riesgo de implementación:** Nulo

#### Práctica 4.2
- **Práctica evaluada:** Encapsular customizaciones nativas mediante Config Plugins.
- **Estado:** Cumple (por omisión)
- **Evidencia encontrada:** No hay customizaciones nativas complejas que requieran plugins manuales.
- **Impacto técnico:** Simplicidad.
- **¿Existe una razón de peso para no implementarla?:** N/A
- **Razón de peso:** N/A
- **Veredicto:** Mantener
- **Acción recomendada:** Si se añade código nativo, usar Config Plugins.
- **Prioridad:** Media
- **Esfuerzo estimado:** N/A
- **Riesgo de implementación:** N/A

#### Práctica 4.3
- **Práctica evaluada:** Ejecutar `expo prebuild` solo cuando hay cambios nativos reales.
- **Estado:** Cumple
- **Evidencia encontrada:** El flujo basado en EAS Build gestiona esto de forma automática.
- **Impacto técnico:** Flujo de desarrollo limpio.
- **¿Existe una razón de peso para no implementarla?:** N/A
- **Razón de peso:** N/A
- **Veredicto:** Mantener
- **Acción recomendada:** Ninguna.
- **Prioridad:** Baja
- **Esfuerzo estimado:** Nulo
- **Riesgo de implementación:** Nulo

---

### 5. Expo Modules Core

#### Práctica 5.1
- **Práctica evaluada:** Usar Expo Modules API para nuevo código nativo.
- **Estado:** Cumple (por omisión)
- **Evidencia encontrada:** No hay módulos nativos personalizados.
- **Impacto técnico:** Preparado para extensibilidad moderna.
- **¿Existe una razón de peso para no implementarla?:** N/A
- **Razón de peso:** N/A
- **Veredicto:** Mantener
- **Acción recomendada:** Si se requiere funcionalidad nativa no existente en el SDK, crear un Expo Module.
- **Prioridad:** Media
- **Esfuerzo estimado:** N/A
- **Riesgo de implementación:** N/A

---

### 6. Development Client (`expo-dev-client`)

#### Práctica 6.1
- **Práctica evaluada:** Usar development builds en lugar de Expo Go.
- **Estado:** Cumple
- **Evidencia encontrada:** `expo-dev-client` está instalado y configurado en `eas.json` bajo el perfil `development`.
- **Impacto técnico:** Permite testear módulos como `@shopify/react-native-skia` con el runtime real.
- **¿Existe una razón de peso para no implementarla?:** N/A
- **Veredicto:** Mantener
- **Acción recomendada:** Asegurar que todo el equipo use el Development Client y no Expo Go.
- **Prioridad:** Alta
- **Esfuerzo estimado:** Bajo
- **Riesgo de implementación:** Bajo

---

### 7. EAS (Expo Application Services)

#### Práctica 7.1
- **Práctica evaluada:** Definir perfiles claros en `eas.json`.
- **Estado:** Cumple
- **Evidencia encontrada:** `eas.json` tiene perfiles para `development`, `preview` y `production`.
- **Impacto técnico:** Estandarización de builds por entorno.
- **¿Existe una razón de peso para no implementarla?:** N/A
- **Veredicto:** Mantener
- **Acción recomendada:** Ninguna.
- **Prioridad:** Baja
- **Esfuerzo estimado:** Nulo
- **Riesgo de implementación:** Nulo

#### Práctica 7.2
- **Práctica evaluada:** Separar build, update y submit.
- **Estado:** Cumple parcialmente
- **Evidencia encontrada:** Los comandos existen en el CLI, pero no hay una estrategia clara de updates separada de builds nativos en los scripts de `package.json`.
- **Impacto técnico:** Riesgo de confusión operativa.
- **¿Existe una razón de peso para no implementarla?:** No
- **Razón de peso:** No existe una razón de peso válida.
- **Veredicto:** Debe implementarse
- **Acción recomendada:** Crear scripts en `package.json` específicos para `deploy:prod` (update) vs `build:prod` (binario).
- **Prioridad:** Media
- **Esfuerzo estimado:** Bajo
- **Riesgo de implementación:** Bajo

#### Práctica 7.3
- **Práctica evaluada:** Automatizar pipelines con CI/CD.
- **Estado:** No cumple
- **Evidencia encontrada:** Ausencia total de carpeta `.github/` o configuraciones de CI.
- **Impacto técnico:** Falta de feedback inmediato sobre tests (que sí existen) y posibilidad de despliegues manuales inconsistentes.
- **¿Existe una razón de peso para no implementarla?:** No
- **Razón de peso:** No existe una razón de peso válida.
- **Veredicto:** **Debe implementarse**
- **Acción recomendada:** Crear un workflow de GitHub Actions para correr `npm test` y `lint` en cada PR.
- **Prioridad:** Alta
- **Esfuerzo estimado:** Medio
- **Riesgo de implementación:** Bajo

---

### 8. Módulos SDK nativos

#### Práctica 8.1
- **Práctica evaluada:** Solicitar permisos en contexto.
- **Estado:** Cumple (por omisión)
- **Evidencia encontrada:** No hay uso de APIs que requieran permisos sensibles.
- **Impacto técnico:** Buen UX preventivo.
- **¿Existe una razón de peso para no implementarla?:** N/A
- **Veredicto:** Mantener
- **Acción recomendada:** Si se añade audio u otros, seguir esta práctica estrictamente.
- **Prioridad:** Baja
- **Esfuerzo estimado:** N/A
- **Riesgo de implementación:** N/A

#### Práctica 8.3
- **Práctica evaluada:** Elegir el módulo de persistencia correcto.
- **Estado:** Cumple
- **Evidencia encontrada:** Uso de `AsyncStorage` validado con Zod para puntuaciones.
- **Impacto técnico:** Adecuado para datos simples y clave-valor.
- **¿Existe una razón de peso para no implementarla?:** N/A
- **Veredicto:** Mantener
- **Acción recomendada:** Si el volumen de datos crece (ej. niveles guardados), evaluar `expo-sqlite`.
- **Prioridad:** Baja
- **Esfuerzo estimado:** Nulo
- **Riesgo de implementación:** Nulo

---

### 9. Soporte multi-plataforma universal

#### Práctica 9.1
- **Práctica evaluada:** Mantener una base de código compartida por defecto.
- **Estado:** Cumple completamente
- **Evidencia encontrada:** El 100% del código está en `src/` y se usa en todas las plataformas.
- **Impacto técnico:** Drástica reducción de costes de mantenimiento.
- **¿Existe una razón de peso para no implementarla?:** N/A
- **Veredicto:** Mantener
- **Acción recomendada:** Seguir favoreciendo componentes universales.
- **Prioridad:** Alta
- **Esfuerzo estimado:** Nulo
- **Riesgo de implementación:** Nulo

---

### 10. React Server Components (RSC) y API Routes

#### Práctica 10.1
- **Práctica evaluada:** Usar RSC/API Routes para lógica server-side.
- **Estado:** No cumple (Justificado)
- **Evidencia encontrada:** No hay uso de estas capacidades.
- **Impacto técnico:** El proyecto es un juego interactivo en tiempo real (60fps), RSC no es la herramienta adecuada para el núcleo del juego.
- **¿Existe una razón de peso para no implementarla?:** Sí
- **Razón de peso:** La naturaleza del proyecto es un cliente de juego offline/local. Añadir lógica de servidor añadiría latencia y complejidad sin beneficios claros para la experiencia de arcade actual.
- **Veredicto:** Posponer justificadamente
- **Acción recomendada:** Considerar API Routes solo si se implementa un Leaderboard global centralizado.
- **Prioridad:** Baja
- **Esfuerzo estimado:** Alto
- **Riesgo de implementación:** Medio

---

## 3. Plan de acción priorizado

| ID | Bloque | Práctica | Estado actual | Veredicto | Prioridad | Esfuerzo | Riesgo | Acción concreta | Motivo |
|:---|:---|:---|:---|:---|:---|:---|:---|:---|:---|
| 01 | 3 | 3.1 | No cumple | **Debe implementarse** | **Alta** | Bajo | Medio | Añadir `runtimeVersion` en `app.json` | Evitar crashes por desincronización OTA/Nativo |
| 02 | 1 | 1.2 | No cumple | **Debe implementarse** | **Alta** | Medio | Bajo | Migrar selector de juegos a rutas reales de Expo Router | Habilitar deep linking y gestión de historial correcta |
| 03 | 7 | 7.3 | No cumple | **Debe implementarse** | **Alta** | Medio | Bajo | Configurar GitHub Actions para Tests y Linting | Garantizar calidad en cada commit/PR |
| 04 | 3 | 3.2 | No cumple | **Debe implementarse** | **Alta** | Bajo | Bajo | Configurar canales en `eas.json` y `app.json` | Permitir pruebas en staging antes de prod |
| 05 | 1 | 1.1 | Parcial | Debe implementarse | Media | Bajo | Bajo | Sacar `GameEngine.tsx` y CSS de la carpeta `app/` | Limpiar estructura de navegación |
| 06 | 7 | 7.2 | Parcial | Debe implementarse | Media | Bajo | Bajo | Definir scripts de despliegue (`eas update --channel`) | Estandarizar operaciones de release |
| 07 | 2 | 2.3 | No cumple | Posponer | Baja | Medio | Bajo | Implementar `React.lazy` para juegos individuales | Optimizar bundle size a largo plazo |
| 08 | 10 | 10.1 | No cumple | Posponer | Baja | Alto | Medio | Evaluar API Routes para Leaderboards | Futura funcionalidad de red |

**Conclusión del Staff Engineer:**
El proyecto tiene un corazón técnico excelente (el motor ECS y el determinismo están muy bien logrados), pero la arquitectura de la aplicación Expo está suboptimizada. La implementación de los puntos **01, 02 y 03** es obligatoria para garantizar la estabilidad en producción y la eficiencia del equipo. No hay razones técnicas válidas para seguir evitando Expo Router o el control de Runtime en un proyecto con SDK 55.

---
**Firmado:**
*Jules, Staff Engineer*
