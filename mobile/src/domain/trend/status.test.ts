import { computeStatus, computeTrend } from "./status";

describe("status.ts", () => {
  describe("GIVEN a 14-day rate and a 0.1 tolerance", () => {
    it.each([
      [0.25, "gaining"],
      [-0.25, "losing"],
      [0.05, "stable"],
      [0.1, "stable"],
      [-0.1, "stable"],
      [0.35 - 0.25, "stable"],
      [0.11, "gaining"],
    ])("SHOULD call a rate of %p %s", (rate, expected) => {
      const result = computeTrend(rate, 0.1);

      expect(result).toBe(expected);
    });

    it("SHOULD have no trend without a rate", () => {
      const result = computeTrend(null, 0.1);

      expect(result).toBeNull();
    });
  });

  describe("GIVEN missing data", () => {
    it.each([
      [null, 0.25],
      [0.25, null],
    ])(
      "SHOULD be not_enough_data for rate %p and target %p",
      (rate, target) => {
        const result = computeStatus(rate, target, 0.1);

        expect(result).toBe("not_enough_data");
      },
    );
  });

  describe("GIVEN a gaining target of +0.25", () => {
    it.each([
      [0.3, "on_track"],
      [0.35, "on_track"],
      [0.15, "on_track"],
      [0.5, "too_fast"],
      [0.1, "too_slow"],
      [0, "too_slow"],
      [-0.2, "wrong_direction"],
    ])("SHOULD rate %p as %s", (rate, expected) => {
      const result = computeStatus(rate, 0.25, 0.1);

      expect(result).toBe(expected);
    });
  });

  describe("GIVEN a losing target of -0.5", () => {
    it.each([
      [-0.45, "on_track"],
      [-0.8, "too_fast"],
      [-0.2, "too_slow"],
      [0.3, "wrong_direction"],
    ])("SHOULD rate %p as %s", (rate, expected) => {
      const result = computeStatus(rate, -0.5, 0.1);

      expect(result).toBe(expected);
    });
  });

  describe("GIVEN a small target and an opposite rate inside the tolerance", () => {
    it("SHOULD be on_track", () => {
      const result = computeStatus(-0.04, 0.05, 0.1);

      expect(result).toBe("on_track");
    });
  });

  describe("GIVEN a maintenance target of 0", () => {
    it.each([
      [0.05, "on_track"],
      [-0.1, "on_track"],
      [0.3, "too_fast"],
      [-0.3, "too_fast"],
    ])("SHOULD rate %p as %s", (rate, expected) => {
      const result = computeStatus(rate, 0, 0.1);

      expect(result).toBe(expected);
    });
  });

  describe("GIVEN a wider tolerance", () => {
    it("SHOULD widen on_track", () => {
      const result = computeStatus(0.5, 0.25, 0.3);

      expect(result).toBe("on_track");
    });
  });
});
