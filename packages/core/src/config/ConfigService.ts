export class ConfigService {
  public static load<T>(gameId: string, schema: unknown, rawConfig: unknown): T {
    return rawConfig as T;
  }
}
