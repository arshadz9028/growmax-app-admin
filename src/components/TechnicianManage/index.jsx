import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import {
  ActivityIndicator,
  Alert,
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
};

const TECHNICIANS_API_PATH = "/api/admin/technicians";
const MONTH_VISITS_API_PATH = (monthKey) =>
  `/api/admin/visits?month=${encodeURIComponent(monthKey)}`;
const ASSIGN_VISIT_API_PATH = (visitId) =>
  `/api/admin/visits/${visitId}/assign`;

const getTechnicianId = (technician) =>
  technician?._id ||
  technician?.id ||
  technician?.technicianId ||
  technician?.userId ||
  "";
const getTechnicianName = (technician) =>
  technician?.fullName ||
  technician?.name ||
  technician?.username ||
  technician?.technicianName ||
  "Unnamed technician";
const getMonthKey = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
const addMonths = (date, amount) => {
  const next = new Date(date);
  next.setMonth(next.getMonth() + amount);
  return next;
};
const formatMonth = (date) =>
  date.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
const formatDate = (value) => {
  if (!value) return "Not available";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Not available"
    : date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
};
const getInitials = (name) =>
  String(name || "T")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

function getList(payload, keys) {
  if (Array.isArray(payload)) return payload;
  for (const key of keys) {
    const value = key
      .split(".")
      .reduce((object, part) => object?.[part], payload);
    if (Array.isArray(value)) return value;
  }
  return [];
}

function normalizeTechnicians(payload) {
  return getList(payload, ["technicians", "data.technicians", "data", "users"])
    .filter(Boolean)
    .map((technician, index) => ({
      ...technician,
      _localId: String(getTechnicianId(technician) || `technician-${index}`),
      assignedVisits: Array.isArray(technician?.assignedVisits)
        ? technician.assignedVisits
        : [],
    }));
}

/* Handles flat visits and request records containing a nested visits array. */
function normalizeVisits(payload) {
  const source = getList(payload, [
    "visits",
    "data.visits",
    "data.data.visits",
    "result.visits",
    "data",
    "requests",
    "applications",
  ]);
  const rows = source.flatMap((record) => {
    const nested =
      record?.visits ||
      record?.selectedVisits ||
      record?.scheduledVisits ||
      record?.visitSlots;
    return Array.isArray(nested)
      ? nested.map((visit) => ({ parent: record, visit }))
      : [{ parent: {}, visit: record }];
  });

  return rows.map(({ parent, visit }, index) =>
    normalizeVisit(visit, index, parent),
  );
}

function normalizeVisit(visit, index, parent = {}, forcedTechnician = null) {
  const request =
    visit?.request ||
    visit?.serviceRequest ||
    parent?.request ||
    parent?.serviceRequest ||
    {};
  const consumer =
    visit?.consumer ||
    visit?.customer ||
    request?.consumer ||
    request?.customer ||
    parent?.consumer ||
    parent?.customer ||
    {};
  const selected =
    visit?.selectedVisit ||
    visit?.visit ||
    parent?.selectedVisit ||
    parent?.visit ||
    {};
  const management =
    visit?.consumerManagement ||
    parent?.consumerManagement ||
    request?.consumerManagement ||
    {};
  const id =
    visit?._visitId ||
    visit?._id ||
    visit?.id ||
    visit?.visitId ||
    `${visit?.requestId || request?._id || parent?._id || "visit"}-${visit?.visitIndex ?? index}`;

  return {
    ...parent,
    ...visit,
    _visitId: String(id),
    _visitIndex:
      visit?._visitIndex ??
      visit?.visitIndex ??
      selected?.visitIndex ??
      parent?.visitIndex ??
      index,
    _requestId:
      visit?._requestId ||
      visit?.requestId ||
      request?._id ||
      parent?._id ||
      visit?.applicationId ||
      "",
    _customerName:
      visit?._customerName ||
      visit?.consumerName ||
      visit?.customerName ||
      visit?.fullName ||
      consumer?.fullName ||
      consumer?.name ||
      request?.fullName ||
      visit?.user?.fullName ||
      visit?.user?.username ||
      "Unnamed customer",
    _mobile:
      visit?._mobile ||
      visit?._mobileNumber ||
      visit?.mobileNumber ||
      visit?.mobile ||
      visit?.phone ||
      consumer?.mobileNumber ||
      consumer?.phone ||
      request?.mobileNumber ||
      request?.phone ||
      "Mobile not available",
    _consumerNumber:
      visit?._consumerNumber ||
      visit?.consumerNumber ||
      visit?.consumerNo ||
      management?.userCode ||
      consumer?.consumerNumber ||
      "Not assigned",
    _serviceName:
      visit?._serviceName ||
      visit?.serviceName ||
      visit?.service?.name ||
      request?.serviceName ||
      visit?.name ||
      "Service visit",
    _date:
      visit?._date ||
      visit?.dateOfVisit ||
      visit?.date ||
      visit?.visitDate ||
      visit?.scheduledDate ||
      visit?.scheduledFor ||
      selected?.date ||
      selected?.visitDate ||
      parent?.date ||
      parent?.visitDate ||
      null,
    _status:
      visit?._status ||
      visit?.status ||
      selected?.status ||
      visit?.visitStatus ||
      "Pending",
    _location:
      visit?._location ||
      visit?.locationAddress ||
      visit?.location ||
      visit?.address ||
      consumer?.address ||
      request?.address ||
      [visit?.city, visit?.state].filter(Boolean).join(", ") ||
      "Location not available",
    _assignedTechnicianId:
      visit?._assignedTechnicianId ||
      visit?.assignedTechnicianId ||
      visit?.technicianId ||
      visit?.technician?._id ||
      selected?.assignedTechnicianId ||
      getTechnicianId(forcedTechnician),
    _assignedTechnicianName:
      visit?._assignedTechnicianName ||
      visit?.assignedTechnicianName ||
      visit?.technicianName ||
      visit?.technician?.fullName ||
      selected?.assignedTechnicianName ||
      (forcedTechnician ? getTechnicianName(forcedTechnician) : ""),
  };
}

/* assignedVisits comes directly from each technician returned by TECHNICIANS_API_PATH. */
function normalizeAssignedVisits(assignedVisits, technician) {
  return (Array.isArray(assignedVisits) ? assignedVisits : [])
    .filter(Boolean)
    .map((visit, index) => normalizeVisit(visit, index, {}, technician));
}

function MiniInfo({ icon, value, label }) {
  return (
    <View style={styles.miniInfo}>
      <Ionicons name={icon} size={14} color={COLORS.blue} />
      <Text style={styles.miniValue} numberOfLines={1}>
        {value}
      </Text>
      <Text style={styles.miniLabel}>{label}</Text>
    </View>
  );
}

function State({
  title,
  text,
  icon = "calendar-outline",
  loading = false,
  retry,
}) {
  return (
    <View style={styles.state}>
      {loading ? (
        <ActivityIndicator color={COLORS.brand} />
      ) : (
        <Ionicons name={icon} size={28} color={COLORS.brand} />
      )}
      <Text style={styles.stateTitle}>{title}</Text>
      <Text style={styles.stateText}>{text}</Text>
      {retry ? (
        <Pressable style={styles.retry} onPress={retry}>
          <Text style={styles.retryText}>Try again</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function TechnicianCard({ technician, visitCount, onOpen }) {
  const active = technician?.active !== false && technician?.blocked !== true;
  return (
    <Pressable style={styles.technicianCard} onPress={onOpen}>
      <View
        style={[
          styles.rail,
          { backgroundColor: active ? COLORS.success : COLORS.danger },
        ]}
      />
      <View style={styles.rowBetween}>
        <View style={styles.personRow}>
          <View
            style={[
              styles.avatar,
              {
                backgroundColor: active
                  ? COLORS.successSoft
                  : COLORS.dangerSoft,
              },
            ]}
          >
            <Text
              style={{
                color: active ? COLORS.success : COLORS.danger,
                fontWeight: "900",
              }}
            >
              {getInitials(getTechnicianName(technician))}
            </Text>
          </View>
          <View style={styles.flex}>
            <Text style={styles.name}>{getTechnicianName(technician)}</Text>
            <Text style={styles.secondary}>
              {technician?.mobileNumber || technician?.phone || "No mobile"} ·{" "}
              {technician?.city || "No city"}
            </Text>
          </View>
        </View>
        <Text
          style={[
            styles.badge,
            {
              color: active ? COLORS.success : COLORS.danger,
              backgroundColor: active ? COLORS.successSoft : COLORS.dangerSoft,
            },
          ]}
        >
          {active ? "Active" : "Blocked"}
        </Text>
      </View>
      <View style={styles.miniGrid}>
        <MiniInfo
          icon="mail-outline"
          value={technician?.email || "No email"}
          label="Email"
        />
        <MiniInfo
          icon="calendar-outline"
          value={formatDate(technician?.createdAt)}
          label="Joined"
        />
        <MiniInfo
          icon="map-outline"
          value={String(visitCount)}
          label="Assigned visits"
        />
      </View>
      <View style={styles.openRow}>
        <Text style={styles.openText}>Open profile</Text>
        <Ionicons name="chevron-forward" size={16} color={COLORS.brand} />
      </View>
    </Pressable>
  );
}

function VisitCard({
  visit,
  technician,
  processingVisitId,
  onAssign,
  readOnly = false,
}) {
  const selected =
    String(visit._assignedTechnicianId || "") ===
    String(getTechnicianId(technician) || "");
  const assignedToOther = Boolean(visit._assignedTechnicianId) && !selected;
  const loading = processingVisitId === visit._visitId;
  const color = selected
    ? COLORS.success
    : assignedToOther
      ? COLORS.amber
      : COLORS.blue;
  const soft = selected
    ? COLORS.successSoft
    : assignedToOther
      ? COLORS.amberSoft
      : COLORS.blueSoft;
  return (
    <View style={styles.visitCard}>
      <View style={[styles.rail, { backgroundColor: color }]} />
      <View style={styles.rowBetween}>
        <View style={styles.flex}>
          <Text style={styles.name}>{visit._customerName}</Text>
          <Text style={styles.secondary}>{visit._serviceName}</Text>
        </View>
        <Text style={[styles.badge, { color, backgroundColor: soft }]}>
          {selected ? "Assigned" : assignedToOther ? "Taken" : "Open"}
        </Text>
      </View>
      <View style={styles.miniGrid}>
        <MiniInfo
          icon="calendar-outline"
          value={formatDate(visit._date)}
          label="Visit date"
        />
        <MiniInfo
          icon="key-outline"
          value={visit._consumerNumber}
          label="Consumer"
        />
        <MiniInfo icon="call-outline" value={visit._mobile} label="Mobile" />
      </View>
      <View style={styles.addressRow}>
        <Ionicons name="location-outline" size={16} color={COLORS.danger} />
        <Text style={styles.address}>{visit._location}</Text>
      </View>
      {assignedToOther ? (
        <Text style={styles.warning}>
          Currently assigned to{" "}
          {visit._assignedTechnicianName || "another technician"}
        </Text>
      ) : null}
      {!readOnly ? (
        <Pressable
          style={[
            styles.assignButton,
            selected && styles.assignDone,
            loading && styles.disabled,
          ]}
          onPress={() => onAssign(visit)}
          disabled={selected || loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Ionicons
              name={
                selected ? "checkmark-circle-outline" : "person-add-outline"
              }
              size={17}
              color="#FFFFFF"
            />
          )}
          <Text style={styles.assignText}>
            {selected
              ? "Assigned to this technician"
              : assignedToOther
                ? "Reassign visit"
                : "Assign visit"}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function CreateModal({
  visible,
  form,
  update,
  creating,
  showPassword,
  onTogglePassword,
  onClose,
  onCreate,
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.createModal}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>Create technician</Text>
              <Text style={styles.secondary}>
                Add login credentials and contact details.
              </Text>
            </View>
            <Pressable style={styles.close} onPress={onClose}>
              <Ionicons name="close" size={18} color={COLORS.text} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.form}>
            <TextInput
              value={form.fullName}
              onChangeText={(value) => update("fullName", value)}
              placeholder="Full name"
              placeholderTextColor={COLORS.faint}
              style={styles.input}
            />
            <TextInput
              value={form.mobileNumber}
              onChangeText={(value) => update("mobileNumber", value)}
              placeholder="Mobile number"
              placeholderTextColor={COLORS.faint}
              keyboardType="phone-pad"
              style={styles.input}
            />
            <TextInput
              value={form.email}
              onChangeText={(value) => update("email", value)}
              placeholder="Email address"
              placeholderTextColor={COLORS.faint}
              keyboardType="email-address"
              autoCapitalize="none"
              style={styles.input}
            />
            <TextInput
              value={form.city}
              onChangeText={(value) => update("city", value)}
              placeholder="City or working area"
              placeholderTextColor={COLORS.faint}
              style={styles.input}
            />
            <View style={styles.password}>
              <TextInput
                value={form.password}
                onChangeText={(value) => update("password", value)}
                placeholder="Temporary password"
                placeholderTextColor={COLORS.faint}
                secureTextEntry={!showPassword}
                style={styles.passwordInput}
              />
              <Pressable onPress={onTogglePassword}>
                <Ionicons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={19}
                  color={COLORS.faint}
                />
              </Pressable>
            </View>
          </ScrollView>
          <View style={styles.actions}>
            <Pressable style={styles.cancel} onPress={onClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.create, creating && styles.disabled]}
              onPress={onCreate}
              disabled={creating}
            >
              {creating ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.createText}>Create</Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function ProfileModal({
  technician,
  visible,
  onClose,
  view,
  setView,
  monthDate,
  setMonthDate,
  loadingVisits,
  monthlyVisits,
  assignedVisits,
  processingVisitId,
  onAssign,
}) {
  const showingVisits = view === "assign" || view === "check";
  const checkMode = view === "check";
  const displayVisits = checkMode ? assignedVisits : monthlyVisits;
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.sheetOverlay}>
        <View style={styles.sheet}>
          <View style={styles.modalHeader}>
            <View style={styles.personRow}>
              <View style={styles.avatar}>
                <Text style={{ color: COLORS.blue, fontWeight: "900" }}>
                  {getInitials(getTechnicianName(technician))}
                </Text>
              </View>
              <View>
                <Text style={styles.modalTitle}>
                  {getTechnicianName(technician)}
                </Text>
                <Text style={styles.secondary}>
                  {technician?.email || "No email"}
                </Text>
              </View>
            </View>
            <Pressable style={styles.close} onPress={onClose}>
              <Ionicons name="close" size={18} color={COLORS.text} />
            </Pressable>
          </View>
          {!showingVisits ? (
            <View style={styles.profileActions}>
              <ActionCard
                icon="calendar-outline"
                title="Assign visits"
                description="View consumer visits month by month and assign this technician."
                onPress={() => setView("assign")}
              />
              <ActionCard
                icon="checkbox-outline"
                title="Check visits"
                description="View the visits already assigned to this technician."
                onPress={() => setView("check")}
              />
            </View>
          ) : (
            <>
              <View style={styles.monthToolbar}>
                <Pressable
                  style={styles.monthButton}
                  onPress={() => setView("home")}
                >
                  <Ionicons name="arrow-back" size={17} color={COLORS.brand} />
                </Pressable>
                {!checkMode ? (
                  <Pressable
                    style={styles.monthButton}
                    onPress={() => setMonthDate((date) => addMonths(date, -1))}
                  >
                    <Ionicons
                      name="chevron-back"
                      size={17}
                      color={COLORS.brand}
                    />
                  </Pressable>
                ) : (
                  <View style={styles.monthSpacer} />
                )}
                <View style={styles.monthTitleWrap}>
                  <Text style={styles.monthLabel}>
                    {checkMode ? "Technician visits" : "Consumer visits"}
                  </Text>
                  <Text style={styles.monthTitle}>
                    {checkMode ? "Assigned visits" : formatMonth(monthDate)}
                  </Text>
                </View>
                {!checkMode ? (
                  <Pressable
                    style={styles.monthButton}
                    onPress={() => setMonthDate((date) => addMonths(date, 1))}
                  >
                    <Ionicons
                      name="chevron-forward"
                      size={17}
                      color={COLORS.brand}
                    />
                  </Pressable>
                ) : (
                  <View style={styles.monthSpacer} />
                )}
              </View>
              <ScrollView
                style={styles.visitList}
                contentContainerStyle={styles.visitContent}
              >
                {!checkMode && loadingVisits ? (
                  <State
                    title="Loading visits"
                    text="Fetching current month consumer visits."
                    loading
                  />
                ) : displayVisits.length ? (
                  displayVisits.map((visit) => (
                    <VisitCard
                      key={visit._visitId}
                      visit={visit}
                      technician={technician}
                      processingVisitId={processingVisitId}
                      onAssign={onAssign}
                      readOnly={checkMode}
                    />
                  ))
                ) : (
                  <State
                    title={
                      checkMode
                        ? "No assigned visits"
                        : "No visits for this month"
                    }
                    text={
                      checkMode
                        ? "No assigned visits found for this technician."
                        : "Current month consumer visits will appear here."
                    }
                  />
                )}
              </ScrollView>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

function ActionCard({ icon, title, description, onPress }) {
  return (
    <View style={styles.actionCard}>
      <Ionicons name={icon} size={22} color={COLORS.brand} />
      <Text style={styles.modalTitle}>{title}</Text>
      <Text style={styles.actionDescription}>{description}</Text>
      <Pressable style={styles.assignButton} onPress={onPress}>
        <Text style={styles.assignText}>{title}</Text>
        <Ionicons name="arrow-forward" size={17} color="#FFFFFF" />
      </Pressable>
    </View>
  );
}

export default function AdminManageTechnicians() {
  const [technicians, setTechnicians] = React.useState([]);
  const [monthlyVisits, setMonthlyVisits] = React.useState([]);
  const [assignedVisits, setAssignedVisits] = React.useState([]);
  const [loadingTechnicians, setLoadingTechnicians] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [loadingVisits, setLoadingVisits] = React.useState(false);
  const [error, setError] = React.useState("");
  const [search, setSearch] = React.useState("");
  const [createVisible, setCreateVisible] = React.useState(false);
  const [selectedTechnician, setSelectedTechnician] = React.useState(null);
  const [profileView, setProfileView] = React.useState("home");
  const [monthDate, setMonthDate] = React.useState(new Date());
  const [processingVisitId, setProcessingVisitId] = React.useState("");
  const [creating, setCreating] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);
  const [form, setForm] = React.useState({
    fullName: "",
    mobileNumber: "",
    email: "",
    city: "",
    password: "",
  });
  const monthKey = getMonthKey(monthDate);

  const fetchTechnicians = React.useCallback(
    async ({ isRefresh = false } = {}) => {
      isRefresh ? setRefreshing(true) : setLoadingTechnicians(true);
      setError("");
      try {
        const response = await safeFetch(getApiUrl(TECHNICIANS_API_PATH));
        const payload = await response.json().catch(() => null);
        console.log("Fetched technicians (raw):", payload);
        if (!response.ok)
          throw new Error(payload?.message || "Unable to load technicians.");
        setTechnicians(normalizeTechnicians(payload));
      } catch (requestError) {
        setError(requestError?.message || "Unable to load technicians.");
      } finally {
        setLoadingTechnicians(false);
        setRefreshing(false);
      }
    },
    [],
  );

  const fetchMonthVisits = React.useCallback(async (key) => {
    setLoadingVisits(true);
    try {
      const response = await safeFetch(getApiUrl(MONTH_VISITS_API_PATH(key)));
      const payload = await response.json().catch(() => null);
      console.log("Fetched month visits (raw):", key, payload);
      if (!response.ok)
        throw new Error(payload?.message || "Unable to load visits.");
      setMonthlyVisits(normalizeVisits(payload));
    } catch (requestError) {
      Alert.alert(
        "Visits unavailable",
        requestError?.message || "Unable to load visits.",
      );
      setMonthlyVisits([]);
    } finally {
      setLoadingVisits(false);
    }
  }, []);

  React.useEffect(() => {
    fetchTechnicians();
  }, [fetchTechnicians]);
  React.useEffect(() => {
    if (selectedTechnician && profileView === "assign")
      fetchMonthVisits(monthKey);
  }, [fetchMonthVisits, monthKey, profileView, selectedTechnician]);

  const filteredTechnicians = React.useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return technicians;
    return technicians.filter((technician) =>
      [
        getTechnicianName(technician),
        technician?.email,
        technician?.mobileNumber,
        technician?.phone,
        technician?.city,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(query),
    );
  }, [search, technicians]);

  const stats = React.useMemo(
    () => ({
      total: technicians.length,
      active: technicians.filter(
        (item) => item?.active !== false && item?.blocked !== true,
      ).length,
      assigned: technicians.reduce(
        (total, item) =>
          total +
          (Array.isArray(item?.assignedVisits)
            ? item.assignedVisits.length
            : 0),
        0,
      ),
    }),
    [technicians],
  );
  const updateForm = (key, value) =>
    setForm((current) => ({ ...current, [key]: value }));
  const resetForm = () => {
    setForm({
      fullName: "",
      mobileNumber: "",
      email: "",
      city: "",
      password: "",
    });
    setShowPassword(false);
  };
  const closeProfile = () => {
    setSelectedTechnician(null);
    setAssignedVisits([]);
    setProfileView("home");
  };
  const openProfile = (technician) => {
    setSelectedTechnician(technician);
    setAssignedVisits(
      normalizeAssignedVisits(technician?.assignedVisits, technician),
    );
    setMonthDate(new Date());
    setProfileView("home");
  };

  const createTechnician = async () => {
    const payload = {
      fullName: form.fullName.trim(),
      username: form.fullName.trim(),
      mobileNumber: form.mobileNumber.trim(),
      email: form.email.trim(),
      city: form.city.trim(),
      password: form.password.trim(),
      role: "technician",
      active: true,
    };
    if (
      !payload.fullName ||
      !payload.mobileNumber ||
      !payload.email ||
      !payload.password
    )
      return Alert.alert(
        "Missing details",
        "Enter name, mobile number, email, and password.",
      );
    setCreating(true);
    try {
      const response = await safeFetch(getApiUrl(TECHNICIANS_API_PATH), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok)
        throw new Error(data?.message || "Unable to create technician.");
      const created =
        data?.technician ||
        data?.data?.technician ||
        data?.data ||
        data ||
        payload;
      setTechnicians((current) => [
        normalizeTechnicians([created])[0],
        ...current,
      ]);
      setCreateVisible(false);
      resetForm();
      Alert.alert("Technician created", "The technician profile is ready.");
    } catch (requestError) {
      Alert.alert(
        "Create failed",
        requestError?.message || "Please try again.",
      );
    } finally {
      setCreating(false);
    }
  };

  const assignVisit = (visit) => {
    const technicianId = getTechnicianId(selectedTechnician);
    const technicianName = getTechnicianName(selectedTechnician);
    const apiVisitId =
      visit?._id || visit?.id || visit?.visitId || visit?._visitId;
    if (!technicianId || !apiVisitId)
      return Alert.alert(
        "Missing details",
        "This visit cannot be assigned because its id is unavailable.",
      );
    Alert.alert(
      visit._assignedTechnicianId ? "Reassign visit" : "Assign visit",
      `Assign this visit to ${technicianName}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Assign",
          onPress: async () => {
            setProcessingVisitId(visit._visitId);
            try {
              const response = await safeFetch(
                getApiUrl(ASSIGN_VISIT_API_PATH(apiVisitId)),
                {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    technicianId,
                    technicianName,
                    assignedTechnicianId: technicianId,
                    assignedTechnicianName: technicianName,
                    visitId: apiVisitId,
                    visitIndex: visit._visitIndex,
                    visitDate: visit._date,
                    requestId: visit._requestId,
                    consumerNumber: visit._consumerNumber,
                    status: "Assigned",
                    assignedAt: new Date().toISOString(),
                  }),
                },
              );
              const data = await response.json().catch(() => null);
              if (!response.ok)
                throw new Error(data?.message || "Unable to assign visit.");
              const assigned = {
                ...visit,
                _assignedTechnicianId: technicianId,
                _assignedTechnicianName: technicianName,
                _status: "Assigned",
              };
              setMonthlyVisits((current) =>
                current.map((item) =>
                  item._visitId === visit._visitId ? assigned : item,
                ),
              );
              setAssignedVisits((current) => [
                ...current.filter(
                  (item) => item._visitId !== assigned._visitId,
                ),
                assigned,
              ]);
              setSelectedTechnician((current) =>
                current
                  ? {
                      ...current,
                      assignedVisits: [
                        ...(current.assignedVisits || []).filter(
                          (item) =>
                            String(item?._id || item?.id || item?.visitId) !==
                            String(apiVisitId),
                        ),
                        assigned,
                      ],
                    }
                  : current,
              );
              setTechnicians((current) =>
                current.map((item) =>
                  String(getTechnicianId(item)) === String(technicianId)
                    ? {
                        ...item,
                        assignedVisits: [
                          ...(item.assignedVisits || []).filter(
                            (saved) =>
                              String(
                                saved?._id || saved?.id || saved?.visitId,
                              ) !== String(apiVisitId),
                          ),
                          assigned,
                        ],
                      }
                    : item,
                ),
              );
              Alert.alert(
                "Visit assigned",
                "The technician has been assigned.",
              );
            } catch (requestError) {
              Alert.alert(
                "Assign failed",
                requestError?.message || "Please try again.",
              );
            } finally {
              setProcessingVisitId("");
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.brandDark} />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchTechnicians({ isRefresh: true })}
            colors={[COLORS.brand]}
          />
        }
      >
        <LinearGradient
          colors={[COLORS.brandDark, COLORS.brand, COLORS.blue]}
          style={styles.hero}
        >
          <Text style={styles.heroTag}>Manage technicians</Text>
          <Text style={styles.heroTitle}>
            Create profiles and assign field visits.
          </Text>
          <Pressable
            style={styles.heroButton}
            onPress={() => setCreateVisible(true)}
          >
            <Text style={styles.heroButtonText}>Create technician</Text>
            <Ionicons
              name="add-circle-outline"
              size={17}
              color={COLORS.brandDark}
            />
          </Pressable>
        </LinearGradient>
        <View style={styles.stats}>
          <Stat label="Technicians" value={stats.total} />
          <Stat label="Active" value={stats.active} />
          <Stat label="Assigned visits" value={stats.assigned} />
        </View>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={17} color={COLORS.faint} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search technician, email, mobile, or city"
            placeholderTextColor={COLORS.faint}
            style={styles.searchInput}
          />
        </View>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.eyebrow}>Technician directory</Text>
            <Text style={styles.sectionTitle}>Field staff profiles</Text>
          </View>
          <Pressable style={styles.plus} onPress={() => setCreateVisible(true)}>
            <Ionicons name="add" size={18} color="#FFFFFF" />
          </Pressable>
        </View>
        {loadingTechnicians ? (
          <State
            title="Loading technicians"
            text="Fetching technician profiles."
            loading
          />
        ) : error ? (
          <State
            icon="warning-outline"
            title="Could not load technicians"
            text={error}
            retry={fetchTechnicians}
          />
        ) : filteredTechnicians.length ? (
          filteredTechnicians.map((technician) => (
            <TechnicianCard
              key={technician._localId}
              technician={technician}
              visitCount={
                Array.isArray(technician.assignedVisits)
                  ? technician.assignedVisits.length
                  : 0
              }
              onOpen={() => openProfile(technician)}
            />
          ))
        ) : (
          <State
            icon="person-add-outline"
            title="No technicians found"
            text="Create a technician profile to start assigning visits."
          />
        )}
      </ScrollView>
      <CreateModal
        visible={createVisible}
        form={form}
        update={updateForm}
        creating={creating}
        showPassword={showPassword}
        onTogglePassword={() => setShowPassword((current) => !current)}
        onClose={() => {
          setCreateVisible(false);
          resetForm();
        }}
        onCreate={createTechnician}
      />
      <ProfileModal
        technician={selectedTechnician}
        visible={Boolean(selectedTechnician)}
        onClose={closeProfile}
        view={profileView}
        setView={setProfileView}
        monthDate={monthDate}
        setMonthDate={setMonthDate}
        loadingVisits={loadingVisits}
        monthlyVisits={monthlyVisits}
        assignedVisits={assignedVisits}
        processingVisitId={processingVisitId}
        onAssign={assignVisit}
      />
    </SafeAreaView>
  );
}

function Stat({ label, value }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{String(value)}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.page },
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
  hero: { borderRadius: 18, padding: 18 },
  heroTag: {
    color: "rgba(255,255,255,.82)",
    fontSize: 10,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  heroTitle: {
    color: "#FFFFFF",
    fontSize: 21,
    fontWeight: "900",
    marginTop: 8,
    maxWidth: "85%",
  },
  heroButton: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: "#FFFFFF",
    borderRadius: 13,
    paddingHorizontal: 14,
    paddingVertical: 11,
    marginTop: 20,
  },
  heroButtonText: { color: COLORS.brandDark, fontWeight: "900" },
  stats: { flexDirection: "row", gap: 8, marginVertical: 14 },
  stat: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  statValue: { color: COLORS.brand, fontSize: 19, fontWeight: "900" },
  statLabel: {
    color: COLORS.muted,
    fontSize: 9,
    fontWeight: "800",
    marginTop: 2,
  },
  searchBox: {
    height: 45,
    backgroundColor: COLORS.surface,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
  },
  searchInput: { flex: 1, color: COLORS.text, fontSize: 12, fontWeight: "700" },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 18,
    marginBottom: 10,
  },
  eyebrow: {
    color: COLORS.brand,
    fontSize: 10,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: "900",
    marginTop: 2,
  },
  plus: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: COLORS.brand,
    alignItems: "center",
    justifyContent: "center",
  },
  technicianCard: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 17,
    padding: 14,
    marginBottom: 12,
    overflow: "hidden",
  },
  visitCard: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 17,
    padding: 14,
    marginBottom: 12,
    overflow: "hidden",
  },
  rail: { position: "absolute", left: 0, top: 14, bottom: 14, width: 4 },
  rowBetween: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
  },
  personRow: { flexDirection: "row", alignItems: "center", gap: 9 },
  flex: { flex: 1 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.blueSoft,
  },
  name: { color: COLORS.text, fontSize: 14, fontWeight: "900" },
  secondary: {
    color: COLORS.muted,
    fontSize: 10.5,
    fontWeight: "700",
    marginTop: 3,
  },
  badge: {
    overflow: "hidden",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 5,
    fontSize: 9,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  miniGrid: { flexDirection: "row", gap: 7, marginTop: 12 },
  miniInfo: {
    flex: 1,
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: "#EDF2F7",
    padding: 8,
  },
  miniValue: {
    color: COLORS.text,
    fontSize: 9.5,
    fontWeight: "900",
    marginTop: 6,
  },
  miniLabel: {
    color: COLORS.muted,
    fontSize: 8.5,
    fontWeight: "800",
    marginTop: 2,
  },
  openRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 2,
    marginTop: 12,
  },
  openText: { color: COLORS.brand, fontSize: 11, fontWeight: "900" },
  state: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 24,
    alignItems: "center",
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
    lineHeight: 16,
    fontWeight: "700",
    textAlign: "center",
    marginTop: 5,
  },
  retry: {
    backgroundColor: COLORS.brand,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 9,
    marginTop: 13,
  },
  retryText: { color: "#FFFFFF", fontWeight: "900", fontSize: 11 },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,.6)",
    justifyContent: "center",
    padding: 18,
  },
  createModal: {
    maxHeight: "82%",
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    overflow: "hidden",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    padding: 14,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
  },
  modalTitle: { color: COLORS.text, fontSize: 14, fontWeight: "900" },
  close: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: COLORS.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  form: { padding: 14 },
  input: {
    height: 46,
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 13,
    color: COLORS.text,
    fontSize: 12,
    fontWeight: "700",
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  password: {
    height: 46,
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 13,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
  },
  passwordInput: {
    flex: 1,
    color: COLORS.text,
    fontSize: 12,
    fontWeight: "700",
  },
  actions: { flexDirection: "row", gap: 10, padding: 14 },
  cancel: {
    flex: 1,
    height: 44,
    borderRadius: 13,
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelText: { color: COLORS.muted, fontWeight: "900" },
  create: {
    flex: 1,
    height: 44,
    borderRadius: 13,
    backgroundColor: COLORS.brand,
    alignItems: "center",
    justifyContent: "center",
  },
  createText: { color: "#FFFFFF", fontWeight: "900" },
  disabled: { opacity: 0.7 },
  sheetOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(15,23,42,.55)",
  },
  sheet: {
    height: "90%",
    backgroundColor: COLORS.page,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  profileActions: { gap: 12, marginTop: 14 },
  actionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
  },
  actionDescription: {
    color: COLORS.muted,
    fontSize: 11,
    lineHeight: 17,
    fontWeight: "700",
    marginTop: 5,
  },
  assignButton: {
    height: 43,
    borderRadius: 13,
    backgroundColor: COLORS.brand,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    marginTop: 14,
  },
  assignDone: { backgroundColor: COLORS.success },
  assignText: { color: "#FFFFFF", fontSize: 12, fontWeight: "900" },
  monthToolbar: {
    backgroundColor: COLORS.surface,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 9,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
    marginBottom: 12,
  },
  monthButton: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: COLORS.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  monthSpacer: { width: 34 },
  monthTitleWrap: { flex: 1, alignItems: "center" },
  monthLabel: {
    color: COLORS.muted,
    fontSize: 9,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  monthTitle: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "900",
    marginTop: 2,
  },
  visitList: { flex: 1 },
  visitContent: { paddingBottom: 28 },
  addressRow: {
    backgroundColor: COLORS.surfaceAlt,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: "#EDF2F7",
    padding: 9,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    marginTop: 10,
  },
  address: {
    flex: 1,
    color: COLORS.text,
    fontSize: 10.5,
    lineHeight: 15,
    fontWeight: "700",
  },
  warning: {
    color: COLORS.amber,
    fontSize: 10,
    fontWeight: "800",
    marginTop: 9,
  },
});
