import { MUTATORS, PhysicsSafetySchema } from "../../../src/config/MutatorConfig";

describe("MUTATORS and PhysicsSafetySchema", () => {
  it("should successfully apply mutators on valid config inputs", () => {
    const hyperDrift = MUTATORS.find((m: { id: string }) => m.id === "hyper_drift");
    expect(hyperDrift).toBeDefined();

    const baseConfig = {
      SHIP_THRUST: 100,
      FRICTION: 0.99
    };

    const mutated = hyperDrift!.apply(baseConfig);
    expect(mutated.SHIP_THRUST).toBe(200);
    expect(mutated.FRICTION).toBe(0.95);
  });

  it("should throw safety error if a mutator sets friction to an invalid value", () => {
    // Create an invalid mutator for testing safety boundary
    const invalidMutator = {
      id: "broken_friction",
      name: "Broken Friction",
      description: "Sets friction above 1.",
      games: ["asteroids" as const],
      apply: (cfg: Record<string, unknown>) => ({ ...cfg, FRICTION: 1.5 })
    };

    const applyWithValidation = (config: Record<string, unknown>) => {
      const mutated = invalidMutator.apply(config);
      const parsed = PhysicsSafetySchema.safeParse(mutated);
      if (!parsed.success) {
        throw new Error(`Physics safety validation failed: ${parsed.error.message}`);
      }
      return parsed.data;
    };

    expect(() => {
      applyWithValidation({});
    }).toThrow(/Physics safety validation failed/);
  });

  it("should throw safety error if size is set to zero or negative", () => {
    const invalidMutator = {
      id: "negative_size",
      name: "Negative Size",
      description: "Sets size to negative.",
      games: ["asteroids" as const],
      apply: (cfg: Record<string, unknown>) => ({ ...cfg, SHIP_SIZE: -10 })
    };

    const applyWithValidation = (config: Record<string, unknown>) => {
      const mutated = invalidMutator.apply(config);
      const parsed = PhysicsSafetySchema.safeParse(mutated);
      if (!parsed.success) {
        throw new Error(`Physics safety validation failed: ${parsed.error.message}`);
      }
      return parsed.data;
    };

    expect(() => {
      applyWithValidation({});
    }).toThrow(/Physics safety validation failed/);
  });
});
