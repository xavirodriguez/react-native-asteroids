import { StateMachine } from "../StateMachine";

describe("StateMachine", () => {
  type TestState = "idle" | "run" | "jump";
  interface TestContext {
    score: number;
    log: string[];
  }

  it("should initialize and call onEnter of initial state", () => {
    const context: TestContext = { score: 0, log: [] };
    const onEnter = jest.fn();

    new StateMachine<TestState, TestContext>({
      initial: "idle",
      states: {
        idle: { onEnter },
        run: {},
        jump: {},
      },
    }, context);

    expect(onEnter).toHaveBeenCalledWith(context);
  });

  it("should handle transitions and lifecycle hooks", () => {
    const context: TestContext = { score: 0, log: [] };
    const log = (msg: string) => context.log.push(msg);

    const fsm = new StateMachine<TestState, TestContext>({
      initial: "idle",
      states: {
        idle: {
          onExit: () => log("exit-idle"),
        },
        run: {
          onEnter: () => log("enter-run"),
          onUpdate: (ctx, dt) => log(`update-run-${dt}`),
        },
        jump: {},
      },
    }, context);

    fsm.transition("run");
    fsm.update(16);

    expect(context.log).toEqual(["exit-idle", "enter-run", "update-run-16"]);
    expect(fsm.getCurrentState()).toBe("run");
  });

  it("should not transition to the same state", () => {
    const context: TestContext = { score: 0, log: [] };
    const onEnter = jest.fn();

    const fsm = new StateMachine<TestState, TestContext>({
      initial: "idle",
      states: {
        idle: { onEnter },
        run: {},
        jump: {},
      },
    }, context);

    fsm.transition("idle");
    expect(onEnter).toHaveBeenCalledTimes(1);
  });
});
