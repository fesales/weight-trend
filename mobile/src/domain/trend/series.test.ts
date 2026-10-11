import { dayRows } from "@/test/series";

import { toSeries, windowAverage, windowStats } from "./series";

describe("series.ts", () => {
  describe("GIVEN rows with missing values", () => {
    it("SHOULD keep only the values that exist", () => {
      const rows = dayRows("2026-10-01", {
        weights: [80, null, 81],
        calories: [null, 2500, 2600],
      });

      const series = toSeries(rows);

      expect([...series.weights]).toEqual([
        ["2026-10-01", 80],
        ["2026-10-03", 81],
      ]);
      expect([...series.calories]).toEqual([
        ["2026-10-02", 2500],
        ["2026-10-03", 2600],
      ]);
    });
  });

  describe("GIVEN a window over a series", () => {
    const { weights } = toSeries(
      dayRows("2026-09-29", { weights: [79, 80, null, 82, null, 84] }),
    );

    it("SHOULD average the values inside the inclusive window", () => {
      const result = windowStats(weights, "2026-09-30", "2026-10-03");

      expect(result).toEqual({ average: 81, count: 2 });
    });

    it("SHOULD report no average for an empty window", () => {
      const result = windowStats(weights, "2026-10-10", "2026-10-12");

      expect(result).toEqual({ average: null, count: 0 });
    });

    it("SHOULD return the average when the window has enough values", () => {
      const result = windowAverage(weights, "2026-09-29", "2026-10-04", 4);

      expect(result).toBe(81.25);
    });

    it("SHOULD return null when the window has too few values", () => {
      const result = windowAverage(weights, "2026-09-30", "2026-10-04", 4);

      expect(result).toBeNull();
    });
  });
});
