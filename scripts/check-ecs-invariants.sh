#!/bin/bash

# check-ecs-invariants.sh
# Detects direct mutations of ECS components outside of authorized methods.

EXIT_CODE=0

echo "Checking for structural mutations during update..."
# Structural mutations in systems should only use world.getCommandBuffer()
VIOLATIONS=$(grep -rE "world\.(createEntity|removeEntity|addComponent|removeComponent)\(" src/engine/systems/ src/simulation/ src/games/asteroids/ | \
    grep -v "test\.ts" | \
    grep -v "EntityFactory" | \
    grep -v "AsteroidsGame.ts" | \
    grep -v "if (!world.isUpdating)" | \
    grep -v "world.isUpdating ?" | \
    grep -v "else {")

if [ ! -z "$VIOLATIONS" ]; then
    echo "ERROR: Found potential direct structural mutations in systems:"
    echo "$VIOLATIONS"
    EXIT_CODE=1
fi

echo "Checking for direct component property assignments..."
# Patterns that indicate direct property assignment to a component reference
# This is heuristic and looks for common component variable names being assigned to.
ASSIGNMENT_VIOLATIONS=$(grep -rE "\.(x|y|rotation|dx|dy|remaining|elapsed|frame|current|score|intensity) =" src/engine/systems/ src/simulation/ src/games/asteroids/ | \
    grep -v "test\.ts" | \
    grep -v "EntityFactory\.ts" | \
    grep -v "mutateComponent" | \
    grep -v "mutateSingleton" | \
    grep -v "mutateResource" | \
    grep -v "mutate" | \
    grep -v "createBaseEntity" | \
    grep -v "const " | \
    grep -v "let ")

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

exit $EXIT_CODE
