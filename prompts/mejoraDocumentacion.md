Quiero que actúes como revisor técnico-editorial senior de una codebase TypeScript/JavaScript orientada a motores de juego/ECS/rendering, y que hagas una pasada exhaustiva por TODO el código fuente del repositorio para corregir la documentación inline y pública.

OBJETIVO
Reescribir y sanear la documentación del proyecto para que sea:
- técnicamente precisa,
- verificable contra la implementación real,
- no engañosa,
- consistente con la API pública,
- clara respecto a garantías, limitaciones y supuestos.

ALCANCE
Debes revisar de forma exhaustiva:
- archivos .ts, .tsx, .js, .jsx, .d.ts
- comentarios JSDoc/TSDoc
- documentación inline en clases, interfaces, funciones, métodos, tipos y namespaces
- entrypoints públicos
- barrel files / index.ts
- tipos exportados y no exportados que aparezcan en superficies públicas
- bloques @remarks, @example, @warning, @deprecated, @internal, etc.

También puedes corregir documentación en:
- README internos de módulos si existen dentro del repo
- comentarios de arquitectura relevantes
- notas de compatibilidad o migración, si están junto al código

NO te limites al archivo .d.ts. Debes inspeccionar el código fuente real y usar la implementación como fuente de verdad.

PRINCIPIO RECTOR
La documentación NO debe prometer más de lo que el código realmente garantiza.
Si una afirmación no está respaldada por la implementación o el contrato público, debes rebajarla, condicionarla o eliminarla.

PROBLEMAS A CORREGIR PRIORITARIAMENTE
Busca y corrige de forma global cualquier documentación que caiga en estos patrones:

1. GARANTÍAS ABSOLUTAS NO SUSTENTADAS
Debes detectar y corregir frases como:
- “garantiza”
- “siempre”
- “exactamente”
- “estricto”
- “idéntico”
- “atómico”
- “determinista” usado de forma absoluta
- “zero-allocation”
- “elimina allocaciones por frame”
- “prohíbe async”
cuando la implementación real no lo haga cumplir de forma fuerte.

Sustituye ese lenguaje por formulaciones como:
- “designed to”
- “intended to”
- “aims to”
- “under these constraints”
- “in practice”
- “reduces”
- “minimizes”
- “helps preserve”
- “supports reproducibility when...”

2. DETERMINISMO SOBRERREIVINDICADO
Revisa cualquier documentación sobre:
- game loop
- fixed timestep
- rollback
- replay
- snapshots
- serialización
- hashing
- scene transitions
- event ordering
- async lifecycle
- rendering snapshots
- input capture

Debes distinguir entre:
- determinismo real garantizado,
- reproducibilidad condicionada,
- consistencia aproximada,
- comportamiento dependiente de restricciones operativas.

Si el sistema depende de:
- estado inicial correcto,
- orden estable de iteración,
- ausencia de side effects async,
- serialización estable,
- callbacks sin mutaciones estructurales,
entonces la documentación debe decirlo explícitamente.

3. CLAIMS DE RENDIMIENTO / ZERO-ALLOCATION
Revisa todo claim de:
- “zero-allocation”
- “no allocations”
- “eliminates GC pressure”
- “constant-time”
- “O(1)” si no es realmente defendible
- “optimal”
- “high-performance” sin matiz

Si el código usa:
- arrays,
- objetos temporales,
- closures,
- records,
- snapshots,
- buffers externos,
- callbacks de usuario,
- objetos options,
- estructuras que pueden crecer,
entonces NO se debe documentar como zero-allocation absoluto.
Reescribe como reducción o minimización de allocaciones en hot paths, solo si el código lo respalda.

4. CONTRATOS QUE EN REALIDAD SON GUÍAS
Busca etiquetas o frases tipo:
- @contract
- @postcondition
- @precondition
- @invariant
- “must”
- “debe”
- “required”
cuando el sistema no valida realmente ese comportamiento.
En esos casos:
- conserva la intención,
- pero reescribe como expectativa o recomendación,
- salvo que el código efectivamente haga enforce.

5. API PÚBLICA CONFUSA O MAL ALINEADA
Detecta cualquier caso donde:
- tipos no exportados aparezcan en miembros/properties/métodos públicos o protegidos documentados como si fueran públicos,
- la documentación sugiera estabilidad pública en detalles internos,
- existan superficies legacy mezcladas con modernas sin suficiente claridad.

Debes:
- marcar internals como internals,
- usar @internal cuando proceda,
- documentar claramente qué es superficie estable y qué es detalle de implementación,
- reforzar @deprecated cuando existan rutas modernas preferidas,
- evitar que un barrel file “moderno/canónico” parezca limpio si en realidad exporta legado por compatibilidad.

6. CONTRADICCIONES ENTRE IMPLEMENTACIÓN Y DOC
Compara siempre doc vs código real.
Ejemplos de contradicción a buscar:
- doc dice stateless pero el sistema mantiene caches/sets/estado auxiliar
- doc dice atomicidad pero hay await o pasos parciales
- doc dice orden garantizado pero la colección no lo garantiza o depende de inserción/engine
- doc dice exact restore pero snapshot omite partes no serializables
- doc dice safe callback pero mutar el world ahí rompe la iteración
- doc dice identical across FPS pero usa floats/smoothing acumulativo
- doc dice sync only pero la API puede disparar efectos async indirectos

Corrige la doc para que refleje fielmente la realidad.

7. WARNINGS IMPORTANTES ESCONDIDOS
Haz más visibles los warnings críticos relacionados con:
- mutar el World durante iteración
- crear/eliminar entidades dentro de callbacks sensibles
- modificar colecciones durante colisiones
- hooks async o side effects diferidos
- serialización parcial
- orden no garantizado de listeners
- limitaciones de replay
- limitaciones de hashing
- diferencias entre estado lógico y estado visual
- riesgo de spiral of death / clamping / frame skipping

Estos warnings deben aparecer cerca de la API afectada, no enterrados.

8. TONO EXCESIVAMENTE “FORMALISTA”
Si encuentras mucha documentación con apariencia de formalismo fuerte pero sin validación real, reestructura el lenguaje en categorías más honestas:
- Guaranteed
- Expected
- Recommended
- Warning
- Known limitations

No inventes garantías.
No conviertas intención de diseño en contrato duro.

CRITERIOS DE REESCRITURA
Cada corrección debe seguir estas reglas:
- Mantén el idioma predominante del archivo; no mezcles idiomas sin motivo.
- Conserva el estilo general del proyecto si es razonable, pero prioriza precisión.
- No hagas la documentación más “bonita”; hazla más verdadera.
- Evita marketing técnico.
- Evita adjetivos grandilocuentes si no están justificados.
- Prefiere especificidad operativa frente a eslóganes.
- Si algo es una aspiración, dilo como aspiración.
- Si algo depende de condiciones, enumera esas condiciones.
- Si algo no puede garantizarse desde la API pública, no lo presentes como garantía.
- No cambies firmas ni comportamiento salvo que sea imprescindible para alinear docs y visibilidad.
- Si detectas que el problema documental proviene de una mala exportación o de un símbolo mal marcado (@internal / export), puedes ajustar esa señalización si el cambio es pequeño y seguro.

INSTRUCCIONES OPERATIVAS
1. Recorre todo el repositorio.
2. Identifica todos los puntos donde la documentación sea:
   - falsa,
   - demasiado fuerte,
   - ambigua,
   - contradictoria,
   - confusa,
   - misleading,
   - o incoherente con la implementación.
3. Edita los archivos directamente.
4. Haz cambios pequeños y precisos, no reescrituras arbitrarias.
5. Preserva ejemplos útiles, pero corrígelos si inducen a error.
6. Si encuentras duplicación de documentación entre fuente y .d.ts generado, prioriza corregir la fuente de verdad.
7. Si el .d.ts es manual y forma parte de la API pública mantenida, corrígelo también.
8. Si ves un claim dudoso y no puedes verificarlo en el código, rebájalo.
9. Si detectas comportamientos peligrosos, añade warnings explícitos donde corresponda.
10. Si encuentras piezas deprecated, documenta la alternativa moderna recomendada cuando exista.

PATRONES DE REESCRITURA DESEADOS
Usa transformaciones como estas:

- “guarantees deterministic behavior”
  -> “is designed to support deterministic behavior under controlled conditions”

- “always receives fixed 16.67ms updates”
  -> “uses a fixed 16.67ms simulation step target; under load, updates may be clamped or limited”

- “zero-allocation renderer”
  -> “renderer designed to minimize per-frame allocations in core hot paths”

- “exactly restores the world state”
  -> “restores the serializable state captured by the snapshot”

- “prohibits async functions”
  -> “intended for synchronous hooks; asynchronous side effects should be avoided”

- “identical behavior across 30/60/120 FPS”
  -> “frame-rate independent in practice across common refresh rates”

- “systems are stateless”
  -> “systems generally operate over world state and may keep limited auxiliary caches or coordination state”

FORMATO DE ENTREGA
Al terminar:
1. Aplica los cambios en el código.
2. Entrega un resumen estructurado con:
   - archivos modificados,
   - tipos de problemas corregidos,
   - ejemplos de before/after representativos,
   - decisiones de criterio tomadas.
3. Señala explícitamente cualquier caso donde la doc parecía incorrecta pero la implementación también te pareció problemática.
4. Señala cualquier caso donde la corrección ideal requeriría cambio de código, no solo de documentación.

RESTRICCIONES IMPORTANTES
- No inventes comportamiento.
- No asumas garantías por el nombre de una clase o patrón arquitectónico.
- No dejes intacta una frase solo porque “suena bien”.
- No mantengas claims absolutos si hay caveats visibles en el mismo módulo.
- No ocultes limitaciones reales del sistema.
- No rompas el build por tocar comentarios, exports o tags salvo que el cambio sea claramente seguro.
- Si dudas entre una afirmación fuerte y una moderada, elige la moderada.

PRIORIDAD MÁXIMA
Precisión > estilo.
Honestidad técnica > marketing.
Contrato real > intención aspiracional.

Empieza ya por inspeccionar todo el repositorio y aplicar las correcciones necesarias.