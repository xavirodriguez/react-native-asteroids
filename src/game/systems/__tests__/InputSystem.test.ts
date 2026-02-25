import { World } from "../../ecs-world"
import { InputSystem } from "../InputSystem"
import {
  type InputComponent,
  type VelocityComponent,
  type RenderComponent,
  type PositionComponent,
} from "../../../types/GameTypes"

describe("InputSystem", () => {
  let world: World
  let inputSystem: InputSystem
  let ship: number

  beforeEach(() => {
    world = new World()
    inputSystem = new InputSystem()
    world.addSystem(inputSystem)

    ship = world.createEntity()
    world.addComponent(ship, {
      type: "Input",
      thrust: false,
      rotateLeft: false,
      rotateRight: false,
      shoot: false,
    } as InputComponent)
    world.addComponent(ship, {
      type: "Position",
      x: 100,
      y: 100,
    } as PositionComponent)
    world.addComponent(ship, {
      type: "Velocity",
      dx: 0,
      dy: 0,
    } as VelocityComponent)
    world.addComponent(ship, {
      type: "Render",
      shape: "triangle",
      size: 10,
      color: "white",
      rotation: 0,
    } as RenderComponent)
  })

  test("should update ship rotation when rotating left", () => {
    inputSystem.setInput({ rotateLeft: true })

    // Update system (16ms)
    inputSystem.update(world, 16)

    const render = world.getComponent<RenderComponent>(ship, "Render")!
    expect(render.rotation).toBeLessThan(0)
  })

  test("should update ship rotation when rotating right", () => {
    inputSystem.setInput({ rotateRight: true })

    // Update system (16ms)
    inputSystem.update(world, 16)

    const render = world.getComponent<RenderComponent>(ship, "Render")!
    expect(render.rotation).toBeGreaterThan(0)
  })

  test("should apply thrust when thrusting", () => {
    inputSystem.setInput({ thrust: true })

    // Set rotation to 0 (facing right)
    const render = world.getComponent<RenderComponent>(ship, "Render")!
    render.rotation = 0

    inputSystem.update(world, 16)

    const vel = world.getComponent<VelocityComponent>(ship, "Velocity")!
    expect(vel.dx).toBeGreaterThan(0)
    expect(vel.dy).toBe(0)
  })

  test("should handle shooting cooldown", () => {
    inputSystem.setInput({ shoot: true })

    // Initial shoot
    inputSystem.update(world, 16)

    // Check if bullet was created (ship + 1 bullet + 1 initial entity from somewhere? Wait, world starts empty)
    // Actually AsteroidsGame creates things but here I use a fresh world.
    // Let's count entities.
    expect(world.getAllEntities().length).toBe(2) // Ship + Bullet

    // Try to shoot again immediately
    inputSystem.update(world, 16)
    expect(world.getAllEntities().length).toBe(2) // Still 2

    // Wait for cooldown (200ms)
    inputSystem.update(world, 200)
    expect(world.getAllEntities().length).toBe(3) // Ship + Bullet 1 + Bullet 2
  })
})
