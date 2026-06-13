export class ComponentCloner {
  public static cloneComponent<T>(component: T): T {
    if (component === null || typeof component !== "object") {
      return component;
    }

    if (Array.isArray(component)) {
      return component.map(v => this.cloneComponent(v)) as unknown as T;
    }

    const clone = {} as any;
    for (const key in component) {
      if (Object.prototype.hasOwnProperty.call(component, key)) {
        clone[key] = this.cloneComponent((component as any)[key]);
      }
    }
    return clone;
  }
}
