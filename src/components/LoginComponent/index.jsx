import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAdminAuth } from "../../contexts/AdminAuthContext";

const COLORS = {
  ink: "#102A43",
  green: "#1E6C5C",
  lime: "#D9FF76",
  muted: "#789092",
  field: "#F4F8F7",
  border: "#D8E8E3",
  error: "#C24141",
  white: "#FFFFFF",
};

export default function AdminLoginScreen() {
  const { login } = useAdminAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    if (!username.trim() || !password) {
      setError("Enter your username and password.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      await login({
        username: username.trim(),
        password,
      });
    } catch (loginError) {
      setError(
        loginError?.message || "Unable to sign in. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <LinearGradient
        colors={["#083A32", "#146D59", "#2E8B67"]}
        style={styles.background}
      >
        {/* Decorative background circles */}
        <View pointerEvents="none" style={styles.orbOne} />
        <View pointerEvents="none" style={styles.orbTwo} />

        <KeyboardAvoidingView
          style={styles.keyboard}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
        >
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={
              Platform.OS === "ios" ? "interactive" : "on-drag"
            }
            showsVerticalScrollIndicator={false}
            automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
          >
            {/* Header */}
            <View style={styles.top}>
              <View style={styles.mark}>
                <Ionicons
                  name="shield-checkmark"
                  size={27}
                  color={COLORS.lime}
                />
              </View>

              <Text style={styles.brand}>GROWMAX</Text>

              <Text style={styles.portal}>
                ADMIN PORTAL
              </Text>
            </View>

            {/* Login Card */}
            <View style={styles.card}>
              <Text style={styles.title}>Admin Access</Text>

              <Text style={styles.subtitle}>
                Sign in to access the admin console and manage operations.
              </Text>

              {/* Username */}
              <Text style={styles.label}>Username</Text>

              <View style={styles.inputWrap}>
                <Ionicons
                  name="person-outline"
                  size={18}
                  color={COLORS.muted}
                />

                <TextInput
                  value={username}
                  onChangeText={(text) => {
                    setUsername(text);
                    if (error) {
                      setError("");
                    }
                  }}
                  placeholder="Admin username"
                  placeholderTextColor="#9DAFAD"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="username"
                  textContentType="username"
                  editable={!submitting}
                  returnKeyType="next"
                  style={styles.input}
                />
              </View>

              {/* Password */}
              <Text style={styles.label}>Password</Text>

              <View style={styles.inputWrap}>
                <Ionicons
                  name="lock-closed-outline"
                  size={18}
                  color={COLORS.muted}
                />

                <TextInput
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    if (error) {
                      setError("");
                    }
                  }}
                  placeholder="Your password"
                  placeholderTextColor="#9DAFAD"
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="password"
                  textContentType="password"
                  editable={!submitting}
                  returnKeyType="done"
                  onSubmitEditing={submit}
                  style={styles.input}
                />

                <Pressable
                  onPress={() =>
                    setShowPassword((current) => !current)
                  }
                  hitSlop={8}
                  disabled={submitting}
                >
                  <Ionicons
                    name={
                      showPassword
                        ? "eye-off-outline"
                        : "eye-outline"
                    }
                    size={19}
                    color={COLORS.muted}
                  />
                </Pressable>
              </View>

              {/* Error / Session message */}
              {error ? (
                <Text style={styles.error}>{error}</Text>
              ) : (
                <Text style={styles.sessionNote}>
                  Your login remains securely saved on this device.
                </Text>
              )}

              {/* Login Button */}
              <Pressable
                style={[
                  styles.button,
                  submitting && styles.buttonDisabled,
                ]}
                onPress={submit}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color={COLORS.ink} />
                ) : (
                  <>
                    <Text style={styles.buttonText}>
                      Sign in
                    </Text>

                    <Ionicons
                      name="arrow-forward"
                      size={18}
                      color={COLORS.ink}
                    />
                  </>
                )}
              </Pressable>
            </View>

            {/* Footer */}
            <Text style={styles.footer}>
              GROWMAX ENGINEERS · ADMIN CONSOLE
            </Text>
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#083A32",
  },

  background: {
    flex: 1,
    overflow: "hidden",
  },

  keyboard: {
    flex: 1,
  },

  scroll: {
    flex: 1,
  },

  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 42,
    paddingBottom: 24,

    // Gives ScrollView enough room to position
    // the card above the keyboard.
    justifyContent: "space-between",
  },

  /* Decorative circles */

  orbOne: {
    position: "absolute",
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: "rgba(217,255,118,.19)",
    right: -120,
    top: -70,
  },

  orbTwo: {
    position: "absolute",
    width: 190,
    height: 190,
    borderRadius: 95,
    borderWidth: 1,
    borderColor: "rgba(217,255,118,.25)",
    left: -95,
    bottom: 80,
  },

  /* Header */

  top: {
    alignItems: "center",
    marginBottom: 24,
  },

  mark: {
    width: 62,
    height: 62,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: "rgba(217,255,118,.44)",
    backgroundColor: "rgba(3,45,37,.35)",
    alignItems: "center",
    justifyContent: "center",
  },

  brand: {
    color: COLORS.white,
    fontSize: 29,
    fontWeight: "900",
    letterSpacing: 2,
    marginTop: 16,
  },

  portal: {
    color: "rgba(235,255,228,.74)",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 3,
    marginTop: 4,
  },

  /* Login card */

  card: {
    backgroundColor: COLORS.white,
    borderRadius: 23,
    padding: 20,

    shadowColor: "#052B25",
    shadowOpacity: 0.22,
    shadowRadius: 24,
    shadowOffset: {
      width: 0,
      height: 12,
    },

    elevation: 8,
  },

  title: {
    color: COLORS.ink,
    fontSize: 23,
    fontWeight: "900",
  },

  subtitle: {
    color: COLORS.muted,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "600",
    marginTop: 5,
    marginBottom: 22,
  },

  label: {
    color: COLORS.ink,
    fontSize: 11,
    fontWeight: "900",
    marginBottom: 7,
    marginTop: 12,
  },

  /* Inputs */

  inputWrap: {
    minHeight: 50,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.field,

    flexDirection: "row",
    alignItems: "center",

    gap: 9,
    paddingHorizontal: 13,
  },

  input: {
    flex: 1,
    color: COLORS.ink,
    fontSize: 13,
    fontWeight: "700",
    minHeight: 48,
    paddingVertical: 0,
  },

  /* Messages */

  sessionNote: {
    color: COLORS.muted,
    fontSize: 10.5,
    lineHeight: 16,
    fontWeight: "600",
    marginTop: 13,
  },

  error: {
    color: COLORS.error,
    fontSize: 10.5,
    lineHeight: 16,
    fontWeight: "700",
    marginTop: 13,
  },

  /* Button */

  button: {
    height: 51,
    borderRadius: 14,
    backgroundColor: COLORS.lime,

    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",

    gap: 8,
    marginTop: 18,
  },

  buttonDisabled: {
    opacity: 0.7,
  },

  buttonText: {
    color: COLORS.ink,
    fontSize: 13,
    fontWeight: "900",
  },

  /* Footer */

  footer: {
    color: "rgba(235,255,228,.65)",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.3,
    textAlign: "center",
    marginTop: 24,
  },
});
