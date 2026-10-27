import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
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

const API_PATH = "/api/admin/dashboard-services";
const REQUEST_DETAILS_PATH = (id) =>
  `/api/admin/request/${encodeURIComponent(id)}`;
const COLORS = {
  page: "#F1F5F9",
  surface: "#FFFFFF",
  text: "#102A43",
  muted: "#64748B",
  faint: "#94A3B8",
  border: "#DCE5EF",
  brand: "#1E5464",
  blue: "#4563C7",
  blueSoft: "#EEF2FF",
  green: "#16805D",
  greenSoft: "#E9F8F1",
  amber: "#B7791F",
  amberSoft: "#FFF6E5",
  purple: "#7650A8",
  purpleSoft: "#F3EDFA",
  red: "#C53030",
  redSoft: "#FFF0F0",
  shadow: "#334155",
};

const FILTERS = ["All", "Pending", "Completed"];
const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

function dateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDate(value, options = {}) {
  if (!value) return "Date unavailable";
  const dateMatch =
    typeof value === "string" && value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  const date = dateMatch
    ? new Date(
        Number(dateMatch[1]),
        Number(dateMatch[2]) - 1,
        Number(dateMatch[3]),
      )
    : new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...options,
  });
}

function normalizeStatus(value) {
  return String(value || "").trim().toLowerCase() === "completed"
    ? "Completed"
    : "Pending";
}

function serviceColors(serviceName) {
  const name = String(serviceName || "").toLowerCase();
  if (name.includes("solar") && name.includes("amc")) {
    return { color: COLORS.amber, soft: COLORS.amberSoft };
  }
  if (name.includes("solar")) {
    return { color: COLORS.purple, soft: COLORS.purpleSoft };
  }
  if (name.includes("electrical")) {
    return { color: COLORS.blue, soft: COLORS.blueSoft };
  }
  if (name.includes("clean")) {
    return { color: COLORS.green, soft: COLORS.greenSoft };
  }
  return { color: COLORS.brand, soft: "#EAF2F5" };
}

function Dashboard() {
  const [activeTab, setActiveTab] = useState("today");
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [holdDateFilter, setHoldDateFilter] = useState(false);
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });
  const [services, setServices] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [savingVisitId, setSavingVisitId] = useState("");
  const [selectedService, setSelectedService] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState("");
  const [photoViewer, setPhotoViewer] = useState(null);

  const selectedDateKey = dateKey(selectedDate);

  const loadServices = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError("");

      const params = new URLSearchParams();
      if (activeTab === "held") {
        params.set("holdType", "permanent");
        if (holdDateFilter) params.set("date", selectedDateKey);
      } else {
        params.set("status", statusFilter);
        if (statusFilter !== "Completed") {
          params.set("date", selectedDateKey);
        }
      }

      try {
        const response = await safeFetch(
          getApiUrl(`${API_PATH}?${params.toString()}`),
        );
        const payload = await response.json();
        if (!response.ok || !payload?.success) {
          const legacyCompletedFilterError =
            activeTab === "today" &&
            statusFilter === "Completed" &&
            /date or holdtype filter is required/i.test(
              String(payload?.message || ""),
            );
          throw new Error(
            legacyCompletedFilterError
              ? "The server needs an update to show completed visits from all dates. Deploy the latest backend, then retry."
              : payload?.message || "Unable to load services.",
          );
        }
        setServices(Array.isArray(payload.data) ? payload.data : []);
      } catch (loadError) {
        setError(loadError.message || "Unable to load services.");
        setServices([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [activeTab, holdDateFilter, selectedDateKey, statusFilter],
  );

  // The effect triggers a request; loadServices updates request state asynchronously.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadServices();
  }, [loadServices]);

  const visibleServices = useMemo(() => {
    const query = search.trim().toLowerCase();
    return services.filter((service) => {
      const status = normalizeStatus(service._status);
      const matchesStatus =
        activeTab === "held" ||
        statusFilter === "All" ||
        status === statusFilter;
      const searchableText = [
        service._consumerName,
        service._serviceName,
        service._mobileNumber,
        service._consumerNumber,
        service._address,
        service._city,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return matchesStatus && (!query || searchableText.includes(query));
    });
  }, [activeTab, search, services, statusFilter]);

  const openCalendar = () => {
    setCalendarMonth(
      new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1),
    );
    setCalendarVisible(true);
  };

  const selectCalendarDate = (day) => {
    setSelectedDate(
      new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), day),
    );
    if (activeTab === "held") setHoldDateFilter(true);
    setCalendarVisible(false);
  };

  const openServiceDetails = async (service) => {
    setSelectedService(service);
    setDetailsLoading(true);
    setDetailsError("");

    try {
      const response = await safeFetch(
        getApiUrl(REQUEST_DETAILS_PATH(service._requestId)),
      );
      const payload = await response.json();
      if (!response.ok || !payload?.success || !payload?.data) {
        throw new Error(
          payload?.message || "Unable to load the technician's response.",
        );
      }

      const visits = payload.data.consumerManagement?.selectedVisits || [];
      const visit = visits[Number(service._visitIndex)];
      if (!visit) {
        throw new Error("The latest response for this visit was not found.");
      }

      setSelectedService((current) =>
        current?._visitId === service._visitId
          ? {
              ...current,
              _status: visit.status || current._status,
              _assignedTechnicianName:
                visit.assignedTechnicianName ||
                current._assignedTechnicianName,
              _issueNote: visit.issueNote || "",
              _beforePhotoUrl: visit.beforePhotoUrl || "",
              _afterPhotoUrl: visit.afterPhotoUrl || "",
              _submittedAt: visit.submittedAt || null,
            }
          : current,
      );
    } catch (loadError) {
      setDetailsError(
        loadError.message || "Unable to load the technician's response.",
      );
    } finally {
      setDetailsLoading(false);
    }
  };

  const updateHoldStatus = async (service, holdType, held) => {
    setSavingVisitId(service._visitId);
    try {
      const response = await safeFetch(getApiUrl(API_PATH), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: service._requestId,
          visitIndex: service._visitIndex,
          holdType,
          held,
        }),
      });
      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.message || "Unable to update hold status.");
      }

      if (activeTab === "held" || (holdType === "permanent" && held)) {
        setServices((current) =>
          current.filter((item) => item._visitId !== service._visitId),
        );
      } else {
        setServices((current) =>
          current.map((item) =>
            item._visitId === service._visitId
              ? {
                  ...item,
                  _temporaryHold:
                    holdType === "temporary"
                      ? held
                      : held
                        ? false
                        : item._temporaryHold,
                  _permanentHold:
                    holdType === "permanent"
                      ? held
                      : held
                        ? false
                        : item._permanentHold,
                }
              : item,
          ),
        );
      }
    } catch (updateError) {
      setError(updateError.message || "Unable to update hold status.");
    } finally {
      setSavingVisitId("");
    }
  };

  const calendarFirstWeekday = new Date(
    calendarMonth.getFullYear(),
    calendarMonth.getMonth(),
    1,
  ).getDay();
  const daysInCalendarMonth = new Date(
    calendarMonth.getFullYear(),
    calendarMonth.getMonth() + 1,
    0,
  ).getDate();
  const calendarSlots = [
    ...Array(calendarFirstWeekday).fill(null),
    ...Array.from({ length: daysInCalendarMonth }, (_, index) => index + 1),
  ];

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.page} />
      <View style={styles.page}>
        <View style={styles.heading}>
          <View>
            <Text style={styles.eyebrow}>SERVICE OVERVIEW</Text>
            <Text style={styles.title}>Dashboard</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Refresh services"
            onPress={() => loadServices(true)}
            style={styles.refreshButton}
          >
            <Ionicons name="refresh-outline" size={21} color={COLORS.brand} />
          </Pressable>
        </View>

        <View style={styles.tabs}>
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === "today" }}
            onPress={() => setActiveTab("today")}
            style={[styles.tab, activeTab === "today" && styles.activeTab]}
          >
            <Ionicons
              name="today-outline"
              size={17}
              color={activeTab === "today" ? COLORS.brand : COLORS.muted}
            />
            <Text
              style={[
                styles.tabText,
                activeTab === "today" && styles.activeTabText,
              ]}
            >
              Today&apos;s Services
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === "held" }}
            onPress={() => setActiveTab("held")}
            style={[styles.tab, activeTab === "held" && styles.activeTab]}
          >
            <Ionicons
              name="pause-circle-outline"
              size={18}
              color={activeTab === "held" ? COLORS.red : COLORS.muted}
            />
            <Text
              style={[
                styles.tabText,
                activeTab === "held" && styles.activeTabText,
              ]}
            >
              Permanent Hold
            </Text>
          </Pressable>
        </View>

        <View style={styles.controls}>
          {activeTab === "today" && statusFilter === "Completed" ? (
            <View style={[styles.dateButton, styles.allCompletedButton]}>
              <Ionicons
                name="checkmark-done-circle-outline"
                size={20}
                color={COLORS.green}
              />
              <Text style={styles.dateButtonText}>All completed visits</Text>
              <View style={styles.allDatesBadge}>
                <Text style={styles.allDatesBadgeText}>ALL DATES</Text>
              </View>
            </View>
          ) : (
            <Pressable
              accessibilityRole="button"
              onPress={openCalendar}
              style={styles.dateButton}
            >
              <Ionicons
                name="calendar-outline"
                size={19}
                color={COLORS.brand}
              />
              <Text style={styles.dateButtonText}>
                {activeTab === "held" && !holdDateFilter
                  ? "All scheduled dates"
                  : formatDate(selectedDate, {
                      weekday: "short",
                      day: "2-digit",
                      month: "short",
                    })}
              </Text>
              <Ionicons name="chevron-down" size={16} color={COLORS.muted} />
            </Pressable>
          )}
          {activeTab === "held" && holdDateFilter ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => setHoldDateFilter(false)}
              style={styles.allDatesButton}
            >
              <Text style={styles.allDatesText}>All dates</Text>
            </Pressable>
          ) : null}
        </View>

        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={19} color={COLORS.faint} />
          <TextInput
            accessibilityLabel="Search services"
            onChangeText={setSearch}
            placeholder="Search name, service or phone"
            placeholderTextColor={COLORS.faint}
            returnKeyType="search"
            style={styles.searchInput}
            value={search}
          />
          {search ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Clear search"
              onPress={() => setSearch("")}
            >
              <Ionicons name="close-circle" size={18} color={COLORS.faint} />
            </Pressable>
          ) : null}
        </View>

        {activeTab === "today" ? (
          <ScrollView
            horizontal
            style={styles.filterScroller}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterList}
          >
            {FILTERS.map((filter) => {
              const selected = statusFilter === filter;
              return (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  key={filter}
                  onPress={() => setStatusFilter(filter)}
                  style={[styles.filterChip, selected && styles.selectedFilter]}
                >
                  <Text
                    style={[
                      styles.filterText,
                      selected && styles.selectedFilterText,
                    ]}
                  >
                    {filter}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        ) : null}

        <ScrollView
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadServices(true)}
              tintColor={COLORS.brand}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {loading && !refreshing ? (
            <View style={styles.loadingState}>
              <ActivityIndicator size="large" color={COLORS.brand} />
              <Text style={styles.emptyDescription}>Loading services...</Text>
            </View>
          ) : error ? (
            <View style={styles.errorState}>
              <View style={styles.errorIcon}>
                <Ionicons
                  name="cloud-offline-outline"
                  size={28}
                  color={COLORS.red}
                />
              </View>
              <Text style={styles.emptyTitle}>Couldn&apos;t load visits</Text>
              <Text style={styles.emptyDescription}>{error}</Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => loadServices()}
                style={styles.retryButton}
              >
                <Ionicons
                  name="refresh-outline"
                  size={16}
                  color={COLORS.surface}
                />
                <Text style={styles.retryButtonText}>Try again</Text>
              </Pressable>
            </View>
          ) : visibleServices.length ? (
            visibleServices.map((service) => {
              const status = normalizeStatus(service._status);
              const typeColors = serviceColors(service._serviceName);
              const isCompleted = status === "Completed";
              const temporarilyHeld =
                !isCompleted && service._temporaryHold === true;
              const permanentlyHeld =
                !isCompleted && service._permanentHold === true;
              const held = temporarilyHeld || permanentlyHeld;
              const serviceCardStyle = permanentlyHeld
                ? styles.permanentHeldCard
                : temporarilyHeld
                  ? styles.heldCard
                  : null;
              return (
                <View
                  key={service._visitId}
                  style={[styles.serviceCard, serviceCardStyle]}
                >
                  <View style={styles.cardTopLine}>
                    <Text numberOfLines={1} style={styles.consumerName}>
                      {service._consumerName || "Unnamed consumer"}
                    </Text>
                    <View style={styles.cardActions}>
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => openServiceDetails(service)}
                        style={styles.viewButton}
                      >
                        <Text style={styles.viewButtonText}>
                          {isCompleted ? "Response" : "View"}
                        </Text>
                      </Pressable>
                      {activeTab === "held" && !isCompleted ? (
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel="Unhold permanent hold"
                          accessibilityState={{ selected: true }}
                          disabled={savingVisitId === service._visitId}
                          onPress={() =>
                            updateHoldStatus(service, "permanent", false)
                          }
                          style={[
                            styles.holdIconButton,
                            savingVisitId === service._visitId &&
                              styles.disabledButton,
                          ]}
                        >
                          {savingVisitId === service._visitId ? (
                            <ActivityIndicator
                              size="small"
                              color={COLORS.purple}
                            />
                          ) : (
                            <Ionicons
                              name="lock-open-outline"
                              size={17}
                              color={COLORS.purple}
                            />
                          )}
                        </Pressable>
                      ) : activeTab !== "held" && !isCompleted ? (
                        <>
                          <Pressable
                            accessibilityRole="button"
                            accessibilityState={{
                              selected: temporarilyHeld,
                            }}
                            accessibilityLabel={
                              temporarilyHeld
                                ? "Unhold temporary hold"
                                : "Set temporary hold"
                            }
                            disabled={savingVisitId === service._visitId}
                            onPress={() =>
                              updateHoldStatus(
                                service,
                                "temporary",
                                !temporarilyHeld,
                              )
                            }
                            style={[
                              styles.holdIconButton,
                              savingVisitId === service._visitId &&
                                styles.disabledButton,
                            ]}
                          >
                            {savingVisitId === service._visitId ? (
                              <ActivityIndicator
                                size="small"
                                color={
                                  temporarilyHeld ? COLORS.red : "#CF7064"
                                }
                              />
                            ) : (
                              <Ionicons
                                name={
                                  temporarilyHeld
                                    ? "play-circle-outline"
                                    : "pause-circle-outline"
                                }
                                size={18}
                                color={COLORS.red}
                              />
                            )}
                          </Pressable>
                          <Pressable
                            accessibilityRole="button"
                            accessibilityState={{
                              selected: permanentlyHeld,
                            }}
                            accessibilityLabel={
                              permanentlyHeld
                                ? "Unhold permanent hold"
                                : "Set permanent hold"
                            }
                            disabled={savingVisitId === service._visitId}
                            onPress={() =>
                              updateHoldStatus(
                                service,
                                "permanent",
                                !permanentlyHeld,
                              )
                            }
                            style={[
                              styles.holdIconButton,
                              savingVisitId === service._visitId &&
                                styles.disabledButton,
                            ]}
                          >
                            {savingVisitId === service._visitId ? (
                              <ActivityIndicator
                                size="small"
                                color={
                                  permanentlyHeld
                                    ? COLORS.purple
                                    : "#9577B5"
                                }
                              />
                            ) : (
                              <Ionicons
                                name={
                                  permanentlyHeld
                                    ? "lock-open-outline"
                                    : "lock-closed-outline"
                                }
                                size={16}
                                color={COLORS.purple}
                              />
                            )}
                          </Pressable>
                        </>
                      ) : null}
                    </View>
                  </View>

                  <View style={styles.serviceTypeLine}>
                    <View
                      style={[
                        styles.serviceTypeBadge,
                        {
                          backgroundColor: held
                            ? permanentlyHeld
                              ? "#EDE5F7"
                              : "#FDE0E0"
                            : typeColors.soft,
                        },
                      ]}
                    >
                      <Text
                        numberOfLines={1}
                        style={[
                          styles.serviceTypeText,
                          {
                            color: permanentlyHeld
                              ? COLORS.purple
                              : temporarilyHeld
                                ? COLORS.red
                                : typeColors.color,
                          },
                        ]}
                      >
                        {service._serviceName || "Service"}
                      </Text>
                    </View>
                    {held ? (
                      <Text
                        style={[
                          styles.onHoldLabel,
                          permanentlyHeld && styles.permanentOnHoldLabel,
                        ]}
                      >
                        {permanentlyHeld
                          ? "PERMANENT HOLD"
                          : "TEMPORARY HOLD"}
                      </Text>
                    ) : null}
                  </View>

                  <View style={styles.technicianLine}>
                    <Ionicons
                      name="person-circle-outline"
                      size={15}
                      color={COLORS.muted}
                    />
                    <Text numberOfLines={1} style={styles.technicianName}>
                      Technician:{" "}
                      {service._assignedTechnicianName ||
                        service._lockedByTechnicianName ||
                        "Not recorded"}
                    </Text>
                  </View>

                  <View style={styles.cardBottomLine}>
                    <Text
                      style={[
                        styles.visitDate,
                        service._isCarriedForward &&
                          styles.carriedForwardDate,
                      ]}
                    >
                      {service._isCarriedForward
                        ? `Carried forward · ${formatDate(service._date, {
                            day: "2-digit",
                            month: "short",
                          })}`
                        : `Date: ${formatDate(service._date)}`}
                    </Text>
                    <View
                      style={[
                        styles.statusBadge,
                        status === "Completed"
                          ? styles.completedStatus
                          : styles.pendingStatus,
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusText,
                          status === "Completed"
                            ? styles.completedStatusText
                            : styles.pendingStatusText,
                        ]}
                      >
                        {status}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })
          ) : (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Ionicons
                  name={
                    activeTab === "held"
                      ? "pause-circle-outline"
                      : "calendar-clear-outline"
                  }
                  size={29}
                  color={COLORS.brand}
                />
              </View>
              <Text style={styles.emptyTitle}>
                {search
                  ? "No matching services"
                  : activeTab === "held"
                    ? "No services on permanent hold"
                  : statusFilter === "Completed"
                    ? "No completed visits yet"
                    : statusFilter === "Pending"
                      ? "No pending visits"
                      : "No services scheduled"}
              </Text>
              <Text style={styles.emptyDescription}>
                {search
                  ? "Try changing your search or status filter."
                  : activeTab === "held"
                    ? "Services placed on permanent hold will appear here."
                  : statusFilter === "Completed"
                    ? "Completed visits will appear here once they are submitted."
                    : statusFilter === "Pending"
                      ? `There are no pending visits for ${formatDate(selectedDate)}.`
                      : `There are no visits scheduled for ${formatDate(
                          selectedDate,
                        )}.`}
              </Text>
            </View>
          )}
        </ScrollView>
      </View>

      <Modal
        animationType="fade"
        onRequestClose={() => setCalendarVisible(false)}
        transparent
        visible={calendarVisible}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.calendarModal}>
            <View style={styles.calendarHeader}>
              <Text style={styles.modalTitle}>Choose a date</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close calendar"
                onPress={() => setCalendarVisible(false)}
              >
                <Ionicons name="close" size={24} color={COLORS.muted} />
              </Pressable>
            </View>
            <View style={styles.monthHeader}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Previous month"
                onPress={() =>
                  setCalendarMonth(
                    (current) =>
                      new Date(
                        current.getFullYear(),
                        current.getMonth() - 1,
                        1,
                      ),
                  )
                }
                style={styles.monthArrow}
              >
                <Ionicons name="chevron-back" size={19} color={COLORS.brand} />
              </Pressable>
              <Text style={styles.monthLabel}>
                {calendarMonth.toLocaleDateString("en-IN", {
                  month: "long",
                  year: "numeric",
                })}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Next month"
                onPress={() =>
                  setCalendarMonth(
                    (current) =>
                      new Date(
                        current.getFullYear(),
                        current.getMonth() + 1,
                        1,
                      ),
                  )
                }
                style={styles.monthArrow}
              >
                <Ionicons
                  name="chevron-forward"
                  size={19}
                  color={COLORS.brand}
                />
              </Pressable>
            </View>
            <View style={styles.calendarGrid}>
              {WEEKDAYS.map((weekday, index) => (
                <Text key={`${weekday}-${index}`} style={styles.weekday}>
                  {weekday}
                </Text>
              ))}
              {calendarSlots.map((day, index) => {
                if (!day) {
                  return (
                    <View
                      key={`empty-${index}`}
                      style={styles.calendarDayCell}
                    />
                  );
                }
                const isSelected =
                  dateKey(
                    new Date(
                      calendarMonth.getFullYear(),
                      calendarMonth.getMonth(),
                      day,
                    ),
                  ) === selectedDateKey;
                return (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                    key={`day-${day}`}
                    onPress={() => selectCalendarDate(day)}
                    style={[
                      styles.calendarDayCell,
                      isSelected && styles.selectedCalendarDay,
                    ]}
                  >
                    <Text
                      style={[
                        styles.calendarDayText,
                        isSelected && styles.selectedCalendarDayText,
                      ]}
                    >
                      {day}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                const today = new Date();
                setSelectedDate(today);
                setCalendarMonth(
                  new Date(today.getFullYear(), today.getMonth(), 1),
                );
                if (activeTab === "held") setHoldDateFilter(true);
                setCalendarVisible(false);
              }}
              style={styles.todayButton}
            >
              <Text style={styles.todayButtonText}>Go to today</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal
        animationType="fade"
        onRequestClose={() => setPhotoViewer(null)}
        presentationStyle="fullScreen"
        statusBarTranslucent
        visible={Boolean(photoViewer)}
      >
        <View style={styles.photoViewer}>
          <View style={styles.photoViewerHeader}>
            <View>
              <Text style={styles.photoViewerEyebrow}>TECHNICIAN SUBMISSION</Text>
              <Text style={styles.photoViewerTitle}>
                {photoViewer?.label || "Site photo"}
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close photo"
              onPress={() => setPhotoViewer(null)}
              style={styles.photoViewerClose}
            >
              <Ionicons name="close" size={23} color={COLORS.text} />
            </Pressable>
          </View>
          {photoViewer?.uri ? (
            <Image
              source={{ uri: photoViewer.uri }}
              style={styles.photoViewerImage}
              resizeMode="contain"
              accessibilityLabel={`${photoViewer.label} site photo`}
            />
          ) : null}
          <Text style={styles.photoViewerHint}>
            Tap close to return to the visit response
          </Text>
        </View>
      </Modal>

      <Modal
        animationType="fade"
        onRequestClose={() => {
          setSelectedService(null);
          setDetailsError("");
        }}
        transparent
        visible={Boolean(selectedService)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.detailsModal}>
            <View style={styles.calendarHeader}>
              <Text style={styles.modalTitle}>Service details</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close service details"
                onPress={() => {
                  setSelectedService(null);
                  setDetailsError("");
                }}
              >
                <Ionicons name="close" size={24} color={COLORS.muted} />
              </Pressable>
            </View>
            <ScrollView
              style={styles.detailsScroll}
              contentContainerStyle={styles.detailsScrollContent}
              showsVerticalScrollIndicator={false}
            >
              {detailsLoading ? (
                <View style={styles.detailsLoading}>
                  <ActivityIndicator size="large" color={COLORS.brand} />
                  <Text style={styles.emptyDescription}>
                    Loading technician response...
                  </Text>
                </View>
              ) : detailsError ? (
                <View style={styles.detailsError}>
                  <Ionicons
                    name="alert-circle-outline"
                    size={22}
                    color={COLORS.red}
                  />
                  <Text style={styles.detailsErrorText}>{detailsError}</Text>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() =>
                      selectedService && openServiceDetails(selectedService)
                    }
                    style={styles.detailsRetryButton}
                  >
                    <Text style={styles.detailsRetryText}>Try again</Text>
                  </Pressable>
                </View>
              ) : selectedService ? (
                <>
                  <Text style={styles.detailConsumerName}>
                    {selectedService._consumerName || "Unnamed consumer"}
                  </Text>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Service</Text>
                    <Text style={styles.detailValue}>
                      {selectedService._serviceName || "Service"}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Visit date</Text>
                    <Text style={styles.detailValue}>
                      {formatDate(selectedService._date)}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Status</Text>
                    <Text style={styles.detailValue}>
                      {normalizeStatus(selectedService._status)}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Technician</Text>
                    <Text style={styles.detailValue}>
                      {selectedService._assignedTechnicianName ||
                        selectedService._lockedByTechnicianName ||
                        "Not recorded"}
                    </Text>
                  </View>
                  {selectedService._submittedAt ? (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Submitted</Text>
                      <Text style={styles.detailValue}>
                        {formatDate(selectedService._submittedAt, {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </Text>
                    </View>
                  ) : null}
                  {selectedService._mobileNumber ? (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Phone</Text>
                      <Text style={styles.detailValue}>
                        {selectedService._mobileNumber}
                      </Text>
                    </View>
                  ) : null}
                  {selectedService._consumerNumber ? (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Consumer number</Text>
                      <Text style={styles.detailValue}>
                        {selectedService._consumerNumber}
                      </Text>
                    </View>
                  ) : null}
                  {selectedService._address || selectedService._city ? (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Address</Text>
                      <Text style={styles.detailValue}>
                        {[selectedService._address, selectedService._city]
                          .filter(Boolean)
                          .join(", ")}
                      </Text>
                    </View>
                  ) : null}
                  <View style={styles.responseSection}>
                    <Text style={styles.responseSectionTitle}>
                      Technician response
                    </Text>
                    <Text style={styles.responseText}>
                      {selectedService._issueNote ||
                        "No written response was submitted."}
                    </Text>
                  </View>
                  <Text style={styles.responseSectionTitle}>Site photos</Text>
                  {selectedService._beforePhotoUrl ||
                  selectedService._afterPhotoUrl ? (
                    <View style={styles.photoRow}>
                      {[
                        ["Before", selectedService._beforePhotoUrl],
                        ["After", selectedService._afterPhotoUrl],
                      ].map(([label, url]) =>
                        url ? (
                          <Pressable
                            key={label}
                            accessibilityRole="button"
                            accessibilityLabel={`Open ${label.toLowerCase()} photo`}
                            onPress={() => setPhotoViewer({ label, uri: url })}
                            style={styles.photoTile}
                          >
                            <Image
                              source={{ uri: url }}
                              style={styles.sitePhoto}
                              resizeMode="cover"
                              accessibilityLabel={`${label} site photo`}
                            />
                            <Text style={styles.photoLabel}>{label}</Text>
                            <View style={styles.photoExpandIcon}>
                              <Ionicons
                                name="expand-outline"
                                size={15}
                                color={COLORS.surface}
                              />
                            </View>
                          </Pressable>
                        ) : null,
                      )}
                    </View>
                  ) : (
                    <Text style={styles.noPhotosText}>
                      No site photos were submitted for this visit.
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
  safeArea: { flex: 1, backgroundColor: COLORS.page },
  page: { flex: 1, paddingHorizontal: 18, paddingTop: 4 },
  heading: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  eyebrow: {
    color: COLORS.muted,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.5,
  },
  title: {
    color: COLORS.text,
    fontSize: 27,
    fontWeight: "800",
    marginTop: 3,
  },
  refreshButton: {
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderRadius: 13,
    borderWidth: 1,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  tabs: {
    backgroundColor: "#E6EDF4",
    borderRadius: 14,
    flexDirection: "row",
    gap: 5,
    marginBottom: 9,
    padding: 4,
  },
  tab: {
    alignItems: "center",
    borderRadius: 11,
    flex: 1,
    flexDirection: "row",
    gap: 7,
    justifyContent: "center",
    minHeight: 42,
    paddingHorizontal: 7,
  },
  activeTab: {
    backgroundColor: COLORS.surface,
    elevation: 2,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
  },
  tabText: { color: COLORS.muted, fontSize: 12, fontWeight: "700" },
  activeTabText: { color: COLORS.brand },
  controls: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  dateButton: {
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderRadius: 12,
    borderWidth: 1,
    flex: 1,
    flexDirection: "row",
    gap: 9,
    minHeight: 43,
    paddingHorizontal: 12,
  },
  allCompletedButton: { backgroundColor: "#F4FBF7", borderColor: "#D4EDE0" },
  allDatesBadge: {
    backgroundColor: COLORS.greenSoft,
    borderRadius: 7,
    paddingHorizontal: 7,
    paddingVertical: 4,
  },
  allDatesBadgeText: {
    color: COLORS.green,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  dateButtonText: {
    color: COLORS.text,
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
  },
  allDatesButton: {
    alignItems: "center",
    backgroundColor: COLORS.blueSoft,
    borderRadius: 11,
    justifyContent: "center",
    minHeight: 40,
    paddingHorizontal: 12,
  },
  allDatesText: { color: COLORS.blue, fontSize: 12, fontWeight: "700" },
  searchBox: {
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    minHeight: 44,
    paddingHorizontal: 12,
    marginBottom: 2,
  },
  searchInput: {
    color: COLORS.text,
    flex: 1,
    fontSize: 13,
    minHeight: 42,
    paddingVertical: 7,
  },
  filterScroller: { flexGrow: 0, height: 48, marginBottom: 4 },
  filterList: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    height: 44,
    paddingRight: 12,
  },
  filterChip: {
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderRadius: 20,
    borderWidth: 1,
    height: 36,
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  selectedFilter: { backgroundColor: COLORS.brand, borderColor: COLORS.brand },
  filterText: { color: COLORS.muted, fontSize: 12, fontWeight: "700" },
  selectedFilterText: { color: COLORS.surface },
  errorState: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  errorIcon: {
    alignItems: "center",
    backgroundColor: COLORS.redSoft,
    borderRadius: 26,
    height: 52,
    justifyContent: "center",
    marginBottom: 12,
    width: 52,
  },
  retryButton: {
    alignItems: "center",
    backgroundColor: COLORS.brand,
    borderRadius: 10,
    flexDirection: "row",
    gap: 7,
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  retryButtonText: { color: COLORS.surface, fontSize: 12, fontWeight: "800" },
  listContent: { flexGrow: 1, gap: 8, paddingBottom: 22, paddingTop: 2 },
  serviceCard: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderRadius: 12,
    borderWidth: 1,
    elevation: 1,
    gap: 6,
    paddingHorizontal: 11,
    paddingVertical: 9,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
  },
  heldCard: { backgroundColor: "#FFF8F7", borderColor: "#F0D5D1" },
  permanentHeldCard: { backgroundColor: "#FBF9FE", borderColor: "#E3D9EF" },
  cardTopLine: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    justifyContent: "space-between",
    minHeight: 24,
  },
  consumerName: {
    color: COLORS.text,
    flex: 1,
    fontSize: 13,
    fontWeight: "800",
  },
  cardActions: { alignItems: "center", flexDirection: "row", gap: 5 },
  viewButton: {
    alignItems: "center",
    backgroundColor: COLORS.blueSoft,
    borderRadius: 7,
    justifyContent: "center",
    minHeight: 25,
    paddingHorizontal: 8,
  },
  viewButtonText: { color: COLORS.blue, fontSize: 10, fontWeight: "800" },
  holdIconButton: {
    alignItems: "center",
    justifyContent: "center",
    height: 36,
    width: 32,
  },
  disabledButton: { opacity: 0.65 },
  serviceTypeLine: {
    alignItems: "center",
    flexDirection: "row",
    gap: 7,
    minHeight: 19,
  },
  serviceTypeBadge: {
    borderRadius: 6,
    maxWidth: "82%",
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  serviceTypeText: { fontSize: 10, fontWeight: "700" },
  onHoldLabel: { color: COLORS.red, fontSize: 8, fontWeight: "900" },
  permanentOnHoldLabel: { color: COLORS.purple },
  technicianLine: {
    alignItems: "center",
    flexDirection: "row",
    gap: 5,
    minHeight: 18,
  },
  technicianName: {
    color: COLORS.muted,
    flex: 1,
    fontSize: 10,
    fontWeight: "600",
  },
  cardBottomLine: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 19,
  },
  visitDate: { color: COLORS.muted, flex: 1, fontSize: 10, fontWeight: "600" },
  carriedForwardDate: { color: COLORS.amber, fontWeight: "800" },
  statusBadge: { borderRadius: 9, paddingHorizontal: 7, paddingVertical: 2 },
  completedStatus: { backgroundColor: COLORS.greenSoft },
  pendingStatus: { backgroundColor: COLORS.amberSoft },
  statusText: { fontSize: 9, fontWeight: "800" },
  completedStatusText: { color: COLORS.green },
  pendingStatusText: { color: COLORS.amber },
  loadingState: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 48,
  },
  emptyState: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 25,
  },
  emptyIcon: {
    alignItems: "center",
    backgroundColor: "#EAF2F5",
    borderRadius: 25,
    height: 50,
    justifyContent: "center",
    marginBottom: 13,
    width: 50,
  },
  emptyTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "800",
    textAlign: "center",
  },
  emptyDescription: {
    color: COLORS.muted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 5,
    textAlign: "center",
  },
  modalBackdrop: {
    alignItems: "center",
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    flex: 1,
    justifyContent: "center",
    padding: 20,
  },
  calendarModal: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    maxWidth: 390,
    padding: 18,
    width: "100%",
  },
  detailsModal: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    maxHeight: "85%",
    maxWidth: 420,
    padding: 18,
    width: "100%",
  },
  detailsScroll: { flexShrink: 1 },
  detailsScrollContent: { paddingBottom: 4 },
  detailsLoading: {
    alignItems: "center",
    gap: 10,
    paddingVertical: 36,
  },
  detailsError: {
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 8,
    paddingVertical: 28,
  },
  detailsErrorText: {
    color: COLORS.red,
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
  },
  detailsRetryButton: {
    backgroundColor: COLORS.brand,
    borderRadius: 9,
    marginTop: 2,
    paddingHorizontal: 15,
    paddingVertical: 9,
  },
  detailsRetryText: { color: COLORS.surface, fontSize: 12, fontWeight: "800" },
  calendarHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  modalTitle: { color: COLORS.text, fontSize: 18, fontWeight: "800" },
  monthHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 17,
  },
  monthArrow: {
    alignItems: "center",
    borderRadius: 10,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  monthLabel: { color: COLORS.text, fontSize: 15, fontWeight: "800" },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 8,
  },
  weekday: {
    color: COLORS.faint,
    fontSize: 11,
    fontWeight: "800",
    height: 34,
    lineHeight: 34,
    textAlign: "center",
    width: "14.2857%",
  },
  calendarDayCell: {
    alignItems: "center",
    height: 42,
    justifyContent: "center",
    width: "14.2857%",
  },
  selectedCalendarDay: {
    alignSelf: "center",
    backgroundColor: COLORS.brand,
    borderRadius: 21,
    height: 34,
  },
  calendarDayText: { color: COLORS.text, fontSize: 13, fontWeight: "600" },
  selectedCalendarDayText: { color: COLORS.surface, fontWeight: "800" },
  todayButton: {
    alignItems: "center",
    backgroundColor: COLORS.blueSoft,
    borderRadius: 10,
    marginTop: 12,
    paddingVertical: 10,
  },
  todayButtonText: { color: COLORS.blue, fontSize: 12, fontWeight: "800" },
  detailConsumerName: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 12,
    marginTop: 14,
  },
  detailRow: {
    borderTopColor: COLORS.border,
    borderTopWidth: 1,
    gap: 12,
    paddingVertical: 11,
  },
  detailLabel: { color: COLORS.muted, fontSize: 11, fontWeight: "700" },
  detailValue: { color: COLORS.text, fontSize: 13, fontWeight: "600" },
  responseSection: {
    backgroundColor: "#F4F8FA",
    borderRadius: 11,
    marginBottom: 14,
    marginTop: 8,
    padding: 12,
  },
  responseSectionTitle: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 8,
  },
  responseText: {
    color: COLORS.muted,
    fontSize: 13,
    lineHeight: 19,
  },
  photoRow: { flexDirection: "row", gap: 10, marginTop: 4 },
  photoTile: { flex: 1, minWidth: 0, position: "relative" },
  sitePhoto: {
    backgroundColor: COLORS.page,
    borderRadius: 10,
    height: 140,
    width: "100%",
  },
  photoExpandIcon: {
    alignItems: "center",
    backgroundColor: "rgba(16, 42, 67, 0.78)",
    borderRadius: 14,
    height: 28,
    justifyContent: "center",
    position: "absolute",
    right: 8,
    top: 8,
    width: 28,
  },
  photoLabel: {
    color: COLORS.muted,
    fontSize: 11,
    fontWeight: "700",
    marginTop: 6,
    textAlign: "center",
  },
  photoViewer: {
    backgroundColor: "#0B1220",
    flex: 1,
    paddingBottom: 24,
    paddingHorizontal: 18,
    paddingTop: 52,
  },
  photoViewerHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  photoViewerEyebrow: {
    color: "#A8B5C7",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.2,
  },
  photoViewerTitle: {
    color: COLORS.surface,
    fontSize: 20,
    fontWeight: "800",
    marginTop: 3,
  },
  photoViewerClose: {
    alignItems: "center",
    backgroundColor: "#FFFFFFE6",
    borderRadius: 22,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  photoViewerImage: {
    flex: 1,
    width: "100%",
  },
  photoViewerHint: {
    color: "#A8B5C7",
    fontSize: 11,
    marginTop: 14,
    textAlign: "center",
  },
  noPhotosText: {
    color: COLORS.muted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 2,
  },
});

export default Dashboard;
