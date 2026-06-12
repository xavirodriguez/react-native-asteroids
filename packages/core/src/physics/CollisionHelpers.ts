export function layer(bit: number): number {
  return 1 << bit;
}

export function maskOf(...layers: number[]): number {
  return layers.reduce((acc, value) => acc | value, 0);
}
