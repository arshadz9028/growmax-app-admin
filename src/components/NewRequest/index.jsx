/* eslint-disable react-hooks/set-state-in-effect */
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams } from "expo-router";
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
import CalenderVisit from "../CalenderVisit";
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

function supportsVisitPlan(request) {
  return String(request?.serviceName || "")
    .toLowerCase()
    .includes("cleaning");
}

function getAssignedRequestVisits(request) {
  const visits = Array.isArray(request?.consumerManagement?.selectedVisits)
    ? request.consumerManagement.selectedVisits
    : [];

  const assignedVisits = visits
    .map((visit, visitIndex) => ({ ...visit, visitIndex }))
    .filter((visit) => visit.assignedTechnicianId);
  if (request?.assignedTechnicianId) {
    assignedVisits.push({
      visitIndex: -1,
      assignedTechnicianId: request.assignedTechnicianId,
      assignedTechnicianName: request.assignedTechnicianName || "",
      status: request.inspectionStatus || "Pending",
      isPreApprovalInspection: true,
    });
  }
  return assignedVisits;
}

function getAssignableRequestVisits(request) {
  return request?.assignedTechnicianId
    ? []
    : [{ visitIndex: -1, isPreApprovalInspection: true }];
}

function getServiceIcon(serviceName) {
  const name = String(serviceName || "").toLowerCase();
  if (name.includes("cleaning") && name.includes("amc")) {
    return "leaf-outline";
  }
  if (name.includes("cleaning")) {
    return "water-outline";
  }
  if (name.includes("sprinkler")) {
    return "rainy-outline";
  }
  if (name.includes("amc")) {
    return "shield-checkmark-outline";
  }
  return "construct-outline";
}

function getServiceColor(serviceName) {
  const name = String(serviceName || "").toLowerCase();
  if (name.includes("cleaning") && name.includes("amc")) {
    return { accent: COLORS.success, soft: COLORS.successSoft };
  }
  if (name.includes("cleaning")) {
    return { accent: COLORS.cyan, soft: COLORS.cyanSoft };
  }
  if (name.includes("sprinkler")) {
    return { accent: COLORS.blue, soft: COLORS.blueSoft };
  }
  if (name.includes("amc")) {
    return { accent: COLORS.amber, soft: COLORS.amberSoft };
  }
  return { accent: COLORS.brand, soft: COLORS.surfaceAlt };
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

function EditableField({ icon, label, value, onChangeText, keyboardType }) {
  return (
    <View style={styles.editableField}>
      <View style={styles.editableFieldLabelRow}>
        <Ionicons name={icon} size={14} color={COLORS.brand} />
        <Text style={styles.editableFieldLabel}>{label}</Text>
      </View>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        placeholder="Enter value"
        placeholderTextColor={COLORS.faint}
        style={styles.editableFieldInput}
      />
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

function CategoryCard({ category, onPress }) {
  const colors = getServiceColor(category.name);
  const icon = getServiceIcon(category.name);

  return (
    <Pressable
      style={[styles.categoryCard, { backgroundColor: colors.soft }]}
      onPress={onPress}
    >
      <View style={styles.categoryContent}>
        <View
          style={[styles.categoryIconWrap, { backgroundColor: COLORS.surface }]}
        >
          <Ionicons name={icon} size={20} color={colors.accent} />
        </View>
        <View style={styles.categoryTextWrap}>
          <Text style={styles.categoryName} numberOfLines={2}>
            {category.name}
          </Text>
          <Text style={styles.categoryCount}>
            {category.count} {category.count === 1 ? "request" : "requests"}
          </Text>
        </View>
        <View style={styles.categoryArrow}>
          <Ionicons name="chevron-forward" size={20} color={colors.accent} />
        </View>
      </View>
      <View
        style={[styles.categoryAccent, { backgroundColor: colors.accent }]}
      />
    </Pressable>
  );
}

function ListItemCard({ request, onPress }) {
  return (
    <Pressable style={styles.listItemCard} onPress={onPress}>
      <View style={styles.listItemLeft}>
        <View style={styles.listItemAvatar}>
          <Ionicons name="person-outline" size={20} color={COLORS.brand} />
        </View>
        <View style={styles.listItemTextWrap}>
          <Text style={styles.listItemName} numberOfLines={1}>
            {request?.fullName || "Unnamed customer"}
          </Text>
          <Text style={styles.listItemMeta} numberOfLines={1}>
            {request?.mobileNumber || "No mobile"} •{" "}
            {request?.city || "No city"}
          </Text>
          <Text style={styles.listItemAmount}>
            {formatCurrency(request?.totalAmount)}
          </Text>
        </View>
      </View>
      <View style={styles.listItemRight}>
        <View style={styles.listItemBadge}>
          <View style={styles.listItemDot} />
          <Text style={styles.listItemBadgeText}>Pending</Text>
        </View>
        <Pressable style={styles.listItemViewButton} onPress={onPress}>
          <Text style={styles.listItemViewText}>View detail</Text>
          <Ionicons name="arrow-forward" size={14} color={COLORS.brand} />
        </Pressable>
      </View>
    </Pressable>
  );
}

function RequestCard({
  request,
  index,
  processingId,
  technicianRequestId,
  onViewTechnicianResponses,
  savingDetailsId,
  onApprove,
  onReject,
  onSaveDetails,
  onRequestTechnician,
  onEditVisits,
  onOpenPhoto,
  onOpenVisits,
}) {
  const requestId = getRequestId(request);
  const visitSummary = getVisitSummary(request);
  const selectedVisits = visitSummary.selectedVisits.slice(0, 3);
  const isProcessingApprove = processingId === `approve-${requestId}`;
  const isProcessingReject = processingId === `reject-${requestId}`;
  const isRequestingTechnician = technicianRequestId === requestId;
  const assignedVisits = getAssignedRequestVisits(request);
  const assignableVisits = getAssignableRequestVisits(request);
  const hasAssignedTechnician = assignedVisits.length > 0;
  const hasRequestTechnician = Boolean(request?.assignedTechnicianId);
  const canAssignTechnician = assignableVisits.length > 0;
  const supportsAmountEdit = request?.requestType !== "complaint";
  const supportsPanelEdit =
    request?.requestType === "grow-cleaning" ||
    request?.requestType === "solar-amc";
  const [amountValue, setAmountValue] = React.useState(
    String(request?.totalAmount ?? ""),
  );
  const [panelsValue, setPanelsValue] = React.useState(
    String(request?.numberOfPanels ?? ""),
  );
  const amountNumber = Number(amountValue);
  const panelsNumber = Number(panelsValue);
  const amountIsValid =
    !supportsAmountEdit ||
    (amountValue.trim() !== "" &&
      Number.isFinite(amountNumber) &&
      amountNumber >= 0);
  const panelsAreValid =
    !supportsPanelEdit ||
    (panelsValue.trim() !== "" &&
      Number.isInteger(panelsNumber) &&
      panelsNumber >= 1);
  const hasUnsavedChanges =
    (supportsAmountEdit &&
      amountValue !== String(request?.totalAmount ?? "")) ||
    (supportsPanelEdit &&
      panelsValue !== String(request?.numberOfPanels ?? ""));
  const canSaveDetails =
    hasUnsavedChanges && amountIsValid && panelsAreValid && !savingDetailsId;
  const detailsPayload = {};
  if (supportsAmountEdit) detailsPayload.totalAmount = amountNumber;
  if (supportsPanelEdit) detailsPayload.numberOfPanels = panelsNumber;

  React.useEffect(() => {
    setAmountValue(String(request?.totalAmount ?? ""));
    setPanelsValue(String(request?.numberOfPanels ?? ""));
  }, [requestId, request?.totalAmount, request?.numberOfPanels]);

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
            <Ionicons 
              name={
                request?.requestType === "solar-amc" 
                  ? "sunny-outline" 
                  : "water-outline"
              } 
              size={20} 
              color={
                request?.requestType === "solar-amc" 
                  ? COLORS.amber 
                  : COLORS.cyan
              } 
            />
          </View>
          <View style={styles.serviceTextWrap}>
            <Text style={styles.serviceName}>
              {request?.serviceName || "Service request"}
            </Text>
            <Text style={styles.serviceSubText}>
              Consumer No:{" "}
              {request?.consumerNumber || request?.consumerNo || "Pending"}
            </Text>
            {request?.requestType === "solar-amc" && request?.solarCapacityKw ? (
              <Text style={styles.serviceSubText}>
                Capacity: {request.solarCapacityKw} kW • {request?.connectionType || "N/A"} • {request?.phase || "N/A"} Phase
              </Text>
            ) : null}
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
        {request?.requestType === "solar-amc" ? (
          <>
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
              icon="flash-outline"
              label="Connection"
              value={request?.connectionType || "N/A"}
              accent={COLORS.success}
              soft={COLORS.successSoft}
            />
            <InfoChip
              icon="settings-outline"
              label="Phase"
              value={request?.phase || "N/A"}
              accent={COLORS.cyan}
              soft={COLORS.cyanSoft}
            />
          </>
        ) : (
          <>
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
            {/* Sprinkler only for cleaning services */}
            {(request?.serviceName || "").toLowerCase().includes("cleaning") && (
              <InfoChip
                icon="rainy-outline"
                label="Sprinkler"
                value={request?.sprinkler ? "Yes" : "No"}
                accent={COLORS.cyan}
                soft={COLORS.cyanSoft}
              />
            )}
          </>
        )}
      </View>

      {supportsAmountEdit || supportsPanelEdit ? (
        <View style={styles.editDetailsPanel}>
          <View style={styles.editDetailsHeader}>
            <Text style={styles.editDetailsTitle}>Edit before approval</Text>
            <Text style={styles.editDetailsHint}>Save changes before approving</Text>
          </View>
          <View style={styles.editableFieldsRow}>
            {supportsAmountEdit ? (
              <EditableField
                icon="cash-outline"
                label="Total amount (INR)"
                value={amountValue}
                onChangeText={setAmountValue}
                keyboardType="decimal-pad"
              />
            ) : null}
            {supportsPanelEdit ? (
              <EditableField
                icon="grid-outline"
                label="Panels"
                value={panelsValue}
                onChangeText={setPanelsValue}
                keyboardType="number-pad"
              />
            ) : null}
          </View>
          {hasUnsavedChanges ? (
            <Text style={styles.unsavedChangesText}>
              Save these changes before approving or rejecting this request.
            </Text>
          ) : null}
          <Pressable
            style={[
              styles.saveDetailsButton,
              !canSaveDetails && styles.disabledButton,
            ]}
            onPress={() => onSaveDetails(request, detailsPayload)}
            disabled={!canSaveDetails}
          >
            {savingDetailsId === requestId ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Ionicons name="save-outline" size={15} color="#FFFFFF" />
            )}
            <Text style={styles.saveDetailsButtonText}>
              {savingDetailsId === requestId ? "Saving details" : "Save details"}
            </Text>
          </Pressable>
        </View>
      ) : null}

      <View style={styles.photoAndDetailsRow}>
        {request?.requestType !== "solar-amc" && (
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
        )}

        <View style={[
          styles.detailsMiniList,
          request?.requestType === "solar-amc" && styles.detailsMiniListFull
        ]}>
          <DetailRow
            icon="mail-outline"
            label="Email"
            value={request?.email}
            accent={COLORS.blue}
          />
          {request?.requestType === "solar-amc" && request?.whatsappNumber ? (
            <DetailRow
              icon="logo-whatsapp"
              label="WhatsApp"
              value={request.whatsappNumber}
              accent={COLORS.success}
            />
          ) : null}
          {request?.requestType === "solar-amc" && request?.secondaryPhone ? (
            <DetailRow
              icon="call-outline"
              label="Secondary Phone"
              value={request.secondaryPhone}
              accent={COLORS.amber}
            />
          ) : null}
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

      {supportsVisitPlan(request) ? (
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
          {request?.requestType === "grow-cleaning" ? (
            <Pressable
              style={styles.editVisitsButton}
              onPress={() => onEditVisits(request)}
            >
              <Ionicons name="create-outline" size={14} color={COLORS.brand} />
              <Text style={styles.editVisitsButtonText}>Edit visit dates</Text>
            </Pressable>
          ) : null}

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
                  onOpenVisits && onOpenVisits(visitSummary.selectedVisits, request)
                }
                style={styles.viewAllVisitsButton}
              >
                <Text style={styles.viewAllVisitsText}>View all</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      ) : null}

      {request?.requestType !== "complaint" ? (
        <View style={styles.technicianActionsRow}>
          <Pressable
            style={[
              styles.assignTechnicianButton,
              (isRequestingTechnician || !canAssignTechnician) &&
                styles.disabledButton,
            ]}
            onPress={() => onRequestTechnician(request)}
            disabled={
              Boolean(technicianRequestId) ||
              !canAssignTechnician
            }
          >
            {isRequestingTechnician ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Ionicons
                name={
                  hasRequestTechnician
                    ? "checkmark-circle-outline"
                    : "person-add-outline"
                }
                size={16}
                color="#FFFFFF"
              />
            )}
            <Text style={styles.assignTechnicianButtonText}>
              {isRequestingTechnician
                ? "Loading"
                : hasRequestTechnician
                  ? "Tech Assigned"
                  : "Assign Tech"}
            </Text>
          </Pressable>
          <Pressable
            style={[
              styles.viewTechnicianResponseButton,
              !hasAssignedTechnician && styles.disabledButton,
            ]}
            onPress={() => onViewTechnicianResponses(request)}
            disabled={!hasAssignedTechnician}
          >
            <Ionicons
              name="chatbox-ellipses-outline"
              size={16}
              color={hasAssignedTechnician ? COLORS.brand : COLORS.faint}
            />
            <Text
              style={[
                styles.viewTechnicianResponseButtonText,
                !hasAssignedTechnician && styles.disabledTechnicianActionText,
              ]}
            >
              View Response
            </Text>
          </Pressable>
        </View>
      ) : null}

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
            (isProcessingReject || hasUnsavedChanges) &&
              styles.disabledButton,
          ]}
          onPress={() => onReject(request)}
          disabled={Boolean(processingId) || hasUnsavedChanges}
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
            (isProcessingApprove || hasUnsavedChanges) &&
              styles.disabledButton,
          ]}
          onPress={() => onApprove(request)}
          disabled={Boolean(processingId) || hasUnsavedChanges}
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
  const routeParams = useLocalSearchParams();
  const requestedRequestId = Array.isArray(routeParams.requestId)
    ? routeParams.requestId[0]
    : routeParams.requestId;
  const requestedRequestType = Array.isArray(routeParams.requestType)
    ? routeParams.requestType[0]
    : routeParams.requestType;
  const requestedServiceName = Array.isArray(routeParams.serviceName)
    ? routeParams.serviceName[0]
    : routeParams.serviceName;
  const [requests, setRequests] = React.useState([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState("");
  const [processingId, setProcessingId] = React.useState("");
  const [technicianRequestId, setTechnicianRequestId] = React.useState("");
  const [technicianPickerRequest, setTechnicianPickerRequest] =
    React.useState(null);
  const [technicians, setTechnicians] = React.useState([]);
  const [isLoadingTechnicians, setIsLoadingTechnicians] = React.useState(false);
  const [assigningTechnicianId, setAssigningTechnicianId] =
    React.useState("");
  const [technicianPickerError, setTechnicianPickerError] = React.useState("");
  const [technicianResponseRequest, setTechnicianResponseRequest] =
    React.useState(null);
  const [technicianResponses, setTechnicianResponses] = React.useState([]);
  const [isLoadingTechnicianResponses, setIsLoadingTechnicianResponses] =
    React.useState(false);
  const [savingDetailsId, setSavingDetailsId] = React.useState("");
  const [previewPhotoUrl, setPreviewPhotoUrl] = React.useState("");
  const [rejectTarget, setRejectTarget] = React.useState(null);
  const [rejectReason, setRejectReason] = React.useState("");
  const [visitModalVisits, setVisitModalVisits] = React.useState([]);
  const [visitModalRequest, setVisitModalRequest] = React.useState(null);
  const [isVisitModalVisible, setIsVisitModalVisible] = React.useState(false);
  const [visitEditorRequest, setVisitEditorRequest] = React.useState(null);
  const [visitCalendarInitialDate, setVisitCalendarInitialDate] =
    React.useState(null);
  const [visitEditorHasChanges, setVisitEditorHasChanges] = React.useState(false);
  
  // New navigation states
  const [currentView, setCurrentView] = React.useState("categories"); // categories | list | detail
  const [selectedCategory, setSelectedCategory] = React.useState(null);
  const [selectedRequest, setSelectedRequest] = React.useState(null);
  const [searchTerm, setSearchTerm] = React.useState("");

  // Helper function to extract city from full address
  const extractCityFromAddress = React.useCallback((address) => {
    if (!address) return "";
    // Try to extract city from address format: "..., City, State Pincode, Country"
    const parts = address.split(",").map(p => p.trim());
    // Usually city is the second-to-last or third-to-last part
    if (parts.length >= 3) {
      return parts[parts.length - 3] || parts[parts.length - 2] || "";
    }
    return parts[0] || "";
  }, []);

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

        // The backend returns combined data from GrowCleaning, SolarAMC, and Complaints
        // with a requestType field ('grow-cleaning', 'solar-amc', or 'complaint')
        const combinedData = normalizePendingRequests(payload);

        // Normalize Solar AMC and Complaint data to match Grow Cleaning structure
        const normalizedRequests = combinedData.map((request) => {
          if (request.requestType === "solar-amc") {
            return {
              ...request,
              // Map Solar AMC fields to standard field names
              fullName: request.consumerName || request.fullName || "Unnamed customer",
              mobileNumber: request.primaryPhone || request.mobileNumber || "No mobile",
              address: request.consumerAddress || request.address || "",
              city: extractCityFromAddress(request.consumerAddress || request.address || ""),
              consumerNumber: request.consumerNo || request.consumerNumber || "",
              serviceName: "Solar AMC",
              email: request.email || "",
              latitude: request.latitude || "",
              longitude: request.longitude || "",
              // Solar AMC specific fields
              solarCapacityKw: request.solarCapacityKw || "",
              connectionType: request.connectionType || "",
              phase: request.phase || "",
              secondaryPhone: request.secondaryPhone || "",
              whatsappNumber: request.whatsappNumber || "",
              // Set fields that don't exist in Solar AMC
              walkwayAndLadder: false,
              sprinkler: false,
              sitePhotoUrl: "",
              landmark: request.landmark || "",
              consumerManagement: {
                totalVisit: 0,
                markedVisit: 0,
                remainingVisit: 0,
                selectedVisits: [],
              },
            };
          }
          
          // For Grow Cleaning and other types, return as-is but ensure required fields exist
          return {
            ...request,
            fullName: request.fullName || "Unnamed customer",
            mobileNumber: request.mobileNumber || "No mobile",
            city: request.city || "",
            serviceName: request.serviceName || "Service request",
          };
        });

        setRequests(normalizedRequests);
      } catch (error) {
        setErrorMessage(error?.message || "Unable to load pending requests.");
        if (!refreshing) {
          setRequests([]);
        }
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [extractCityFromAddress],
  );

  React.useEffect(() => {
    fetchPendingRequests();
  }, [fetchPendingRequests]);

  // Group requests by service category
  const categorizedRequests = React.useMemo(() => {
    const categories = {};
    requests.forEach((request) => {
      const serviceName = request?.serviceName || "Other Services";
      if (!categories[serviceName]) {
        categories[serviceName] = [];
      }
      categories[serviceName].push(request);
    });
    return categories;
  }, [requests]);

  const categories = Object.keys(categorizedRequests).map((serviceName) => ({
    name: serviceName,
    count: categorizedRequests[serviceName].length,
    requests: categorizedRequests[serviceName],
  }));

  React.useEffect(() => {
    if (
      isLoading ||
      (!requestedRequestId && !requestedServiceName && !requestedRequestType)
    ) {
      return;
    }

    const matchingRequest = requestedRequestId
      ? requests.find(
          (request) => String(getRequestId(request)) === String(requestedRequestId),
        )
      : null;

    if (matchingRequest) {
      setSelectedCategory(matchingRequest.serviceName || "Other Services");
      setSelectedRequest(matchingRequest);
      setSearchTerm("");
      setCurrentView("detail");
      return;
    }

    const normalizedTargets = [requestedServiceName, requestedRequestType]
      .filter(Boolean)
      .map((target) => target.toLowerCase().replace(/[^a-z0-9]/g, ""));
    const matchingCategory = Object.keys(categorizedRequests).find(
      (categoryName) => {
        const normalizedCategory = categoryName
          .toLowerCase()
          .replace(/[^a-z0-9]/g, "");
        return normalizedTargets.some(
          (normalizedTarget) =>
            normalizedCategory === normalizedTarget ||
            normalizedCategory.includes(normalizedTarget) ||
            normalizedTarget.includes(normalizedCategory),
        );
      },
    );

    if (matchingCategory) {
      setSelectedCategory(matchingCategory);
      setSelectedRequest(null);
      setSearchTerm("");
      setCurrentView("list");
    }
  }, [
    categorizedRequests,
    isLoading,
    requestedRequestId,
    requestedRequestType,
    requestedServiceName,
    requests,
  ]);

  const filteredRequests = React.useMemo(() => {
    const baseRequests = selectedCategory
      ? categorizedRequests[selectedCategory] || []
      : [];

    const normalizedSearchTerm = searchTerm.trim().toLowerCase();

    if (!normalizedSearchTerm) {
      return baseRequests;
    }

    return baseRequests.filter((request) => {
      const fullName = String(request?.fullName || "").toLowerCase();
      const mobileNumber = String(request?.mobileNumber || "").toLowerCase();
      const consumerNumber = String(
        request?.consumerNumber || request?.consumerNo || "",
      ).toLowerCase();

      return (
        fullName.includes(normalizedSearchTerm) ||
        mobileNumber.includes(normalizedSearchTerm) ||
        consumerNumber.includes(normalizedSearchTerm)
      );
    });
  }, [categorizedRequests, searchTerm, selectedCategory]);

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


      if (!response.ok || payload?.success === false) {
        throw new Error(payload?.message || `Unable to ${actionKey} request.`);
      }

      setRequests((current) =>
        current.filter(
          (item) => String(getRequestId(item)) !== String(requestId),
        ),
      );
      setSelectedRequest(null);
      setCurrentView("list");
      await fetchPendingRequests({ refreshing: true });

      Alert.alert(
        nextStatus === "approved" ? "Request approved" : "Request rejected",
        nextStatus === "approved"
          ? "The request has been moved out of the pending queue."
          : "The request has been rejected and removed from the pending queue.",
      );
    } catch (error) {
      console.error("Update error:", error);
      Alert.alert("Update failed", error?.message || "Please try again.");
    } finally {
      setProcessingId("");
      setRejectTarget(null);
      setRejectReason("");
    }
  };

  const handleApprove = (request) => {
    updateRequestStatus(request, "approved");
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

  const handleBackToCategories = () => {
    setCurrentView("categories");
    setSelectedCategory(null);
    setSelectedRequest(null);
    setSearchTerm("");
  };

  const handleBackToList = () => {
    setCurrentView("list");
    setSelectedRequest(null);
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
    setSearchTerm("");
    setCurrentView("list");
  };

  const handleRequestSelect = (request) => {
    setSelectedRequest(request);
    setCurrentView("detail");
  };

  const handleSaveDetails = async (request, fields) => {
    const requestId = getRequestId(request);
    if (!requestId) {
      Alert.alert("Missing request ID", "This request cannot be updated.");
      return;
    }

    const currentStatus = getRequestStatus(request);
    if (currentStatus && !["pending", "new"].includes(currentStatus)) {
      Alert.alert(
        "Request is no longer pending",
        "Only pending requests can be edited.",
      );
      return;
    }

    if (
      !Number.isFinite(fields.totalAmount) ||
      fields.totalAmount < 0 ||
      (fields.numberOfPanels !== undefined &&
        (!Number.isInteger(fields.numberOfPanels) ||
          fields.numberOfPanels < 1))
    ) {
      Alert.alert(
        "Invalid details",
        "Enter a valid amount and a panel count of at least 1.",
      );
      return;
    }

    const updatePayload = { ...fields };
    if (request?.requestType === "electrical-amc") {
      updatePayload.annualFee = fields.totalAmount;
    }

    setSavingDetailsId(requestId);
    try {
      const response = await safeFetch(
        getApiUrl(`/api/admin/requests/${requestId}`),
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updatePayload),
        },
      );
      const payload = await response.json().catch(() => null);
      if (!response.ok || payload?.success === false) {
        throw new Error(payload?.message || "Unable to save request details.");
      }

      const applyUpdate = (item) =>
        String(getRequestId(item)) === String(requestId)
          ? { ...item, ...updatePayload }
          : item;
      setRequests((current) => current.map(applyUpdate));
      setSelectedRequest((current) =>
        current && String(getRequestId(current)) === String(requestId)
          ? { ...current, ...updatePayload }
          : current,
      );
      Alert.alert("Details saved", "The pending request has been updated.");
    } catch (error) {
      Alert.alert("Update failed", error?.message || "Please try again.");
    } finally {
      setSavingDetailsId("");
    }
  };

  const handleRequestTechnician = async (request) => {
    const requestId = getRequestId(request);
    if (!requestId) {
      Alert.alert("Missing request ID", "This request cannot be updated.");
      return;
    }

    setTechnicianPickerRequest(request);
    setTechnicianPickerError("");
    setTechnicians([]);
    setIsLoadingTechnicians(true);
    setTechnicianRequestId(requestId);
    try {
      const response = await safeFetch(
        getApiUrl("/api/admin/technicians"),
      );
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.success) {
        throw new Error(
          payload?.message || "Unable to load technicians.",
        );
      }

      setTechnicians(Array.isArray(payload.data) ? payload.data : []);
    } catch (error) {
      setTechnicianPickerError(
        error?.message || "Unable to load technicians.",
      );
    } finally {
      setIsLoadingTechnicians(false);
      setTechnicianRequestId("");
    }
  };

  const handleAssignTechnician = async (request, technician) => {
    const requestId = String(getRequestId(request) || "");
    const technicianId = String(
      technician?._id || technician?.id || technician?.technicianId || "",
    );
    const technicianName = String(
      technician?.name || technician?.fullName || technician?.username || "",
    ).trim();
    if (!/^[a-f\d]{24}$/i.test(requestId)) {
      setTechnicianPickerError("This request has an invalid ID.");
      return;
    }
    if (!/^[a-f\d]{24}$/i.test(technicianId) || !technicianName) {
      setTechnicianPickerError("Select a valid active technician.");
      return;
    }

    setAssigningTechnicianId(technicianId);
    setTechnicianRequestId(requestId);
    setTechnicianPickerError("");
    try {
      const response = await safeFetch(
        getApiUrl(
          `/api/admin/visits/${encodeURIComponent(
            `${requestId}-inspection`,
          )}/assign`,
        ),
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            requestId,
            visitIndex: -1,
            assignedTechnicianId: technicianId,
            assignedTechnicianName: technicianName,
            assignmentStatus: "assigned",
            status: "Pending",
          }),
        },
      );
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.message || "Unable to assign technician.");
      }

      const assignedAt =
        payload?.data?.assignedAt || new Date().toISOString();
      const updateRequest = (item) =>
        String(getRequestId(item)) === requestId
          ? {
              ...item,
              assignedTechnicianId: technicianId,
              assignedTechnicianName: technicianName,
              assignedAt,
              assignmentStatus: "assigned",
              inspectionStatus: "Pending",
              technicianAssignmentRequested: false,
            }
          : item;
      setRequests((current) => current.map(updateRequest));
      setSelectedRequest((current) =>
        current ? updateRequest(current) : current,
      );
      setTechnicianPickerRequest(null);
      setTechnicianPickerError("");
      Alert.alert(
        "Technician assigned",
        `${technicianName} was assigned for a pre-approval site inspection and can now see it under My Visits.`,
      );
    } catch (error) {
      setTechnicianPickerError(
        error?.message || "Unable to assign technician.",
      );
    } finally {
      setAssigningTechnicianId("");
      setTechnicianRequestId("");
    }
  };

  const handleViewTechnicianResponses = async (request) => {
    const assignedVisits = getAssignedRequestVisits(request);
    if (assignedVisits.length === 0) {
      Alert.alert(
        "Technician not assigned",
        "Assign a technician to this request before viewing responses.",
      );
      return;
    }

    const technicianIds = [
      ...new Set(assignedVisits.map((visit) => String(visit.assignedTechnicianId))),
    ];
    setTechnicianResponseRequest(request);
    setTechnicianResponses([]);
    setIsLoadingTechnicianResponses(true);

    try {
      const responsesByTechnician = await Promise.all(
        technicianIds.map(async (technicianId) => {
          const response = await safeFetch(
            getApiUrl(
              `/api/admin/technicians?technicianId=${encodeURIComponent(technicianId)}`,
            ),
          );
          const payload = await response.json().catch(() => null);
          if (!response.ok || payload?.success === false) {
            throw new Error(
              payload?.message || "Unable to load technician responses.",
            );
          }
          return Array.isArray(payload?.data) ? payload.data : [];
        }),
      );
      const requestId = String(getRequestId(request));
      const responseVisits = responsesByTechnician
        .flat()
        .filter((visit) => String(visit?.requestId) === requestId);
      setTechnicianResponses(responseVisits);
      if (
        responseVisits.some(
          (visit) =>
            Number(visit?.visitIndex) === -1 &&
            String(visit?.status || "").toLowerCase() === "completed",
        )
      ) {
        const markInspectionComplete = (item) =>
          String(getRequestId(item)) === requestId
            ? { ...item, inspectionStatus: "Completed" }
            : item;
        setRequests((current) => current.map(markInspectionComplete));
        setSelectedRequest((current) =>
          current ? markInspectionComplete(current) : current,
        );
      }
    } catch (error) {
      setTechnicianResponseRequest(null);
      Alert.alert(
        "Responses unavailable",
        error?.message || "Unable to load technician responses.",
      );
    } finally {
      setIsLoadingTechnicianResponses(false);
    }
  };

  const updateLocalVisitDates = (requestId, selectedVisits = []) => {
    const applyUpdate = (item) =>
      String(getRequestId(item)) === String(requestId)
        ? {
            ...item,
            consumerManagement: {
              ...(item.consumerManagement || {}),
              selectedVisits,
            },
          }
        : item;
    setRequests((current) => current.map(applyUpdate));
    setSelectedRequest((current) =>
      current && String(getRequestId(current)) === String(requestId)
        ? applyUpdate(current)
        : current,
    );
    setVisitEditorRequest((current) =>
      current && String(getRequestId(current)) === String(requestId)
        ? applyUpdate(current)
        : current,
    );
  };

  const closeVisitEditor = () => {
    if (visitEditorHasChanges) {
      Alert.alert(
        "Close visit editor?",
        "New dates not saved with the button will be discarded. Removed dates were saved immediately.",
        [
          { text: "Keep editing", style: "cancel" },
          {
            text: "Close",
            style: "destructive",
            onPress: () => {
              setVisitEditorRequest(null);
              setVisitCalendarInitialDate(null);
              setVisitEditorHasChanges(false);
            },
          },
        ],
      );
      return;
    }
    setVisitEditorRequest(null);
    setVisitCalendarInitialDate(null);
  };

  const openVisitCalendarFromList = (visit) => {
    if (!visitModalRequest) {
      Alert.alert(
        "Request unavailable",
        "This visit schedule is no longer available to edit.",
      );
      return;
    }

    setVisitEditorHasChanges(false);
    setVisitCalendarInitialDate(visit?.date || null);
    setVisitEditorRequest(visitModalRequest);
    setIsVisitModalVisible(false);
  };

  const renderCategoriesView = () => (
    <>
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
            <Ionicons name="file-tray-full-outline" size={14} color="#FFFFFF" />
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
          Select a service category to review
        </Text>
        <Text style={styles.heroSubtitle}>
          Choose from available service types to view pending requests that need
          your approval.
        </Text>
      </LinearGradient>

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
          onPress={() => fetchPendingRequests({ refreshing: true })}
        >
          <Ionicons name="refresh-outline" size={16} color={COLORS.brand} />
        </Pressable>
      </View>

      {isLoading ? (
        <View style={styles.stateCard}>
          <ActivityIndicator color={COLORS.brand} />
          <Text style={styles.stateTitle}>Loading categories</Text>
          <Text style={styles.stateText}>
            Fetching service categories with pending requests.
          </Text>
        </View>
      ) : errorMessage ? (
        <View style={styles.stateCard}>
          <View style={styles.stateIconWrapDanger}>
            <Ionicons name="warning-outline" size={24} color={COLORS.danger} />
          </View>
          <Text style={styles.stateTitle}>Could not load categories</Text>
          <Text style={styles.stateText}>{errorMessage}</Text>
          <Pressable
            style={styles.retryButton}
            onPress={() => fetchPendingRequests()}
          >
            <Text style={styles.retryButtonText}>Try again</Text>
          </Pressable>
        </View>
      ) : categories.length === 0 ? (
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
        categories.map((category, index) => (
          <CategoryCard
            key={`${category.name}-${index}`}
            category={category}
            onPress={() => handleCategorySelect(category.name)}
          />
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
        colors={
          getServiceColor(selectedCategory).accent === COLORS.cyan
            ? ["#06B6D4", "#0891B2", "#0E7490"]
            : getServiceColor(selectedCategory).accent === COLORS.success
              ? ["#10B981", "#059669", "#047857"]
              : getServiceColor(selectedCategory).accent === COLORS.blue
                ? ["#657EEA", "#5A67D8", "#4C51BF"]
                : ["#F59E0B", "#D97706", "#B45309"]
        }
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
              name={getServiceIcon(selectedCategory)}
              size={14}
              color="#FFFFFF"
            />
            <Text style={styles.heroBadgeText}>{selectedCategory}</Text>
          </View>
          <View style={styles.heroIconWrap}>
            <Ionicons name="list-outline" size={22} color="#FFFFFF" />
          </View>
        </View>

        <Text style={styles.heroTitle}>
          {filteredRequests.length} pending{" "}
          {filteredRequests.length === 1 ? "request" : "requests"}
        </Text>
        <Text style={styles.heroSubtitle}>
          Select any request to view complete details and approve or reject.
        </Text>
      </LinearGradient>

      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionEyebrow}>Consumer list</Text>
          <Text style={styles.sectionTitle}>
            Requests in {selectedCategory}
          </Text>
        </View>

        <Pressable
          style={styles.refreshButton}
          onPress={() => fetchPendingRequests({ refreshing: true })}
        >
          <Ionicons name="refresh-outline" size={16} color={COLORS.brand} />
        </Pressable>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={16} color={COLORS.muted} />
        <TextInput
          value={searchTerm}
          onChangeText={setSearchTerm}
          placeholder="Search by name, mobile or consumer no"
          placeholderTextColor={COLORS.faint}
          style={styles.searchInput}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {searchTerm ? (
          <Pressable onPress={() => setSearchTerm("")}>
            <Ionicons name="close-circle" size={16} color={COLORS.muted} />
          </Pressable>
        ) : null}
      </View>

      {filteredRequests.length === 0 ? (
        <View style={styles.stateCard}>
          <View style={styles.stateIconWrap}>
            <Ionicons
              name="checkmark-done-outline"
              size={24}
              color={COLORS.success}
            />
          </View>
          <Text style={styles.stateTitle}>
            {searchTerm
              ? "No matching requests"
              : "No requests in this category"}
          </Text>
          <Text style={styles.stateText}>
            {searchTerm
              ? "Try another name, mobile number, or consumer number."
              : "All requests for this service have been processed."}
          </Text>
        </View>
      ) : (
        filteredRequests.map((request, index) => (
          <ListItemCard
            key={getRequestId(request) || `${request?.mobileNumber}-${index}`}
            request={request}
            onPress={() => handleRequestSelect(request)}
          />
        ))
      )}
    </>
  );

  const renderDetailView = () => {
    if (!selectedRequest) return null;

    return (
      <>
        <View style={styles.backHeader}>
          <Pressable style={styles.backButton} onPress={handleBackToList}>
            <Ionicons name="arrow-back" size={20} color={COLORS.brand} />
            <Text style={styles.backButtonText}>Back to list</Text>
          </Pressable>
        </View>

        <RequestCard
          request={selectedRequest}
          index={filteredRequests.findIndex(
            (request) =>
              String(getRequestId(request)) ===
              String(getRequestId(selectedRequest)),
          )}
          processingId={processingId}
          technicianRequestId={technicianRequestId}
          onViewTechnicianResponses={handleViewTechnicianResponses}
          savingDetailsId={savingDetailsId}
          onApprove={handleApprove}
          onReject={handleReject}
          onSaveDetails={handleSaveDetails}
          onRequestTechnician={handleRequestTechnician}
          onEditVisits={(request) => {
            setVisitEditorHasChanges(false);
            setVisitCalendarInitialDate(null);
            setVisitEditorRequest(request);
          }}
          onOpenPhoto={(photoUrl) => setPreviewPhotoUrl(photoUrl || "")}
          onOpenVisits={(visits, request) => {
            setVisitModalVisits(Array.isArray(visits) ? visits : []);
            setVisitModalRequest(request);
            setIsVisitModalVisible(true);
          }}
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
            onRefresh={() => fetchPendingRequests({ refreshing: true })}
          />
        }
      >
        {currentView === "categories" && renderCategoriesView()}
        {currentView === "list" && renderListView()}
        {currentView === "detail" && renderDetailView()}
      </ScrollView>

      <Modal
        visible={Boolean(technicianPickerRequest)}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!assigningTechnicianId) {
            setTechnicianPickerRequest(null);
            setTechnicianPickerError("");
          }
        }}
      >
        <View style={styles.photoModalOverlay}>
          <View style={styles.technicianPickerCard}>
            <View style={styles.photoModalHeader}>
              <View style={styles.technicianPickerHeading}>
                <Text style={styles.photoModalTitle}>Assign a technician</Text>
                <Text style={styles.technicianPickerSubtitle}>
                  {technicianPickerRequest?.serviceName || "Service request"}
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close technician list"
                disabled={Boolean(assigningTechnicianId)}
                style={styles.modalCloseButton}
                onPress={() => {
                  setTechnicianPickerRequest(null);
                  setTechnicianPickerError("");
                }}
              >
                <Ionicons name="close" size={18} color={COLORS.text} />
              </Pressable>
            </View>

            <Text style={styles.technicianPickerHint}>
              A pre-approval site inspection is optional. Assign a technician
              if an inspection is needed; you can approve the request without
              assigning one.
            </Text>

            {technicianPickerError ? (
              <View style={styles.technicianPickerError}>
                <Ionicons
                  name="alert-circle-outline"
                  size={17}
                  color={COLORS.danger}
                />
                <Text style={styles.technicianPickerErrorText}>
                  {technicianPickerError}
                </Text>
              </View>
            ) : null}

            {isLoadingTechnicians ? (
              <View style={styles.technicianPickerState}>
                <ActivityIndicator color={COLORS.brand} />
                <Text style={styles.technicianPickerStateText}>
                  Loading active technicians...
                </Text>
              </View>
            ) : technicians.length ? (
              <ScrollView
                style={styles.technicianPickerList}
                keyboardShouldPersistTaps="handled"
              >
                {technicians.map((technician) => {
                  const technicianId = String(
                    technician?._id ||
                      technician?.id ||
                      technician?.technicianId ||
                      "",
                  );
                  const isAssigning = assigningTechnicianId === technicianId;
                  return (
                    <Pressable
                      key={technicianId}
                      accessibilityRole="button"
                      accessibilityLabel={`Assign to ${technician?.name || technician?.fullName || "technician"}`}
                      accessibilityState={{
                        disabled: Boolean(assigningTechnicianId),
                      }}
                      disabled={Boolean(assigningTechnicianId)}
                      onPress={() =>
                        handleAssignTechnician(
                          technicianPickerRequest,
                          technician,
                        )
                      }
                      style={[
                        styles.technicianOption,
                        isAssigning && styles.technicianOptionSelected,
                        assigningTechnicianId &&
                          !isAssigning &&
                          styles.disabledButton,
                      ]}
                    >
                      <View style={styles.technicianAvatar}>
                        <Ionicons
                          name="person-outline"
                          size={18}
                          color={COLORS.brand}
                        />
                      </View>
                      <View style={styles.technicianOptionInfo}>
                        <Text
                          numberOfLines={1}
                          style={styles.technicianOptionName}
                        >
                          {technician?.name ||
                            technician?.fullName ||
                            technician?.username ||
                            "Technician"}
                        </Text>
                        <Text
                          numberOfLines={1}
                          style={styles.technicianOptionMeta}
                        >
                          {[technician?.city, technician?.mobileNumber]
                            .filter(Boolean)
                            .join(" · ") || "Active technician"}
                        </Text>
                      </View>
                      {isAssigning ? (
                        <ActivityIndicator color={COLORS.brand} size="small" />
                      ) : (
                        <Ionicons
                          name="chevron-forward"
                          size={18}
                          color={COLORS.faint}
                        />
                      )}
                    </Pressable>
                  );
                })}
              </ScrollView>
            ) : !isLoadingTechnicians && !technicianPickerError ? (
              <View style={styles.technicianPickerState}>
                <Ionicons
                  name="people-outline"
                  size={25}
                  color={COLORS.faint}
                />
                <Text style={styles.technicianPickerStateText}>
                  No active technicians are available.
                </Text>
              </View>
            ) : null}

            {technicianPickerError && technicians.length === 0 ? (
              <Pressable
                accessibilityRole="button"
                disabled={isLoadingTechnicians}
                onPress={() =>
                  technicianPickerRequest &&
                  handleRequestTechnician(technicianPickerRequest)
                }
                style={styles.technicianPickerRetry}
              >
                <Text style={styles.technicianPickerRetryText}>Try again</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </Modal>

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
        visible={Boolean(technicianResponseRequest)}
        transparent
        animationType="fade"
        onRequestClose={() => setTechnicianResponseRequest(null)}
      >
        <View style={styles.photoModalOverlay}>
          <View style={styles.rejectModalCard}>
            <View style={styles.photoModalHeader}>
              <Text style={styles.photoModalTitle}>Technician responses</Text>
              <Pressable
                style={styles.modalCloseButton}
                onPress={() => setTechnicianResponseRequest(null)}
              >
                <Ionicons name="close" size={18} color={COLORS.text} />
              </Pressable>
            </View>
            {isLoadingTechnicianResponses ? (
              <View style={styles.technicianResponseState}>
                <ActivityIndicator color={COLORS.brand} />
                <Text style={styles.technicianResponseStateText}>
                  Loading technician responses...
                </Text>
              </View>
            ) : technicianResponses.length > 0 ? (
              <ScrollView style={styles.visitListScroll}>
                {technicianResponses.map((response, index) => {
                  const isInspection =
                    response?.isPreApprovalInspection === true ||
                    Number(response?.visitIndex) === -1;
                  return (
                    <View
                      key={`${response?.requestId}-${response?.visitIndex}-${index}`}
                      style={styles.technicianResponseItem}
                    >
                      <Text style={styles.technicianResponseTitle}>
                        {isInspection
                          ? "Pre-approval site inspection"
                          : `Visit ${Number(response?.visitIndex ?? index) + 1}`}
                      </Text>
                      <Text style={styles.technicianResponseMeta}>
                        {isInspection
                          ? "No schedule date"
                          : formatDate(response?.dateOfVisit)}{" "}
                        ·{" "}
                        {response?.reviewStatus ||
                          response?.status ||
                          "Pending"}
                      </Text>
                      {response?.issueNote ? (
                        <Text style={styles.technicianResponseNote}>
                          {response.issueNote}
                        </Text>
                      ) : null}
                      {response?.beforePhotoUrl || response?.afterPhotoUrl ? (
                        <View style={styles.technicianResponsePhotos}>
                          {[
                            ["Before", response.beforePhotoUrl],
                            ["After", response.afterPhotoUrl],
                          ]
                            .filter(([, photoUrl]) => photoUrl)
                            .map(([label, photoUrl]) => (
                              <Pressable
                                key={label}
                                onPress={() => setPreviewPhotoUrl(photoUrl)}
                                style={styles.technicianResponsePhoto}
                              >
                                <Image
                                  source={{ uri: photoUrl }}
                                  style={styles.technicianResponseImage}
                                />
                                <Text style={styles.technicianResponsePhotoLabel}>
                                  {label}
                                </Text>
                              </Pressable>
                            ))}
                        </View>
                      ) : (
                        <Text style={styles.technicianResponseMeta}>
                          No response submitted yet.
                        </Text>
                      )}
                    </View>
                  );
                })}
              </ScrollView>
            ) : (
              <View style={styles.technicianResponseState}>
                <Ionicons
                  name="chatbox-ellipses-outline"
                  size={24}
                  color={COLORS.faint}
                />
                <Text style={styles.technicianResponseStateText}>
                  No technician responses have been submitted yet.
                </Text>
              </View>
            )}
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

            <Text style={styles.rejectHelpText}>
              Select any visit date to open that month in the calendar.
            </Text>
            <ScrollView style={styles.visitListScroll}>
              {visitModalVisits.length === 0 ? (
                <View style={{ padding: 16 }}>
                  <Text style={styles.noVisitText}>No visits available</Text>
                </View>
              ) : (
                visitModalVisits.map((v, i) => (
                  <Pressable
                    key={`visit-modal-${i}`}
                    style={styles.visitListItem}
                    accessibilityRole="button"
                    accessibilityLabel={`Open calendar for ${formatDate(v?.date)}`}
                    onPress={() => openVisitCalendarFromList(v)}
                  >
                    <Ionicons
                      name="calendar-outline"
                      size={16}
                      color={COLORS.brand}
                    />
                    <Text style={styles.visitListText}>
                      {formatDate(v?.date)}
                    </Text>
                    <Ionicons
                      name="chevron-forward"
                      size={15}
                      color={COLORS.faint}
                    />
                  </Pressable>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={Boolean(visitEditorRequest)}
        transparent
        animationType="slide"
        onRequestClose={closeVisitEditor}
      >
        <View style={styles.photoModalOverlay}>
          <View style={styles.calendarEditModal}>
            <View style={styles.photoModalHeader}>
              <Text style={styles.photoModalTitle}>Edit visit dates</Text>
              <Pressable
                style={styles.modalCloseButton}
                onPress={closeVisitEditor}
              >
                <Ionicons name="close" size={18} color={COLORS.text} />
              </Pressable>
            </View>
            <ScrollView
              style={styles.calendarEditScroll}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={styles.visitEditorNotice}>
                Added dates are saved with the button. Removing an existing date
                saves that removal immediately.
              </Text>
              <CalenderVisit
                previousData={{
                  ...visitEditorRequest,
                  selectedVisits: getVisitSummary(visitEditorRequest).selectedVisits,
                }}
                requestId={getRequestId(visitEditorRequest)}
                initialDate={visitCalendarInitialDate}
                serviceTitle={visitEditorRequest?.serviceName || "Service request"}
                submitLabel="Save visit dates"
                onDataChange={() => setVisitEditorHasChanges(true)}
                onServerChange={({ selectedVisits }) =>
                  updateLocalVisitDates(
                    getRequestId(visitEditorRequest),
                    selectedVisits,
                  )
                }
                onModify={({ selectedVisits }) => {
                  updateLocalVisitDates(
                    getRequestId(visitEditorRequest),
                    selectedVisits,
                  );
                  setVisitEditorRequest(null);
                  setVisitCalendarInitialDate(null);
                  setVisitEditorHasChanges(false);
                }}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={Boolean(rejectTarget)}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setRejectTarget(null);
        }}
      >
        <View style={styles.photoModalOverlay}>
          <View style={styles.rejectModalCard}>
            <View style={styles.photoModalHeader}>
              <Text style={styles.photoModalTitle}>Reject request</Text>
              <Pressable
                style={styles.modalCloseButton}
                onPress={() => {
                  setRejectTarget(null);
                }}
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
                onPress={() => {
                  setRejectTarget(null);
                }}
                disabled={Boolean(processingId)}
              >
                <Text style={styles.rejectCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.rejectConfirmButton,
                  processingId && styles.disabledButton,
                ]}
                onPress={submitReject}
                disabled={Boolean(processingId)}
              >
                {processingId ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : null}
                <Text style={styles.rejectConfirmText}>
                  {processingId ? "Rejecting request" : "Reject request"}
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
    fontSize: 9.5,
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
    fontSize: 17,
    lineHeight: 23,
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
    fontSize: 11,
    fontWeight: "900",
  },
  heroStatLabel: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 9,
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
    fontSize: 9.5,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 3,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 13,
    lineHeight: 18,
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
    fontSize: 12,
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
    fontSize: 12,
    fontWeight: "900",
  },
  customerMeta: {
    color: COLORS.muted,
    fontSize: 9.5,
    lineHeight: 14,
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
    fontSize: 8.5,
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
    fontSize: 11,
    fontWeight: "900",
  },
  serviceSubText: {
    color: COLORS.muted,
    fontSize: 9.5,
    lineHeight: 14,
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
    fontSize: 9,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  amountValue: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "900",
    marginTop: 3,
  },
  editDetailsPanel: {
    marginTop: 11,
    padding: 12,
    borderRadius: 15,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  editDetailsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  editDetailsTitle: {
    color: COLORS.text,
    fontSize: 10,
    fontWeight: "900",
  },
  editDetailsHint: {
    color: COLORS.muted,
    fontSize: 8,
    fontWeight: "700",
  },
  editableFieldsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 9,
  },
  editableField: {
    flex: 1,
    minWidth: 0,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  editableFieldLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  editableFieldLabel: {
    color: COLORS.muted,
    fontSize: 8,
    fontWeight: "800",
  },
  editableFieldInput: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: "900",
    paddingVertical: 3,
    marginTop: 2,
  },
  unsavedChangesText: {
    color: COLORS.amber,
    fontSize: 8.5,
    fontWeight: "800",
    marginTop: 8,
  },
  saveDetailsButton: {
    minHeight: 38,
    marginTop: 9,
    borderRadius: 11,
    backgroundColor: COLORS.brand,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  saveDetailsButtonText: {
    color: "#FFFFFF",
    fontSize: 9.5,
    fontWeight: "900",
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
    fontSize: 10,
    fontWeight: "900",
    textTransform: "capitalize",
  },
  infoChipLabel: {
    color: COLORS.muted,
    fontSize: 8.5,
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
    fontSize: 9.5,
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
    fontSize: 9,
    fontWeight: "900",
  },
  detailsMiniList: {
    flex: 1,
    gap: 9,
  },
  detailsMiniListFull: {
    flex: undefined,
    width: "100%",
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
    fontSize: 8.5,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  detailValue: {
    color: COLORS.text,
    fontSize: 10,
    lineHeight: 14,
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
  technicianActionsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
  },
  assignTechnicianButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: 13,
    backgroundColor: COLORS.brand,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingHorizontal: 8,
  },
  assignTechnicianButtonText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "900",
  },
  viewTechnicianResponseButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: 13,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 8,
  },
  viewTechnicianResponseButtonText: {
    color: COLORS.brand,
    fontSize: 11,
    fontWeight: "900",
  },
  disabledTechnicianActionText: {
    color: COLORS.faint,
  },
  visitPanelHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  editVisitsButton: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 9,
    backgroundColor: "#FFFFFF",
    marginTop: 9,
  },
  editVisitsButtonText: {
    color: COLORS.brand,
    fontSize: 9,
    fontWeight: "900",
  },
  visitTitle: {
    color: COLORS.text,
    fontSize: 11,
    fontWeight: "900",
  },
  visitSubtitle: {
    color: COLORS.muted,
    fontSize: 9.5,
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
    fontSize: 9.5,
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
    fontSize: 9,
    fontWeight: "800",
  },
  noVisitText: {
    color: COLORS.muted,
    fontSize: 9.5,
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
    fontSize: 9.5,
    fontWeight: "800",
  },
  indexText: {
    color: COLORS.faint,
    fontSize: 9.5,
    fontWeight: "900",
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 13,
  },
  approvalGateNote: {
    color: COLORS.amber,
    fontSize: 10,
    fontWeight: "700",
    lineHeight: 15,
    marginTop: 11,
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
    fontSize: 11,
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
    fontSize: 11,
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
    fontSize: 12,
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
  technicianPickerCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    maxHeight: "78%",
    overflow: "hidden",
  },
  technicianPickerHeading: { flex: 1, paddingRight: 10 },
  technicianPickerSubtitle: {
    color: COLORS.muted,
    fontSize: 9,
    fontWeight: "700",
    marginTop: 3,
  },
  technicianPickerHint: {
    color: COLORS.muted,
    fontSize: 10,
    lineHeight: 15,
    paddingHorizontal: 14,
    paddingTop: 11,
  },
  technicianPickerError: {
    alignItems: "center",
    backgroundColor: COLORS.dangerSoft,
    borderRadius: 10,
    flexDirection: "row",
    gap: 7,
    marginHorizontal: 12,
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  technicianPickerErrorText: {
    color: COLORS.danger,
    flex: 1,
    fontSize: 10,
    lineHeight: 15,
  },
  technicianPickerState: {
    alignItems: "center",
    gap: 9,
    justifyContent: "center",
    minHeight: 130,
    padding: 18,
  },
  technicianPickerStateText: {
    color: COLORS.muted,
    fontSize: 11,
    fontWeight: "700",
    textAlign: "center",
  },
  technicianPickerList: { marginTop: 8, maxHeight: 380 },
  technicianOption: {
    alignItems: "center",
    borderBottomColor: COLORS.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: 10,
    minHeight: 65,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  technicianOptionSelected: { backgroundColor: COLORS.blueSoft },
  technicianAvatar: {
    alignItems: "center",
    backgroundColor: COLORS.blueSoft,
    borderRadius: 20,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  technicianOptionInfo: { flex: 1 },
  technicianOptionName: {
    color: COLORS.text,
    fontSize: 11,
    fontWeight: "900",
  },
  technicianOptionMeta: {
    color: COLORS.muted,
    fontSize: 9,
    fontWeight: "700",
    marginTop: 4,
  },
  technicianPickerRetry: {
    alignSelf: "center",
    backgroundColor: COLORS.brand,
    borderRadius: 10,
    marginBottom: 14,
    marginTop: 5,
    paddingHorizontal: 17,
    paddingVertical: 9,
  },
  technicianPickerRetryText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "900",
  },
  calendarEditModal: {
    width: "100%",
    maxHeight: "88%",
    backgroundColor: COLORS.page,
    borderRadius: 18,
    overflow: "hidden",
  },
  calendarEditScroll: {
    paddingHorizontal: 8,
    paddingTop: 8,
  },
  visitEditorNotice: {
    color: COLORS.muted,
    fontSize: 9,
    lineHeight: 14,
    fontWeight: "700",
    paddingHorizontal: 4,
    paddingBottom: 8,
  },
  rejectHelpText: {
    color: COLORS.muted,
    fontSize: 10,
    lineHeight: 15,
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
    fontSize: 11,
    lineHeight: 16,
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
    fontSize: 11,
    fontWeight: "900",
  },
  rejectConfirmButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 14,
    backgroundColor: COLORS.danger,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  rejectConfirmText: {
    color: "#FFFFFF",
    fontSize: 11,
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
    fontSize: 10,
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
  technicianResponseState: {
    minHeight: 110,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    padding: 16,
  },
  technicianResponseStateText: {
    color: COLORS.muted,
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
  },
  technicianResponseItem: {
    padding: 13,
    borderRadius: 12,
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginHorizontal: 12,
    marginVertical: 5,
  },
  technicianResponseTitle: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "900",
  },
  technicianResponseMeta: {
    color: COLORS.muted,
    fontSize: 10,
    fontWeight: "700",
    marginTop: 4,
  },
  technicianResponseNote: {
    color: COLORS.text,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 8,
  },
  technicianResponsePhotos: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
  },
  technicianResponsePhoto: {
    alignItems: "center",
    gap: 4,
  },
  technicianResponseImage: {
    width: 74,
    height: 74,
    borderRadius: 8,
    backgroundColor: COLORS.border,
  },
  technicianResponsePhotoLabel: {
    color: COLORS.muted,
    fontSize: 9,
    fontWeight: "800",
  },
  visitListText: {
    flex: 1,
    color: COLORS.text,
    fontSize: 11,
    fontWeight: "800",
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
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    color: COLORS.text,
    fontSize: 11,
    fontWeight: "800",
    paddingVertical: 0,
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
  },
  categoryContent: {
    flexDirection: "row",
    alignItems: "center",
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
    backgroundColor: COLORS.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  categoryAccent: {
    position: "absolute",
    left: 0,
    top: 16,
    bottom: 16,
    width: 4,
    borderTopRightRadius: 999,
    borderBottomRightRadius: 999,
  },
  listItemCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  listItemLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    marginRight: 12,
  },
  listItemAvatar: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: COLORS.blueSoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  listItemTextWrap: {
    flex: 1,
  },
  listItemName: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: "900",
  },
  listItemMeta: {
    color: COLORS.muted,
    fontSize: 9.5,
    fontWeight: "700",
    marginTop: 3,
  },
  listItemAmount: {
    color: COLORS.brand,
    fontSize: 11,
    fontWeight: "900",
    marginTop: 4,
  },
  listItemRight: {
    alignItems: "flex-end",
    gap: 8,
  },
  listItemBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: COLORS.amberSoft,
  },
  listItemDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.amber,
  },
  listItemBadgeText: {
    color: COLORS.amber,
    fontSize: 8.5,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  listItemViewButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: COLORS.blueSoft,
  },
  listItemViewText: {
    color: COLORS.brand,
    fontSize: 10,
    fontWeight: "900",
  },
});
