import { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../../lib/api";
import { ApiResponse } from "../../types";
import { colors } from "../../lib/colors";

interface MedicationLog {
  id: string;
  medicationId: string;
  date: string;
  timeSlot: string;
  taken: boolean;
  takenAt: string | null;
}

interface MedicationItem {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  logs: MedicationLog[];
  prescription: { date: string; notes: string | null };
}

interface Adherence {
  total: number;
  taken: number;
  missed: number;
  percentage: number;
}

const SLOT_CONFIG: Record<string, { label: string; icon: string; color: string; bgColor: string }> = {
  morning: { label: "Morning", icon: "sunny", color: "#f59e0b", bgColor: "#fffbeb" },
  afternoon: { label: "Afternoon", icon: "partly-sunny", color: "#f97316", bgColor: "#fff7ed" },
  evening: { label: "Evening", icon: "cloudy-night", color: "#6366f1", bgColor: "#eef2ff" },
  night: { label: "Night", icon: "moon", color: "#475569", bgColor: "#f1f5f9" },
};

const SLOT_ORDER = ["morning", "afternoon", "evening", "night"];

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function MedicationsTab() {
  const [medications, setMedications] = useState<MedicationItem[]>([]);
  const [adherence, setAdherence] = useState<Adherence | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    setError("");
    try {
      const [scheduleRes, adherenceRes] = await Promise.all([
        api.get<ApiResponse<MedicationItem[]>>("/patient/medications"),
        api.get<ApiResponse<Adherence>>("/patient/medications/adherence"),
      ]);
      if (scheduleRes.data) setMedications(scheduleRes.data);
      if (adherenceRes.data) setAdherence(adherenceRes.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load medications");
    } finally {
      setLoading(false);
    }
  }

  async function handleToggle(logId: string) {
    setTogglingIds((prev) => new Set(prev).add(logId));
    try {
      const res = await api.patch<ApiResponse<MedicationLog>>(
        `/patient/medications/${logId}/toggle`,
      );
      if (res.data) {
        setMedications((prev) =>
          prev.map((med) => ({
            ...med,
            logs: med.logs.map((log) => (log.id === logId ? res.data! : log)),
          })),
        );
        const adherenceRes = await api.get<ApiResponse<Adherence>>("/patient/medications/adherence");
        if (adherenceRes.data) setAdherence(adherenceRes.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setTogglingIds((prev) => {
        const next = new Set(prev);
        next.delete(logId);
        return next;
      });
    }
  }

  const grouped = useMemo(() => {
    const map: Record<string, { medication: MedicationItem; log: MedicationLog }[]> = {};
    for (const slot of SLOT_ORDER) map[slot] = [];
    for (const med of medications) {
      for (const log of med.logs) {
        if (map[log.timeSlot]) {
          map[log.timeSlot].push({ medication: med, log });
        }
      }
    }
    return Object.entries(map).filter(([, items]) => items.length > 0);
  }, [medications]);

  const todayTaken = useMemo(() => {
    let taken = 0;
    let total = 0;
    for (const med of medications) {
      for (const log of med.logs) {
        total++;
        if (log.taken) taken++;
      }
    }
    return { taken, total };
  }, [medications]);

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={colors.blue[600]} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.title}>Medication Reminders</Text>
        <Text style={styles.subtitle}>Track your daily medication schedule</Text>
      </View>

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <View style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: "#eff6ff", borderColor: "#dbeafe" }]}>
          <Text style={[styles.statLabel, { color: "#93c5fd" }]}>Today's Progress</Text>
          <Text style={[styles.statValue, { color: colors.blue[600] }]}>
            {todayTaken.taken}/{todayTaken.total}
          </Text>
          <Text style={[styles.statSub, { color: "#93c5fd" }]}>doses taken</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: "#ecfdf5", borderColor: "#a7f3d0" }]}>
          <Text style={[styles.statLabel, { color: "#6ee7b7" }]}>7-Day</Text>
          <Text style={[styles.statValue, { color: "#059669" }]}>
            {adherence?.percentage ?? 0}%
          </Text>
          <Text style={[styles.statSub, { color: "#6ee7b7" }]}>adherence</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: "#fffbeb", borderColor: "#fde68a" }]}>
          <Text style={[styles.statLabel, { color: "#fcd34d" }]}>Missed</Text>
          <Text style={[styles.statValue, { color: "#d97706" }]}>{adherence?.missed ?? 0}</Text>
          <Text style={[styles.statSub, { color: "#fcd34d" }]}>7 days</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: "#f5f3ff", borderColor: "#ddd6fe" }]}>
          <Text style={[styles.statLabel, { color: "#c4b5fd" }]}>Active</Text>
          <Text style={[styles.statValue, { color: "#7c3aed" }]}>{medications.length}</Text>
          <Text style={[styles.statSub, { color: "#c4b5fd" }]}>meds</Text>
        </View>
      </View>

      {medications.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="medical" size={32} color={colors.slate[300]} />
          <Text style={styles.emptyText}>No medications prescribed yet</Text>
          <Text style={styles.emptySub}>Prescriptions with medications will appear here</Text>
        </View>
      ) : (
        grouped.map(([slot, items]) => {
          const config = SLOT_CONFIG[slot];
          const allDone = items.every((i) => i.log.taken);

          return (
            <View key={slot} style={styles.slotSection}>
              <View style={styles.slotHeader}>
                <View style={[styles.slotIcon, { backgroundColor: config.bgColor }]}>
                  <Ionicons name={config.icon as any} size={16} color={config.color} />
                </View>
                <Text style={styles.slotTitle}>{config.label}</Text>
                {allDone && (
                  <View style={styles.allDoneBadge}>
                    <Ionicons name="checkmark" size={12} color="#10b981" />
                    <Text style={styles.allDoneText}>All done</Text>
                  </View>
                )}
              </View>

              {items.map(({ medication, log }) => (
                <View
                  key={log.id}
                  style={[
                    styles.medItem,
                    log.taken && styles.medItemDone,
                  ]}
                >
                  <TouchableOpacity
                    onPress={() => handleToggle(log.id)}
                    disabled={togglingIds.has(log.id)}
                    style={[
                      styles.checkbox,
                      log.taken && styles.checkboxDone,
                    ]}
                  >
                    {togglingIds.has(log.id) ? (
                      <ActivityIndicator size="small" color={colors.slate[400]} />
                    ) : log.taken ? (
                      <Ionicons name="checkmark" size={14} color={colors.white} />
                    ) : null}
                  </TouchableOpacity>

                  <View style={styles.medInfo}>
                    <Text style={[styles.medName, log.taken && styles.medNameDone]}>
                      {medication.name}
                    </Text>
                    <Text style={styles.medDosage}>
                      {medication.dosage} · {medication.frequency}
                    </Text>
                  </View>

                  {log.taken && log.takenAt ? (
                    <View style={styles.statusBadge}>
                      <Ionicons name="checkmark" size={12} color="#10b981" />
                      <Text style={styles.statusDone}>{formatTime(log.takenAt)}</Text>
                    </View>
                  ) : (
                    <View style={styles.statusBadge}>
                      <Ionicons name="time-outline" size={12} color={colors.slate[300]} />
                      <Text style={styles.statusPending}>Pending</Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          );
        })
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  loader: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: { marginBottom: 20 },
  title: { fontSize: 18, fontWeight: "700", color: colors.slate[800] },
  subtitle: { fontSize: 12, color: colors.slate[400], marginTop: 2 },
  errorBox: {
    backgroundColor: colors.red[50],
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  errorText: { color: colors.red[600], fontSize: 13 },
  statsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
  },
  statLabel: { fontSize: 10, fontWeight: "500" },
  statValue: { fontSize: 20, fontWeight: "700", marginTop: 4 },
  statSub: { fontSize: 9, marginTop: 2 },
  emptyState: { alignItems: "center", paddingVertical: 40, gap: 8 },
  emptyText: { fontSize: 14, color: colors.slate[400] },
  emptySub: { fontSize: 12, color: colors.slate[300] },
  slotSection: { marginBottom: 20 },
  slotHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  slotIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  slotTitle: { fontSize: 14, fontWeight: "600", color: colors.slate[700], flex: 1 },
  allDoneBadge: { flexDirection: "row", alignItems: "center", gap: 4 },
  allDoneText: { fontSize: 12, color: "#10b981", fontWeight: "500" },
  medItem: {
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
  medItemDone: {
    backgroundColor: "#ecfdf5",
    borderColor: "#a7f3d0",
  },
  checkbox: {
    width: 30,
    height: 30,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.slate[300],
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxDone: {
    backgroundColor: "#10b981",
    borderColor: "#10b981",
  },
  medInfo: { flex: 1 },
  medName: { fontSize: 14, fontWeight: "500", color: colors.slate[700] },
  medNameDone: { color: colors.slate[400], textDecorationLine: "line-through" },
  medDosage: { fontSize: 12, color: colors.slate[400], marginTop: 2 },
  statusBadge: { flexDirection: "row", alignItems: "center", gap: 4 },
  statusDone: { fontSize: 12, color: "#10b981" },
  statusPending: { fontSize: 12, color: colors.slate[300] },
});
