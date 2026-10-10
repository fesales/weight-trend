import {
  addDays,
  isRealDate,
  parseDateString,
  toDateString,
  todayLocal,
} from "./dates";

describe("dates.ts", () => {
  describe("GIVEN a candidate date string", () => {
    it.each(["2026-10-07", "2024-02-29", "2026-12-31"])(
      "SHOULD accept %s",
      (value) => {
        const result = isRealDate(value);

        expect(result).toBe(true);
      },
    );

    it.each([
      "2026-02-30",
      "2025-02-29",
      "2026-13-01",
      "2026-1-7",
      "07/10/2026",
      "",
      "2026-10-07T00:00",
    ])("SHOULD reject %p", (value) => {
      const result = isRealDate(value);

      expect(result).toBe(false);
    });
  });

  describe("GIVEN a date and a day offset", () => {
    it.each([
      ["2026-10-07", 1, "2026-10-08"],
      ["2026-10-31", 1, "2026-11-01"],
      ["2026-12-31", 1, "2027-01-01"],
      ["2027-01-01", -1, "2026-12-31"],
      ["2024-02-28", 1, "2024-02-29"],
      ["2026-03-29", 7, "2026-04-05"],
      ["2026-10-07", 0, "2026-10-07"],
    ])("SHOULD move %s by %i days to %s", (start, days, expected) => {
      const result = addDays(start, days);

      expect(result).toBe(expected);
    });

    it("SHOULD throw on an invalid date", () => {
      const act = () => addDays("2026-02-30", 1);

      expect(act).toThrow('invalid date "2026-02-30"');
    });
  });

  describe("GIVEN a local Date", () => {
    it("SHOULD format its local calendar day, not the UTC one", () => {
      const lateEvening = new Date(2026, 9, 7, 23, 59);

      const result = toDateString(lateEvening);

      expect(result).toBe("2026-10-07");
    });

    it("SHOULD use the given clock for today", () => {
      const now = new Date(2026, 0, 5, 8, 0);

      const result = todayLocal(now);

      expect(result).toBe("2026-01-05");
    });
  });

  describe("GIVEN a date string to parse", () => {
    it("SHOULD return local midnight of that day", () => {
      const result = parseDateString("2026-10-07");

      expect([
        result.getFullYear(),
        result.getMonth(),
        result.getDate(),
        result.getHours(),
      ]).toEqual([2026, 9, 7, 0]);
    });

    it("SHOULD round-trip through toDateString", () => {
      const value = "2026-03-29";

      const result = toDateString(parseDateString(value));

      expect(result).toBe(value);
    });

    it("SHOULD throw on an invalid date", () => {
      const act = () => parseDateString("nope");

      expect(act).toThrow('invalid date "nope"');
    });
  });
});
