#!/bin/bash

# check-ecs-invariants.sh
# Detects violations of ECS architectural invariants.

EXIT_CODE=0

echo "Checking for direct component property assignments in systems..."
# Look for patterns like world.getComponent(e, "Comp")!.prop = val
# This is a simplified regex, might need refinement.
VIOLATIONS=$(grep -rE "world\.getComponent\(.*?\)(?:\!)?\.[\w\d]+ =" src/engine/systems src/simulation src/games/*/systems | grep -v "mutateComponent")

if [ ! -z "$VIOLATIONS" ]; then
    echo "Found direct component mutations (forbidden):"
    echo "$VIOLATIONS"
    EXIT_CODE=1
else
    echo "No direct mutations found in checked directories."
fi

echo "Checking for direct structural mutations during update..."
# Filter out tests and the legitimate usage in ParticleSystem.ts (which handles its own world.isUpdating check)
STRUCTURAL_VIOLATIONS=$(grep -rE "world\.(createEntity|addComponent|removeEntity|removeComponent)\(" src/engine/systems src/simulation src/games/*/systems | grep -v "__tests__" | grep -v "ParticleSystem.ts")

if [ ! -z "$STRUCTURAL_VIOLATIONS" ]; then
    echo "Found direct structural mutations (forbidden in systems/simulation):"
    echo "$STRUCTURAL_VIOLATIONS"
    EXIT_CODE=1
else
    echo "No direct structural mutations found in checked directories."
fi

exit $EXIT_CODE
