/**
 * Pure function to compute ship physics consistently across client-side prediction,
 * server simulation, and singleplayer/multiplayer gameplay.
 *
 * @public
 */
export function computeShipPhysics(
  transform: { rotation: number },
  velocity: { vx: number; vy: number },
  input: { thrust?: boolean; rotateLeft?: boolean; rotateRight?: boolean; rotationAmount?: number },
  config: { SHIP_THRUST: number; SHIP_ROTATION_SPEED: number; SHIP_FRICTION: number },
  deltaTimeSec: number
): { vx: number; vy: number; rotation: number } {
  let rotation = transform.rotation;
  let vx = velocity.vx;
  let vy = velocity.vy;

  // 1. Rotation handling
  if (input.rotationAmount !== undefined) {
    rotation += input.rotationAmount * config.SHIP_ROTATION_SPEED * deltaTimeSec;
  } else {
    if (input.rotateLeft) {
      rotation -= config.SHIP_ROTATION_SPEED * deltaTimeSec;
    }
    if (input.rotateRight) {
      rotation += config.SHIP_ROTATION_SPEED * deltaTimeSec;
    }
  }

  // Keep rotation within [-PI, PI]
  while (rotation > Math.PI) rotation -= Math.PI * 2;
  while (rotation < -Math.PI) rotation += Math.PI * 2;

  // 2. Thrust handling
  if (input.thrust) {
    const ax = Math.cos(rotation) * config.SHIP_THRUST;
    const ay = Math.sin(rotation) * config.SHIP_THRUST;
    vx += ax * deltaTimeSec;
    vy += ay * deltaTimeSec;
  }

  // 3. Friction handling (exponential decay or linear factor)
  const factor = Math.max(0, 1 - config.SHIP_FRICTION * deltaTimeSec);
  vx *= factor;
  vy *= factor;

  return { vx, vy, rotation };
}
