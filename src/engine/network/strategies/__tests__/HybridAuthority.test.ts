import { HybridAuthorityStrategy } from '../HybridAuthority';
import { World } from '../../../core/World';
import { WorldSnapshot } from '../../../types/EngineTypes';

describe('HybridAuthorityStrategy', () => {
    let strategy: HybridAuthorityStrategy;
    let world: World;

    beforeEach(() => {
        strategy = new HybridAuthorityStrategy({ interpolationDelay: 100 });
        world = new World();
    });

    test('should interpolate remote entity but not local player', () => {
        const remoteId = world.createEntity();
        const localId = world.createEntity();
        world.addComponent(remoteId, { type: 'Transform', x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 });
        world.addComponent(localId, { type: 'Transform', x: 50, y: 50, rotation: 0, scaleX: 1, scaleY: 1 });
        world.addComponent(localId, { type: 'Tag', tags: ['LocalPlayer'] });

        const now = Date.now();
        // @ts-expect-error - Mocking Date.now
        const dateSpy = jest.spyOn(Date, 'now').mockReturnValue(now);

        const snapshot1: WorldSnapshot = {
            tick: 1,
            entities: [remoteId, localId],
            componentData: {
                Transform: {
                    [remoteId]: { type: 'Transform', x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1 },
                    [localId]: { type: 'Transform', x: 50, y: 50, rotation: 0, scaleX: 1, scaleY: 1 }
                }
            },
            stateVersion: 1,
            nextEntityId: 100,
            freeEntities: []
        };

        const snapshot2: WorldSnapshot = {
            tick: 2,
            entities: [remoteId, localId],
            componentData: {
                Transform: {
                    [remoteId]: { type: 'Transform', x: 100, y: 0, rotation: 0, scaleX: 1, scaleY: 1 },
                    [localId]: { type: 'Transform', x: 60, y: 60, rotation: 0, scaleX: 1, scaleY: 1 }
                }
            },
            stateVersion: 2,
            nextEntityId: 100,
            freeEntities: []
        };

        dateSpy.mockReturnValue(now - 100);
        strategy.processServerUpdate(1, snapshot1);

        dateSpy.mockReturnValue(now);
        strategy.processServerUpdate(2, snapshot2);

        // Current time T=now + 50. targetTime = now - 50. Alpha = 0.5
        dateSpy.mockReturnValue(now + 50);
        strategy.update(world, 16.66);

        const remoteTrans = world.getComponent(remoteId, 'Transform') as any;
        const localTrans = world.getComponent(localId, 'Transform') as any;

        expect(remoteTrans.x).toBeCloseTo(50);
        expect(localTrans.x).toBe(50); // Local player should NOT be interpolated by this strategy

        dateSpy.mockRestore();
    });
});
