import { Image } from "expo-image";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useState } from "react";
import { Dimensions, StyleSheet, Text, View } from "react-native";
import Animated, { Easing, Keyframe } from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

// Prevent native splash from auto-hiding early!
SplashScreen.preventAutoHideAsync();

const INITIAL_SCALE_FACTOR = Dimensions.get("screen").height / 90;
const DURATION = 600;

export function AnimatedSplashOverlay() {
  const [animate, setAnimate] = useState(false);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    // Hide native splash as soon as our custom splash is mounted!
    SplashScreen.hideAsync().catch(() => {});

    const timer = setTimeout(() => {
      setAnimate(true);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  const splashKeyframe = new Keyframe({
    0: {
      transform: [{ scale: 1 }],
      opacity: 1,
    },
    20: {
      opacity: 1,
    },
    70: {
      opacity: 0,
      easing: Easing.elastic(0.7),
    },
    100: {
      opacity: 0,
      transform: [{ scale: 1 }],
      easing: Easing.elastic(0.7),
    },
  });

  return animate ? (
    <Animated.View
      entering={splashKeyframe.duration(DURATION).withCallback((finished) => {
        "worklet";
        if (finished) {
          scheduleOnRN(setVisible, false);
        }
      })}
      style={styles.splashOverlay}
    >
      <View style={styles.splashContent} />
    </Animated.View>
  ) : (
    <View style={styles.splashOverlay}>
      <View style={styles.splashContent}>
        {/* Top white section */}
        <View style={styles.topSection}>
          {/* Logo */}
          <Text style={styles.logo}>GROWMAX</Text>
          <Text style={styles.logoSubtitle}>ENGINEERS</Text>

          {/* Categories */}
          <View style={styles.categoriesContainer}>
            <View style={styles.categoryItem}>
              <Text style={styles.categoryIcon}>☀️</Text>
              <Text style={styles.categoryLabel}>Solar</Text>
            </View>
            <View style={styles.categoryItem}>
              <Text style={styles.categoryIcon}>⚡</Text>
              <Text style={styles.categoryLabel}>Electric</Text>
            </View>
            <View style={styles.categoryItem}>
              <Text style={styles.categoryIcon}>🌿</Text>
              <Text style={styles.categoryLabel}>Clean</Text>
            </View>
          </View>

          {/* Subtitle */}
          <Text style={styles.solutionText}>SOLAR & ENERGY SOLUTIONS</Text>
        </View>

        {/* Bottom green section */}
        <View style={styles.bottomSection}>
          <Text style={styles.tagline}>Powering India's Green Future 🌱</Text>
          <Text style={styles.description}>
            Rooftop solar · Smart energy · Expert engineers
          </Text>

          {/* Progress dots */}
          <View style={styles.dotsContainer}>
            <View style={styles.dotActive} />
            <View style={styles.dotInactive} />
            <View style={styles.dotInactive} />
          </View>
        </View>
      </View>
    </View>
  );
}

const keyframe = new Keyframe({
  0: {
    transform: [{ scale: INITIAL_SCALE_FACTOR }],
  },
  100: {
    transform: [{ scale: 1 }],
    easing: Easing.elastic(0.7),
  },
});

const logoKeyframe = new Keyframe({
  0: {
    transform: [{ scale: 1.3 }],
    opacity: 0,
  },
  40: {
    transform: [{ scale: 1.3 }],
    opacity: 0,
    easing: Easing.elastic(0.7),
  },
  100: {
    opacity: 1,
    transform: [{ scale: 1 }],
    easing: Easing.elastic(0.7),
  },
});

const glowKeyframe = new Keyframe({
  0: {
    transform: [{ rotateZ: "0deg" }],
  },
  100: {
    transform: [{ rotateZ: "7200deg" }],
  },
});

export function AnimatedIcon() {
  return (
    <View style={styles.iconContainer}>
      <Animated.View
        entering={glowKeyframe.duration(60 * 1000 * 4)}
        style={styles.glow}
      >
        <Image
          style={styles.glow}
          source={require("../../assets/images/logo-glow.png")}
        />
      </Animated.View>

      <Animated.View
        entering={keyframe.duration(DURATION)}
        style={styles.background}
      />
      <Animated.View
        style={styles.imageContainer}
        entering={logoKeyframe.duration(DURATION)}
      >
        <Image
          style={styles.image}
          source={require("../../assets/images/expo-logo.png")}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  imageContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  glow: {
    width: 201,
    height: 201,
    position: "absolute",
  },
  iconContainer: {
    justifyContent: "center",
    alignItems: "center",
    width: 128,
    height: 128,
    zIndex: 100,
  },
  image: {
    width: 76,
    height: 71,
  },
  background: {
    borderRadius: 40,
    experimental_backgroundImage: `linear-gradient(180deg, #3C9FFE, #0274DF)`,
    width: 128,
    height: 128,
    position: "absolute",
  },
  splashOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "#657EEA",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },
  splashContent: {
    flex: 1,
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 32,
    overflow: "hidden",
    marginHorizontal: 20,
    marginVertical: 40,
    flexDirection: "column",
  },
  topSection: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  logo: {
    fontSize: 36,
    fontWeight: "700",
    color: "#1B1B1B",
    letterSpacing: 2,
    marginBottom: 4,
  },
  logoSubtitle: {
    fontSize: 12,
    letterSpacing: 3,
    color: "#999",
    marginBottom: 24,
  },
  categoriesContainer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
    marginBottom: 24,
  },
  categoryItem: {
    alignItems: "center",
    gap: 8,
  },
  categoryIcon: {
    fontSize: 32,
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#F5F5F5",
    textAlignVertical: "center",
    textAlign: "center",
    lineHeight: 48,
  },
  categoryLabel: {
    fontSize: 12,
    color: "#666",
    fontWeight: "500",
  },
  solutionText: {
    fontSize: 11,
    letterSpacing: 1.5,
    color: "#4A9B7A",
    fontWeight: "600",
  },
  bottomSection: {
    flex: 1,
    backgroundColor: "#657EEA",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  tagline: {
    fontSize: 20,
    fontWeight: "700",
    color: "#fff",
    textAlign: "center",
    marginBottom: 8,
  },
  description: {
    fontSize: 13,
    color: "rgba(255,255,255,0.8)",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 18,
  },
  dotsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
    marginTop: 16,
  },
  dotActive: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#FFA500",
  },
  dotInactive: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.3)",
  },
});
