import { StyleSheet, Text, View } from "react-native";

import { DbStatus } from "@/dev/DbStatus";

export default function TodayScreen() {
  return (
    <View style={styles.container}>
      <Text>Today</Text>
      {__DEV__ && <DbStatus />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center" },
});
