export type RenderCommand = {
  type: string;
  data: any;
};

export interface RenderCommandBuffer {
  push(command: RenderCommand): void;
  clear(): void;
  getCommands(): ReadonlyArray<RenderCommand>;
}
