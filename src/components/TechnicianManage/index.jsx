/* eslint-disable react-hooks/set-state-in-effect */
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
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getApiUrl, safeFetch } from "../../constants/api";

const C = {
  page: "#EFF4FB",
  surface: "#FFF",
  alt: "#F8FAFC",
  text: "#0F172A",
  muted: "#64748B",
  faint: "#94A3B8",
  border: "#D8E3F0",
  brand: "#1E5464",
  dark: "#102A43",
  blue: "#657EEA",
  blueSoft: "#EEF2FF",
  green: "#10B981",
  greenSoft: "#ECFDF5",
  amber: "#F59E0B",
  amberSoft: "#FFFBEB",
  red: "#EF4444",
  redSoft: "#FEF2F2",
};
const TECHS = "/api/admin/technicians",
  MONTH = (key) => `/api/admin/visits?month=${encodeURIComponent(key)}`,
  ASSIGN = (id) => `/api/admin/visits/${id}/assign`,
  RESPONSES = (id) => `${TECHS}?technicianId=${encodeURIComponent(id)}`,
  REVIEW = (id) =>
    `/api/admin/technicians/${encodeURIComponent(id)}/assigned-visits/review`;
const id = (x) => x?._id || x?.id || x?.technicianId || x?.userId || "",
  name = (x) => x?.fullName || x?.name || x?.username || "Unnamed technician",
  monthKey = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
  addMonth = (d, n) => {
    const x = new Date(d);
    x.setMonth(x.getMonth() + n);
    return x;
  },
  fmtMonth = (d) =>
    d.toLocaleDateString("en-IN", { month: "long", year: "numeric" }),
  fmtDate = (v) => {
    const d = new Date(v);
    return !v || Number.isNaN(d)
      ? "Not available"
      : d.toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        });
  },
  initials = (x) =>
    String(x || "T")
      .split(/\s+/)
      .map((a) => a[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
function list(p) {
  return Array.isArray(p)
    ? p
    : p?.technicians || p?.data?.technicians || p?.data || p?.users || [];
}
function normalizeTechs(p) {
  return (Array.isArray(list(p)) ? list(p) : []).map((t, i) => ({
    ...t,
    _localId: String(id(t) || `t-${i}`),
    assignedVisits: Array.isArray(t.assignedVisits) ? t.assignedVisits : [],
  }));
}
function normalizeVisit(v, i, t) {
  return {
    ...v,
    _visitId: String(
      v?._visitId ||
        v?.visitId ||
        v?._id ||
        v?.id ||
        `${v?.requestId || "visit"}-${v?.visitIndex ?? i}`,
    ),
    _visitIndex: v?._visitIndex ?? v?.visitIndex ?? i,
    _requestId: v?._requestId || v?.requestId || "",
    _customerName:
      v?._customerName ||
      v?.consumerName ||
      v?.customerName ||
      v?.fullName ||
      "Unnamed customer",
    _mobile:
      v?._mobile ||
      v?.mobileNumber ||
      v?.mobile ||
      v?.phone ||
      "Mobile not available",
    _consumerNumber:
      v?._consumerNumber ||
      v?.consumerNumber ||
      v?.consumerNo ||
      "Not assigned",
    _serviceName:
      v?._serviceName || v?.serviceName || v?.service?.name || "Service visit",
    _date: v?._date || v?.dateOfVisit || v?.date || v?.visitDate || null,
    _location:
      v?._location ||
      v?.locationAddress ||
      v?.location ||
      v?.address ||
      "Location not available",
    _status: v?._status || v?.status || "UpComing",
    _reviewStatus: v?._reviewStatus || v?.reviewStatus || "",
    _assignedTechnicianId:
      v?._assignedTechnicianId || v?.assignedTechnicianId || id(t),
    _assignedTechnicianName:
      v?._assignedTechnicianName || v?.assignedTechnicianName || name(t),
  };
}
function normalizeVisits(p, t) {
  return (Array.isArray(p) ? p : p?.visits || p?.data?.visits || p?.data || [])
    .filter(Boolean)
    .map((v, i) => normalizeVisit(v, i, t));
}
function Badge({ text }) {
  let x = String(text).toLowerCase(),
    p =
      x === "approved"
        ? [C.green, C.greenSoft]
        : x === "rejected"
          ? [C.red, C.redSoft]
          : x.includes("pending")
            ? [C.amber, C.amberSoft]
            : [C.blue, C.blueSoft];
  return (
    <Text style={[s.badge, { color: p[0], backgroundColor: p[1] }]}>
      {text}
    </Text>
  );
}
function Mini({ icon, value, label }) {
  return (
    <View style={s.mini}>
      <Ionicons name={icon} size={14} color={C.blue} />
      <Text style={s.miniV} numberOfLines={1}>
        {value}
      </Text>
      <Text style={s.miniL}>{label}</Text>
    </View>
  );
}
function State({ title, text, loading, retry }) {
  return (
    <View style={s.state}>
      {loading ? (
        <ActivityIndicator color={C.brand} />
      ) : (
        <Ionicons name="calendar-outline" size={27} color={C.brand} />
      )}
      <Text style={s.stateT}>{title}</Text>
      <Text style={s.stateP}>{text}</Text>
      {retry ? (
        <Pressable style={s.retry} onPress={retry}>
          <Text style={s.whiteText}>Try again</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
function TechCard({ tech, onOpen }) {
  let active = tech.active !== false && !tech.blocked;
  return (
    <Pressable style={s.card} onPress={() => onOpen(tech)}>
      <View style={[s.rail, { backgroundColor: active ? C.green : C.red }]} />
      <View style={s.row}>
        <View style={s.person}>
          <View
            style={[
              s.avatar,
              { backgroundColor: active ? C.greenSoft : C.redSoft },
            ]}
          >
            <Text
              style={{ color: active ? C.green : C.red, fontWeight: "900" }}
            >
              {initials(name(tech))}
            </Text>
          </View>
          <View>
            <Text style={s.title}>{name(tech)}</Text>
            <Text style={s.sub}>
              {tech.mobileNumber || "No mobile"} · {tech.city || "No city"}
            </Text>
          </View>
        </View>
        <Badge text={active ? "Active" : "Blocked"} />
      </View>
      <View style={s.grid}>
        <Mini
          icon="mail-outline"
          value={tech.email || "No email"}
          label="Email"
        />
        <Mini
          icon="images-outline"
          value={String(tech.assignedVisits.length)}
          label="Assigned visits"
        />
      </View>
      <View style={s.open}>
        <Text style={s.openT}>Open profile</Text>
        <Ionicons name="arrow-forward" size={15} color={C.brand} />
      </View>
    </Pressable>
  );
}
function VisitCard({ visit, tech, onAssign, loading, readOnly }) {
  let selected = String(visit._assignedTechnicianId) === String(id(tech));
  return (
    <View style={s.card}>
      <View
        style={[s.rail, { backgroundColor: selected ? C.green : C.blue }]}
      />
      <View style={s.row}>
        <View style={s.flex}>
          <Text style={s.title}>{visit._customerName}</Text>
          <Text style={s.sub}>{visit._serviceName}</Text>
        </View>
        <Badge text={selected ? "Assigned" : visit._status} />
      </View>
      <View style={s.grid}>
        <Mini
          icon="calendar-outline"
          value={fmtDate(visit._date)}
          label="Visit date"
        />
        <Mini
          icon="key-outline"
          value={visit._consumerNumber}
          label="Consumer"
        />
        <Mini icon="call-outline" value={visit._mobile} label="Mobile" />
      </View>
      <View style={s.address}>
        <Ionicons name="location-outline" size={16} color={C.red} />
        <Text style={s.addr}>{visit._location}</Text>
      </View>
      {!readOnly ? (
        <Pressable
          style={[s.primary, loading && s.disabled]}
          onPress={() => onAssign(visit)}
          disabled={loading || selected}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={s.whiteText}>
              {selected ? "Assigned to this technician" : "Assign visit"}
            </Text>
          )}
        </Pressable>
      ) : null}
    </View>
  );
}
function ResponseCard({ visit, onReview, loading }) {
  let submitted =
    visit.beforePhotoUrl ||
    visit.afterPhotoUrl ||
    visit.issueNote ||
    ["pending", "service/installation pending"].includes(
      String(visit._status).toLowerCase(),
    );
  return submitted ? (
    <View style={s.card}>
      <View style={s.row}>
        <View style={s.flex}>
          <Text style={s.title}>{visit._customerName}</Text>
          <Text style={s.sub}>
            {visit._serviceName} · {fmtDate(visit._date)}
          </Text>
        </View>
        <Badge text={visit._reviewStatus || visit._status} />
      </View>
      <View style={s.photos}>
        <Photo label="Before" url={visit.beforePhotoUrl} />
        <Photo label="After" url={visit.afterPhotoUrl} />
      </View>
      {visit.issueNote ? (
        <View style={s.issue}>
          <Ionicons name="alert-circle-outline" size={17} color={C.red} />
          <Text style={s.issueText}>{visit.issueNote}</Text>
        </View>
      ) : null}
      {!visit._reviewStatus ? (
        <View style={s.review}>
          <Pressable
            style={s.reject}
            onPress={() => onReview(visit, "Rejected")}
            disabled={loading}
          >
            <Text style={{ color: C.red, fontWeight: "900" }}>Reject</Text>
          </Pressable>
          <Pressable
            style={[s.approve, loading && s.disabled]}
            onPress={() => onReview(visit, "Approved")}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={s.whiteText}>Approve</Text>
            )}
          </Pressable>
        </View>
      ) : null}
    </View>
  ) : null;
}
function Photo({ label, url }) {
  return (
    <View style={s.photoWrap}>
      {url ? (
        <Image source={{ uri: url }} style={s.photo} />
      ) : (
        <View style={s.noPhoto}>
          <Ionicons name="image-outline" size={20} color={C.faint} />
        </View>
      )}
      <Text style={s.photoLabel}>{label} photo</Text>
    </View>
  );
}
function Create({ visible, close, form, setForm, create, busy }) {
  let field = (k, p, extra = {}) => (
    <TextInput
      value={form[k]}
      onChangeText={(v) => setForm((x) => ({ ...x, [k]: v }))}
      placeholder={p}
      placeholderTextColor={C.faint}
      style={s.input}
      {...extra}
    />
  );
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={close}
    >
      <View style={s.overlay}>
        <View style={s.createBox}>
          <View style={s.row}>
            <View>
              <Text style={s.modalT}>Create technician</Text>
              <Text style={s.sub}>Add profile and login access.</Text>
            </View>
            <Pressable style={s.close} onPress={close}>
              <Ionicons name="close" size={18} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={s.form}>
            {field("fullName", "Full name")}
            {field("mobileNumber", "Mobile number", {
              keyboardType: "phone-pad",
            })}
            {field("email", "Email address", {
              keyboardType: "email-address",
              autoCapitalize: "none",
            })}
            {field("username", "Username", { autoCapitalize: "none" })}
            {field("city", "City or working area")}
            {field("password", "Temporary password", { secureTextEntry: true })}
          </ScrollView>
          <Pressable
            style={[s.primary, busy && s.disabled]}
            onPress={create}
            disabled={busy}
          >
            {busy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={s.whiteText}>Create technician</Text>
            )}
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
function Profile({
  tech,
  visible,
  close,
  onDelete,
  deleting,
  view,
  setView,
  month,
  setMonth,
  monthly,
  assigned,
  responses,
  loadingVisits,
  loadingResponses,
  assign,
  onReview,
  processing,
  reviewing,
  openResponses,
}) {
  let responseList = responses.filter(
    (v) =>
      v.beforePhotoUrl ||
      v.afterPhotoUrl ||
      v.issueNote ||
      ["pending", "service/installation pending"].includes(
        String(v._status).toLowerCase(),
      ),
  );
  let content =
    view === "assign" ? monthly : view === "check" ? assigned : responseList;
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={close}
    >
      <View style={s.sheetOverlay}>
        <View style={s.sheet}>
          <View style={s.row}>
            <View style={s.person}>
              <View style={s.avatar}>
                <Text style={{ color: C.blue, fontWeight: "900" }}>
                  {initials(name(tech))}
                </Text>
              </View>
              <View>
                <Text style={s.modalT}>{name(tech)}</Text>
                <Text style={s.sub}>{tech?.email || "No email"}</Text>
              </View>
            </View>
            <View style={s.person}>
              <Pressable
                style={[s.deleteButton, deleting && s.disabled]}
                onPress={onDelete}
                disabled={deleting}
              >
                {deleting ? (
                  <ActivityIndicator size="small" color={C.red} />
                ) : (
                  <Ionicons name="trash-outline" size={16} color={C.red} />
                )}
                <Text style={s.deleteText}>Delete</Text>
              </Pressable>
              <Pressable style={s.close} onPress={close}>
                <Ionicons name="close" size={18} />
              </Pressable>
            </View>
          </View>
          {view === "home" ? (
            <ScrollView contentContainerStyle={s.actionList}>
              <Action
                icon="calendar-outline"
                title="Assign visits"
                text="View month-wise consumer visits and assign this technician."
                onPress={() => setView("assign")}
              />
              <Action
                icon="checkbox-outline"
                title="Check visits"
                text="View all visits already assigned to this technician."
                onPress={() => setView("check")}
              />
              <Action
                icon="images-outline"
                title="View responses"
                text="Review submitted photos, issue notes, and visit status."
                onPress={openResponses}
              />
            </ScrollView>
          ) : (
            <>
              <View style={s.toolbar}>
                <Pressable style={s.close} onPress={() => setView("home")}>
                  <Ionicons name="arrow-back" size={17} color={C.brand} />
                </Pressable>
                {view === "assign" ? (
                  <Pressable
                    style={s.close}
                    onPress={() => setMonth((d) => addMonth(d, -1))}
                  >
                    <Ionicons name="chevron-back" size={17} color={C.brand} />
                  </Pressable>
                ) : (
                  <View style={s.spacer} />
                )}
                <View style={s.flex}>
                  <Text style={s.toolbarLabel}>
                    {view === "responses"
                      ? "TECHNICIAN RESPONSES"
                      : view === "check"
                        ? "ASSIGNED VISITS"
                        : "CONSUMER VISITS"}
                  </Text>
                  <Text style={s.toolbarTitle}>
                    {view === "assign"
                      ? fmtMonth(month)
                      : view === "check"
                        ? "Assigned visits"
                        : "Submitted responses"}
                  </Text>
                </View>
                {view === "assign" ? (
                  <Pressable
                    style={s.close}
                    onPress={() => setMonth((d) => addMonth(d, 1))}
                  >
                    <Ionicons
                      name="chevron-forward"
                      size={17}
                      color={C.brand}
                    />
                  </Pressable>
                ) : (
                  <View style={s.spacer} />
                )}
              </View>
              <ScrollView
                style={s.visitList}
                contentContainerStyle={s.visitContent}
              >
                {(view === "assign" && loadingVisits) ||
                (view === "responses" && loadingResponses) ? (
                  <State
                    title="Loading"
                    text="Fetching technician records."
                    loading
                  />
                ) : content.length ? (
                  content.map((v) =>
                    view === "responses" ? (
                      <ResponseCard
                        key={v._visitId}
                        visit={v}
                        onReview={onReview}
                        loading={reviewing === v._visitId}
                      />
                    ) : (
                      <VisitCard
                        key={v._visitId}
                        visit={v}
                        tech={tech}
                        onAssign={assign}
                        loading={processing === v._visitId}
                        readOnly={view === "check"}
                      />
                    ),
                  )
                ) : (
                  <State
                    title={
                      view === "responses"
                        ? "No technician responses"
                        : "No visits found"
                    }
                    text={
                      view === "responses"
                        ? "Photos and issue reports will appear here."
                        : "No records are available."
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
function Action({ icon, title, text, onPress }) {
  return (
    <View style={s.action}>
      <Ionicons name={icon} size={22} color={C.brand} />
      <Text style={s.modalT}>{title}</Text>
      <Text style={s.sub}>{text}</Text>
      <Pressable style={s.primary} onPress={onPress}>
        <Text style={s.whiteText}>{title}</Text>
        <Ionicons name="arrow-forward" size={16} color="#fff" />
      </Pressable>
    </View>
  );
}
export default function AdminManageTechnicians() {
  const [techs, setTechs] = React.useState([]),
    [monthly, setMonthly] = React.useState([]),
    [assigned, setAssigned] = React.useState([]),
    [responses, setResponses] = React.useState([]),
    [loading, setLoading] = React.useState(true),
    [refreshing, setRefreshing] = React.useState(false),
    [error, setError] = React.useState(""),
    [search, setSearch] = React.useState(""),
    [createVisible, setCreateVisible] = React.useState(false),
    [selected, setSelected] = React.useState(null),
    [view, setView] = React.useState("home"),
    [month, setMonth] = React.useState(new Date()),
    [busy, setBusy] = React.useState(false),
    [processing, setProcessing] = React.useState(""),
    [reviewing, setReviewing] = React.useState(""),
    [deleting, setDeleting] = React.useState(false),
    [loadingVisits, setLoadingVisits] = React.useState(false),
    [loadingResponses, setLoadingResponses] = React.useState(false),
    [form, setForm] = React.useState({
      fullName: "",
      mobileNumber: "",
      email: "",
      username: "",
      city: "",
      password: "",
    });
  const fetchTechs = React.useCallback(async ({ refresh = false } = {}) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    try {
      let r = await safeFetch(getApiUrl(TECHS)),
        p = await r.json().catch(() => null);
      if (!r.ok || !p?.success)
        throw Error(p?.message || "Unable to load technicians.");
      setTechs(normalizeTechs(p));
      setError("");
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);
  React.useEffect(() => {
    fetchTechs();
  }, [fetchTechs]);
  React.useEffect(() => {
    if (selected && view === "assign") {
      setLoadingVisits(true);
      safeFetch(getApiUrl(MONTH(monthKey(month))))
        .then((r) => r.json())
        .then((p) => setMonthly(normalizeVisits(p)))
        .catch(() => setMonthly([]))
        .finally(() => setLoadingVisits(false));
    }
  }, [selected, view, month]);
  const filtered = techs.filter((t) =>
    [name(t), t.email, t.mobileNumber, t.city]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  const open = (t) => {
    setSelected(t);
    setAssigned(normalizeVisits(t.assignedVisits, t));
    setResponses([]);
    setMonth(new Date());
    setView("home");
  };
  const close = () => {
    setSelected(null);
    setAssigned([]);
    setResponses([]);
    setView("home");
  };
  const deleteTechnician = () => {
    const technicianId = id(selected);

    if (!technicianId) {
      return Alert.alert("Delete failed", "This technician has no valid ID.");
    }

    Alert.alert(
      "Delete technician",
      `Are you sure you want to delete ${name(selected)}? This action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setDeleting(true);
            try {
              const r = await safeFetch(getApiUrl(RESPONSES(technicianId)), {
                method: "DELETE",
              });
              const p = await r.json().catch(() => null);

              if (!r.ok || !p?.success) {
                throw Error(p?.message || "Unable to delete technician.");
              }

              setTechs((current) =>
                current.filter((technician) => id(technician) !== technicianId),
              );
              close();
              Alert.alert(
                "Technician deleted",
                "The technician was deleted successfully.",
              );
            } catch (e) {
              Alert.alert("Delete failed", e?.message || "Please try again.");
            } finally {
              setDeleting(false);
            }
          },
        },
      ],
    );
  };
  const fetchResponses = async () => {
    setView("responses");
    setLoadingResponses(true);
    try {
      let r = await safeFetch(getApiUrl(RESPONSES(id(selected))));
      let p = await r.json().catch(() => null);
      if (!r.ok || !p?.success) throw Error(p?.message);
      setResponses(
        normalizeVisits(
          p?.data?.assignedVisits || p?.data || p?.assignedVisits || [],
          selected,
        ),
      );
    } catch (e) {
      Alert.alert(
        "Responses unavailable",
        e?.message || "Unable to load responses.",
      );
      setResponses([]);
    } finally {
      setLoadingResponses(false);
    }
  };
  const create = async () => {
    if (!form.fullName || !form.mobileNumber || !form.email || !form.password)
      return Alert.alert(
        "Missing details",
        "Enter name, mobile, email and password.",
      );
    setBusy(true);
    try {
      let r = await safeFetch(getApiUrl(TECHS), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...form, role: "technician", active: true }),
        }),
        p = await r.json().catch(() => null);
      if (!r.ok || !p?.success) throw Error(p?.message);
      setTechs((x) => [...x, normalizeTechs([p?.data || p])[0]]);
      setCreateVisible(false);
    } catch (e) {
      Alert.alert("Create failed", e?.message || "Please try again.");
    } finally {
      setBusy(false);
    }
  };
  const assign = async (v) => {
    setProcessing(v._visitId);
    try {
      let r = await safeFetch(getApiUrl(ASSIGN(v._visitId)), {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            technicianId: id(selected),
            technicianName: name(selected),
            visitId: v._visitId,
            requestId: v._requestId,
            visitIndex: v._visitIndex,
            status: "Assigned",
            assignedAt: new Date().toISOString(),
          }),
        }),
        p = await r.json().catch(() => null);
      if (!r.ok || !p?.success) throw Error(p?.message);
      let x = {
        ...v,
        _assignedTechnicianId: id(selected),
        _assignedTechnicianName: name(selected),
        _status: "Assigned",
      };
      setAssigned((a) => [...a.filter((q) => q._visitId !== x._visitId), x]);
    } catch (e) {
      Alert.alert("Assign failed", e?.message || "Please try again.");
    } finally {
      setProcessing("");
    }
  };
  const review = async (v, reviewStatus) => {
    setReviewing(v._visitId);
    try {
      let r = await safeFetch(getApiUrl(REVIEW(id(selected))), {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            requestId: v._requestId,
            visitId: v._visitId,
            visitIndex: v._visitIndex,
            reviewStatus,
            reviewedAt: new Date().toISOString(),
          }),
        }),
        p = await r.json().catch(() => null);
      if (!r.ok || !p?.success) throw Error(p?.message);
      setResponses((a) =>
        a.map((q) =>
          q._visitId === v._visitId ? { ...q, _reviewStatus: reviewStatus } : q,
        ),
      );
    } catch (e) {
      Alert.alert("Review failed", e?.message || "Please try again.");
    } finally {
      setReviewing("");
    }
  };
  return (
    <SafeAreaView style={s.safe}>
      <ScrollView
        style={s.page}
        contentContainerStyle={s.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchTechs({ refresh: true })}
            colors={[C.brand]}
          />
        }
      >
        <LinearGradient colors={[C.dark, C.brand, C.blue]} style={s.hero}>
          <Text style={s.heroTag}>MANAGE TECHNICIANS</Text>
          <Text style={s.heroTitle}>
            Profiles, assignments and response review.
          </Text>
          <Pressable style={s.heroBtn} onPress={() => setCreateVisible(true)}>
            <Text style={s.heroBtnT}>Create technician profile</Text>
            <Ionicons name="add-circle-outline" size={17} color={'#ffffffa1'} />
          </Pressable>
        </LinearGradient>
        <View style={s.stats}>
          <Mini
            icon="people-outline"
            value={String(techs.length)}
            label="Technicians"
          />
          <Mini
            icon="checkmark-circle-outline"
            value={String(techs.filter((t) => t.active !== false).length)}
            label="Active"
          />
          <Mini
            icon="images-outline"
            value={String(
              techs.reduce((n, t) => n + t.assignedVisits.length, 0),
            )}
            label="Assigned visits"
          />
        </View>
        <View style={s.search}>
          <Ionicons name="search-outline" size={17} color={C.faint} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search technician, email, mobile, city"
            placeholderTextColor={C.faint}
            style={s.searchInput}
          />
        </View>
        <View style={s.section}>
          <Text style={s.sectionT}>Field staff profiles</Text>
          <Pressable style={s.plus} onPress={() => setCreateVisible(true)}>
            <Ionicons name="add" size={18} color="#fff" />
          </Pressable>
        </View>
        {loading ? (
          <State
            title="Loading technicians"
            text="Fetching staff profiles."
            loading
          />
        ) : error ? (
          <State
            title="Could not load technicians"
            text={error}
            retry={fetchTechs}
          />
        ) : (
          filtered.map((t) => (
            <TechCard key={t._localId} tech={t} onOpen={open} />
          ))
        )}
      </ScrollView>
      <Create
        visible={createVisible}
        close={() => setCreateVisible(false)}
        form={form}
        setForm={setForm}
        create={create}
        busy={busy}
      />
      <Profile
        tech={selected}
        visible={!!selected}
        close={close}
        onDelete={deleteTechnician}
        deleting={deleting}
        view={view}
        setView={setView}
        month={month}
        setMonth={setMonth}
        monthly={monthly}
        assigned={assigned}
        responses={responses}
        loadingVisits={loadingVisits}
        loadingResponses={loadingResponses}
        assign={assign}
        onReview={review}
        processing={processing}
        reviewing={reviewing}
        openResponses={fetchResponses}
      />
    </SafeAreaView>
  );
}
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.page },
  page: { flex: 1 },
  content: { padding: 16, paddingBottom: 30 },
  hero: { borderRadius: 18, padding: 18 },
  heroTag: {
    color: "rgba(255,255,255,.75)",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.2,
  },
  heroTitle: {
    color: "#fff",
    fontSize: 21,
    fontWeight: "900",
    marginTop: 7,
    maxWidth: "86%",
  },
  heroBtn: {
    alignSelf: "flex-start",
    marginTop: 18,
    backgroundColor: C.white,
    borderRadius: 12,
    padding: 11,
    flexDirection: "row",
    gap: 7,
    alignItems: "center",
  },
  heroBtnT: { color: '#FFF', fontWeight: "900" },
  stats: { flexDirection: "row", gap: 8, marginVertical: 14 },
  search: {
    height: 45,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 13,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  searchInput: { flex: 1, color: C.text, fontSize: 12, fontWeight: "700" },
  section: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginVertical: 16,
  },
  sectionT: { color: C.text, fontSize: 16, fontWeight: "900" },
  plus: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: C.brand,
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 17,
    padding: 14,
    marginBottom: 12,
    overflow: "hidden",
  },
  rail: { position: "absolute", left: 0, top: 14, bottom: 14, width: 4 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 8,
  },
  person: { flexDirection: "row", alignItems: "center", gap: 9 },
  flex: { flex: 1 },
  avatar: {
    height: 40,
    width: 40,
    borderRadius: 13,
    backgroundColor: C.blueSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { color: C.text, fontSize: 14, fontWeight: "900" },
  sub: { color: C.muted, fontSize: 10.5, fontWeight: "700", marginTop: 3 },
  badge: {
    overflow: "hidden",
    borderRadius: 99,
    paddingHorizontal: 8,
    paddingVertical: 5,
    fontSize: 9,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  grid: { flexDirection: "row", gap: 7, marginTop: 12 },
  mini: {
    flex: 1,
    backgroundColor: C.alt,
    borderWidth: 1,
    borderColor: "#EDF2F7",
    borderRadius: 11,
    padding: 8,
  },
  miniV: { color: C.text, fontSize: 10, fontWeight: "900", marginTop: 6 },
  miniL: { color: C.muted, fontSize: 8.5, fontWeight: "800", marginTop: 2 },
  open: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 3,
    marginTop: 11,
  },
  openT: { color: C.brand, fontSize: 11, fontWeight: "900" },
  address: {
    backgroundColor: C.alt,
    borderRadius: 11,
    padding: 9,
    marginTop: 10,
    flexDirection: "row",
    gap: 6,
  },
  addr: {
    flex: 1,
    color: C.text,
    fontSize: 10.5,
    lineHeight: 15,
    fontWeight: "700",
  },
  primary: {
    height: 43,
    borderRadius: 13,
    backgroundColor: C.brand,
    marginTop: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  whiteText: { color: "#fff", fontSize: 11, fontWeight: "900" },
  state: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 17,
    padding: 27,
    alignItems: "center",
  },
  stateT: { color: C.text, fontSize: 14, fontWeight: "900", marginTop: 10 },
  stateP: { color: C.muted, fontSize: 11, textAlign: "center", marginTop: 5 },
  retry: {
    backgroundColor: C.brand,
    borderRadius: 10,
    padding: 9,
    marginTop: 13,
  },
  overlay: {
    flex: 1,
    justifyContent: "center",
    padding: 18,
    backgroundColor: "rgba(15,23,42,.6)",
  },
  createBox: {
    maxHeight: "84%",
    backgroundColor: C.surface,
    borderRadius: 18,
    padding: 14,
  },
  close: {
    height: 34,
    width: 34,
    borderRadius: 11,
    backgroundColor: C.alt,
    alignItems: "center",
    justifyContent: "center",
  },
  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 9,
    height: 34,
    borderRadius: 11,
    backgroundColor: C.redSoft,
  },
  deleteText: { color: C.red, fontSize: 10, fontWeight: "900" },
  form: { paddingTop: 12 },
  input: {
    height: 45,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.alt,
    borderRadius: 12,
    paddingHorizontal: 12,
    color: C.text,
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 9,
  },
  sheetOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(15,23,42,.56)",
  },
  sheet: {
    height: "90%",
    backgroundColor: C.page,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    padding: 16,
  },
  actionList: { gap: 12, paddingTop: 14 },
  action: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 17,
    padding: 16,
  },
  toolbar: {
    marginTop: 12,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 14,
    padding: 9,
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
  },
  spacer: { width: 34 },
  toolbarLabel: {
    color: C.muted,
    fontSize: 8.5,
    fontWeight: "900",
    letterSpacing: 0.7,
    textAlign: "center",
  },
  toolbarTitle: {
    color: C.text,
    fontSize: 12,
    fontWeight: "900",
    textAlign: "center",
    marginTop: 2,
  },
  visitList: { flex: 1, marginTop: 12 },
  visitContent: { paddingBottom: 25 },
  photos: { flexDirection: "row", gap: 10, marginTop: 12 },
  photoWrap: { flex: 1 },
  photo: {
    height: 116,
    width: "100%",
    borderRadius: 12,
    backgroundColor: C.alt,
  },
  noPhoto: {
    height: 116,
    borderRadius: 12,
    backgroundColor: C.alt,
    alignItems: "center",
    justifyContent: "center",
  },
  photoLabel: { color: C.muted, fontSize: 9, fontWeight: "800", marginTop: 4 },
  issue: {
    flexDirection: "row",
    gap: 7,
    backgroundColor: C.redSoft,
    borderRadius: 11,
    padding: 10,
    marginTop: 11,
  },
  issueText: { flex: 1, color: C.red, fontSize: 10.5, fontWeight: "700" },
  review: { flexDirection: "row", gap: 9, marginTop: 12 },
  reject: {
    flex: 1,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#F0CACA",
    backgroundColor: C.redSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  approve: {
    flex: 1,
    height: 42,
    borderRadius: 12,
    backgroundColor: C.green,
    alignItems: "center",
    justifyContent: "center",
  },
  disabled: { opacity: 0.65 },
});
