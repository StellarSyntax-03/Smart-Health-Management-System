import { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../../lib/api";
import { Prescription, Medication, ApiResponse } from "../../types";
import { colors } from "../../lib/colors";

const FREQUENCIES = ["Once daily", "Twice daily", "Three times daily", "Four times daily"];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

interface MedRow {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
}

export default function PrescriptionsTab() {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [pickedFile, setPickedFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [notes, setNotes] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [extractingId, setExtractingId] = useState<string | null>(null);
  const [extractError, setExtractError] = useState("");
  const [addingMedFor, setAddingMedFor] = useState<string | null>(null);
  const [newMed, setNewMed] = useState<MedRow>({ name: "", dosage: "", frequency: "Once daily", duration: "" });
  const [addingMedLoading, setAddingMedLoading] = useState(false);
  const [showFreqPicker, setShowFreqPicker] = useState(false);

  useEffect(() => {
    fetchPrescriptions();
  }, []);

  async function fetchPrescriptions() {
    setLoading(true);
    try {
      const res = await api.get<ApiResponse<Prescription[]>>("/patient/prescriptions");
      setPrescriptions(res.data || []);
    } catch {
    } finally {
      setLoading(false);
    }
  }

  async function pickFile() {
    const result = await DocumentPicker.getDocumentAsync({
      type: ["image/*", "application/pdf"],
      copyToCacheDirectory: true,
    });
    if (!result.canceled && result.assets.length > 0) {
      setPickedFile(result.assets[0]);
    }
  }

  async function handleUpload() {
    if (!pickedFile) return;
    setUploadError("");
    setUploading(true);

    const formData = new FormData();
    const filePayload: any = {
      uri: pickedFile.uri,
      name: pickedFile.name,
      type: pickedFile.mimeType || "application/octet-stream",
    };
    formData.append("file", filePayload);
    if (notes.trim()) formData.append("notes", notes.trim());

    try {
      const res = await api.upload<ApiResponse<Prescription>>("/patient/prescriptions", formData);
      if (res.data) setPrescriptions((prev) => [res.data!, ...prev]);
      setShowUpload(false);
      setPickedFile(null);
      setNotes("");
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function handleDelete(id: string) {
    Alert.alert("Delete Prescription", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          const prev = [...prescriptions];
          setPrescriptions((p) => p.filter((rx) => rx.id !== id));
          try {
            await api.delete<ApiResponse>(`/patient/prescriptions/${id}`);
          } catch {
            setPrescriptions(prev);
          }
        },
      },
    ]);
  }

  async function handleExtract(rxId: string) {
    setExtractingId(rxId);
    setExtractError("");
    try {
      const res = await api.post<ApiResponse<Medication[]>>(`/patient/prescriptions/${rxId}/extract`, {});
      if (res.data && res.data.length > 0) {
        const freshRes = await api.get<ApiResponse<Prescription[]>>("/patient/prescriptions");
        if (freshRes.data) setPrescriptions(freshRes.data);
      } else {
        setExtractError("No medications found. Try adding manually.");
      }
    } catch (err) {
      setExtractError(err instanceof Error ? err.message : "Extraction failed");
    } finally {
      setExtractingId(null);
    }
  }

  async function handleAddMedication(rxId: string) {
    if (!newMed.name || !newMed.dosage || !newMed.frequency || !newMed.duration) return;
    setAddingMedLoading(true);
    try {
      const res = await api.post<ApiResponse<Medication>>(`/patient/prescriptions/${rxId}/medications`, newMed);
      if (res.data) {
        setPrescriptions((prev) =>
          prev.map((rx) =>
            rx.id === rxId ? { ...rx, medications: [...rx.medications, res.data!] } : rx,
          ),
        );
        setNewMed({ name: "", dosage: "", frequency: "Once daily", duration: "" });
        setAddingMedFor(null);
      }
    } catch {
    } finally {
      setAddingMedLoading(false);
    }
  }

  async function handleDeleteMedication(rxId: string, medId: string) {
    try {
      await api.delete<ApiResponse>(`/patient/prescriptions/${rxId}/medications/${medId}`);
      setPrescriptions((prev) =>
        prev.map((rx) =>
          rx.id === rxId ? { ...rx, medications: rx.medications.filter((m) => m.id !== medId) } : rx,
        ),
      );
    } catch {
    }
  }

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={colors.blue[600]} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>Prescriptions</Text>
          <Text style={styles.subtitle}>Upload and manage your prescriptions</Text>
        </View>
        <TouchableOpacity
          style={styles.uploadBtn}
          onPress={() => { setShowUpload(!showUpload); setPickedFile(null); setNotes(""); setUploadError(""); }}
        >
          <Ionicons name={showUpload ? "close" : "cloud-upload"} size={16} color={colors.white} />
          <Text style={styles.uploadBtnText}>{showUpload ? "Cancel" : "Upload"}</Text>
        </TouchableOpacity>
      </View>

      {showUpload && (
        <View style={styles.uploadCard}>
          {uploadError ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{uploadError}</Text>
            </View>
          ) : null}

          <TouchableOpacity style={styles.filePicker} onPress={pickFile}>
            <Ionicons name="document-attach" size={20} color={colors.blue[600]} />
            <Text style={styles.filePickerText}>
              {pickedFile ? pickedFile.name : "Select file (image/PDF)"}
            </Text>
          </TouchableOpacity>

          <View style={styles.formField}>
            <Text style={styles.formLabel}>Notes (optional)</Text>
            <TextInput
              style={styles.input}
              value={notes}
              onChangeText={setNotes}
              placeholder="Optional notes"
              placeholderTextColor={colors.slate[400]}
              multiline
            />
          </View>

          <TouchableOpacity
            style={[styles.submitBtn, (!pickedFile || uploading) && styles.submitDisabled]}
            onPress={handleUpload}
            disabled={!pickedFile || uploading}
          >
            {uploading ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <>
                <Ionicons name="cloud-upload" size={16} color={colors.white} />
                <Text style={styles.submitText}>Upload Prescription</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {prescriptions.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="document-text" size={36} color="#93c5fd" />
          <Text style={styles.emptyText}>No prescriptions yet</Text>
          <Text style={styles.emptySub}>Upload your first prescription to get started</Text>
        </View>
      ) : (
        prescriptions.map((rx) => {
          const isExpanded = expandedId === rx.id;
          return (
            <View key={rx.id} style={styles.rxCard}>
              <TouchableOpacity
                style={styles.rxHeader}
                onPress={() => setExpandedId(isExpanded ? null : rx.id)}
                activeOpacity={0.7}
              >
                <View style={styles.rxIconBox}>
                  <Ionicons name="document-text" size={18} color={colors.blue[500]} />
                </View>
                <View style={styles.rxInfo}>
                  <Text style={styles.rxName} numberOfLines={1}>{rx.fileName || "Prescription"}</Text>
                  <Text style={styles.rxDate}>{formatDate(rx.date)}</Text>
                  {rx.notes ? <Text style={styles.rxNotes}>{rx.notes}</Text> : null}
                  <View style={styles.rxMeta}>
                    {rx.medications.length > 0 ? (
                      <View style={styles.medBadge}>
                        <Ionicons name="medical" size={10} color="#059669" />
                        <Text style={styles.medBadgeText}>{rx.medications.length} medication(s)</Text>
                      </View>
                    ) : (
                      <Text style={styles.noMedText}>No medications extracted</Text>
                    )}
                    <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={14} color={colors.slate[400]} />
                  </View>
                </View>
                <View style={styles.rxActions}>
                  {rx.fileUrl && (
                    <TouchableOpacity
                      style={styles.iconBtn}
                      onPress={() => Linking.openURL(rx.fileUrl!)}
                    >
                      <Ionicons name="download-outline" size={16} color={colors.slate[400]} />
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity style={styles.iconBtn} onPress={() => handleDelete(rx.id)}>
                    <Ionicons name="trash-outline" size={16} color={colors.slate[400]} />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>

              {isExpanded && (
                <View style={styles.rxExpanded}>
                  <View style={styles.medHeader}>
                    <Text style={styles.medSectionTitle}>MEDICATIONS</Text>
                    <View style={styles.medHeaderActions}>
                      {rx.fileUrl && (
                        <TouchableOpacity
                          style={styles.aiExtractBtn}
                          onPress={() => handleExtract(rx.id)}
                          disabled={extractingId === rx.id}
                        >
                          {extractingId === rx.id ? (
                            <ActivityIndicator size={12} color="#7c3aed" />
                          ) : (
                            <Ionicons name="sparkles" size={12} color="#7c3aed" />
                          )}
                          <Text style={styles.aiExtractText}>
                            {extractingId === rx.id ? "Extracting..." : "AI Extract"}
                          </Text>
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity
                        style={styles.addMedBtn}
                        onPress={() => setAddingMedFor(addingMedFor === rx.id ? null : rx.id)}
                      >
                        <Ionicons name={addingMedFor === rx.id ? "close" : "add"} size={12} color={colors.blue[600]} />
                        <Text style={styles.addMedText}>{addingMedFor === rx.id ? "Cancel" : "Add"}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {extractError && expandedId === rx.id && (
                    <View style={styles.warnBox}>
                      <Text style={styles.warnText}>{extractError}</Text>
                    </View>
                  )}

                  {addingMedFor === rx.id && (
                    <View style={styles.addMedForm}>
                      <View style={styles.addMedRow}>
                        <TextInput
                          style={[styles.addMedInput, { flex: 1 }]}
                          value={newMed.name}
                          onChangeText={(v) => setNewMed((p) => ({ ...p, name: v }))}
                          placeholder="Medicine name"
                          placeholderTextColor={colors.slate[400]}
                        />
                        <TextInput
                          style={[styles.addMedInput, { flex: 1 }]}
                          value={newMed.dosage}
                          onChangeText={(v) => setNewMed((p) => ({ ...p, dosage: v }))}
                          placeholder="Dosage"
                          placeholderTextColor={colors.slate[400]}
                        />
                      </View>
                      <View style={styles.addMedRow}>
                        <TouchableOpacity
                          style={[styles.addMedInput, styles.freqPicker, { flex: 1 }]}
                          onPress={() => setShowFreqPicker(!showFreqPicker)}
                        >
                          <Text style={styles.freqPickerText}>{newMed.frequency}</Text>
                          <Ionicons name="chevron-down" size={12} color={colors.slate[400]} />
                        </TouchableOpacity>
                        <TextInput
                          style={[styles.addMedInput, { flex: 1 }]}
                          value={newMed.duration}
                          onChangeText={(v) => setNewMed((p) => ({ ...p, duration: v }))}
                          placeholder="Duration"
                          placeholderTextColor={colors.slate[400]}
                        />
                      </View>
                      {showFreqPicker && (
                        <View style={styles.freqDropdown}>
                          {FREQUENCIES.map((f) => (
                            <TouchableOpacity
                              key={f}
                              style={styles.freqItem}
                              onPress={() => { setNewMed((p) => ({ ...p, frequency: f })); setShowFreqPicker(false); }}
                            >
                              <Text style={styles.freqItemText}>{f}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}
                      <TouchableOpacity
                        style={[styles.addMedSubmit, (!newMed.name || !newMed.dosage || !newMed.duration) && styles.submitDisabled]}
                        onPress={() => handleAddMedication(rx.id)}
                        disabled={addingMedLoading || !newMed.name || !newMed.dosage || !newMed.duration}
                      >
                        {addingMedLoading ? (
                          <ActivityIndicator size="small" color={colors.white} />
                        ) : (
                          <>
                            <Ionicons name="add" size={14} color={colors.white} />
                            <Text style={styles.addMedSubmitText}>Add Medication</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </View>
                  )}

                  {rx.medications.length === 0 ? (
                    <Text style={styles.noMedHint}>
                      No medications yet. Use "AI Extract" or add manually.
                    </Text>
                  ) : (
                    rx.medications.map((med) => (
                      <View key={med.id} style={styles.medItem}>
                        <View style={styles.medPillIcon}>
                          <Ionicons name="medical" size={12} color="#10b981" />
                        </View>
                        <View style={styles.medItemInfo}>
                          <Text style={styles.medItemName}>{med.name}</Text>
                          <Text style={styles.medItemDetail}>
                            {med.dosage} · {med.frequency} · {med.duration}
                          </Text>
                        </View>
                        <TouchableOpacity
                          style={styles.medDeleteBtn}
                          onPress={() => handleDeleteMedication(rx.id, med.id)}
                        >
                          <Ionicons name="trash-outline" size={14} color={colors.slate[300]} />
                        </TouchableOpacity>
                      </View>
                    ))
                  )}
                </View>
              )}
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
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  title: { fontSize: 18, fontWeight: "700", color: colors.slate[900] },
  subtitle: { fontSize: 12, color: colors.slate[400], marginTop: 2 },
  uploadBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.blue[600],
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  uploadBtnText: { color: colors.white, fontSize: 13, fontWeight: "600" },
  uploadCard: {
    backgroundColor: colors.slate[50],
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.slate[200],
    marginBottom: 20,
    gap: 12,
  },
  errorBox: { backgroundColor: colors.red[50], borderRadius: 10, padding: 10, marginBottom: 4 },
  errorText: { color: colors.red[600], fontSize: 12 },
  filePicker: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.blue[100],
    borderStyle: "dashed",
    borderRadius: 12,
    padding: 14,
  },
  filePickerText: { fontSize: 13, color: colors.blue[600], flex: 1 },
  formField: { gap: 6 },
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
  submitBtn: {
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
  emptyState: { alignItems: "center", paddingVertical: 50, gap: 8 },
  emptyText: { fontSize: 15, fontWeight: "500", color: colors.slate[500] },
  emptySub: { fontSize: 13, color: colors.slate[400] },
  rxCard: {
    backgroundColor: colors.slate[50],
    borderWidth: 1,
    borderColor: colors.slate[100],
    borderRadius: 14,
    overflow: "hidden",
    marginBottom: 10,
  },
  rxHeader: {
    flexDirection: "row",
    padding: 14,
    gap: 10,
  },
  rxIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.blue[50],
    alignItems: "center",
    justifyContent: "center",
  },
  rxInfo: { flex: 1 },
  rxName: { fontSize: 14, fontWeight: "600", color: colors.slate[800] },
  rxDate: { fontSize: 11, color: colors.slate[400], marginTop: 2 },
  rxNotes: { fontSize: 12, color: colors.slate[500], marginTop: 4 },
  rxMeta: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 6 },
  medBadge: { flexDirection: "row", alignItems: "center", gap: 4 },
  medBadgeText: { fontSize: 11, color: "#059669", fontWeight: "500" },
  noMedText: { fontSize: 11, color: colors.slate[400] },
  rxActions: { flexDirection: "row", gap: 4 },
  iconBtn: { padding: 6 },
  rxExpanded: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    borderTopWidth: 1,
    borderTopColor: colors.slate[100],
  },
  medHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
    marginBottom: 8,
  },
  medSectionTitle: { fontSize: 10, fontWeight: "700", color: colors.slate[500], letterSpacing: 1 },
  medHeaderActions: { flexDirection: "row", gap: 8 },
  aiExtractBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#f5f3ff",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
  },
  aiExtractText: { fontSize: 11, color: "#7c3aed", fontWeight: "500" },
  addMedBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.blue[50],
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
  },
  addMedText: { fontSize: 11, color: colors.blue[600], fontWeight: "500" },
  warnBox: {
    backgroundColor: "#fffbeb",
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: "#fde68a",
    marginBottom: 8,
  },
  warnText: { fontSize: 11, color: "#92400e" },
  addMedForm: {
    backgroundColor: colors.white,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.slate[200],
    padding: 10,
    marginBottom: 10,
    gap: 8,
  },
  addMedRow: { flexDirection: "row", gap: 8 },
  addMedInput: {
    backgroundColor: colors.slate[50],
    borderWidth: 1,
    borderColor: colors.slate[200],
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 12,
    color: colors.slate[900],
  },
  freqPicker: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  freqPickerText: { fontSize: 12, color: colors.slate[900] },
  freqDropdown: {
    backgroundColor: colors.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.slate[200],
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  freqItem: { paddingHorizontal: 12, paddingVertical: 8 },
  freqItemText: { fontSize: 12, color: colors.slate[900] },
  addMedSubmit: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    backgroundColor: colors.blue[600],
    paddingVertical: 8,
    borderRadius: 8,
  },
  addMedSubmitText: { fontSize: 12, color: colors.white, fontWeight: "600" },
  noMedHint: { fontSize: 12, color: colors.slate[400], textAlign: "center", paddingVertical: 12 },
  medItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.white,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.slate[100],
    marginBottom: 6,
  },
  medPillIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "#ecfdf5",
    alignItems: "center",
    justifyContent: "center",
  },
  medItemInfo: { flex: 1 },
  medItemName: { fontSize: 13, fontWeight: "500", color: colors.slate[700] },
  medItemDetail: { fontSize: 11, color: colors.slate[400], marginTop: 2 },
  medDeleteBtn: { padding: 4 },
});
