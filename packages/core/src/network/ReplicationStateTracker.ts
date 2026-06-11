/**
 * @responsibility Track the last sent state versions per client to support delta compression.
 * @remarks
 * Maintains a mapping of which component versions each client has acknowledged or was last sent.
 */
export class ReplicationStateTracker {
  // ClientID -> EntityID -> ComponentType -> LastSentVersion
  private clientStates = new Map<string, Map<number, Map<string, number>>>();

  /**
   * Records that a specific version of a component was sent to a client.
   */
  public recordSent(clientId: string, entityId: number, componentType: string, version: number): void {
    let clientMap = this.clientStates.get(clientId);
    if (!clientMap) {
      clientMap = new Map();
      this.clientStates.set(clientId, clientMap);
    }

    let entityMap = clientMap.get(entityId);
    if (!entityMap) {
      entityMap = new Map();
      clientMap.set(entityId, entityMap);
    }

    entityMap.set(componentType, version);
  }

  /**
   * Checks if a component has changed since it was last sent to the client.
   */
  public hasChanged(clientId: string, entityId: number, componentType: string, currentVersion: number): boolean {
    const lastVersion = this.clientStates.get(clientId)?.get(entityId)?.get(componentType);
    return lastVersion === undefined || currentVersion > lastVersion;
  }

  /**
   * Resets tracking for a specific client.
   */
  public resetClient(clientId: string): void {
    this.clientStates.delete(clientId);
  }

  /**
   * Removes tracking for an entity across all clients.
   */
  public removeEntity(entityId: number): void {
    this.clientStates.forEach(clientMap => {
      clientMap.delete(entityId);
    });
  }

  /**
   * Removes tracking for an entity for a specific client.
   */
  public removeEntityForClient(clientId: string, entityId: number): void {
    this.clientStates.get(clientId)?.delete(entityId);
  }

  /**
   * Checks if the client already knows about this entity.
   */
  public isKnown(clientId: string, entityId: number): boolean {
    return this.clientStates.get(clientId)?.has(entityId) ?? false;
  }

  /**
   * Returns the set of entity IDs that are currently known by the client.
   */
  public getKnownEntities(clientId: string): Set<number> {
    const clientMap = this.clientStates.get(clientId);
    if (!clientMap) return new Set();
    return new Set(clientMap.keys());
  }
}
