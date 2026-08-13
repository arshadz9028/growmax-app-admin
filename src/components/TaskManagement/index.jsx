import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import {
  Alert,
  Animated,
  Easing,
  LayoutAnimation,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  UIManager,
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
  brandSoft: "#E8F4F7",
  danger: "#EF4444",
  dangerSoft: "#FEE2E2",
  amber: "#F59E0B",
  amberSoft: "#FEF3C7",
  low: "#0EA5A4",
  lowSoft: "#D9FBFA",
  shadow: "#94A3B8",
};

const PRIORITY_OPTIONS = [
  {
    key: "high",
    label: "High",
    caption: "Urgent",
    color: COLORS.danger,
    softColor: COLORS.dangerSoft,
    icon: "alert-circle-outline",
  },
  {
    key: "medium",
    label: "Medium",
    caption: "Scheduled",
    color: COLORS.amber,
    softColor: COLORS.amberSoft,
    icon: "time-outline",
  },
  {
    key: "low",
    label: "Low",
    caption: "Flexible",
    color: COLORS.low,
    softColor: COLORS.lowSoft,
    icon: "checkmark-done-circle-outline",
  },
];

const PRIORITY_ORDER = {
  high: 0,
  medium: 1,
  low: 2,
};

const TASKS_API_PATH = "/api/tasks";

function normalizeTask(task, fallbackId) {
  const normalizedPriority = PRIORITY_OPTIONS.some(
    (option) => option.key === task?.priority,
  )
    ? task.priority
    : "medium";

  return {
    id: task?.id || task?._id || task?.taskId || fallbackId,
    title: task?.title || "Untitled task",
    priority: normalizedPriority,
    deadline: task?.deadline
      ? new Date(task.deadline).toISOString()
      : new Date().toISOString(),
    createdAt: task?.createdAt || new Date().toISOString(),
  };
}

function normalizeTasks(payload) {
  const source = Array.isArray(payload)
    ? payload
    : payload?.tasks ||
      payload?.data?.tasks ||
      payload?.data ||
      payload?.task ||
      [];

  const list = Array.isArray(source) ? source : [source];

  return list.map((task, index) =>
    normalizeTask(task, `task-${Date.now()}-${index}`),
  );
}

function startOfDay(date) {
  const nextDate = new Date(date);
  nextDate.setHours(0, 0, 0, 0);
  return nextDate;
}

function addDays(date, amount) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + amount);
  return startOfDay(nextDate);
}

function formatDate(date) {
  return date.toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getRelativeDeadlineLabel(date) {
  const today = startOfDay(new Date());
  const selected = startOfDay(date);
  const diffMs = selected.getTime() - today.getTime();
  const diffDays = Math.round(diffMs / 86400000);

  if (diffDays === 0) {
    return "Due today";
  }

  if (diffDays === 1) {
    return "Due tomorrow";
  }

  if (diffDays > 1) {
    return `Due in ${diffDays} days`;
  }

  return `${Math.abs(diffDays)} days overdue`;
}

function createDeadlineOptions() {
  return Array.from({ length: 10 }, (_, index) => {
    const value = addDays(new Date(), index);

    return {
      key: value.toISOString(),
      value,
      title:
        index === 0 ? "Today" : index === 1 ? "Tomorrow" : formatDate(value),
      subtitle: getRelativeDeadlineLabel(value),
    };
  });
}

function createTask(title, priority, deadline, id) {
  return {
    id,
    title,
    priority,
    deadline: deadline.toISOString(),
    createdAt: new Date().toISOString(),
  };
}

const INITIAL_TASKS = [
  createTask(
    "Share revised proposal with site manager",
    "high",
    addDays(new Date(), 0),
    "task-1",
  ),
  createTask(
    "Review purchase list for new solar installation",
    "medium",
    addDays(new Date(), 2),
    "task-2",
  ),
  createTask(
    "Archive completed electrical service notes",
    "low",
    addDays(new Date(), 5),
    "task-3",
  ),
];

function getPriorityConfig(priorityKey) {
  return (
    PRIORITY_OPTIONS.find((item) => item.key === priorityKey) ||
    PRIORITY_OPTIONS[1]
  );
}

function StatCard({ label, value, accent, icon }) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIconWrap, { backgroundColor: `${accent}20` }]}>
        <Ionicons name={icon} size={16} color={accent} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function SectionHeader({ eyebrow, title, icon }) {
  return (
    <View style={styles.sectionHeader}>
      <View>
        <Text style={styles.sectionEyebrow}>{eyebrow}</Text>
        {title ? <Text style={styles.sectionTitle}>{title}</Text> : null}
      </View>
      {icon ? (
        <View style={styles.sectionIconWrap}>
          <Ionicons name={icon} size={15} color={COLORS.brand} />
        </View>
      ) : null}
    </View>
  );
}

function TaskCard({ task, index, onDelete }) {
  const priority = getPriorityConfig(task.priority);
  const entryAnim = React.useRef(new Animated.Value(0)).current;
  const deadlineDate = new Date(task.deadline);
  const relativeDeadline = getRelativeDeadlineLabel(deadlineDate);
  const isOverdue = relativeDeadline.includes("overdue");

  React.useEffect(() => {
    Animated.timing(entryAnim, {
      toValue: 1,
      duration: 430,
      delay: index * 55,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [entryAnim, index]);

  return (
    <Animated.View
      style={[
        styles.taskCard,
        {
          opacity: entryAnim,
          transform: [
            {
              translateY: entryAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [14, 0],
              }),
            },
          ],
        },
      ]}
    >
      <View style={[styles.taskAccentRail, { backgroundColor: priority.color }]} />

      <View pointerEvents="none" style={styles.taskTexture}>
        <View style={styles.taskTextureLineOne} />
        <View style={styles.taskTextureLineTwo} />
        <View style={styles.taskTextureLineThree} />
      </View>

      <View style={styles.taskCardTopRow}>
        <View
          style={[
            styles.priorityBadge,
            {
              backgroundColor: priority.softColor,
              borderColor: `${priority.color}30`,
            },
          ]}
        >
          <Ionicons name={priority.icon} size={14} color={priority.color} />
          <Text style={[styles.priorityBadgeText, { color: priority.color }]}>
            {priority.label}
          </Text>
        </View>

        <Pressable
          style={styles.deleteButton}
          onPress={() => onDelete(task)}
          hitSlop={8}
        >
          <Ionicons name="trash-outline" size={16} color={COLORS.danger} />
        </Pressable>
      </View>

      <Text style={styles.taskTitle}>{task.title}</Text>

      <View style={styles.taskMetaRow}>
        <View style={styles.metaPill}>
          <Ionicons name="calendar-outline" size={13} color={COLORS.brand} />
          <Text style={styles.metaPillText}>{formatDate(deadlineDate)}</Text>
        </View>

        <View
          style={[
            styles.deadlineStatus,
            isOverdue && styles.deadlineStatusOverdue,
          ]}
        >
          <Ionicons
            name={isOverdue ? "warning-outline" : "flag-outline"}
            size={13}
            color={isOverdue ? COLORS.danger : COLORS.muted}
          />
          <Text
            style={[
              styles.relativeDeadlineText,
              isOverdue && styles.relativeDeadlineTextOverdue,
            ]}
          >
            {relativeDeadline}
          </Text>
        </View>
      </View>
    </Animated.View>
  );
}

function TaskManagement() {
  const [taskTitle, setTaskTitle] = React.useState("");
  const [selectedPriority, setSelectedPriority] = React.useState("high");
  const [selectedDeadline, setSelectedDeadline] = React.useState(
    addDays(new Date(), 1),
  );
  const [tasks, setTasks] = React.useState(INITIAL_TASKS);
  const [showDeadlineModal, setShowDeadlineModal] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [isLoadingTasks, setIsLoadingTasks] = React.useState(true);

  const revealAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (
      Platform.OS === "android" &&
      UIManager.setLayoutAnimationEnabledExperimental
    ) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  React.useEffect(() => {
    Animated.timing(revealAnim, {
      toValue: 1,
      duration: 560,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [revealAnim]);

  React.useEffect(() => {
    let isMounted = true;

    const loadTasks = async () => {
      setIsLoadingTasks(true);

      try {
        const response = await safeFetch(getApiUrl(TASKS_API_PATH), {
          method: "GET",
        });

        if (!response.ok) {
          throw new Error("Unable to load tasks");
        }

        const responseData = await response.json().catch(() => null);
        const nextTasks = normalizeTasks(responseData);

        if (isMounted) {
          setTasks(nextTasks);
        }
      } catch (error) {
        if (isMounted) {
          setTasks(INITIAL_TASKS);
        }
      } finally {
        if (isMounted) {
          setIsLoadingTasks(false);
        }
      }
    };

    loadTasks();

    return () => {
      isMounted = false;
    };
  }, []);

  const deadlineOptions = React.useMemo(() => createDeadlineOptions(), []);

  const groupedTasks = React.useMemo(() => {
    const sortedTasks = [...tasks].sort((first, second) => {
      if (PRIORITY_ORDER[first.priority] !== PRIORITY_ORDER[second.priority]) {
        return PRIORITY_ORDER[first.priority] - PRIORITY_ORDER[second.priority];
      }

      return (
        new Date(first.deadline).getTime() - new Date(second.deadline).getTime()
      );
    });

    return PRIORITY_OPTIONS.map((priority) => ({
      ...priority,
      tasks: sortedTasks.filter((task) => task.priority === priority.key),
    }));
  }, [tasks]);

  const highPriorityCount = tasks.filter(
    (task) => task.priority === "high",
  ).length;
  const dueTodayCount = tasks.filter(
    (task) => getRelativeDeadlineLabel(new Date(task.deadline)) === "Due today",
  ).length;

  const revealStyle = {
    opacity: revealAnim,
    transform: [
      {
        translateY: revealAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [20, 0],
        }),
      },
    ],
  };

  const handleSaveTask = async () => {
    const cleanedTitle = taskTitle.trim();

    if (!cleanedTitle) {
      Alert.alert(
        "Task required",
        "Please enter the task details before saving.",
      );
      return;
    }

    const optimisticTask = createTask(
      cleanedTitle,
      selectedPriority,
      selectedDeadline,
      `task-${Date.now()}`,
    );

    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsSaving(true);
    setTasks((currentTasks) => [optimisticTask, ...currentTasks]);
    setTaskTitle("");
    setSelectedPriority("high");
    setSelectedDeadline(addDays(new Date(), 1));

    try {
      const payload = {
        title: cleanedTitle,
        priority: selectedPriority,
        deadline: selectedDeadline.toISOString(),
        createdAt: optimisticTask.createdAt,
      };

      const response = await safeFetch(getApiUrl(TASKS_API_PATH), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("Unable to save task");
      }

      const responseData = await response.json().catch(() => null);
      const serverTask =
        responseData?.task ||
        responseData?.data?.task ||
        responseData?.data ||
        responseData ||
        optimisticTask;

      if (serverTask && typeof serverTask === "object") {
        setTasks((currentTasks) =>
          currentTasks.map((item) =>
            item.id === optimisticTask.id
              ? normalizeTask({ ...item, ...serverTask }, optimisticTask.id)
              : item,
          ),
        );
      }
    } catch (error) {
      setTasks((currentTasks) =>
        currentTasks.filter((item) => item.id !== optimisticTask.id),
      );
      Alert.alert("Save failed", "The task was not saved. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteTask = (task) => {
    Alert.alert(
      "Delete task",
      `Are you sure you want to delete "${task.title}"?`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const taskId = task?.id || task?._id || task?.taskId;

            if (!taskId) {
              return;
            }

            LayoutAnimation.configureNext(
              LayoutAnimation.Presets.easeInEaseOut,
            );

            const previousTasks = tasks;
            setTasks((currentTasks) =>
              currentTasks.filter((item) => item.id !== taskId),
            );

            try {
              const response = await safeFetch(
                getApiUrl(`${TASKS_API_PATH}/${taskId}`),
                {
                  method: "DELETE",
                },
              );

              if (!response.ok) {
                throw new Error("Unable to delete task");
              }
            } catch (error) {
              setTasks(previousTasks);
              Alert.alert(
                "Delete failed",
                "The task could not be deleted. Please try again.",
              );
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
      >
        <Animated.View style={[styles.heroWrap, revealStyle]}>
          <LinearGradient
            colors={["#102A43", "#1E5464", "#657EEA"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroCard}
          >
            <View pointerEvents="none" style={styles.heroTexture}>
              <View style={styles.heroGridLineOne} />
              <View style={styles.heroGridLineTwo} />
              <View style={styles.heroGridLineThree} />
              <View style={styles.heroGridLineFour} />
            </View>

            <View style={styles.heroTopRow}>
              <View style={styles.heroBadge}>
                <Ionicons name="briefcase-outline" size={14} color="#FFFFFF" />
                <Text style={styles.heroBadgeText}>Admin Task Management</Text>
              </View>

              <View style={styles.heroIconBox}>
                <Ionicons name="layers-outline" size={20} color="#FFFFFF" />
              </View>
            </View>

            <Text style={styles.heroTitle}>Plan work. Rank urgency. Move fast.</Text>
            <Text style={styles.heroSubtitle}>
              Create tasks, assign priority, and keep urgent service work visible
              without crowding the screen.
            </Text>

            <View style={styles.heroStatsRow}>
              <StatCard
                label="Total tasks"
                value={String(tasks.length)}
                accent="#BFDBFE"
                icon="albums-outline"
              />
              <StatCard
                label="High priority"
                value={String(highPriorityCount)}
                accent="#FCA5A5"
                icon="alert-circle-outline"
              />
              <StatCard
                label="Due today"
                value={String(dueTodayCount)}
                accent="#FDE68A"
                icon="today-outline"
              />
            </View>
          </LinearGradient>
        </Animated.View>

        <Animated.View style={[styles.composeCard, revealStyle]}>
          <SectionHeader
            eyebrow="New task"
            title="Create a task for your team"
            icon="create-outline"
          />

          <View style={styles.inputShell}>
            <Ionicons name="document-text-outline" size={17} color={COLORS.faint} />
            <TextInput
              placeholder="Enter task details"
              placeholderTextColor="#94A3B8"
              value={taskTitle}
              onChangeText={setTaskTitle}
              multiline
              style={styles.taskInput}
              textAlignVertical="top"
            />
          </View>

          <Pressable
            style={styles.deadlineSelector}
            onPress={() => setShowDeadlineModal(true)}
          >
            <View style={styles.deadlineIconBox}>
              <Ionicons
                name="calendar-clear-outline"
                size={18}
                color={COLORS.brand}
              />
            </View>
            <View style={styles.deadlineTextWrap}>
              <Text style={styles.metaLabel}>Deadline</Text>
              <Text style={styles.metaValue}>{formatDate(selectedDeadline)}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={COLORS.faint} />
          </Pressable>

          <View style={styles.prioritySection}>
            <Text style={styles.metaLabel}>Priority</Text>
            <View style={styles.priorityRow}>
              {PRIORITY_OPTIONS.map((priority) => {
                const isActive = selectedPriority === priority.key;

                return (
                  <Pressable
                    key={priority.key}
                    style={[
                      styles.priorityOption,
                      {
                        backgroundColor: isActive
                          ? priority.softColor
                          : COLORS.surfaceAlt,
                        borderColor: isActive ? priority.color : COLORS.border,
                      },
                    ]}
                    onPress={() => setSelectedPriority(priority.key)}
                  >
                    <Ionicons
                      name={priority.icon}
                      size={16}
                      color={priority.color}
                    />
                    <Text
                      style={[
                        styles.priorityOptionText,
                        { color: isActive ? priority.color : COLORS.text },
                      ]}
                    >
                      {priority.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <Pressable
            style={styles.saveButtonOuter}
            onPress={handleSaveTask}
            disabled={isSaving}
          >
            <LinearGradient
              colors={["#102A43", "#1E5464", "#657EEA"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
            >
              <Ionicons name="add-circle-outline" size={18} color="#FFFFFF" />
              <Text style={styles.saveButtonText}>
                {isSaving ? "Saving..." : "Save task"}
              </Text>
            </LinearGradient>
          </Pressable>
        </Animated.View>

        <View style={styles.boardHeader}>
          <SectionHeader
            eyebrow="Task board"
            title="Sorted by priority"
            icon="filter-outline"
          />
        </View>

        {isLoadingTasks ? (
          <View style={styles.loadingState}>
            <Ionicons name="refresh-outline" size={20} color={COLORS.brand} />
            <Text style={styles.loadingText}>Loading tasks...</Text>
          </View>
        ) : tasks.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyStateIcon}>
              <Ionicons
                name="file-tray-outline"
                size={22}
                color={COLORS.brand}
              />
            </View>
            <Text style={styles.emptyStateTitle}>No tasks yet</Text>
            <Text style={styles.emptyStateText}>
              Add your first admin task above and it will appear here instantly.
            </Text>
          </View>
        ) : (
          groupedTasks.map((priorityGroup) => (
            <View key={priorityGroup.key} style={styles.priorityGroup}>
              <View style={styles.priorityGroupHeader}>
                <View
                  style={[
                    styles.priorityGroupBadge,
                    {
                      backgroundColor: priorityGroup.softColor,
                      borderColor: `${priorityGroup.color}28`,
                    },
                  ]}
                >
                  <Ionicons
                    name={priorityGroup.icon}
                    size={14}
                    color={priorityGroup.color}
                  />
                  <Text
                    style={[
                      styles.priorityGroupBadgeText,
                      { color: priorityGroup.color },
                    ]}
                  >
                    {priorityGroup.label} priority
                  </Text>
                </View>
                <Text style={styles.priorityGroupCount}>
                  {priorityGroup.tasks.length} task
                  {priorityGroup.tasks.length === 1 ? "" : "s"}
                </Text>
              </View>

              {priorityGroup.tasks.length > 0 ? (
                priorityGroup.tasks.map((task, index) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    index={index}
                    onDelete={handleDeleteTask}
                  />
                ))
              ) : (
                <View style={styles.emptyGroupCard}>
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={16}
                    color={COLORS.faint}
                  />
                  <Text style={styles.emptyGroupText}>
                    No {priorityGroup.label.toLowerCase()} priority tasks
                  </Text>
                </View>
              )}
            </View>
          ))
        )}
      </ScrollView>

      <Modal
        visible={showDeadlineModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDeadlineModal(false)}
        statusBarTranslucent
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Select deadline</Text>
                <Text style={styles.modalSubtitle}>
                  Choose when this task should be completed.
                </Text>
              </View>
              <Pressable
                style={styles.modalCloseIcon}
                onPress={() => setShowDeadlineModal(false)}
              >
                <Ionicons name="close" size={18} color={COLORS.muted} />
              </Pressable>
            </View>

            <ScrollView
              style={styles.deadlineList}
              contentContainerStyle={styles.deadlineListContent}
              showsVerticalScrollIndicator={false}
            >
              {deadlineOptions.map((option) => {
                const isSelected =
                  startOfDay(selectedDeadline).getTime() ===
                  startOfDay(option.value).getTime();

                return (
                  <Pressable
                    key={option.key}
                    style={[
                      styles.deadlineOption,
                      isSelected && styles.deadlineOptionSelected,
                    ]}
                    onPress={() => {
                      setSelectedDeadline(option.value);
                      setShowDeadlineModal(false);
                    }}
                  >
                    <View style={styles.deadlineOptionIcon}>
                      <Ionicons
                        name="calendar-outline"
                        size={16}
                        color={isSelected ? COLORS.brand : COLORS.faint}
                      />
                    </View>
                    <View style={styles.deadlineOptionTextWrap}>
                      <Text style={styles.deadlineOptionTitle}>
                        {option.title}
                      </Text>
                      <Text style={styles.deadlineOptionSubtitle}>
                        {option.subtitle}
                      </Text>
                    </View>
                    <Ionicons
                      name={isSelected ? "checkmark-circle" : "ellipse-outline"}
                      size={20}
                      color={isSelected ? COLORS.brand : "#CBD5E1"}
                    />
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

export default TaskManagement;

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
    paddingBottom: 32,
  },
  heroWrap: {
    marginTop: 10,
    marginBottom: 14,
  },
  heroCard: {
    borderRadius: 18,
    padding: 18,
    minHeight: 220,
    overflow: "hidden",
    shadowColor: "#334155",
    shadowOpacity: 0.2,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
  heroTexture: {
    ...StyleSheet.absoluteFillObject,
  },
  heroGridLineOne: {
    position: "absolute",
    width: 230,
    height: 1,
    right: -46,
    top: 42,
    backgroundColor: "rgba(255,255,255,0.18)",
    transform: [{ rotate: "-24deg" }],
  },
  heroGridLineTwo: {
    position: "absolute",
    width: 190,
    height: 1,
    right: -30,
    top: 76,
    backgroundColor: "rgba(255,255,255,0.14)",
    transform: [{ rotate: "-24deg" }],
  },
  heroGridLineThree: {
    position: "absolute",
    width: 1,
    height: 160,
    right: 58,
    top: -24,
    backgroundColor: "rgba(255,255,255,0.12)",
    transform: [{ rotate: "24deg" }],
  },
  heroGridLineFour: {
    position: "absolute",
    width: 1,
    height: 170,
    right: 108,
    top: -34,
    backgroundColor: "rgba(255,255,255,0.1)",
    transform: [{ rotate: "24deg" }],
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  heroBadge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.14)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
  },
  heroBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
  },
  heroIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.14)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
    alignItems: "center",
    justifyContent: "center",
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
    marginTop: 8,
    maxWidth: "96%",
    fontWeight: "600",
  },
  heroStatsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 20,
  },
  statCard: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 11,
    paddingHorizontal: 10,
    backgroundColor: "rgba(255,255,255,0.13)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
  statIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  statValue: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
  },
  statLabel: {
    color: "rgba(255,255,255,0.76)",
    fontSize: 9.5,
    marginTop: 2,
    fontWeight: "700",
  },
  composeCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 15,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.11,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 9 },
    elevation: 5,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: COLORS.brandSoft,
    alignItems: "center",
    justifyContent: "center",
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
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "900",
  },
  inputShell: {
    minHeight: 84,
    borderRadius: 14,
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 13,
    paddingVertical: 12,
    marginTop: 15,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  taskInput: {
    flex: 1,
    minHeight: 58,
    color: COLORS.text,
    fontSize: 11,
    lineHeight: 17,
    padding: 0,
    fontWeight: "700",
  },
  deadlineSelector: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surfaceAlt,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
  },
  deadlineIconBox: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: COLORS.brandSoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  deadlineTextWrap: {
    flex: 1,
  },
  metaLabel: {
    color: COLORS.muted,
    fontSize: 9.5,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 0.65,
  },
  metaValue: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: "800",
    marginTop: 3,
  },
  prioritySection: {
    marginTop: 14,
  },
  priorityRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 9,
  },
  priorityOption: {
    flex: 1,
    minHeight: 42,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 8,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    gap: 5,
  },
  priorityOptionText: {
    fontSize: 10,
    fontWeight: "900",
  },
  saveButtonOuter: {
    marginTop: 16,
  },
  saveButton: {
    minHeight: 48,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  saveButtonDisabled: {
    opacity: 0.75,
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900",
  },
  boardHeader: {
    marginTop: 18,
    marginBottom: 9,
  },
  loadingState: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  loadingText: {
    color: COLORS.brand,
    fontSize: 12,
    fontWeight: "800",
  },
  emptyState: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    paddingVertical: 28,
    paddingHorizontal: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emptyStateIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: COLORS.brandSoft,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  emptyStateTitle: {
    fontSize: 13,
    fontWeight: "900",
    color: COLORS.text,
  },
  emptyStateText: {
    fontSize: 11,
    lineHeight: 17,
    textAlign: "center",
    color: COLORS.muted,
    marginTop: 6,
    fontWeight: "600",
  },
  priorityGroup: {
    marginBottom: 12,
  },
  priorityGroupHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  priorityGroupBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
  },
  priorityGroupBadgeText: {
    fontSize: 10,
    fontWeight: "900",
  },
  priorityGroupCount: {
    color: COLORS.muted,
    fontSize: 10,
    fontWeight: "800",
  },
  emptyGroupCard: {
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.58)",
    borderWidth: 1,
    borderColor: "rgba(216,227,240,0.8)",
    paddingHorizontal: 12,
    paddingVertical: 11,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  emptyGroupText: {
    color: COLORS.muted,
    fontSize: 10,
    fontWeight: "700",
  },
  taskCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 14,
    paddingLeft: 17,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 10,
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
    overflow: "hidden",
  },
  taskAccentRail: {
    position: "absolute",
    width: 4,
    top: 12,
    bottom: 12,
    left: 0,
    borderTopRightRadius: 999,
    borderBottomRightRadius: 999,
  },
  taskTexture: {
    ...StyleSheet.absoluteFillObject,
  },
  taskTextureLineOne: {
    position: "absolute",
    width: 142,
    height: 1,
    right: -32,
    top: 27,
    backgroundColor: "rgba(226,232,240,0.7)",
    transform: [{ rotate: "-21deg" }],
  },
  taskTextureLineTwo: {
    position: "absolute",
    width: 112,
    height: 1,
    right: -20,
    top: 48,
    backgroundColor: "rgba(226,232,240,0.48)",
    transform: [{ rotate: "-21deg" }],
  },
  taskTextureLineThree: {
    position: "absolute",
    width: 88,
    height: 1,
    right: -12,
    bottom: 25,
    backgroundColor: "rgba(226,232,240,0.36)",
    transform: [{ rotate: "-21deg" }],
  },
  taskCardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  priorityBadge: {
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
  },
  priorityBadgeText: {
    fontSize: 10,
    fontWeight: "900",
  },
  deleteButton: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFF5F5",
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.12)",
  },
  taskTitle: {
    color: COLORS.text,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "900",
    marginTop: 12,
  },
  taskMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    gap: 8,
  },
  metaPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: COLORS.brandSoft,
    paddingHorizontal: 9,
    paddingVertical: 7,
    borderRadius: 999,
    flexShrink: 0,
  },
  metaPillText: {
    color: COLORS.brand,
    fontSize: 10,
    fontWeight: "800",
  },
  deadlineStatus: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flexShrink: 1,
  },
  deadlineStatusOverdue: {
    backgroundColor: COLORS.dangerSoft,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 999,
  },
  relativeDeadlineText: {
    color: COLORS.muted,
    fontSize: 10,
    fontWeight: "800",
    textAlign: "right",
    flexShrink: 1,
  },
  relativeDeadlineTextOverdue: {
    color: COLORS.danger,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.46)",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  modalCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    padding: 18,
    maxHeight: "74%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  modalCloseIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: COLORS.surfaceAlt,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
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
    marginTop: 4,
    fontWeight: "600",
  },
  deadlineList: {
    marginTop: 16,
  },
  deadlineListContent: {
    paddingBottom: 4,
  },
  deadlineOption: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
    backgroundColor: COLORS.surfaceAlt,
  },
  deadlineOptionSelected: {
    borderColor: COLORS.brand,
    backgroundColor: COLORS.brandSoft,
  },
  deadlineOptionIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  deadlineOptionTextWrap: {
    flex: 1,
  },
  deadlineOptionTitle: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: "900",
  },
  deadlineOptionSubtitle: {
    color: COLORS.muted,
    fontSize: 10,
    marginTop: 3,
    fontWeight: "700",
  },
});
