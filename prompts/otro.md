Actúa como **arquitecto de software senior + staff engineer + technical writer** especializado en motores ECS, juegos deterministas, rollback netcode, TypeScript y documentación técnica mantenible.

Tu misión es intervenir sobre un repositorio con documentación y código de un motor/juego arcade basado en ECS, y **resolver estos 5 objetivos críticos**:

1. Separar claramente **arquitectura actual** vs **arquitectura objetivo**
2. Garantizar **determinismo real**, no solo documentado
3. Eliminar **duplicación entre ECS y networking/predicción**
4. Unificar el **sistema físico**, retirando o encapsulando el legacy
5. Consolidar la documentación en un **índice estructurado y mantenible**

No te limites a opinar. Debes trabajar como si fueras responsable de dejar una propuesta ejecutable, coherente y priorizada.

---

### Contexto de trabajo

Asume que el repositorio contiene una mezcla de:

* documentación de arquitectura actual
* propuestas de refactor
* contratos técnicos
* documentación de multiplayer/rollback
* riesgos conceptuales
* guías de onboarding
* documentos creativos y de diseño de producto

También asume que hoy existen síntomas como:

* mezcla de documentos vigentes y aspiracionales
* riesgo de no determinismo por uso de fuentes no controladas de aleatoriedad o tiempo
* duplicación de lógica entre simulación ECS y capa de red/predicción
* coexistencia de sistemas legacy y target en física/colisiones
* dificultad de onboarding por ausencia de un índice documental claro

---

### Entregable esperado

Produce una respuesta exhaustiva, estructurada y accionable con estas secciones exactas:

#### 1. Diagnóstico ejecutivo

Resume el estado del proyecto en lenguaje técnico preciso:

* qué problemas hay
* por qué son graves
* qué dependencias existen entre ellos
* cuál es el orden correcto de resolución

#### 2. Arquitectura actual vs arquitectura objetivo

Construye una separación explícita entre ambas:

* qué elementos pertenecen al estado actual
* qué elementos pertenecen al estado objetivo
* qué documentos deberían marcarse como `CURRENT`, `TARGET`, `PROPOSAL` o `DEPRECATED`
* qué contradicciones o solapamientos hay
* qué estructura nueva de carpetas y documentos propones

Incluye una tabla con estas columnas:

* Elemento
* Estado actual
* Estado objetivo
* Riesgo si no se aclara
* Acción recomendada

#### 3. Plan para garantizar determinismo real

Diseña un plan técnico concreto para asegurar simulación determinista.

Debes cubrir como mínimo:

* PRNG centralizado con semilla compartida
* prohibición de `Math.random()` y equivalentes fuera de la capa autorizada
* prohibición o encapsulación de `Date.now()` / tiempo no controlado
* orden estable de iteración de entidades y sistemas
* tratamiento de mutabilidad en queries, colecciones y snapshots
* snapshot/restore confiable
* estrategia de pruebas de determinismo

Entrega:

* reglas técnicas
* mecanismos de enforcement
* tests necesarios
* criterios de aceptación

#### 4. Plan para eliminar duplicación ECS vs networking

Diseña una arquitectura en la que:

* la simulación viva en un único sitio
* el networking no reimplemente reglas de juego
* predicción, reconciliación y rollback usen la misma lógica central

Debes especificar:

* qué responsabilidades quedan en ECS
* qué responsabilidades quedan en networking
* qué APIs o boundaries propones
* qué partes habría que migrar primero
* cómo evitar regresiones

Incluye una propuesta de flujo:
`input -> world.step() -> snapshot -> serialize -> reconcile -> rollback -> re-simulate`

#### 5. Plan para unificar el sistema físico

Analiza cómo consolidar la física/collision stack alrededor de un único modelo canónico.

Debes incluir:

* identificación de piezas legacy vs target
* estrategia de migración por fases
* qué abstraer, qué deprecar y qué eliminar
* cómo evitar que convivan dos verdades indefinidamente
* contratos mínimos de física/colisión

Incluye una decisión explícita:

* cuál será el estándar canónico final
* qué componentes/sistemas quedan fuera

#### 6. Plan de consolidación documental

Diseña una nueva arquitectura documental.

Debe incluir:

* propuesta de `docs/README.md`
* orden de lectura recomendado
* taxonomía documental
* convenciones de estado (`CURRENT`, `TARGET`, etc.)
* qué documentos fusionar
* qué documentos archivar
* qué documentos deben convertirse en contratos vivos

Propón un árbol de carpetas ejemplo, por ejemplo:

* `docs/README.md`
* `docs/architecture/current.md`
* `docs/architecture/target.md`
* `docs/contracts/...`
* `docs/migration/...`
* `docs/archive/...`

#### 7. Roadmap de ejecución

Genera un roadmap por fases, con prioridad realista:

Para cada fase incluye:

* objetivo
* tareas
* dependencias
* riesgo
* entregables
* criterio de “done”

#### 8. Cambios concretos recomendados

Entrega una lista priorizada y específica de cambios, por ejemplo:

* archivos a crear
* archivos a renombrar
* archivos a fusionar
* validaciones a introducir
* tests a crear
* reglas de lint a añadir
* checks de CI a incorporar

#### 9. Riesgos residuales

Explica qué problemas podrían seguir existiendo incluso después del plan, y cómo mitigarlos.

#### 10. Resultado final esperado

Describe cómo se vería el repositorio si el plan se ejecuta correctamente:

* arquitectura más clara
* mayor confiabilidad para multiplayer
* menos deuda técnica
* onboarding más rápido
* documentación gobernable

---

### Reglas de trabajo

Sigue estas reglas estrictamente:

* No des consejos genéricos; da acciones concretas
* No supongas que la documentación actual es consistente
* Identifica contradicciones y dilo explícitamente
* Separa claramente “describir” de “proponer”
* Prioriza decisiones que reduzcan ambigüedad
* Si propones un estándar canónico, debes decir qué queda deprecated
* Si propones contratos, explica cómo se hacen enforceables
* Si propones migración, debe ser incremental y verificable
* Piensa como responsable de mantener el proyecto a medio plazo
* Cuando haya conflicto entre flexibilidad y claridad, prioriza claridad
* Evita lenguaje vago como “quizás”, “podría ser útil”, “sería interesante”
* Usa lenguaje técnico y criterios verificables

---

### Formato de salida

Responde en español.

Usa esta estructura exacta de encabezados:

# Diagnóstico ejecutivo

# Arquitectura actual vs arquitectura objetivo

# Plan para garantizar determinismo real

# Plan para eliminar duplicación ECS vs networking

# Plan para unificar el sistema físico

# Plan de consolidación documental

# Roadmap de ejecución

# Cambios concretos recomendados

# Riesgos residuales

# Resultado final esperado

Incluye tablas cuando aporten claridad.
Incluye listas priorizadas cuando haya decisiones o tareas.
Incluye criterios de aceptación concretos.
No cierres con una pregunta.
