import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

const BRAND_BLUE = "#6C85EE";

export default function HeaderComp({ title, subtitle, onBackPress }) {
  const router = useRouter();

  const handleBack = () => {
    // 1. If a custom back handler was passed as a prop, use it
    if (onBackPress) {
      onBackPress();
      return;
    }

    // Respect the navigation stack instead of forcibly redirecting to the index screen.
    // If there is no previous route, do nothing rather than resetting the user to home.
    if (router.canGoBack()) {
      router.back();
    }
  };

  return (
    <View style={styles.header}>
      {/* Background Decorative Bubble */}
      <View style={styles.headerBubble} />

      {/* Back Button & Title */}
      <View style={styles.headerContent}>
        <TouchableOpacity
          style={styles.backButton}
          activeOpacity={0.7}
          onPress={handleBack}
        >
          <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
        </TouchableOpacity>

        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>{title}</Text>
          {subtitle && <Text style={styles.headerSubtitle}>{subtitle}</Text>}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: BRAND_BLUE,
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 35,
    width: "100%",
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    position: "relative",
    overflow: "hidden",
  },
  headerBubble: {
    position: "absolute",
    top: -40,
    right: -40,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.25)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  headerTitleContainer: {
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 0.3,

    textShadowColor: "rgba(0, 0, 0, 0.1)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  headerSubtitle: {
    fontSize: 10,
    color: "rgba(255, 255, 255, 0.85)",
    marginTop: 2,
    textShadowColor: "rgba(0, 0, 0, 0.1)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});
