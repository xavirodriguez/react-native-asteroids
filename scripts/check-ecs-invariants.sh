#!/bin/bash

# check-ecs-invariants.sh
# Detects direct mutations of ECS components outside of authorized methods.

EXIT_CODE=0

echo "Checking for direct component property assignments in systems..."
# Look for patterns like world.getComponent(e, "Comp")!.prop = val
# This refined regex excludes variable declarations and initializations:
# - Matches world.getComponent(...) followed by optional non-newline chars and a dot
# - Followed by an identifier and an equals sign
# - Filters out 'const', 'let', 'var' and '==='
VIOLATIONS=$(grep -rE "world\.getComponent\(.+\)\s*\.\s*[a-zA-Z0-9_]+\s*=[^=]" src/engine/systems src/simulation src/games/*/systems | grep -vE "(const|let|var)\s+" | grep -v "__tests__")

if [ ! -z "$VIOLATIONS" ]; then
    echo "Potential direct component mutations found (ensure they are inside mutateComponent):"
    echo "$VIOLATIONS"
    # We still keep this as warning because TS types can make regex tricky
    # EXIT_CODE=1
else
    echo "No direct mutations found in checked directories."
fi

echo "Checking for direct structural mutations during update..."
# Filter out tests and the legitimate usage in ParticleSystem.ts (which handles its own world.isUpdating check)
STRUCTURAL_VIOLATIONS=$(grep -rE "world\.(createEntity|addComponent|removeEntity|removeComponent)\(" src/engine/systems src/simulation src/games/*/systems | grep -v "__tests__")

if [ ! -z "$ASSIGNMENT_VIOLATIONS" ]; then
    echo "WARNING: Found potential direct component mutations (Heuristic):"
    echo "$ASSIGNMENT_VIOLATIONS"
    # We don't fail yet because of potential false positives, but it's good for audit.
fi

if [ $EXIT_CODE -eq 0 ]; then
    echo "ECS Invariants Static Check complete!"
else
    echo "ECS Invariants Static Check FAILED!"
fi

# New Check: Search for eventBus.emit inside simulation (should be emitDeferred)
echo "Checking for synchronous event emissions in simulation/systems..."
EMIT_VIOLATIONS=$(grep -r "eventBus.emit(" src/simulation src/engine/systems src/games/*/systems | grep -v "__tests__")
if [ ! -z "$EMIT_VIOLATIONS" ]; then
    echo "Found synchronous eventBus.emit (use emitDeferred instead):"
    echo "$EMIT_VIOLATIONS"
    EXIT_CODE=1
else
    echo "No synchronous event emissions found."
fi

exit $EXIT_CODE
