import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import {
  Alert,
  Dimensions,
  Image,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import growNew from "../../../assets/images/grow_new.jpeg";
import { useAuth } from "../../contexts/auth-context";
const { width } = Dimensions.get("window");

const colors = {
  brand: "#657EEA",
  brandLight: "#EEF1FD",
  green: "#10B981",
  amber: "#F59E0B",
  red: "#EF4444",
  textDark: "#111827",
  white: "#FFFFFF",
};

function HeaderComponent() {
  const router = useRouter();
  const { session, isAuthenticated, clearSession } = useAuth();
  const profileImage = session?.photoURL || "";
  const [showProfileMenu, setShowProfileMenu] = React.useState(false);

  const handleAvatarPress = () => {
    console.log("Avatar pressed. User is authenticated:", isAuthenticated);
    if (isAuthenticated) {
      setShowProfileMenu(true);
      return;
    }

    router.push("/login");
  };

  const handleLogout = async () => {
    try {
      await clearSession();
      setShowProfileMenu(false);
      router.replace("/login");
    } catch (error) {
      console.error("Logout failed:", error);
      Alert.alert("Logout failed", "Please try again.");
    }
  };

  return (
    <View style={styles.headerContainer}>
      {/* Background Decorative Circles */}
      <View style={[styles.circleShape, styles.circleOne]} />
      <View style={[styles.circleShape, styles.circleTwo]} />

      <View style={styles.headerContent}>
        {/* Top Navigation Row */}
        <View style={styles.topRow}>
          {/* Left: App Logo & Name */}
          <View style={styles.brandContainer}>
            <View style={styles.logoBox}>
              <Image source={growNew} style={styles.logoIcon} />
            </View>
            <Text style={styles.brandTitle}>Growmax</Text>
          </View>

          {/* Right: Actions (Notification & Profile Avatar) */}
          <View style={styles.actionsContainer}>
            <TouchableOpacity style={styles.iconButton} 
            onPress={() => router.push("/admin")}
            activeOpacity={0.8}>
              <Feather name="bell" size={22} color="#ffffffff" />
              <View style={styles.notificationDot} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.avatarBox}
              onPress={handleAvatarPress}
            >
              {profileImage ? (
                <Image
                  source={{ uri: profileImage }}
                  style={styles.avatarImage}
                  pointerEvents="none"
                />
              ) : (
                <Feather name="user" size={24} color="#1f5187ff" />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* User Greeting */}
        {/* <View style={styles.greetingContainer}>
          <Text style={styles.greetingSub}>Good morning,</Text>
          <Text style={styles.greetingName}>Grow user</Text>
        </View> */}

        {/* Dashboard Status Metric Cards */}
        {/* <View style={styles.statsContainer}>
          <View style={styles.statBox}>
            <Text style={[styles.statIcon, { color: colors.green }]}>✓</Text>
            <Text style={[styles.statNumber, { color: colors.green }]}>2</Text>
            <Text style={styles.statLabel}>ACTIVE</Text>
          </View>

          <View style={styles.statBox}>
            <Text style={[styles.statIcon, { color: colors.amber }]}>🕒</Text>
            <Text style={[styles.statNumber, { color: colors.amber }]}>1</Text>
            <Text style={styles.statLabel}>PENDING</Text>
          </View>

          <View style={styles.statBox}>
            <Text style={[styles.statIcon, { color: colors.red }]}>!</Text>
            <Text style={[styles.statNumber, { color: colors.red }]}>1</Text>
            <Text style={styles.statLabel}>RENEWALS</Text>
          </View>
        </View> */}
      </View>

      <Modal
        visible={showProfileMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowProfileMenu(false)}
        statusBarTranslucent
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Profile</Text>
            <Text style={styles.modalSubtitle}>
              {session?.username || session?.email || "Signed in"}
            </Text>

            <TouchableOpacity
              style={styles.logoutButton}
              onPress={handleLogout}
              activeOpacity={0.8}
            >
              <Feather name="log-out" size={18} color={colors.white} />
              <Text style={styles.logoutButtonText}>Logout</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowProfileMenu(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

export default HeaderComponent;

const styles = StyleSheet.create({
  headerContainer: {
    backgroundColor: colors.brand,
    paddingTop: 50,
    position: "relative",
    overflow: "hidden",
    height: 130,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  circleShape: {
    position: "absolute",
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 999,
  },
  circleOne: {
    width: 260,
    height: 260,
    top: -80,
    left: -80,
  },
  circleTwo: {
    width: 220,
    height: 220,
    top: 20,
    right: -80,
  },
  headerContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    zIndex: 1,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  brandContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  logoBox: {
    width: 44,
    height: 44,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  logoIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    resizeMode: "contain",
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: colors.white,
  },
  actionsContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
    position: "relative",
  },
  bellIcon: {
    fontSize: 18,
    color: colors.white,
  },
  notificationDot: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.red,
  },
  avatarBox: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.white,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarImage: {
    width: 42,
    height: 42,
    borderRadius: 21,
    resizeMode: "cover",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  modalCard: {
    width: "100%",
    maxWidth: 320,
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 20,
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.textDark,
    marginBottom: 6,
  },
  modalSubtitle: {
    fontSize: 14,
    color: "#64748b",
    marginBottom: 20,
    textAlign: "center",
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.red,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 18,
    width: "100%",
    marginBottom: 10,
  },
  logoutButtonText: {
    color: colors.white,
    fontWeight: "700",
    marginLeft: 8,
  },
  cancelButton: {
    width: "100%",
    alignItems: "center",
    paddingVertical: 10,
  },
  cancelButtonText: {
    color: "#64748b",
    fontWeight: "600",
  },
  greetingContainer: {
    marginBottom: 24,
  },
  greetingSub: {
    fontSize: 15,
    color: colors.brandLight,
    fontWeight: "500",
    marginBottom: 4,
  },
  greetingName: {
    fontSize: 28,
    fontWeight: "bold",
    color: colors.white,
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  statBox: {
    backgroundColor: "rgba(255, 255, 255, 0.18)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.25)",
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: "center",
    flex: 1,
    marginHorizontal: 4,
  },
  statIcon: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 4,
  },
  statNumber: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    color: colors.brandLight,
    fontWeight: "bold",
    letterSpacing: 0.5,
  },
  waveContainer: {
    width: "100%",
    marginTop: -10,
  },
});
