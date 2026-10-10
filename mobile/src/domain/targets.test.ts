import { formatRate, parseTargets } from "./targets";

describe("targets.ts", () => {
  describe("GIVEN valid targets", () => {
    it("SHOULD parse weight and a signed rate, accepting a decimal comma", () => {
      const input = { targetWeight: "82,5", targetRate: "-0.25" };

      const result = parseTargets(input);

      expect(result).toEqual({
        ok: true,
        targetWeightKg: 82.5,
        targetRateKgPerWeek: -0.25,
      });
    });

    it("SHOULD treat blank fields as not set", () => {
      const input = { targetWeight: " ", targetRate: "" };

      const result = parseTargets(input);

      expect(result).toEqual({
        ok: true,
        targetWeightKg: null,
        targetRateKgPerWeek: null,
      });
    });

    it.each(["2", "-2", "0"])("SHOULD accept a rate of %s", (targetRate) => {
      const input = { targetWeight: "", targetRate };

      const result = parseTargets(input);

      expect(result.ok).toBe(true);
    });
  });

  describe("GIVEN invalid targets", () => {
    it.each(["29", "301", "abc"])(
      "SHOULD reject a target weight of %p",
      (targetWeight) => {
        const input = { targetWeight, targetRate: "" };

        const result = parseTargets(input);

        expect(result).toEqual({
          ok: false,
          errors: { targetWeight: "Number between 30 and 300 kg" },
        });
      },
    );

    it.each(["2.1", "-3", "fast"])(
      "SHOULD reject a rate of %p",
      (targetRate) => {
        const input = { targetWeight: "", targetRate };

        const result = parseTargets(input);

        expect(result).toEqual({
          ok: false,
          errors: { targetRate: "Number between -2 and +2 kg/week" },
        });
      },
    );

    it("SHOULD report both fields at once", () => {
      const input = { targetWeight: "1000", targetRate: "5" };

      const result = parseTargets(input);

      expect(result.ok === false && Object.keys(result.errors).sort()).toEqual([
        "targetRate",
        "targetWeight",
      ]);
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
