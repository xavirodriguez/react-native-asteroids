import { Component } from "../../core/Component";

export interface DebugConfigComponent extends Component {
  type: "DebugConfig";
  showColliders: boolean;
  showVelocities: boolean;
  showEntityIds: boolean;
  showFPS: boolean;
}
