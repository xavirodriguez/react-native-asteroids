import { World } from "./World";
import { Entity } from "./Entity";

/**
 * Interface for state logic handlers.
 */
export interface IStateLogic<TContext> {
    onEnter?: (world: World, entity: Entity, ctx: TContext) => void;
    onUpdate?: (world: World, entity: Entity, ctx: TContext, dt: number) => void;
    onExit?: (world: World, entity: Entity, ctx: TContext) => void;
}

/**
 * Definition of a State Machine's behavior.
 */
export interface StateMachineDefinition<TState extends string, TContext> {
    id: string;
    initial: TState;
    states: Record<TState, IStateLogic<TContext>>;
}

/**
 * Global Registry for State Machine definitions.
 * Separates behavior (code) from state (data).
 */
export class StateMachineRegistry {
    private static instance: StateMachineRegistry;
    private definitions = new Map<string, StateMachineDefinition<string, any>>();

    public static getInstance(): StateMachineRegistry {
        if (!this.instance) this.instance = new StateMachineRegistry();
        return this.instance;
    }

    public register<TState extends string, TContext>(definition: StateMachineDefinition<TState, TContext>): void {
        this.definitions.set(definition.id, definition as any);
    }

    public getDefinition(id: string): StateMachineDefinition<string, any> | undefined {
        return this.definitions.get(id);
    }
}
