#!/bin/bash

# check-ecs-invariants.sh
# Detects violations of ECS architectural invariants.

EXIT_CODE=0

echo "Checking for direct component property assignments in systems..."
# Look for patterns like world.getComponent(e, "Comp")!.prop = val
# This is a simplified regex, might need refinement.
# We exclude tests and common false positives.
VIOLATIONS=$(grep -r "world.getComponent(" src/engine/systems src/simulation src/games/*/systems | grep "=" | grep -v "mutateComponent" | grep -v "__tests__")

if [ ! -z "$VIOLATIONS" ]; then
    echo "Potential direct component mutations found (ensure they are inside mutateComponent):"
    echo "$VIOLATIONS"
    # Note: We keep this as a warning for now as regex for assignments is tricky with getComponent
    # EXIT_CODE=1
else
    echo "No direct mutations found in checked directories."
fi

echo "Checking for direct structural mutations during update..."
# Filter out tests and the legitimate usage in ParticleSystem.ts (which handles its own world.isUpdating check)
STRUCTURAL_VIOLATIONS=$(grep -rE "world\.(createEntity|addComponent|removeEntity|removeComponent)\(" src/engine/systems src/simulation src/games/*/systems | grep -v "__tests__")

if [ ! -z "$STRUCTURAL_VIOLATIONS" ]; then
    echo "Found direct structural mutations (forbidden in systems/simulation):"
    echo "$STRUCTURAL_VIOLATIONS"
    EXIT_CODE=1
else
    echo "No direct structural mutations found in checked directories."
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
