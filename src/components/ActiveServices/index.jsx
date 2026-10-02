/* eslint-disable react-hooks/set-state-in-effect */
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import {
  ActivityIndicator,
  Alert,
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
import CalenderVisit from "../CalenderVisit";

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
const updateUserServiceApiPath = (userId, serviceId) =>
  `/api/admin/users/${userId}/services/${serviceId}`;

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

      return {
        index,
        __visitIndex: index,
        value: dateKey,
        dateKey,
        date: value,
        isoDate: toUtcMiddayIso(dateKey),
        id: entry?._id || entry?.id || entry?.visitId || `${index}-${dateKey}`,
      };
    })
    .filter(Boolean);
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

function UserAvatar({ user }) {
  if (user?.photoURL) {
    return <Image source={{ uri: user.photoURL }} style={styles.avatarImage} />;
  }

  return (
    <View style={styles.avatarFallback}>
      <Text style={styles.avatarInitials}>
        {getInitials(user?.username || user?.fullName, user?.email)}
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
  const userName = user?.username || user?.fullName || "Unnamed user";
  const consumerNumber = getConsumerNumber(user, service);
  const serviceName = service?.name || "Purchased service";
  const statusColor = active ? COLORS.success : COLORS.danger;

  return (
    <View style={styles.listRowCard}>
      <View style={styles.listRowTop}>
        <View style={styles.listRowIdentity}>
          <View style={styles.listAvatarWrap}>
            <Text style={styles.listAvatarText}>
              {getInitials(user?.username || user?.fullName, user?.email)}
            </Text>
          </View>

          <View style={styles.listRowTextWrap}>
            <Text style={styles.listUserName} numberOfLines={1}>
              {userName}
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
        <Text style={styles.listMetaText}>{serviceName}</Text>
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

function ServiceCard({
  user,
  service,
  serviceIndex,
  processingKey,
  onBlock,
  onUnblock,
  onPress,
  onEditVisitDate,
}) {
  const userId = getUserId(user);
  const serviceId = getServiceId(service, serviceIndex);
  const active = isServiceActive(service);
  const actionKey = `${userId}-${serviceId}`;
  const isProcessing = processingKey === actionKey;
  const serviceAccent = active ? COLORS.success : COLORS.danger;
  const serviceSoft = active ? COLORS.successSoft : COLORS.dangerSoft;
  const visitDates = React.useMemo(
    () => getVisitDateEntries(service, user),
    [service, user],
  );
  const [calendarEditor, setCalendarEditor] = React.useState(null);
 
  const openVisitCalendar = (visitIndex, currentDate) => {
    const allSelectedVisits = visitDates.map((visit) => ({
      date: visit.dateKey || formatDateKey(visit.date),
      status: "Pending",
      __visitIndex:
        visit.__visitIndex != null
          ? visit.__visitIndex
          : visit.index != null
            ? visit.index
            : undefined,
    }));

    const targetKey = currentDate ? formatDateKey(currentDate) : null;

    const selectedVisits = targetKey
      ? [
          ...allSelectedVisits.filter((visit) => visit.date === targetKey),
          ...allSelectedVisits.filter((visit) => visit.date !== targetKey),
        ]
      : allSelectedVisits;

    setCalendarEditor({
      visitIndex,
      selectedVisits,
    });
  };

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
          <UserAvatar user={user} />
          <View style={styles.userTextWrap}>
            <Text style={styles.userName} numberOfLines={1}>
              {user?.username || user?.fullName || "Unnamed user"}
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

      <View style={styles.servicePanel}>
        <View
          style={[styles.serviceIconWrap, { backgroundColor: serviceSoft }]}
        >
          <Ionicons
            name={active ? "shield-checkmark-outline" : "ban-outline"}
            size={20}
            color={serviceAccent}
          />
        </View>
        <View style={styles.serviceTextWrap}>
          <Text style={styles.serviceName} numberOfLines={1}>
            {service?.name || "Purchased service"}
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
          value={user?.mobileNumber || user?.mobile || "Not available"}
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
          <Text style={styles.visitDatesTitle}>Visit dates</Text>
          <View style={styles.visitCountBadge}>
            <Text style={styles.visitCountBadgeText}>{visitDates.length}</Text>
          </View>
        </View>

        {visitDates.length > 0 ? (
          <View style={styles.visitDatesRow}>
            {visitDates.map((visit) => (
              <Pressable
                key={visit.id}
                style={styles.visitDateChip}
                onPress={() => openVisitCalendar(visit.index, visit.date)}
              >
                <Ionicons
                  name="calendar-outline"
                  size={13}
                  color={COLORS.brand}
                />
                <Text style={styles.visitDateText}>
                  {formatDate(visit.date)}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : (
          <Text style={styles.emptyVisitText}>No visit dates added</Text>
        )}
        <Text style={styles.visitDatesHint}>Tap a visit date to edit it.</Text>
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

        {active ? (
          <Pressable
            style={[styles.blockButton, isProcessing && styles.disabledButton]}
            onPress={() => onBlock(user, service, serviceIndex)}
            disabled={Boolean(processingKey)}
          >
            {isProcessing ? (
              <ActivityIndicator color={COLORS.danger} size="small" />
            ) : (
              <Ionicons name="ban-outline" size={16} color={COLORS.danger} />
            )}
            <Text style={styles.blockButtonText}>Block</Text>
          </Pressable>
        ) : (
          <Pressable
            style={[
              styles.unblockButton,
              isProcessing && styles.disabledButton,
            ]}
            onPress={() => onUnblock(user, service, serviceIndex)}
            disabled={Boolean(processingKey)}
          >
            {isProcessing ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Ionicons
                name="checkmark-circle-outline"
                size={16}
                color="#FFFFFF"
              />
            )}
            <Text style={styles.unblockButtonText}>Unblock</Text>
          </Pressable>
        )}
      </View>
    </View>
  );

  if (onPress) {
    return (
      <>
        <Pressable onPress={onPress} style={styles.cardTouchTarget}>
          {cardContent}
        </Pressable>

        <Modal
          visible={Boolean(calendarEditor)}
          transparent
          animationType="fade"
          onRequestClose={() => setCalendarEditor(null)}
        >
          <View style={styles.dateModalOverlay}>
            <View style={styles.dateModalCard}>
              <CalenderVisit
                previousData={{
                  selectedVisits: calendarEditor?.selectedVisits || [],
                  requestId: serviceId,
                  applicationId: serviceId,
                  _id: serviceId,
                }}
                requestId={serviceId}
                onDataChange={({ selectedVisits }) =>
                  setCalendarEditor((current) =>
                    current ? { ...current, selectedVisits } : current,
                  )
                }
                onServerChange={async () => {
                  await onEditVisitDate?.();
                }}
                onModify={async () => {
                  setCalendarEditor(null);
                }}
                submitLabel="Modify"
                showSubmitButton
              />
            </View>
          </View>
        </Modal>
      </>
    );
  }

  return (
    <>
      {cardContent}

      <Modal
        visible={Boolean(calendarEditor)}
        transparent
        animationType="fade"
        onRequestClose={() => setCalendarEditor(null)}
      >
        <View style={styles.dateModalOverlay}>
          <View style={styles.dateModalCard}>
            <CalenderVisit
              previousData={{
                selectedVisits: calendarEditor?.selectedVisits || [],
                requestId: serviceId,
                applicationId: serviceId,
                _id: serviceId,
              }}
              requestId={serviceId}
              onDataChange={({ selectedVisits }) =>
                setCalendarEditor((current) =>
                  current ? { ...current, selectedVisits } : current,
                )
              }
              onServerChange={async () => {
                await onEditVisitDate?.();
              }}
              onModify={async () => {
                setCalendarEditor(null);
              }}
              submitLabel="Modify"
              showSubmitButton
            />
          </View>
        </View>
      </Modal>
    </>
  );
}

export default function AdminActiveUserServices() {
  const [users, setUsers] = React.useState([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState("");
  const [activeFilter, setActiveFilter] = React.useState("all");
  const [searchText, setSearchText] = React.useState("");
  const [processingKey, setProcessingKey] = React.useState("");
  const [blockTarget, setBlockTarget] = React.useState(null);
  const [blockReason, setBlockReason] = React.useState("");
  const [currentView, setCurrentView] = React.useState("categories");
  const [selectedCategory, setSelectedCategory] = React.useState(null);
  const [selectedService, setSelectedService] = React.useState(null);

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

            return {
              ...user,
              service: applications.map((app, index) => ({
                ...app,
                _id: app?._id || app?.id || `service-${index}`,
                name:
                  app?.name ||
                  app?.serviceName ||
                  app?.service?.name ||
                  "Purchased service",
              })),
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
      const serviceName = row?.service?.name || "Other Services";
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
        user?.username,
        user?.fullName,
        user?.email,
        user?.provider,
        service?.name,
        getUserId(user),
        getServiceId(service, 0),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchable.includes(query);
    });
  }, [activeFilter, searchText, selectedCategoryRows]);

  const refreshServiceVisitDates = async (user, service, serviceIndex) => {
    const userId = getUserId(user);
    const serviceId = getServiceId(service, serviceIndex);

    if (!userId || !serviceId) {
      Alert.alert("Missing service", "This service cannot be refreshed.");
      return;
    }

    try {
      // CalenderVisit already writes DELETE/PATCH changes. Never issue a
      // second, differently-shaped PATCH here. Rehydrate from GET instead so
      // Active Services and the open detail card use the MongoDB truth.
      const freshUsers = await fetchUsers({ refreshing: true });
      const freshUser = freshUsers.find(
        (candidate) => getUserId(candidate) === userId,
      );
      const freshService = getServiceList(freshUser).find(
        (candidate, index) => getServiceId(candidate, index) === serviceId,
      );

      if (freshUser && freshService) {
        setSelectedService((current) =>
          current && getUserId(current.user) === userId
            ? {
                ...current,
                user: freshUser,
                service: freshService,
                active: !isServiceBlocked(freshService),
                blocked: isServiceBlocked(freshService),
              }
            : current,
        );
      }
    } catch (error) {
      Alert.alert(
        "Refresh failed",
        error?.message || "Please pull to refresh.",
      );
    }
  };

  const patchService = async ({
    user,
    service,
    serviceIndex,
    active,
    reason = "",
  }) => {
    const userId = getUserId(user);
    const serviceId = getServiceId(service, serviceIndex);

    if (!userId || !serviceId) {
      Alert.alert("Missing record ID", "This service cannot be updated.");
      return;
    }

    const actionKey = `${userId}-${serviceId}`;
    setProcessingKey(actionKey);

    const nextBlocked = !isServiceBlocked(service);

    try {
      const response = await safeFetch(
        getApiUrl(updateUserServiceApiPath(userId, serviceId)),
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            active: true,
            blocked: nextBlocked,
            serviceStatus: nextBlocked ? "blocked" : "active",
            blockReason: nextBlocked ? reason : "",
            blockedAt: nextBlocked ? new Date().toISOString() : null,
            unblockedAt: nextBlocked ? null : new Date().toISOString(),
          }),
        },
      );

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.message || "Unable to update service.");
      }

      setUsers((currentUsers) =>
        currentUsers.map((currentUser) => {
          if (getUserId(currentUser) !== userId) {
            return currentUser;
          }

          return {
            ...currentUser,
            service: getServiceList(currentUser).map(
              (currentService, index) => {
                if (getServiceId(currentService, index) !== serviceId) {
                  return currentService;
                }

                const nextBlocked = !isServiceBlocked(currentService);

                return {
                  ...currentService,
                  active: true,
                  blocked: nextBlocked,
                  serviceStatus: nextBlocked ? "blocked" : "active",
                  blockReason: nextBlocked ? reason : "",
                };
              },
            ),
          };
        }),
      );

      setSelectedService((current) => {
        if (!current || getUserId(current.user) !== userId) {
          return current;
        }

        const nextUser = {
          ...current.user,
          service: getServiceList(current.user).map((currentService, index) => {
            if (getServiceId(currentService, index) !== serviceId) {
              return currentService;
            }

            const nextBlocked = !isServiceBlocked(currentService);

            return {
              ...currentService,
              active: true,
              blocked: nextBlocked,
              serviceStatus: nextBlocked ? "blocked" : "active",
              blockReason: nextBlocked ? reason : "",
            };
          }),
        };

        const nextService = getServiceList(nextUser).find(
          (candidate, index) => getServiceId(candidate, index) === serviceId,
        );

        if (!nextService) {
          return { ...current, user: nextUser };
        }

        return {
          ...current,
          user: nextUser,
          service: nextService,
          active: !isServiceBlocked(nextService),
          blocked: isServiceBlocked(nextService),
        };
      });

      await fetchUsers({ refreshing: true });

      Alert.alert(
        active ? "Service unblocked" : "Service blocked",
        active
          ? "The user can access this service again."
          : "The service has been blocked for this user.",
      );
    } catch (error) {
      Alert.alert("Update failed", error?.message || "Please try again.");
    } finally {
      setProcessingKey("");
      setBlockTarget(null);
      setBlockReason("");
    }
  };

  const openBlockModal = (user, service, serviceIndex) => {
    setBlockTarget({ user, service, serviceIndex });
    setBlockReason("");
  };

  const submitBlock = () => {
    if (!blockTarget) {
      return;
    }

    patchService({
      ...blockTarget,
      active: true,
      reason: blockReason.trim(),
    });
  };

  const handleUnblock = (user, service, serviceIndex) => {
    Alert.alert(
      "Unblock service",
      `Allow access to "${service?.name || "this service"}" again?`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Unblock",
          onPress: () =>
            patchService({
              user,
              service,
              serviceIndex,
              active: true,
            }),
        },
      ],
    );
  };

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
    setCurrentView("detail");
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

        <Text style={styles.heroTitle}>Manage every purchased service.</Text>
        <Text style={styles.heroSubtitle}>
          Review user service access, monitor active and blocked services, and
          restrict access when admin action is required.
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

      <View style={styles.statsGrid}>
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
      </View>

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

    const { user, service, serviceIndex } = selectedService;

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
          serviceIndex={serviceIndex}
          processingKey={processingKey}
          onBlock={openBlockModal}
          onUnblock={handleUnblock}
          onEditVisitDate={async () =>
            refreshServiceVisitDates(user, service, serviceIndex)
          }
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
        visible={Boolean(blockTarget)}
        transparent
        animationType="fade"
        onRequestClose={() => setBlockTarget(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.blockModalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Block service</Text>
                <Text style={styles.modalSubtitle}>
                  Restrict this user from accessing the selected service.
                </Text>
              </View>
              <Pressable
                style={styles.modalCloseButton}
                onPress={() => setBlockTarget(null)}
              >
                <Ionicons name="close" size={18} color={COLORS.text} />
              </Pressable>
            </View>

            <View style={styles.blockTargetBox}>
              <Ionicons name="ban-outline" size={18} color={COLORS.danger} />
              <View style={styles.blockTargetTextWrap}>
                <Text style={styles.blockTargetTitle}>
                  {blockTarget?.service?.name || "Selected service"}
                </Text>
                <Text style={styles.blockTargetSubtitle}>
                  {blockTarget?.user?.username ||
                    blockTarget?.user?.email ||
                    "Selected user"}
                </Text>
              </View>
            </View>

            <TextInput
              value={blockReason}
              onChangeText={setBlockReason}
              placeholder="Reason for blocking, admin note, or missing requirement"
              placeholderTextColor={COLORS.faint}
              multiline
              textAlignVertical="top"
              style={styles.blockInput}
            />

            <View style={styles.modalActions}>
              <Pressable
                style={styles.modalCancelButton}
                onPress={() => setBlockTarget(null)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={styles.modalConfirmButton}
                onPress={submitBlock}
              >
                <Text style={styles.modalConfirmText}>Block service</Text>
              </Pressable>
            </View>
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
  visitDatesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  visitDateChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  visitDateText: {
    color: COLORS.brand,
    fontSize: 9,
    fontWeight: "800",
  },
  emptyVisitText: {
    color: COLORS.muted,
    fontSize: 9,
    fontWeight: "700",
  },
  visitDatesHint: {
    color: COLORS.faint,
    fontSize: 8.5,
    fontWeight: "700",
    marginTop: 10,
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
