import { Component } from "../../../engine/types/EngineTypes";

export type WeaponType = "triple_shot" | "plasma_rail" | "seeker_missile";

export interface WeaponPickupComponent extends Component {
  type: "WeaponPickup";
  weaponType: WeaponType;
}

export interface ActiveWeaponComponent extends Component {
  type: "ActiveWeapon";
  weaponType: WeaponType;
  remainingTime: number; // ms
}
