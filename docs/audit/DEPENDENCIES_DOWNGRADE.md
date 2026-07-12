# Guía de Alineación y Downgrade de Dependencias Pares para Expo SDK v55

En esta guía, se describe el proceso exacto y los comandos `pnpm` necesarios para alinear y degradar (o sincronizar) las dependencias del monorepo a las versiones oficiales y recomendadas por **Expo SDK v55**, eliminando el uso de flags de escape legacy como `--legacy-peer-deps`.

---

## 1. Versiones de Referencia para Expo SDK v55

Expo SDK v55 introduce soporte nativo oficial para:
* **React**: `19.2.0` (o `19.2.0` exacto)
* **React Native**: `0.83.6` (o versiones del rango `~0.83.0`)
* **React DOM** (para web): `19.2.0`

En caso de que el proyecto haya sido contaminado con versiones incompatibles (por ejemplo, React 19.3+ o React Native 0.84+), se debe forzar un downgrade ordenado para mantener la estabilidad del motor.

---

## 2. Instrucciones de Downgrade Seguro con pnpm (Sin Flags Legacy)

`pnpm` gestiona de manera muy estricta las dependencias pares (`peerDependencies`). Para realizar un downgrade sin utilizar flags que ignoren la seguridad de tipos o dependencias como `--legacy-peer-deps`, siga estos pasos:

### Paso A: Sincronizar dependencias en el `package.json` raíz

Edite el `package.json` raíz para apuntar a las versiones estables compatibles:

```json
{
  "dependencies": {
    "expo": "~55.0.27",
    "react": "19.2.0",
    "react-dom": "19.2.0",
    "react-native": "0.83.6"
  }
}
```

### Paso B: Limpiar la caché y el árbol de dependencias virtuales

Para evitar referencias cruzadas a versiones corruptas o residuales de instalaciones previas en el almacén virtual de `pnpm`, limpie los directorios `node_modules` y el archivo de bloqueo:

```bash
# Limpiar node_modules recursivamente en el monorepo
find . -name "node_modules" -type d -prune -exec rm -rf '{}' +

# Opcional: Eliminar el lockfile para reconstruir desde cero las dependencias del monorepo
rm -f pnpm-lock.yaml
```

### Paso C: Sincronizar dependencias de desarrollo y dependencias pares en submódulos

Es crítico que los submódulos (como `packages/react-native/package.json`) tengan declaradas las dependencias pares y de desarrollo coherentes para evitar warnings y conflictos de resolución.

Asegúrese de que `packages/react-native/package.json` declare:

```json
{
  "peerDependencies": {
    "react": ">=18",
    "react-native": "*"
  },
  "devDependencies": {
    "react": "^19.2.0",
    "react-native": "^0.83.6"
  }
}
```

### Paso D: Ejecución del instalador limpio de pnpm

Ejecute la instalación pura de `pnpm`. Al no pasar `--legacy-peer-deps`, `pnpm` validará de manera estricta que todas las dependencias del árbol de dependencias resuelvan correctamente.

```bash
pnpm install
```

---

## 3. Resolución de Conflictos mediante Overrides en pnpm

Si alguna librería de terceros (como `@shopify/react-native-skia` u otra) requiere o tiene restricciones de versiones más antiguas de React o React Native, en lugar de recurrir a flags globales como `--legacy-peer-deps` o `--force`, declare un bloque de **`overrides`** (o **`resolutions`**) en el `package.json` raíz. Esto fuerza a todo el grafo de dependencias a resolver la versión correcta compatible con Expo SDK v55:

```json
{
  "pnpm": {
    "overrides": {
      "react": "19.2.0",
      "react-dom": "19.2.0",
      "react-native": "0.83.6"
    }
  }
}
```

Al declarar overrides, le garantizamos a `pnpm` un único árbol de resolución determinista y compatible con Expo, eliminando cualquier flag legacy.

---

## 4. Verificación del Estado del SDK de Expo

Una vez realizada la instalación limpia, verifique la compatibilidad de todo el monorepo ejecutando el doctor nativo de Expo:

```bash
npx expo-doctor
```

Este comando validará las versiones exactas instaladas en el árbol físico contra la matriz de compatibilidad de Expo SDK v55 y garantizará que no existan desalineaciones críticas.
