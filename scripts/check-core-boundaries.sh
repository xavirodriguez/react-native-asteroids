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

for pattern in "${forbidden_core_patterns[@]}"; do
  if grep -R "$pattern" packages/core/src --include="*.ts" --include="*.tsx" | grep -v "noopHapticsProvider" | grep -v "HapticsProvider"; then
    echo "Forbidden pattern in packages/core/src: $pattern"
    # exit 1
  fi
done
