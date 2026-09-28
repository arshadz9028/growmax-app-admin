/* eslint-disable react-hooks/set-state-in-effect */

import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { getApiUrl, safeFetch } from "../../constants/api";
import { Fonts, Tokens } from "../../constants/theme";

const WEEK_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const MAX_VISITS = 15;
const MAX_SECOND_VISIT_MONTHS = 3;
const MAX_VISITS_PER_DATE = 5;

const CALENDAR_API = "/api/visit-calendar";
const UPDATE_VISIT_API = "/api/admin/modify-visit";

/*
 * -------------------------------------------------------
 * DATE HELPERS
 * -------------------------------------------------------
 */

function formatDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDateKeyUtc(date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getDateKeyFromString(value) {
  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  const dateMatch = trimmed.match(/^(\d{4}-\d{2}-\d{2})/);
  if (dateMatch) {
    return dateMatch[1];
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

  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0)).toISOString();
}

// MongoDB returns visit dates as ISO strings, Date objects, or Extended JSON.
// When the input is a raw ISO timestamp or Date object, read it with UTC
// getters so the calendar day that was stored matches what is displayed.
function dateKeyFromValue(value) {
  if (!value) return null;

  if (typeof value === "string") {
    const trimmed = value.trim();
    const dateKey = getDateKeyFromString(trimmed);
    if (dateKey) return dateKey;

    const parsed = new Date(trimmed);
    return Number.isNaN(parsed.getTime()) ? null : formatDateKeyUtc(parsed);
  }

  if (typeof value === "object") {
    if (value instanceof Date) return formatDateKeyUtc(value);
    return dateKeyFromValue(value.$date || value.date || value.value);
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : formatDateKeyUtc(date);
}

function normaliseVisits(visits) {
  if (!Array.isArray(visits)) return [];

  const uniqueByDate = new Map();

  visits.forEach((visit, index) => {
    const date = dateKeyFromValue(visit?.date || visit);
    if (!date || uniqueByDate.has(date)) return;

    uniqueByDate.set(
      date,
      typeof visit === "object"
        ? { ...visit, date, __visitIndex: visit.__visitIndex ?? index }
        : { date, status: "Pending" },
    );
  });

  return [...uniqueByDate.values()];
}

function visitsSignature(visits) {
  return normaliseVisits(visits)
    .map((visit) => `${visit._id || visit.id || ""}:${visit.date}`)
    .join("|");
}

function formatDisplayDate(value) {
  if (!value) {
    return "";
  }

  const dateKey = dateKeyFromValue(value);
  if (!dateKey) return "";

  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getMonthKey(date) {
  const year = date.getFullYear();

  const month = String(date.getMonth() + 1).padStart(2, "0");

  return `${year}-${month}`;
}

function getMonthCalendar(year, month) {
  const firstDayOfMonth = new Date(year, month, 1);

  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const leadingBlankDays = firstDayOfMonth.getDay();

  const totalCells = Math.ceil((leadingBlankDays + daysInMonth) / 7) * 7;

  const cells = [];

  for (let index = 0; index < totalCells; index += 1) {
    const dayNumber = index - leadingBlankDays + 1;

    const date = new Date(year, month, dayNumber);

    if (dayNumber < 1 || dayNumber > daysInMonth) {
      cells.push(null);
    } else {
      cells.push(date);
    }
  }

  return cells;
}

/*
 * -------------------------------------------------------
 * COMPONENT
 * -------------------------------------------------------
 */

function CalenderVisit({
  previousData,
  compact = false,
  onDataChange,
  onModify,
  onServerChange,
  requestId,
  updateEndpoint = UPDATE_VISIT_API,
  resetKey = 0,
  serviceTitle = "GROW Cleaning Application",
  submitLabel = "Modify",
  showSubmitButton = true,
}) {
  const [selectedVisits, setSelectedVisits] = useState(() =>
    normaliseVisits(previousData?.selectedVisits),
  );
  // React state updates on the next render. This ref is updated immediately so
  // deselecting a date and choosing its replacement cannot use a stale count.
  const selectedVisitsRef = useRef(
    normaliseVisits(previousData?.selectedVisits),
  );
  const [originalVisits, setOriginalVisits] = useState(() =>
    normaliseVisits(previousData?.selectedVisits),
  );
  const [isSaving, setIsSaving] = useState(false);

  const safeSelectedVisits = useMemo(
    () => normaliseVisits(selectedVisits),
    [selectedVisits],
  );

  /*
   * Calendar availability:
   *
   * {
   *   "2026-08-21": {
   *      date: "2026-08-21",
   *      holiday: false,
   *      holidayName: "",
   *      maxVisits: 5,
   *      bookedVisits: 2,
   *      remainingVisits: 3,
   *      available: true
   *   }
   * }
   */
  const [calendarAvailability, setCalendarAvailability] = useState({});

  const [calendarLoading, setCalendarLoading] = useState(false);

  const [calendarError, setCalendarError] = useState("");
  const availabilityCache = useRef(new Map());
  const loadRequestId = useRef(0);
  const lastResetKey = useRef(resetKey);
  const lastExternalSource = useRef(null);
  const lastEmittedSignature = useRef(null);
  const lastAppliedSignature = useRef(null);

  const replaceSelectedVisits = useCallback(
    (nextVisits) => {
      const normalised = normaliseVisits(nextVisits);
      selectedVisitsRef.current = normalised;
      setSelectedVisits(normalised);
      lastEmittedSignature.current = visitsSignature(normalised);
      onDataChange?.({ selectedVisits: normalised });
      return normalised;
    },
    [onDataChange],
  );

  const getApplicationId = useCallback(
    () =>
      String(
        requestId ||
          previousData?.requestId ||
          previousData?._id ||
          previousData?.id ||
          previousData?.applicationId ||
          previousData?.serviceId ||
          "",
      ).trim(),
    [previousData, requestId],
  );

  /*
   * -------------------------------------------------------
   * TODAY / MONTH RANGE
   * -------------------------------------------------------
   */

  const today = useMemo(() => {
    const date = new Date();

    date.setHours(0, 0, 0, 0);

    return date;
  }, []);

  const [currentMonth, setCurrentMonth] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1),
  );

  const minMonth = useMemo(
    () => new Date(today.getFullYear(), today.getMonth(), 1),
    [today],
  );

  const maxMonth = useMemo(
    () => new Date(today.getFullYear(), today.getMonth() + 12, 1),
    [today],
  );

  const maxDate = useMemo(
    () => new Date(today.getFullYear() + 1, today.getMonth(), today.getDate()),
    [today],
  );

  /*
   * -------------------------------------------------------
   * SYNC PREVIOUS DATA
   * -------------------------------------------------------
   */

  const externalSourceKey = String(
    requestId ||
      previousData?._id ||
      previousData?.id ||
      previousData?.applicationId ||
      "",
  );

  useEffect(() => {
    const didReset = lastResetKey.current !== resetKey;
    const didChangeApplication =
      lastExternalSource.current !== externalSourceKey;
    const nextSelectedVisits = normaliseVisits(previousData?.selectedVisits);
    const incomingSignature = visitsSignature(nextSelectedVisits);

    // `onDataChange` commonly makes the parent create a new previousData
    // object. That is an edit echo, not a new application; resetting from it
    // lost the pending changes and jumped to the first remaining month.
    if (
      !didReset &&
      !didChangeApplication &&
      lastExternalSource.current !== null &&
      (lastEmittedSignature.current === incomingSignature ||
        lastAppliedSignature.current === incomingSignature)
    ) {
      return;
    }

    lastResetKey.current = resetKey;
    lastExternalSource.current = externalSourceKey;
    lastAppliedSignature.current = incomingSignature;
    selectedVisitsRef.current = nextSelectedVisits;
    setSelectedVisits(nextSelectedVisits);
    setOriginalVisits(nextSelectedVisits);

    const firstDateKey = nextSelectedVisits[0]?.date;
    if (firstDateKey) {
      const [year, month] = firstDateKey.slice(0, 7).split("-").map(Number);
      setCurrentMonth(new Date(year, month - 1, 1));
    } else if (didReset) {
      setCurrentMonth(new Date(today.getFullYear(), today.getMonth(), 1));
    }
  }, [externalSourceKey, previousData?.selectedVisits, resetKey, today]);

  /*
   * -------------------------------------------------------
   * CURRENT MONTH
   * -------------------------------------------------------
   */

  const monthLabel = useMemo(
    () =>
      currentMonth.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      }),
    [currentMonth],
  );

  const currentMonthKey = useMemo(
    () => getMonthKey(currentMonth),
    [currentMonth],
  );

  /*
   * -------------------------------------------------------
   * LOAD BACKEND CALENDAR
   * -------------------------------------------------------
   */

  const loadCalendarAvailability = useCallback(
    async (monthKey, { force = false } = {}) => {
      const cached = availabilityCache.current.get(monthKey);
      if (cached && !force) {
        // Invalidate an in-flight request for a previously visible month.
        loadRequestId.current += 1;
        setCalendarAvailability(cached);
        return cached;
      }

      const currentRequestId = ++loadRequestId.current;
      try {
        setCalendarLoading(true);
        setCalendarError("");

        const response = await safeFetch(
          getApiUrl(`${CALENDAR_API}?month=${encodeURIComponent(monthKey)}`),
        );

        const payload = await response.json().catch(() => null);
        if (!response.ok || !payload?.success) {
          throw new Error(
            payload?.message || "Unable to load calendar availability.",
          );
        }

        const availabilityMap = Object.fromEntries(
          (Array.isArray(payload.availability) ? payload.availability : []).map(
            (item) => [item.date, item],
          ),
        );

        availabilityCache.current.set(monthKey, availabilityMap);
        // Ignore slow responses for a month the user has already left.
        if (currentRequestId === loadRequestId.current) {
          setCalendarAvailability(availabilityMap);
        }
        return availabilityMap;
      } catch (error) {
        console.error("Calendar availability error:", error);

        if (currentRequestId === loadRequestId.current) {
          setCalendarError(
            error?.message || "Unable to load calendar availability.",
          );
        }
        throw error;
      } finally {
        if (currentRequestId === loadRequestId.current)
          setCalendarLoading(false);
      }
    },
    [],
  );

  /*
   * Load whenever user moves to a different month.
   */
  useEffect(() => {
    loadCalendarAvailability(currentMonthKey).catch(() => {});
  }, [currentMonthKey, loadCalendarAvailability]);

  /*
   * -------------------------------------------------------
   * MONTH NAVIGATION RULES
   * -------------------------------------------------------
   */

  const canGoToPreviousMonth =
    currentMonth.getFullYear() > minMonth.getFullYear() ||
    (currentMonth.getFullYear() === minMonth.getFullYear() &&
      currentMonth.getMonth() > minMonth.getMonth());

  const canGoToNextMonth = currentMonth.getTime() < maxMonth.getTime();

  /*
   * -------------------------------------------------------
   * CALENDAR CELLS
   * -------------------------------------------------------
   */

  const calendarCells = useMemo(() => {
    const year = currentMonth.getFullYear();

    const month = currentMonth.getMonth();

    return getMonthCalendar(year, month);
  }, [currentMonth]);

  /*
   * -------------------------------------------------------
   * SWIPE
   * -------------------------------------------------------
   */

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) =>
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy) &&
          Math.abs(gestureState.dx) > 30,

        onPanResponderRelease: (_, gestureState) => {
          if (gestureState.dx < -50 && canGoToNextMonth) {
            setCurrentMonth(
              (prevMonth) =>
                new Date(prevMonth.getFullYear(), prevMonth.getMonth() + 1, 1),
            );
          } else if (gestureState.dx > 50 && canGoToPreviousMonth) {
            setCurrentMonth(
              (prevMonth) =>
                new Date(prevMonth.getFullYear(), prevMonth.getMonth() - 1, 1),
            );
          }
        },
      }),
    [canGoToNextMonth, canGoToPreviousMonth],
  );

  /*
   * -------------------------------------------------------
   * CHECK DATE CAPACITY
   * -------------------------------------------------------
   */

  const checkDateAvailability = async (dateKey) => {
    try {
      /*
       * Fetch the month again so that
       * we don't rely on stale 4/5 data.
       */
      const monthKey = dateKey.slice(0, 7);

      const response = await safeFetch(
        getApiUrl(`${CALENDAR_API}?month=${encodeURIComponent(monthKey)}`),
      );

      const payload = await response.json().catch(() => null);
      // console.log("Check date availability payload:", payload);
      if (!response.ok || !payload?.success) {
        throw new Error(
          payload?.message || "Unable to check date availability.",
        );
      }

      const availabilityMap = Object.fromEntries(
        (Array.isArray(payload.availability) ? payload.availability : []).map(
          (item) => [item.date, item],
        ),
      );

      /*
       * Update local calendar state
       * with fresh server data.
       */
      setCalendarAvailability((current) => ({
        ...current,
        ...availabilityMap,
      }));
      availabilityCache.current.set(monthKey, availabilityMap);

      return availabilityMap[dateKey] || null;
    } catch (error) {
      console.error("Failed to check date availability:", error);

      /*
       * Don't silently allow a booking
       * if the availability API fails.
       */
      throw error;
    }
  };

  /*
   * -------------------------------------------------------
   * TOGGLE VISIT
   * -------------------------------------------------------
   */

  const toggleVisit = async (date) => {
    const dateKey = formatDateKey(date);
    // Always read the ref: it includes an unselect action performed just before
    // this press, even if React has not rendered the state update yet.
    const safeSelectedVisitsForToggle = normaliseVisits(
      selectedVisitsRef.current,
    );

    const isAlreadySelected = safeSelectedVisitsForToggle.some(
      (visit) => visit?.date === dateKey,
    );

    /*
     * -----------------------------------------------------
     * REMOVE EXISTING DATE
     * -----------------------------------------------------
     */

    if (isAlreadySelected) {
      const existingVisit = safeSelectedVisitsForToggle.find(
        (visit) => visit?.date === dateKey,
      );
      const applicationId = getApplicationId();

      // Remove persisted visits on the server first. The visit-calendar API
      // then sees the freed slot before the admin chooses its replacement.
      if (existingVisit?.__visitIndex != null && applicationId) {
        Alert.alert(
          "Remove visit date?",
          `Remove ${formatDisplayDate(dateKey)} and free its calendar slot?`,
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Remove",
              style: "destructive",
              onPress: async () => {
                try {
                  const response = await safeFetch(getApiUrl(updateEndpoint), {
                    method: "DELETE",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      requestId: applicationId,
                      visitIndex: existingVisit.__visitIndex,
                    }),
                  });
                  const payload = await response.json().catch(() => null);
                  if (!response.ok || !payload?.success) {
                    throw new Error(
                      payload?.message || "Unable to remove visit date.",
                    );
                  }

                  const removeAndReindex = (visits) =>
                    normaliseVisits(visits)
                      .filter((visit) => visit.date !== dateKey)
                      .map((visit) => ({
                        ...visit,
                        __visitIndex:
                          visit.__visitIndex > existingVisit.__visitIndex
                            ? visit.__visitIndex - 1
                            : visit.__visitIndex,
                      }));
                  const nextVisits = removeAndReindex(
                    selectedVisitsRef.current,
                  );
                  replaceSelectedVisits(nextVisits);
                  setOriginalVisits((current) => removeAndReindex(current));
                  setCurrentMonth(
                    new Date(date.getFullYear(), date.getMonth(), 1),
                  );
                  await loadCalendarAvailability(getMonthKey(date), {
                    force: true,
                  });
                  // Notify the parent immediately so the Active Services card
                  // re-fetches the application instead of displaying stale data
                  // until the app restarts.
                  await onServerChange?.({
                    type: "delete",
                    requestId: applicationId,
                    visitIndex: existingVisit.__visitIndex,
                    selectedVisits: nextVisits,
                    response: payload,
                  });
                } catch (error) {
                  Alert.alert(
                    "Removal failed",
                    error?.message || "Please try again.",
                  );
                }
              },
            },
          ],
        );
        return;
      }

      const nextVisits = safeSelectedVisitsForToggle.filter(
        (visit) => visit?.date !== dateKey,
      );

      setCurrentMonth(new Date(date.getFullYear(), date.getMonth(), 1));
      replaceSelectedVisits(nextVisits);

      return;
    }

    /*
     * -----------------------------------------------------
     * GENERAL LOCAL DATE CHECKS
     * -----------------------------------------------------
     */

    const disabled = isDateDisabled(date);

    if (disabled) {
      const availability = calendarAvailability[dateKey];

      if (availability?.holiday) {
        Alert.alert(
          "Holiday",
          availability.holidayName
            ? `${availability.holidayName} is not available for visits.`
            : "This date is a holiday and is not available for visits.",
        );
      } else if (
        availability &&
        availability.bookedVisits >= availability.maxVisits
      ) {
        Alert.alert(
          "Date fully booked",
          `This date already has ${availability.maxVisits} scheduled visits. Please choose another date.`,
        );
      }

      return;
    }

    /*
     * -----------------------------------------------------
     * MAX TOTAL VISITS
     * -----------------------------------------------------
     */

    if (safeSelectedVisitsForToggle.length >= MAX_VISITS) {
      Alert.alert(
        "Limit reached",
        `You can choose up to ${MAX_VISITS} visits in the next 12 months.`,
      );

      return;
    }

    /*
     * -----------------------------------------------------
     * MONTHLY LIMIT
     * -----------------------------------------------------
     */

    const monthKey = getMonthKey(date);

    const monthVisitCounts = safeSelectedVisitsForToggle.reduce(
      (accumulator, visit) => {
        const visitMonthKey = dateKeyFromValue(visit?.date)?.slice(0, 7);
        if (!visitMonthKey) return accumulator;

        accumulator[visitMonthKey] = (accumulator[visitMonthKey] || 0) + 1;

        return accumulator;
      },
      {},
    );

    const monthVisitCount = monthVisitCounts[monthKey] || 0;

    if (monthVisitCount >= 2) {
      Alert.alert(
        "Month limit reached",
        "This month already has two visits selected.",
      );

      return;
    }

    /*
     * -----------------------------------------------------
     * SECOND VISIT MONTH LIMIT
     * -----------------------------------------------------
     */

    if (monthVisitCount === 1) {
      // Count only *other* full months. The target month currently has one
      // visit, and adding this date will make it the next second-visit month.
      // This is crucial when a user removes and replaces a second visit.
      const otherMonthsAtTwoVisits = Object.entries(monthVisitCounts).filter(
        ([existingMonthKey, count]) =>
          existingMonthKey !== monthKey && Number(count) >= 2,
      ).length;

      if (otherMonthsAtTwoVisits >= MAX_SECOND_VISIT_MONTHS) {
        Alert.alert(
          "Second visit limit reached",
          `You can add a second visit in up to ${MAX_SECOND_VISIT_MONTHS} months only.`,
        );

        return;
      }
    }

    /*
     * -----------------------------------------------------
     * FRESH SERVER CAPACITY CHECK
     * -----------------------------------------------------
     */

    try {
      const availability = await checkDateAvailability(dateKey);

      if (!availability) {
        Alert.alert(
          "Availability unavailable",
          "We could not verify this date. Please try again.",
        );

        return;
      }

      /*
       * Holiday
       */
      if (availability.holiday) {
        Alert.alert(
          "Holiday",
          availability.holidayName
            ? `${availability.holidayName} is not available for visits.`
            : "This date is not available for visits.",
        );

        return;
      }

      /*
       * Full
       */
      if (
        Number(availability.bookedVisits) >=
        Number(availability.maxVisits || MAX_VISITS_PER_DATE)
      ) {
        Alert.alert(
          "Date fully booked",
          `This date already has ${availability.maxVisits || MAX_VISITS_PER_DATE} scheduled visits. Please choose another date.`,
        );

        return;
      }
    } catch (error) {
      Alert.alert(
        "Unable to check availability",
        error?.message || "Please check your connection and try again.",
      );

      return;
    }

    /*
     * -----------------------------------------------------
     * ADD DATE
     * -----------------------------------------------------
     */

    const nextVisits = [
      ...safeSelectedVisitsForToggle,
      {
        date: dateKey,
        status: "Pending",
      },
    ].sort((a, b) =>
      String(a?.date || "").localeCompare(String(b?.date || "")),
    );

    replaceSelectedVisits(nextVisits);
  };

  /*
   * -------------------------------------------------------
   * DATE DISABLED
   * -------------------------------------------------------
   */

  const isDateDisabled = (date) => {
    const dateKey = formatDateKey(date);

    const isPastDate = date < today;

    const isAfterAllowedRange = date > maxDate;

    const isFriday = date.getDay() === 5;

    const availability = calendarAvailability[dateKey];

    const isHoliday = availability?.holiday === true;

    const isFullyBooked =
      availability &&
      Number(availability.bookedVisits) >=
        Number(availability.maxVisits || MAX_VISITS_PER_DATE);

    return (
      isPastDate ||
      isAfterAllowedRange ||
      isFriday ||
      isHoliday ||
      isFullyBooked
    );
  };

  /*
   * -------------------------------------------------------
   * VISIBLE MONTH CHECK
   * -------------------------------------------------------
   */

  const isMonthWithinVisibleRange = (date) => {
    const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);

    return monthStart >= minMonth && monthStart <= maxMonth;
  };

  /*
   * -------------------------------------------------------
   * RENDER DAY
   * -------------------------------------------------------
   */

  const jumpToDateMonth = (dateString) => {
    const dateKey = dateKeyFromValue(dateString);
    if (!dateKey) return;
    const [year, month] = dateKey.slice(0, 7).split("-").map(Number);
    setCurrentMonth(new Date(year, month - 1, 1));
  };

  const handleModifyPress = async () => {
    try {
      setIsSaving(true);
      const applicationId = String(
        requestId ||
          previousData?.requestId ||
          previousData?._id ||
          previousData?.id ||
          previousData?.applicationId ||
          previousData?.serviceId ||
          "",
      ).trim();

      const normalisedOriginalVisits = normaliseVisits(originalVisits);
      const originalDateKeys = new Set(
        normalisedOriginalVisits.map((visit) => visit.date),
      );
      const selectedDateKeys = new Set(
        safeSelectedVisits.map((visit) => visit.date),
      );

      const addedVisits = safeSelectedVisits.filter(
        (visit) => !originalDateKeys.has(visit.date),
      );
      const removedVisits = normalisedOriginalVisits.filter(
        (visit) => !selectedDateKeys.has(visit.date),
      );

      if (addedVisits.length === 0 && removedVisits.length === 0) {
        Alert.alert("No changes", "No visit dates were added or removed.");
        return;
      }

      if (!applicationId) {
        throw new Error(
          "The application ID is required to save visit-date changes.",
        );
      }

      let lastDeletePayload = null;

      if (removedVisits.length > 0) {
        const originalByDate = new Map(
          normalisedOriginalVisits.map((visit, idx) => [visit.date, idx]),
        );

        const sortedForDelete = [...removedVisits]
          .map((removedVisit) => {
            const visitIndex =
              removedVisit.__visitIndex != null
                ? removedVisit.__visitIndex
                : originalByDate.get(removedVisit.date);
            return { removedVisit, visitIndex };
          })
          .filter((item) => item.visitIndex != null)
          .sort((a, b) => Number(b.visitIndex) - Number(a.visitIndex));

        for (const { removedVisit, visitIndex } of sortedForDelete) {
          const deleteResponse = await safeFetch(getApiUrl(updateEndpoint), {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              requestId: applicationId,
              visitIndex: Number(visitIndex),
            }),
          });
          const deletePayload = await deleteResponse.json().catch(() => null);
          if (!deleteResponse.ok || !deletePayload?.success) {
            throw new Error(
              deletePayload?.message ||
                `Unable to remove visit ${formatDisplayDate(removedVisit.date)}.`,
            );
          }
          lastDeletePayload = deletePayload;
        }
      }

      let addPayload = { success: true };
      if (addedVisits.length > 0) {
        const addResponse = await safeFetch(getApiUrl(updateEndpoint), {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            requestId: applicationId,
            additions: addedVisits.map((visit) => ({
              date: toUtcMiddayIso(visit.date) || visit.date,
              status: visit.status || "Pending",
            })),
          }),
        });
        addPayload = await addResponse.json().catch(() => null);
        if (!addResponse.ok || !addPayload?.success) {
          throw new Error(
            addPayload?.message || "Unable to add new visit dates.",
          );
        }
      }

      const savedVisits = safeSelectedVisits.map((visit, index) => ({
        ...visit,
        __visitIndex: index,
      }));
      setOriginalVisits(savedVisits);
      selectedVisitsRef.current = savedVisits;
      setSelectedVisits(savedVisits);
      const changedMonths = [
        ...new Set([
          ...addedVisits.map((visit) => visit.date.slice(0, 7)),
          ...removedVisits.map((visit) => visit.date.slice(0, 7)),
        ]),
      ];
      await Promise.all(
        changedMonths.map((monthKey) =>
          loadCalendarAvailability(monthKey, { force: true }),
        ),
      );
      await onServerChange?.({
        type:
          addedVisits.length > 0 && removedVisits.length > 0
            ? "replace"
            : removedVisits.length > 0
              ? "delete"
              : "add",
        requestId: applicationId,
        additions: addedVisits,
        removals: removedVisits,
        selectedVisits: savedVisits,
        response: lastDeletePayload || addPayload,
      });
      await onModify?.({
        requestId: applicationId,
        additions: addedVisits,
        removals: removedVisits,
        selectedVisits: savedVisits,
        response: lastDeletePayload || addPayload,
      });

      const messages = [];
      if (addedVisits.length > 0) {
        messages.push(`${addedVisits.length} added`);
      }
      if (removedVisits.length > 0) {
        messages.push(`${removedVisits.length} removed`);
      }
      Alert.alert(
        "Updated",
        `${messages.join(", ")} visit dates successfully.`,
      );
    } catch (error) {
      Alert.alert(
        "Update failed",
        error?.message || "Unable to update visit dates.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const renderDayCell = (date, index) => {
    if (!date) {
      return <View key={`empty-${index}`} style={styles.emptyDay} />;
    }

    if (!isMonthWithinVisibleRange(date)) {
      return <View key={formatDateKey(date)} style={styles.emptyDay} />;
    }

    const dateKey = formatDateKey(date);

    const availability = calendarAvailability[dateKey];

    const isSelected = safeSelectedVisits.some(
      (visit) => visit?.date === dateKey,
    );

    const disabled = isDateDisabled(date);

    const isFull =
      availability &&
      Number(availability.bookedVisits) >=
        Number(availability.maxVisits || MAX_VISITS_PER_DATE);

    const isHoliday = availability?.holiday === true;

    const isAvailable = Boolean(availability) && !isHoliday && !isFull;

    return (
      <TouchableOpacity
        key={dateKey}
        style={[
          styles.dayCell,

          isAvailable && styles.dayCellAvailable,

          isHoliday && styles.dayCellHoliday,

          isFull && styles.dayCellFull,

          isSelected && styles.dayCellSelected,

          disabled && styles.dayCellDisabled,
        ]}
        onPress={() => {
          if (!disabled) {
            toggleVisit(date);
          } else {
            /*
             * Give useful feedback for
             * capacity/holiday dates.
             */
            if (isFull) {
              Alert.alert(
                "Date fully booked",
                `This date already has ${
                  availability?.maxVisits || MAX_VISITS_PER_DATE
                } scheduled visits.`,
              );
            } else if (isHoliday) {
              Alert.alert(
                "Holiday",
                availability?.holidayName
                  ? `${availability.holidayName} is not available for visits.`
                  : "This date is a holiday.",
              );
            }
          }
        }}
        activeOpacity={0.8}
      >
        <Text style={[styles.dayText, isSelected && styles.dayTextSelected]}>
          {date.getDate()}
        </Text>

        {isFull && !isSelected ? (
          <Text style={styles.capacityText}>Full</Text>
        ) : null}
      </TouchableOpacity>
    );
  };

  /*
   * -------------------------------------------------------
   * CONTENT
   * -------------------------------------------------------
   */

  const content = (
    <View
      {...panResponder.panHandlers}
      style={compact ? styles.compactSection : styles.section}
    >
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.sectionTitle}>Visit Schedule</Text>

          <Text style={styles.sectionSubtitle}>
            Pick visit dates with a maximum of {MAX_VISITS_PER_DATE} visits per
            date.
          </Text>
        </View>

        <View style={styles.countBadge}>
          <Text style={styles.countText}>
            {safeSelectedVisits.length}/{MAX_VISITS}
          </Text>
        </View>
      </View>

      <View style={styles.monthSwitcher}>
        <TouchableOpacity
          style={[
            styles.navButton,

            !canGoToPreviousMonth && styles.navButtonDisabled,
          ]}
          onPress={() => {
            if (!canGoToPreviousMonth) {
              return;
            }

            setCurrentMonth(
              new Date(
                currentMonth.getFullYear(),
                currentMonth.getMonth() - 1,
                1,
              ),
            );
          }}
          activeOpacity={0.8}
          disabled={!canGoToPreviousMonth}
        >
          <Ionicons name="chevron-back" size={18} color={Tokens.primary} />
        </TouchableOpacity>

        <View style={styles.monthLabelContainer}>
          <Text style={styles.monthLabel}>{monthLabel}</Text>

          {calendarLoading ? (
            <ActivityIndicator
              size="small"
              color={Tokens.primary}
              style={styles.calendarSpinner}
            />
          ) : null}
        </View>

        <TouchableOpacity
          style={[
            styles.navButton,

            !canGoToNextMonth && styles.navButtonDisabled,
          ]}
          onPress={() => {
            if (!canGoToNextMonth) {
              return;
            }

            setCurrentMonth(
              new Date(
                currentMonth.getFullYear(),
                currentMonth.getMonth() + 1,
                1,
              ),
            );
          }}
          activeOpacity={0.8}
          disabled={!canGoToNextMonth}
        >
          <Ionicons name="chevron-forward" size={18} color={Tokens.primary} />
        </TouchableOpacity>
      </View>

      {calendarError ? (
        <View style={styles.calendarError}>
          <Ionicons name="cloud-offline-outline" size={15} color="#b45309" />

          <Text style={styles.calendarErrorText}>
            Calendar availability could not be loaded. Please try again.
          </Text>

          <TouchableOpacity
            onPress={() => loadCalendarAvailability(currentMonthKey)}
          >
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <View style={styles.weekHeader}>
        {WEEK_DAYS.map((day) => (
          <Text key={day} style={styles.weekDayText}>
            {day}
          </Text>
        ))}
      </View>

      <View style={styles.calendarGrid}>
        {calendarCells.map((date, index) => renderDayCell(date, index))}
      </View>

      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, styles.legendAvailable]} />

          <Text style={styles.legendText}>Available</Text>
        </View>

        <View style={styles.legendItem}>
          <View style={[styles.legendDot, styles.legendFull]} />

          <Text style={styles.legendText}>Full</Text>
        </View>

        <View style={styles.legendItem}>
          <View style={[styles.legendDot, styles.legendHoliday]} />

          <Text style={styles.legendText}>Holiday</Text>
        </View>
      </View>

      <View style={styles.selectedList}>
        {safeSelectedVisits.length === 0 ? (
          <Text style={styles.helperText}>No visit dates selected yet.</Text>
        ) : (
          safeSelectedVisits.map((visit, index) => {
            const visitDateKey = visit?.date || visit?.value || "";

            if (!visitDateKey) {
              return null;
            }

            return (
              <TouchableOpacity
                key={`${visitDateKey}-${index}`}
                style={styles.selectedChip}
                onPress={() => {
                  const [year, month, day] = visitDateKey
                    .split("-")
                    .map(Number);
                  const selectedDate = new Date(year, month - 1, day);
                  jumpToDateMonth(visitDateKey);
                  toggleVisit(selectedDate);
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.selectedChipText}>
                  {formatDisplayDate(visitDateKey)}
                </Text>
                <Ionicons name="close" size={14} color={Tokens.primary} />
              </TouchableOpacity>
            );
          })
        )}
      </View>

      {showSubmitButton ? (
        <TouchableOpacity
          style={[styles.modifyButton, isSaving && styles.modifyButtonDisabled]}
          onPress={handleModifyPress}
          disabled={isSaving}
          activeOpacity={0.8}
        >
          {isSaving ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.modifyButtonText}>{submitLabel}</Text>
          )}
        </TouchableOpacity>
      ) : null}

      <Text style={styles.hintText}>
        Select at least one visit for every month in the next 12 months. You can
        add a second visit in up to {MAX_SECOND_VISIT_MONTHS} months. Each date
        has a maximum of {MAX_VISITS_PER_DATE} visits.
      </Text>
    </View>
  );

  /*
   * -------------------------------------------------------
   * RETURN
   * -------------------------------------------------------
   */

  if (compact) {
    return <View style={styles.compactCard}>{content}</View>;
  }

  return <View style={styles.card}>{content}</View>;
}

const styles = StyleSheet.create({
  compactCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },

  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 10,
    marginBottom: 12,
  },

  compactSection: {
    gap: 8,
  },

  section: {
    gap: 8,
  },

  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 0,
  },

  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: Tokens.text,
    fontFamily: Fonts.family,
    marginBottom: 2,
  },

  sectionSubtitle: {
    fontSize: 11,
    color: Tokens.textMuted,
    fontFamily: Fonts.family,
    maxWidth: "88%",
  },

  countBadge: {
    backgroundColor: "#eef2ff",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 5,
    marginRight: 4,
  },

  countText: {
    color: Tokens.primary,
    fontSize: 11,
    fontWeight: "700",
    fontFamily: Fonts.family,
  },

  monthSwitcher: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },

  monthLabelContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  calendarSpinner: {
    marginTop: 1,
  },

  navButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#f3f4f6",
    justifyContent: "center",
    alignItems: "center",
  },

  navButtonDisabled: {
    opacity: 0.45,
  },

  monthLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: Tokens.text,
    fontFamily: Fonts.family,
  },

  calendarError: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#fff7ed",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },

  calendarErrorText: {
    flex: 1,
    fontSize: 10,
    color: "#92400e",
    fontFamily: Fonts.family,
  },

  retryText: {
    color: Tokens.primary,
    fontSize: 10,
    fontWeight: "700",
    fontFamily: Fonts.family,
  },

  weekHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },

  weekDayText: {
    width: "13.5%",
    textAlign: "center",
    fontSize: 10,
    fontWeight: "700",
    color: Tokens.textMuted,
    fontFamily: Fonts.family,
  },

  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },

  dayCell: {
    width: "13.5%",
    aspectRatio: 1,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginVertical: 3,
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },

  dayCellAvailable: {
    backgroundColor: "#f0fdf4",
    borderColor: "#86efac",
  },

  dayCellHoliday: {
    backgroundColor: "#fffbeb",
    borderColor: "#fcd34d",
  },

  dayCellFull: {
    backgroundColor: "#fef2f2",
    borderColor: "#fca5a5",
  },

  dayCellSelected: {
    backgroundColor: "#657EEA",
    borderColor: "#657EEA",
  },

  dayCellDisabled: {
    opacity: 0.45,
  },

  emptyDay: {
    width: "13.5%",
    aspectRatio: 1,
    marginVertical: 4,
  },

  dayText: {
    fontSize: 11,
    color: Tokens.text,
    fontFamily: Fonts.family,
  },

  dayTextSelected: {
    color: "#fff",
    fontWeight: "700",
  },

  capacityText: {
    fontSize: 8,
    color: "#b91c1c",
    fontWeight: "700",
    marginTop: 1,
  },

  selectedList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  selectedChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#fef2f2",
    borderColor: "#fecaca",
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },

  selectedChipText: {
    color: "#b91c1c",
    fontSize: 10,
    fontWeight: "600",
    fontFamily: Fonts.family,
  },

  helperText: {
    fontSize: 11,
    color: Tokens.textMuted,
    fontFamily: Fonts.family,
  },

  hintText: {
    fontSize: 10,
    color: Tokens.textMuted,
    fontFamily: Fonts.family,
  },

  legend: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    alignItems: "center",
  },

  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },

  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  legendAvailable: {
    backgroundColor: "#16a34a",
  },

  legendFull: {
    backgroundColor: "#dc2626",
  },

  legendHoliday: {
    backgroundColor: "#f59e0b",
  },

  legendText: {
    fontSize: 9,
    color: Tokens.textMuted,
    fontFamily: Fonts.family,
  },

  modifyButton: {
    marginTop: 4,
    backgroundColor: Tokens.primary,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },

  modifyButtonDisabled: {
    opacity: 0.7,
  },

  modifyButtonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
    fontFamily: Fonts.family,
  },
});

export default CalenderVisit;
