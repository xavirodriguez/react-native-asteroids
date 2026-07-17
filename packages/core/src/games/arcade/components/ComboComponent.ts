import { Component } from "../../../ecs/Component";

/** @public */
export interface ComboComponent extends Component {
  type: "Combo";
  /** Current consecutive hit count. Resets to 0 on timer expiry. */
  combo: number;
  /** Damage/score multiplier derived from combo. */
  multiplier: number;
  /** Remaining time in seconds before combo resets. */
  timerRemaining: number;
  /** Total seconds the timer runs after each hit. */
  timerDuration: number;
}
