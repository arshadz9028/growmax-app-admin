import { StyleSheet } from "react-native";

import { Spacing } from "../constants/theme";
import { useTheme } from "../hooks/use-theme";
import { ThemedText } from "./themed-text";
import { ThemedView } from "./themed-view";

export function HintRow({ children }) {
  const theme = useTheme();

  return (
    <ThemedView type="backgroundElement" style={styles.row}>
      <ThemedView style={styles.left}>
        <ThemedText type="small">{children}</ThemedText>
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  row: {
    padding: Spacing.four,
    borderRadius: Spacing.three,
  },
  left: {
    flex: 1,
  },
});
