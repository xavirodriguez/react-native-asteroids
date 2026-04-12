import { AssetDescriptor, AssetHandle } from "./AssetTypes";

/**
 * AssetLoader for managing game assets with caching and reference counting.
 *
 * @responsibility Cargar y cachear recursos externos (imágenes, sonidos, JSON).
 * @responsibility Gestionar el ciclo de vida de los recursos mediante conteo de referencias.
 * @responsibility Garantizar la simetría en la carga/descarga de recursos.
 */
export class AssetLoader {
  private cache = new Map<string, AssetHandle>();
  private queue: AssetDescriptor[] = [];
  private refCounts = new Map<string, number>();

  /**
   * Encola recursos para ser cargados.
   */
  public queueAssets(assets: AssetDescriptor[]): void {
    this.queue.push(...assets);
  }

  /**
   * Carga todos los recursos encolados de forma asíncrona.
   * Incrementa el conteo de referencias para recursos ya cargados.
   */
  public async loadAll(): Promise<void> {
    const assetsToLoad = [...this.queue];
    this.queue = [];

    const promises = assetsToLoad.map(async (desc) => {
      // Si ya está en caché, solo incrementamos referencia
      if (this.cache.has(desc.id)) {
        this.incrementRef(desc.id);
        return;
      }

      const handle: AssetHandle = {
        id: desc.id,
        status: 'loading',
        data: null
      };
      this.cache.set(desc.id, handle);
      this.refCounts.set(desc.id, 1);

      try {
        const data = await this.performLoad(desc);
        handle.data = data;
        handle.status = 'ready';
      } catch (error) {
        handle.status = 'error';
        handle.error = error as Error;
        console.error(`Error loading asset ${desc.id}:`, error);
      }
    });

    await Promise.all(promises);
  }

  /**
   * Obtiene un handle de recurso del caché.
   */
  public get<T>(id: string): AssetHandle<T> {
    const handle = this.cache.get(id);
    if (!handle) {
      return { id, status: 'error', data: null, error: new Error(`Asset not found: ${id}`) };
    }
    return handle as AssetHandle<T>;
  }

  /**
   * Incrementa manualmente el conteo de referencias.
   */
  public incrementRef(id: string): void {
    const count = this.refCounts.get(id) || 0;
    this.refCounts.set(id, count + 1);
  }

  /**
   * Descarga un grupo de recursos, decrementando su conteo de referencias.
   * Libera la memoria si el conteo llega a cero.
   */
  public unloadGroup(ids: string[]): void {
    for (const id of ids) {
      const currentCount = this.refCounts.get(id);

      if (currentCount === undefined) {
          console.warn(`AssetLoader: Attempted to unload asset ${id} which is not tracked.`);
          continue;
      }

      const newCount = currentCount - 1;

      if (newCount <= 0) {
        if (newCount < 0) {
          console.error(`AssetLoader: Asset ${id} reference count underflow (${newCount}). Critical leak or double unload.`);
        }
        this.cache.delete(id);
        this.refCounts.delete(id);
        // En un entorno real, aquí llamaríamos a la liberación de recursos (ej: GL.deleteTexture)
      } else {
        this.refCounts.set(id, newCount);
      }
    }
  }

  /**
   * Devuelve el progreso actual de carga.
   */
  public progress(): { loaded: number; total: number; percent: number } {
    let loaded = 0;
    const total = this.cache.size;

    for (const handle of this.cache.values()) {
      if (handle.status === 'ready' || handle.status === 'error') {
        loaded++;
      }
    }

    return {
      loaded,
      total,
      percent: total > 0 ? loaded / total : 1
    };
  }

  private async performLoad(desc: AssetDescriptor): Promise<any> {
    // Simulación de carga para el entorno de engine puro
    if (desc.type === 'json') {
      return Promise.resolve({ success: true });
    }
    return Promise.resolve(desc.uri);
  }

  /**
   * Helper para precarga compatible con sistemas legados.
   */
  public async preload(assets: Record<string, string>): Promise<void> {
    const descriptors: AssetDescriptor[] = Object.entries(assets).map(([id, uri]) => ({
      id,
      uri,
      type: 'texture'
    }));
    this.queueAssets(descriptors);
    await this.loadAll();
  }

  /**
   * Debug helper para detectar fugas de memoria.
   */
  public assertNoLeaks(): void {
    if (this.cache.size > 0) {
      const leaks = Array.from(this.refCounts.entries())
        .map(([id, count]) => `${id} (${count})`)
        .join(", ");
      console.warn(`AssetLoader leak detected: ${this.cache.size} assets still in memory: ${leaks}`);
    }
  }
}
