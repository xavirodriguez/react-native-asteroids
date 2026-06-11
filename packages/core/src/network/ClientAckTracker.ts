/**
 * @responsibility Track sequence numbers and last acknowledged versions for each client.
 */
export class ClientAckTracker {
  private lastAckedSequence = new Map<string, number>();
  private lastAckedTick = new Map<string, number>();
  private lastAckedTime = new Map<string, number>();
  private currentSequence = new Map<string, number>();

  /**
   * Generates the next sequence number for a client.
   */
  public nextSequence(clientId: string): number {
    const seq = (this.currentSequence.get(clientId) ?? 0) + 1;
    this.currentSequence.set(clientId, seq);
    return seq;
  }

  /**
   * Records an acknowledgment from a client.
   */
  public recordAck(clientId: string, sequence: number, tick: number): void {
    const lastSeq = this.lastAckedSequence.get(clientId) ?? 0;
    if (sequence > lastSeq) {
      this.lastAckedSequence.set(clientId, sequence);
      this.lastAckedTick.set(clientId, tick);
      this.lastAckedTime.set(clientId, Date.now());
    }
  }

  /**
   * Gets the last acknowledged tick for a client.
   */
  public getLastAckedTick(clientId: string): number {
    return this.lastAckedTick.get(clientId) ?? -1;
  }

  /**
   * Gets the last acknowledged sequence for a client.
   */
  public getLastAckedSequence(clientId: string): number {
    return this.lastAckedSequence.get(clientId) ?? 0;
  }

  /**
   * Checks if the client has timed out based on ACKs.
   */
  public getIdleTime(clientId: string): number {
    const lastTime = this.lastAckedTime.get(clientId);
    if (lastTime === undefined) return 0;
    return Date.now() - lastTime;
  }

  /**
   * Resets tracking for a client.
   */
  public resetClient(clientId: string): void {
    this.lastAckedSequence.delete(clientId);
    this.lastAckedTick.delete(clientId);
    this.lastAckedTime.delete(clientId);
    this.currentSequence.delete(clientId);
  }
}
