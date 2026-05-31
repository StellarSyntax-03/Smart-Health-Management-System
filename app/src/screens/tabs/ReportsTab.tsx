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
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../../lib/api";
import { MedicalReport, ApiResponse } from "../../types";
import { colors } from "../../lib/colors";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export default function ReportsTab() {
  const [reports, setReports] = useState<MedicalReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [pickedFile, setPickedFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [name, setName] = useState("");

  useEffect(() => {
    fetchReports();
  }, []);

  async function fetchReports() {
    setLoading(true);
    try {
      const res = await api.get<ApiResponse<MedicalReport[]>>("/patient/reports");
      setReports(res.data || []);
    } catch {
    } finally {
      setLoading(false);
    }
  }

  async function pickFile() {
    const result = await DocumentPicker.getDocumentAsync({
      type: ["image/jpeg", "image/png", "image/webp", "application/pdf"],
      copyToCacheDirectory: true,
    });
    if (!result.canceled && result.assets.length > 0) {
      setPickedFile(result.assets[0]);
    }
  }

  async function handleUpload() {
    if (!pickedFile || !name.trim()) return;
    setUploadError("");
    setUploading(true);

    const formData = new FormData();
    const filePayload: any = {
      uri: pickedFile.uri,
      name: pickedFile.name,
      type: pickedFile.mimeType || "application/octet-stream",
    };
    formData.append("file", filePayload);
    formData.append("name", name.trim());

    try {
      const res = await api.upload<ApiResponse<MedicalReport>>("/patient/reports", formData);
      if (res.data) setReports((prev) => [res.data!, ...prev]);
      setShowUpload(false);
      setPickedFile(null);
      setName("");
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function handleDelete(id: string) {
    Alert.alert("Delete Report", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          const prev = [...reports];
          setReports((r) => r.filter((rep) => rep.id !== id));
          try {
            await api.delete<ApiResponse>(`/patient/reports/${id}`);
          } catch {
            setReports(prev);
          }
        },
      },
    ]);
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
          <Text style={styles.title}>Medical Reports</Text>
          <Text style={styles.subtitle}>Upload and manage your medical reports</Text>
        </View>
        <TouchableOpacity
          style={styles.uploadBtn}
          onPress={() => { setShowUpload(!showUpload); setPickedFile(null); setName(""); setUploadError(""); }}
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
            <Text style={styles.formLabel}>Report Name *</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="e.g. Blood Test Report"
              placeholderTextColor={colors.slate[400]}
            />
          </View>

          <TouchableOpacity
            style={[styles.submitBtn, (!pickedFile || !name.trim() || uploading) && styles.submitDisabled]}
            onPress={handleUpload}
            disabled={!pickedFile || !name.trim() || uploading}
          >
            {uploading ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <>
                <Ionicons name="cloud-upload" size={16} color={colors.white} />
                <Text style={styles.submitText}>Upload Report</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {reports.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="folder-open" size={36} color="#6ee7b7" />
          <Text style={styles.emptyText}>No reports yet</Text>
          <Text style={styles.emptySub}>Upload your first report to get started</Text>
        </View>
      ) : (
        reports.map((report) => (
          <View key={report.id} style={styles.reportCard}>
            <View style={styles.reportIconBox}>
              <Ionicons name="document" size={18} color="#10b981" />
            </View>
            <View style={styles.reportInfo}>
              <View style={styles.reportNameRow}>
                <Text style={styles.reportName} numberOfLines={1}>{report.name}</Text>
                <View style={[styles.typeBadge, report.type === "pdf" ? styles.typePdf : styles.typeImage]}>
                  <Text style={[styles.typeBadgeText, report.type === "pdf" ? styles.typePdfText : styles.typeImageText]}>
                    {report.type.toUpperCase()}
                  </Text>
                </View>
              </View>
              <Text style={styles.reportDate}>{formatDate(report.date)}</Text>
            </View>
            <View style={styles.reportActions}>
              <TouchableOpacity style={styles.iconBtn} onPress={() => Linking.openURL(report.url)}>
                <Ionicons name="download-outline" size={16} color={colors.slate[400]} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconBtn} onPress={() => handleDelete(report.id)}>
                <Ionicons name="trash-outline" size={16} color={colors.slate[400]} />
              </TouchableOpacity>
            </View>
          </View>
        ))
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
  reportCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.slate[50],
    borderWidth: 1,
    borderColor: colors.slate[100],
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  reportIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#ecfdf5",
    alignItems: "center",
    justifyContent: "center",
  },
  reportInfo: { flex: 1 },
  reportNameRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  reportName: { fontSize: 14, fontWeight: "600", color: colors.slate[800], flex: 1 },
  typeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  typePdf: { backgroundColor: "#fef2f2", borderColor: "#fecaca" },
  typeImage: { backgroundColor: "#eff6ff", borderColor: "#bfdbfe" },
  typeBadgeText: { fontSize: 9, fontWeight: "700" },
  typePdfText: { color: "#ef4444" },
  typeImageText: { color: "#3b82f6" },
  reportDate: { fontSize: 11, color: colors.slate[400], marginTop: 2 },
  reportActions: { flexDirection: "row", gap: 4 },
  iconBtn: { padding: 6 },
});
