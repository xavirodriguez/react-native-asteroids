import { Scene } from "./Scene";
export type TransitionType = 'instant' | 'fade' | 'slide';
export interface SceneTransition {
    type: TransitionType;
    durationMs: number;
}
export declare enum SceneState {
    IDLE = "IDLE",
    LOADING = "LOADING",
    ACTIVE = "ACTIVE",
    UNLOADING = "UNLOADING"
}
/**
 * Manages a stack of game scenes and their lifecycle transitions.
 */
export declare class SceneManager {
    private currentScene;
    private sceneStack;
    private scenes;
    private state;
    private transitionLock;
    register(scene: Scene): void;
    transitionTo(scene: Scene): Promise<void>;
    push(scene: Scene): Promise<void>;
    pop(): Promise<void>;
    restartCurrentScene(): Promise<void>;
    pause(): void;
    resume(): void;
    update(deltaTime: number): void;
    render(renderer: any): void;
    getCurrentScene(): Scene | null;
    getSceneState(): SceneState;
}
