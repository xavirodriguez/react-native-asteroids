export class ConfigService {
  public static load<T>(gameId: string, schema: any, rawConfig: any): T {
    return rawConfig as T;
  }
}
