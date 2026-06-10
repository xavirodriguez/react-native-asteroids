import { Component } from "../../ecs/Component";

export interface DebugConfigComponent extends Component {
  type: "DebugConfig";
  showColliders: boolean;
  showVelocities: boolean;
  showEntityIds: boolean;
  showFPS: boolean;
}
