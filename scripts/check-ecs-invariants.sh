#!/bin/bash

# check-ecs-invariants.sh
# Detects direct mutations of ECS components outside of authorized methods.

EXIT_CODE=0

echo "Checking for direct component property assignments in systems..."

# Pattern 1: world.getComponent(...).prop = val
# Pattern 2: comp.prop = val (where comp was likely retrieved via getComponent)
# This is tricky, but we can look for assignments that don't have const/let/var and are not 'this.' or 'p.' (common in mutateComponent callbacks)

# We search in src/engine/systems, src/simulation, src/games
SEARCH_DIRS="src/engine/systems src/simulation src/games"

echo "--- Potential Direct Mutations ---"
# Look for assignments like identifier.property = value
# Filter out:
# - Variable declarations (const, let, var)
# - Standard JS/TS keywords (this, return)
# - common callback parameters (p, c, jComp, stack, etc.)
# - Comparisons (==, ===)
# - Increment/decrement (++, --)
# - Methods (identifier.method())

VIOLATIONS=$(grep -rE "[a-zA-Z0-9_]+\.[a-zA-Z0-9_]+\s*=[^=]" $SEARCH_DIRS | \
    grep -vE "(const|let|var|this|return|case|if|while|for)\s+" | \
    grep -vE "\.(forEach|map|filter|push|pop|shift|unshift|splice)\(" | \
    grep -vE "(\+\+|--)" | \
    grep -v "__tests__" | \
    grep -vE "\<(p|c|comp|jComp|stack|render|pos|vel|trans|node|u|h|gs|r|off|offComp|t|ttl|e|n|anim|grid|transform|collider|emitter|gameState|shake|v|trail|point|buffer|input|inputComp|s|target|data)\.")

if [ ! -z "$VIOLATIONS" ]; then
    echo "$VIOLATIONS"
    EXIT_CODE=1
fi

echo "--- Structural Mutations during Update ---"
# Check for world.createEntity, addComponent, removeEntity, removeComponent in Systems
STRUCTURAL_VIOLATIONS=$(grep -rE "world\.(createEntity|addComponent|removeEntity|removeComponent)\(" $SEARCH_DIRS | grep -v "__tests__")

if [ ! -z "$STRUCTURAL_VIOLATIONS" ]; then
    echo "$STRUCTURAL_VIOLATIONS"
    EXIT_CODE=1
    # Note: Some systems might correctly use WorldCommandBuffer, but they should call it on the command buffer, not world.
    # If they call world.addComponent, it's a violation unless it's in an init/register method.
else
    echo "No direct structural mutations found."
fi

echo "--- Synchronous Event Emissions ---"
EMIT_VIOLATIONS=$(grep -r "eventBus.emit(" $SEARCH_DIRS | grep -v "__tests__")
if [ ! -z "$EMIT_VIOLATIONS" ]; then
    echo "$EMIT_VIOLATIONS"
    EXIT_CODE=1
else
    echo "No synchronous event emissions found."
fi

exit $EXIT_CODE
