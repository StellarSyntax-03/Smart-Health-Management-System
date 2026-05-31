import { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";
import { Camera } from "expo-camera";
import { api } from "../../lib/api";
import { ApiResponse } from "../../types";
import { colors } from "../../lib/colors";
import SilentCamera, { SilentCameraRef } from "../../components/SilentCamera";

interface SOSAlert {
  id: string;
  patientId: string;
  latitude: number | null;
  longitude: number | null;
  status: string;
  createdAt: string;
}

interface SOSConfig {
  sosEnabled: boolean;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  familyDoctorName: string | null;
  familyDoctorPhone: string | null;
}

interface SOSResult {
  alert: SOSAlert;
  notificationsSent: number;
  notificationsTotal: number;
}

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function SOSTab() {
  const [config, setConfig] = useState<SOSConfig | null>(null);
  const [alerts, setAlerts] = useState<SOSAlert[]>([]);
  const [activeAlert, setActiveAlert] = useState<SOSAlert | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [showSetup, setShowSetup] = useState(false);
  const [setupForm, setSetupForm] = useState({
    emergencyContactName: "",
    emergencyContactPhone: "",
    familyDoctorName: "",
    familyDoctorPhone: "",
  });
  const [settingUp, setSettingUp] = useState(false);
  const [disabling, setDisabling] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cameraRef = useRef<SilentCameraRef>(null);

  const fetchData = useCallback(async () => {
    try {
      const [configRes, allRes, activeRes] = await Promise.all([
        api.get<ApiResponse<SOSConfig>>("/patient/sos/config"),
        api.get<ApiResponse<SOSAlert[]>>("/patient/sos"),
        api.get<ApiResponse<SOSAlert | null>>("/patient/sos/active"),
      ]);
      if (configRes.data) {
        setConfig(configRes.data);
        if (configRes.data.sosEnabled) {
          setSetupForm({
            emergencyContactName: configRes.data.emergencyContactName || "",
            emergencyContactPhone: configRes.data.emergencyContactPhone || "",
            familyDoctorName: configRes.data.familyDoctorName || "",
            familyDoctorPhone: configRes.data.familyDoctorPhone || "",
          });
        }
      }
      if (allRes.data) setAlerts(allRes.data);
      setActiveAlert(activeRes.data ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load SOS data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (Platform.OS !== "web") {
      Location.requestForegroundPermissionsAsync();
      Camera.requestCameraPermissionsAsync();
    }
  }, []);

  useEffect(() => {
    if (!activeAlert) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(async () => {
      try {
        const res = await api.get<ApiResponse<SOSAlert | null>>("/patient/sos/active");
        if (!res.data) {
          setActiveAlert(null);
          setSuccessMsg("Alert resolved! Your contact has confirmed.");
          setTimeout(() => setSuccessMsg(""), 5000);
          const allRes = await api.get<ApiResponse<SOSAlert[]>>("/patient/sos");
          if (allRes.data) setAlerts(allRes.data);
        }
      } catch {}
    }, 5000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [activeAlert]);

  async function handleSetup() {
    const { emergencyContactName, emergencyContactPhone, familyDoctorName, familyDoctorPhone } = setupForm;
    if (!emergencyContactName || !emergencyContactPhone || !familyDoctorName || !familyDoctorPhone) {
      setError("All fields are required");
      return;
    }
    setSettingUp(true);
    setError("");
    try {
      await api.post<ApiResponse>("/patient/sos/setup", setupForm);
      setConfig((prev) => prev ? { ...prev, sosEnabled: true, ...setupForm } : null);
      setShowSetup(false);
      setSuccessMsg("SOS enabled! Emergency contacts saved.");
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Setup failed");
    } finally {
      setSettingUp(false);
    }
  }

  async function handleDisable() {
    if (Platform.OS === "web") {
      if (!window.confirm("Disable SOS? Your emergency contacts will be kept but alerts won't be sent.")) return;
    } else {
      const confirmed = await new Promise<boolean>((resolve) => {
        Alert.alert("Disable SOS", "Your emergency contacts will be kept but alerts won't be sent.", [
          { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
          { text: "Disable", style: "destructive", onPress: () => resolve(true) },
        ]);
      });
      if (!confirmed) return;
    }

    setDisabling(true);
    try {
      await api.post<ApiResponse>("/patient/sos/disable", {});
      setConfig((prev) => prev ? { ...prev, sosEnabled: false } : null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to disable");
    } finally {
      setDisabling(false);
    }
  }

  async function captureAndSendPhotos() {
    try {
      const uris = await cameraRef.current?.capturePhotos();
      if (!uris?.length) return;

      const formData = new FormData();
      for (let i = 0; i < uris.length; i++) {
        formData.append("photos", {
          uri: uris[i],
          type: "image/jpeg",
          name: `sos_${i}.jpg`,
        } as any);
      }

      await api.upload("/patient/sos/photos", formData);
    } catch (err: any) {
      console.log("[SOS] Photo upload error:", err?.message || err);
    }
  }

  async function handleSOS() {
    setSending(true);
    setError("");
    setSuccessMsg("");

    let latitude: number | undefined;
    let longitude: number | undefined;

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        latitude = loc.coords.latitude;
        longitude = loc.coords.longitude;
      }
    } catch {}

    try {
      const res = await api.post<ApiResponse<SOSResult>>("/patient/sos", { latitude, longitude });
      if (res.data) {
        setActiveAlert(res.data.alert);
        setAlerts((prev) => [res.data!.alert, ...prev]);
        setSuccessMsg(
          `Alert sent! ${res.data.notificationsSent}/${res.data.notificationsTotal} notifications delivered via WhatsApp.`
        );
        setTimeout(() => setSuccessMsg(""), 5000);
        captureAndSendPhotos();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send SOS");
    } finally {
      setSending(false);
    }
  }

  async function handleCancel(id: string) {
    setCancelling(true);
    setError("");
    try {
      const res = await api.patch<ApiResponse<SOSAlert>>(`/patient/sos/${id}/cancel`);
      if (res.data) {
        setActiveAlert(null);
        setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, status: "cancelled" } : a)));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to cancel alert");
    } finally {
      setCancelling(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={colors.blue[600]} />
      </View>
    );
  }

  const isEnabled = config?.sosEnabled;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Emergency SOS</Text>
          <Text style={styles.subtitle}>Send an emergency alert with your location via WhatsApp</Text>
        </View>
        {isEnabled && (
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.headerIconBtn} onPress={() => setShowSetup(!showSetup)}>
              <Ionicons name="settings-outline" size={18} color={colors.slate[400]} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerIconBtn} onPress={handleDisable} disabled={disabling}>
              {disabling ? (
                <ActivityIndicator size="small" color={colors.slate[400]} />
              ) : (
                <Ionicons name="power-outline" size={18} color={colors.slate[400]} />
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {successMsg ? (
        <View style={styles.successBox}>
          <Text style={styles.successText}>{successMsg}</Text>
        </View>
      ) : null}

      {(!isEnabled || showSetup) && (
        <View style={styles.setupCard}>
          <View style={styles.setupHeader}>
            <Ionicons name="shield-checkmark" size={18} color={colors.blue[600]} />
            <Text style={styles.setupTitle}>
              {isEnabled ? "Edit Emergency Contacts" : "Set Up SOS"}
            </Text>
          </View>

          {!isEnabled && (
            <Text style={styles.setupDesc}>
              Enable SOS to send emergency alerts with your location to your contacts via WhatsApp.
            </Text>
          )}

          <View style={styles.contactSection}>
            <View style={styles.contactHeader}>
              <Ionicons name="person" size={14} color={colors.blue[600]} />
              <Text style={styles.contactLabel}>Emergency Contact</Text>
            </View>
            <TextInput
              style={styles.input}
              value={setupForm.emergencyContactName}
              onChangeText={(v) => setSetupForm((p) => ({ ...p, emergencyContactName: v }))}
              placeholder="Contact name"
              placeholderTextColor={colors.slate[400]}
            />
            <TextInput
              style={styles.input}
              value={setupForm.emergencyContactPhone}
              onChangeText={(v) => setSetupForm((p) => ({ ...p, emergencyContactPhone: v }))}
              placeholder="Phone with country code (e.g. +91...)"
              placeholderTextColor={colors.slate[400]}
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.contactSection}>
            <View style={styles.contactHeader}>
              <Ionicons name="medkit" size={14} color="#10b981" />
              <Text style={styles.contactLabel}>Family Doctor</Text>
            </View>
            <TextInput
              style={styles.input}
              value={setupForm.familyDoctorName}
              onChangeText={(v) => setSetupForm((p) => ({ ...p, familyDoctorName: v }))}
              placeholder="Doctor name"
              placeholderTextColor={colors.slate[400]}
            />
            <TextInput
              style={styles.input}
              value={setupForm.familyDoctorPhone}
              onChangeText={(v) => setSetupForm((p) => ({ ...p, familyDoctorPhone: v }))}
              placeholder="Phone with country code (e.g. +91...)"
              placeholderTextColor={colors.slate[400]}
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.setupActions}>
            <TouchableOpacity
              style={[styles.setupBtn, settingUp && { opacity: 0.5 }]}
              onPress={handleSetup}
              disabled={settingUp}
            >
              {settingUp ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <>
                  <Ionicons name="shield-checkmark" size={16} color={colors.white} />
                  <Text style={styles.setupBtnText}>{isEnabled ? "Update Contacts" : "Enable SOS"}</Text>
                </>
              )}
            </TouchableOpacity>
            {showSetup && (
              <TouchableOpacity onPress={() => setShowSetup(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {isEnabled && !showSetup && (
        <>
          <View style={styles.contactCards}>
            <View style={[styles.contactCard, { backgroundColor: "#eff6ff", borderColor: "#bfdbfe" }]}>
              <View style={styles.contactCardHeader}>
                <Ionicons name="person" size={14} color={colors.blue[600]} />
                <Text style={[styles.contactCardLabel, { color: "#93c5fd" }]}>Emergency Contact</Text>
              </View>
              <Text style={[styles.contactCardName, { color: "#1d4ed8" }]}>{config?.emergencyContactName}</Text>
              <View style={styles.contactCardPhone}>
                <Ionicons name="call" size={10} color={colors.blue[600]} />
                <Text style={[styles.contactCardPhoneText, { color: colors.blue[600] }]}>{config?.emergencyContactPhone}</Text>
              </View>
            </View>
            <View style={[styles.contactCard, { backgroundColor: "#ecfdf5", borderColor: "#a7f3d0" }]}>
              <View style={styles.contactCardHeader}>
                <Ionicons name="medkit" size={14} color="#10b981" />
                <Text style={[styles.contactCardLabel, { color: "#6ee7b7" }]}>Family Doctor</Text>
              </View>
              <Text style={[styles.contactCardName, { color: "#047857" }]}>{config?.familyDoctorName}</Text>
              <View style={styles.contactCardPhone}>
                <Ionicons name="call" size={10} color="#10b981" />
                <Text style={[styles.contactCardPhoneText, { color: "#10b981" }]}>{config?.familyDoctorPhone}</Text>
              </View>
            </View>
          </View>

          <View style={styles.sosButtonContainer}>
            <TouchableOpacity
              style={[
                styles.sosButton,
                activeAlert ? styles.sosButtonActive : styles.sosButtonDefault,
              ]}
              onPress={handleSOS}
              disabled={sending || !!activeAlert}
              activeOpacity={0.8}
            >
              {sending ? (
                <ActivityIndicator size="large" color={colors.white} />
              ) : (
                <Ionicons name="warning" size={36} color={colors.white} />
              )}
              <Text style={styles.sosButtonText}>
                {sending ? "Sending..." : activeAlert ? "ACTIVE" : "SOS"}
              </Text>
            </TouchableOpacity>
            <Text style={styles.sosHint}>
              {activeAlert
                ? "Emergency alert is active. Your contacts have been notified."
                : "Press to send your location to emergency contacts via WhatsApp"}
            </Text>
          </View>

          {activeAlert && (
            <View style={styles.activeAlertBanner}>
              <View style={styles.activeAlertHeader}>
                <View style={styles.activeAlertTitleRow}>
                  <Ionicons name="shield" size={16} color="#dc2626" />
                  <Text style={styles.activeAlertTitle}>Active Alert</Text>
                </View>
                <View style={styles.activeBadge}>
                  <Text style={styles.activeBadgeText}>ACTIVE</Text>
                </View>
              </View>
              <View style={styles.activeAlertDetails}>
                {activeAlert.latitude != null && activeAlert.longitude != null && (
                  <View style={styles.alertDetail}>
                    <Ionicons name="location" size={14} color="#dc2626" />
                    <Text style={styles.alertDetailText}>
                      {activeAlert.latitude.toFixed(4)}, {activeAlert.longitude.toFixed(4)}
                    </Text>
                  </View>
                )}
                <View style={styles.alertDetail}>
                  <Ionicons name="time" size={14} color="#dc2626" />
                  <Text style={styles.alertDetailText}>{timeAgo(activeAlert.createdAt)}</Text>
                </View>
              </View>
              <TouchableOpacity
                style={[styles.cancelAlertBtn, cancelling && { opacity: 0.5 }]}
                onPress={() => handleCancel(activeAlert.id)}
                disabled={cancelling}
              >
                {cancelling ? (
                  <ActivityIndicator size="small" color="#dc2626" />
                ) : (
                  <Ionicons name="close" size={14} color="#dc2626" />
                )}
                <Text style={styles.cancelAlertText}>Cancel Alert</Text>
              </TouchableOpacity>
            </View>
          )}
        </>
      )}

      <View style={styles.historySection}>
        <View style={styles.historyHeader}>
          <Ionicons name="time" size={16} color={colors.slate[400]} />
          <Text style={styles.historyTitle}>Alert History</Text>
        </View>

        {alerts.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Ionicons name="shield" size={24} color={colors.slate[300]} />
            </View>
            <Text style={styles.emptyText}>No alerts sent yet</Text>
          </View>
        ) : (
          alerts.map((alert) => (
            <View key={alert.id} style={styles.historyCard}>
              <View
                style={[
                  styles.historyDot,
                  { backgroundColor: alert.status === "active" ? "#ef4444" : colors.slate[300] },
                ]}
              >
                <Ionicons name="warning" size={14} color={colors.white} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.historyNameRow}>
                  <Text style={styles.historyName}>Emergency Alert</Text>
                  <View
                    style={[
                      styles.statusBadge,
                      alert.status === "active"
                        ? styles.statusActive
                        : alert.status === "resolved"
                          ? styles.statusResolved
                          : styles.statusCancelled,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        alert.status === "active"
                          ? { color: "#ef4444" }
                          : alert.status === "resolved"
                            ? { color: "#10b981" }
                            : { color: colors.slate[500] },
                      ]}
                    >
                      {alert.status.toUpperCase()}
                    </Text>
                  </View>
                </View>
                <Text style={styles.historyDate}>{formatDate(alert.createdAt)}</Text>
              </View>
              {alert.latitude != null && alert.longitude != null && (
                <View style={styles.historyLocation}>
                  <Ionicons name="location" size={12} color={colors.slate[400]} />
                  <Text style={styles.historyLocationText}>
                    {alert.latitude.toFixed(2)}, {alert.longitude.toFixed(2)}
                  </Text>
                </View>
              )}
            </View>
          ))
        )}
      </View>

      <View style={{ height: 40 }} />
      <SilentCamera ref={cameraRef} />
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
  title: { fontSize: 18, fontWeight: "700", color: colors.slate[900] },
  subtitle: { fontSize: 12, color: colors.slate[400], marginTop: 2 },
  headerActions: { flexDirection: "row", gap: 4 },
  headerIconBtn: { padding: 8 },
  errorBox: {
    backgroundColor: colors.red[50],
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  errorText: { color: colors.red[600], fontSize: 13 },
  successBox: {
    backgroundColor: "#ecfdf5",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#a7f3d0",
  },
  successText: { color: "#059669", fontSize: 13 },
  setupCard: {
    backgroundColor: colors.slate[50],
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.slate[200],
    marginBottom: 20,
    gap: 14,
  },
  setupHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  setupTitle: { fontSize: 14, fontWeight: "600", color: colors.slate[700] },
  setupDesc: { fontSize: 12, color: colors.slate[500] },
  contactSection: {
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.slate[200],
    padding: 14,
    gap: 10,
  },
  contactHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  contactLabel: { fontSize: 13, fontWeight: "600", color: colors.slate[700] },
  input: {
    backgroundColor: colors.slate[50],
    borderWidth: 1,
    borderColor: colors.slate[200],
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.slate[900],
  },
  setupActions: { flexDirection: "row", alignItems: "center", gap: 16 },
  setupBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.blue[600],
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  setupBtnText: { color: colors.white, fontSize: 14, fontWeight: "600" },
  cancelText: { fontSize: 13, color: colors.slate[500] },
  contactCards: { flexDirection: "row", gap: 10, marginBottom: 16 },
  contactCard: {
    flex: 1,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
  },
  contactCardHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 },
  contactCardLabel: { fontSize: 11, fontWeight: "500" },
  contactCardName: { fontSize: 14, fontWeight: "600" },
  contactCardPhone: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  contactCardPhoneText: { fontSize: 11 },
  sosButtonContainer: { alignItems: "center", paddingVertical: 24 },
  sosButton: {
    width: 140,
    height: 140,
    borderRadius: 70,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  sosButtonDefault: {
    backgroundColor: "#dc2626",
    shadowColor: "#dc2626",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  sosButtonActive: {
    backgroundColor: "#f87171",
    shadowColor: "#f87171",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  sosButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 1,
  },
  sosHint: {
    fontSize: 12,
    color: colors.slate[400],
    marginTop: 16,
    textAlign: "center",
    maxWidth: 280,
  },
  activeAlertBanner: {
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fecaca",
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    gap: 12,
  },
  activeAlertHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  activeAlertTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  activeAlertTitle: { fontSize: 14, fontWeight: "600", color: "#b91c1c" },
  activeBadge: {
    backgroundColor: "#dc2626",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  activeBadgeText: {
    color: colors.white,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  activeAlertDetails: { flexDirection: "row", flexWrap: "wrap", gap: 16 },
  alertDetail: { flexDirection: "row", alignItems: "center", gap: 6 },
  alertDetailText: { fontSize: 13, color: "#b91c1c" },
  cancelAlertBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: "#fecaca",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  cancelAlertText: { fontSize: 13, fontWeight: "500", color: "#dc2626" },
  historySection: { marginTop: 8 },
  historyHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14 },
  historyTitle: { fontSize: 14, fontWeight: "600", color: colors.slate[700] },
  emptyState: { alignItems: "center", paddingVertical: 40, gap: 10 },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: colors.slate[100],
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: { fontSize: 13, color: colors.slate[400] },
  historyCard: {
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
  historyDot: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  historyNameRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  historyName: { fontSize: 13, fontWeight: "500", color: colors.slate[700] },
  statusBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  statusActive: { backgroundColor: "#fee2e2" },
  statusResolved: { backgroundColor: "#d1fae5" },
  statusCancelled: { backgroundColor: colors.slate[100] },
  statusText: { fontSize: 9, fontWeight: "700", letterSpacing: 0.5 },
  historyDate: { fontSize: 11, color: colors.slate[400], marginTop: 2 },
  historyLocation: { flexDirection: "row", alignItems: "center", gap: 4 },
  historyLocationText: { fontSize: 11, color: colors.slate[400] },
});
