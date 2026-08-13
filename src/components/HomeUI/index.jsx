import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React from "react";
import {
  Animated,
  Easing,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../contexts/auth-context";

const COLORS = {
  page: "#EFF4FB",
  surface: "#FFFFFF",
  surfaceAlt: "#F8FAFC",
  text: "#0F172A",
  muted: "#64748B",
  faint: "#94A3B8",
  border: "#D8E3F0",
  brand: "#1E5464",
  brandDark: "#102A43",
  blue: "#657EEA",
  blueSoft: "#EEF2FF",
  success: "#10B981",
  successSoft: "#ECFDF5",
  cyan: "#06B6D4",
  cyanSoft: "#ECFEFF",
  amber: "#F59E0B",
  amberSoft: "#FFFBEB",
  danger: "#EF4444",
  dangerSoft: "#FEF2F2",
  shadow: "#94A3B8",
};

const adminMetrics = [
  {
    label: "New Requests",
    value: "18",
    trend: "+6 today",
    icon: "file-tray-full-outline",
    accent: COLORS.blue,
    soft: COLORS.blueSoft,
    route: "/new-request",
  },
  {
    label: "Active User's Services",
    value: "246",
    trend: "32 ongoing",
    icon: "construct-outline",
    accent: COLORS.success,
    soft: COLORS.successSoft,
    route: "/active-services",
  },
  {
    label: "Manage Technician",
    value: "07",
    trend: "Needs follow-up",
    icon: "person-add-outline",
    accent: COLORS.amber,
    soft: COLORS.amberSoft,
    route: "/manage-technician",
  },
  {
    label: "Open Complaints",
    value: "12",
    trend: "4 high priority",
    icon: "chatbubble-ellipses-outline",
    accent: COLORS.danger,
    soft: COLORS.dangerSoft,
    route: "/complaints",
  },
];

const quickActions = [
  {
    title: "Manage Technician",
    subtitle: "Create field allocation",
    icon: "person-add-outline",
    route: "/admin/assign-technician",
    accent: COLORS.blue,
    soft: COLORS.blueSoft,
  },
  {
    title: "Manage Requests",
    subtitle: "Review applications",
    icon: "clipboard-outline",
    route: "/admin/requests",
    accent: COLORS.success,
    soft: COLORS.successSoft,
  },
  {
    title: "Payments",
    subtitle: "Verify transactions",
    icon: "wallet-outline",
    route: "/admin/payments",
    accent: COLORS.amber,
    soft: COLORS.amberSoft,
  },
  {
    title: "Complaints",
    subtitle: "Resolve support cases",
    icon: "shield-checkmark-outline",
    route: "/admin/complaints",
    accent: COLORS.danger,
    soft: COLORS.dangerSoft,
  },
  {
    title: "Tasks",
    subtitle: "Prioritize admin work",
    icon: "checkmark-done-outline",
    route: "/task-management",
    accent: COLORS.cyan,
    soft: COLORS.cyanSoft,
  },
  {
    title: "Products",
    subtitle: "Update catalog",
    icon: "cube-outline",
    route: "/admin/products",
    accent: COLORS.brand,
    soft: "#E8F4F7",
  },
];

const servicePipelines = [
  {
    title: "Solar Engineering",
    subtitle: "Installation and project execution",
    active: "86",
    pending: "14",
    icon: "sunny-outline",
    accent: COLORS.blue,
    soft: COLORS.blueSoft,
    route: "/admin/solar-services",
  },
  {
    title: "Panel Cleaning",
    subtitle: "Cleaning visits and output recovery",
    active: "64",
    pending: "09",
    icon: "water-outline",
    accent: COLORS.cyan,
    soft: COLORS.cyanSoft,
    route: "/admin/cleaning",
  },
  {
    title: "Electrical AMC",
    subtitle: "Preventive checks and repairs",
    active: "96",
    pending: "11",
    icon: "flash-outline",
    accent: COLORS.amber,
    soft: COLORS.amberSoft,
    route: "/admin/electrical-amc",
  },
];

const priorityQueue = [
  {
    title: "Payment confirmation required",
    subtitle: "7 invoices are waiting for admin verification",
    time: "Today",
    icon: "card-outline",
    accent: COLORS.amber,
    soft: COLORS.amberSoft,
    route: "/admin/payments",
  },
  {
    title: "High complaint escalation",
    subtitle: "4 customer complaints need same-day action",
    time: "Urgent",
    icon: "warning-outline",
    accent: COLORS.danger,
    soft: COLORS.dangerSoft,
    route: "/admin/complaints",
  },
  {
    title: "Technician schedule review",
    subtitle: "12 field visits are queued for assignment",
    time: "Next",
    icon: "calendar-outline",
    accent: COLORS.blue,
    soft: COLORS.blueSoft,
    route: "/admin/schedule",
  },
];

const recentActivity = [
  {
    title: "Solar AMC request approved",
    subtitle: "Consumer GX-2041 moved to active support",
    icon: "checkmark-circle-outline",
    accent: COLORS.success,
  },
  {
    title: "Technician assigned",
    subtitle: "Panel cleaning visit assigned to field team",
    icon: "people-outline",
    accent: COLORS.blue,
  },
  {
    title: "Complaint response sent",
    subtitle: "Electrical AMC case updated by support desk",
    icon: "mail-open-outline",
    accent: COLORS.cyan,
  },
];

function TextureLines({ tone = "light" }) {
  const color =
    tone === "dark" ? "rgba(255,255,255,0.15)" : "rgba(226,232,240,0.72)";

  return (
    <View pointerEvents="none" style={styles.textureLayer}>
      <View style={[styles.textureLineOne, { backgroundColor: color }]} />
      <View style={[styles.textureLineTwo, { backgroundColor: color }]} />
      <View style={[styles.textureLineThree, { backgroundColor: color }]} />
    </View>
  );
}

function SectionHeader({ eyebrow, title, actionLabel, onActionPress }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionTextWrap}>
        <Text style={styles.sectionEyebrow}>{eyebrow}</Text>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>

      {actionLabel ? (
        <Pressable style={styles.sectionAction} onPress={onActionPress}>
          <Text style={styles.sectionActionText}>{actionLabel}</Text>
          <Ionicons name="chevron-forward" size={14} color={COLORS.brand} />
        </Pressable>
      ) : null}
    </View>
  );
}

function MetricCard({ item, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.metricCard,
        pressed && styles.pressedState,
      ]}
    >
      <TextureLines />
      <View style={styles.metricTopRow}>
        <View style={[styles.metricIconWrap, { backgroundColor: item.soft }]}>
          <Ionicons name={item.icon} size={18} color={item.accent} />
        </View>
        <Ionicons name="arrow-forward" size={15} color={item.accent} />
      </View>

      {/* <Text style={[styles.metricValue, { color: item.accent }]}>
        {item.value}
      </Text> */}
      <Text style={styles.metricLabel}>{item.label}</Text>
      {/* <Text style={styles.metricTrend}>{item.trend}</Text> */}
    </Pressable>
  );
}

function QuickActionCard({ item, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.quickActionCard,
        pressed && styles.pressedState,
      ]}
    >
      <TextureLines />
      <View style={[styles.quickIconWrap, { backgroundColor: item.soft }]}>
        <Ionicons name={item.icon} size={19} color={item.accent} />
      </View>
      <View style={styles.quickActionContent}>
        <Text style={styles.quickActionTitle}>{item.title}</Text>
        <Text style={styles.quickActionSubtitle}>{item.subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={COLORS.faint} />
    </Pressable>
  );
}

function PipelineCard({ item, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.pipelineCard,
        pressed && styles.pressedState,
      ]}
    >
      <View style={[styles.pipelineAccent, { backgroundColor: item.accent }]} />
      <TextureLines />

      <View style={styles.pipelineTopRow}>
        <View style={[styles.pipelineIconWrap, { backgroundColor: item.soft }]}>
          <Ionicons name={item.icon} size={20} color={item.accent} />
        </View>
        <View style={styles.pipelineStatusPill}>
          <Text style={styles.pipelineStatusText}>Live</Text>
        </View>
      </View>

      <Text style={styles.pipelineTitle}>{item.title}</Text>
      <Text style={styles.pipelineSubtitle}>{item.subtitle}</Text>

      <View style={styles.pipelineStats}>
        <View>
          <Text style={styles.pipelineStatValue}>{item.active}</Text>
          <Text style={styles.pipelineStatLabel}>Active</Text>
        </View>
        <View style={styles.pipelineDivider} />
        <View>
          <Text style={styles.pipelineStatValue}>{item.pending}</Text>
          <Text style={styles.pipelineStatLabel}>Pending</Text>
        </View>
      </View>
    </Pressable>
  );
}

function QueueItem({ item, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.queueItem,
        pressed && styles.pressedState,
      ]}
    >
      <View style={[styles.queueIconWrap, { backgroundColor: item.soft }]}>
        <Ionicons name={item.icon} size={18} color={item.accent} />
      </View>
      <View style={styles.queueTextWrap}>
        <Text style={styles.queueTitle}>{item.title}</Text>
        <Text style={styles.queueSubtitle}>{item.subtitle}</Text>
      </View>
      <View style={[styles.queueTimePill, { backgroundColor: item.soft }]}>
        <Text style={[styles.queueTimeText, { color: item.accent }]}>
          {item.time}
        </Text>
      </View>
    </Pressable>
  );
}

function ActivityItem({ item, isLast }) {
  return (
    <View style={[styles.activityItem, isLast && styles.activityItemLast]}>
      <View style={[styles.activityIconWrap, { backgroundColor: `${item.accent}14` }]}>
        <Ionicons name={item.icon} size={16} color={item.accent} />
      </View>
      <View style={styles.activityTextWrap}>
        <Text style={styles.activityTitle}>{item.title}</Text>
        <Text style={styles.activitySubtitle}>{item.subtitle}</Text>
      </View>
    </View>
  );
}

function AdminHomeUI() {
  const router = useRouter();
  const { session } = useAuth();
  const revealAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.timing(revealAnim, {
      toValue: 1,
      duration: 560,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [revealAnim]);

  const adminName = 'Mr. Shahezad'
    // session?.username?.trim() || session?.email?.split("@")?.[0] || "Admin";

  const revealStyle = {
    opacity: revealAnim,
    transform: [
      {
        translateY: revealAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [18, 0],
        }),
      },
    ],
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.brandDark} />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={[styles.headerWrap, revealStyle]}>
          <View style={styles.headerTopRow}>
            <View>
              <Text style={styles.headerEyebrow}>Admin Console</Text>
              <Text style={styles.headerTitle}>Hello, {adminName}</Text>
            </View>

            <Pressable
              style={styles.headerIconButton}
              onPress={() => router.push("/notification")}
            >
              <Ionicons
                name="notifications-outline"
                size={20}
                color={COLORS.text}
              />
              <View style={styles.notificationDot} />
            </Pressable>
          </View>

          <LinearGradient
            colors={["#102A43", "#1E5464", "#657EEA"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroCard}
          >
            <TextureLines tone="dark" />

            <View style={styles.heroTopRow}>
              <View style={styles.heroBadge}>
                <Ionicons name="speedometer-outline" size={14} color="#FFFFFF" />
                <Text style={styles.heroBadgeText}>Live Operations</Text>
              </View>
              <View style={styles.heroIconWrap}>
                <Ionicons name="analytics-outline" size={22} color="#FFFFFF" />
              </View>
            </View>

            <Text style={styles.heroTitle}>Manage service operations from one place.</Text>
            <Text style={styles.heroSubtitle}>
              Requests, payments, complaints, technicians, and service queues are
              organized for fast admin review.
            </Text>

            <View style={styles.heroFooter}>
              <Pressable
                style={styles.heroPrimaryButton}
                onPress={() => router.push("/admin/requests")}
              >
                <Text style={styles.heroPrimaryButtonText}>Review Requests</Text>
                <Ionicons name="arrow-forward" size={15} color={COLORS.brandDark} />
              </Pressable>

              <Pressable
                style={styles.heroSecondaryButton}
                onPress={() => router.push("/admin")}
              >
                <Ionicons name="checkbox-outline" size={15} color="#FFFFFF" />
                <Text style={styles.heroSecondaryButtonText}>Tasks</Text>
              </Pressable>
            </View>
          </LinearGradient>
        </Animated.View>

        <SectionHeader
          eyebrow="Overview"
          title="Today at a glance"
          actionLabel="Reports"
          onActionPress={() => router.push("/admin/reports")}
        />

        <View style={styles.metricsGrid}>
          {adminMetrics.map((item) => (
            <MetricCard
              key={item.label}
              item={item}
              onPress={() => router.push(item.route)}
            />
          ))}
        </View>

        {/* <SectionHeader
          eyebrow="Quick actions"
          title="Admin shortcuts"
          actionLabel="All"
          onActionPress={() => router.push("/admin")}
        />

        <View style={styles.quickActionsGrid}>
          {quickActions.map((item) => (
            <QuickActionCard
              key={item.title}
              item={item}
              onPress={() => router.push(item.route)}
            />
          ))}
        </View> */}

        <SectionHeader
          eyebrow="Service pipelines"
          title="Monitor active work"
          actionLabel="View"
          onActionPress={() => router.push("/admin/services")}
        />

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.pipelineList}
        >
          {servicePipelines.map((item) => (
            <PipelineCard
              key={item.title}
              item={item}
              onPress={() => router.push(item.route)}
            />
          ))}
        </ScrollView>

        <SectionHeader
          eyebrow="Priority queue"
          title="Needs admin attention"
          actionLabel="Open"
          onActionPress={() => router.push("/admin/queue")}
        />

        <View style={styles.queueList}>
          {priorityQueue.map((item) => (
            <QueueItem
              key={item.title}
              item={item}
              onPress={() => router.push(item.route)}
            />
          ))}
        </View>

        <SectionHeader
          eyebrow="Activity"
          title="Recent admin updates"
          actionLabel="Log"
          onActionPress={() => router.push("/admin/activity")}
        />

        <View style={styles.activityCard}>
          {recentActivity.map((item, index) => (
            <ActivityItem
              key={item.title}
              item={item}
              isLast={index === recentActivity.length - 1}
            />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

export default AdminHomeUI;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.page,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.page,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingBottom: 30,
  },
  headerWrap: {
    marginTop: 10,
    marginBottom: 18,
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  headerEyebrow: {
    color: COLORS.brand,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.9,
    textTransform: "uppercase",
  },
  headerTitle: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: "900",
    marginTop: 3,
  },
  headerIconButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: COLORS.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 7 },
    elevation: 3,
  },
  notificationDot: {
    position: "absolute",
    width: 8,
    height: 8,
    borderRadius: 4,
    top: 10,
    right: 10,
    backgroundColor: COLORS.danger,
  },
  heroCard: {
    borderRadius: 18,
    padding: 18,
    overflow: "hidden",
    shadowColor: "#334155",
    shadowOpacity: 0.22,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
  textureLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  textureLineOne: {
    position: "absolute",
    width: 220,
    height: 1,
    right: -44,
    top: 42,
    transform: [{ rotate: "-23deg" }],
  },
  textureLineTwo: {
    position: "absolute",
    width: 170,
    height: 1,
    right: -24,
    top: 72,
    transform: [{ rotate: "-23deg" }],
  },
  textureLineThree: {
    position: "absolute",
    width: 120,
    height: 1,
    right: -8,
    bottom: 34,
    transform: [{ rotate: "-23deg" }],
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  heroBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 7,
    backgroundColor: "rgba(255,255,255,0.14)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
  },
  heroBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "900",
  },
  heroIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.14)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
  },
  heroTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    lineHeight: 27,
    fontWeight: "900",
    marginTop: 20,
    maxWidth: "94%",
  },
  heroSubtitle: {
    color: "rgba(255,255,255,0.78)",
    fontSize: 11,
    lineHeight: 17,
    fontWeight: "600",
    marginTop: 8,
    maxWidth: "96%",
  },
  heroFooter: {
    flexDirection: "row",
    gap: 10,
    marginTop: 20,
  },
  heroPrimaryButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  heroPrimaryButtonText: {
    color: COLORS.brandDark,
    fontSize: 12,
    fontWeight: "900",
  },
  heroSecondaryButton: {
    minWidth: 92,
    minHeight: 46,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingHorizontal: 12,
  },
  heroSecondaryButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "900",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginTop: 4,
    marginBottom: 11,
    gap: 12,
  },
  sectionTextWrap: {
    flex: 1,
  },
  sectionEyebrow: {
    color: COLORS.brand,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 3,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: "900",
  },
  sectionAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    paddingLeft: 8,
    paddingVertical: 4,
  },
  sectionActionText: {
    color: COLORS.brand,
    fontSize: 11,
    fontWeight: "900",
  },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 18,
  },
  metricCard: {
    width: "48.4%",
    minHeight: 100,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 13,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.09,
    shadowRadius: 13,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  metricTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 13,
  },
  metricIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  metricValue: {
    fontSize: 21,
    fontWeight: "900",
  },
  metricLabel: {
    color: COLORS.text,
    fontSize: 11,
    fontWeight: "900",
    marginTop: 3,
  },
  metricTrend: {
    color: COLORS.muted,
    fontSize: 10,
    lineHeight: 15,
    fontWeight: "700",
    marginTop: 2,
  },
  quickActionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 18,
  },
  quickActionCard: {
    width: "48.5%",
    minHeight: 104,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.07,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 7 },
    elevation: 3,
  },
  quickIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  quickActionContent: {
    flex: 1,
  },
  quickActionTitle: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: "900",
  },
  quickActionSubtitle: {
    color: COLORS.muted,
    fontSize: 10,
    lineHeight: 15,
    fontWeight: "700",
    marginTop: 3,
    paddingRight: 10,
  },
  pipelineList: {
    gap: 10,
    paddingBottom: 18,
  },
  pipelineCard: {
    width: 214,
    minHeight: 170,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.08,
    shadowRadius: 13,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  pipelineAccent: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 4,
  },
  pipelineTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  pipelineIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  pipelineStatusPill: {
    borderRadius: 999,
    backgroundColor: COLORS.successSoft,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  pipelineStatusText: {
    color: COLORS.success,
    fontSize: 9,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  pipelineTitle: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "900",
  },
  pipelineSubtitle: {
    color: COLORS.muted,
    fontSize: 10,
    lineHeight: 15,
    fontWeight: "700",
    marginTop: 4,
  },
  pipelineStats: {
    flexDirection: "row",
    alignItems: "center",
    gap: 15,
    marginTop: 15,
  },
  pipelineStatValue: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "900",
  },
  pipelineStatLabel: {
    color: COLORS.muted,
    fontSize: 9.5,
    fontWeight: "800",
    marginTop: 2,
  },
  pipelineDivider: {
    width: 1,
    height: 28,
    backgroundColor: COLORS.border,
  },
  queueList: {
    gap: 10,
    marginBottom: 18,
  },
  queueItem: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.07,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 7 },
    elevation: 3,
  },
  queueIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },
  queueTextWrap: {
    flex: 1,
    paddingRight: 8,
  },
  queueTitle: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: "900",
  },
  queueSubtitle: {
    color: COLORS.muted,
    fontSize: 10,
    lineHeight: 15,
    fontWeight: "700",
    marginTop: 3,
  },
  queueTimePill: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  queueTimeText: {
    fontSize: 9,
    fontWeight: "900",
  },
  activityCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.07,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 7 },
    elevation: 3,
  },
  activityItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: "#EDF2F7",
  },
  activityItemLast: {
    borderBottomWidth: 0,
  },
  activityIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  activityTextWrap: {
    flex: 1,
  },
  activityTitle: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: "900",
  },
  activitySubtitle: {
    color: COLORS.muted,
    fontSize: 10,
    lineHeight: 15,
    fontWeight: "700",
    marginTop: 3,
  },
  pressedState: {
    opacity: 0.9,
    transform: [{ scale: 0.985 }],
  },
});
