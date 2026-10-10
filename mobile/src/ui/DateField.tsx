import { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import { Pressable, StyleSheet, Switch, Text, View } from "react-native";

import {
  parseDateString,
  todayLocal,
  toDateString,
  type DateString,
} from "@/domain/dates";

import { colors } from "./theme";

type Props = {
  label: string;
  value: DateString | null;
  onChange: (value: DateString | null) => void;
  error?: string;
  allowOngoing?: boolean;
  defaultDate?: DateString;
};

export function DateField({
  label,
  value,
  onChange,
  error,
  allowOngoing = false,
  defaultDate,
}: Props) {
  const ongoing = allowOngoing && value === null;

  const openPicker = () => {
    // LATER(iOS): DateTimePickerAndroid is Android-only.
    DateTimePickerAndroid.open({
      value: parseDateString(value ?? defaultDate ?? todayLocal()),
      mode: "date",
      onChange: (event, date) => {
        if (event.type === "set" && date) onChange(toDateString(date));
      },
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      {allowOngoing ? (
        <View style={styles.ongoingRow}>
          <Text style={styles.ongoingText}>Ongoing</Text>
          <Switch
            accessibilityLabel={`${label} ongoing`}
            value={ongoing}
            onValueChange={(on) =>
              onChange(on ? null : (defaultDate ?? todayLocal()))
            }
          />
        </View>
      ) : null}
      {ongoing ? null : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${label}: ${value ?? "not set"}`}
          onPress={openPicker}
          style={[styles.button, error ? styles.buttonError : null]}
        >
          <Text style={value ? styles.value : styles.placeholder}>
            {value ?? "Pick a date"}
          </Text>
        </Pressable>
      )}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 4 },
  label: { fontSize: 14, fontWeight: "600", color: colors.text },
  ongoingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  ongoingText: { fontSize: 14, color: colors.text },
  button: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  buttonError: { borderColor: colors.danger },
  value: { fontSize: 16, color: colors.text },
  placeholder: { fontSize: 16, color: colors.muted },
  error: { fontSize: 12, color: colors.danger },
});
