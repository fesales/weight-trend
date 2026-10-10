import { render, screen } from "@testing-library/react-native";

import TodayScreen from "@/app/(tabs)/index";

jest.mock("@/dev/DbStatus", () => {
  const React = jest.requireActual<typeof import("react")>("react");
  const { Text } =
    jest.requireActual<typeof import("react-native")>("react-native");
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
