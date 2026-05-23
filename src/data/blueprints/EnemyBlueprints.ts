import { CollisionLayers } from "../../engine/physics/collision/CollisionLayers";

/**
 * Interface representing a serializable enemy blueprint.
 * No functions allowed to maintain compatibility with structuredClone and multiplayer snapshots.
 */
export interface EnemyBlueprint {
  id: string;
  type: string;

  // Render properties
  render: {
    shape: string;
    size: number;
    color: string;
    zIndex?: number;
  };

  // Physics & Collision
  physics?: {
    baseSpeed: number;
    friction?: number;
    boundaryBehavior?: "wrap" | "bounce" | "destroy";
  };

  collision: {
    radius?: number;
    halfWidth?: number;
    halfHeight?: number;
    layer: number;
    mask: number;
    isTrigger: boolean;
  };

  // Gameplay stats
  health: {
    max: number;
  };

  points: number;

  // Additional components to add (marker components as keys)
  tags: string[];

  // Arbitrary data for specialized systems
  data?: Record<string, unknown>;
}

/**
 * Collection of all available enemy blueprints.
 */
export const EnemyBlueprints: Record<string, EnemyBlueprint> = {
  basic_asteroid: {
    id: "basic_asteroid",
    type: "asteroid",
    render: {
      shape: "polygon", // Actual vertices will be generated/overridden
      size: 20,
      color: "#8B4513",
    },
    physics: {
      baseSpeed: 100,
      boundaryBehavior: "wrap",
    },
    collision: {
      radius: 20,
      layer: CollisionLayers.ENEMY,
      mask: CollisionLayers.PLAYER | CollisionLayers.PROJECTILE,
      isTrigger: false,
    },
    health: {
      max: 1,
    },
    points: 20,
    tags: ["Asteroid"],
    data: {
      sizeType: "medium"
    }
  },

  ufo_scout: {
    id: "ufo_scout",
    type: "ufo",
    render: {
      shape: "ufo",
      size: 15,
      color: "#00FF00",
    },
    physics: {
      baseSpeed: 120,
      boundaryBehavior: "wrap",
    },
    collision: {
      radius: 15,
      layer: CollisionLayers.ENEMY,
      mask: CollisionLayers.PLAYER | CollisionLayers.PROJECTILE,
      isTrigger: false,
    },
    health: {
      max: 1,
    },
    points: 200,
    tags: ["Ufo"],
  },

  invader_scout: {
    id: "invader_scout",
    type: "invader",
    render: {
      shape: "invader",
      size: 24,
      color: "#FFFFFF",
    },
    physics: {
      baseSpeed: 0, // Controlled by FormationSystem
    },
    collision: {
      radius: 12,
      layer: CollisionLayers.ENEMY,
      mask: CollisionLayers.PLAYER | CollisionLayers.PROJECTILE | CollisionLayers.DEBRIS,
      isTrigger: false,
    },
    health: {
      max: 1,
    },
    points: 10,
    tags: ["Invader"],
  },

  invader_commander: {
    id: "invader_commander",
    type: "invader",
    render: {
      shape: "invader",
      size: 30,
      color: "#FF00FF",
    },
    physics: {
      baseSpeed: 0,
    },
    collision: {
      radius: 15,
      layer: CollisionLayers.ENEMY,
      mask: CollisionLayers.PLAYER | CollisionLayers.PROJECTILE | CollisionLayers.DEBRIS,
      isTrigger: false,
    },
    health: {
      max: 1,
    },
    points: 30,
    tags: ["Invader"],
    data: {
      variant: "commander"
    }
  }
};
