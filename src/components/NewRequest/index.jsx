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

const PENDING_REQUESTS_API_PATH = "/api/admin/requests?status=pending";
const updateRequestApiPath = (requestId) => `/api/admin/requests/${requestId}`;

function getRequestId(request) {
  return (
    request?._id || request?.id || request?.requestId || request?.applicationId
  );
}

function getRequestStatus(request) {
  return String(request?.requestStatus || request?.status || "").toLowerCase();
}

function normalizePendingRequests(payload) {
  const source = Array.isArray(payload)
    ? payload
    : payload?.requests ||
      payload?.applications ||
      payload?.data?.requests ||
      payload?.data?.applications ||
      payload?.data ||
      [];

  const list = Array.isArray(source) ? source : [source];

  return list.filter((item) => {
    const status = getRequestStatus(item);
    return status === "pending" || status === "new" || status === "";
  });
}

function formatCurrency(value) {
  const amount = Number(value || 0);
  return `INR ${amount.toLocaleString("en-IN")}`;
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

function getFullAddress(request) {
  return (
    request?.locationAddress ||
    [request?.address, request?.city, request?.state, request?.pinCode]
      .filter(Boolean)
      .join(", ") ||
    "Address not available"
  );
}

function getLatLong(request) {
  const lat =
    request?.latitude ||
    request?.lat ||
    request?.location?.latitude ||
    request?.location?.lat;
  const lng =
    request?.longitude ||
    request?.lng ||
    request?.lon ||
    request?.location?.longitude ||
    request?.location?.lng;

  if (lat == null && lng == null) return null;

  return `${lat ?? "--"}, ${lng ?? "--"}`;
}

function getVisitSummary(request) {
  const management = request?.consumerManagement || {};
  const totalVisit = Number(management?.totalVisit || 0);
  const markedVisit = Number(management?.markedVisit || 0);
  const remainingVisit = Number(
    management?.remainingVisit ?? Math.max(totalVisit - markedVisit, 0),
  );
  const selectedVisits = Array.isArray(management?.selectedVisits)
    ? management.selectedVisits
    : [];

  return {
    totalVisit,
    markedVisit,
    remainingVisit,
    selectedVisits,
  };
}

function DetailRow({ icon, label, value, accent = COLORS.brand }) {
  return (
    <View style={styles.detailRow}>
      <View style={styles.detailIconWrap}>
        <Ionicons name={icon} size={15} color={accent} />
      </View>
      <View style={styles.detailTextWrap}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue}>{value || "Not available"}</Text>
      </View>
    </View>
  );
}

function InfoChip({ icon, label, value, accent, soft }) {
  return (
    <View style={[styles.infoChip, { backgroundColor: soft }]}>
      <Ionicons name={icon} size={14} color={accent} />
      <View style={styles.infoChipTextWrap}>
        <Text style={[styles.infoChipValue, { color: accent }]}>{value}</Text>
        <Text style={styles.infoChipLabel}>{label}</Text>
      </View>
    </View>
  );
}

function TextureLines() {
  return (
    <View pointerEvents="none" style={styles.textureLayer}>
      <View style={styles.textureLineOne} />
      <View style={styles.textureLineTwo} />
      <View style={styles.textureLineThree} />
    </View>
  );
}

function RequestCard({
  request,
  index,
  processingId,
  onApprove,
  onReject,
  onOpenPhoto,
  onOpenVisits,
}) {
  const requestId = getRequestId(request);
  const visitSummary = getVisitSummary(request);
  const selectedVisits = visitSummary.selectedVisits.slice(0, 3);
  const isProcessingApprove = processingId === `approve-${requestId}`;
  const isProcessingReject = processingId === `reject-${requestId}`;

  return (
    <View style={styles.requestCard}>
      <View style={styles.requestAccent} />
      <TextureLines />

      <View style={styles.cardTopRow}>
        <View style={styles.customerBlock}>
          <View style={styles.avatarWrap}>
            <Ionicons name="person-outline" size={20} color={COLORS.brand} />
          </View>
          <View style={styles.customerTextWrap}>
            <Text style={styles.customerName} numberOfLines={1}>
              {request?.fullName || "Unnamed customer"}
            </Text>
            <Text style={styles.customerMeta} numberOfLines={1}>
              {request?.mobileNumber || "No mobile"} -{" "}
              {request?.city || "No city"}
            </Text>
          </View>
        </View>

        <View style={styles.pendingBadge}>
          <View style={styles.pendingDot} />
          <Text style={styles.pendingBadgeText}>Pending</Text>
        </View>
      </View>

      <View style={styles.servicePanel}>
        <View style={styles.servicePanelTop}>
          <View style={styles.serviceIconWrap}>
            <Ionicons name="water-outline" size={20} color={COLORS.cyan} />
          </View>
          <View style={styles.serviceTextWrap}>
            <Text style={styles.serviceName}>
              {request?.serviceName || "Service request"}
            </Text>
            <Text style={styles.serviceSubText}>
              Consumer No:{" "}
              {request?.consumerNumber || request?.consumerNo || "Pending"}
            </Text>
          </View>
        </View>

        <View style={styles.amountBox}>
          <Text style={styles.amountLabel}>Total amount</Text>
          <Text style={styles.amountValue}>
            {formatCurrency(request?.totalAmount)}
          </Text>
        </View>
      </View>

      <View style={styles.chipGrid}>
        <InfoChip
          icon="card-outline"
          label="Payment"
          value={request?.paymentMethod || "pending"}
          accent={COLORS.amber}
          soft={COLORS.amberSoft}
        />
        <InfoChip
          icon="grid-outline"
          label="Panels"
          value={String(request?.numberOfPanels ?? "--")}
          accent={COLORS.blue}
          soft={COLORS.blueSoft}
        />
        <InfoChip
          icon="walk-outline"
          label="Walkway"
          value={request?.walkwayAndLadder ? "Yes" : "No"}
          accent={COLORS.success}
          soft={COLORS.successSoft}
        />
        <InfoChip
          icon="rainy-outline"
          label="Sprinkler"
          value={request?.sprinkler ? "Yes" : "No"}
          accent={COLORS.cyan}
          soft={COLORS.cyanSoft}
        />
      </View>

      <View style={styles.photoAndDetailsRow}>
        <Pressable
          style={styles.photoPreview}
          onPress={() => onOpenPhoto(request?.sitePhotoUrl)}
          disabled={!request?.sitePhotoUrl}
        >
          {request?.sitePhotoUrl ? (
            <Image
              source={{ uri: request.sitePhotoUrl }}
              style={styles.sitePhoto}
            />
          ) : (
            <View style={styles.photoPlaceholder}>
              <Ionicons name="image-outline" size={22} color={COLORS.faint} />
              <Text style={styles.photoPlaceholderText}>No photo</Text>
            </View>
          )}
          {request?.sitePhotoUrl ? (
            <View style={styles.photoOverlay}>
              <Ionicons name="expand-outline" size={15} color="#FFFFFF" />
              <Text style={styles.photoOverlayText}>View site</Text>
            </View>
          ) : null}
        </Pressable>

        <View style={styles.detailsMiniList}>
          <DetailRow
            icon="mail-outline"
            label="Email"
            value={request?.email}
            accent={COLORS.blue}
          />
          <DetailRow
            icon="location-outline"
            label="Location"
            value={getFullAddress(request)}
            accent={COLORS.danger}
          />
          {getLatLong(request) ? (
            <DetailRow
              icon="compass-outline"
              label="Lat / Long"
              value={getLatLong(request)}
              accent={COLORS.faint}
            />
          ) : null}
        </View>
      </View>

      <View style={styles.visitPanel}>
        <View style={styles.visitPanelHeader}>
          <View>
            <Text style={styles.visitTitle}>AMC visit plan</Text>
            <Text style={styles.visitSubtitle}>
              {visitSummary.totalVisit || 0} total -{" "}
              {visitSummary.remainingVisit || 0} remaining
            </Text>
          </View>
          <View style={styles.visitCountPill}>
            <Text style={styles.visitCountText}>
              {visitSummary.markedVisit || 0}/{visitSummary.totalVisit || 0}
            </Text>
          </View>
        </View>

        <View style={styles.visitDatesRow}>
          {selectedVisits.length > 0 ? (
            selectedVisits.map((visit, visitIndex) => (
              <View
                key={`${requestId}-visit-${visitIndex}`}
                style={styles.visitDateChip}
              >
                <Ionicons
                  name="calendar-outline"
                  size={13}
                  color={COLORS.brand}
                />
                <Text style={styles.visitDateText}>
                  {formatDate(visit?.date)}
                </Text>
              </View>
            ))
          ) : (
            <Text style={styles.noVisitText}>No visits selected yet</Text>
          )}
          {visitSummary.selectedVisits.length > 3 ? (
            <Pressable
              onPress={() =>
                onOpenVisits && onOpenVisits(visitSummary.selectedVisits)
              }
              style={styles.viewAllVisitsButton}
            >
              <Text style={styles.viewAllVisitsText}>View all</Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      <View style={styles.metaFooter}>
        <View style={styles.createdWrap}>
          <Ionicons name="time-outline" size={14} color={COLORS.faint} />
          <Text style={styles.createdText}>
            Created {formatDate(request?.createdAt)}
          </Text>
        </View>

        <Text style={styles.indexText}>
          #{String(index + 1).padStart(2, "0")}
        </Text>
      </View>

      <View style={styles.actionRow}>
        <Pressable
          style={[
            styles.rejectButton,
            isProcessingReject && styles.disabledButton,
          ]}
          onPress={() => onReject(request)}
          disabled={Boolean(processingId)}
        >
          {isProcessingReject ? (
            <ActivityIndicator color={COLORS.danger} size="small" />
          ) : (
            <Ionicons
              name="close-circle-outline"
              size={17}
              color={COLORS.danger}
            />
          )}
          <Text style={styles.rejectButtonText}>Reject</Text>
        </Pressable>

        <Pressable
          style={[
            styles.approveButton,
            isProcessingApprove && styles.disabledButton,
          ]}
          onPress={() => onApprove(request)}
          disabled={Boolean(processingId)}
        >
          {isProcessingApprove ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Ionicons
              name="checkmark-circle-outline"
              size={17}
              color="#FFFFFF"
            />
          )}
          <Text style={styles.approveButtonText}>Approve</Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function AdminNewRequests() {
  const [requests, setRequests] = React.useState([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState("");
  const [processingId, setProcessingId] = React.useState("");
  const [previewPhotoUrl, setPreviewPhotoUrl] = React.useState("");
  const [rejectTarget, setRejectTarget] = React.useState(null);
  const [rejectReason, setRejectReason] = React.useState("");
  const [visitModalVisits, setVisitModalVisits] = React.useState([]);
  const [isVisitModalVisible, setIsVisitModalVisible] = React.useState(false);

  const fetchPendingRequests = React.useCallback(
    async ({ refreshing = false } = {}) => {
      if (refreshing) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      setErrorMessage("");

      try {
        const response = await safeFetch(
          getApiUrl("/api/admin/requests?status=pending"),
          {
            method: "GET",
          },
        );

        const payload = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(
            payload?.message || "Unable to load pending requests.",
          );
        }

        setRequests(normalizePendingRequests(payload));
      } catch (error) {
        setErrorMessage(error?.message || "Unable to load pending requests.");
        setRequests([]);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [],
  );

  React.useEffect(() => {
    fetchPendingRequests();
  }, [fetchPendingRequests]);

  const totalPendingAmount = requests.reduce(
    (sum, request) => sum + Number(request?.totalAmount || 0),
    0,
  );

  const paymentPendingCount = requests.filter(
    (request) =>
      String(request?.paymentMethod || "").toLowerCase() === "pending",
  ).length;

  const updateRequestStatus = async (
    request,
    nextStatus,
    extraPayload = {},
  ) => {
    const requestId = getRequestId(request);

    if (!requestId) {
      Alert.alert("Missing request ID", "This request cannot be updated.");
      return;
    }

    const actionKey = nextStatus === "approved" ? "approve" : "reject";
    setProcessingId(`${actionKey}-${requestId}`);
    console.log("Updating request status:", {
      requestId,
      nextStatus,
      extraPayload,
    });
    try {
      const response = await safeFetch(
        getApiUrl(`/api/admin/requests/${requestId}`),
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            requestStatus: nextStatus,
            status: nextStatus,
            isNewNotification: false,
            reviewedAt: new Date().toISOString(),
            ...extraPayload,
          }),
        },
      );

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.message || `Unable to ${actionKey} request.`);
      }

      setRequests((current) =>
        current.filter((item) => getRequestId(item) !== requestId),
      );

      Alert.alert(
        nextStatus === "approved" ? "Request approved" : "Request rejected",
        nextStatus === "approved"
          ? "The request has been moved out of the pending queue."
          : "The request has been rejected and removed from the pending queue.",
      );
    } catch (error) {
      Alert.alert("Update failed", error?.message || "Please try again.");
    } finally {
      setProcessingId("");
      setRejectTarget(null);
      setRejectReason("");
    }
  };

  const handleApprove = (request) => {
    Alert.alert(
      "Approve request",
      `Approve ${request?.fullName || "this customer"}'s service request?`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Approve",
          onPress: () => updateRequestStatus(request, "approved"),
        },
      ],
    );
  };

  const handleReject = (request) => {
    setRejectTarget(request);
    setRejectReason("");
  };

  const submitReject = () => {
    if (!rejectTarget) {
      return;
    }

    updateRequestStatus(rejectTarget, "rejected", {
      rejectionReason: rejectReason.trim(),
    });
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
            onRefresh={() => fetchPendingRequests({ refreshing: true })}
          />
        }
      >
        <LinearGradient
          colors={["#102A43", "#1E5464", "#657EEA"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <View pointerEvents="none" style={styles.heroTexture}>
            <View style={styles.heroLineOne} />
            <View style={styles.heroLineTwo} />
            <View style={styles.heroLineThree} />
          </View>

          <View style={styles.heroTopRow}>
            <View style={styles.heroBadge}>
              <Ionicons
                name="file-tray-full-outline"
                size={14}
                color="#FFFFFF"
              />
              <Text style={styles.heroBadgeText}>New Request Queue</Text>
            </View>
            <View style={styles.heroIconWrap}>
              <Ionicons
                name="shield-checkmark-outline"
                size={22}
                color="#FFFFFF"
              />
            </View>
          </View>

          <Text style={styles.heroTitle}>
            Review pending service applications.
          </Text>
          <Text style={styles.heroSubtitle}>
            Verify customer details, payment status, service scope, visit plan,
            location data, and site photo before approval.
          </Text>

          <View style={styles.heroStatsRow}>
            <View style={styles.heroStatCard}>
              <Text style={styles.heroStatValue}>{requests.length}</Text>
              <Text style={styles.heroStatLabel}>Pending</Text>
            </View>
            <View style={styles.heroStatCard}>
              <Text style={styles.heroStatValue}>
                {formatCurrency(totalPendingAmount)}
              </Text>
              <Text style={styles.heroStatLabel}>Total value</Text>
            </View>
            <View style={styles.heroStatCard}>
              <Text style={styles.heroStatValue}>{paymentPendingCount}</Text>
              <Text style={styles.heroStatLabel}>Payment pending</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionEyebrow}>Pending approvals</Text>
            <Text style={styles.sectionTitle}>
              Requests waiting for admin review
            </Text>
          </View>

          <Pressable
            style={styles.refreshButton}
            onPress={() => fetchPendingRequests({ refreshing: true })}
          >
            <Ionicons name="refresh-outline" size={16} color={COLORS.brand} />
          </Pressable>
        </View>

        {isLoading ? (
          <View style={styles.stateCard}>
            <ActivityIndicator color={COLORS.brand} />
            <Text style={styles.stateTitle}>Loading pending requests</Text>
            <Text style={styles.stateText}>
              Fetching applications with pending status.
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
            <Text style={styles.stateTitle}>Could not load requests</Text>
            <Text style={styles.stateText}>{errorMessage}</Text>
            <Pressable
              style={styles.retryButton}
              onPress={() => fetchPendingRequests()}
            >
              <Text style={styles.retryButtonText}>Try again</Text>
            </Pressable>
          </View>
        ) : requests.length === 0 ? (
          <View style={styles.stateCard}>
            <View style={styles.stateIconWrap}>
              <Ionicons
                name="checkmark-done-outline"
                size={24}
                color={COLORS.success}
              />
            </View>
            <Text style={styles.stateTitle}>No pending requests</Text>
            <Text style={styles.stateText}>
              New applications will appear here when their status is pending.
            </Text>
          </View>
        ) : (
          requests.map((request, index) => (
            <RequestCard
              key={getRequestId(request) || `${request?.mobileNumber}-${index}`}
              request={request}
              index={index}
              processingId={processingId}
              onApprove={handleApprove}
              onReject={handleReject}
              onOpenPhoto={(photoUrl) => setPreviewPhotoUrl(photoUrl || "")}
              onOpenVisits={(visits) => {
                setVisitModalVisits(Array.isArray(visits) ? visits : []);
                setIsVisitModalVisible(true);
              }}
            />
          ))
        )}
      </ScrollView>

      <Modal
        visible={Boolean(previewPhotoUrl)}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewPhotoUrl("")}
      >
        <View style={styles.photoModalOverlay}>
          <View style={styles.photoModalCard}>
            <View style={styles.photoModalHeader}>
              <Text style={styles.photoModalTitle}>Site photo</Text>
              <Pressable
                style={styles.modalCloseButton}
                onPress={() => setPreviewPhotoUrl("")}
              >
                <Ionicons name="close" size={18} color={COLORS.text} />
              </Pressable>
            </View>
            <Image
              source={{ uri: previewPhotoUrl }}
              style={styles.photoModalImage}
            />
          </View>
        </View>
      </Modal>

      <Modal
        visible={isVisitModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsVisitModalVisible(false)}
      >
        <View style={styles.photoModalOverlay}>
          <View style={styles.rejectModalCard}>
            <View style={styles.photoModalHeader}>
              <Text style={styles.photoModalTitle}>All scheduled visits</Text>
              <Pressable
                style={styles.modalCloseButton}
                onPress={() => setIsVisitModalVisible(false)}
              >
                <Ionicons name="close" size={18} color={COLORS.text} />
              </Pressable>
            </View>

            <ScrollView style={styles.visitListScroll}>
              {visitModalVisits.length === 0 ? (
                <View style={{ padding: 16 }}>
                  <Text style={styles.noVisitText}>No visits available</Text>
                </View>
              ) : (
                visitModalVisits.map((v, i) => (
                  <View key={`visit-modal-${i}`} style={styles.visitListItem}>
                    <Ionicons
                      name="calendar-outline"
                      size={16}
                      color={COLORS.brand}
                    />
                    <Text style={styles.visitListText}>
                      {formatDate(v?.date)}
                    </Text>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={Boolean(rejectTarget)}
        transparent
        animationType="fade"
        onRequestClose={() => setRejectTarget(null)}
      >
        <View style={styles.photoModalOverlay}>
          <View style={styles.rejectModalCard}>
            <View style={styles.photoModalHeader}>
              <Text style={styles.photoModalTitle}>Reject request</Text>
              <Pressable
                style={styles.modalCloseButton}
                onPress={() => setRejectTarget(null)}
              >
                <Ionicons name="close" size={18} color={COLORS.text} />
              </Pressable>
            </View>

            <Text style={styles.rejectHelpText}>
              Add an optional reason for rejecting this request.
            </Text>

            <TextInput
              value={rejectReason}
              onChangeText={setRejectReason}
              placeholder="Reason, notes, or missing requirement"
              placeholderTextColor={COLORS.faint}
              multiline
              textAlignVertical="top"
              style={styles.rejectInput}
            />

            <View style={styles.rejectModalActions}>
              <Pressable
                style={styles.rejectCancelButton}
                onPress={() => setRejectTarget(null)}
              >
                <Text style={styles.rejectCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={styles.rejectConfirmButton}
                onPress={submitReject}
              >
                <Text style={styles.rejectConfirmText}>Reject request</Text>
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
  heroTexture: {
    ...StyleSheet.absoluteFillObject,
  },
  heroLineOne: {
    position: "absolute",
    width: 230,
    height: 1,
    right: -46,
    top: 48,
    backgroundColor: "rgba(255,255,255,0.16)",
    transform: [{ rotate: "-23deg" }],
  },
  heroLineTwo: {
    position: "absolute",
    width: 180,
    height: 1,
    right: -28,
    top: 82,
    backgroundColor: "rgba(255,255,255,0.12)",
    transform: [{ rotate: "-23deg" }],
  },
  heroLineThree: {
    position: "absolute",
    width: 120,
    height: 1,
    right: -12,
    bottom: 42,
    backgroundColor: "rgba(255,255,255,0.1)",
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
    fontSize: 13,
    fontWeight: "900",
  },
  heroStatLabel: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 9.5,
    fontWeight: "700",
    marginTop: 3,
  },
  sectionHeader: {
    marginTop: 18,
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
    backgroundColor: COLORS.successSoft,
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
  requestCard: {
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
  requestAccent: {
    position: "absolute",
    left: 0,
    top: 14,
    bottom: 14,
    width: 4,
    borderTopRightRadius: 999,
    borderBottomRightRadius: 999,
    backgroundColor: COLORS.amber,
  },
  textureLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  textureLineOne: {
    position: "absolute",
    width: 180,
    height: 1,
    right: -42,
    top: 34,
    backgroundColor: "rgba(226,232,240,0.68)",
    transform: [{ rotate: "-22deg" }],
  },
  textureLineTwo: {
    position: "absolute",
    width: 130,
    height: 1,
    right: -22,
    top: 60,
    backgroundColor: "rgba(226,232,240,0.48)",
    transform: [{ rotate: "-22deg" }],
  },
  textureLineThree: {
    position: "absolute",
    width: 95,
    height: 1,
    right: -8,
    bottom: 40,
    backgroundColor: "rgba(226,232,240,0.35)",
    transform: [{ rotate: "-22deg" }],
  },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  customerBlock: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  avatarWrap: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: COLORS.blueSoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  customerTextWrap: {
    flex: 1,
  },
  customerName: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "900",
  },
  customerMeta: {
    color: COLORS.muted,
    fontSize: 10,
    lineHeight: 15,
    fontWeight: "700",
    marginTop: 2,
  },
  pendingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 6,
    backgroundColor: COLORS.amberSoft,
  },
  pendingDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: COLORS.amber,
  },
  pendingBadgeText: {
    color: COLORS.amber,
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
  },
  servicePanelTop: {
    flexDirection: "row",
    alignItems: "center",
  },
  serviceIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: COLORS.cyanSoft,
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
  amountBox: {
    marginTop: 12,
    borderRadius: 13,
    padding: 10,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  amountLabel: {
    color: COLORS.muted,
    fontSize: 9.5,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  amountValue: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "900",
    marginTop: 3,
  },
  chipGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 11,
  },
  infoChip: {
    width: "48.5%",
    minHeight: 48,
    borderRadius: 13,
    paddingHorizontal: 10,
    paddingVertical: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  infoChipTextWrap: {
    flex: 1,
  },
  infoChipValue: {
    fontSize: 11,
    fontWeight: "900",
    textTransform: "capitalize",
  },
  infoChipLabel: {
    color: COLORS.muted,
    fontSize: 9,
    fontWeight: "800",
    marginTop: 1,
  },
  photoAndDetailsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 11,
  },
  photoPreview: {
    width: 104,
    height: 138,
    borderRadius: 15,
    overflow: "hidden",
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sitePhoto: {
    width: "100%",
    height: "100%",
  },
  photoPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  photoPlaceholderText: {
    color: COLORS.faint,
    fontSize: 10,
    fontWeight: "800",
    marginTop: 5,
  },
  photoOverlay: {
    position: "absolute",
    left: 7,
    right: 7,
    bottom: 7,
    borderRadius: 999,
    backgroundColor: "rgba(15,23,42,0.72)",
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  photoOverlayText: {
    color: "#FFFFFF",
    fontSize: 9.5,
    fontWeight: "900",
  },
  detailsMiniList: {
    flex: 1,
    gap: 9,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 13,
    padding: 10,
    borderWidth: 1,
    borderColor: "#EDF2F7",
  },
  detailIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 9,
  },
  detailTextWrap: {
    flex: 1,
  },
  detailLabel: {
    color: COLORS.muted,
    fontSize: 9,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  detailValue: {
    color: COLORS.text,
    fontSize: 10.5,
    lineHeight: 15,
    fontWeight: "700",
    marginTop: 2,
  },
  visitPanel: {
    backgroundColor: COLORS.blueSoft,
    borderRadius: 15,
    padding: 12,
    marginTop: 11,
    borderWidth: 1,
    borderColor: "rgba(101,126,234,0.16)",
  },
  visitPanelHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  visitTitle: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: "900",
  },
  visitSubtitle: {
    color: COLORS.muted,
    fontSize: 10,
    fontWeight: "700",
    marginTop: 2,
  },
  visitCountPill: {
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 6,
    backgroundColor: "#FFFFFF",
  },
  visitCountText: {
    color: COLORS.blue,
    fontSize: 10,
    fontWeight: "900",
  },
  visitDatesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
    marginTop: 10,
  },
  visitDateChip: {
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 6,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  visitDateText: {
    color: COLORS.brand,
    fontSize: 9.5,
    fontWeight: "800",
  },
  noVisitText: {
    color: COLORS.muted,
    fontSize: 10,
    fontWeight: "700",
  },
  metaFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 11,
  },
  createdWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  createdText: {
    color: COLORS.faint,
    fontSize: 10,
    fontWeight: "800",
  },
  indexText: {
    color: COLORS.faint,
    fontSize: 10,
    fontWeight: "900",
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 13,
  },
  rejectButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 14,
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
    fontSize: 12,
    fontWeight: "900",
  },
  approveButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 14,
    backgroundColor: COLORS.success,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    shadowColor: COLORS.success,
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  approveButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "900",
  },
  disabledButton: {
    opacity: 0.72,
  },
  photoModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.62)",
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  photoModalCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    overflow: "hidden",
    maxHeight: "78%",
  },
  photoModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  photoModalTitle: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "900",
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: COLORS.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  photoModalImage: {
    width: "100%",
    height: 430,
    resizeMode: "cover",
    backgroundColor: COLORS.surfaceAlt,
  },
  rejectModalCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    overflow: "hidden",
  },
  rejectHelpText: {
    color: COLORS.muted,
    fontSize: 11,
    lineHeight: 17,
    fontWeight: "700",
    paddingHorizontal: 14,
    paddingTop: 12,
  },
  rejectInput: {
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
  rejectModalActions: {
    flexDirection: "row",
    gap: 10,
    padding: 14,
  },
  rejectCancelButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 14,
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },
  rejectCancelText: {
    color: COLORS.muted,
    fontSize: 12,
    fontWeight: "900",
  },
  rejectConfirmButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 14,
    backgroundColor: COLORS.danger,
    alignItems: "center",
    justifyContent: "center",
  },
  rejectConfirmText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "900",
  },
  viewAllVisitsButton: {
    marginLeft: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: COLORS.surfaceAlt,
    alignSelf: "center",
  },
  viewAllVisitsText: {
    color: COLORS.brand,
    fontSize: 11,
    fontWeight: "900",
  },
  visitListScroll: {
    maxHeight: 300,
  },
  visitListItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  visitListText: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "800",
  },
});
