import {
  findOverlap,
  planPeriodSave,
  validatePeriodDraft,
  type PeriodDraft,
  type PeriodRange,
} from "./periods";

const BULK: PeriodRange = {
  id: 1,
  label: "Bulk",
  startDate: "2026-08-01",
  endDate: "2026-08-31",
};
const CURRENT: PeriodRange = {
  id: 2,
  label: "Bulk 2",
  startDate: "2026-09-10",
  endDate: null,
};

const DRAFT: PeriodDraft = {
  startDate: "2026-09-01",
  endDate: "2026-09-30",
  targetKcal: 2800,
  label: "Cut",
  reason: null,
};

describe("periods.ts", () => {
  describe("GIVEN existing periods and a candidate range", () => {
    it("SHOULD find no overlap across a gap", () => {
      const candidate = { startDate: "2026-09-01", endDate: "2026-09-05" };

      const result = findOverlap([BULK, CURRENT], candidate);

      expect(result).toBeNull();
    });

    it("SHOULD treat ranges that touch on the same day as overlapping", () => {
      const candidate = { startDate: "2026-08-31", endDate: "2026-09-05" };

      const result = findOverlap([BULK], candidate);

      expect(result).toBe(BULK);
    });

    it("SHOULD allow a range that starts the day after another ends", () => {
      const candidate = { startDate: "2026-09-01", endDate: null };

      const result = findOverlap([BULK], candidate);

      expect(result).toBeNull();
    });

    it("SHOULD treat an open end as running forever", () => {
      const candidate = { startDate: "2030-01-01", endDate: "2030-01-31" };

      const result = findOverlap([CURRENT], candidate);

      expect(result).toBe(CURRENT);
    });

    it("SHOULD find an overlap between two open-ended periods", () => {
      const candidate = { startDate: "2020-01-01", endDate: null };

      const result = findOverlap([CURRENT], candidate);

      expect(result).toBe(CURRENT);
    });

    it("SHOULD ignore the period being edited", () => {
      const candidate = { startDate: "2026-08-05", endDate: "2026-08-20" };

      const result = findOverlap([BULK, CURRENT], candidate, BULK.id);

      expect(result).toBeNull();
    });
  });

  describe("GIVEN a period about to be saved", () => {
    it("SHOULD be ok when nothing overlaps", () => {
      const candidate = { startDate: "2026-09-01", endDate: "2026-09-09" };

      const result = planPeriodSave([BULK, CURRENT], candidate);

      expect(result).toEqual({ kind: "ok" });
    });

    it("SHOULD offer to close the open period the day before a new current one starts", () => {
      const candidate = { startDate: "2026-10-01", endDate: null };

      const result = planPeriodSave([BULK, CURRENT], candidate);

      expect(result).toEqual({
        kind: "closePrevious",
        period: CURRENT,
        endDate: "2026-09-30",
      });
    });

    it("SHOULD block a new current period starting on the same day as the open one", () => {
      const candidate = { startDate: "2026-09-10", endDate: null };

      const result = planPeriodSave([BULK, CURRENT], candidate);

      expect(result).toEqual({ kind: "overlap", period: CURRENT });
    });

    it("SHOULD block a new current period starting before the open one", () => {
      const candidate = { startDate: "2026-08-15", endDate: null };

      const result = planPeriodSave([CURRENT], candidate);

      expect(result).toEqual({ kind: "overlap", period: CURRENT });
    });

    it("SHOULD block a new period with an end date that overlaps the open one", () => {
      const candidate = { startDate: "2026-10-01", endDate: "2026-10-31" };

      const result = planPeriodSave([CURRENT], candidate);

      expect(result).toEqual({ kind: "overlap", period: CURRENT });
    });

    it("SHOULD not offer to close anything when editing an existing period", () => {
      const candidate = { startDate: "2026-08-01", endDate: null };

      const result = planPeriodSave([BULK, CURRENT], candidate, BULK.id);

      expect(result).toEqual({ kind: "overlap", period: CURRENT });
    });

    it("SHOULD block when closing the open period still leaves a clash", () => {
      const later: PeriodRange = {
        id: 3,
        label: "Future",
        startDate: "2026-11-01",
        endDate: "2026-11-30",
      };
      const candidate = { startDate: "2026-10-01", endDate: null };

      const result = planPeriodSave([CURRENT, later], candidate);

      expect(result).toEqual({ kind: "overlap", period: later });
    });
  });

  describe("GIVEN a period draft to validate", () => {
    it("SHOULD return no errors for a valid draft", () => {
      const draft = DRAFT;

      const result = validatePeriodDraft(draft);

      expect(result).toEqual({});
    });

    it("SHOULD allow an open end", () => {
      const draft = { ...DRAFT, endDate: null };

      const result = validatePeriodDraft(draft);

      expect(result).toEqual({});
    });

    it("SHOULD allow a one-day period", () => {
      const draft = { ...DRAFT, endDate: DRAFT.startDate };

      const result = validatePeriodDraft(draft);

      expect(result).toEqual({});
    });

    it("SHOULD flag an end date before the start", () => {
      const draft = { ...DRAFT, endDate: "2026-08-31" };

      const result = validatePeriodDraft(draft);

      expect(result).toEqual({ endDate: "End date is before the start" });
    });

    it.each([499, 10001, 2800.5, Number.NaN])(
      "SHOULD flag a target of %p kcal",
      (targetKcal) => {
        const draft = { ...DRAFT, targetKcal };

        const result = validatePeriodDraft(draft);

        expect(result).toEqual({
          targetKcal: "Whole number between 500 and 10000",
        });
      },
    );

    it("SHOULD flag a blank label and invalid dates", () => {
      const draft = {
        ...DRAFT,
        label: "  ",
        startDate: "",
        endDate: "2026-02-30",
      };

      const result = validatePeriodDraft(draft);

      expect(result).toEqual({
        label: "Give it a label",
        startDate: "Pick a start date",
        endDate: "Pick an end date",
      });
    });
  });
});
