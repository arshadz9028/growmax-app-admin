import { Pressable, StyleSheet } from "react-native";

import { useTheme } from "../hooks/use-theme";
import { ThemedText } from "./themed-text";
import { ThemedView } from "./themed-view";

export function WebBadge() {
  const theme = useTheme();

  return (
    <Pressable>
      <ThemedView style={styles.badge}>
        <ThemedText type="smallBold">Web</ThemedText>
      </ThemedView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  badge: {
    padding: 8,
    borderRadius: 8,
  },
});
