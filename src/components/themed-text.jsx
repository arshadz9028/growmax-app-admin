import { Platform, StyleSheet, Text } from "react-native";

import { Fonts } from "../constants/theme";
import { useTheme } from "../hooks/use-theme";

export function ThemedText({ style, type = "default", themeColor, ...rest }) {
  const theme = useTheme();

  return (
    <Text
      style={[
        { color: theme[themeColor ?? "text"] },
        type === "default" && styles.default,
        type === "title" && styles.title,
        type === "small" && styles.small,
        type === "smallBold" && styles.smallBold,
        type === "subtitle" && styles.subtitle,
        type === "link" && styles.link,
        type === "linkPrimary" && styles.linkPrimary,
        type === "code" && styles.code,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  small: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "500",
  },
  smallBold: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "700",
  },
  default: {
    fontSize: 14,
    lineHeight: 21,
    fontWeight: "500",
  },
  title: {
    fontSize: 40,
    fontWeight: "600",
    lineHeight: 44,
  },
  subtitle: {
    fontSize: 26,
    lineHeight: 36,
    fontWeight: "600",
  },
  link: {
    lineHeight: 26,
    fontSize: 12,
  },
  linkPrimary: {
    lineHeight: 26,
    fontSize: 12,
    color: "#3c87f7",
  },
  code: {
    fontFamily: Fonts.mono,
    fontWeight: Platform.select({ android: "700" }) ?? "500",
    fontSize: 11,
  },
});
