/**
 * @packageDocumentation
 * APIs y componentes obsoletos mantenidos por compatibilidad hacia atrás.
 * Estos símbolos serán eliminados en futuras versiones mayores.
 */

export {
  PositionComponent,
  ColliderComponent,
  RenderableComponent,
  Transform,
  ScreenShake,
} from "../core/CoreComponents";

export { SceneGraph, type SceneNode } from "../core/SceneGraph";
export { CollisionSystem } from "../systems/CollisionSystem";
export { InputSystem } from "../input/InputSystem";
