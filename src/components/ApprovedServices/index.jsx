/* eslint-disable react-hooks/set-state-in-effect */

import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import {
  ActivityIndicator,
  Alert,
  BackHandler,
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

const APPROVED_REQUESTS_API = "/api/admin/request?status=contacted";
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

function getVisitDates(request) {
  const visits = request?.consumerManagement?.selectedVisits || [];
  return visits.map((v) => formatDate(v?.date));
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
  const consumerNumber =
    request?.consumerNumber || request?.consumerNo || "N/A";
  const visitDates = getVisitDates(request);

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

        <View
          style={[
            styles.listStatusBadge,
            { backgroundColor: COLORS.successSoft },
          ]}
        >
          <View
            style={[styles.listStatusDot, { backgroundColor: COLORS.success }]}
          />
          <Text style={[styles.listStatusText, { color: COLORS.success }]}>
            Approved
          </Text>
        </View>
      </View>

      <View style={styles.listRowMeta}>
        <Text style={styles.listMetaText}>{serviceName}</Text>
        <Text style={styles.listMetaText}>
          {visitDates.length > 0
            ? `${visitDates.length} visits scheduled`
            : "No visits yet"}
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
  request,
  onReject,
  onModify,
  onViewDetails,
  isProcessing,
}) {
  const serviceName = request?.serviceName || request?.requestType || "Service";
  const fullName = request?.fullName || "Unknown";
  const email = request?.email || "No email";
  const consumerNumber =
    request?.consumerNumber || request?.consumerNo || "N/A";
  const visitDates = getVisitDates(request);

  // Only make card pressable if onViewDetails is provided and not an empty function
  const isClickable = onViewDetails && onViewDetails.toString() !== "() => {}";
  const CardWrapper = isClickable ? Pressable : View;
  const cardProps = isClickable
    ? { onPress: () => onViewDetails(request) }
    : {};

  return (
    <CardWrapper {...cardProps} style={styles.serviceCard}>
      <View
        style={[styles.serviceAccentRail, { backgroundColor: COLORS.success }]}
      />
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

        <View
          style={[styles.statusBadge, { backgroundColor: COLORS.successSoft }]}
        >
          <View
            style={[styles.statusDot, { backgroundColor: COLORS.success }]}
          />
          <Text style={[styles.statusBadgeText, { color: COLORS.success }]}>
            Approved
          </Text>
        </View>
      </View>

      <View style={styles.servicePanel}>
        <View
          style={[
            styles.serviceIconWrap,
            { backgroundColor: COLORS.successSoft },
          ]}
        >
          <Ionicons
            name="shield-checkmark-outline"
            size={20}
            color={COLORS.success}
          />
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
          icon="sunny-outline"
          label="Panels"
          value={String(request?.numberOfPanels || 0)}
          accent={COLORS.blue}
          soft={COLORS.blueSoft}
        />
        <DetailPill
          icon="calendar-outline"
          label="Approved"
          value={formatDate(request?.updatedAt)}
          accent={COLORS.amber}
          soft={COLORS.amberSoft}
        />
      </View>

      {visitDates.length > 0 && (
        <View style={styles.visitDatesSection}>
          <Text style={styles.visitDatesTitle}>
            {visitDates.length} Visit dates scheduled
          </Text>
          <Text style={styles.visitDatesText} numberOfLines={2}>
            {visitDates.join(", ")}
          </Text>
        </View>
      )}

      <View style={styles.cardFooter}>
        <Pressable
          style={[styles.modifyButton, isProcessing && styles.disabledButton]}
          onPress={() => onModify(request)}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <ActivityIndicator color={COLORS.blue} size="small" />
          ) : (
            <Ionicons name="create-outline" size={16} color={COLORS.blue} />
          )}
          <Text style={styles.modifyButtonText}>Modify</Text>
        </Pressable>

        <Pressable
          style={[styles.rejectButton, isProcessing && styles.disabledButton]}
          onPress={() => onReject(request)}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <ActivityIndicator color={COLORS.danger} size="small" />
          ) : (
            <Ionicons
              name="close-circle-outline"
              size={16}
              color={COLORS.danger}
            />
          )}
          <Text style={styles.rejectButtonText}>Reject</Text>
        </Pressable>
      </View>
    </CardWrapper>
  );
}

export default function ApprovedServices() {
  const [requests, setRequests] = React.useState([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState("");
  const [activeFilter, setActiveFilter] = React.useState("all");
  const [searchText, setSearchText] = React.useState("");
  const [processingId, setProcessingId] = React.useState("");
  const [rejectModal, setRejectModal] = React.useState(null);
  const [rejectReason, setRejectReason] = React.useState("");
  const [selectedBehavior, setSelectedBehavior] = React.useState("");
  const [modifyModal, setModifyModal] = React.useState(null);
  const [modifyAmount, setModifyAmount] = React.useState("");
  const [modifyPanels, setModifyPanels] = React.useState("");
  const [selectedRequest, setSelectedRequest] = React.useState(null);

  const fetchRequests = React.useCallback(
    async ({ refreshing = false } = {}) => {
      if (refreshing) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      setErrorMessage("");

      try {
        const response = await safeFetch(getApiUrl(APPROVED_REQUESTS_API), {
          method: "GET",
        });
        const payload = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(
            payload?.message || "Unable to load approved services.",
          );
        }

        const data = Array.isArray(payload?.data) ? payload.data : [];
        setRequests(data);
      } catch (error) {
        setErrorMessage(error?.message || "Unable to load approved services.");
        setRequests([]);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [],
  );

  React.useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const counts = React.useMemo(() => {
    const all = requests.length;
    const growCleaning = requests.filter(
      (r) => r.requestType === "grow-cleaning",
    ).length;
    const solarAMC = requests.filter(
      (r) => r.requestType === "solar-amc",
    ).length;

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

  const handleReject = (request) => {
    setRejectModal(request);
    setRejectReason("");
    setSelectedBehavior(request?.userBehavior || "Normal");
  };

  const submitReject = async () => {
    if (!rejectModal) return;

    if (!selectedBehavior) {
      Alert.alert("Behavior required", "Please select user behavior.");
      return;
    }

    setProcessingId(rejectModal._id);

    try {
      const response = await safeFetch(
        getApiUrl(UPDATE_REQUEST_API(rejectModal._id)),
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: "rejected",
            rejectionReason: rejectReason.trim(),
            rejectedAt: new Date().toISOString(),
            userBehavior: selectedBehavior,
            userId: rejectModal.userId,
          }),
        },
      );

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.message || "Unable to reject service.");
      }

      await fetchRequests({ refreshing: true });
      setRejectModal(null);
      setRejectReason("");
      setSelectedBehavior("");

      Alert.alert(
        "Service rejected",
        "The service has been rejected successfully.",
      );
    } catch (error) {
      Alert.alert("Rejection failed", error?.message || "Please try again.");
    } finally {
      setProcessingId("");
    }
  };

  const handleModify = (request) => {
    setModifyModal(request);
    setModifyAmount(String(request?.totalAmount || ""));
    setModifyPanels(String(request?.numberOfPanels || ""));
  };

  const submitModify = async () => {
    if (!modifyModal) return;

    const amount = Number(modifyAmount);
    const panels = Number(modifyPanels);

    if (isNaN(amount) || amount <= 0) {
      Alert.alert("Invalid amount", "Please enter a valid payment amount.");
      return;
    }

    if (isNaN(panels) || panels <= 0) {
      Alert.alert("Invalid panels", "Please enter a valid number of panels.");
      return;
    }

    setProcessingId(modifyModal._id);

    try {
      const response = await safeFetch(
        getApiUrl(UPDATE_REQUEST_API(modifyModal._id)),
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            totalAmount: amount,
            numberOfPanels: panels,
            modifiedAt: new Date().toISOString(),
          }),
        },
      );

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.message || "Unable to modify service.");
      }

      await fetchRequests({ refreshing: true });
      setModifyModal(null);
      setModifyAmount("");
      setModifyPanels("");

      Alert.alert(
        "Service modified",
        "The service has been updated successfully.",
      );
    } catch (error) {
      Alert.alert("Modification failed", error?.message || "Please try again.");
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

  const renderActionModals = () => (
    <>
      <Modal
        visible={Boolean(rejectModal)}
        transparent
        animationType="fade"
        onRequestClose={() => setRejectModal(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.blockModalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Reject Service</Text>
                <Text style={styles.modalSubtitle}>
                  Provide a reason for rejecting this service.
                </Text>
              </View>
              <Pressable
                style={styles.modalCloseButton}
                onPress={() => setRejectModal(null)}
              >
                <Ionicons name="close" size={18} color={COLORS.text} />
              </Pressable>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>User Behavior</Text>
              <View style={styles.behaviorSelector}>
                {["Good", "Normal", "Severe", "Indisciplined"].map(
                  (behavior) => (
                    <Pressable
                      key={behavior}
                      style={[
                        styles.behaviorOption,
                        selectedBehavior === behavior &&
                          styles.behaviorOptionSelected,
                        behavior === "Good" &&
                          selectedBehavior === behavior &&
                          styles.behaviorGood,
                        behavior === "Normal" &&
                          selectedBehavior === behavior &&
                          styles.behaviorNormal,
                        behavior === "Severe" &&
                          selectedBehavior === behavior &&
                          styles.behaviorSevere,
                        behavior === "Indisciplined" &&
                          selectedBehavior === behavior &&
                          styles.behaviorIndisciplined,
                      ]}
                      onPress={() => setSelectedBehavior(behavior)}
                    >
                      <Text
                        style={[
                          styles.behaviorOptionText,
                          selectedBehavior === behavior &&
                            styles.behaviorOptionTextSelected,
                          behavior === "Good" &&
                            selectedBehavior === behavior &&
                            styles.behaviorTextGood,
                          behavior === "Normal" &&
                            selectedBehavior === behavior &&
                            styles.behaviorTextNormal,
                          behavior === "Severe" &&
                            selectedBehavior === behavior &&
                            styles.behaviorTextSevere,
                          behavior === "Indisciplined" &&
                            selectedBehavior === behavior &&
                            styles.behaviorTextIndisciplined,
                        ]}
                      >
                        {behavior}
                      </Text>
                    </Pressable>
                  ),
                )}
              </View>
            </View>

            <TextInput
              value={rejectReason}
              onChangeText={setRejectReason}
              placeholder="Reason for rejection..."
              placeholderTextColor={COLORS.faint}
              multiline
              textAlignVertical="top"
              style={styles.blockInput}
            />

            <View style={styles.modalActions}>
              <Pressable
                style={styles.modalCancelButton}
                onPress={() => setRejectModal(null)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={styles.modalConfirmButton}
                onPress={submitReject}
              >
                <Text style={styles.modalConfirmText}>Reject Service</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={Boolean(modifyModal)}
        transparent
        animationType="fade"
        onRequestClose={() => setModifyModal(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.blockModalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Modify Service</Text>
                <Text style={styles.modalSubtitle}>
                  Update payment amount or number of panels.
                </Text>
              </View>
              <Pressable
                style={styles.modalCloseButton}
                onPress={() => setModifyModal(null)}
              >
                <Ionicons name="close" size={18} color={COLORS.text} />
              </Pressable>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Payment Amount (₹)</Text>
              <TextInput
                value={modifyAmount}
                onChangeText={setModifyAmount}
                placeholder="Enter amount"
                placeholderTextColor={COLORS.faint}
                keyboardType="numeric"
                style={styles.modifyInput}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Number of Panels</Text>
              <TextInput
                value={modifyPanels}
                onChangeText={setModifyPanels}
                placeholder="Enter number of panels"
                placeholderTextColor={COLORS.faint}
                keyboardType="numeric"
                style={styles.modifyInput}
              />
            </View>

            <View style={styles.modalActions}>
              <Pressable
                style={styles.modalCancelButton}
                onPress={() => setModifyModal(null)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.modalConfirmButton,
                  { backgroundColor: COLORS.blue },
                ]}
                onPress={submitModify}
              >
                <Text style={styles.modalConfirmText}>Save Changes</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );

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
      onHardwareBackPress,
    );

    return () => subscription.remove();
  }, [selectedRequest]);

  if (selectedRequest) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar
          barStyle="light-content"
          backgroundColor={COLORS.brandDark}
        />

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
            onReject={handleReject}
            onModify={handleModify}
            onViewDetails={null}
            isProcessing={processingId === selectedRequest._id}
          />

          {/* Additional details can be added here */}
          <View style={styles.detailsCard}>
            <Text style={styles.detailsSectionTitle}>Service Details</Text>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Full Name</Text>
              <Text style={styles.detailValue}>
                {selectedRequest?.fullName}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Mobile Number</Text>
              <Text style={styles.detailValue}>
                {selectedRequest?.mobileNumber}
              </Text>
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
                <Text style={styles.detailValue}>
                  {selectedRequest?.landmark}
                </Text>
              </View>
            )}

            {/* User Behavior Section */}
            {selectedRequest?.userBehavior && (
              <View
                style={[
                  styles.detailRow,
                  {
                    marginTop: 12,
                    paddingTop: 12,
                    borderTopWidth: 1,
                    borderTopColor: COLORS.border,
                  },
                ]}
              >
                <Text style={styles.detailLabel}>User Behavior</Text>
                <View
                  style={[
                    styles.behaviorBadge,
                    selectedRequest.userBehavior === "Good" &&
                      styles.behaviorGood,
                    selectedRequest.userBehavior === "Normal" &&
                      styles.behaviorNormal,
                    selectedRequest.userBehavior === "Severe" &&
                      styles.behaviorSevere,
                    selectedRequest.userBehavior === "Indisciplined" &&
                      styles.behaviorIndisciplined,
                  ]}
                >
                  <Text
                    style={[
                      styles.behaviorText,
                      selectedRequest.userBehavior === "Good" &&
                        styles.behaviorTextGood,
                      selectedRequest.userBehavior === "Normal" &&
                        styles.behaviorTextNormal,
                      selectedRequest.userBehavior === "Severe" &&
                        styles.behaviorTextSevere,
                      selectedRequest.userBehavior === "Indisciplined" &&
                        styles.behaviorTextIndisciplined,
                    ]}
                  >
                    {selectedRequest.userBehavior}
                  </Text>
                </View>
              </View>
            )}
          </View>
        </ScrollView>
        {renderActionModals()}
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
          colors={["#102A43", "#1E5464", "#10B981"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <TextureLines tone="dark" />

          <View style={styles.heroTopRow}>
            <View style={styles.heroBadge}>
              <Ionicons
                name="checkmark-done-outline"
                size={14}
                color="#FFFFFF"
              />
              <Text style={styles.heroBadgeText}>Approved Services</Text>
            </View>
            <View style={styles.heroIconWrap}>
              <Ionicons
                name="shield-checkmark-outline"
                size={22}
                color="#FFFFFF"
              />
            </View>
          </View>

          <Text style={styles.heroTitle}>Manage approved services</Text>
          <Text style={styles.heroSubtitle}>
            Review, modify payment & panels, or reject services that have been
            approved.
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
            label="Total Approved"
            value={String(counts.all)}
            icon="checkmark-circle-outline"
            accent={COLORS.success}
            soft={COLORS.successSoft}
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
            <Text style={styles.stateTitle}>Loading approved services</Text>
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
            <Pressable
              style={styles.retryButton}
              onPress={() => fetchRequests()}
            >
              <Text style={styles.retryButtonText}>Try again</Text>
            </Pressable>
          </View>
        ) : filteredRequests.length === 0 ? (
          <View style={styles.stateCard}>
            <View style={styles.stateIconWrap}>
              <Ionicons
                name="file-tray-outline"
                size={24}
                color={COLORS.brand}
              />
            </View>
            <Text style={styles.stateTitle}>No approved services</Text>
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

      {renderActionModals()}
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
  visitDatesSection: {
    marginTop: 13,
    borderRadius: 14,
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 12,
  },
  visitDatesTitle: {
    color: COLORS.text,
    fontSize: 10,
    fontWeight: "900",
    marginBottom: 6,
  },
  visitDatesText: {
    color: COLORS.muted,
    fontSize: 9,
    fontWeight: "700",
    lineHeight: 14,
  },
  cardFooter: {
    flexDirection: "row",
    gap: 10,
    marginTop: 13,
  },
  modifyButton: {
    flex: 1,
    minHeight: 40,
    borderRadius: 13,
    backgroundColor: COLORS.blueSoft,
    borderWidth: 1,
    borderColor: "rgba(101,126,234,0.16)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  modifyButtonText: {
    color: COLORS.blue,
    fontSize: 10,
    fontWeight: "900",
  },
  rejectButton: {
    flex: 1,
    minHeight: 40,
    borderRadius: 13,
    backgroundColor: COLORS.dangerSoft,
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.16)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  rejectButtonText: {
    color: COLORS.danger,
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
  inputGroup: {
    marginHorizontal: 14,
    marginTop: 12,
  },
  inputLabel: {
    color: COLORS.text,
    fontSize: 10,
    fontWeight: "900",
    marginBottom: 6,
  },
  modifyInput: {
    minHeight: 44,
    borderRadius: 14,
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: COLORS.border,
    color: COLORS.text,
    fontSize: 11,
    fontWeight: "700",
    paddingHorizontal: 12,
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

  // detailRow: {
  //   flexDirection: "row",
  //   justifyContent: "space-between",
  //   alignItems: "center",
  //   paddingVertical: 10,
  //   borderBottomWidth: 1,
  //   borderBottomColor: COLORS.border,
  // },
  // detailLabel: {
  //   color: COLORS.muted,
  //   fontSize: 11,
  //   fontWeight: "600",
  //   flex: 1,
  // },
  // detailValue: {
  //   color: COLORS.text,
  //   fontSize: 11,
  //   fontWeight: "700",
  //   flex: 2,
  //   textAlign: "right",
  // },
  behaviorBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: "flex-end",
  },
  behaviorGood: {
    backgroundColor: COLORS.successSoft,
  },
  behaviorNormal: {
    backgroundColor: COLORS.blueSoft,
  },
  behaviorSevere: {
    backgroundColor: COLORS.amberSoft,
  },
  behaviorIndisciplined: {
    backgroundColor: COLORS.dangerSoft,
  },
  behaviorText: {
    fontSize: 10,
    fontWeight: "900",
  },
  behaviorTextGood: {
    color: COLORS.success,
  },
  behaviorTextNormal: {
    color: COLORS.blue,
  },
  behaviorTextSevere: {
    color: COLORS.amber,
  },
  behaviorTextIndisciplined: {
    color: COLORS.danger,
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
  behaviorSelector: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  behaviorOption: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  behaviorOptionSelected: {
    borderWidth: 2,
  },
  behaviorOptionText: {
    fontSize: 10,
    fontWeight: "900",
    color: COLORS.muted,
  },
  behaviorOptionTextSelected: {
    fontWeight: "900",
  },
});
