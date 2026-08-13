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

const COMPLAINT_REQUESTS_API_PATH = "/api/admin/complaints?status=open";
const updateComplaintApiPath = (complaintId) =>
  `/api/admin/complaints/${complaintId}`;

const FILTERS = [
  { key: "all", label: "All" },
  { key: "high", label: "High" },
  { key: "pending", label: "Pending" },
  { key: "review", label: "Review" },
];

function getComplaintId(complaint) {
  return (
    complaint?._id ||
    complaint?.id ||
    complaint?.complaintId ||
    complaint?.requestId ||
    complaint?.ticketId
  );
}

function getComplaintStatus(complaint) {
  return String(
    complaint?.complaintStatus ||
      complaint?.requestStatus ||
      complaint?.status ||
      "pending",
  ).toLowerCase();
}

function getComplaintPriority(complaint) {
  return String(complaint?.priority || complaint?.severity || "medium").toLowerCase();
}

function normalizeComplaints(payload) {
  const source = Array.isArray(payload)
    ? payload
    : payload?.complaints ||
      payload?.requests ||
      payload?.tickets ||
      payload?.data?.complaints ||
      payload?.data?.requests ||
      payload?.data?.tickets ||
      payload?.data ||
      [];

  const list = Array.isArray(source) ? source : [source];

  return list.filter((item) => {
    const status = getComplaintStatus(item);
    return !["resolved", "rejected", "closed", "cancelled"].includes(status);
  });
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
  return id.length > 10 ? `${id.slice(0, 5)}...${id.slice(-4)}` : id || "N/A";
}

function getCustomerName(complaint) {
  return (
    complaint?.fullName ||
    complaint?.customerName ||
    complaint?.username ||
    complaint?.user?.username ||
    complaint?.user?.fullName ||
    "Unnamed customer"
  );
}

function getCustomerEmail(complaint) {
  return complaint?.email || complaint?.user?.email || "No email";
}

function getCustomerMobile(complaint) {
  return (
    complaint?.mobileNumber ||
    complaint?.phone ||
    complaint?.user?.mobileNumber ||
    complaint?.user?.phone ||
    "No mobile"
  );
}

function getComplaintTitle(complaint) {
  return (
    complaint?.title ||
    complaint?.subject ||
    complaint?.complaintTitle ||
    complaint?.category ||
    "Service complaint"
  );
}

function getComplaintMessage(complaint) {
  return (
    complaint?.description ||
    complaint?.message ||
    complaint?.complaint ||
    complaint?.complaintDescription ||
    "No complaint details provided."
  );
}

function getAttachmentUrl(complaint) {
  return (
    complaint?.attachmentUrl ||
    complaint?.imageUrl ||
    complaint?.photoUrl ||
    complaint?.sitePhotoUrl ||
    complaint?.complaintPhotoUrl ||
    ""
  );
}

function getPriorityConfig(priority) {
  if (["high", "urgent", "critical"].includes(priority)) {
    return {
      label: priority === "critical" ? "Critical" : "High",
      accent: COLORS.danger,
      soft: COLORS.dangerSoft,
      icon: "warning-outline",
    };
  }

  if (["low", "minor"].includes(priority)) {
    return {
      label: "Low",
      accent: COLORS.cyan,
      soft: COLORS.cyanSoft,
      icon: "checkmark-done-circle-outline",
    };
  }

  return {
    label: "Medium",
    accent: COLORS.amber,
    soft: COLORS.amberSoft,
    icon: "time-outline",
  };
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

function InfoPill({ icon, label, value, accent, soft }) {
  return (
    <View style={[styles.infoPill, { backgroundColor: soft }]}>
      <Ionicons name={icon} size={14} color={accent} />
      <View style={styles.infoPillTextWrap}>
        <Text style={[styles.infoPillValue, { color: accent }]} numberOfLines={1}>
          {value}
        </Text>
        <Text style={styles.infoPillLabel}>{label}</Text>
      </View>
    </View>
  );
}

function ComplaintCard({
  complaint,
  index,
  processingId,
  onResolve,
  onReject,
  onOpenImage,
}) {
  const complaintId = getComplaintId(complaint);
  const priority = getPriorityConfig(getComplaintPriority(complaint));
  const status = getComplaintStatus(complaint);
  const attachmentUrl = getAttachmentUrl(complaint);
  const isResolving = processingId === `resolve-${complaintId}`;
  const isRejecting = processingId === `reject-${complaintId}`;

  return (
    <View style={styles.complaintCard}>
      <View style={[styles.complaintAccent, { backgroundColor: priority.accent }]} />
      <TextureLines />

      <View style={styles.cardTopRow}>
        <View style={styles.customerBlock}>
          <View style={[styles.customerIconWrap, { backgroundColor: priority.soft }]}>
            <Ionicons name="person-outline" size={19} color={priority.accent} />
          </View>
          <View style={styles.customerTextWrap}>
            <Text style={styles.customerName} numberOfLines={1}>
              {getCustomerName(complaint)}
            </Text>
            <Text style={styles.customerMeta} numberOfLines={1}>
              {getCustomerMobile(complaint)} - {getCustomerEmail(complaint)}
            </Text>
          </View>
        </View>

        <View style={[styles.priorityBadge, { backgroundColor: priority.soft }]}>
          <Ionicons name={priority.icon} size={13} color={priority.accent} />
          <Text style={[styles.priorityBadgeText, { color: priority.accent }]}>
            {priority.label}
          </Text>
        </View>
      </View>

      <View style={styles.complaintPanel}>
        <View style={styles.complaintPanelHeader}>
          <View style={styles.complaintTitleWrap}>
            <Text style={styles.complaintTitle}>{getComplaintTitle(complaint)}</Text>
            <Text style={styles.complaintServiceText}>
              {complaint?.serviceName || complaint?.service?.name || "Service not linked"}
            </Text>
          </View>
          <View style={styles.statusPill}>
            <Text style={styles.statusPillText}>{status}</Text>
          </View>
        </View>

        <Text style={styles.complaintMessage}>{getComplaintMessage(complaint)}</Text>
      </View>

      <View style={styles.infoGrid}>
        <InfoPill
          icon="ticket-outline"
          label="Ticket"
          value={shortId(complaintId)}
          accent={COLORS.blue}
          soft={COLORS.blueSoft}
        />
        <InfoPill
          icon="calendar-outline"
          label="Created"
          value={formatDate(complaint?.createdAt || complaint?.submittedAt)}
          accent={COLORS.brand}
          soft="#E8F4F7"
        />
        <InfoPill
          icon="key-outline"
          label="Consumer"
          value={
            complaint?.consumerNumber ||
            complaint?.consumerNo ||
            complaint?.consumerManagement?.userCode ||
            "Pending"
          }
          accent={COLORS.cyan}
          soft={COLORS.cyanSoft}
        />
        <InfoPill
          icon="location-outline"
          label="Location"
          value={complaint?.city || complaint?.locationAddress || "Unknown"}
          accent={COLORS.amber}
          soft={COLORS.amberSoft}
        />
      </View>

      {attachmentUrl ? (
        <Pressable style={styles.attachmentCard} onPress={() => onOpenImage(attachmentUrl)}>
          <Image source={{ uri: attachmentUrl }} style={styles.attachmentImage} />
          <View style={styles.attachmentTextWrap}>
            <Text style={styles.attachmentTitle}>Attached evidence</Text>
            <Text style={styles.attachmentSubtitle}>Tap to preview image</Text>
          </View>
          <Ionicons name="expand-outline" size={17} color={COLORS.brand} />
        </Pressable>
      ) : null}

      <View style={styles.cardFooter}>
        <View style={styles.createdWrap}>
          <Ionicons name="time-outline" size={14} color={COLORS.faint} />
          <Text style={styles.createdText}>
            Updated {formatDate(complaint?.updatedAt || complaint?.createdAt)}
          </Text>
        </View>
        <Text style={styles.indexText}>#{String(index + 1).padStart(2, "0")}</Text>
      </View>

      <View style={styles.actionRow}>
        <Pressable
          style={[styles.rejectButton, isRejecting && styles.disabledButton]}
          onPress={() => onReject(complaint)}
          disabled={Boolean(processingId)}
        >
          {isRejecting ? (
            <ActivityIndicator color={COLORS.danger} size="small" />
          ) : (
            <Ionicons name="close-circle-outline" size={17} color={COLORS.danger} />
          )}
          <Text style={styles.rejectButtonText}>Reject</Text>
        </Pressable>

        <Pressable
          style={[styles.resolveButton, isResolving && styles.disabledButton]}
          onPress={() => onResolve(complaint)}
          disabled={Boolean(processingId)}
        >
          {isResolving ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Ionicons name="checkmark-circle-outline" size={17} color="#FFFFFF" />
          )}
          <Text style={styles.resolveButtonText}>Resolve</Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function AdminComplaintRequests() {
  const [complaints, setComplaints] = React.useState([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState("");
  const [activeFilter, setActiveFilter] = React.useState("all");
  const [searchText, setSearchText] = React.useState("");
  const [processingId, setProcessingId] = React.useState("");
  const [imagePreviewUrl, setImagePreviewUrl] = React.useState("");
  const [actionTarget, setActionTarget] = React.useState(null);
  const [actionType, setActionType] = React.useState("");
  const [adminNote, setAdminNote] = React.useState("");

  const fetchComplaints = React.useCallback(async ({ refreshing = false } = {}) => {
    if (refreshing) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    setErrorMessage("");

    try {
      const response = await safeFetch(getApiUrl(COMPLAINT_REQUESTS_API_PATH), {
        method: "GET",
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.message || "Unable to load complaint requests.");
      }

      setComplaints(normalizeComplaints(payload));
    } catch (error) {
      setErrorMessage(error?.message || "Unable to load complaint requests.");
      setComplaints([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  React.useEffect(() => {
    fetchComplaints();
  }, [fetchComplaints]);

  const counts = React.useMemo(() => {
    return {
      all: complaints.length,
      high: complaints.filter((item) =>
        ["high", "urgent", "critical"].includes(getComplaintPriority(item)),
      ).length,
      pending: complaints.filter((item) => getComplaintStatus(item) === "pending").length,
      review: complaints.filter((item) =>
        ["review", "in-review", "in_review"].includes(getComplaintStatus(item)),
      ).length,
    };
  }, [complaints]);

  const filteredComplaints = React.useMemo(() => {
    const query = searchText.trim().toLowerCase();

    return complaints.filter((complaint) => {
      const priority = getComplaintPriority(complaint);
      const status = getComplaintStatus(complaint);

      if (activeFilter === "high" && !["high", "urgent", "critical"].includes(priority)) {
        return false;
      }

      if (activeFilter === "pending" && status !== "pending") {
        return false;
      }

      if (
        activeFilter === "review" &&
        !["review", "in-review", "in_review"].includes(status)
      ) {
        return false;
      }

      if (!query) {
        return true;
      }

      const searchable = [
        getComplaintId(complaint),
        getCustomerName(complaint),
        getCustomerEmail(complaint),
        getCustomerMobile(complaint),
        getComplaintTitle(complaint),
        getComplaintMessage(complaint),
        complaint?.serviceName,
        complaint?.consumerNumber,
        complaint?.consumerNo,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchable.includes(query);
    });
  }, [activeFilter, complaints, searchText]);

  const updateComplaint = async (complaint, nextStatus, note) => {
    const complaintId = getComplaintId(complaint);

    if (!complaintId) {
      Alert.alert("Missing complaint ID", "This complaint cannot be updated.");
      return;
    }

    const actionKey = nextStatus === "resolved" ? "resolve" : "reject";
    setProcessingId(`${actionKey}-${complaintId}`);

    try {
      const response = await safeFetch(getApiUrl(updateComplaintApiPath(complaintId)), {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          complaintStatus: nextStatus,
          requestStatus: nextStatus,
          status: nextStatus,
          isNewNotification: false,
          reviewedAt: new Date().toISOString(),
          resolvedAt: nextStatus === "resolved" ? new Date().toISOString() : null,
          rejectedAt: nextStatus === "rejected" ? new Date().toISOString() : null,
          resolutionNote: nextStatus === "resolved" ? note : "",
          rejectionReason: nextStatus === "rejected" ? note : "",
          adminNote: note,
        }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.message || "Unable to update complaint.");
      }

      setComplaints((current) =>
        current.filter((item) => getComplaintId(item) !== complaintId),
      );

      Alert.alert(
        nextStatus === "resolved" ? "Complaint resolved" : "Complaint rejected",
        nextStatus === "resolved"
          ? "The complaint has been marked as resolved."
          : "The complaint has been rejected and removed from the open queue.",
      );
    } catch (error) {
      Alert.alert("Update failed", error?.message || "Please try again.");
    } finally {
      setProcessingId("");
      setActionTarget(null);
      setActionType("");
      setAdminNote("");
    }
  };

  const openActionModal = (complaint, type) => {
    setActionTarget(complaint);
    setActionType(type);
    setAdminNote("");
  };

  const submitAction = () => {
    if (!actionTarget || !actionType) {
      return;
    }

    updateComplaint(
      actionTarget,
      actionType === "resolve" ? "resolved" : "rejected",
      adminNote.trim(),
    );
  };

  const modalIsResolve = actionType === "resolve";

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
            onRefresh={() => fetchComplaints({ refreshing: true })}
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
              <Ionicons name="chatbubble-ellipses-outline" size={14} color="#FFFFFF" />
              <Text style={styles.heroBadgeText}>Requests Section</Text>
            </View>
            <View style={styles.heroIconWrap}>
              <Ionicons name="shield-checkmark-outline" size={22} color="#FFFFFF" />
            </View>
          </View>

          <Text style={styles.heroTitle}>Resolve or reject complaint requests.</Text>
          <Text style={styles.heroSubtitle}>
            Review customer issues, linked services, priority, evidence, and
            admin notes before closing the request.
          </Text>

          <View style={styles.heroStatsRow}>
            <View style={styles.heroStatCard}>
              <Text style={styles.heroStatValue}>{counts.all}</Text>
              <Text style={styles.heroStatLabel}>Open</Text>
            </View>
            <View style={styles.heroStatCard}>
              <Text style={styles.heroStatValue}>{counts.high}</Text>
              <Text style={styles.heroStatLabel}>High priority</Text>
            </View>
            <View style={styles.heroStatCard}>
              <Text style={styles.heroStatValue}>{counts.pending}</Text>
              <Text style={styles.heroStatLabel}>Pending</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.toolbarCard}>
          <View style={styles.searchBox}>
            <Ionicons name="search-outline" size={17} color={COLORS.faint} />
            <TextInput
              value={searchText}
              onChangeText={setSearchText}
              placeholder="Search ticket, user, service, or issue"
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
            {FILTERS.map((filter) => {
              const active = activeFilter === filter.key;

              return (
                <Pressable
                  key={filter.key}
                  style={[styles.filterChip, active && styles.filterChipActive]}
                  onPress={() => setActiveFilter(filter.key)}
                >
                  <Text style={[styles.filterText, active && styles.filterTextActive]}>
                    {filter.label}
                  </Text>
                  <Text style={[styles.filterCount, active && styles.filterCountActive]}>
                    {counts[filter.key]}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionEyebrow}>Complaint queue</Text>
            <Text style={styles.sectionTitle}>Requests waiting for admin action</Text>
          </View>
          <Pressable
            style={styles.refreshButton}
            onPress={() => fetchComplaints({ refreshing: true })}
          >
            <Ionicons name="refresh-outline" size={16} color={COLORS.brand} />
          </Pressable>
        </View>

        {isLoading ? (
          <View style={styles.stateCard}>
            <ActivityIndicator color={COLORS.brand} />
            <Text style={styles.stateTitle}>Loading complaint requests</Text>
            <Text style={styles.stateText}>Fetching open customer complaints.</Text>
          </View>
        ) : errorMessage ? (
          <View style={styles.stateCard}>
            <View style={styles.stateIconWrapDanger}>
              <Ionicons name="warning-outline" size={24} color={COLORS.danger} />
            </View>
            <Text style={styles.stateTitle}>Could not load requests</Text>
            <Text style={styles.stateText}>{errorMessage}</Text>
            <Pressable style={styles.retryButton} onPress={() => fetchComplaints()}>
              <Text style={styles.retryButtonText}>Try again</Text>
            </Pressable>
          </View>
        ) : filteredComplaints.length === 0 ? (
          <View style={styles.stateCard}>
            <View style={styles.stateIconWrap}>
              <Ionicons name="checkmark-done-outline" size={24} color={COLORS.success} />
            </View>
            <Text style={styles.stateTitle}>No complaint requests found</Text>
            <Text style={styles.stateText}>
              New unresolved complaints will appear here for admin review.
            </Text>
          </View>
        ) : (
          filteredComplaints.map((complaint, index) => (
            <ComplaintCard
              key={getComplaintId(complaint) || `${getCustomerEmail(complaint)}-${index}`}
              complaint={complaint}
              index={index}
              processingId={processingId}
              onResolve={(item) => openActionModal(item, "resolve")}
              onReject={(item) => openActionModal(item, "reject")}
              onOpenImage={(url) => setImagePreviewUrl(url || "")}
            />
          ))
        )}
      </ScrollView>

      <Modal
        visible={Boolean(imagePreviewUrl)}
        transparent
        animationType="fade"
        onRequestClose={() => setImagePreviewUrl("")}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.imageModalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Attached evidence</Text>
              <Pressable style={styles.modalCloseButton} onPress={() => setImagePreviewUrl("")}>
                <Ionicons name="close" size={18} color={COLORS.text} />
              </Pressable>
            </View>
            <Image source={{ uri: imagePreviewUrl }} style={styles.previewImage} />
          </View>
        </View>
      </Modal>

      <Modal
        visible={Boolean(actionTarget)}
        transparent
        animationType="fade"
        onRequestClose={() => setActionTarget(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.actionModalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>
                  {modalIsResolve ? "Resolve complaint" : "Reject complaint"}
                </Text>
                <Text style={styles.modalSubtitle}>
                  {modalIsResolve
                    ? "Add the resolution note before closing this complaint."
                    : "Add the reason before rejecting this complaint."}
                </Text>
              </View>
              <Pressable style={styles.modalCloseButton} onPress={() => setActionTarget(null)}>
                <Ionicons name="close" size={18} color={COLORS.text} />
              </Pressable>
            </View>

            <View
              style={[
                styles.actionTargetBox,
                { backgroundColor: modalIsResolve ? COLORS.successSoft : COLORS.dangerSoft },
              ]}
            >
              <Ionicons
                name={modalIsResolve ? "checkmark-circle-outline" : "close-circle-outline"}
                size={18}
                color={modalIsResolve ? COLORS.success : COLORS.danger}
              />
              <View style={styles.actionTargetTextWrap}>
                <Text style={styles.actionTargetTitle}>
                  {actionTarget ? getComplaintTitle(actionTarget) : "Selected complaint"}
                </Text>
                <Text style={styles.actionTargetSubtitle}>
                  {actionTarget ? getCustomerName(actionTarget) : "Selected customer"}
                </Text>
              </View>
            </View>

            <TextInput
              value={adminNote}
              onChangeText={setAdminNote}
              placeholder={
                modalIsResolve
                  ? "Resolution note, action taken, or follow-up details"
                  : "Reason for rejection or missing information"
              }
              placeholderTextColor={COLORS.faint}
              multiline
              textAlignVertical="top"
              style={styles.noteInput}
            />

            <View style={styles.modalActions}>
              <Pressable style={styles.modalCancelButton} onPress={() => setActionTarget(null)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.modalConfirmButton,
                  { backgroundColor: modalIsResolve ? COLORS.success : COLORS.danger },
                ]}
                onPress={submitAction}
              >
                <Text style={styles.modalConfirmText}>
                  {modalIsResolve ? "Resolve" : "Reject"}
                </Text>
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
    marginTop: 14,
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
  complaintCard: {
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
  complaintAccent: {
    position: "absolute",
    left: 0,
    top: 14,
    bottom: 14,
    width: 4,
    borderTopRightRadius: 999,
    borderBottomRightRadius: 999,
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
  customerIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 13,
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
  priorityBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  priorityBadgeText: {
    fontSize: 9,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  complaintPanel: {
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 15,
    padding: 12,
    marginTop: 13,
    borderWidth: 1,
    borderColor: "#EDF2F7",
  },
  complaintPanelHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },
  complaintTitleWrap: {
    flex: 1,
  },
  complaintTitle: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "900",
  },
  complaintServiceText: {
    color: COLORS.muted,
    fontSize: 10,
    lineHeight: 15,
    fontWeight: "700",
    marginTop: 3,
  },
  statusPill: {
    borderRadius: 999,
    backgroundColor: COLORS.blueSoft,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  statusPillText: {
    color: COLORS.blue,
    fontSize: 9,
    fontWeight: "900",
    textTransform: "capitalize",
  },
  complaintMessage: {
    color: COLORS.text,
    fontSize: 11,
    lineHeight: 17,
    fontWeight: "700",
    marginTop: 10,
  },
  infoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 11,
  },
  infoPill: {
    width: "48.5%",
    minHeight: 50,
    borderRadius: 13,
    paddingHorizontal: 10,
    paddingVertical: 9,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  infoPillTextWrap: {
    flex: 1,
  },
  infoPillValue: {
    fontSize: 10.5,
    fontWeight: "900",
    textTransform: "capitalize",
  },
  infoPillLabel: {
    color: COLORS.muted,
    fontSize: 9,
    fontWeight: "800",
    marginTop: 1,
  },
  attachmentCard: {
    marginTop: 11,
    borderRadius: 14,
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 9,
    flexDirection: "row",
    alignItems: "center",
  },
  attachmentImage: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: COLORS.border,
    marginRight: 10,
  },
  attachmentTextWrap: {
    flex: 1,
  },
  attachmentTitle: {
    color: COLORS.text,
    fontSize: 11,
    fontWeight: "900",
  },
  attachmentSubtitle: {
    color: COLORS.muted,
    fontSize: 10,
    fontWeight: "700",
    marginTop: 2,
  },
  cardFooter: {
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
  resolveButton: {
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
  resolveButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "900",
  },
  disabledButton: {
    opacity: 0.72,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.62)",
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  imageModalCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    overflow: "hidden",
    maxHeight: "78%",
  },
  previewImage: {
    width: "100%",
    height: 430,
    resizeMode: "cover",
    backgroundColor: COLORS.surfaceAlt,
  },
  actionModalCard: {
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
  actionTargetBox: {
    margin: 14,
    marginBottom: 0,
    borderRadius: 14,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  actionTargetTextWrap: {
    flex: 1,
  },
  actionTargetTitle: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: "900",
  },
  actionTargetSubtitle: {
    color: COLORS.muted,
    fontSize: 10,
    fontWeight: "700",
    marginTop: 2,
  },
  noteInput: {
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
    alignItems: "center",
    justifyContent: "center",
  },
  modalConfirmText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "900",
  },
});
