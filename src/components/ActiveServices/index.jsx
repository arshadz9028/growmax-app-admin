import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import {
    ActivityIndicator,
    Alert,
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
const updateUserServiceApiPath = (userId, serviceId) =>
  `/api/admin/users/${userId}/services/${serviceId}`;

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

function isServiceActive(service) {
  const status = String(
    service?.status || service?.serviceStatus || "",
  ).toLowerCase();
  const blockedFlag =
    service?.blocked === true ||
    service?.blocked === "true" ||
    status === "blocked";
  const inactiveFlag =
    service?.active === false ||
    service?.active === "false" ||
    status === "inactive";

  if (blockedFlag || inactiveFlag) {
    return false;
  }

  return true;
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

function formatDate(value) {
  if (!value) {
    return "Not available";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function shortId(value) {
  const id = String(value || "");
  return id.length > 8 ? `${id.slice(0, 4)}...${id.slice(-4)}` : id || "N/A";
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

function ServiceCard({
  user,
  service,
  serviceIndex,
  processingKey,
  onBlock,
  onUnblock,
}) {
  const userId = getUserId(user);
  const serviceId = getServiceId(service, serviceIndex);
  const active = isServiceActive(service);
  const actionKey = `${userId}-${serviceId}`;
  const isProcessing = processingKey === actionKey;
  const serviceAccent = active ? COLORS.success : COLORS.danger;
  const serviceSoft = active ? COLORS.successSoft : COLORS.dangerSoft;

  return (
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
          icon="key-outline"
          label="User ID"
          value={shortId(userId)}
          accent={COLORS.brand}
          soft="#E8F4F7"
        />
        <DetailPill
          icon="finger-print-outline"
          label="Service ID"
          value={shortId(serviceId)}
          accent={COLORS.blue}
          soft={COLORS.blueSoft}
        />
        <DetailPill
          icon="log-in-outline"
          label="Provider"
          value={user?.provider || "local"}
          accent={COLORS.cyan}
          soft={COLORS.cyanSoft}
        />
        <DetailPill
          icon="calendar-outline"
          label="Joined"
          value={formatDate(user?.createdAt)}
          accent={COLORS.amber}
          soft={COLORS.amberSoft}
        />
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

      setUsers(normalizeUsers(payload));
    } catch (error) {
      setErrorMessage(error?.message || "Unable to load users.");
      setUsers([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  React.useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const serviceRows = React.useMemo(() => {
    return users.flatMap((user) =>
      getServiceList(user).map((service, serviceIndex) => ({
        user,
        service,
        serviceIndex,
        active: isServiceActive(service),
      })),
    );
  }, [users]);

  const counts = React.useMemo(() => {
    const active = serviceRows.filter((item) => item.active).length;
    const blocked = serviceRows.length - active;

    return {
      all: serviceRows.length,
      active,
      blocked,
      users: users.length,
    };
  }, [serviceRows, users.length]);

  const filteredRows = React.useMemo(() => {
    const query = searchText.trim().toLowerCase();

    return serviceRows.filter(({ user, service, active }) => {
      if (activeFilter === "active" && !active) {
        return false;
      }

      if (activeFilter === "blocked" && active) {
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
  }, [activeFilter, searchText, serviceRows]);

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

    try {
      const response = await safeFetch(
        getApiUrl(updateUserServiceApiPath(userId, serviceId)),
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            active,
            blocked: !active,
            serviceStatus: active ? "active" : "blocked",
            blockReason: active ? "" : reason,
            blockedAt: active ? null : new Date().toISOString(),
            unblockedAt: active ? new Date().toISOString() : null,
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

                return {
                  ...currentService,
                  active,
                  blocked: !active,
                  serviceStatus: active ? "active" : "blocked",
                  blockReason: active ? "" : reason,
                };
              },
            ),
          };
        }),
      );

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
      active: false,
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
              <Text style={styles.heroBadgeText}>Active User's Services</Text>
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

        <View style={styles.toolbarCard}>
          <View style={styles.searchBox}>
            <Ionicons name="search-outline" size={17} color={COLORS.faint} />
            <TextInput
              value={searchText}
              onChangeText={setSearchText}
              placeholder="Search user, email, service, or ID"
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
                count={counts[filter.key]}
                active={activeFilter === filter.key}
                onPress={() => setActiveFilter(filter.key)}
              />
            ))}
          </ScrollView>
        </View>

        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionEyebrow}>Service directory</Text>
            <Text style={styles.sectionTitle}>Purchased services by user</Text>
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
              <Ionicons
                name="warning-outline"
                size={24}
                color={COLORS.danger}
              />
            </View>
            <Text style={styles.stateTitle}>Could not load services</Text>
            <Text style={styles.stateText}>{errorMessage}</Text>
            <Pressable style={styles.retryButton} onPress={() => fetchUsers()}>
              <Text style={styles.retryButtonText}>Try again</Text>
            </Pressable>
          </View>
        ) : filteredRows.length === 0 ? (
          <View style={styles.stateCard}>
            <View style={styles.stateIconWrap}>
              <Ionicons
                name="file-tray-outline"
                size={24}
                color={COLORS.brand}
              />
            </View>
            <Text style={styles.stateTitle}>No services found</Text>
            <Text style={styles.stateText}>
              Adjust your search or filter to view matching user services.
            </Text>
          </View>
        ) : (
          filteredRows.map(({ user, service, serviceIndex }) => (
            <ServiceCard
              key={`${getUserId(user)}-${getServiceId(service, serviceIndex)}`}
              user={user}
              service={service}
              serviceIndex={serviceIndex}
              processingKey={processingKey}
              onBlock={openBlockModal}
              onUnblock={handleUnblock}
            />
          ))
        )}
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
    fontSize: 15,
    fontWeight: "900",
  },
  heroStatLabel: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 9.5,
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
    fontSize: 18,
    fontWeight: "900",
  },
  statLabel: {
    color: COLORS.muted,
    fontSize: 9.5,
    lineHeight: 14,
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
    fontSize: 11,
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
    fontSize: 10,
    fontWeight: "900",
  },
  filterTextActive: {
    color: "#FFFFFF",
  },
  filterCount: {
    color: COLORS.muted,
    fontSize: 10,
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
    fontSize: 10,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 3,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 15,
    lineHeight: 21,
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
    fontSize: 14,
    fontWeight: "900",
    marginTop: 10,
  },
  stateText: {
    color: COLORS.muted,
    fontSize: 11,
    lineHeight: 17,
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
    fontSize: 11,
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
    fontSize: 12,
    fontWeight: "900",
  },
  userTextWrap: {
    flex: 1,
  },
  userName: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "900",
  },
  userMeta: {
    color: COLORS.muted,
    fontSize: 10,
    lineHeight: 15,
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
    fontSize: 9,
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
    fontSize: 13,
    fontWeight: "900",
  },
  serviceSubText: {
    color: COLORS.muted,
    fontSize: 10,
    lineHeight: 15,
    fontWeight: "700",
    marginTop: 3,
  },
  detailGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 11,
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
    fontSize: 10.5,
    fontWeight: "900",
    textTransform: "capitalize",
  },
  detailPillLabel: {
    color: COLORS.muted,
    fontSize: 9,
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
    fontSize: 10.5,
    lineHeight: 15,
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
    fontSize: 10,
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
    fontSize: 11,
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
    fontSize: 11,
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
    fontSize: 14,
    fontWeight: "900",
  },
  modalSubtitle: {
    color: COLORS.muted,
    fontSize: 11,
    lineHeight: 17,
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
    fontSize: 12,
    fontWeight: "900",
  },
  blockTargetSubtitle: {
    color: COLORS.muted,
    fontSize: 10,
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
    fontSize: 12,
    lineHeight: 18,
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
    fontSize: 12,
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
    fontSize: 12,
    fontWeight: "900",
  },
});
