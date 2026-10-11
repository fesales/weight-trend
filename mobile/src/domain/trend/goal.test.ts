import { checkRateDirection, distanceToTarget, weeksToTarget } from "./goal";

describe("goal.ts", () => {
  describe("GIVEN a current and target weight", () => {
    it.each([
      [79.4, 82, 2.6],
      [85, 80, -5],
      [null, 82, null],
      [79.4, null, null],
    ])("SHOULD measure from %p to %p as %p kg", (current, target, expected) => {
      const result = distanceToTarget(current, target);

      if (expected === null) expect(result).toBeNull();
      else expect(result).toBeCloseTo(expected, 10);
    });
  });

  describe("GIVEN a distance and the 14-day rate", () => {
    it.each([
      [2.6, 0.25, 10.4],
      [-3, -0.5, 6],
      [0, 0.25, 0],
      [0, -0.3, 0],
    ])(
      "SHOULD estimate %p kg at %p kg/week as %p weeks",
      (distance, rate, expected) => {
        const result = weeksToTarget(distance, rate);

        expect(result).toBeCloseTo(expected, 10);
      },
    );

    it.each([
      [2.6, -0.25],
      [-3, 0.5],
      [2.6, 0],
      [null, 0.25],
      [2.6, null],
    ])("SHOULD return null for %p kg at %p kg/week", (distance, rate) => {
      const result = weeksToTarget(distance, rate);

      expect(result).toBeNull();
    });
  });

  describe("GIVEN a target rate to check against the direction", () => {
    it("SHOULD reject a negative rate when the target is above", () => {
      const result = checkRateDirection(79.43, 82, -0.25);

      expect(result).toBe(
        "Target 82 kg is above your current 79.4 kg, so the rate should be positive.",
      );
    });

    it("SHOULD reject a positive rate when the target is below", () => {
      const result = checkRateDirection(85, 80, 0.5);

      expect(result).toBe(
        "Target 80 kg is below your current 85.0 kg, so the rate should be negative.",
      );
    });

    it.each([
      ["matching sign up", 79.4, 82, 0.25],
      ["matching sign down", 85, 80, -0.5],
      ["maintenance rate", 79.4, 82, 0],
      ["no weigh-ins", null, 82, -0.25],
      ["no target weight", 79.4, null, -0.25],
      ["no target rate", 79.4, 82, null],
      ["already at the target", 82, 82, -0.25],
    ])("SHOULD accept it with %s", (_case, current, target, rate) => {
      const result = checkRateDirection(current, target, rate);

      expect(result).toBeNull();
    });
  });
});
