import { SnapshotInterpolationStrategy } from '../SnapshotInterpolation';
import { World } from '../../../core/World';
import { WorldSnapshot } from '../../../types/EngineTypes';

describe('SnapshotInterpolationStrategy', () => {
    let strategy: SnapshotInterpolationStrategy;
    let world: World;

    beforeEach(() => {
        strategy = new SnapshotInterpolationStrategy({ interpolationDelay: 100 });
        world = new World();
    });

    test('should interpolate entity position', () => {
        const entityId = world.createEntity();
        world.addComponent(entityId, { type: 'Transform', x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 });

        const now = Date.now();
        // @ts-expect-error - Mocking Date.now
        const dateSpy = jest.spyOn(Date, 'now').mockReturnValue(now);

        const snapshot1: WorldSnapshot = {
            tick: 1,
            entities: [entityId],
            componentData: {
                Transform: {
                    [entityId]: { type: 'Transform', x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 }
                }
            },
            stateVersion: 1,
            nextEntityId: 100,
            freeEntities: []
        };

        const snapshot2: WorldSnapshot = {
            tick: 2,
            entities: [entityId],
            componentData: {
                Transform: {
                    [entityId]: { type: 'Transform', x: 100, y: 100, rotation: 0, scaleX: 1, scaleY: 1 }
                }
            },
            stateVersion: 2,
            nextEntityId: 100,
            freeEntities: []
        };

        // Push snapshots with 100ms difference
        dateSpy.mockReturnValue(now - 100);
        strategy.processServerUpdate(1, snapshot1);

        dateSpy.mockReturnValue(now);
        strategy.processServerUpdate(2, snapshot2);

        // Current time T=now + 50. targetTime = now - 50. Alpha = 0.5
        dateSpy.mockReturnValue(now + 50);
        strategy.update(world, 16.66);

        const transform = world.getComponent(entityId, 'Transform') as any;
        expect(transform.x).toBeCloseTo(50);
        expect(transform.y).toBeCloseTo(50);

        dateSpy.mockRestore();
    });
});
