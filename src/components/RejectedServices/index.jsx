/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable react-hooks/exhaustive-deps */
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

const REJECTED_REQUESTS_API = "/api/admin/request?status=cancelled";
const UPDATE_REQUEST_API = (id) => `/api/admin/request/${id}`;

const FILTERS = [
  { key: "all", label: "All" },
  { key: "grow-cleaning", label: "Solar Cleaning" },
  { key: "solar-amc", label: "Solar AMC" },
];

function formatDate(value) {
  if (!value) return "Not available";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Not available";
  return parsed.toLocaleDateString("en-IN", {
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

function ServiceListRow({ request, onViewDetails }) {
  const serviceName = request?.serviceName || request?.requestType || "Service";
  const fullName = request?.fullName || request?.consumerName || "Unknown";
  const email = request?.email || "No email";
  const consumerNumber = request?.consumerNumber || request?.consumerNo || "N/A";

  return (
    <View style={styles.listRowCard}>
      <View style={styles.listRowTop}>
        <View style={styles.listRowIdentity}>
          <View style={styles.listAvatarWrap}>
            <Text style={styles.listAvatarText}>
              {getInitials(fullName, email)}
            </Text>
          </View>

          <View style={styles.listRowTextWrap}>
            <Text style={styles.listUserName} numberOfLines={1}>
              {fullName}
            </Text>
            <Text style={styles.listConsumerText} numberOfLines={1}>
              Consumer no: {consumerNumber}
            </Text>
          </View>
        </View>

        <View style={[styles.listStatusBadge, { backgroundColor: COLORS.dangerSoft }]}>
          <View style={[styles.listStatusDot, { backgroundColor: COLORS.danger }]} />
          <Text style={[styles.listStatusText, { color: COLORS.danger }]}>
            Rejected
          </Text>
        </View>
      </View>

      <View style={styles.listRowMeta}>
        <Text style={styles.listMetaText}>{serviceName}</Text>
        <Text style={styles.listMetaText} numberOfLines={1}>
          {request?.rejectionReason || "No reason provided"}
        </Text>
      </View>

      <Pressable style={styles.listDetailsButton} onPress={onViewDetails}>
        <Text style={styles.listDetailsButtonText}>View details</Text>
        <Ionicons name="chevron-forward" size={16} color={COLORS.brand} />
      </Pressable>
    </View>
  );
}

function ServiceCard({ request, onReactivate, onDelete, onViewDetails, isProcessing }) {
  const serviceName = request?.serviceName || request?.requestType || "Service";
  const fullName = request?.fullName || "Unknown";
  const email = request?.email || "No email";
  const consumerNumber = request?.consumerNumber || request?.consumerNo || "N/A";
  const rejectionReason = request?.rejectionReason || "No reason provided";
  
  // Only make card pressable if onViewDetails is provided and not an empty function
  const isClickable = onViewDetails && onViewDetails.toString() !== "() => {}";
  const CardWrapper = isClickable ? Pressable : View;
  const cardProps = isClickable ? { onPress: () => onViewDetails(request) } : {};

  return (
    <CardWrapper {...cardProps} style={styles.serviceCard}>
      <View style={[styles.serviceAccentRail, { backgroundColor: COLORS.danger }]} />
      <TextureLines />

      <View style={styles.serviceTopRow}>
        <View style={styles.userBlock}>
          <View style={styles.avatarFallback}>
            <Text style={styles.avatarInitials}>
              {getInitials(fullName, email)}
            </Text>
          </View>
          <View style={styles.userTextWrap}>
            <Text style={styles.userName} numberOfLines={1}>
              {fullName}
            </Text>
            <Text style={styles.userMeta} numberOfLines={1}>
              {email}
            </Text>
          </View>
        </View>

        <View style={[styles.statusBadge, { backgroundColor: COLORS.dangerSoft }]}>
          <View style={[styles.statusDot, { backgroundColor: COLORS.danger }]} />
          <Text style={[styles.statusBadgeText, { color: COLORS.danger }]}>
            Rejected
          </Text>
        </View>
      </View>

      <View style={styles.servicePanel}>
        <View style={[styles.serviceIconWrap, { backgroundColor: COLORS.dangerSoft }]}>
          <Ionicons name="close-circle-outline" size={20} color={COLORS.danger} />
        </View>
        <View style={styles.serviceTextWrap}>
          <Text style={styles.serviceName} numberOfLines={1}>
            {serviceName}
          </Text>
          <Text style={styles.serviceSubText}>
            Consumer no: {consumerNumber}
          </Text>
        </View>
      </View>

      <View style={styles.detailGrid}>
        <DetailPill
          icon="key-outline"
          label="Request ID"
          value={shortId(request?._id)}
          accent={COLORS.brand}
          soft="#E8F4F7"
        />
        <DetailPill
          icon="cash-outline"
          label="Amount"
          value={`₹${request?.totalAmount || 0}`}
          accent={COLORS.success}
          soft={COLORS.successSoft}
        />
        <DetailPill
          icon="solar-panel-outline"
          label="Panels"
          value={String(request?.numberOfPanels || 0)}
          accent={COLORS.blue}
          soft={COLORS.blueSoft}
        />
        <DetailPill
          icon="calendar-outline"
          label="Rejected"
          value={formatDate(request?.rejectedAt || request?.updatedAt)}
          accent={COLORS.danger}
          soft={COLORS.dangerSoft}
        />
      </View>

      <View style={styles.rejectionReasonBox}>
        <Ionicons name="information-circle-outline" size={16} color={COLORS.danger} />
        <View style={styles.rejectionReasonTextWrap}>
          <Text style={styles.rejectionReasonLabel}>Rejection Reason</Text>
          <Text style={styles.rejectionReasonText}>{rejectionReason}</Text>
        </View>
      </View>

      <View style={styles.cardFooter}>
        <View style={styles.updatedTextWrap}>
          <Ionicons name="time-outline" size={14} color={COLORS.faint} />
          <Text style={styles.updatedText}>
            Updated {formatDate(request?.updatedAt)}
          </Text>
        </View>

        <View style={styles.actionButtonsRow}>
          <Pressable
            style={[styles.deleteButton, isProcessing && styles.disabledButton]}
            onPress={() => onDelete(request)}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Ionicons name="trash-outline" size={16} color="#FFFFFF" />
            )}
          </Pressable>

          <Pressable
            style={[styles.reactivateButton, isProcessing && styles.disabledButton]}
            onPress={() => onReactivate(request)}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Ionicons name="refresh-outline" size={16} color="#FFFFFF" />
            )}
            <Text style={styles.reactivateButtonText}>Reactivate</Text>
          </Pressable>
        </View>
      </View>
    </CardWrapper>
  );
}

export default function RejectedServices() {
  const [requests, setRequests] = React.useState([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState("");
  const [activeFilter, setActiveFilter] = React.useState("all");
  const [searchText, setSearchText] = React.useState("");
  const [processingId, setProcessingId] = React.useState("");
  const [selectedRequest, setSelectedRequest] = React.useState(null);

  const fetchRequests = React.useCallback(async ({ refreshing = false } = {}) => {
    if (refreshing) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    setErrorMessage("");

    try {
      const response = await safeFetch(getApiUrl(REJECTED_REQUESTS_API), {
        method: "GET",
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.message || "Unable to load rejected services.");
      }

      const data = Array.isArray(payload?.data) ? payload.data : [];
      setRequests(data);
    } catch (error) {
      setErrorMessage(error?.message || "Unable to load rejected services.");
      setRequests([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  React.useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const counts = React.useMemo(() => {
    const all = requests.length;
    const growCleaning = requests.filter(
      (r) => r.requestType === "grow-cleaning"
    ).length;
    const solarAMC = requests.filter((r) => r.requestType === "solar-amc").length;

    return { all, growCleaning, solarAMC };
  }, [requests]);

  const filteredRequests = React.useMemo(() => {
    const query = searchText.trim().toLowerCase();

    return requests.filter((request) => {
      if (activeFilter !== "all" && request.requestType !== activeFilter) {
        return false;
      }

      if (!query) return true;

      const searchable = [
        request?.fullName,
        request?.email,
        request?.mobileNumber,
        request?.consumerNumber,
        request?.consumerNo,
        request?.serviceName,
        request?._id,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchable.includes(query);
    });
  }, [activeFilter, searchText, requests]);

  const handleReactivate = (request) => {
    Alert.alert(
      "Reactivate Service",
      `Move "${request?.serviceName || "this service"}" back to approved services?`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Reactivate",
          onPress: () => submitReactivate(request),
        },
      ]
    );
  };

  const handleDelete = (request) => {
    Alert.alert(
      "Delete Service",
      `Are you sure you want to permanently delete "${request?.serviceName || "this service"}"? This action cannot be undone.`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => submitDelete(request),
        },
      ]
    );
  };

  const submitReactivate = async (request) => {
    setProcessingId(request._id);

    try {
      const response = await safeFetch(
        getApiUrl(UPDATE_REQUEST_API(request._id)),
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: "contacted",
            rejectionReason: "",
            reactivatedAt: new Date().toISOString(),
          }),
        }
      );

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.message || "Unable to reactivate service.");
      }

      await fetchRequests({ refreshing: true });

      Alert.alert(
        "Service reactivated",
        "The service has been moved to approved services."
      );
    } catch (error) {
      Alert.alert("Reactivation failed", error?.message || "Please try again.");
    } finally {
      setProcessingId("");
    }
  };

  const submitDelete = async (request) => {
    setProcessingId(request._id);

    try {
      const response = await safeFetch(
        getApiUrl(UPDATE_REQUEST_API(request._id)),
        {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
        }
      );

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.message || "Unable to delete service.");
      }

      await fetchRequests({ refreshing: true });

      Alert.alert(
        "Service deleted",
        "The service has been permanently deleted."
      );
    } catch (error) {
      Alert.alert("Deletion failed", error?.message || "Please try again.");
    } finally {
      setProcessingId("");
    }
  };

  const handleViewDetails = (request) => {
    setSelectedRequest(request);
  };

  const handleBackToList = () => {
    setSelectedRequest(null);
  };

  React.useEffect(() => {
    const onHardwareBackPress = () => {
      if (selectedRequest) {
        handleBackToList();
        return true;
      }
      return false;
    };

    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      onHardwareBackPress
    );

    return () => subscription.remove();
  }, [selectedRequest]);

  if (selectedRequest) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.brandDark} />

        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.backHeader}>
            <Pressable style={styles.backButton} onPress={handleBackToList}>
              <Ionicons name="arrow-back" size={20} color={COLORS.brand} />
              <Text style={styles.backButtonText}>Back to list</Text>
            </Pressable>
          </View>

          <ServiceCard
            request={selectedRequest}
            onReactivate={handleReactivate}
            onDelete={handleDelete}
            onViewDetails={() => {}}
            isProcessing={processingId === selectedRequest._id}
          />

          {/* Additional details */}
          <View style={styles.detailsCard}>
            <Text style={styles.detailsSectionTitle}>Service Details</Text>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Full Name</Text>
              <Text style={styles.detailValue}>{selectedRequest?.fullName}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Mobile Number</Text>
              <Text style={styles.detailValue}>{selectedRequest?.mobileNumber}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Email</Text>
              <Text style={styles.detailValue}>{selectedRequest?.email}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Address</Text>
              <Text style={styles.detailValue}>{selectedRequest?.address}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>City</Text>
              <Text style={styles.detailValue}>{selectedRequest?.city}</Text>
            </View>

            {selectedRequest?.landmark && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Landmark</Text>
                <Text style={styles.detailValue}>{selectedRequest?.landmark}</Text>
              </View>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

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
            onRefresh={() => fetchRequests({ refreshing: true })}
          />
        }
      >
        <LinearGradient
          colors={["#102A43", "#1E5464", "#EF4444"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <TextureLines tone="dark" />

          <View style={styles.heroTopRow}>
            <View style={styles.heroBadge}>
              <Ionicons name="close-circle-outline" size={14} color="#FFFFFF" />
              <Text style={styles.heroBadgeText}>Rejected Services</Text>
            </View>
            <View style={styles.heroIconWrap}>
              <Ionicons name="ban-outline" size={22} color="#FFFFFF" />
            </View>
          </View>

          <Text style={styles.heroTitle}>Rejected service requests</Text>
          <Text style={styles.heroSubtitle}>
            Review rejected services and reactivate them if needed.
          </Text>

          <View style={styles.heroStatsRow}>
            <View style={styles.heroStatCard}>
              <Text style={styles.heroStatValue}>{counts.all}</Text>
              <Text style={styles.heroStatLabel}>Total</Text>
            </View>
            <View style={styles.heroStatCard}>
              <Text style={styles.heroStatValue}>{counts.growCleaning}</Text>
              <Text style={styles.heroStatLabel}>Cleaning</Text>
            </View>
            <View style={styles.heroStatCard}>
              <Text style={styles.heroStatValue}>{counts.solarAMC}</Text>
              <Text style={styles.heroStatLabel}>AMC</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.statsGrid}>
          <StatCard
            label="Total Rejected"
            value={String(counts.all)}
            icon="close-circle-outline"
            accent={COLORS.danger}
            soft={COLORS.dangerSoft}
          />
          <StatCard
            label="Solar Cleaning"
            value={String(counts.growCleaning)}
            icon="sparkles-outline"
            accent={COLORS.blue}
            soft={COLORS.blueSoft}
          />
          <StatCard
            label="Solar AMC"
            value={String(counts.solarAMC)}
            icon="shield-outline"
            accent={COLORS.cyan}
            soft={COLORS.cyanSoft}
          />
        </View>

        <View style={styles.toolbarCard}>
          <View style={styles.searchBox}>
            <Ionicons name="search-outline" size={17} color={COLORS.faint} />
            <TextInput
              value={searchText}
              onChangeText={setSearchText}
              placeholder="Search by name, email, or consumer no"
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
                    ? requests.length
                    : filter.key === "grow-cleaning"
                      ? counts.growCleaning
                      : counts.solarAMC
                }
                active={activeFilter === filter.key}
                onPress={() => setActiveFilter(filter.key)}
              />
            ))}
          </ScrollView>
        </View>

        {isLoading ? (
          <View style={styles.stateCard}>
            <ActivityIndicator color={COLORS.brand} />
            <Text style={styles.stateTitle}>Loading rejected services</Text>
          </View>
        ) : errorMessage ? (
          <View style={styles.stateCard}>
            <View style={styles.stateIconWrapDanger}>
              <Ionicons name="warning-outline" size={24} color={COLORS.danger} />
            </View>
            <Text style={styles.stateTitle}>Could not load services</Text>
            <Text style={styles.stateText}>{errorMessage}</Text>
            <Pressable style={styles.retryButton} onPress={() => fetchRequests()}>
              <Text style={styles.retryButtonText}>Try again</Text>
            </Pressable>
          </View>
        ) : filteredRequests.length === 0 ? (
          <View style={styles.stateCard}>
            <View style={styles.stateIconWrap}>
              <Ionicons name="file-tray-outline" size={24} color={COLORS.brand} />
            </View>
            <Text style={styles.stateTitle}>No rejected services</Text>
            <Text style={styles.stateText}>
              No services match your current filter or search.
            </Text>
          </View>
        ) : (
          filteredRequests.map((request) => (
            <ServiceListRow
              key={request._id}
              request={request}
              onViewDetails={() => handleViewDetails(request)}
            />
          ))
        )}
      </ScrollView>
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
    marginBottom: 14,
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
  rejectionReasonBox: {
    marginTop: 13,
    borderRadius: 14,
    backgroundColor: COLORS.dangerSoft,
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.18)",
    padding: 12,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  rejectionReasonTextWrap: {
    flex: 1,
  },
  rejectionReasonLabel: {
    color: COLORS.danger,
    fontSize: 9,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  rejectionReasonText: {
    color: COLORS.danger,
    fontSize: 10,
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
    fontSize: 9,
    fontWeight: "800",
  },
  reactivateButton: {
    flex: 1,
    minHeight: 40,
    borderRadius: 13,
    backgroundColor: COLORS.success,
    paddingHorizontal: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  deleteButton: {
    minHeight: 40,
    width: 40,
    borderRadius: 13,
    backgroundColor: COLORS.danger,
    alignItems: "center",
    justifyContent: "center",
  },
  actionButtonsRow: {
    flexDirection: "row",
    gap: 8,
    flex: 1,
    justifyContent: "flex-end",
  },
  reactivateButtonText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "900",
  },
  disabledButton: {
    opacity: 0.7,
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
  detailsCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 7 },
    elevation: 3,
  },
  detailsSectionTitle: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: "900",
    marginBottom: 14,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  detailLabel: {
    color: COLORS.muted,
    fontSize: 10,
    fontWeight: "800",
  },
  detailValue: {
    color: COLORS.text,
    fontSize: 10,
    fontWeight: "900",
    maxWidth: "60%",
    textAlign: "right",
  },
  listRowCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.07,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 7 },
    elevation: 3,
  },
  listRowTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  listRowIdentity: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    marginRight: 10,
  },
  listAvatarWrap: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: COLORS.blueSoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  listAvatarText: {
    color: COLORS.blue,
    fontSize: 10,
    fontWeight: "900",
  },
  listRowTextWrap: {
    flex: 1,
  },
  listUserName: {
    color: COLORS.text,
    fontSize: 11,
    fontWeight: "900",
  },
  listConsumerText: {
    color: COLORS.muted,
    fontSize: 9,
    fontWeight: "700",
    marginTop: 2,
  },
  listStatusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
  },
  listStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  listStatusText: {
    fontSize: 8,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  listRowMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  listMetaText: {
    flex: 1,
    color: COLORS.muted,
    fontSize: 9,
    fontWeight: "700",
  },
  listDetailsButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: COLORS.blueSoft,
    borderWidth: 1,
    borderColor: "rgba(101,126,234,0.16)",
  },
  listDetailsButtonText: {
    color: COLORS.brand,
    fontSize: 10,
    fontWeight: "900",
  },
});
