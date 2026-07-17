# Posibles evoluciones — react-native-asteroids

Este documento delinea las direcciones prospectivas y de mediano/largo plazo del motor de juego y la arquitectura del monorepo, sirviendo como guía para futuros equipos y agentes de desarrollo.

---

## Candidatos identificados

### 1. Extracción de TinyEngine a un paquete independiente
- **Motivación:** Actualmente, la lógica del motor ECS (`World`, `System`, `Entity`, `Component`, etc.) y los sistemas genéricos comparten el mismo espacio de trabajo de empaquetado `@tiny-aster/core` que el minijuego de Asteroids (aunque este último no esté expuesto en el barrel raíz). Separar el motor en su propio paquete `@tiny-aster/engine` o similar aislaría por completo el framework genérico, facilitando su consumo en cualquier tipo de proyecto sin arrastrar dependencias secundarias o lógica física de juegos específicos.
- **Esfuerzo estimado:** Medio
- **Riesgo de Regresión:** Bajo. El API público del ECS permanece inalterado; el cambio es principalmente de reorganización física de archivos y reconfiguración de paths del monorepo.
- **Dependencias:** Ninguna decisión estructural previa bloquea esta tarea. Requiere re-enrutar las importaciones físicas e internas del monorepo.

### 2. Extracción completa del juego Asteroids fuera de `packages/core`
- **Motivación:** El juego Asteroids reside físicamente bajo `packages/core/src/games/asteroids/`, violando el principio de frontera Core vs Aplicación. El objetivo de evolución es mover todo el código de Asteroids al directorio general de minijuegos `src/games/asteroids/` (junto con Flappy Bird, Pong y Space Invaders), o alternativamente crear un paquete separado del monorepo de tipo `@tiny-aster/game-asteroids`.
- **Esfuerzo estimado:** Medio
- **Riesgo de Regresión:** Bajo-Medio. Requiere especial cuidado en la configuración del empaquetado del servidor headless (NodeJS Colyseus) para importar de forma correcta el juego desde su nueva ubicación física.
- **Dependencias:** Extracción de TinyEngine o ajuste de los puntos de exportación en los subpaquetes del monorepo.

### 3. Generalización polimórfica del pipeline de renderizado de Skia / Canvas
- **Motivación:** Algunos minijuegos tienen sistemas de presentación acoplados a contextos específicos (como canvas HTML5 o React Native Skia). Generalizar el pipeline mediante un sistema de dibujo abstracto permitiría intercambiar los backends de renderizado de forma transparente para todos los juegos sin modificar su lógica física interna.
- **Esfuerzo estimado:** Alto
- **Riesgo de Regresión:** Medio-Alto. Puede afectar el rendimiento de pintado, stutters de frames e introducir desajustes de escalamiento en dispositivos móviles de diferentes resoluciones.
- **Dependencias:** Ninguna.

---

## Alternativas Descartadas Permanentemente
*(Nota: Sin decisiones de exclusión o alternativas formalmente descartadas en el historial del monorepo hasta la fecha actual).*

Cualquier futura alternativa rechazada por debate de diseño (por ejemplo, el descarte de librerías de físicas pesadas externas en favor de integradores de Euler deterministas personalizados) deberá ser registrada en esta sección para evitar análisis técnicos redundantes en el futuro.
