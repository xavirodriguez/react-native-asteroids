import { Component } from "../../../index";

/**
 * Component that marks an entity as an enemy and stores metadata about its origin.
 * Following Data-Driven Design, this helps identify which blueprint was used.
 */
export interface EnemyTagComponent extends Component {
  type: "EnemyTag";
  /** The unique identifier of the blueprint used to create this enemy. */
  blueprintId: string;
  /** Optional variant name for specialized behavior or visuals. */
  variant?: string;
  /** Difficulty level or rank of the enemy. */
  level: number;
  /** Identifier for AI behavior logic. */
  behavior?: string;
}
