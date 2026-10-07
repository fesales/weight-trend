import { render, screen } from "@testing-library/react-native";

import HistoryScreen from "@/app/(tabs)/history";

// Screen tests live outside src/app. Expo Router treats every file there as a route.
describe("history.tsx", () => {
  describe("GIVEN the history screen", () => {
    it("SHOULD show the History title", async () => {
      await render(<HistoryScreen />);

      expect(screen.getByText("History")).toBeOnTheScreen();
    });
  });
});
