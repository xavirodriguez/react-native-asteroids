#!/usr/bin/env bash
set -euo pipefail

forbidden_core_patterns=(
  "Asteroid"
  "Ship"
  "Invader"
  "Ball"
  "EnemyTag"
  "BlueprintKind"
  "ship:"
  "asteroid:"
  "si:"
  "@colyseus"
  "colyseus"
  "react-native"
  "@shopify/react-native-skia"
  "expo-"
)

echo "Checking for architectural boundary violations in packages/core/src..."

errors=0
for pattern in "${forbidden_core_patterns[@]}"; do
  if grep -Ri "$pattern" packages/core/src --include="*.ts" --include="*.tsx" --exclude="*.test.ts"; then
    echo "Forbidden pattern found in packages/core/src: $pattern"
    errors=$((errors + 1))
  fi
done

if [ $errors -gt 0 ]; then
  echo "Found $errors boundary violations."
  exit 1
else
  echo "No boundary violations detected."
  exit 0
fi
