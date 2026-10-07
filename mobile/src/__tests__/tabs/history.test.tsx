import { render, screen } from "@testing-library/react-native";

import HistoryScreen from "@/app/(tabs)/history";

describe("history.tsx", () => {
  describe("GIVEN the history screen", () => {
    it("SHOULD show the History title", async () => {
      await render(<HistoryScreen />);

      expect(screen.getByText("History")).toBeOnTheScreen();
    });
  });
});
