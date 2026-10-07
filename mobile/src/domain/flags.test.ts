import { FLAGS, isFlag } from "./flags";

describe("flags.ts", () => {
  describe("GIVEN a known flag key", () => {
    it("SHOULD accept every flag", () => {
      for (const flag of FLAGS) {
        expect(isFlag(flag)).toBe(true);
      }
    });
  });

  describe("GIVEN an unknown string", () => {
    it("SHOULD reject it", () => {
      expect(isFlag("not_a_flag")).toBe(false);
      expect(isFlag("")).toBe(false);
    });
  });

  describe("GIVEN a non-string", () => {
    it("SHOULD reject it", () => {
      expect(isFlag(null)).toBe(false);
      expect(isFlag(undefined)).toBe(false);
      expect(isFlag(1)).toBe(false);
    });
  });
});
