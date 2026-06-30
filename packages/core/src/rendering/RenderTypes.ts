export type RenderCommand = {
  type: string;
  data: unknown;
};

export interface RenderCommandBuffer {
  push(command: RenderCommand): void;
  clear(): void;
  getCommands(): ReadonlyArray<RenderCommand>;
}
