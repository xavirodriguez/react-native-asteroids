import { ReplicationSchema } from "./types/ReplicationTypes";

/**
 * @responsibility Define and manage component replication policies.
 */
export class ReplicationPolicy {
  private static policies = new Map<string, ReplicationSchema>();

  private static initialized = false;

  public static initialize(): void {
    if (this.initialized) return;
    // Default policies
    this.register({ componentType: 'Transform', reliable: false, sendRate: 1, importance: 'high' });
    this.register({ componentType: 'Velocity', reliable: false, sendRate: 2, importance: 'high' });
    this.register({ componentType: 'Health', reliable: true, sendRate: 1, importance: 'critical' });
    this.register({ componentType: 'GameState', reliable: true, sendRate: 5, importance: 'medium' });
    this.register({ componentType: 'Ship', reliable: true, sendRate: 1, importance: 'critical' });
    this.register({ componentType: 'Bullet', reliable: true, sendRate: 1, importance: 'high' });
    this.register({ componentType: 'Asteroid', reliable: false, sendRate: 3, importance: 'medium' });
    this.register({ componentType: 'Render', reliable: false, sendRate: 10, importance: 'low' });
    this.initialized = true;
  }

  public static register(schema: ReplicationSchema): void {
    this.policies.set(schema.componentType, schema);
  }

  public static getPolicy(componentType: string): ReplicationSchema {
    this.initialize();
    return this.policies.get(componentType) ?? {
      componentType,
      reliable: false,
      sendRate: 1,
      importance: 'medium'
    };
  }

  /**
   * Evalúa si un componente debe ser replicado en el tick actual basándose en su tasa de envío.
   *
   * @remarks
   * Implementa una estrategia de "Rate Limiting" por tipo de componente para ahorrar ancho de banda.
   * Por ejemplo, el `Transform` se envía cada tick (`sendRate: 1`), mientras que el `Render`
   * se envía cada 10 ticks (`sendRate: 10`) dado que su información es principalmente cosmética.
   *
   * @param componentType - El discriminador del tipo de componente.
   * @param tick - El tick actual del mundo.
   * @returns `true` si el componente cumple con el criterio de tasa de envío.
   */
  public static shouldReplicate(componentType: string, tick: number): boolean {
    this.initialize();
    const policy = this.getPolicy(componentType);
    return tick % policy.sendRate === 0;
  }
}
