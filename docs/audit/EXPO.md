# Expo Audit - Tiny Aster Engine

## Metro Configuration Issues
## Severidad
Low
## Categoría
Expo
## Ubicación
`metro.config.js`
## Descripción
La configuración de Metro para monorepos suele ser frágil y puede causar problemas al resolver dependencias duplicadas entre el root y los paquetes.
## Evidencia
Configuración estándar de Metro.
## Consecuencias
Errores de "HMR" o "Duplicate module" durante el desarrollo.
## Solución propuesta
Asegurar que `watchFolders` y `nodeModulesPaths` estén configurados correctamente para el monorepo pnpm.
## Dificultad
Baja
## Prioridad
P3
