import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import {
  ActivityIndicator,
  Alert,
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
};
const NOTIFICATIONS_API_PATH = "/api/notifications/admin";

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
function typeMeta(notification) {
  const action = notification?.data?.action || "";
  if (action === "view-visit")
    return {
      icon: "images-outline",
      color: C.green,
      soft: C.greenSoft,
      label: "Visit response",
    };
  if (action === "view-request")
    return {
      icon: "document-text-outline",
      color: C.blue,
      soft: C.blueSoft,
      label: "Service request",
    };
  if (notification?.type === "payment")
    return {
      icon: "card-outline",
      color: C.amber,
      soft: C.amberSoft,
      label: "Payment",
    };
  if (notification?.type === "approval")
    return {
      icon: "checkmark-circle-outline",
      color: C.green,
      soft: C.greenSoft,
      label: "Approval",
    };
  if (notification?.type === "system")
    return {
      icon: "settings-outline",
      color: C.muted,
      soft: C.alt,
      label: "System",
    };
  return {
    icon: "notifications-outline",
    color: C.brand,
    soft: C.blueSoft,
    label: "Update",
  };
}
function responseTags(notification) {
  const data = notification?.data || {};
  return [
    { label: data?.serviceName, icon: "construct-outline" },
    { label: data?.technicianName, icon: "person-outline" },
    { label: data?.status, icon: "ellipse", status: true },
    {
      label: data?.issueNote ? "Issue reported" : "",
      icon: "alert-circle-outline",
      danger: true,
    },
  ].filter((x) => x.label);
}
function NotificationCard({ item, onOpen, onToggle, busy }) {
  const meta = typeMeta(item),
    data = item.data || {},
    tags = responseTags(item);
  return (
    <Pressable
      style={[s.card, !item.isRead && s.cardUnread]}
      onPress={() => onOpen(item)}
      disabled={busy}
    >
      <View style={[s.typeRail, { backgroundColor: meta.color }]} />
      <View style={s.row}>
        <View style={[s.iconWrap, { backgroundColor: meta.soft }]}>
          <Ionicons name={meta.icon} size={20} color={meta.color} />
        </View>
        <View style={s.flex}>
          <View style={s.row}>
            <Text style={s.cardTitle} numberOfLines={1}>
              {item.title}
            </Text>
            {!item.isRead ? <View style={s.unreadDot} /> : null}
          </View>
          <Text style={s.time}>
            {relativeTime(item.createdAt)} · {meta.label}
          </Text>
        </View>
        <Pressable
          style={s.readToggle}
          hitSlop={9}
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
      <Text style={s.message}>{item.message}</Text>
      {tags.length ? (
        <View style={s.tags}>
          {tags.map((tag, index) => (
            <View
              key={`${tag.label}-${index}`}
              style={[s.tag, tag.danger && s.tagDanger]}
            >
              <Ionicons
                name={tag.icon}
                size={12}
                color={tag.danger ? C.red : C.brand}
              />
              <Text style={[s.tagText, tag.danger && s.tagDangerText]}>
                {tag.label}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
      {data.beforePhotoUrl || data.afterPhotoUrl ? (
        <View style={s.photoPreview}>
          {data.beforePhotoUrl ? (
            <Image
              source={{ uri: data.beforePhotoUrl }}
              style={s.previewImage}
            />
          ) : null}
          {data.afterPhotoUrl ? (
            <Image
              source={{ uri: data.afterPhotoUrl }}
              style={s.previewImage}
            />
          ) : null}
          <Text style={s.previewText}>Photos attached</Text>
        </View>
      ) : null}
      <View style={s.cardFooter}>
        <Text style={[s.readState, !item.isRead && s.readStateUnread]}>
          {item.isRead ? "Read" : "New"}
        </Text>
        <View style={s.openAction}>
          <Text style={s.openText}>
            {data.action === "view-visit"
              ? "Review response"
              : data.action === "view-request"
                ? "View request"
                : "Open notification"}
          </Text>
          <Ionicons name="arrow-forward" size={15} color={C.brand} />
        </View>
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
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.4,
  },
  heroTitle: { color: "#fff", fontSize: 26, fontWeight: "900", marginTop: 4 },
  heroCopy: {
    color: "rgba(240,255,230,.78)",
    fontSize: 11,
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
  bellCountText: { color: C.dark, fontSize: 9, fontWeight: "900" },
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
  markAllText: { color: C.dark, fontSize: 11, fontWeight: "900" },
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
  filterText: { color: C.muted, fontSize: 10.5, fontWeight: "900" },
  filterTextOn: { color: "#fff" },
  card: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 17,
    padding: 14,
    marginBottom: 11,
    overflow: "hidden",
  },
  cardUnread: { borderColor: "#B8D9CC", backgroundColor: "#FCFFFD" },
  typeRail: {
    position: "absolute",
    width: 4,
    left: 0,
    top: 14,
    bottom: 14,
    borderTopRightRadius: 5,
    borderBottomRightRadius: 5,
  },
  iconWrap: {
    height: 40,
    width: 40,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: {
    color: C.text,
    fontSize: 13.5,
    fontWeight: "900",
    flexShrink: 1,
  },
  unreadDot: {
    height: 7,
    width: 7,
    borderRadius: 4,
    backgroundColor: C.brand,
    marginLeft: 6,
    marginTop: 5,
  },
  time: { color: C.muted, fontSize: 9.5, fontWeight: "800", marginTop: 3 },
  readToggle: {
    height: 31,
    width: 31,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.alt,
  },
  message: {
    color: C.text,
    fontSize: 11,
    lineHeight: 16,
    fontWeight: "600",
    marginTop: 12,
  },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 10 },
  tag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: C.greenSoft,
    borderRadius: 99,
    paddingHorizontal: 7,
    paddingVertical: 4,
  },
  tagDanger: { backgroundColor: C.redSoft },
  tagText: { color: C.brand, fontSize: 9, fontWeight: "800" },
  tagDangerText: { color: C.red },
  photoPreview: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 11,
  },
  previewImage: {
    height: 36,
    width: 36,
    borderRadius: 8,
    backgroundColor: C.alt,
  },
  previewText: {
    color: C.muted,
    fontSize: 9.5,
    fontWeight: "800",
    marginLeft: 2,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 13,
  },
  readState: {
    color: C.muted,
    fontSize: 9,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  readStateUnread: { color: C.brand },
  openAction: { flexDirection: "row", alignItems: "center", gap: 3 },
  openText: { color: C.brand, fontSize: 10.5, fontWeight: "900" },
  state: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 17,
    padding: 30,
    alignItems: "center",
  },
  stateTitle: { color: C.text, fontSize: 14, fontWeight: "900", marginTop: 10 },
  stateText: {
    color: C.muted,
    fontSize: 11,
    fontWeight: "600",
    textAlign: "center",
    lineHeight: 16,
    marginTop: 5,
  },
  retry: {
    backgroundColor: C.brand,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 9,
    marginTop: 13,
  },
  retryText: { color: "#fff", fontSize: 11, fontWeight: "900" },
  disabled: { opacity: 0.6 },
  lime: "#D9FF76",
});
