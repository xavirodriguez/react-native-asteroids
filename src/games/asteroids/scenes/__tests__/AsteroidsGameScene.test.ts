import { World } from "../../../../engine/core/World";
import { AsteroidsGameScene } from "../AsteroidsGameScene";
import { AsteroidInputSystem } from "../../systems/AsteroidInputSystem";
import { BulletPool, ParticlePool } from "../../EntityPool";
import { GAME_CONFIG } from "../../types/AsteroidTypes";

describe("AsteroidsGameScene Config Propagation", () => {
    it("should pass config to AsteroidInputSystem", () => {
        const world = new World();
        world.setResource("GameConfig", GAME_CONFIG);
        const mockGame: any = { getSeed: () => 12345 };
        const bulletPool = new BulletPool();
        const particlePool = new ParticlePool();
        const mockGameStateSystem: any = { update: jest.fn() };

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
        // Since config is private in AsteroidInputSystem, we check it via any
        expect((inputSystem as any).config.BULLET_SPEED).toBe(999);
    });
});
