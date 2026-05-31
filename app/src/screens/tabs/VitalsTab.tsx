import { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../../lib/api";
import { ApiResponse } from "../../types";
import { colors } from "../../lib/colors";

interface Vital {
  id: string;
  type: string;
  value: string;
  unit: string;
  recordedAt: string;
}

const VITAL_TYPES = [
  { key: "heart_rate", label: "Heart Rate", unit: "bpm", icon: "heart" as const, color: "#ef4444", lightBg: "#fef2f2", textColor: "#dc2626" },
  { key: "blood_pressure", label: "Blood Pressure", unit: "mmHg", icon: "pulse" as const, color: "#3b82f6", lightBg: "#eff6ff", textColor: "#2563eb" },
  { key: "temperature", label: "Temperature", unit: "°F", icon: "thermometer" as const, color: "#f97316", lightBg: "#fff7ed", textColor: "#ea580c" },
  { key: "spo2", label: "SpO2", unit: "%", icon: "cloud" as const, color: "#06b6d4", lightBg: "#ecfeff", textColor: "#0891b2" },
  { key: "blood_sugar", label: "Blood Sugar", unit: "mg/dL", icon: "water" as const, color: "#8b5cf6", lightBg: "#f5f3ff", textColor: "#7c3aed" },
  { key: "weight", label: "Weight", unit: "kg", icon: "fitness" as const, color: "#10b981", lightBg: "#ecfdf5", textColor: "#059669" },
];

function getVitalConfig(type: string) {
  return VITAL_TYPES.find((v) => v.key === type) || VITAL_TYPES[0];
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function VitalsTab() {
  const [vitals, setVitals] = useState<Vital[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [filterType, setFilterType] = useState("all");
  const [showFilterPicker, setShowFilterPicker] = useState(false);
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [formData, setFormData] = useState({ type: "heart_rate", value: "", unit: "bpm" });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchVitals();
  }, []);

  async function fetchVitals() {
    setLoading(true);
    try {
      const res = await api.get<ApiResponse<Vital[]>>("/patient/vitals");
      if (res.data) setVitals(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load vitals");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit() {
    if (!formData.value.trim()) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await api.post<ApiResponse<Vital>>("/patient/vitals", {
        type: formData.type,
        value: formData.value.trim(),
        unit: formData.unit,
      });
      if (res.data) {
        setVitals((prev) => [res.data!, ...prev]);
        setFormData((prev) => ({ ...prev, value: "" }));
        setShowForm(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save vital");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await api.delete<ApiResponse>(`/patient/vitals/${id}`);
      setVitals((prev) => prev.filter((v) => v.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete vital");
    }
  }

  function handleTypeChange(type: string) {
    const config = getVitalConfig(type);
    setFormData({ type, value: "", unit: config.unit });
    setShowTypePicker(false);
  }

  const filtered = useMemo(
    () => (filterType === "all" ? vitals : vitals.filter((v) => v.type === filterType)),
    [vitals, filterType],
  );

  const latestByType = useMemo(() => {
    const map: Record<string, Vital> = {};
    for (const v of vitals) {
      if (!map[v.type] || new Date(v.recordedAt) > new Date(map[v.type].recordedAt)) {
        map[v.type] = v;
      }
    }
    return map;
  }, [vitals]);

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={colors.blue[600]} />
      </View>
    );
  }

  const selectedTypeConfig = getVitalConfig(formData.type);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>Vitals Tracking</Text>
          <Text style={styles.subtitle}>Monitor your health metrics over time</Text>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowForm(!showForm)}
        >
          <Ionicons name={showForm ? "close" : "add"} size={18} color={colors.white} />
          <Text style={styles.addButtonText}>{showForm ? "Cancel" : "Record"}</Text>
        </TouchableOpacity>
      </View>

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {showForm && (
        <View style={styles.formCard}>
          <View style={styles.formField}>
            <Text style={styles.formLabel}>Type</Text>
            <TouchableOpacity
              style={styles.picker}
              onPress={() => setShowTypePicker(!showTypePicker)}
            >
              <Text style={styles.pickerText}>{selectedTypeConfig.label}</Text>
              <Ionicons name="chevron-down" size={16} color={colors.slate[400]} />
            </TouchableOpacity>
            {showTypePicker && (
              <View style={styles.dropdown}>
                {VITAL_TYPES.map((t) => (
                  <TouchableOpacity
                    key={t.key}
                    style={styles.dropdownItem}
                    onPress={() => handleTypeChange(t.key)}
                  >
                    <Text style={styles.dropdownText}>{t.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          <View style={styles.formRow}>
            <View style={[styles.formField, { flex: 1 }]}>
              <Text style={styles.formLabel}>Value</Text>
              <TextInput
                style={styles.input}
                value={formData.value}
                onChangeText={(v) => setFormData((prev) => ({ ...prev, value: v }))}
                placeholder={formData.type === "blood_pressure" ? "120/80" : "Enter value"}
                placeholderTextColor={colors.slate[400]}
                keyboardType="default"
              />
            </View>
            <View style={[styles.formField, { width: 80 }]}>
              <Text style={styles.formLabel}>Unit</Text>
              <View style={[styles.input, styles.unitBox]}>
                <Text style={styles.unitText}>{formData.unit}</Text>
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.submitButton, (!formData.value.trim() || submitting) && styles.submitDisabled]}
            onPress={handleSubmit}
            disabled={!formData.value.trim() || submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <>
                <Ionicons name="add" size={16} color={colors.white} />
                <Text style={styles.submitText}>Save</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.cardsGrid}>
        {VITAL_TYPES.map(({ key, label, unit, icon, color, lightBg, textColor }) => {
          const latest = latestByType[key];
          return (
            <View key={key} style={[styles.vitalCard, { backgroundColor: lightBg }]}>
              <View style={styles.vitalCardHeader}>
                <View style={[styles.iconBox, { backgroundColor: color }]}>
                  <Ionicons name={icon} size={14} color={colors.white} />
                </View>
                <Text style={styles.vitalLabel}>{label}</Text>
              </View>
              {latest ? (
                <>
                  <Text style={[styles.vitalValue, { color: textColor }]}>
                    {latest.value}
                    <Text style={styles.vitalUnit}> {unit}</Text>
                  </Text>
                  <Text style={styles.vitalDate}>{formatDate(latest.recordedAt)}</Text>
                </>
              ) : (
                <Text style={styles.noData}>No data</Text>
              )}
            </View>
          );
        })}
      </View>

      <View style={styles.historySection}>
        <View style={styles.historyHeader}>
          <Ionicons name="trending-up" size={16} color={colors.slate[400]} />
          <Text style={styles.historyTitle}>History</Text>
          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => setShowFilterPicker(!showFilterPicker)}
          >
            <Text style={styles.filterText}>
              {filterType === "all" ? "All types" : getVitalConfig(filterType).label}
            </Text>
            <Ionicons name="chevron-down" size={14} color={colors.slate[400]} />
          </TouchableOpacity>
        </View>

        {showFilterPicker && (
          <View style={styles.filterDropdown}>
            <TouchableOpacity
              style={styles.dropdownItem}
              onPress={() => { setFilterType("all"); setShowFilterPicker(false); }}
            >
              <Text style={styles.dropdownText}>All types</Text>
            </TouchableOpacity>
            {VITAL_TYPES.map((t) => (
              <TouchableOpacity
                key={t.key}
                style={styles.dropdownItem}
                onPress={() => { setFilterType(t.key); setShowFilterPicker(false); }}
              >
                <Text style={styles.dropdownText}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="pulse" size={32} color={colors.slate[300]} />
            <Text style={styles.emptyText}>No vitals recorded yet</Text>
          </View>
        ) : (
          filtered.map((vital) => {
            const config = getVitalConfig(vital.type);
            return (
              <View key={vital.id} style={styles.historyItem}>
                <View style={[styles.historyIcon, { backgroundColor: config.color }]}>
                  <Ionicons name={config.icon} size={14} color={colors.white} />
                </View>
                <View style={styles.historyInfo}>
                  <Text style={styles.historyName}>{config.label}</Text>
                  <Text style={styles.historyDate}>{formatDate(vital.recordedAt)}</Text>
                </View>
                <View style={styles.historyValueCol}>
                  <Text style={[styles.historyValue, { color: config.textColor }]}>{vital.value}</Text>
                  <Text style={styles.historyUnit}>{vital.unit}</Text>
                </View>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDelete(vital.id)}
                >
                  <Ionicons name="trash-outline" size={16} color={colors.slate[300]} />
                </TouchableOpacity>
              </View>
            );
          })
        )}
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  loader: { flex: 1, alignItems: "center", justifyContent: "center" },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  title: { fontSize: 18, fontWeight: "700", color: colors.slate[800] },
  subtitle: { fontSize: 12, color: colors.slate[400], marginTop: 2 },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.blue[600],
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  addButtonText: { color: colors.white, fontSize: 13, fontWeight: "600" },
  errorBox: {
    backgroundColor: colors.red[50],
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  errorText: { color: colors.red[600], fontSize: 13 },
  formCard: {
    backgroundColor: colors.slate[50],
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.slate[200],
    marginBottom: 20,
    gap: 12,
  },
  formField: { gap: 6 },
  formRow: { flexDirection: "row", gap: 12 },
  formLabel: { fontSize: 11, fontWeight: "600", color: colors.slate[500] },
  input: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.slate[200],
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.slate[900],
  },
  unitBox: { justifyContent: "center" },
  unitText: { fontSize: 14, color: colors.slate[500] },
  picker: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.slate[200],
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  pickerText: { fontSize: 14, color: colors.slate[900] },
  dropdown: {
    backgroundColor: colors.white,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.slate[200],
    marginTop: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  dropdownItem: { paddingHorizontal: 14, paddingVertical: 10 },
  dropdownText: { fontSize: 14, color: colors.slate[900] },
  submitButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: colors.blue[600],
    paddingVertical: 12,
    borderRadius: 12,
  },
  submitDisabled: { opacity: 0.5 },
  submitText: { color: colors.white, fontSize: 14, fontWeight: "600" },
  cardsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 24,
  },
  vitalCard: {
    width: "48%" as unknown as number,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.slate[100],
  },
  vitalCardHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  iconBox: { width: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  vitalLabel: { fontSize: 11, fontWeight: "500", color: colors.slate[500] },
  vitalValue: { fontSize: 20, fontWeight: "700" },
  vitalUnit: { fontSize: 11, fontWeight: "400", color: colors.slate[400] },
  vitalDate: { fontSize: 9, color: colors.slate[400], marginTop: 2 },
  noData: { fontSize: 13, color: colors.slate[300], marginTop: 4 },
  historySection: { marginBottom: 20 },
  historyHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 14,
  },
  historyTitle: { fontSize: 14, fontWeight: "600", color: colors.slate[700], flex: 1 },
  filterButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderColor: colors.slate[200],
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: colors.white,
  },
  filterText: { fontSize: 12, color: colors.slate[700] },
  filterDropdown: {
    backgroundColor: colors.white,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.slate[200],
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  emptyState: { alignItems: "center", paddingVertical: 40, gap: 8 },
  emptyText: { fontSize: 14, color: colors.slate[400] },
  historyItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.white,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.slate[100],
    marginBottom: 8,
  },
  historyIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  historyInfo: { flex: 1 },
  historyName: { fontSize: 13, fontWeight: "500", color: colors.slate[700] },
  historyDate: { fontSize: 11, color: colors.slate[400], marginTop: 2 },
  historyValueCol: { alignItems: "flex-end" },
  historyValue: { fontSize: 18, fontWeight: "700" },
  historyUnit: { fontSize: 10, color: colors.slate[400] },
  deleteButton: { padding: 6 },
});
