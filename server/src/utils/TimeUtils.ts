/**
 * Utilidades de tiempo autoritativo para el servidor.
 */
export class TimeUtils {
  /**
   * Calcula el número de semana ISO y el año correspondiente.
   */
  public static getISOWeek(serverTime: number = Date.now()): { weekIndex: number; year: number } {
    const date = new Date(serverTime);
    const utcDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));

    const dayNum = utcDate.getUTCDay() || 7;
    utcDate.setUTCDate(utcDate.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1));
    const weekIndex = Math.ceil((((utcDate.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);

    return { weekIndex, year: utcDate.getUTCFullYear() };
  }

  /**
   * Calcula una semilla semanal determinista basada en UTC.
   * Evita dependencias de la zona horaria del servidor.
   *
   * @param serverTime - Tiempo actual del servidor en ms (opcional, usa Date.now() si no se provee).
   * @returns Una semilla estable durante toda la semana ISO.
   */
  public static getCurrentWeekSeed(serverTime: number = Date.now()): string {
    const { weekIndex, year } = this.getISOWeek(serverTime);
    return `${year}-W${weekIndex}`;
  }

  /**
   * Devuelve los metadatos de validez para la semana actual.
   */
  public static getWeekRange(serverTime: number = Date.now()): { validFrom: number; validUntil: number } {
    const date = new Date(serverTime);
    const day = date.getUTCDay() || 7;

    // Inicio de la semana (Lunes 00:00:00 UTC)
    const monday = new Date(serverTime);
    monday.setUTCDate(date.getUTCDate() - (day - 1));
    monday.setUTCHours(0, 0, 0, 0);

    // Fin de la semana (Domingo 23:59:59 UTC)
    const sunday = new Date(monday.getTime());
    sunday.setUTCDate(monday.getUTCDate() + 7);

    return {
      validFrom: monday.getTime(),
      validUntil: sunday.getTime() - 1
    };
  }
}
