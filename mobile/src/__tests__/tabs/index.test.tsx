import { render, screen } from "@testing-library/react-native";

import TodayScreen from "@/app/(tabs)/index";

// Screen tests live outside src/app. Expo Router treats every file there as a route.
jest.mock("@/dev/DbStatus", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return {
    DbStatus: () => React.createElement(Text, null, "db status"),
  };
});

describe("index.tsx", () => {
  describe("GIVEN the today screen in dev", () => {
    it("SHOULD show the title and the dev database status", async () => {
      await render(<TodayScreen />);

      expect(screen.getByText("Today")).toBeOnTheScreen();
      expect(screen.getByText("db status")).toBeOnTheScreen();
    });
  });
});
