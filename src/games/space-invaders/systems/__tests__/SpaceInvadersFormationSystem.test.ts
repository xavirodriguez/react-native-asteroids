import { World } from "../../../../engine/core/World";
import { SpaceInvadersFormationSystem } from "../SpaceInvadersFormationSystem";
import { FormationComponent, GAME_CONFIG } from "../../types/SpaceInvadersTypes";
import { TransformComponent } from "../../../../engine/types/EngineTypes";
import { EnemyBulletPool } from "../../EntityPool";
import { createFormationController, createInvader } from "../../EntityFactory";

describe("SpaceInvadersFormationSystem", () => {
  let world: World;
  let system: SpaceInvadersFormationSystem;
  let formationEntity: number;
  const enemyBulletPool = new EnemyBulletPool();

  beforeEach(() => {
    world = new World();
    system = new SpaceInvadersFormationSystem(enemyBulletPool);
    formationEntity = createFormationController(world);
  });

  it("should move invaders to the right", () => {
    const invader = createInvader(world, 100, 100, 0, 0);
    const deltaTime = 1000; // 1 second

    // speed will be recalculated in system.update
    system.update(world, deltaTime);

    const formation = world.getComponent<FormationComponent>(formationEntity, "Formation")!;
    const expectedX = 100 + formation.speed; // direction is 1

    const pos = world.getComponent<TransformComponent>(invader, "Transform");
    expect(pos?.x).toBeCloseTo(expectedX);
  });

  it("should trigger stepDownPending when hitting right edge", () => {
    const margin = 20;
    const rightLimit = GAME_CONFIG.SCREEN_WIDTH - margin;
    const invader = createInvader(world, rightLimit - 10, 100, 0, 0);
    const deltaTime = 1000; // 1 second, move enough to hit edge

    system.update(world, deltaTime);

    const formation = world.getComponent<FormationComponent>(formationEntity, "Formation")!;
    expect(formation.stepDownPending).toBe(true);

    // Should NOT have moved horizontally
    const pos = world.getComponent<TransformComponent>(invader, "Transform");
    expect(pos?.x).toBe(rightLimit - 10);
  });

  it("should perform step down and reverse direction", () => {
    const invader = createInvader(world, 100, 100, 0, 0);

    world.mutateComponent<FormationComponent>(formationEntity, "Formation", f => {
      f.stepDownPending = true;
    });

    system.update(world, 16); // delta time doesn't matter much for step down

    const formation = world.getComponent<FormationComponent>(formationEntity, "Formation")!;
    expect(formation.stepDownPending).toBe(false);
    expect(formation.direction).toBe(-1);

    const pos = world.getComponent<TransformComponent>(invader, "Transform");
    expect(pos?.y).toBe(100 + formation.descentStep);
  });

  it("should avoid infinite descent by using predictive edge checking", () => {
    const margin = 20;
    const rightLimit = GAME_CONFIG.SCREEN_WIDTH - margin;

    // Position invader exactly at the edge or slightly beyond
    const invader = createInvader(world, rightLimit + 5, 100, 0, 0);

    // Step 1: Trigger stepDownPending
    system.update(world, 16);
    let formation = world.getComponent<FormationComponent>(formationEntity, "Formation")!;
    expect(formation.stepDownPending).toBe(true);

    // Step 2: Execute step down and flip direction to -1
    system.update(world, 16);
    formation = world.getComponent<FormationComponent>(formationEntity, "Formation")!;
    expect(formation.stepDownPending).toBe(false);
    expect(formation.direction).toBe(-1);
    const posAtStepDown = world.getComponent<TransformComponent>(invader, "Transform")?.y;

    // Step 3: Next update should move LEFT, NOT trigger another step down
    // Even though it's still > rightLimit, direction is now -1, so willHitRight is false
    system.update(world, 1000); // Move left

    formation = world.getComponent<FormationComponent>(formationEntity, "Formation")!;
    expect(formation.stepDownPending).toBe(false);
    expect(formation.direction).toBe(-1);

    const pos = world.getComponent<TransformComponent>(invader, "Transform");
    expect(pos?.y).toBe(posAtStepDown); // y should not have changed (no extra step down)
    expect(pos?.x).toBeLessThan(rightLimit + 5);
  });
});
