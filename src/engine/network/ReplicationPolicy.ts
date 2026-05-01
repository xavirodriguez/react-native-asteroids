import { ReplicationSchema } from "./types/ReplicationTypes";

/**
 * @responsibility Define and manage component replication policies.
 */
export class ReplicationPolicy {
  private static policies = new Map<string, ReplicationSchema>();

  static {
    // Default policies
    this.register({ componentType: 'Transform', reliable: false, sendRate: 1, importance: 'high' });
    this.register({ componentType: 'Velocity', reliable: false, sendRate: 2, importance: 'high' });
    this.register({ componentType: 'Health', reliable: true, sendRate: 1, importance: 'critical' });
    this.register({ componentType: 'GameState', reliable: true, sendRate: 5, importance: 'medium' });
    this.register({ componentType: 'Ship', reliable: true, sendRate: 1, importance: 'critical' });
    this.register({ componentType: 'Bullet', reliable: true, sendRate: 1, importance: 'high' });
    this.register({ componentType: 'Asteroid', reliable: false, sendRate: 3, importance: 'medium' });
    this.register({ componentType: 'Render', reliable: false, sendRate: 10, importance: 'low' });
  }

  public static register(schema: ReplicationSchema): void {
    this.policies.set(schema.componentType, schema);
  }

  public static getPolicy(componentType: string): ReplicationSchema {
    return this.policies.get(componentType) ?? {
      componentType,
      reliable: false,
      sendRate: 1,
      importance: 'medium'
    };
  }

  public static shouldReplicate(componentType: string, tick: number): boolean {
    const policy = this.getPolicy(componentType);
    return tick % policy.sendRate === 0;
  }
}
