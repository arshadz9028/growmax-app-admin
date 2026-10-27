import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

const COLORS = {
  ink: "#102A43",
  text: "#0F172A",
  muted: "#64748B",
  border: "#D8E3F0",
  surface: "#FFFFFF",
  soft: "#F8FAFC",
  brand: "#1E5464",
  brandSoft: "#E8F4F7",
  success: "#0E9F6E",
  successSoft: "#ECFDF5",
  warning: "#B77912",
  warningSoft: "#FFFAEF",
  danger: "#DC3E45",
  dangerSoft: "#FEF2F2",
};

let activeAlert = null;
let nextAlertId = 0;
const alertQueue = [];
const subscribers = new Set();

function notifySubscribers() {
  subscribers.forEach((subscriber) => subscriber());
}

function subscribe(subscriber) {
  subscribers.add(subscriber);
  return () => subscribers.delete(subscriber);
}

export const Alert = {
  alert(title, message, buttons, options) {
    let alertMessage = message;
    let alertButtons = buttons;
    let alertOptions = options;

    if (Array.isArray(message)) {
      alertButtons = message;
      alertMessage = "";
      alertOptions = buttons;
    }

    const alert = {
      id: ++nextAlertId,
      title: String(title || ""),
      message: String(alertMessage || ""),
      buttons:
        Array.isArray(alertButtons) && alertButtons.length
          ? alertButtons
          : [{ text: "OK" }],
      options: alertOptions || {},
    };

    if (activeAlert) {
      alertQueue.push(alert);
    } else {
      activeAlert = alert;
      notifySubscribers();
    }
  },
};

function finishAlert(alertId, button, dismissed) {
  const currentAlert = activeAlert;
  if (!currentAlert || currentAlert.id !== alertId) return;

  activeAlert = alertQueue.shift() || null;
  notifySubscribers();

  if (dismissed) currentAlert.options.onDismiss?.();
  button?.onPress?.();
}

export function StyledAlertHost() {
  const [alert, setAlert] = useState(activeAlert);

  useEffect(() => subscribe(() => setAlert(activeAlert)), []);

  if (!alert) return null;

  const normalizedTitle = alert.title.toLowerCase();
  const isSuccess =
    /success|saved|updated|assigned|approved|resolved|created|completed|submitted|deleted|reactivated/.test(
      normalizedTitle,
    );
  const isDanger =
    /failed|error|invalid|required|missing|unable|cannot|unavailable|rejected/.test(
      normalizedTitle,
    );
  const isWarning =
    /confirm|delete|logout|remove|reject|discard|close\?/.test(
      normalizedTitle,
    );
  const accent = isDanger
    ? COLORS.danger
    : isSuccess
      ? COLORS.success
      : isWarning
        ? COLORS.warning
        : COLORS.brand;
  const accentSoft = isDanger
    ? COLORS.dangerSoft
    : isSuccess
      ? COLORS.successSoft
      : isWarning
        ? COLORS.warningSoft
        : COLORS.brandSoft;
  const icon = isDanger
    ? "alert-circle"
    : isSuccess
      ? "checkmark-circle"
      : isWarning
        ? "help-circle"
        : "information-circle";
  const isStacked = alert.buttons.length > 2;

  const handleRequestClose = () => {
    if (alert.options.cancelable === false) return;
    const cancelButton = alert.buttons.find(
      (button) => button.style === "cancel",
    );
    finishAlert(alert.id, cancelButton, true);
  };

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      onRequestClose={handleRequestClose}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View
          accessibilityRole="alert"
          accessibilityViewIsModal
          style={styles.card}
        >
          <View style={[styles.iconWrap, { backgroundColor: accentSoft }]}>
            <Ionicons name={icon} size={30} color={accent} />
          </View>
          <Text style={styles.title}>{alert.title}</Text>
          {alert.message ? (
            <Text style={styles.message}>{alert.message}</Text>
          ) : null}
          <View
            style={[
              styles.actions,
              isStacked && styles.actionsStacked,
            ]}
          >
            {alert.buttons.map((button, index) => {
              const isCancel = button.style === "cancel";
              const isDestructive = button.style === "destructive";
              return (
                <Pressable
                  key={`${button.text || "action"}-${index}`}
                  accessibilityRole="button"
                  style={[
                    styles.button,
                    isStacked && styles.buttonStacked,
                    isCancel
                      ? styles.buttonSecondary
                      : isDestructive
                        ? styles.buttonDestructive
                        : styles.buttonPrimary,
                  ]}
                  onPress={() => finishAlert(alert.id, button, true)}
                >
                  <Text
                    style={[
                      styles.buttonText,
                      isCancel && styles.buttonSecondaryText,
                    ]}
                  >
                    {button.text || "OK"}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    alignItems: "center",
    backgroundColor: "rgba(15, 23, 42, 0.58)",
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  card: {
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderRadius: 24,
    borderWidth: 1,
    elevation: 12,
    maxWidth: 390,
    paddingHorizontal: 22,
    paddingBottom: 20,
    paddingTop: 24,
    shadowColor: COLORS.ink,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 22,
    width: "100%",
  },
  iconWrap: {
    alignItems: "center",
    borderRadius: 20,
    height: 58,
    justifyContent: "center",
    marginBottom: 14,
    width: 58,
  },
  title: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: "900",
    lineHeight: 23,
    textAlign: "center",
  },
  message: {
    color: COLORS.muted,
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 18,
    marginTop: 8,
    textAlign: "center",
  },
  actions: {
    flexDirection: "row",
    gap: 9,
    marginTop: 21,
    width: "100%",
  },
  actionsStacked: {
    flexDirection: "column-reverse",
  },
  button: {
    alignItems: "center",
    borderRadius: 13,
    flex: 1,
    justifyContent: "center",
    minHeight: 45,
    paddingHorizontal: 12,
  },
  buttonStacked: {
    flex: 0,
    width: "100%",
  },
  buttonPrimary: {
    backgroundColor: COLORS.brand,
  },
  buttonSecondary: {
    backgroundColor: COLORS.soft,
    borderColor: COLORS.border,
    borderWidth: 1,
  },
  buttonDestructive: {
    backgroundColor: COLORS.danger,
  },
  buttonText: {
    color: COLORS.surface,
    fontSize: 11,
    fontWeight: "900",
    textAlign: "center",
  },
  buttonSecondaryText: {
    color: COLORS.ink,
  },
});
