import AsyncStorage from "@react-native-async-storage/async-storage";

export class PersistenceService {
  static async save(key: string, data: any): Promise<void> {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.error("Failed to save data to storage", e);
    }
  }

  static async load<T>(key: string, defaultValue: T): Promise<T> {
    try {
      const data = await AsyncStorage.getItem(key);
      return data ? JSON.parse(data) : defaultValue;
    } catch (e) {
      console.error("Failed to load data from storage", e);
      return defaultValue;
    }
  }
}
