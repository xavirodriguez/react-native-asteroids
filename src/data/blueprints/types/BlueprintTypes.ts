export type BlueprintKind = 'asteroid' | 'invader' | 'ufo' | 'projectile';

export type AsteroidSize = 'large' | 'medium' | 'small';

export interface BaseBlueprint {
  readonly id: string;
  readonly kind: BlueprintKind;
  readonly displayName: string;

  render: {
    readonly shape: string;
    readonly size: number;
    readonly color: string;
    readonly zIndex: number;
  };

  physics: {
    readonly maxSpeed: number;
    readonly dx?: number;
    readonly dy?: number;
    readonly vAngle?: number;
    readonly acceleration?: number;
    readonly friction?: number;
    readonly boundaryBehavior?: "wrap" | "bounce" | "destroy";
    readonly ttl?: number;
  };

  collision: {
    readonly radius: number;
    readonly layer: number;
    readonly mask: number;
    readonly isTrigger: boolean;
  };

  stats: {
    readonly health: number;
    readonly points: number;
  };

  tags: readonly string[];
}

export interface AsteroidBlueprint extends BaseBlueprint {
  readonly kind: 'asteroid';
  asteroid: {
    readonly size: AsteroidSize;
    readonly splitsInto: readonly string[]; // IDs de blueprints
    readonly splitCount: number;
  };
}

export interface InvaderBlueprint extends BaseBlueprint {
  readonly kind: 'invader';
  invader: {
    readonly archetype: 'basic' | 'elite' | 'scout';
    readonly fireRate: number;
    readonly formationRank?: number;
  };
}

export interface UFOBlueprint extends BaseBlueprint {
  readonly kind: 'ufo';
  ufo: {
    readonly behavior: 'zigzag' | 'straight' | 'hunter';
    readonly scoreBonus: number;
  };
}

export interface ProjectileBlueprint extends BaseBlueprint {
  readonly kind: 'projectile';
  projectile: {
    readonly ownerType: 'player' | 'enemy';
    readonly damage: number;
  };
}

export type EntityBlueprint = AsteroidBlueprint | InvaderBlueprint | UFOBlueprint | ProjectileBlueprint;

export type BlueprintOverrides = Partial<Omit<EntityBlueprint, 'id' | 'kind' | 'displayName' | 'tags'>>;
