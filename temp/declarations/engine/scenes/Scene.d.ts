import { World } from "../core/World";
/**
 * Abstract base class for all game scenes.
 * A scene represents a specific state of the game (e.g., Menu, Playing, Game Over).
 * It manages its own ECS world and provides lifecycle hooks.
 */
export declare abstract class Scene {
    /** The ECS world associated with this scene. */
    protected world: World;
    constructor(world: World);
    name: string;
    /**
     * Called when the scene becomes the active scene.
     * Useful for initializing entities and systems.
     */
    onEnter(world: World): void | Promise<void>;
    /**
     * Called when the scene is no longer the active scene.
     * Useful for cleanup.
     */
    onExit(world: World): void | Promise<void>;
    /**
     * Called when the game is paused while this scene is active.
     */
    onPause(): void;
    /**
     * Called when the game is resumed while this scene is active.
     */
    onResume(): void;
    /**
     * Called when the game is being updated.
     */
    onUpdate(dt: number, world: World): void;
    /**
     * Called when the game is being rendered.
     */
    onRender(alpha: number): void;
    /**
     * Gets the ECS world for this scene.
     */
    getWorld(): World;
    /**
     * Public forwarding methods for backward compatibility.
     */
    update(dt: number): void;
    render(renderer: any): void;
}
