# Build & CI/CD Audit - Tiny Aster Engine

## Missing Bundle Size Optimization
## Severidad
Low
## Categoría
Build
## Ubicación
`eas.json`, `app.json`
## Descripción
No se observan configuraciones específicas para minimizar el tamaño de los assets o del bundle de JS en producción.
## Evidencia
Configuraciones por defecto.
## Consecuencias
Descargas lentas para el usuario final.
## Solución propuesta
Implementar compresión de imágenes y treeshaking agresivo.
## Dificultad
Baja
## Prioridad
P3

---

## Hardcoded Boundary Checks in Shell Scripts
## Severidad
Medium
## Categoría
CI/CD
## Ubicación
`scripts/check-core-boundaries.sh`
## Descripción
El sistema de CI depende de scripts de shell manuales que usan grep para validar las fronteras arquitectónicas. Esto es frágil y difícil de mantener si cambian los aliases o la estructura de carpetas.
## Evidencia
El script `check-core-boundaries.sh` busca strings literales como "react-native" o "expo-".
## Consecuencias
- Falsos negativos si se usan imports dinámicos o variaciones de nombres.
- No valida la dirección de la dependencia a nivel de tipos (solo texto plano).
## Solución propuesta
Migrar a una herramienta de análisis de dependencias más robusta como `dependency-cruiser` o usar las reglas de `no-restricted-imports` de ESLint (que ya existen en parte, pero no están sincronizadas con este script).
## Dificultad
Baja
## Prioridad
P2
