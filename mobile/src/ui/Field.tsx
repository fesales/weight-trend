import { StyleSheet, Text, TextInput, View, type TextInputProps } from "react-native";

import { colors } from "./theme";

type Props = Pick<TextInputProps, "value" | "onChangeText" | "keyboardType" | "placeholder" | "multiline"> & {
  label: string;
  hint?: string;
  error?: string;
};

export function Field({ label, hint, error, multiline, ...input }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        {...input}
        multiline={multiline}
        accessibilityLabel={label}
        style={[styles.input, multiline && styles.multiline, error ? styles.inputError : null]}
        placeholderTextColor={colors.muted}
      />
      {hint && !error ? <Text style={styles.hint}>{hint}</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 4 },
  label: { fontSize: 14, fontWeight: "600", color: colors.text },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: colors.text,
  },
  multiline: { minHeight: 72, textAlignVertical: "top" },
  inputError: { borderColor: colors.danger },
  hint: { fontSize: 12, color: colors.muted },
  error: { fontSize: 12, color: colors.danger },
});
