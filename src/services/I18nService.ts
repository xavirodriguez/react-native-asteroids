import AsyncStorage from "@react-native-async-storage/async-storage";

const LOCALE_KEY = "settings:locale";

export type Locale = "en" | "es";

/**
 * Service to manage application localization.
 */
export class I18nService {
  private static currentLocale: Locale = "en";
  private static listeners: ((locale: Locale) => void)[] = [];

  /**
   * Initializes the service by loading the saved locale.
   */
  public static async init(): Promise<void> {
    const saved = await AsyncStorage.getItem(LOCALE_KEY);
    if (saved === "en" || saved === "es") {
      this.currentLocale = saved as Locale;
    }
  }

  /**
   * Returns the current locale.
   */
  public static getLocale(): Locale {
    return this.currentLocale;
  }

  /**
   * Sets the current locale and persists it.
   */
  public static async setLocale(locale: Locale): Promise<void> {
    this.currentLocale = locale;
    await AsyncStorage.setItem(LOCALE_KEY, locale);
    this.notify();
  }

  /**
   * Toggles between available locales.
   */
  public static async toggleLocale(): Promise<void> {
    const next: Locale = this.currentLocale === "en" ? "es" : "en";
    await this.setLocale(next);
  }

  /**
   * Subscribes to locale changes.
   */
  public static subscribe(callback: (locale: Locale) => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  private static notify(): void {
    this.listeners.forEach(l => l(this.currentLocale));
  }
}
