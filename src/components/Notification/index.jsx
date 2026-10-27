import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import {
    ActivityIndicator,
    Image,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getApiUrl, safeFetch } from "../../constants/api";
import { Alert } from "../StyledAlert";

const C = {
  page: "#EFF4FB",
  surface: "#FFF",
  alt: "#F8FAFC",
  text: "#0F172A",
  muted: "#64748B",
  faint: "#94A3B8",
  border: "#D8E3F0",
  brand: "#1E5464",
  dark: "#102A43",
  lime: "#D9FF76",
  blue: "#657EEA",
  blueSoft: "#EEF2FF",
  green: "#10B981",
  greenSoft: "#ECFDF5",
  amber: "#F59E0B",
  amberSoft: "#FFFBEB",
  red: "#EF4444",
  redSoft: "#FEF2F2",
  purple: "#8B5CF6",
  purpleSoft: "#F5F3FF",
  cyan: "#06B6D4",
  cyanSoft: "#ECFEFF",
};
const NOTIFICATIONS_API_PATH = "/api/notifications/admin";
const SERVICE_COLORS = {
  cleaning: {
    icon: "water-outline",
    color: C.cyan,
    soft: C.cyanSoft,
    card: "#F2FCFE",
    border: "#A5F3FC",
    label: "Cleaning",
  },
  cleaningAmc: {
    icon: "leaf-outline",
    color: C.green,
    soft: C.greenSoft,
    card: "#F0FDF4",
    border: "#BBF7D0",
    label: "Cleaning AMC",
  },
  solar: {
    icon: "sunny-outline",
    color: C.amber,
    soft: C.amberSoft,
    card: "#FFFCF2",
    border: "#FDE68A",
    label: "Solar",
  },
  solarAmc: {
    icon: "sunny-outline",
    color: C.blue,
    soft: C.blueSoft,
    card: "#F5F7FF",
    border: "#C7D2FE",
    label: "Solar AMC",
  },
  electrical: {
    icon: "flash-outline",
    color: C.purple,
    soft: C.purpleSoft,
    card: "#FAF8FF",
    border: "#DDD6FE",
    label: "Electrical",
  },
};

function relativeTime(value) {
  const seconds = Math.max(0, (Date.now() - new Date(value).getTime()) / 1000);
  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
  });
}
function getServiceMeta(notification) {
  const data = notification?.data || {};
  const service = `${data.requestType || ""} ${data.serviceName || ""}`
    .toLowerCase()
    .replace(/[_-]+/g, " ");

  if (service.includes("solar amc")) return SERVICE_COLORS.solarAmc;
  if (service.includes("cleaning") && service.includes("amc")) {
    return SERVICE_COLORS.cleaningAmc;
  }
  if (service.includes("cleaning")) return SERVICE_COLORS.cleaning;
  if (service.includes("electrical")) return SERVICE_COLORS.electrical;
  if (service.includes("solar")) return SERVICE_COLORS.solar;

  return null;
}

function typeMeta(notification) {
  const action = notification?.data?.action || "";
  const serviceMeta = getServiceMeta(notification);

  if (serviceMeta) {
    return {
      ...serviceMeta,
      icon:
        action === "view-visit"
          ? "images-outline"
          : action === "view-request"
            ? "document-text-outline"
            : serviceMeta.icon,
      label:
        action === "view-visit"
          ? "Visit response"
          : action === "view-request"
            ? "Service request"
            : serviceMeta.label,
    };
  }

  if (action === "view-visit")
    return {
      icon: "images-outline",
      color: C.green,
      soft: C.greenSoft,
      card: "#F0FDF4",
      border: "#BBF7D0",
      label: "Visit response",
    };
  if (action === "view-request")
    return {
      icon: "document-text-outline",
      color: C.blue,
      soft: C.blueSoft,
      card: "#F5F7FF",
      border: "#C7D2FE",
      label: "Service request",
    };
  if (notification?.type === "payment")
    return {
      icon: "card-outline",
      color: C.amber,
      soft: C.amberSoft,
      card: "#FFFCF2",
      border: "#FDE68A",
      label: "Payment",
    };
  if (notification?.type === "approval")
    return {
      icon: "checkmark-circle-outline",
      color: C.purple,
      soft: C.purpleSoft,
      card: "#FAF8FF",
      border: "#DDD6FE",
      label: "Approval",
    };
  if (notification?.type === "complaint")
    return {
      icon: "alert-circle-outline",
      color: C.red,
      soft: C.redSoft,
      card: "#FFF7F7",
      border: "#FECACA",
      label: "Complaint",
    };
  if (notification?.type === "order")
    return {
      icon: "cube-outline",
      color: C.cyan,
      soft: C.cyanSoft,
      card: "#F2FCFE",
      border: "#A5F3FC",
      label: "Order",
    };
  if (notification?.type === "service")
    return {
      icon: "construct-outline",
      color: C.blue,
      soft: C.blueSoft,
      card: "#F5F7FF",
      border: "#C7D2FE",
      label: "Service",
    };
  if (notification?.type === "system")
    return {
      icon: "settings-outline",
      color: C.muted,
      soft: C.alt,
      card: "#F8FAFC",
      border: "#CBD5E1",
      label: "System",
    };
  return {
    icon: "notifications-outline",
    color: C.brand,
    soft: C.blueSoft,
    card: "#F3F8FA",
    border: "#B6D2DA",
    label: "Update",
  };
}
function NotificationCard({ item, onOpen, onToggle, busy }) {
  const meta = typeMeta(item);
  const data = item.data || {};

  return (
    <Pressable
      style={[
        s.card,
        { backgroundColor: meta.card, borderColor: meta.border },
        !item.isRead && s.cardUnread,
      ]}
      onPress={() => onOpen(item)}
      disabled={busy}
      accessibilityRole="button"
      accessibilityLabel={`${meta.label}: ${item.title}. ${item.message}`}
    >
      <View style={[s.typeRail, { backgroundColor: meta.color }]} />
      <View style={s.cardRow}>
        <View style={[s.iconWrap, { backgroundColor: meta.soft }]}>
          <Ionicons name={meta.icon} size={17} color={meta.color} />
        </View>
        <View style={s.cardContent}>
          <View style={s.titleRow}>
            <Text style={s.cardTitle} numberOfLines={1}>
              {item.title}
            </Text>
            {!item.isRead ? (
              <View style={[s.unreadDot, { backgroundColor: meta.color }]} />
            ) : null}
          </View>
          <View style={s.summaryRow}>
            <Text style={s.message} numberOfLines={1} ellipsizeMode="tail">
              {item.message}
            </Text>
            {data.beforePhotoUrl ? (
              <Image
                source={{ uri: data.beforePhotoUrl }}
                style={s.previewImage}
                accessibilityLabel="Before photo attached"
              />
            ) : null}
            {data.afterPhotoUrl ? (
              <Image
                source={{ uri: data.afterPhotoUrl }}
                style={s.previewImage}
                accessibilityLabel="After photo attached"
              />
            ) : null}
            <Text style={s.time}>{relativeTime(item.createdAt)}</Text>
          </View>
        </View>
        <Pressable
          style={s.readToggle}
          hitSlop={9}
          accessibilityRole="button"
          accessibilityLabel={
            item.isRead ? "Mark notification as unread" : "Mark notification as read"
          }
          onPress={(event) => {
            event.stopPropagation();
            onToggle(item);
          }}
          disabled={busy}
        >
          <Ionicons
            name={
              item.isRead ? "mail-unread-outline" : "checkmark-done-outline"
            }
            size={18}
            color={C.muted}
          />
        </Pressable>
      </View>
    </Pressable>
  );
}

export default function AdminNotificationsScreen({
  onOpenRequest,
  onOpenVisit,
}) {
  const [notifications, setNotifications] = React.useState([]),
    [unread, setUnread] = React.useState(0),
    [loading, setLoading] = React.useState(true),
    [refreshing, setRefreshing] = React.useState(false),
    [error, setError] = React.useState(""),
    [filter, setFilter] = React.useState("all"),
    [busyId, setBusyId] = React.useState("");
  const fetchNotifications = React.useCallback(
    async ({ refresh = false } = {}) => {
      refresh ? setRefreshing(true) : setLoading(true);
      setError("");
      try {
        const response = await safeFetch(getApiUrl(NOTIFICATIONS_API_PATH));
        const payload = await response.json().catch(() => null);
        if (!response.ok || !payload?.success)
          throw new Error(payload?.message || "Unable to load notifications.");
        setNotifications(
          Array.isArray(payload.notifications) ? payload.notifications : [],
        );
        setUnread(Number(payload.unreadCount) || 0);
      } catch (requestError) {
        setError(requestError?.message || "Unable to load notifications.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [],
  );
  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchNotifications();
  }, [fetchNotifications]);
  const filtered =
    filter === "unread"
      ? notifications.filter((n) => !n.isRead)
      : notifications;
  const patchRead = async (item, isRead) => {
    setBusyId(item._id);
    try {
      const response = await safeFetch(getApiUrl(NOTIFICATIONS_API_PATH), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId: item._id, isRead }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.success)
        throw new Error(payload?.message || "Unable to update notification.");
      setNotifications((current) =>
        current.map((n) => (n._id === item._id ? { ...n, isRead } : n)),
      );
      setUnread((current) => Math.max(0, current + (isRead ? -1 : 1)));
    } catch (requestError) {
      Alert.alert(
        "Update failed",
        requestError?.message || "Please try again.",
      );
    } finally {
      setBusyId("");
    }
  };
  const markAllRead = async () => {
    if (!unread) return;
    setBusyId("all");
    try {
      const response = await safeFetch(getApiUrl(NOTIFICATIONS_API_PATH), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAll: true }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.success)
        throw new Error(
          payload?.message || "Unable to mark notifications as read.",
        );
      setNotifications((current) =>
        current.map((n) => ({ ...n, isRead: true })),
      );
      setUnread(0);
    } catch (requestError) {
      Alert.alert(
        "Update failed",
        requestError?.message || "Please try again.",
      );
    } finally {
      setBusyId("");
    }
  };
  const openNotification = async (item) => {
    if (!item.isRead) await patchRead(item, true);
    const action = item?.data?.action;
    if (action === "view-request" && onOpenRequest)
      return onOpenRequest(item.data, item);
    if (action === "view-visit" && onOpenVisit)
      return onOpenVisit(item.data, item);
    if (action) Alert.alert(item.title, item.message);
  };
  return (
    <SafeAreaView style={s.safe}>
      <ScrollView
        style={s.page}
        contentContainerStyle={s.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchNotifications({ refresh: true })}
            colors={[C.brand]}
          />
        }
      >
        <LinearGradient colors={[C.dark, C.brand, C.blue]} style={s.hero}>
          <View style={s.heroGlow} />
          <View style={s.row}>
            <View style={s.flex}>
              <Text style={s.heroEyebrow}>ADMIN INBOX</Text>
              <Text style={s.heroTitle}>Notifications</Text>
              <Text style={s.heroCopy}>
                {unread
                  ? `${unread} unread update${unread === 1 ? "" : "s"} need your attention.`
                  : "You’re all caught up."}
              </Text>
            </View>
            <View style={s.bell}>
              <Ionicons name="notifications-outline" size={24} color={C.lime} />
              {unread ? (
                <View style={s.bellCount}>
                  <Text style={s.bellCountText}>
                    {unread > 99 ? "99+" : unread}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
          <Pressable
            style={[s.markAll, busyId === "all" && s.disabled]}
            onPress={markAllRead}
            disabled={!unread || busyId === "all"}
          >
            {busyId === "all" ? (
              <ActivityIndicator size="small" color={C.dark} />
            ) : (
              <>
                <Ionicons
                  name="checkmark-done-outline"
                  size={16}
                  color={C.dark}
                />
                <Text style={s.markAllText}>Mark all as read</Text>
              </>
            )}
          </Pressable>
        </LinearGradient>
        <View style={s.filters}>
          <Pressable
            style={[s.filter, filter === "all" && s.filterOn]}
            onPress={() => setFilter("all")}
          >
            <Text style={[s.filterText, filter === "all" && s.filterTextOn]}>
              All ({notifications.length})
            </Text>
          </Pressable>
          <Pressable
            style={[s.filter, filter === "unread" && s.filterOn]}
            onPress={() => setFilter("unread")}
          >
            <Text style={[s.filterText, filter === "unread" && s.filterTextOn]}>
              Unread ({unread})
            </Text>
          </Pressable>
        </View>
        {loading ? (
          <InboxState
            title="Loading notifications"
            text="Fetching your latest activity."
            loading
          />
        ) : error ? (
          <InboxState
            title="Could not load notifications"
            text={error}
            retry={fetchNotifications}
          />
        ) : filtered.length ? (
          filtered.map((item) => (
            <NotificationCard
              key={item._id}
              item={item}
              onOpen={openNotification}
              onToggle={(n) => patchRead(n, !n.isRead)}
              busy={busyId === item._id}
            />
          ))
        ) : (
          <InboxState
            title={
              filter === "unread"
                ? "No unread notifications"
                : "No notifications yet"
            }
            text={
              filter === "unread"
                ? "New updates will appear here."
                : "Your admin notifications will appear here."
            }
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
function InboxState({ title, text, loading, retry }) {
  return (
    <View style={s.state}>
      {loading ? (
        <ActivityIndicator color={C.brand} />
      ) : (
        <Ionicons name="notifications-off-outline" size={28} color={C.brand} />
      )}
      <Text style={s.stateTitle}>{title}</Text>
      <Text style={s.stateText}>{text}</Text>
      {retry ? (
        <Pressable style={s.retry} onPress={() => retry()}>
          <Text style={s.retryText}>Try again</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.page },
  page: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
  hero: { borderRadius: 21, padding: 18, overflow: "hidden" },
  heroGlow: {
    position: "absolute",
    height: 220,
    width: 220,
    borderRadius: 110,
    right: -75,
    top: -95,
    backgroundColor: "rgba(217,255,118,.18)",
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },
  flex: { flex: 1 },
  heroEyebrow: {
    color: "rgba(235,255,219,.74)",
    fontSize: 8.5,
    fontWeight: "900",
    letterSpacing: 1.4,
  },
  heroTitle: { color: "#fff", fontSize: 22, fontWeight: "900", marginTop: 4 },
  heroCopy: {
    color: "rgba(240,255,230,.78)",
    fontSize: 10,
    fontWeight: "600",
    marginTop: 4,
  },
  bell: {
    height: 47,
    width: 47,
    borderRadius: 15,
    backgroundColor: "rgba(7,51,43,.28)",
    borderWidth: 1,
    borderColor: "rgba(217,255,118,.32)",
    alignItems: "center",
    justifyContent: "center",
  },
  bellCount: {
    position: "absolute",
    right: -5,
    top: -6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: C.lime,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  bellCountText: { color: C.dark, fontSize: 8.5, fontWeight: "900" },
  markAll: {
    alignSelf: "flex-start",
    height: 39,
    borderRadius: 12,
    backgroundColor: C.lime,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 12,
    marginTop: 17,
  },
  markAllText: { color: C.dark, fontSize: 10, fontWeight: "900" },
  filters: { flexDirection: "row", gap: 8, marginVertical: 15 },
  filter: {
    borderRadius: 99,
    paddingHorizontal: 13,
    paddingVertical: 8,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
  },
  filterOn: { backgroundColor: C.brand, borderColor: C.brand },
  filterText: { color: C.muted, fontSize: 9.5, fontWeight: "900" },
  filterTextOn: { color: "#fff" },
  card: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 14,
    paddingVertical: 9,
    paddingHorizontal: 11,
    marginBottom: 8,
    overflow: "hidden",
  },
  cardUnread: { borderWidth: 1.5 },
  typeRail: {
    position: "absolute",
    width: 3,
    left: 0,
    top: 9,
    bottom: 9,
    borderTopRightRadius: 5,
    borderBottomRightRadius: 5,
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  cardContent: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    minWidth: 0,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  iconWrap: {
    height: 33,
    width: 33,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: {
    color: C.text,
    fontSize: 10.5,
    fontWeight: "900",
    flexShrink: 1,
  },
  unreadDot: {
    height: 7,
    width: 7,
    borderRadius: 4,
    backgroundColor: C.brand,
    marginLeft: 6,
  },
  time: {
    color: C.muted,
    fontSize: 8,
    fontWeight: "800",
    flexShrink: 0,
  },
  readToggle: {
    height: 27,
    width: 27,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.alt,
  },
  message: {
    color: C.text,
    fontSize: 9,
    lineHeight: 12,
    fontWeight: "600",
    flex: 1,
    minWidth: 0,
  },
  previewImage: {
    height: 18,
    width: 18,
    borderRadius: 5,
    backgroundColor: C.alt,
  },
  state: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 17,
    padding: 30,
    alignItems: "center",
  },
  stateTitle: { color: C.text, fontSize: 12, fontWeight: "900", marginTop: 10 },
  stateText: {
    color: C.muted,
    fontSize: 10,
    fontWeight: "600",
    textAlign: "center",
    lineHeight: 14,
    marginTop: 5,
  },
  retry: {
    backgroundColor: C.brand,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 9,
    marginTop: 13,
  },
  retryText: { color: "#fff", fontSize: 10, fontWeight: "900" },
  disabled: { opacity: 0.6 },
  lime: "#D9FF76",
});
