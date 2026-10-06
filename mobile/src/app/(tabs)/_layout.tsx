import { Tabs } from "expo-router";

// LATER: tab icons (@expo/vector-icons).
export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ tabBarIconStyle: { display: "none" } }}>
      <Tabs.Screen name="index" options={{ title: "Today" }} />
      <Tabs.Screen name="history" options={{ title: "History" }} />
      <Tabs.Screen name="settings" options={{ title: "Settings" }} />
    </Tabs>
  );
}
