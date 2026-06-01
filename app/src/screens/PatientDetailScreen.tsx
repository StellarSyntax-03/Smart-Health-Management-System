import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { api } from "../lib/api";
import { colors } from "../lib/colors";
import { ApiResponse } from "../types";
import { AppStackParamList } from "../navigation/types";
import { AddVitalModal, AddPrescriptionModal, AddReportModal } from "./DoctorActionModals";

type Props = NativeStackScreenProps<AppStackParamList, "PatientDetail">;

interface Vital {
  id: string;
  type: string;
  value: string;
  unit: string;
  recordedAt: string;
}

interface Medication {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
}

interface Prescription {
  id: string;
  date: string;
  notes: string | null;
  fileUrl: string | null;
  fileName: string | null;
  medications: Medication[];
}

interface MedicalReport {
  id: string;
  name: string;
  date: string;
  type: string;
  url: string;
}

interface MedicalRecord {
  id: string;
  date: string;
  condition: string;
  notes: string | null;
  type: string;
}

interface PatientData {
  id: string;
  age: number;
  gender: string;
  bloodGroup: string | null;
  address: string | null;
  allergies: string[];
  chronicConditions: string[];
  user: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
  };
  vitals: Vital[];
  prescriptions: Prescription[];
  reports: MedicalReport[];
  records: MedicalRecord[];
}

type SectionKey = "overview" | "vitals" | "prescriptions" | "reports" | "records";

const SECTIONS: { key: SectionKey; label: string; icon: string }[] = [
  { key: "overview", label: "Overview", icon: "person" },
  { key: "vitals", label: "Vitals", icon: "pulse" },
  { key: "prescriptions", label: "Rx", icon: "document-text" },
  { key: "reports", label: "Reports", icon: "folder" },
  { key: "records", label: "Records", icon: "clipboard" },
];

export default function PatientDetailScreen({ route, navigation }: Props) {
  const { patientId, patientName } = route.params;
  const [data, setData] = useState<PatientData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [activeSection, setActiveSection] = useState<SectionKey>("overview");
  const [showAddVital, setShowAddVital] = useState(false);
  const [showAddRx, setShowAddRx] = useState(false);
  const [showAddReport, setShowAddReport] = useState(false);

  const fetchDetails = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError("");
      try {
        const res = await api.get<ApiResponse<PatientData>>(
          `/doctor/patients/${patientId}`
        );
        if (res.success && res.data) setData(res.data);
      } catch (err: any) {
        setError(err.message || "Failed to load patient details");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [patientId]
  );

  useEffect(() => {
    fetchDetails();
  }, [fetchDetails]);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const formatDateTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  function renderOverview() {
    if (!data) return null;
    return (
      <>
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Ionicons name="person" size={16} color={colors.emerald[600]} />
            <Text style={styles.sectionTitle}>Personal Info</Text>
          </View>
          <InfoRow label="Name" value={data.user.name} />
          <InfoRow label="Age" value={`${data.age} years`} />
          <InfoRow label="Gender" value={data.gender} />
          {data.bloodGroup && <InfoRow label="Blood Group" value={data.bloodGroup} />}
          {data.user.email && <InfoRow label="Email" value={data.user.email} />}
          {data.user.phone && <InfoRow label="Phone" value={data.user.phone} />}
          {data.address && <InfoRow label="Address" value={data.address} />}
        </View>

        {data.allergies.length > 0 && (
          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <Ionicons name="warning" size={16} color={colors.red[500]} />
              <Text style={styles.sectionTitle}>Allergies</Text>
            </View>
            <View style={styles.tagRow}>
              {data.allergies.map((a) => (
                <View key={a} style={styles.tagAllergy}>
                  <Text style={styles.tagAllergyText}>{a}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {data.chronicConditions.length > 0 && (
          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <Ionicons name="heart" size={16} color="#d97706" />
              <Text style={styles.sectionTitle}>Chronic Conditions</Text>
            </View>
            <View style={styles.tagRow}>
              {data.chronicConditions.map((c) => (
                <View key={c} style={styles.tagCondition}>
                  <Text style={styles.tagConditionText}>{c}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </>
    );
  }

  function renderVitals() {
    if (!data || data.vitals.length === 0) {
      return <EmptySection icon="pulse-outline" text="No vitals recorded" />;
    }

    const grouped: Record<string, Vital[]> = {};
    for (const v of data.vitals) {
      if (!grouped[v.type]) grouped[v.type] = [];
      grouped[v.type].push(v);
    }

    return (
      <>
        {Object.entries(grouped).map(([type, vitals]) => (
          <View key={type} style={styles.card}>
            <Text style={styles.vitalType}>{type}</Text>
            {vitals.map((v) => (
              <View key={v.id} style={styles.vitalRow}>
                <Text style={styles.vitalValue}>
                  {v.value} <Text style={styles.vitalUnit}>{v.unit}</Text>
                </Text>
                <Text style={styles.vitalDate}>{formatDateTime(v.recordedAt)}</Text>
              </View>
            ))}
          </View>
        ))}
      </>
    );
  }

  function renderPrescriptions() {
    if (!data || data.prescriptions.length === 0) {
      return <EmptySection icon="document-text-outline" text="No prescriptions" />;
    }

    return (
      <>
        {data.prescriptions.map((rx) => (
          <View key={rx.id} style={styles.card}>
            <View style={styles.rxHeader}>
              <Text style={styles.rxDate}>{formatDate(rx.date)}</Text>
              <View style={styles.rxBadges}>
                {rx.medications.length > 0 && (
                  <View style={styles.countBadge}>
                    <Text style={styles.countBadgeText}>
                      {rx.medications.length} med{rx.medications.length > 1 ? "s" : ""}
                    </Text>
                  </View>
                )}
                {rx.fileUrl && (
                  <TouchableOpacity
                    style={styles.viewFileBtn}
                    onPress={() => Linking.openURL(rx.fileUrl!)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="eye" size={12} color={colors.emerald[600]} />
                    <Text style={styles.viewFileBtnText}>View Rx</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
            {rx.fileName && (
              <TouchableOpacity
                style={styles.fileRow}
                onPress={() => Linking.openURL(rx.fileUrl!)}
                activeOpacity={0.7}
              >
                <Ionicons name="document-attach" size={16} color={colors.emerald[600]} />
                <Text style={styles.fileName} numberOfLines={1}>{rx.fileName}</Text>
              </TouchableOpacity>
            )}
            {rx.notes && <Text style={styles.rxNotes}>{rx.notes}</Text>}
            {rx.medications.length > 0 && (
              <View style={styles.medsSection}>
                <Text style={styles.medsLabel}>Medications</Text>
                {rx.medications.map((med) => (
                  <View key={med.id} style={styles.medRow}>
                    <View style={styles.medDot} />
                    <View style={styles.medInfo}>
                      <Text style={styles.medName}>{med.name}</Text>
                      <Text style={styles.medDetail}>
                        {med.dosage} | {med.frequency} | {med.duration}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        ))}
      </>
    );
  }

  function renderReports() {
    if (!data || data.reports.length === 0) {
      return <EmptySection icon="folder-outline" text="No reports uploaded" />;
    }

    return (
      <>
        {data.reports.map((r) => (
          <View key={r.id} style={styles.card}>
            <View style={styles.reportRow}>
              <View style={styles.reportIcon}>
                <Ionicons name="document-attach" size={20} color={colors.emerald[600]} />
              </View>
              <View style={styles.reportInfo}>
                <Text style={styles.reportName}>{r.name}</Text>
                <Text style={styles.reportMeta}>
                  {r.type} | {formatDate(r.date)}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.reportViewBtn}
                onPress={() => Linking.openURL(r.url)}
                activeOpacity={0.7}
              >
                <Ionicons name="open-outline" size={16} color={colors.emerald[600]} />
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </>
    );
  }

  function renderRecords() {
    if (!data || data.records.length === 0) {
      return <EmptySection icon="clipboard-outline" text="No medical records" />;
    }

    return (
      <>
        {data.records.map((r) => (
          <View key={r.id} style={styles.card}>
            <View style={styles.recordHeader}>
              <Text style={styles.recordCondition}>{r.condition}</Text>
              <View style={styles.recordTypeBadge}>
                <Text style={styles.recordTypeText}>{r.type}</Text>
              </View>
            </View>
            <Text style={styles.recordDate}>{formatDate(r.date)}</Text>
            {r.notes && <Text style={styles.recordNotes}>{r.notes}</Text>}
          </View>
        ))}
      </>
    );
  }

  function renderSection() {
    switch (activeSection) {
      case "overview":
        return renderOverview();
      case "vitals":
        return renderVitals();
      case "prescriptions":
        return renderPrescriptions();
      case "reports":
        return renderReports();
      case "records":
        return renderRecords();
    }
  }

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color={colors.emerald[600]} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.loaderContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => fetchDetails()}>
          <Text style={styles.retryBtnText}>Retry</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.backLink} onPress={() => navigation.goBack()}>
          <Text style={styles.backLinkText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const initials = patientName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
          >
            <Ionicons name="arrow-back" size={22} color={colors.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            Patient Details
          </Text>
          <View style={{ width: 34 }} />
        </View>
        <View style={styles.patientHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={styles.patientMeta}>
            <Text style={styles.patientName}>{patientName}</Text>
            {data && (
              <Text style={styles.patientSub}>
                {data.age} yrs | {data.gender}
                {data.bloodGroup ? ` | ${data.bloodGroup}` : ""}
              </Text>
            )}
          </View>
        </View>
      </View>

      <View style={styles.tabBarContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabBar}
        >
          {SECTIONS.map((s) => {
            const isActive = activeSection === s.key;
            return (
              <TouchableOpacity
                key={s.key}
                style={[styles.tab, isActive && styles.tabActive]}
                onPress={() => setActiveSection(s.key)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={s.icon as any}
                  size={14}
                  color={isActive ? colors.white : colors.slate[400]}
                />
                <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                  {s.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchDetails(true)}
            tintColor={colors.emerald[600]}
          />
        }
      >
        {renderSection()}
      </ScrollView>

      {(activeSection === "vitals" || activeSection === "prescriptions" || activeSection === "reports") && (
        <TouchableOpacity
          style={styles.fab}
          activeOpacity={0.8}
          onPress={() => {
            if (activeSection === "vitals") setShowAddVital(true);
            else if (activeSection === "prescriptions") setShowAddRx(true);
            else if (activeSection === "reports") setShowAddReport(true);
          }}
        >
          <Ionicons name="add" size={26} color={colors.white} />
        </TouchableOpacity>
      )}

      <AddVitalModal
        visible={showAddVital}
        patientId={patientId}
        onClose={() => setShowAddVital(false)}
        onAdded={() => fetchDetails(true)}
      />
      <AddPrescriptionModal
        visible={showAddRx}
        patientId={patientId}
        onClose={() => setShowAddRx(false)}
        onAdded={() => fetchDetails(true)}
      />
      <AddReportModal
        visible={showAddReport}
        patientId={patientId}
        onClose={() => setShowAddReport(false)}
        onAdded={() => fetchDetails(true)}
      />
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function EmptySection({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={styles.emptySection}>
      <Ionicons name={icon as any} size={40} color={colors.slate[300]} />
      <Text style={styles.emptySectionText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.slate[50],
  },
  loaderContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.slate[50],
    padding: 20,
  },
  header: {
    backgroundColor: colors.emerald[600],
    paddingTop: 56,
    paddingBottom: 18,
    paddingHorizontal: 20,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "600",
  },
  patientHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "rgba(255,255,255,0.25)",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: "700",
  },
  patientMeta: {
    flex: 1,
  },
  patientName: {
    color: colors.white,
    fontSize: 20,
    fontWeight: "700",
  },
  patientSub: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 13,
    marginTop: 2,
  },
  tabBarContainer: {
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate[100],
  },
  tabBar: {
    flexDirection: "row",
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 6,
  },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: colors.slate[50],
  },
  tabActive: {
    backgroundColor: colors.emerald[600],
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: colors.slate[400],
  },
  tabLabelActive: {
    color: colors.white,
    fontWeight: "600",
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate[100],
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.slate[700],
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 7,
  },
  infoLabel: {
    fontSize: 13,
    color: colors.slate[400],
    fontWeight: "500",
  },
  infoValue: {
    fontSize: 14,
    color: colors.slate[800],
    fontWeight: "500",
    flexShrink: 1,
    textAlign: "right",
    maxWidth: "60%",
  },
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  tagAllergy: {
    backgroundColor: colors.red[50],
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  tagAllergyText: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.red[500],
  },
  tagCondition: {
    backgroundColor: "#fffbeb",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  tagConditionText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#d97706",
  },
  emptySection: {
    alignItems: "center",
    paddingVertical: 48,
  },
  emptySectionText: {
    fontSize: 14,
    color: colors.slate[400],
    marginTop: 8,
  },
  vitalType: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.slate[700],
    marginBottom: 8,
  },
  vitalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: colors.slate[50],
  },
  vitalValue: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.emerald[600],
  },
  vitalUnit: {
    fontSize: 12,
    fontWeight: "400",
    color: colors.slate[400],
  },
  vitalDate: {
    fontSize: 11,
    color: colors.slate[400],
  },
  rxHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  rxBadges: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  rxDate: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.slate[700],
  },
  rxNotes: {
    fontSize: 13,
    color: colors.slate[500],
    marginBottom: 10,
    fontStyle: "italic",
  },
  countBadge: {
    backgroundColor: colors.emerald[50],
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  countBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.emerald[600],
  },
  viewFileBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.emerald[50],
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  viewFileBtnText: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.emerald[600],
  },
  fileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.slate[50],
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
  },
  fileName: {
    fontSize: 13,
    color: colors.slate[600],
    flex: 1,
  },
  medsSection: {
    marginTop: 4,
  },
  medsLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.slate[500],
    marginBottom: 4,
  },
  medRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingVertical: 6,
  },
  medDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.emerald[600],
    marginTop: 6,
  },
  medInfo: {
    flex: 1,
  },
  medName: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.slate[800],
  },
  medDetail: {
    fontSize: 12,
    color: colors.slate[500],
    marginTop: 1,
  },
  reportRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  reportIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.emerald[50],
    alignItems: "center",
    justifyContent: "center",
  },
  reportInfo: {
    flex: 1,
  },
  reportName: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.slate[800],
  },
  reportMeta: {
    fontSize: 12,
    color: colors.slate[400],
    marginTop: 2,
  },
  reportViewBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.emerald[50],
    alignItems: "center",
    justifyContent: "center",
  },
  recordHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  recordCondition: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.slate[800],
    flex: 1,
  },
  recordTypeBadge: {
    backgroundColor: colors.slate[100],
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  recordTypeText: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.slate[500],
  },
  recordDate: {
    fontSize: 12,
    color: colors.slate[400],
    marginBottom: 4,
  },
  recordNotes: {
    fontSize: 13,
    color: colors.slate[600],
    marginTop: 4,
  },
  errorText: {
    color: colors.red[500],
    fontSize: 14,
    textAlign: "center",
    marginBottom: 12,
  },
  retryBtn: {
    backgroundColor: colors.emerald[600],
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryBtnText: {
    color: colors.white,
    fontWeight: "600",
    fontSize: 14,
  },
  backLink: {
    marginTop: 12,
  },
  backLinkText: {
    color: colors.emerald[600],
    fontSize: 14,
    fontWeight: "500",
  },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 30,
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.emerald[600],
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
});
