import { formatRate, parseTargets, type TargetsInput } from "./targets";

const input = (overrides: Partial<TargetsInput>): TargetsInput => ({
  targetWeight: "",
  targetRate: "",
  tolerance: "0.1",
  ...overrides,
});

describe("targets.ts", () => {
  describe("GIVEN valid targets", () => {
    it("SHOULD parse weight, a signed rate and the tolerance, accepting a decimal comma", () => {
      const values = input({
        targetWeight: "82,5",
        targetRate: "+0.25",
        tolerance: "0,15",
      });

      const result = parseTargets(values);

      expect(result).toEqual({
        ok: true,
        targetWeightKg: 82.5,
        targetRateKgPerWeek: 0.25,
        rateToleranceKgPerWeek: 0.15,
      });
    });

    it("SHOULD treat blank targets as not set", () => {
      const values = input({ targetWeight: " " });

      const result = parseTargets(values);

      expect(result).toEqual({
        ok: true,
        targetWeightKg: null,
        targetRateKgPerWeek: null,
        rateToleranceKgPerWeek: 0.1,
      });
    });

    it.each(["2", "-2", "0"])("SHOULD accept a rate of %s", (targetRate) => {
      const values = input({ targetRate });

      const result = parseTargets(values);

      expect(result.ok).toBe(true);
    });

    it.each(["0.01", "1"])("SHOULD accept a tolerance of %s", (tolerance) => {
      const values = input({ tolerance });

      const result = parseTargets(values);

      expect(result.ok).toBe(true);
    });
  });

  describe("GIVEN invalid targets", () => {
    it.each(["29", "301", "abc"])(
      "SHOULD reject a target weight of %p",
      (targetWeight) => {
        const values = input({ targetWeight });

        const result = parseTargets(values);

        expect(result).toEqual({
          ok: false,
          errors: { targetWeight: "Number between 30 and 300 kg" },
        });
      },
    );

    it.each(["2.1", "-3", "fast"])(
      "SHOULD reject a rate of %p",
      (targetRate) => {
        const values = input({ targetRate });

        const result = parseTargets(values);

        expect(result).toEqual({
          ok: false,
          errors: { targetRate: "Number between -2 and +2 kg/week" },
        });
      },
    );

    it.each(["", "0", "1.5", "x"])(
      "SHOULD reject a tolerance of %p",
      (tolerance) => {
        const values = input({ tolerance });

        const result = parseTargets(values);

        expect(result).toEqual({
          ok: false,
          errors: { tolerance: "Number between 0.01 and 1 kg/week" },
        });
      },
    );

    it("SHOULD report every field at once", () => {
      const values = { targetWeight: "1000", targetRate: "5", tolerance: "" };

      const result = parseTargets(values);

      expect(result.ok === false && Object.keys(result.errors).sort()).toEqual([
        "targetRate",
        "targetWeight",
        "tolerance",
      ]);
    });
  });

  describe("GIVEN a current weight", () => {
    it("SHOULD reject a rate pointing away from the target", () => {
      const values = input({ targetWeight: "82", targetRate: "-0.25" });

      const result = parseTargets(values, 79.4);

      expect(result).toEqual({
        ok: false,
        errors: {
          targetRate:
            "Target 82 kg is above your current 79.4 kg, so the rate should be positive.",
        },
      });
    });

    it.each([
      ["a matching rate", "0.25", 79.4],
      ["a maintenance rate", "0", 79.4],
      ["no weigh-ins", "-0.25", null],
    ])("SHOULD accept %s", (_case, targetRate, current) => {
      const values = input({ targetWeight: "82", targetRate });

      const result = parseTargets(values, current);

      expect(result.ok).toBe(true);
    });

    it("SHOULD not add a direction error on top of a range error", () => {
      const values = input({ targetWeight: "82", targetRate: "-3" });

      const result = parseTargets(values, 79.4);

      expect(result).toEqual({
        ok: false,
        errors: { targetRate: "Number between -2 and +2 kg/week" },
      });
    });
  });

  describe("GIVEN a stored rate", () => {
    it.each([
      [0.25, "+0.25"],
      [-0.5, "-0.5"],
      [0, "0"],
    ])("SHOULD format %p as %p", (rate, expected) => {
      const result = formatRate(rate);

      expect(result).toBe(expected);
    });
  });
});
