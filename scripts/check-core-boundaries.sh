#!/bin/bash

# check-core-boundaries.sh
# Ensures that @tiny-aster/core does not import forbidden platform-specific or game-specific modules.

CORE_PATH="packages/core/src"
EXIT_CODE=0

echo "🔍 Checking @tiny-aster/core boundaries..."

# 1. Prohibit React Native / Expo imports in core
FORBIDDEN_PLATFORM=("react-native" "expo-" "@shopify/react-native-skia" "@colyseus")

for pkg in "${FORBIDDEN_PLATFORM[@]}"; do
    if grep -r "$pkg" "$CORE_PATH" --exclude-dir=tests --exclude-dir=ui/debug > /dev/null; then
        echo "❌ ERROR: Forbidden platform import found: '$pkg' in $CORE_PATH"
        grep -r "$pkg" "$CORE_PATH" --exclude-dir=tests --exclude-dir=ui/debug
        EXIT_CODE=1
    fi
done

# 2. Prohibit imports from src/games or src/app (game-specific logic)
FORBIDDEN_DOMAIN=("src/games" "src/app")

for domain in "${FORBIDDEN_DOMAIN[@]}"; do
    if grep -r "$domain" "$CORE_PATH" > /dev/null; then
        echo "❌ ERROR: Core should not depend on game-specific logic: '$domain' found in $CORE_PATH"
        grep -r "$domain" "$CORE_PATH"
        EXIT_CODE=1
    fi
done

# 3. Prohibit absolute imports or alias to 'src/' if not relative within core
# This is a bit trickier with grep but we can look for "@/src"
if grep -r "@/src" "$CORE_PATH" > /dev/null; then
    echo "❌ ERROR: Prohibited absolute import '@/' found in $CORE_PATH"
    grep -r "@/src" "$CORE_PATH"
    EXIT_CODE=1
fi

if [ $EXIT_CODE -eq 0 ]; then
    echo "✅ Boundaries check passed! @tiny-aster/core is clean."
else
    echo "❌ Boundaries check failed."
fi

exit $EXIT_CODE
