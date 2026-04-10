import { System } from "../../../engine/core/System";
import { World } from "../../../engine/core/World";
import { TransformComponent } from "../../../engine/types/EngineTypes";
import { ActiveWeaponComponent, WeaponPickupComponent } from "../types/WeaponTypes";

export class WeaponSystem extends System {
  public update(world: World, deltaTime: number): void {
    const ships = world.query("Ship", "Transform");
    const pickups = world.query("WeaponPickup", "Transform");

    ships.forEach((shipEntity) => {
      const shipPos = world.getComponent<TransformComponent>(shipEntity, "Transform")!;

      // Update active weapon timer
      const activeWeapon = world.getComponent<ActiveWeaponComponent>(shipEntity, "ActiveWeapon");
      if (activeWeapon) {
        activeWeapon.remainingTime -= deltaTime;
        if (activeWeapon.remainingTime <= 0) {
          world.removeComponent(shipEntity, "ActiveWeapon");
        }
      }

      pickups.forEach((pickupEntity) => {
        const pickupPos = world.getComponent<TransformComponent>(pickupEntity, "Transform")!;
        const pickup = world.getComponent<WeaponPickupComponent>(pickupEntity, "WeaponPickup")!;

        const dx = shipPos.x - pickupPos.x;
        const dy = shipPos.y - pickupPos.y;
        const distSq = dx * dx + dy * dy;

        if (distSq < 20 * 20) {
          world.addComponent(shipEntity, {
            type: "ActiveWeapon",
            weaponType: pickup.weaponType,
            remainingTime: 10000 // 10 seconds
          } as ActiveWeaponComponent);
          world.removeEntity(pickupEntity);
        }
      });
    });
  }
}
