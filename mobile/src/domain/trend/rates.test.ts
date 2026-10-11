import { dayRows, linearWeights } from "@/test/series";

import { avg7, currentWeight, rate14, rate21, weeklyRate } from "./rates";
import { toSeries } from "./series";

const TODAY = "2026-10-11";

describe("rates.ts", () => {
  describe("GIVEN the 7 days ending today", () => {
    it("SHOULD average them when there are 4 weigh-ins", () => {
      const series = toSeries(
        dayRows("2026-10-05", { weights: [80, null, 81, null, 82, null, 83] }),
      );

      const result = avg7(series, TODAY);

      expect(result).toBe(81.5);
    });

    it("SHOULD return null with only 3 weigh-ins", () => {
      const series = toSeries(
        dayRows("2026-10-05", {
          weights: [80, null, null, 81, null, null, 82],
        }),
      );

      const result = avg7(series, TODAY);

      expect(result).toBeNull();
    });

    it("SHOULD ignore weigh-ins outside the window", () => {
      const series = toSeries(
        dayRows("2026-10-04", {
          weights: [99, 80, 80, 80, 80, null, null, null, 99],
        }),
      );

      const result = avg7(series, TODAY);

      expect(result).toBe(80);
    });
  });

  describe("GIVEN 28 days gaining 0.1 kg a day", () => {
    const series = toSeries(
      dayRows("2026-09-14", { weights: linearWeights(28, 80, 0.1) }),
    );

    it("SHOULD give a weekly rate of +0.7", () => {
      const result = weeklyRate(series, TODAY);

      expect(result).toBeCloseTo(0.7, 10);
    });

    it("SHOULD give a 14-day rate of +0.7 kg/week", () => {
      const result = rate14(series, TODAY);

      expect(result).toBeCloseTo(0.7, 10);
    });

    it("SHOULD give a 21-day rate of +0.7 kg/week", () => {
      const result = rate21(series, TODAY);

      expect(result).toBeCloseTo(0.7, 10);
    });
  });

  describe("GIVEN a two-step history", () => {
    it("SHOULD halve the 14-day difference and divide the 21-day one by 3", () => {
      const series = toSeries(
        dayRows("2026-09-14", {
          weights: [
            ...Array<number>(7).fill(80),
            ...Array<number>(14).fill(81),
            ...Array<number>(7).fill(83),
          ],
        }),
      );

      const result = [rate14(series, TODAY), rate21(series, TODAY)];

      expect(result[0]).toBeCloseTo(1, 10);
      expect(result[1]).toBeCloseTo(1, 10);
    });
  });

  describe("GIVEN only 14 days of history", () => {
    const series = toSeries(
      dayRows("2026-09-28", { weights: linearWeights(14, 80, 0.1) }),
    );

    it("SHOULD still give a weekly rate", () => {
      const result = weeklyRate(series, TODAY);

      expect(result).toBeCloseTo(0.7, 10);
    });

    it("SHOULD return null when the older window is missing", () => {
      const result = [rate14(series, TODAY), rate21(series, TODAY)];

      expect(result).toEqual([null, null]);
    });
  });

  describe("GIVEN a sparse current week", () => {
    it("SHOULD return null rates", () => {
      const series = toSeries(
        dayRows("2026-09-14", {
          weights: [
            ...linearWeights(21, 80, 0.1),
            null,
            null,
            null,
            83,
            83,
            83,
            null,
          ],
        }),
      );

      const result = [weeklyRate(series, TODAY), rate14(series, TODAY)];

      expect(result).toEqual([null, null]);
    });
  });

  describe("GIVEN the current weight", () => {
    it("SHOULD use the 7-day average when available", () => {
      const series = toSeries(
        dayRows("2026-10-08", { weights: [80, 81, 82, 83] }),
      );

      const result = currentWeight(series, TODAY);

      expect(result).toBe(81.5);
    });

    it("SHOULD fall back to the latest weigh-in up to today", () => {
      const series = toSeries([
        { date: "2026-09-01", weightKg: 78, caloriesKcal: null },
        { date: "2026-10-09", weightKg: 79.4, caloriesKcal: null },
        { date: "2026-10-12", weightKg: 90, caloriesKcal: null },
      ]);

      const result = currentWeight(series, TODAY);

      expect(result).toBe(79.4);
    });

    it("SHOULD return null without weigh-ins", () => {
      const series = toSeries(dayRows("2026-10-08", { calories: [2500] }));

      const result = currentWeight(series, TODAY);

      expect(result).toBeNull();
    });
  });
});
