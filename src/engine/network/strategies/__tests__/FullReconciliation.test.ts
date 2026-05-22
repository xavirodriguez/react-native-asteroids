import { FullReconciliationStrategy } from '../FullReconciliation';
import { World } from '../../../core/World';
import { WorldSnapshot } from '../../../types/EngineTypes';
import { INetworkGame } from '../../types/NetworkTypes';

describe('FullReconciliationStrategy', () => {
    let strategy: FullReconciliationStrategy;
    let world: World;
    let mockGame: INetworkGame;

    beforeEach(() => {
        world = new World();
        mockGame = {
            runSimulationStep: jest.fn(),
            getWorld: () => world,
            applyInputToEntity: jest.fn()
        };
        strategy = new FullReconciliationStrategy(mockGame, { interpolationDelay: 100 });
    });

    test('should record prediction and history', () => {
        const entityId = world.createEntity();
        world.addComponent(entityId, { type: 'Transform', x: 10, y: 10, rotation: 0, scaleX: 1, scaleY: 1 });
        world.addComponent(entityId, { type: 'Velocity', dx: 0, dy: 0 });
        world.addComponent(entityId, { type: 'Tag', tags: ['LocalPlayer'] });

        const input = { tick: 100, actions: [], timestamp: Date.now() };
        strategy.recordPrediction(input, world);

        const history = strategy.getStateHistory(100);
        expect(history).toBeDefined();
        expect(history?.entities).toContain(entityId);
    });

    test('should perform reconciliation on mismatch', () => {
        const entityId = world.createEntity();
        world.addComponent(entityId, { type: 'Transform', x: 10, y: 10, rotation: 0, scaleX: 1, scaleY: 1 });
        world.addComponent(entityId, { type: 'Velocity', dx: 0, dy: 0 });
        world.addComponent(entityId, { type: 'Tag', tags: ['LocalPlayer'] });
        world.addComponent(entityId, { type: 'Ship', sessionId: 'local', score: 0 });

        // Record prediction at tick 100: position (10, 10)
        strategy.recordPrediction({ tick: 100, actions: [], timestamp: Date.now() }, world);

        // Server update for tick 100: position (20, 20) -> Mismatch!
        const serverSnapshot: WorldSnapshot = {
            tick: 100,
            entities: [entityId],
            componentData: {
                Transform: { [entityId]: { type: 'Transform', x: 20, y: 20, rotation: 0, scaleX: 1, scaleY: 1 } },
                Velocity: { [entityId]: { type: 'Velocity', dx: 0, dy: 0 } },
                Ship: { [entityId]: { type: 'Ship', sessionId: 'local', score: 0 } }
            },
            stateVersion: 100,
            nextEntityId: 1000,
            freeEntities: []
        };

        strategy.processServerUpdate(100, serverSnapshot, 'local');

        // Should have restored server state
        const transform = world.getComponent(entityId, 'Transform') as any;
        expect(transform.x).toBe(20);
        expect(transform.y).toBe(20);
    });
});
