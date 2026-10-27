/* eslint-disable react-hooks/set-state-in-effect */
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import {
  ActivityIndicator,
  BackHandler,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getApiUrl, safeFetch } from "../../constants/api";
import { Alert } from "../StyledAlert";

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
  amber: "#F59E0B",
  amberSoft: "#FFFBEB",
  danger: "#EF4444",
  dangerSoft: "#FEF2F2",
  cyan: "#06B6D4",
  cyanSoft: "#ECFEFF",
  shadow: "#94A3B8",
};

const USERS_WITH_SERVICES_API_PATH = "/api/admin/users";
const GROW_CLEANING_API_PATH = "/api/grow-cleaning";
const REQUEST_DETAILS_API_PATH = (id) =>
  `/api/admin/request/${encodeURIComponent(id)}`;
const updateUserBehaviorApiPath = (userId) =>
  `/api/admin/users/${encodeURIComponent(userId)}/behavior`;
const USER_BEHAVIOR_OPTIONS = [
  {
    value: "Good",
    icon: "checkmark-circle-outline",
    accent: COLORS.success,
    soft: COLORS.successSoft,
  },
  {
    value: "Normal",
    icon: "ellipse-outline",
    accent: COLORS.blue,
    soft: COLORS.blueSoft,
  },
  {
    value: "Severe",
    icon: "alert-circle-outline",
    accent: COLORS.amber,
    soft: COLORS.amberSoft,
  },
  {
    value: "Indisciplined",
    icon: "warning-outline",
    accent: COLORS.danger,
    soft: COLORS.dangerSoft,
  },
];

function getServiceName(service, fallback = "Purchased service") {
  return (
    service?.name ||
    service?.serviceName ||
    service?.service?.name ||
    fallback
  );
}

function getConsumerName(user, service) {
  return (
    service?.consumerName ||
    service?.fullName ||
    service?.customerName ||
    user?.consumerName ||
    user?.fullName ||
    user?.name ||
    user?.username ||
    user?.email ||
    "Unnamed consumer"
  );
}

function getConsumerPhone(user, service) {
  const phoneCandidates = [
    service?.mobileNumber,
    service?.primaryPhone,
    service?.whatsappNumber,
    service?.phoneNumber,
    service?.phone,
    service?.contactNumber,
    service?.consumer?.mobileNumber,
    service?.consumer?.phoneNumber,
    user?.mobileNumber,
    user?.mobile,
    user?.phoneNumber,
    user?.phone,
  ];

  const phone = phoneCandidates.find(
    (value) => value !== null && value !== undefined && String(value).trim(),
  );
  return phone ? String(phone).trim() : "Not available";
}

function getServiceHighlight(serviceName) {
  const name = String(serviceName || "").toLowerCase();

  if (name.includes("solar") && name.includes("amc")) {
    return {
      icon: "sunny-outline",
      accent: COLORS.blue,
      soft: COLORS.blueSoft,
      border: "#C7D2FE",
    };
  }
  if (name.includes("cleaning") && name.includes("amc")) {
    return {
      icon: "leaf-outline",
      accent: COLORS.success,
      soft: COLORS.successSoft,
      border: "#BBF7D0",
    };
  }
  if (name.includes("cleaning")) {
    return {
      icon: "water-outline",
      accent: COLORS.cyan,
      soft: COLORS.cyanSoft,
      border: "#A5F3FC",
    };
  }
  if (name.includes("electrical")) {
    return {
      icon: "flash-outline",
      accent: "#8B5CF6",
      soft: "#F5F3FF",
      border: "#DDD6FE",
    };
  }
  if (name.includes("solar")) {
    return {
      icon: "sunny-outline",
      accent: COLORS.amber,
      soft: COLORS.amberSoft,
      border: "#FDE68A",
    };
  }

  return {
    icon: "construct-outline",
    accent: COLORS.brand,
    soft: COLORS.surfaceAlt,
    border: COLORS.border,
  };
}

function buildGrowCleaningUrl(user) {
  const params = new URLSearchParams();
  const userId = getUserId(user);
  const email = String(user?.email || "")
    .trim()
    .toLowerCase();

  if (userId) {
    params.set("userId", String(userId));
  }

  if (email) {
    params.set("email", email);
  }

  const query = params.toString();
  return query ? `${GROW_CLEANING_API_PATH}?${query}` : GROW_CLEANING_API_PATH;
}

const FILTERS = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "blocked", label: "Blocked" },
];

function getUserId(user) {
  return user?._id || user?.id || user?.userId;
}

function getServiceList(user) {
  if (Array.isArray(user?.service)) {
    return user.service;
  }

  if (Array.isArray(user?.services)) {
    return user.services;
  }

  return [];
}

function getServiceId(service, index) {
  return (
    service?._id || service?.id || service?.serviceId || `service-${index}`
  );
}

function isServiceActivated(service) {
  const status = String(
    service?.status || service?.serviceStatus || "",
  ).toLowerCase();

  const notActivated =
    service?.active === false ||
    service?.active === "false" ||
    status === "inactive" ||
    status === "not_active" ||
    status === "pending" ||
    status === "unactivated" ||
    status === "deactivated";

  return !notActivated;
}

function isServiceBlocked(service) {
  const status = String(
    service?.status || service?.serviceStatus || "",
  ).toLowerCase();

  return (
    service?.blocked === true ||
    service?.blocked === "true" ||
    status === "blocked" ||
    status === "suspended"
  );
}

function isPaymentCompleted(service) {
  const paymentMethod = String(service?.paymentMethod || "").toLowerCase();
  const paymentStatus = String(service?.paymentStatus || "").toLowerCase();
  
  // Payment is NOT completed if:
  // - paymentMethod is "pending"
  // - paymentStatus is "pending"
  // - paymentMethod is empty (no payment made)
  const isPending = 
    paymentMethod === "pending" || 
    paymentStatus === "pending" ||
    paymentMethod === "";
  
  return !isPending;
}

function isServiceActive(service) {
  return isServiceActivated(service) && !isServiceBlocked(service);
}

function normalizeUsers(payload) {
  const source = Array.isArray(payload)
    ? payload
    : payload?.users ||
      payload?.data?.users ||
      payload?.data ||
      payload?.user ||
      [];

  const list = Array.isArray(source) ? source : [source];

  return list
    .map((user) => ({
      ...user,
      service: getServiceList(user),
    }))
    .filter((user) => getServiceList(user).length > 0);
}

function getDateKeyFromString(value) {
  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  const directMatch = trimmed.match(/^(\d{4}-\d{2}-\d{2})/);
  if (directMatch) {
    return directMatch[1];
  }

  return null;
}

function toUtcMiddayIso(dateKey) {
  const [year, month, day] = String(dateKey || "")
    .split("-")
    .map(Number);

  if (!year || !month || !day) {
    return null;
  }

  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0)).toISOString();
}

function normalizeDateValue(value) {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    const dateKey = formatDateKey(value);
    if (!dateKey) return null;
    const [year, month, day] = dateKey.split("-").map(Number);
    return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
  }

  if (typeof value === "string") {
    const dateKey = getDateKeyFromString(value);
    if (dateKey) {
      const [year, month, day] = dateKey.split("-").map(Number);
      return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return null;

    const fallbackDateKey = formatDateKey(parsed);
    if (!fallbackDateKey) return null;
    const [year, month, day] = fallbackDateKey.split("-").map(Number);
    return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
  }

  if (typeof value === "object") {
    const unwrapped = value?.$date || value?.date || value?.value;
    if (unwrapped) {
      return normalizeDateValue(unwrapped);
    }
  }

  return null;
}

function normalizeVisitStatus(value) {
  const rawStatus = String(value || "UpComing").trim();
  const normalizedStatus = rawStatus.toLowerCase();
  if (normalizedStatus.includes("completed")) return "Completed";
  if (normalizedStatus.includes("issue")) return "Issue Reported";
  if (
    normalizedStatus.includes("pending") ||
    normalizedStatus.includes("upcoming")
  ) {
    return "Pending";
  }
  return rawStatus;
}

function getVisitDateSource(service, user) {
  // Prefer a populated array. An empty alias on `service` must not hide the
  // populated `user.consumerManagement.selectedVisits` array from MongoDB.
  const candidates = [
    { owner: "service", parent: service, field: "selectedVisits" },
    { owner: "service", parent: service, field: "visitDates" },
    { owner: "service", parent: service, field: "selectedDates" },
    { owner: "service", parent: service, field: "dates" },
    {
      owner: "serviceConsumerManagement",
      parent: service?.consumerManagement,
      field: "selectedVisits",
    },
    {
      owner: "serviceConsumerManagement",
      parent: service?.consumerManagement,
      field: "visitDates",
    },
    { owner: "user", parent: user, field: "selectedVisits" },
    { owner: "user", parent: user, field: "visitDates" },
    {
      owner: "userConsumerManagement",
      parent: user?.consumerManagement,
      field: "selectedVisits",
    },
    {
      owner: "userConsumerManagement",
      parent: user?.consumerManagement,
      field: "visitDates",
    },
    {
      owner: "userConsumerManagement",
      parent: user?.consumerManagement,
      field: "selectedDates",
    },
    {
      owner: "userConsumerManagement",
      parent: user?.consumerManagement,
      field: "dates",
    },
  ]
    .map((candidate) => ({
      ...candidate,
      entries: candidate.parent?.[candidate.field],
    }))
    .filter((candidate) => Array.isArray(candidate.entries));

  return (
    candidates.find((candidate) => candidate.entries.length > 0) ||
    candidates[0] ||
    null
  );
}

function getVisitDateEntries(service, user) {
  const source = getVisitDateSource(service, user)?.entries || [];

  return source
    .map((entry, index) => {
      const value =
        normalizeDateValue(
          entry?.date ||
            entry?.visitDate ||
            entry?.scheduledDate ||
            entry?.dateOfVisit ||
            entry?.selectedDate ||
            entry?.value ||
            entry?.visit?.date ||
            entry?.$date ||
            entry,
        ) || null;

      const dateKey = value ? formatDateKey(value) : "";
      if (!dateKey) {
        return null;
      }

      const status = normalizeVisitStatus(entry?.status);

      return {
        index,
        __visitIndex: index,
        value: dateKey,
        dateKey,
        date: value,
        status,
        isCompleted: status === "Completed",
        completedAt:
          entry?.submittedAt ||
          entry?.completedAt ||
          entry?.serviceDate ||
          entry?.completionDate ||
          null,
        isoDate: toUtcMiddayIso(dateKey),
        id: entry?._id || entry?.id || entry?.visitId || `${index}-${dateKey}`,
        assignedTechnicianName: entry?.assignedTechnicianName || "",
        issueNote: entry?.issueNote || "",
        beforePhotoUrl: entry?.beforePhotoUrl || "",
        afterPhotoUrl: entry?.afterPhotoUrl || "",
        submittedAt: entry?.submittedAt || null,
      };
    })
    .filter(Boolean);
}

function mergeVisitIntoSource(service, user, visitIndex, updatedVisit) {
  const source = getVisitDateSource(service, user);
  if (!source) return { service, user };

  const entries = source.entries.map((entry, index) =>
    index === visitIndex ? { ...entry, ...updatedVisit } : entry,
  );

  if (source.owner === "service") {
    return {
      service: { ...service, [source.field]: entries },
      user,
    };
  }
  if (source.owner === "serviceConsumerManagement") {
    return {
      service: {
        ...service,
        consumerManagement: {
          ...service.consumerManagement,
          [source.field]: entries,
        },
      },
      user,
    };
  }
  if (source.owner === "user") {
    return { service, user: { ...user, [source.field]: entries } };
  }

  return {
    service,
    user: {
      ...user,
      consumerManagement: {
        ...user.consumerManagement,
        [source.field]: entries,
      },
    },
  };
}

function formatDate(value) {
  if (!value) {
    return "Not available";
  }

  const dateKey =
    typeof value === "string" ? formatDateKey(value) : formatDateKey(value);
  if (!dateKey) {
    return "Not available";
  }

  const [year, month, day] = dateKey.split("-").map(Number);
  const parsed = new Date(year, month - 1, day);

  return parsed.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateKey(date) {
  if (!date) {
    return "";
  }

  if (typeof date === "string") {
    const directMatch = getDateKeyFromString(date);
    if (directMatch) return directMatch;
  }

  const parsed = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  const year = parsed.getUTCFullYear();
  const month = String(parsed.getUTCMonth() + 1).padStart(2, "0");
  const day = String(parsed.getUTCDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function shortId(value) {
  const id = String(value || "");
  return id.length > 8 ? `${id.slice(0, 4)}...${id.slice(-4)}` : id || "N/A";
}

function getConsumerNumber(user, service) {
  return (
    service?.consumerNumber ||
    service?.consumerNo ||
    user?.consumerNumber ||
    user?.consumerNo ||
    user?.consumer_no ||
    "Not available"
  );
}

function getInitials(name, email) {
  const source = String(name || email || "U").trim();
  const parts = source.split(/\s+/).filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }

  return source.slice(0, 2).toUpperCase();
}

function TextureLines({ tone = "light" }) {
  const color =
    tone === "dark" ? "rgba(255,255,255,0.15)" : "rgba(226,232,240,0.7)";

  return (
    <View pointerEvents="none" style={styles.textureLayer}>
      <View style={[styles.textureLineOne, { backgroundColor: color }]} />
      <View style={[styles.textureLineTwo, { backgroundColor: color }]} />
      <View style={[styles.textureLineThree, { backgroundColor: color }]} />
    </View>
  );
}

function StatCard({ label, value, icon, accent, soft }) {
  return (
    <View style={styles.statCard}>
      <TextureLines />
      <View style={[styles.statIconWrap, { backgroundColor: soft }]}>
        <Ionicons name={icon} size={18} color={accent} />
      </View>
      <Text style={[styles.statValue, { color: accent }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function DetailPill({ icon, label, value, accent, soft }) {
  return (
    <View style={[styles.detailPill, { backgroundColor: soft }]}>
      <Ionicons name={icon} size={14} color={accent} />
      <View style={styles.detailPillTextWrap}>
        <Text style={[styles.detailPillValue, { color: accent }]}>{value}</Text>
        <Text style={styles.detailPillLabel}>{label}</Text>
      </View>
    </View>
  );
}

function UserAvatar({ user, name }) {
  if (user?.photoURL) {
    return <Image source={{ uri: user.photoURL }} style={styles.avatarImage} />;
  }

  return (
    <View style={styles.avatarFallback}>
      <Text style={styles.avatarInitials}>
        {getInitials(name || getConsumerName(user), user?.email)}
      </Text>
    </View>
  );
}

function FilterChip({ item, count, active, onPress }) {
  return (
    <Pressable
      style={[styles.filterChip, active && styles.filterChipActive]}
      onPress={onPress}
    >
      <Text style={[styles.filterText, active && styles.filterTextActive]}>
        {item.label}
      </Text>
      <Text style={[styles.filterCount, active && styles.filterCountActive]}>
        {count}
      </Text>
    </Pressable>
  );
}

function UserListRow({ user, service, serviceIndex, active, onViewDetails }) {
  const consumerName = getConsumerName(user, service);
  const consumerNumber = getConsumerNumber(user, service);
  const serviceName = getServiceName(service);
  const serviceHighlight = getServiceHighlight(serviceName);
  const statusColor = active ? COLORS.success : COLORS.danger;

  return (
    <View style={styles.listRowCard}>
      <View style={styles.listRowTop}>
        <View style={styles.listRowIdentity}>
          <View style={styles.listAvatarWrap}>
            <Text style={styles.listAvatarText}>
              {getInitials(consumerName, user?.email)}
            </Text>
          </View>

          <View style={styles.listRowTextWrap}>
            <Text style={styles.listUserName} numberOfLines={1}>
              {consumerName}
            </Text>
            <Text style={styles.listConsumerText} numberOfLines={1}>
              Consumer no: {consumerNumber}
            </Text>
          </View>
        </View>

        <View
          style={[
            styles.listStatusBadge,
            {
              backgroundColor: active ? COLORS.successSoft : COLORS.dangerSoft,
            },
          ]}
        >
          <View
            style={[styles.listStatusDot, { backgroundColor: statusColor }]}
          />
          <Text style={[styles.listStatusText, { color: statusColor }]}>
            {active ? "Active" : "Blocked"}
          </Text>
        </View>
      </View>

      <View style={styles.listRowMeta}>
        <View
          style={[
            styles.listServiceBadge,
            {
              backgroundColor: serviceHighlight.soft,
              borderColor: serviceHighlight.border,
            },
          ]}
        >
          <Ionicons
            name={serviceHighlight.icon}
            size={12}
            color={serviceHighlight.accent}
          />
          <Text
            style={[
              styles.listServiceBadgeText,
              { color: serviceHighlight.accent },
            ]}
            numberOfLines={1}
          >
            {serviceName}
          </Text>
        </View>
        <Text style={styles.listMetaText}>
          {active ? "Active access" : "Blocked access"}
        </Text>
      </View>

      <Pressable style={styles.listDetailsButton} onPress={onViewDetails}>
        <Text style={styles.listDetailsButtonText}>View details</Text>
        <Ionicons name="chevron-forward" size={16} color={COLORS.brand} />
      </Pressable>
    </View>
  );
}

function BehaviorEditor({ user, selectedBehavior, isSaving, onSelect, onSave }) {
  const history = Array.isArray(user?.behaviorHistory)
    ? [...user.behaviorHistory].reverse().slice(0, 3)
    : [];

  return (
    <View style={styles.behaviorCard}>
      <View style={styles.behaviorHeader}>
        <View style={styles.behaviorHeaderText}>
          <Text style={styles.behaviorTitle}>User behavior</Text>
          <Text style={styles.behaviorSubtitle}>
            Set or update user behavior.
          </Text>
        </View>
        <View style={styles.currentBehaviorBadge}>
          <Text style={styles.currentBehaviorLabel}>Current</Text>
          <Text style={styles.currentBehaviorValue}>
            {user?.behavior || "Not rated"}
          </Text>
        </View>
      </View>

      <View style={styles.behaviorOptions}>
        {USER_BEHAVIOR_OPTIONS.map((option) => {
          const selected = selectedBehavior === option.value;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              onPress={() => onSelect(option.value)}
              style={[
                styles.behaviorOption,
                {
                  backgroundColor: option.soft,
                  borderColor: selected ? option.accent : COLORS.border,
                },
                selected && styles.behaviorOptionSelected,
              ]}
            >
              <Ionicons
                name={selected ? "checkmark-circle" : option.icon}
                size={17}
                color={option.accent}
              />
              <Text style={[styles.behaviorOptionText, { color: option.accent }]}>
                {option.value}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Pressable
        accessibilityRole="button"
        onPress={onSave}
        disabled={
          !selectedBehavior || selectedBehavior === user?.behavior || isSaving
        }
        style={[
          styles.saveBehaviorButton,
          (!selectedBehavior ||
            selectedBehavior === user?.behavior ||
            isSaving) &&
            styles.disabledButton,
        ]}
      >
        {isSaving ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Ionicons name="save-outline" size={16} color="#FFFFFF" />
        )}
        <Text style={styles.saveBehaviorText}>
          {isSaving ? "Saving behavior" : "Save behavior"}
        </Text>
      </Pressable>

      {history.length > 0 ? (
        <View style={styles.behaviorHistory}>
          <Text style={styles.behaviorHistoryTitle}>Recent ratings</Text>
          {history.map((entry, index) => (
            <View
              key={`${entry.recordedAt || entry.behavior}-${index}`}
              style={styles.behaviorHistoryRow}
            >
              <Text style={styles.behaviorHistoryValue}>
                {entry.behavior || "Not rated"}
              </Text>
              <Text style={styles.behaviorHistoryMeta}>
                {entry.action === "updated" ? "Updated" : entry.action || "Rated"}
                {" · "}
                {formatDate(entry.recordedAt)}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function ServiceCard({ user, service, onPress, onVisitPress }) {
  const active = isServiceActive(service);
  const serviceAccent = active ? COLORS.success : COLORS.danger;
  const serviceSoft = active ? COLORS.successSoft : COLORS.dangerSoft;
  const consumerName = getConsumerName(user, service);
  const serviceName = getServiceName(service);
  const serviceHighlight = getServiceHighlight(serviceName);
  const visitDates = React.useMemo(
    () => getVisitDateEntries(service, user),
    [service, user],
  );

  const cardContent = (
    <View style={styles.serviceCard}>
      <View
        style={[
          styles.serviceAccentRail,
          { backgroundColor: active ? COLORS.success : COLORS.danger },
        ]}
      />
      <TextureLines />

      <View style={styles.serviceTopRow}>
        <View style={styles.userBlock}>
          <UserAvatar user={user} name={consumerName} />
          <View style={styles.userTextWrap}>
            <Text style={styles.userName} numberOfLines={1}>
              {consumerName}
            </Text>
            <Text style={styles.userMeta} numberOfLines={1}>
              {user?.email || "No email"}
            </Text>
          </View>
        </View>

        <View style={[styles.statusBadge, { backgroundColor: serviceSoft }]}>
          <View
            style={[styles.statusDot, { backgroundColor: serviceAccent }]}
          />
          <Text style={[styles.statusBadgeText, { color: serviceAccent }]}>
            {active ? "Active" : "Blocked"}
          </Text>
        </View>
      </View>

      <View
        style={[
          styles.servicePanel,
          {
            backgroundColor: serviceHighlight.soft,
            borderColor: serviceHighlight.border,
          },
        ]}
      >
        <View
          style={[
            styles.serviceIconWrap,
            {
              backgroundColor: serviceHighlight.soft,
              borderColor: serviceHighlight.border,
            },
          ]}
        >
          <Ionicons
            name={serviceHighlight.icon}
            size={20}
            color={serviceHighlight.accent}
          />
        </View>
        <View style={styles.serviceTextWrap}>
          <Text
            style={[
              styles.serviceName,
              { color: serviceHighlight.accent },
            ]}
            numberOfLines={1}
          >
            {serviceName}
          </Text>
          <Text style={styles.serviceSubText}>
            Registered {formatDate(service?.reg_date || service?.createdAt)}
          </Text>
        </View>
      </View>

      <View style={styles.detailGrid}>
        <DetailPill
          icon="call-outline"
          label="Mobile no."
          value={getConsumerPhone(user, service)}
          accent={COLORS.brand}
          soft="#E8F4F7"
        />
        <DetailPill
          icon="card-outline"
          label="Consumer no."
          value={getConsumerNumber(user, service)}
          accent={COLORS.blue}
          soft={COLORS.blueSoft}
        />
      </View>

      <View style={styles.visitDatesSection}>
        <View style={styles.visitDatesHeaderRow}>
          <Text style={styles.visitDatesTitle}>Visit Summary</Text>
          <View style={styles.visitCountBadge}>
            <Text style={styles.visitCountBadgeText}>{visitDates.length}</Text>
          </View>
        </View>

        {visitDates.length > 0 ? (
          <View style={styles.visitTable}>
            <View style={styles.visitTableHeader}>
              <Text style={[styles.visitTableHeading, styles.scheduleColumn]}>
                Schedule Date
              </Text>
              <Text style={[styles.visitTableHeading, styles.serviceDateColumn]}>
                Service Date
              </Text>
              <Text style={[styles.visitTableHeading, styles.visitStatusColumn]}>
                Status
              </Text>
            </View>
            {visitDates.map((visit) => (
              <Pressable
                key={visit.id}
                accessibilityRole="button"
                accessibilityLabel={`View visit scheduled ${formatDate(visit.date)}, status ${visit.status}`}
                onPress={() => onVisitPress?.(service, user, visit)}
                style={styles.visitTableRow}
              >
                <Text style={[styles.visitTableCell, styles.scheduleColumn]}>
                  {formatDate(visit.date)}
                </Text>
                <Text
                  style={[
                    styles.visitTableCell,
                    styles.serviceDateColumn,
                    !visit.completedAt && styles.visitDateUnavailable,
                  ]}
                >
                  {visit.isCompleted && visit.completedAt
                    ? formatDate(visit.completedAt)
                    : "—"}
                </Text>
                <View style={[styles.visitStatusColumn, styles.visitStatusWrap]}>
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.visitStatusBadge,
                      visit.isCompleted
                        ? styles.visitCompletedBadge
                        : styles.visitPendingBadge,
                    ]}
                  >
                    {visit.status}
                  </Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={13}
                  color={COLORS.faint}
                  style={styles.visitOpenIcon}
                />
              </Pressable>
            ))}
          </View>
        ) : (
          <Text style={styles.emptyVisitText}>No visit dates added</Text>
        )}
      </View>

      {service?.blockReason ? (
        <View style={styles.blockReasonBox}>
          <Ionicons
            name="information-circle-outline"
            size={16}
            color={COLORS.danger}
          />
          <Text style={styles.blockReasonText}>{service.blockReason}</Text>
        </View>
      ) : null}

      {!isPaymentCompleted(service) ? (
        <View style={styles.paymentPendingBox}>
          <Ionicons
            name="alert-circle-outline"
            size={16}
            color={COLORS.amber}
          />
          <Text style={styles.paymentPendingText}>
            Payment pending - Service will be activated after payment confirmation
          </Text>
        </View>
      ) : null}

      <View style={styles.cardFooter}>
        <View style={styles.updatedTextWrap}>
          <Ionicons name="time-outline" size={14} color={COLORS.faint} />
          <Text style={styles.updatedText}>
            Updated {formatDate(user?.updatedAt)}
          </Text>
        </View>
      </View>
    </View>
  );

  return onPress ? (
    <Pressable onPress={onPress} style={styles.cardTouchTarget}>
      {cardContent}
    </Pressable>
  ) : (
    cardContent
  );
}

export default function AdminActiveUserServices() {
  const [users, setUsers] = React.useState([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState("");
  const [activeFilter, setActiveFilter] = React.useState("all");
  const [searchText, setSearchText] = React.useState("");
  const [currentView, setCurrentView] = React.useState("categories");
  const [selectedCategory, setSelectedCategory] = React.useState(null);
  const [selectedService, setSelectedService] = React.useState(null);
  const [selectedVisit, setSelectedVisit] = React.useState(null);
  const [isLoadingVisit, setIsLoadingVisit] = React.useState(false);
  const [visitDetailsError, setVisitDetailsError] = React.useState("");
  const [selectedBehavior, setSelectedBehavior] = React.useState("");
  const [isSavingBehavior, setIsSavingBehavior] = React.useState(false);

  const fetchUsers = React.useCallback(async ({ refreshing = false } = {}) => {
    if (refreshing) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    setErrorMessage("");

    try {
      const response = await safeFetch(
        getApiUrl(USERS_WITH_SERVICES_API_PATH),
        {
          method: "GET",
        },
      );
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.message || "Unable to load users.");
      }

      const baseUsers = normalizeUsers(payload);

      const hydratedUsers = await Promise.all(
        baseUsers.map(async (user) => {
          const userId = getUserId(user);
          const email = String(user?.email || "")
            .trim()
            .toLowerCase();

          if (!userId && !email) {
            return user;
          }

          try {
            const growCleaningResponse = await safeFetch(
              getApiUrl(buildGrowCleaningUrl(user)),
              { method: "GET" },
            );
            const growPayload = await growCleaningResponse
              .json()
              .catch(() => null);

            const applications = Array.isArray(growPayload?.data)
              ? growPayload.data
              : [];

            if (applications.length === 0) {
              return user;
            }

            const applicationServices = applications.map((app, index) => ({
              ...app,
              _id: app?._id || app?.id || `service-${index}`,
              name:
                app?.name ||
                app?.serviceName ||
                app?.service?.name ||
                "Purchased service",
            }));
            const applicationServiceNames = applicationServices.map((service) =>
              getServiceName(service).toLowerCase().replace(/[^a-z0-9]/g, ""),
            );
            const otherServices = getServiceList(user).filter((service) => {
              const serviceName = getServiceName(service)
                .toLowerCase()
                .replace(/[^a-z0-9]/g, "");
              return !applicationServiceNames.some(
                (applicationServiceName) =>
                  serviceName === applicationServiceName,
              );
            });

            return {
              ...user,
              service: [...applicationServices, ...otherServices],
            };
          } catch {
            return user;
          }
        }),
      );

      const nextUsers = hydratedUsers.filter(
        (user) => getServiceList(user).length > 0,
      );
      setUsers(nextUsers);
      return nextUsers;
    } catch (error) {
      setErrorMessage(error?.message || "Unable to load users.");
      setUsers([]);
      return [];
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  React.useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const serviceRows = React.useMemo(() => {
    return users
      .flatMap((user) =>
        getServiceList(user)
          .filter((service) => {
            // Filter at initial stage:
            // 1. Service must be activated
            // 2. Payment must be completed (not pending)
            const isActivated = isServiceActivated(service);
            const hasCompletedPayment = isPaymentCompleted(service);
       
            
            return isActivated && hasCompletedPayment;
          })
          .map((service, serviceIndex) => ({
            user,
            service,
            serviceIndex,
            active: !isServiceBlocked(service),
            blocked: isServiceBlocked(service),
          })),
      );
  }, [users]);

  const counts = React.useMemo(() => {
    const active = serviceRows.filter((item) => item.active).length;
    const blocked = serviceRows.filter((item) => item.blocked).length;

    return {
      all: serviceRows.length,
      active,
      blocked,
      users: users.length,
    };
  }, [serviceRows, users.length]);

  const groupedServiceRows = React.useMemo(() => {
    const groups = {};

    serviceRows.forEach((row) => {
      const serviceName = getServiceName(row?.service, "Other Services");
      if (!groups[serviceName]) {
        groups[serviceName] = [];
      }
      groups[serviceName].push(row);
    });

    return groups;
  }, [serviceRows]);

  const categories = React.useMemo(
    () =>
      Object.keys(groupedServiceRows).map((serviceName) => ({
        name: serviceName,
        count: groupedServiceRows[serviceName].length,
        rows: groupedServiceRows[serviceName],
      })),
    [groupedServiceRows],
  );

  const selectedCategoryRows = React.useMemo(() => {
    if (!selectedCategory) {
      return [];
    }

    return groupedServiceRows[selectedCategory] || [];
  }, [groupedServiceRows, selectedCategory]);

  const filteredRows = React.useMemo(() => {
    const query = searchText.trim().toLowerCase();

    return selectedCategoryRows.filter(({ user, service, active, blocked }) => {
      if (activeFilter === "active" && !active) {
        return false;
      }

      if (activeFilter === "blocked" && !blocked) {
        return false;
      }

      if (!query) {
        return true;
      }

      const searchable = [
        getConsumerName(user, service),
        getConsumerPhone(user, service),
        user?.username,
        user?.fullName,
        user?.email,
        user?.provider,
        getServiceName(service),
        getUserId(user),
        getServiceId(service, 0),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchable.includes(query);
    });
  }, [activeFilter, searchText, selectedCategoryRows]);

  const handleBackToCategories = () => {
    setCurrentView("categories");
    setSelectedCategory(null);
    setSelectedService(null);
    setSearchText("");
  };

  const handleBackToList = () => {
    setCurrentView("list");
    setSelectedService(null);
  };

  React.useEffect(() => {
    const onHardwareBackPress = () => {
      if (currentView === "detail") {
        handleBackToList();
        return true;
      }

      if (currentView === "list") {
        handleBackToCategories();
        return true;
      }

      return false;
    };

    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      onHardwareBackPress,
    );

    return () => subscription.remove();
  }, [currentView]);

  const handleCategorySelect = (categoryName) => {
    setSelectedCategory(categoryName);
    setSearchText("");
    setCurrentView("list");
  };

  const handleServiceSelect = (row) => {
    setSelectedService(row);
    setSelectedBehavior(row.user?.behavior || "");
    setCurrentView("detail");
  };

  const handleVisitSelect = async (service, user, visit) => {
    const requestId = String(
      service?._id || service?.id || service?.serviceId || "",
    );
    const visitIndex = Number(visit?.__visitIndex);
    setSelectedVisit({
      scheduledDate: visit?.date,
      serviceDate: visit?.completedAt,
      status: visit?.status || "Pending",
      technicianName: visit?.assignedTechnicianName || "",
      issueNote: visit?.issueNote || "",
      beforePhotoUrl: visit?.beforePhotoUrl || "",
      afterPhotoUrl: visit?.afterPhotoUrl || "",
      serviceName: getServiceName(service),
      consumerName: getConsumerName(user, service),
    });
    setVisitDetailsError("");
    setIsLoadingVisit(true);

    try {
      if (!/^[a-f\d]{24}$/i.test(requestId) || !Number.isInteger(visitIndex)) {
        throw new Error("This visit is missing its request or visit identifier.");
      }

      const response = await safeFetch(
        getApiUrl(REQUEST_DETAILS_API_PATH(requestId)),
        { method: "GET" },
      );
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.success || !payload?.data) {
        throw new Error(
          payload?.message || "Unable to load this visit's latest response.",
        );
      }

      const visits =
        payload.data.consumerManagement?.selectedVisits ||
        payload.data.selectedVisits ||
        [];
      const latestVisit = visits[visitIndex];
      if (!latestVisit) {
        throw new Error("The requested visit was not found.");
      }

      const refreshedVisit = {
        ...latestVisit,
        date: latestVisit.date || visit.date,
        status: normalizeVisitStatus(latestVisit.status || visit.status),
        submittedAt:
          latestVisit.submittedAt ||
          latestVisit.completedAt ||
          latestVisit.serviceDate ||
          null,
      };
      const refreshed = mergeVisitIntoSource(
        service,
        user,
        visitIndex,
        refreshedVisit,
      );
      const serviceId = String(getServiceId(service, 0));
      const userId = String(getUserId(user) || "");

      setSelectedService((current) =>
        current &&
        String(getServiceId(current.service, current.serviceIndex)) ===
          serviceId
          ? {
              ...current,
              service: refreshed.service,
              user: refreshed.user,
            }
          : current,
      );
      if (userId) {
        setUsers((currentUsers) =>
          currentUsers.map((currentUser) => {
            if (String(getUserId(currentUser) || "") !== userId) {
              return currentUser;
            }
            const services = getServiceList(currentUser);
            let updatedUser = currentUser;
            const updatedServices = services.map((currentService, index) => {
              if (String(getServiceId(currentService, index)) !== serviceId) {
                return currentService;
              }
              const merged = mergeVisitIntoSource(
                currentService,
                updatedUser,
                visitIndex,
                refreshedVisit,
              );
              updatedUser = merged.user;
              return merged.service;
            });
            return Array.isArray(updatedUser.service)
              ? { ...updatedUser, service: updatedServices }
              : { ...updatedUser, services: updatedServices };
          }),
        );
      }

      setSelectedVisit({
        scheduledDate: refreshedVisit.date,
        serviceDate:
          refreshedVisit.submittedAt ||
          refreshedVisit.completedAt ||
          null,
        status: refreshedVisit.status,
        technicianName:
          latestVisit.assignedTechnicianName ||
          visit.assignedTechnicianName ||
          "",
        issueNote: latestVisit.issueNote || "",
        beforePhotoUrl: latestVisit.beforePhotoUrl || "",
        afterPhotoUrl: latestVisit.afterPhotoUrl || "",
        serviceName: getServiceName(service),
        consumerName: getConsumerName(user, service),
      });
    } catch (error) {
      setVisitDetailsError(
        error?.message || "Unable to load this visit's latest response.",
      );
    } finally {
      setIsLoadingVisit(false);
    }
  };

  const saveUserBehavior = async () => {
    if (!selectedService || !selectedBehavior) return;

    const userId = getUserId(selectedService.user);
    if (!userId) {
      Alert.alert("Missing user ID", "This user's behavior cannot be updated.");
      return;
    }

    setIsSavingBehavior(true);
    try {
      const response = await safeFetch(
        getApiUrl(updateUserBehaviorApiPath(userId)),
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            behavior: selectedBehavior,
            serviceName: getServiceName(selectedService.service),
          }),
        },
      );
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.message || "Unable to update user behavior.");
      }

      const behavior = payload.data?.behavior || selectedBehavior;
      const behaviorHistory = Array.isArray(payload.data?.behaviorHistory)
        ? payload.data.behaviorHistory
        : selectedService.user?.behaviorHistory || [];
      const updateUser = (user) =>
        String(getUserId(user)) === String(userId)
          ? { ...user, behavior, behaviorHistory }
          : user;
      setUsers((currentUsers) => currentUsers.map(updateUser));
      setSelectedService((current) =>
        current && String(getUserId(current.user)) === String(userId)
          ? { ...current, user: updateUser(current.user) }
          : current,
      );
      setSelectedBehavior(behavior);
      Alert.alert("Behavior updated", "The user's behavior rating was saved.");
    } catch (error) {
      Alert.alert("Update failed", error?.message || "Please try again.");
    } finally {
      setIsSavingBehavior(false);
    }
  };

  const renderCategoriesView = () => (
    <>
      <LinearGradient
        colors={["#102A43", "#1E5464", "#657EEA"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroCard}
      >
        <TextureLines tone="dark" />

        <View style={styles.heroTopRow}>
          <View style={styles.heroBadge}>
            <Ionicons name="people-outline" size={14} color="#FFFFFF" />
            <Text style={styles.heroBadgeText}>
              Active User&lsquo;s Services
            </Text>
          </View>
          <View style={styles.heroIconWrap}>
            <Ionicons
              name="shield-checkmark-outline"
              size={22}
              color="#FFFFFF"
            />
          </View>
        </View>

        <Text style={styles.heroTitle}>Review purchased services.</Text>
        <Text style={styles.heroSubtitle}>
          View consumer details, service status, visit dates, and behavior history.
        </Text>

        <View style={styles.heroStatsRow}>
          <View style={styles.heroStatCard}>
            <Text style={styles.heroStatValue}>{counts.users}</Text>
            <Text style={styles.heroStatLabel}>Users</Text>
          </View>
          <View style={styles.heroStatCard}>
            <Text style={styles.heroStatValue}>{counts.active}</Text>
            <Text style={styles.heroStatLabel}>Active</Text>
          </View>
          <View style={styles.heroStatCard}>
            <Text style={styles.heroStatValue}>{counts.blocked}</Text>
            <Text style={styles.heroStatLabel}>Blocked</Text>
          </View>
        </View>
      </LinearGradient>

      {/* <View style={styles.statsGrid}>
        <StatCard
          label="Purchased services"
          value={String(counts.all)}
          icon="layers-outline"
          accent={COLORS.blue}
          soft={COLORS.blueSoft}
        />
        <StatCard
          label="Active access"
          value={String(counts.active)}
          icon="checkmark-circle-outline"
          accent={COLORS.success}
          soft={COLORS.successSoft}
        />
        <StatCard
          label="Blocked access"
          value={String(counts.blocked)}
          icon="ban-outline"
          accent={COLORS.danger}
          soft={COLORS.dangerSoft}
        />
      </View> */}

      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionEyebrow}>Service categories</Text>
          <Text style={styles.sectionTitle}>
            {categories.length}{" "}
            {categories.length === 1 ? "category" : "categories"} available
          </Text>
        </View>

        <Pressable
          style={styles.refreshButton}
          onPress={() => fetchUsers({ refreshing: true })}
        >
          <Ionicons name="refresh-outline" size={16} color={COLORS.brand} />
        </Pressable>
      </View>

      {isLoading ? (
        <View style={styles.stateCard}>
          <ActivityIndicator color={COLORS.brand} />
          <Text style={styles.stateTitle}>Loading user services</Text>
          <Text style={styles.stateText}>
            Fetching users and purchased services.
          </Text>
        </View>
      ) : errorMessage ? (
        <View style={styles.stateCard}>
          <View style={styles.stateIconWrapDanger}>
            <Ionicons name="warning-outline" size={24} color={COLORS.danger} />
          </View>
          <Text style={styles.stateTitle}>Could not load services</Text>
          <Text style={styles.stateText}>{errorMessage}</Text>
          <Pressable style={styles.retryButton} onPress={() => fetchUsers()}>
            <Text style={styles.retryButtonText}>Try again</Text>
          </Pressable>
        </View>
      ) : categories.length === 0 ? (
        <View style={styles.stateCard}>
          <View style={styles.stateIconWrap}>
            <Ionicons name="file-tray-outline" size={24} color={COLORS.brand} />
          </View>
          <Text style={styles.stateTitle}>No services found</Text>
          <Text style={styles.stateText}>
            No purchased services are currently available.
          </Text>
        </View>
      ) : (
        categories.map((category) => (
          <Pressable
            key={category.name}
            style={styles.categoryCard}
            onPress={() => handleCategorySelect(category.name)}
          >
            <View style={styles.categoryAccent} />
            <View style={styles.categoryContent}>
              <View style={styles.categoryIconWrap}>
                <Ionicons
                  name={
                    category.name?.toLowerCase().includes("solar")
                      ? "sunny-outline"
                      : category.name?.toLowerCase().includes("clean")
                        ? "sparkles-outline"
                        : category.name?.toLowerCase().includes("electric")
                          ? "flash-outline"
                          : "layers-outline"
                  }
                  size={18}
                  color={COLORS.brand}
                />
              </View>
              <View style={styles.categoryTextWrap}>
                <Text style={styles.categoryName}>{category.name}</Text>
                <Text style={styles.categoryCount}>
                  {category.count}{" "}
                  {category.count === 1 ? "active user" : "active users"}
                </Text>
              </View>
              <View style={styles.categoryArrow}>
                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color={COLORS.brand}
                />
              </View>
            </View>
          </Pressable>
        ))
      )}
    </>
  );

  const renderListView = () => (
    <>
      <View style={styles.backHeader}>
        <Pressable style={styles.backButton} onPress={handleBackToCategories}>
          <Ionicons name="arrow-back" size={20} color={COLORS.brand} />
          <Text style={styles.backButtonText}>Categories</Text>
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
            <Ionicons name="layers-outline" size={14} color="#FFFFFF" />
            <Text style={styles.heroBadgeText}>{selectedCategory}</Text>
          </View>
          <View style={styles.heroIconWrap}>
            <Ionicons name="people-outline" size={22} color="#FFFFFF" />
          </View>
        </View>

        <Text style={styles.heroTitle}>{filteredRows.length} active users</Text>
        <Text style={styles.heroSubtitle}>
          Select a user to review their service status, details, and access
          control.
        </Text>
      </LinearGradient>

      <View style={styles.toolbarCard}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={17} color={COLORS.faint} />
          <TextInput
            value={searchText}
            onChangeText={setSearchText}
            placeholder="Search by name, mobile or consumer no"
            placeholderTextColor={COLORS.faint}
            style={styles.searchInput}
          />
          {searchText ? (
            <Pressable onPress={() => setSearchText("")}>
              <Ionicons name="close-circle" size={17} color={COLORS.faint} />
            </Pressable>
          ) : null}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterList}
        >
          {FILTERS.map((filter) => (
            <FilterChip
              key={filter.key}
              item={filter}
              count={
                filter.key === "all"
                  ? selectedCategoryRows.length
                  : filter.key === "active"
                    ? selectedCategoryRows.filter((item) => item.active).length
                    : selectedCategoryRows.filter((item) => !item.active).length
              }
              active={activeFilter === filter.key}
              onPress={() => setActiveFilter(filter.key)}
            />
          ))}
        </ScrollView>
      </View>

      {filteredRows.length === 0 ? (
        <View style={styles.stateCard}>
          <View style={styles.stateIconWrap}>
            <Ionicons name="file-tray-outline" size={24} color={COLORS.brand} />
          </View>
          <Text style={styles.stateTitle}>No matching users</Text>
          <Text style={styles.stateText}>
            Adjust your search or filter to find users in this service category.
          </Text>
        </View>
      ) : (
        filteredRows.map(({ user, service, serviceIndex, active }) => (
          <UserListRow
            key={`${getUserId(user)}-${getServiceId(service, serviceIndex)}`}
            user={user}
            service={service}
            serviceIndex={serviceIndex}
            active={active}
            onViewDetails={() =>
              handleServiceSelect({ user, service, serviceIndex, active })
            }
          />
        ))
      )}
    </>
  );

  const renderDetailView = () => {
    if (!selectedService) {
      return null;
    }

    const { user, service } = selectedService;

    return (
      <>
        <View style={styles.backHeader}>
          <Pressable style={styles.backButton} onPress={handleBackToList}>
            <Ionicons name="arrow-back" size={20} color={COLORS.brand} />
            <Text style={styles.backButtonText}>Back to list</Text>
          </Pressable>
        </View>

        <ServiceCard
          user={user}
          service={service}
          onVisitPress={handleVisitSelect}
        />
        <BehaviorEditor
          user={user}
          selectedBehavior={selectedBehavior}
          isSaving={isSavingBehavior}
          onSelect={setSelectedBehavior}
          onSave={saveUserBehavior}
        />
      </>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.brandDark} />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            tintColor={COLORS.brand}
            colors={[COLORS.brand]}
            onRefresh={() => fetchUsers({ refreshing: true })}
          />
        }
      >
        {currentView === "categories" && renderCategoriesView()}
        {currentView === "list" && renderListView()}
        {currentView === "detail" && renderDetailView()}
      </ScrollView>

      <Modal
        animationType="fade"
        onRequestClose={() => {
          setSelectedVisit(null);
          setVisitDetailsError("");
        }}
        transparent
        visible={Boolean(selectedVisit)}
      >
        <View style={styles.visitModalOverlay}>
          <View style={styles.visitModalCard}>
            <View style={styles.visitModalHeader}>
              <View style={styles.visitModalTitleWrap}>
                <Text style={styles.visitModalEyebrow}>VISIT SUMMARY</Text>
                <Text style={styles.visitModalTitle}>Service visit</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close visit details"
                onPress={() => {
                  setSelectedVisit(null);
                  setVisitDetailsError("");
                }}
                style={styles.visitModalClose}
              >
                <Ionicons name="close" size={21} color={COLORS.muted} />
              </Pressable>
            </View>

            <ScrollView
              contentContainerStyle={styles.visitModalContent}
              showsVerticalScrollIndicator={false}
            >
              {isLoadingVisit ? (
                <View style={styles.visitModalLoading}>
                  <ActivityIndicator size="small" color={COLORS.brand} />
                  <Text style={styles.visitModalLoadingText}>
                    Refreshing visit response...
                  </Text>
                </View>
              ) : null}
              {visitDetailsError ? (
                <View style={styles.visitModalError}>
                  <Ionicons
                    name="alert-circle-outline"
                    size={17}
                    color={COLORS.danger}
                  />
                  <Text style={styles.visitModalErrorText}>
                    {visitDetailsError}
                  </Text>
                </View>
              ) : null}

              {selectedVisit ? (
                <>
                  <Text style={styles.visitModalConsumer}>
                    {selectedVisit.consumerName}
                  </Text>
                  <Text style={styles.visitModalService}>
                    {selectedVisit.serviceName}
                  </Text>
                  <View style={styles.visitModalInfoGrid}>
                    <View style={styles.visitModalInfoCell}>
                      <Text style={styles.visitModalLabel}>Scheduled date</Text>
                      <Text style={styles.visitModalValue}>
                        {formatDate(selectedVisit.scheduledDate)}
                      </Text>
                    </View>
                    <View style={styles.visitModalInfoCell}>
                      <Text style={styles.visitModalLabel}>Service date</Text>
                      <Text style={styles.visitModalValue}>
                        {formatDate(selectedVisit.serviceDate)}
                      </Text>
                    </View>
                    <View style={styles.visitModalInfoCell}>
                      <Text style={styles.visitModalLabel}>Status</Text>
                      <Text style={styles.visitModalValue}>
                        {selectedVisit.status}
                      </Text>
                    </View>
                    <View style={styles.visitModalInfoCell}>
                      <Text style={styles.visitModalLabel}>Technician</Text>
                      <Text style={styles.visitModalValue}>
                        {selectedVisit.technicianName || "Not recorded"}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.visitResponsePanel}>
                    <Text style={styles.visitResponseTitle}>
                      Technician response
                    </Text>
                    <Text style={styles.visitResponseText}>
                      {selectedVisit.issueNote ||
                        "No written response was submitted for this visit."}
                    </Text>
                  </View>

                  <Text style={styles.visitResponseTitle}>Site photos</Text>
                  {selectedVisit.beforePhotoUrl ||
                  selectedVisit.afterPhotoUrl ? (
                    <View style={styles.visitPhotoRow}>
                      {[
                        ["Before", selectedVisit.beforePhotoUrl],
                        ["After", selectedVisit.afterPhotoUrl],
                      ].map(([label, uri]) =>
                        uri ? (
                          <View key={label} style={styles.visitPhotoTile}>
                            <Image
                              source={{ uri }}
                              style={styles.visitPhoto}
                              resizeMode="cover"
                              accessibilityLabel={`${label} site photo`}
                            />
                            <Text style={styles.visitPhotoLabel}>{label}</Text>
                          </View>
                        ) : null,
                      )}
                    </View>
                  ) : (
                    <Text style={styles.visitModalEmptyPhotos}>
                      No site photos were submitted.
                    </Text>
                  )}
                </>
              ) : null}
            </ScrollView>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

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
    paddingTop: 10,
    paddingBottom: 30,
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
    fontSize: 9,
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
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "900",
    marginTop: 20,
    maxWidth: "94%",
  },
  heroSubtitle: {
    color: "rgba(255,255,255,0.78)",
    fontSize: 10,
    lineHeight: 15,
    fontWeight: "600",
    marginTop: 8,
    maxWidth: "96%",
  },
  heroStatsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 18,
  },
  heroStatCard: {
    flex: 1,
    borderRadius: 12,
    padding: 10,
    backgroundColor: "rgba(255,255,255,0.13)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
  heroStatValue: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "900",
  },
  heroStatLabel: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 8.75,
    fontWeight: "700",
    marginTop: 3,
  },
  statsGrid: {
    flexDirection: "row",
    gap: 8,
    marginTop: 14,
    marginBottom: 14,
  },
  statCard: {
    flex: 1,
    minHeight: 105,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.08,
    shadowRadius: 13,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  statIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  statValue: {
    fontSize: 15,
    fontWeight: "900",
  },
  statLabel: {
    color: COLORS.muted,
    fontSize: 8.75,
    lineHeight: 13,
    fontWeight: "800",
    marginTop: 2,
  },
  toolbarCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.07,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 7 },
    elevation: 3,
    marginBottom: 16,
  },
  searchBox: {
    minHeight: 44,
    borderRadius: 13,
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 11,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: COLORS.text,
    fontSize: 10,
    fontWeight: "700",
    paddingVertical: 0,
  },
  filterList: {
    gap: 8,
    paddingTop: 11,
  },
  filterChip: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  filterChipActive: {
    backgroundColor: COLORS.brand,
    borderColor: COLORS.brand,
  },
  filterText: {
    color: COLORS.muted,
    fontSize: 9,
    fontWeight: "900",
  },
  filterTextActive: {
    color: "#FFFFFF",
  },
  filterCount: {
    color: COLORS.muted,
    fontSize: 9,
    fontWeight: "900",
  },
  filterCountActive: {
    color: "#FFFFFF",
  },
  sectionHeader: {
    marginTop: 11,
    marginBottom: 11,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionEyebrow: {
    color: COLORS.brand,
    fontSize: 9,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 3,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "900",
  },
  refreshButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },
  stateCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 28,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  stateIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: COLORS.blueSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  stateIconWrapDanger: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: COLORS.dangerSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  stateTitle: {
    color: COLORS.text,
    fontSize: 11,
    fontWeight: "900",
    marginTop: 10,
  },
  stateText: {
    color: COLORS.muted,
    fontSize: 10,
    lineHeight: 15,
    textAlign: "center",
    fontWeight: "600",
    marginTop: 5,
  },
  retryButton: {
    marginTop: 14,
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: COLORS.brand,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "900",
  },
  serviceCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    padding: 14,
    paddingTop: 15,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: "hidden",
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.09,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  cardTouchTarget: {
    borderRadius: 18,
  },
  listRowCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 7 },
    elevation: 3,
  },
  listRowTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  listRowIdentity: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  listAvatarWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: COLORS.blueSoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  listAvatarText: {
    color: COLORS.brand,
    fontSize: 11,
    fontWeight: "900",
  },
  listRowTextWrap: {
    flex: 1,
  },
  listUserName: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: "900",
  },
  listConsumerText: {
    color: COLORS.muted,
    fontSize: 9.5,
    lineHeight: 14,
    fontWeight: "700",
    marginTop: 3,
  },
  listStatusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 999,
    gap: 5,
  },
  listStatusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  listStatusText: {
    fontSize: 8.5,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  listRowMeta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  listMetaText: {
    color: COLORS.muted,
    fontSize: 9,
    fontWeight: "800",
  },
  listServiceBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    maxWidth: "68%",
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  listServiceBadgeText: {
    fontSize: 8.5,
    fontWeight: "900",
    flexShrink: 1,
  },
  listDetailsButton: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 12,
    paddingVertical: 10,
    backgroundColor: COLORS.blueSoft,
    borderWidth: 1,
    borderColor: "rgba(101,126,234,0.18)",
  },
  listDetailsButtonText: {
    color: COLORS.brand,
    fontSize: 10,
    fontWeight: "900",
  },
  behaviorCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.07,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 7 },
    elevation: 3,
  },
  behaviorHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  behaviorHeaderText: {
    flex: 1,
  },
  behaviorTitle: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: "900",
  },
  behaviorSubtitle: {
    color: COLORS.muted,
    fontSize: 9,
    fontWeight: "600",
    marginTop: 4,
  },
  currentBehaviorBadge: {
    alignItems: "flex-end",
    borderRadius: 11,
    backgroundColor: COLORS.surfaceAlt,
    paddingHorizontal: 9,
    paddingVertical: 7,
  },
  currentBehaviorLabel: {
    color: COLORS.faint,
    fontSize: 7.5,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  currentBehaviorValue: {
    color: COLORS.brand,
    fontSize: 9,
    fontWeight: "900",
    marginTop: 2,
  },
  behaviorOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 13,
  },
  behaviorOption: {
    width: "48%",
    minHeight: 40,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 9,
    borderRadius: 11,
    borderWidth: 1,
  },
  behaviorOptionSelected: {
    borderWidth: 2,
  },
  behaviorOptionText: {
    fontSize: 9,
    fontWeight: "900",
  },
  saveBehaviorButton: {
    minHeight: 40,
    borderRadius: 12,
    backgroundColor: COLORS.brand,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    marginTop: 12,
  },
  saveBehaviorText: {
    color: "#FFFFFF",
    fontSize: 9.5,
    fontWeight: "900",
  },
  behaviorHistory: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 8,
  },
  behaviorHistoryTitle: {
    color: COLORS.muted,
    fontSize: 8,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  behaviorHistoryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  behaviorHistoryValue: {
    color: COLORS.text,
    fontSize: 9,
    fontWeight: "900",
  },
  behaviorHistoryMeta: {
    color: COLORS.faint,
    fontSize: 8,
    fontWeight: "700",
    flexShrink: 1,
    textAlign: "right",
  },
  serviceAccentRail: {
    position: "absolute",
    left: 0,
    top: 14,
    bottom: 14,
    width: 4,
    borderTopRightRadius: 999,
    borderBottomRightRadius: 999,
  },
  serviceTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  userBlock: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: COLORS.blueSoft,
    marginRight: 10,
  },
  avatarFallback: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: COLORS.blueSoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  avatarInitials: {
    color: COLORS.blue,
    fontSize: 11,
    fontWeight: "900",
  },
  userTextWrap: {
    flex: 1,
  },
  userName: {
    color: COLORS.text,
    fontSize: 11,
    fontWeight: "900",
  },
  userMeta: {
    color: COLORS.muted,
    fontSize: 9,
    lineHeight: 13,
    fontWeight: "700",
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  statusBadgeText: {
    fontSize: 8.25,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  servicePanel: {
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 15,
    padding: 12,
    marginTop: 13,
    borderWidth: 1,
    borderColor: "#EDF2F7",
    flexDirection: "row",
    alignItems: "center",
  },
  serviceIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  serviceTextWrap: {
    flex: 1,
  },
  serviceName: {
    color: COLORS.text,
    fontSize: 11,
    fontWeight: "900",
  },
  serviceSubText: {
    color: COLORS.muted,
    fontSize: 9,
    lineHeight: 13,
    fontWeight: "700",
    marginTop: 3,
  },
  detailGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 11,
  },
  visitDatesSection: {
    marginTop: 13,
    borderRadius: 14,
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
  },
  visitDatesHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  visitDatesTitle: {
    color: COLORS.text,
    fontSize: 10,
    fontWeight: "900",
  },
  visitCountBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 999,
    backgroundColor: COLORS.blueSoft,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  visitCountBadgeText: {
    color: COLORS.brand,
    fontSize: 9,
    fontWeight: "900",
  },
  visitTable: {
    borderColor: COLORS.border,
    borderRadius: 10,
    borderWidth: 1,
    overflow: "hidden",
  },
  visitTableHeader: {
    alignItems: "center",
    backgroundColor: "#EDF3F8",
    flexDirection: "row",
    minHeight: 34,
    paddingHorizontal: 9,
  },
  visitTableHeading: {
    color: COLORS.muted,
    fontSize: 8,
    fontWeight: "900",
    lineHeight: 11,
    textTransform: "uppercase",
  },
  scheduleColumn: {
    width: "33%",
    paddingRight: 4,
  },
  serviceDateColumn: {
    width: "33%",
    paddingRight: 4,
  },
  visitStatusColumn: {
    flex: 1,
  },
  visitStatusWrap: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  visitTableRow: {
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderTopColor: COLORS.border,
    borderTopWidth: 1,
    flexDirection: "row",
    minHeight: 37,
    paddingHorizontal: 9,
  },
  visitOpenIcon: { marginLeft: 5 },
  visitTableCell: {
    color: COLORS.text,
    fontSize: 8.5,
    fontWeight: "700",
    lineHeight: 12,
  },
  visitDateUnavailable: {
    color: COLORS.faint,
    fontWeight: "500",
  },
  visitStatusBadge: {
    borderRadius: 999,
    fontSize: 7.5,
    fontWeight: "900",
    overflow: "hidden",
    paddingHorizontal: 6,
    paddingVertical: 4,
    textAlign: "center",
  },
  visitCompletedBadge: {
    backgroundColor: COLORS.successSoft,
    color: COLORS.success,
  },
  visitPendingBadge: {
    backgroundColor: COLORS.amberSoft,
    color: "#A16207",
  },
  emptyVisitText: {
    color: COLORS.muted,
    fontSize: 9,
    fontWeight: "700",
  },
  visitModalOverlay: {
    alignItems: "center",
    backgroundColor: "rgba(15, 23, 42, 0.56)",
    flex: 1,
    justifyContent: "center",
    padding: 18,
  },
  visitModalCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    maxHeight: "86%",
    maxWidth: 460,
    overflow: "hidden",
    padding: 18,
    width: "100%",
  },
  visitModalHeader: {
    alignItems: "center",
    borderBottomColor: COLORS.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingBottom: 13,
  },
  visitModalTitleWrap: { flex: 1 },
  visitModalEyebrow: {
    color: COLORS.brand,
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 1.2,
  },
  visitModalTitle: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: "900",
    marginTop: 3,
  },
  visitModalClose: {
    alignItems: "center",
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 18,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  visitModalContent: { paddingBottom: 4 },
  visitModalLoading: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    paddingVertical: 11,
  },
  visitModalLoadingText: {
    color: COLORS.muted,
    fontSize: 10,
    fontWeight: "700",
  },
  visitModalError: {
    alignItems: "center",
    backgroundColor: COLORS.dangerSoft,
    borderRadius: 9,
    flexDirection: "row",
    gap: 7,
    marginTop: 10,
    padding: 9,
  },
  visitModalErrorText: {
    color: COLORS.danger,
    flex: 1,
    fontSize: 10,
    lineHeight: 15,
  },
  visitModalConsumer: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "900",
    marginTop: 14,
  },
  visitModalService: {
    color: COLORS.brand,
    fontSize: 11,
    fontWeight: "700",
    marginTop: 3,
  },
  visitModalInfoGrid: {
    backgroundColor: COLORS.surfaceAlt,
    borderColor: COLORS.border,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 14,
    paddingHorizontal: 10,
  },
  visitModalInfoCell: {
    minHeight: 52,
    paddingVertical: 9,
    width: "50%",
  },
  visitModalLabel: {
    color: COLORS.muted,
    fontSize: 8,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  visitModalValue: {
    color: COLORS.text,
    fontSize: 10,
    fontWeight: "800",
    marginTop: 4,
  },
  visitResponsePanel: {
    backgroundColor: COLORS.cyanSoft,
    borderRadius: 11,
    marginBottom: 14,
    marginTop: 14,
    padding: 12,
  },
  visitResponseTitle: {
    color: COLORS.text,
    fontSize: 11,
    fontWeight: "900",
    marginBottom: 6,
  },
  visitResponseText: {
    color: COLORS.muted,
    fontSize: 10,
    lineHeight: 16,
  },
  visitPhotoRow: { flexDirection: "row", gap: 10, marginTop: 4 },
  visitPhotoTile: { flex: 1 },
  visitPhoto: {
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 10,
    height: 130,
    width: "100%",
  },
  visitPhotoLabel: {
    color: COLORS.muted,
    fontSize: 9,
    fontWeight: "800",
    marginTop: 5,
    textAlign: "center",
  },
  visitModalEmptyPhotos: {
    color: COLORS.muted,
    fontSize: 10,
    marginTop: 2,
  },
  dateModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.55)",
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  dateModalCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingTop: 16,
    paddingBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  dateModalTitle: {
    color: COLORS.text,
    fontSize: 11,
    fontWeight: "900",
    marginBottom: 8,
    textAlign: "center",
  },
  dateModalActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
  },
  dateModalCancel: {
    flex: 1,
    minHeight: 42,
    borderRadius: 12,
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },
  dateModalCancelText: {
    color: COLORS.muted,
    fontSize: 10,
    fontWeight: "900",
  },
  dateModalConfirm: {
    flex: 1,
    minHeight: 42,
    borderRadius: 12,
    backgroundColor: COLORS.brand,
    alignItems: "center",
    justifyContent: "center",
  },
  dateModalConfirmText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "900",
  },
  detailPill: {
    width: "48.5%",
    minHeight: 50,
    borderRadius: 13,
    paddingHorizontal: 10,
    paddingVertical: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  detailPillTextWrap: {
    flex: 1,
  },
  detailPillValue: {
    fontSize: 9.5,
    fontWeight: "900",
    textTransform: "capitalize",
  },
  detailPillLabel: {
    color: COLORS.muted,
    fontSize: 8.25,
    fontWeight: "800",
    marginTop: 1,
  },
  blockReasonBox: {
    marginTop: 11,
    borderRadius: 13,
    backgroundColor: COLORS.dangerSoft,
    padding: 10,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 7,
  },
  blockReasonText: {
    flex: 1,
    color: COLORS.danger,
    fontSize: 9.5,
    lineHeight: 14,
    fontWeight: "700",
  },
  paymentPendingBox: {
    marginTop: 11,
    borderRadius: 13,
    backgroundColor: COLORS.amberSoft,
    padding: 10,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 7,
  },
  paymentPendingText: {
    flex: 1,
    color: COLORS.amber,
    fontSize: 9.5,
    lineHeight: 14,
    fontWeight: "700",
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginTop: 13,
  },
  updatedTextWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  updatedText: {
    color: COLORS.faint,
    fontSize: 9,
    fontWeight: "800",
  },
  blockButton: {
    minHeight: 40,
    borderRadius: 13,
    backgroundColor: COLORS.dangerSoft,
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.16)",
    paddingHorizontal: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  blockButtonText: {
    color: COLORS.danger,
    fontSize: 10,
    fontWeight: "900",
  },
  unblockButton: {
    minHeight: 40,
    borderRadius: 13,
    backgroundColor: COLORS.success,
    paddingHorizontal: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  unblockButtonText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "900",
  },
  disabledButton: {
    opacity: 0.7,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.62)",
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  blockModalCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    overflow: "hidden",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    color: COLORS.text,
    fontSize: 11,
    fontWeight: "900",
  },
  modalSubtitle: {
    color: COLORS.muted,
    fontSize: 10,
    lineHeight: 15,
    fontWeight: "700",
    marginTop: 4,
    maxWidth: 260,
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: COLORS.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  blockTargetBox: {
    margin: 14,
    marginBottom: 0,
    borderRadius: 14,
    backgroundColor: COLORS.dangerSoft,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  blockTargetTextWrap: {
    flex: 1,
  },
  blockTargetTitle: {
    color: COLORS.text,
    fontSize: 11,
    fontWeight: "900",
  },
  blockTargetSubtitle: {
    color: COLORS.muted,
    fontSize: 9,
    fontWeight: "700",
    marginTop: 2,
  },
  blockInput: {
    minHeight: 104,
    marginHorizontal: 14,
    marginTop: 12,
    borderRadius: 14,
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: COLORS.border,
    color: COLORS.text,
    fontSize: 11,
    lineHeight: 16,
    fontWeight: "700",
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  modalActions: {
    flexDirection: "row",
    gap: 10,
    padding: 14,
  },
  modalCancelButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 14,
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },
  modalCancelText: {
    color: COLORS.muted,
    fontSize: 11,
    fontWeight: "900",
  },
  modalConfirmButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 14,
    backgroundColor: COLORS.danger,
    alignItems: "center",
    justifyContent: "center",
  },
  modalConfirmText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "900",
  },
  backHeader: {
    marginBottom: 12,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignSelf: "flex-start",
  },
  backButtonText: {
    color: COLORS.brand,
    fontSize: 11,
    fontWeight: "900",
  },
  categoryCard: {
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: "hidden",
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
    backgroundColor: COLORS.surface,
    position: "relative",
  },
  categoryAccent: {
    position: "absolute",
    left: 0,
    top: 16,
    bottom: 16,
    width: 4,
    borderTopRightRadius: 999,
    borderBottomRightRadius: 999,
    backgroundColor: COLORS.brand,
  },
  categoryContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: 10,
  },
  categoryIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surfaceAlt,
  },
  categoryTextWrap: {
    flex: 1,
  },
  categoryName: {
    color: COLORS.text,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "900",
  },
  categoryCount: {
    color: COLORS.muted,
    fontSize: 11,
    fontWeight: "700",
    marginTop: 3,
  },
  categoryArrow: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: COLORS.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },
});
