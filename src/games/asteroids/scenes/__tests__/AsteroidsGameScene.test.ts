import { World } from "../../../../engine/core/World";
import { AsteroidsGameScene } from "../AsteroidsGameScene";
import { AsteroidInputSystem } from "../../systems/AsteroidInputSystem";
import { BulletPool, ParticlePool } from "../../EntityPool";
import { GAME_CONFIG } from "../../types/AsteroidTypes";
import { IAsteroidsGame, IGameStateSystem } from "../../types/GameInterfaces";

describe("AsteroidsGameScene Config Propagation", () => {
    it("should pass config to AsteroidInputSystem", () => {
        const world = new World();
        const mockGame = { getSeed: () => 12345 } as unknown as IAsteroidsGame;
        const bulletPool = new BulletPool();
        const particlePool = new ParticlePool();
        const mockGameStateSystem = { update: jest.fn() } as unknown as IGameStateSystem;

        const customConfig = { ...GAME_CONFIG, BULLET_SPEED: 999 };

        const scene = new AsteroidsGameScene(
            world,
            mockGame,
            bulletPool,
            particlePool,
            mockGameStateSystem,
            customConfig
        );

        scene.onEnter();

        const inputSystem = world.systemsList.find(s => s instanceof AsteroidInputSystem) as AsteroidInputSystem;
        expect(inputSystem).toBeDefined();
        // Since config is private in AsteroidInputSystem, we check it via unknown cast
        expect((inputSystem as unknown as { config: { BULLET_SPEED: number } }).config.BULLET_SPEED).toBe(999);
    });
});
