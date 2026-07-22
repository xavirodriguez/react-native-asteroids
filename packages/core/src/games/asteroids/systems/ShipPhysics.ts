/** @public */
export function getDeltaInSeconds(deltaTime: number): number {
  return deltaTime > 0.5 ? deltaTime / 1000 : deltaTime;
}

/** @public */
export function computeShipPhysics(
  rotation: number,
  input: { rotateLeft: boolean; rotateRight: boolean; thrust: boolean },
  config: { SHIP_THRUST: number; SHIP_ROTATION_SPEED: number },
  dtSeconds: number
): { dvx: number; dvy: number; dRotation: number } {
  let dRotation = 0;
  if (input.rotateLeft) {
    dRotation -= config.SHIP_ROTATION_SPEED * dtSeconds;
  }
  if (input.rotateRight) {
    dRotation += config.SHIP_ROTATION_SPEED * dtSeconds;
  }

  let dvx = 0;
  let dvy = 0;
  if (input.thrust) {
    dvx = Math.cos(rotation) * config.SHIP_THRUST * dtSeconds;
    dvy = Math.sin(rotation) * config.SHIP_THRUST * dtSeconds;
  }

  return { dvx, dvy, dRotation };
}
