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
  cyan: "#06B6D4",
  cyanSoft: "#ECFEFF",
  shadow: "#94A3B8",
};

const TECHNICIANS_API_PATH = "/api/admin/technicians";
const MONTH_VISITS_API_PATH = (monthKey) =>
  `/api/admin/visits?month=${encodeURIComponent(monthKey)}`;
const ASSIGN_VISIT_API_PATH = (visitId) => `/api/admin/visits/${visitId}/assign`;

function getTechnicianId(technician) {
  return technician?._id || technician?.id || technician?.technicianId || technician?.userId;
}

function getVisitId(visit, index) {
  return visit?._id || visit?.id || visit?.visitId || `${visit?.consumerNumber || "visit"}-${visit?.date || visit?.visitDate || index}`;
}

function getMonthKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function addMonths(date, amount) {
  const nextDate = new Date(date);
  nextDate.setMonth(nextDate.getMonth() + amount);
  return nextDate;
}

function formatMonth(date) {
  return date.toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
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

function getInitials(name, email) {
  const source = String(name || email || "T").trim();
  const parts = source.split(/\s+/).filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }

  return source.slice(0, 2).toUpperCase();
}

function normalizeTechnicians(payload) {
  const source = Array.isArray(payload)
    ? payload
    : payload?.technicians ||
      payload?.data?.technicians ||
      payload?.data ||
      payload?.users ||
      [];

  const list = Array.isArray(source) ? source : [source];

  return list.map((technician, index) => ({
    ...technician,
    _localId: getTechnicianId(technician) || `technician-${index}`,
  }));
}

function normalizeVisits(payload) {
  const source = Array.isArray(payload)
    ? payload
    : payload?.visits ||
      payload?.data?.visits ||
      payload?.data ||
      payload?.requests ||
      payload?.applications ||
      [];

  const list = Array.isArray(source) ? source : [source];

  return list.map((visit, index) => {
    const consumerManagement = visit?.consumerManagement || {};
    const selectedVisit = visit?.selectedVisit || visit?.visit || {};
    const date =
      visit?.date ||
      visit?.visitDate ||
      visit?.scheduledDate ||
      selectedVisit?.date ||
      selectedVisit?.visitDate;

    return {
      ...visit,
      _visitId: getVisitId(visit, index),
      _visitIndex: visit?.visitIndex ?? selectedVisit?.visitIndex ?? index,
      _customerName:
        visit?.fullName ||
        visit?.customerName ||
        visit?.user?.username ||
        visit?.user?.fullName ||
        "Unnamed customer",
      _serviceName: visit?.serviceName || visit?.service?.name || visit?.name || "Service visit",
      _consumerNumber:
        visit?.consumerNumber ||
        visit?.consumerNo ||
        consumerManagement?.userCode ||
        "Not assigned",
      _date: date,
      _status: visit?.status || selectedVisit?.status || visit?.visitStatus || "Pending",
      _location:
        visit?.locationAddress ||
        visit?.address ||
        [visit?.city, visit?.state].filter(Boolean).join(", ") ||
        "Location not available",
      _assignedTechnicianId:
        visit?.assignedTechnicianId ||
        visit?.technicianId ||
        visit?.technician?._id ||
        selectedVisit?.assignedTechnicianId ||
        "",
      _assignedTechnicianName:
        visit?.assignedTechnicianName ||
        visit?.technicianName ||
        visit?.technician?.fullName ||
        selectedVisit?.assignedTechnicianName ||
        "",
      _requestId: visit?.requestId || visit?.applicationId || visit?._id || "",
    };
  });
}

function getTechnicianName(technician) {
  return (
    technician?.fullName ||
    technician?.username ||
    technician?.name ||
    technician?.technicianName ||
    "Unnamed technician"
  );
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

function StatCard({ icon, label, value, accent, soft }) {
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

function TechnicianCard({ technician, visitCount, onOpen }) {
  const active = technician?.active !== false && technician?.blocked !== true;

  return (
    <Pressable style={styles.technicianCard} onPress={onOpen}>
      <View style={[styles.technicianAccent, { backgroundColor: active ? COLORS.success : COLORS.danger }]} />
      <TextureLines />

      <View style={styles.technicianTopRow}>
        <View style={styles.technicianIdentity}>
          <View style={[styles.avatarWrap, { backgroundColor: active ? COLORS.successSoft : COLORS.dangerSoft }]}>
            <Text style={[styles.avatarText, { color: active ? COLORS.success : COLORS.danger }]}>
              {getInitials(getTechnicianName(technician), technician?.email)}
            </Text>
          </View>
          <View style={styles.technicianTextWrap}>
            <Text style={styles.technicianName} numberOfLines={1}>
              {getTechnicianName(technician)}
            </Text>
            <Text style={styles.technicianMeta} numberOfLines={1}>
              {technician?.mobileNumber || technician?.phone || "No mobile"} - {technician?.city || "No city"}
            </Text>
          </View>
        </View>

        <View style={[styles.statusBadge, { backgroundColor: active ? COLORS.successSoft : COLORS.dangerSoft }]}>
          <View style={[styles.statusDot, { backgroundColor: active ? COLORS.success : COLORS.danger }]} />
          <Text style={[styles.statusBadgeText, { color: active ? COLORS.success : COLORS.danger }]}>
            {active ? "Active" : "Blocked"}
          </Text>
        </View>
      </View>

      <View style={styles.technicianInfoGrid}>
        <View style={styles.infoTile}>
          <Ionicons name="mail-outline" size={14} color={COLORS.blue} />
          <Text style={styles.infoTileValue} numberOfLines={1}>
            {technician?.email || "No email"}
          </Text>
          <Text style={styles.infoTileLabel}>Email</Text>
        </View>
        <View style={styles.infoTile}>
          <Ionicons name="calendar-outline" size={14} color={COLORS.amber} />
          <Text style={styles.infoTileValue}>{formatDate(technician?.createdAt)}</Text>
          <Text style={styles.infoTileLabel}>Joined</Text>
        </View>
        <View style={styles.infoTile}>
          <Ionicons name="map-outline" size={14} color={COLORS.cyan} />
          <Text style={styles.infoTileValue}>{String(visitCount || 0)}</Text>
          <Text style={styles.infoTileLabel}>Month visits</Text>
        </View>
      </View>

      <View style={styles.cardFooter}>
        <View style={styles.idWrap}>
          <Ionicons name="finger-print-outline" size={14} color={COLORS.faint} />
          <Text style={styles.idText}>{shortId(getTechnicianId(technician))}</Text>
        </View>
        <View style={styles.openProfileButton}>
          <Text style={styles.openProfileText}>Open profile</Text>
          <Ionicons name="chevron-forward" size={14} color={COLORS.brand} />
        </View>
      </View>
    </Pressable>
  );
}

function VisitCard({ visit, technician, processingVisitId, onAssign }) {
  const technicianId = getTechnicianId(technician);
  const visitId = visit._visitId;
  const assignedToSelected =
    String(visit._assignedTechnicianId || "") === String(technicianId || "");
  const assignedToOther =
    Boolean(visit._assignedTechnicianId) && !assignedToSelected;
  const isProcessing = processingVisitId === visitId;

  return (
    <View style={styles.visitCard}>
      <View
        style={[
          styles.visitStatusRail,
          {
            backgroundColor: assignedToSelected
              ? COLORS.success
              : assignedToOther
                ? COLORS.amber
                : COLORS.blue,
          },
        ]}
      />

      <View style={styles.visitTopRow}>
        <View style={styles.visitTitleWrap}>
          <Text style={styles.visitCustomerName} numberOfLines={1}>
            {visit._customerName}
          </Text>
          <Text style={styles.visitServiceName} numberOfLines={1}>
            {visit._serviceName}
          </Text>
        </View>

        <View
          style={[
            styles.visitBadge,
            {
              backgroundColor: assignedToSelected
                ? COLORS.successSoft
                : assignedToOther
                  ? COLORS.amberSoft
                  : COLORS.blueSoft,
            },
          ]}
        >
          <Text
            style={[
              styles.visitBadgeText,
              {
                color: assignedToSelected
                  ? COLORS.success
                  : assignedToOther
                    ? COLORS.amber
                    : COLORS.blue,
              },
            ]}
          >
            {assignedToSelected ? "Assigned" : assignedToOther ? "Taken" : "Open"}
          </Text>
        </View>
      </View>

      <View style={styles.visitInfoGrid}>
        <View style={styles.visitInfoTile}>
          <Ionicons name="calendar-outline" size={14} color={COLORS.brand} />
          <Text style={styles.visitInfoValue}>{formatDate(visit._date)}</Text>
          <Text style={styles.visitInfoLabel}>Visit date</Text>
        </View>
        <View style={styles.visitInfoTile}>
          <Ionicons name="key-outline" size={14} color={COLORS.cyan} />
          <Text style={styles.visitInfoValue} numberOfLines={1}>
            {visit._consumerNumber}
          </Text>
          <Text style={styles.visitInfoLabel}>Consumer</Text>
        </View>
      </View>

      <View style={styles.locationBox}>
        <Ionicons name="location-outline" size={15} color={COLORS.danger} />
        <Text style={styles.locationText} numberOfLines={2}>
          {visit._location}
        </Text>
      </View>

      {assignedToOther ? (
        <Text style={styles.assignedNote}>
          Assigned to {visit._assignedTechnicianName || "another technician"}
        </Text>
      ) : null}

      <Pressable
        style={[
          styles.assignButton,
          assignedToSelected && styles.assignButtonDone,
          isProcessing && styles.disabledButton,
        ]}
        onPress={() => onAssign(visit)}
        disabled={isProcessing || assignedToSelected}
      >
        {isProcessing ? (
          <ActivityIndicator color="#FFFFFF" size="small" />
        ) : (
          <Ionicons
            name={assignedToSelected ? "checkmark-circle-outline" : "person-add-outline"}
            size={16}
            color="#FFFFFF"
          />
        )}
        <Text style={styles.assignButtonText}>
          {assignedToSelected ? "Assigned to this technician" : assignedToOther ? "Reassign here" : "Assign visit"}
        </Text>
      </Pressable>
    </View>
  );
}

export default function AdminManageTechnicians() {
  const [technicians, setTechnicians] = React.useState([]);
  const [visits, setVisits] = React.useState([]);
  const [isLoadingTechnicians, setIsLoadingTechnicians] = React.useState(true);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState("");
  const [searchText, setSearchText] = React.useState("");
  const [showCreateModal, setShowCreateModal] = React.useState(false);
  const [selectedTechnician, setSelectedTechnician] = React.useState(null);
  const [monthDate, setMonthDate] = React.useState(new Date());
  const [isLoadingVisits, setIsLoadingVisits] = React.useState(false);
  const [processingVisitId, setProcessingVisitId] = React.useState("");
  const [isCreating, setIsCreating] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);
  const [form, setForm] = React.useState({
    fullName: "",
    mobileNumber: "",
    email: "",
    city: "",
    password: "",
  });

  const monthKey = getMonthKey(monthDate);

  const fetchTechnicians = React.useCallback(async ({ refreshing = false } = {}) => {
    if (refreshing) {
      setIsRefreshing(true);
    } else {
      setIsLoadingTechnicians(true);
    }

    setErrorMessage("");

    try {
      const response = await safeFetch(getApiUrl(TECHNICIANS_API_PATH), {
        method: "GET",
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.message || "Unable to load technicians.");
      }

      setTechnicians(normalizeTechnicians(payload));
    } catch (error) {
      setErrorMessage(error?.message || "Unable to load technicians.");
      setTechnicians([]);
    } finally {
      setIsLoadingTechnicians(false);
      setIsRefreshing(false);
    }
  }, []);

  const fetchMonthVisits = React.useCallback(async (targetMonthKey) => {
    setIsLoadingVisits(true);

    try {
      const response = await safeFetch(getApiUrl(MONTH_VISITS_API_PATH(targetMonthKey)), {
        method: "GET",
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.message || "Unable to load visits.");
      }

      setVisits(normalizeVisits(payload));
    } catch (error) {
      Alert.alert("Visits unavailable", error?.message || "Unable to load visits.");
      setVisits([]);
    } finally {
      setIsLoadingVisits(false);
    }
  }, []);

  React.useEffect(() => {
    fetchTechnicians();
  }, [fetchTechnicians]);

  React.useEffect(() => {
    if (selectedTechnician) {
      fetchMonthVisits(monthKey);
    }
  }, [fetchMonthVisits, monthKey, selectedTechnician]);

  const filteredTechnicians = React.useMemo(() => {
    const query = searchText.trim().toLowerCase();

    if (!query) {
      return technicians;
    }

    return technicians.filter((technician) => {
      const searchable = [
        getTechnicianName(technician),
        technician?.email,
        technician?.mobileNumber,
        technician?.phone,
        technician?.city,
        getTechnicianId(technician),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchable.includes(query);
    });
  }, [searchText, technicians]);

  const stats = React.useMemo(() => {
    const active = technicians.filter(
      (technician) => technician?.active !== false && technician?.blocked !== true,
    ).length;

    return {
      total: technicians.length,
      active,
      inactive: technicians.length - active,
      monthVisits: visits.length,
    };
  }, [technicians, visits.length]);

  const selectedTechnicianVisits = React.useMemo(() => {
    const technicianId = getTechnicianId(selectedTechnician);

    return visits.filter((visit) => {
      if (!technicianId) {
        return true;
      }

      return (
        !visit._assignedTechnicianId ||
        String(visit._assignedTechnicianId) === String(technicianId)
      );
    });
  }, [selectedTechnician, visits]);

  const updateForm = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

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

  const createTechnician = async () => {
    const fullName = form.fullName.trim();
    const mobileNumber = form.mobileNumber.trim();
    const email = form.email.trim();
    const city = form.city.trim();
    const password = form.password.trim();

    if (!fullName || !mobileNumber || !email || !password) {
      Alert.alert(
        "Missing details",
        "Please enter technician name, mobile number, email, and password.",
      );
      return;
    }

    setIsCreating(true);

    try {
      const payload = {
        fullName,
        username: fullName,
        mobileNumber,
        email,
        city,
        password,
        role: "technician",
        active: true,
        createdAt: new Date().toISOString(),
      };

      const response = await safeFetch(getApiUrl(TECHNICIANS_API_PATH), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const responsePayload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(responsePayload?.message || "Unable to create technician.");
      }

      const createdTechnician =
        responsePayload?.technician ||
        responsePayload?.data?.technician ||
        responsePayload?.data ||
        responsePayload ||
        payload;

      setTechnicians((current) => [
        normalizeTechnicians([createdTechnician])[0],
        ...current,
      ]);

      setShowCreateModal(false);
      resetForm();
      Alert.alert("Technician created", "The technician profile is ready.");
    } catch (error) {
      Alert.alert("Create failed", error?.message || "Please try again.");
    } finally {
      setIsCreating(false);
    }
  };

  const openTechnicianProfile = (technician) => {
    setSelectedTechnician(technician);
    setMonthDate(new Date());
  };

  const assignVisit = (visit) => {
    const technicianId = getTechnicianId(selectedTechnician);
    const technicianName = getTechnicianName(selectedTechnician);
    const visitId = visit._visitId;

    if (!technicianId || !visitId) {
      Alert.alert("Missing details", "This visit cannot be assigned.");
      return;
    }

    Alert.alert(
      visit._assignedTechnicianId ? "Reassign visit" : "Assign visit",
      `Assign this visit to ${technicianName}?`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Assign",
          onPress: async () => {
            setProcessingVisitId(visitId);

            try {
              const response = await safeFetch(getApiUrl(ASSIGN_VISIT_API_PATH(visitId)), {
                method: "PATCH",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  technicianId,
                  technicianName,
                  assignedTechnicianId: technicianId,
                  assignedTechnicianName: technicianName,
                  visitId,
                  visitIndex: visit._visitIndex,
                  visitDate: visit._date,
                  requestId: visit._requestId,
                  consumerNumber: visit._consumerNumber,
                  status: "Assigned",
                  assignedAt: new Date().toISOString(),
                }),
              });

              const payload = await response.json().catch(() => null);

              if (!response.ok) {
                throw new Error(payload?.message || "Unable to assign visit.");
              }

              setVisits((current) =>
                current.map((item) =>
                  item._visitId === visitId
                    ? {
                        ...item,
                        _assignedTechnicianId: technicianId,
                        _assignedTechnicianName: technicianName,
                        _status: "Assigned",
                      }
                    : item,
                ),
              );

              Alert.alert("Visit assigned", "The technician has been assigned.");
            } catch (error) {
              Alert.alert("Assign failed", error?.message || "Please try again.");
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
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            tintColor={COLORS.brand}
            colors={[COLORS.brand]}
            onRefresh={() => fetchTechnicians({ refreshing: true })}
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
              <Text style={styles.heroBadgeText}>Manage Technicians</Text>
            </View>
            <View style={styles.heroIconWrap}>
              <Ionicons name="construct-outline" size={22} color="#FFFFFF" />
            </View>
          </View>

          <Text style={styles.heroTitle}>Create profiles and assign field visits.</Text>
          <Text style={styles.heroSubtitle}>
            Add technician login details, monitor active field staff, and assign
            current-month consumer visits from each technician profile.
          </Text>

          <View style={styles.heroActionRow}>
            <Pressable style={styles.heroPrimaryButton} onPress={() => setShowCreateModal(true)}>
              <Text style={styles.heroPrimaryButtonText}>Create Technician</Text>
              <Ionicons name="add-circle-outline" size={16} color={COLORS.brandDark} />
            </Pressable>
            <Pressable
              style={styles.heroSecondaryButton}
              onPress={() => fetchTechnicians({ refreshing: true })}
            >
              <Ionicons name="refresh-outline" size={15} color="#FFFFFF" />
              <Text style={styles.heroSecondaryButtonText}>Refresh</Text>
            </Pressable>
          </View>
        </LinearGradient>

        <View style={styles.statsGrid}>
          <StatCard
            icon="people-outline"
            label="Technicians"
            value={String(stats.total)}
            accent={COLORS.blue}
            soft={COLORS.blueSoft}
          />
          <StatCard
            icon="checkmark-circle-outline"
            label="Active"
            value={String(stats.active)}
            accent={COLORS.success}
            soft={COLORS.successSoft}
          />
          <StatCard
            icon="calendar-outline"
            label="Month visits"
            value={String(stats.monthVisits)}
            accent={COLORS.amber}
            soft={COLORS.amberSoft}
          />
        </View>

        <View style={styles.toolbarCard}>
          <View style={styles.searchBox}>
            <Ionicons name="search-outline" size={17} color={COLORS.faint} />
            <TextInput
              value={searchText}
              onChangeText={setSearchText}
              placeholder="Search technician, email, mobile, or city"
              placeholderTextColor={COLORS.faint}
              style={styles.searchInput}
            />
            {searchText ? (
              <Pressable onPress={() => setSearchText("")}>
                <Ionicons name="close-circle" size={17} color={COLORS.faint} />
              </Pressable>
            ) : null}
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionEyebrow}>Technician directory</Text>
            <Text style={styles.sectionTitle}>Field staff profiles</Text>
          </View>
          <Pressable style={styles.createMiniButton} onPress={() => setShowCreateModal(true)}>
            <Ionicons name="add" size={18} color="#FFFFFF" />
          </Pressable>
        </View>

        {isLoadingTechnicians ? (
          <View style={styles.stateCard}>
            <ActivityIndicator color={COLORS.brand} />
            <Text style={styles.stateTitle}>Loading technicians</Text>
            <Text style={styles.stateText}>Fetching technician profiles.</Text>
          </View>
        ) : errorMessage ? (
          <View style={styles.stateCard}>
            <View style={styles.stateIconDanger}>
              <Ionicons name="warning-outline" size={24} color={COLORS.danger} />
            </View>
            <Text style={styles.stateTitle}>Could not load technicians</Text>
            <Text style={styles.stateText}>{errorMessage}</Text>
            <Pressable style={styles.retryButton} onPress={() => fetchTechnicians()}>
              <Text style={styles.retryButtonText}>Try again</Text>
            </Pressable>
          </View>
        ) : filteredTechnicians.length === 0 ? (
          <View style={styles.stateCard}>
            <View style={styles.stateIcon}>
              <Ionicons name="person-add-outline" size={24} color={COLORS.brand} />
            </View>
            <Text style={styles.stateTitle}>No technicians found</Text>
            <Text style={styles.stateText}>
              Create a technician profile to start assigning visits.
            </Text>
          </View>
        ) : (
          filteredTechnicians.map((technician) => (
            <TechnicianCard
              key={technician._localId}
              technician={technician}
              visitCount={
                visits.filter(
                  (visit) =>
                    String(visit._assignedTechnicianId || "") ===
                    String(getTechnicianId(technician) || ""),
                ).length
              }
              onOpen={() => openTechnicianProfile(technician)}
            />
          ))
        )}
      </ScrollView>

      <Modal
        visible={showCreateModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.createModalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Create technician</Text>
                <Text style={styles.modalSubtitle}>
                  Add login credentials and contact details.
                </Text>
              </View>
              <Pressable
                style={styles.modalCloseButton}
                onPress={() => {
                  setShowCreateModal(false);
                  resetForm();
                }}
              >
                <Ionicons name="close" size={18} color={COLORS.text} />
              </Pressable>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              <TextInput
                value={form.fullName}
                onChangeText={(value) => updateForm("fullName", value)}
                placeholder="Full name"
                placeholderTextColor={COLORS.faint}
                style={styles.formInput}
              />
              <TextInput
                value={form.mobileNumber}
                onChangeText={(value) => updateForm("mobileNumber", value)}
                placeholder="Mobile number"
                placeholderTextColor={COLORS.faint}
                keyboardType="phone-pad"
                style={styles.formInput}
              />
              <TextInput
                value={form.email}
                onChangeText={(value) => updateForm("email", value)}
                placeholder="Email address"
                placeholderTextColor={COLORS.faint}
                autoCapitalize="none"
                keyboardType="email-address"
                style={styles.formInput}
              />
              <TextInput
                value={form.city}
                onChangeText={(value) => updateForm("city", value)}
                placeholder="City or working area"
                placeholderTextColor={COLORS.faint}
                style={styles.formInput}
              />

              <View style={styles.passwordInputWrap}>
                <TextInput
                  value={form.password}
                  onChangeText={(value) => updateForm("password", value)}
                  placeholder="Temporary password"
                  placeholderTextColor={COLORS.faint}
                  secureTextEntry={!showPassword}
                  style={styles.passwordInput}
                />
                <Pressable onPress={() => setShowPassword((current) => !current)}>
                  <Ionicons
                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                    size={18}
                    color={COLORS.faint}
                  />
                </Pressable>
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <Pressable
                style={styles.cancelButton}
                onPress={() => {
                  setShowCreateModal(false);
                  resetForm();
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.createButton, isCreating && styles.disabledButton]}
                onPress={createTechnician}
                disabled={isCreating}
              >
                {isCreating ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Ionicons name="person-add-outline" size={16} color="#FFFFFF" />
                )}
                <Text style={styles.createButtonText}>Create</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={Boolean(selectedTechnician)}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedTechnician(null)}
      >
        <View style={styles.profileOverlay}>
          <View style={styles.profileSheet}>
            <View style={styles.profileHeader}>
              <View style={styles.profileIdentity}>
                <View style={styles.profileAvatar}>
                  <Text style={styles.profileAvatarText}>
                    {getInitials(
                      getTechnicianName(selectedTechnician),
                      selectedTechnician?.email,
                    )}
                  </Text>
                </View>
                <View style={styles.profileTextWrap}>
                  <Text style={styles.profileName} numberOfLines={1}>
                    {getTechnicianName(selectedTechnician)}
                  </Text>
                  <Text style={styles.profileMeta} numberOfLines={1}>
                    {selectedTechnician?.email || "No email"}
                  </Text>
                </View>
              </View>

              <Pressable style={styles.modalCloseButton} onPress={() => setSelectedTechnician(null)}>
                <Ionicons name="close" size={18} color={COLORS.text} />
              </Pressable>
            </View>

            <View style={styles.monthToolbar}>
              <Pressable style={styles.monthButton} onPress={() => setMonthDate((current) => addMonths(current, -1))}>
                <Ionicons name="chevron-back" size={17} color={COLORS.brand} />
              </Pressable>
              <View style={styles.monthTitleWrap}>
                <Text style={styles.monthLabel}>Consumer visits</Text>
                <Text style={styles.monthTitle}>{formatMonth(monthDate)}</Text>
              </View>
              <Pressable style={styles.monthButton} onPress={() => setMonthDate((current) => addMonths(current, 1))}>
                <Ionicons name="chevron-forward" size={17} color={COLORS.brand} />
              </Pressable>
            </View>

            <ScrollView
              style={styles.visitList}
              contentContainerStyle={styles.visitListContent}
              showsVerticalScrollIndicator={false}
            >
              {isLoadingVisits ? (
                <View style={styles.visitStateCard}>
                  <ActivityIndicator color={COLORS.brand} />
                  <Text style={styles.stateTitle}>Loading visits</Text>
                  <Text style={styles.stateText}>Fetching current month consumer visits.</Text>
                </View>
              ) : selectedTechnicianVisits.length === 0 ? (
                <View style={styles.visitStateCard}>
                  <View style={styles.stateIcon}>
                    <Ionicons name="calendar-outline" size={24} color={COLORS.brand} />
                  </View>
                  <Text style={styles.stateTitle}>No visits for this month</Text>
                  <Text style={styles.stateText}>
                    Current month consumer visit dates will appear here.
                  </Text>
                </View>
              ) : (
                selectedTechnicianVisits.map((visit) => (
                  <VisitCard
                    key={visit._visitId}
                    visit={visit}
                    technician={selectedTechnician}
                    processingVisitId={processingVisitId}
                    onAssign={assignVisit}
                  />
                ))
              )}
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
  heroActionRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 20,
  },
  heroPrimaryButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  heroPrimaryButtonText: {
    color: COLORS.brandDark,
    fontSize: 12,
    fontWeight: "900",
  },
  heroSecondaryButton: {
    minWidth: 94,
    minHeight: 46,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingHorizontal: 12,
  },
  heroSecondaryButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "900",
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
  createMiniButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: COLORS.brand,
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
  stateIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: COLORS.blueSoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  stateIconDanger: {
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
  technicianCard: {
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
  technicianAccent: {
    position: "absolute",
    left: 0,
    top: 14,
    bottom: 14,
    width: 4,
    borderTopRightRadius: 999,
    borderBottomRightRadius: 999,
  },
  technicianTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  technicianIdentity: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  avatarWrap: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  avatarText: {
    fontSize: 12,
    fontWeight: "900",
  },
  technicianTextWrap: {
    flex: 1,
  },
  technicianName: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: "900",
  },
  technicianMeta: {
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
  technicianInfoGrid: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  infoTile: {
    flex: 1,
    minHeight: 72,
    borderRadius: 13,
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: "#EDF2F7",
    padding: 10,
  },
  infoTileValue: {
    color: COLORS.text,
    fontSize: 10,
    fontWeight: "900",
    marginTop: 8,
  },
  infoTileLabel: {
    color: COLORS.muted,
    fontSize: 9,
    fontWeight: "800",
    marginTop: 2,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
  },
  idWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  idText: {
    color: COLORS.faint,
    fontSize: 10,
    fontWeight: "800",
  },
  openProfileButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  openProfileText: {
    color: COLORS.brand,
    fontSize: 11,
    fontWeight: "900",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.62)",
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  createModalCard: {
    maxHeight: "82%",
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
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: COLORS.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  modalBody: {
    paddingHorizontal: 14,
    paddingTop: 14,
  },
  formInput: {
    minHeight: 46,
    borderRadius: 14,
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: COLORS.border,
    color: COLORS.text,
    fontSize: 12,
    fontWeight: "700",
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  passwordInputWrap: {
    minHeight: 46,
    borderRadius: 14,
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  passwordInput: {
    flex: 1,
    color: COLORS.text,
    fontSize: 12,
    fontWeight: "700",
    paddingVertical: 0,
  },
  modalActions: {
    flexDirection: "row",
    gap: 10,
    padding: 14,
  },
  cancelButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 14,
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButtonText: {
    color: COLORS.muted,
    fontSize: 12,
    fontWeight: "900",
  },
  createButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 14,
    backgroundColor: COLORS.brand,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  createButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "900",
  },
  disabledButton: {
    opacity: 0.72,
  },
  profileOverlay: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.55)",
    justifyContent: "flex-end",
  },
  profileSheet: {
    maxHeight: "90%",
    backgroundColor: COLORS.page,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  profileHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  profileIdentity: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  profileAvatar: {
    width: 44,
    height: 44,
    borderRadius: 15,
    backgroundColor: COLORS.blueSoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  profileAvatarText: {
    color: COLORS.blue,
    fontSize: 13,
    fontWeight: "900",
  },
  profileTextWrap: {
    flex: 1,
  },
  profileName: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: "900",
  },
  profileMeta: {
    color: COLORS.muted,
    fontSize: 10,
    fontWeight: "700",
    marginTop: 3,
  },
  monthToolbar: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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
  monthTitleWrap: {
    alignItems: "center",
  },
  monthLabel: {
    color: COLORS.muted,
    fontSize: 9.5,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  monthTitle: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "900",
    marginTop: 2,
  },
  visitList: {
    flex: 1,
  },
  visitListContent: {
    paddingBottom: 28,
  },
  visitStateCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 26,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  visitCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: "hidden",
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 7 },
    elevation: 3,
  },
  visitStatusRail: {
    position: "absolute",
    left: 0,
    top: 13,
    bottom: 13,
    width: 4,
    borderTopRightRadius: 999,
    borderBottomRightRadius: 999,
  },
  visitTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },
  visitTitleWrap: {
    flex: 1,
  },
  visitCustomerName: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "900",
  },
  visitServiceName: {
    color: COLORS.muted,
    fontSize: 10,
    lineHeight: 15,
    fontWeight: "700",
    marginTop: 3,
  },
  visitBadge: {
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  visitBadgeText: {
    fontSize: 9,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  visitInfoGrid: {
    flexDirection: "row",
    gap: 8,
    marginTop: 11,
  },
  visitInfoTile: {
    flex: 1,
    borderRadius: 13,
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: "#EDF2F7",
    padding: 10,
  },
  visitInfoValue: {
    color: COLORS.text,
    fontSize: 10,
    fontWeight: "900",
    marginTop: 7,
  },
  visitInfoLabel: {
    color: COLORS.muted,
    fontSize: 9,
    fontWeight: "800",
    marginTop: 2,
  },
  locationBox: {
    marginTop: 10,
    borderRadius: 13,
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: "#EDF2F7",
    padding: 10,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 7,
  },
  locationText: {
    flex: 1,
    color: COLORS.text,
    fontSize: 10.5,
    lineHeight: 15,
    fontWeight: "700",
  },
  assignedNote: {
    color: COLORS.amber,
    fontSize: 10,
    fontWeight: "800",
    marginTop: 9,
  },
  assignButton: {
    minHeight: 42,
    borderRadius: 14,
    backgroundColor: COLORS.brand,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    marginTop: 12,
  },
  assignButtonDone: {
    backgroundColor: COLORS.success,
  },
  assignButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "900",
  },
});
