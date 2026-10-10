import { parseDecimal } from "./numbers";

describe("numbers.ts", () => {
  describe("GIVEN typed numeric input", () => {
    it.each([
      ["78.4", 78.4],
      ["78,4", 78.4],
      [" 82 ", 82],
      ["+0.25", 0.25],
      ["-0,5", -0.5],
      [".5", 0.5],
      ["80.", 80],
    ])("SHOULD parse %p as %p", (input, expected) => {
      const result = parseDecimal(input);

      expect(result).toBe(expected);
    });

    it.each(["", "   ", "abc", "78.4.1", "78,4,1", "1e3", "--1", "-", "78 kg"])(
      "SHOULD return null for %p",
      (input) => {
        const result = parseDecimal(input);

        expect(result).toBeNull();
      },
    );
  });
});
