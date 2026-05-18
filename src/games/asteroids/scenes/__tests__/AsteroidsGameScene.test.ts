import { World } from "../../../../engine/core/World";
import { AsteroidsGameScene } from "../AsteroidsGameScene";
import { BulletPool, ParticlePool } from "../../EntityPool";
import { GAME_CONFIG } from "../../types/AsteroidTypes";
import { IAsteroidsGame } from "../../types/GameInterfaces";
import { AsteroidInputSystem } from "../../systems/AsteroidInputSystem";
import { System } from "../../../../engine/core/System";

class MockGameStateSystem extends System {
    update() {}
}

describe("AsteroidsGameScene", () => {
    let world: World;
    let bulletPool: BulletPool;
    let particlePool: ParticlePool;
    let game: IAsteroidsGame;
    let gameStateSystem: any;

    beforeEach(() => {
        world = new World();
        bulletPool = new BulletPool();
        particlePool = new ParticlePool();
        game = { getSeed: () => 12345 } as any;
        gameStateSystem = new MockGameStateSystem();
    });

    test("onEnter should pass config to AsteroidInputSystem", () => {
        const customConfig = { ...GAME_CONFIG, SCREEN_CENTER_X: 999 };
        const scene = new AsteroidsGameScene(world, game, bulletPool, particlePool, gameStateSystem, customConfig);

        scene.onEnter();

        const systems = world.systemsList;
        const inputSystem = systems.find(s => s instanceof AsteroidInputSystem) as any;

        expect(inputSystem).toBeDefined();
        expect(inputSystem.config.SCREEN_CENTER_X).toBe(999);
    });

    test("onEnter should use default config if not provided", () => {
        const scene = new AsteroidsGameScene(world, game, bulletPool, particlePool, gameStateSystem);

        scene.onEnter();

        const systems = world.systemsList;
        const inputSystem = systems.find(s => s instanceof AsteroidInputSystem) as any;

        expect(inputSystem).toBeDefined();
        expect(inputSystem.config).toBe(GAME_CONFIG);
    });
});
