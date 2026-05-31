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

interface ParsedOutput {
  classification?: string;
  tests?: Array<{
    test_name?: string;
    value?: string;
    unit?: string;
    normal_range?: { min?: number; max?: number };
    interpretation?: string;
  }>;
  pii?: {
    patient_name?: string;
    age?: string;
    gender?: string;
    doctor_name?: string;
    facility_name?: string;
    report_date?: string;
  };
}

export default function ReportsTab() {
  const [reports, setReports] = useState<MedicalReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [pickedFile, setPickedFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [name, setName] = useState("");
  const [parsingId, setParsingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [parsedResults, setParsedResults] = useState<Record<string, ParsedOutput>>({});
  const [parseError, setParseError] = useState("");

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

  async function handleParse(reportId: string) {
    setParsingId(reportId);
    setParseError("");
    try {
      const res = await api.post<{ success: boolean; status: string; data?: ParsedOutput }>(`/patient/reports/${reportId}/parse`, {});
      if (res.status === "completed" && res.data) {
        setParsedResults((prev) => ({ ...prev, [reportId]: res.data! }));
        setExpandedId(reportId);
      } else if (res.status === "processing" || res.status === "queued" || res.status === "inprogress") {
        setExpandedId(reportId);
        pollForResult(reportId);
      }
    } catch {
      setParseError("Failed to start parsing");
    } finally {
      setParsingId(null);
    }
  }

  async function pollForResult(reportId: string) {
    for (let i = 0; i < 12; i++) {
      await new Promise((r) => setTimeout(r, 5000));
      try {
        const res = await api.get<{ success: boolean; status: string; data?: ParsedOutput }>(`/patient/reports/${reportId}/parse`);
        if (res.status === "completed" && res.data) {
          setParsedResults((prev) => ({ ...prev, [reportId]: res.data! }));
          return;
        }
        if (res.status === "error") {
          setParseError("Parsing failed");
          return;
        }
      } catch {
        return;
      }
    }
    setParseError("Parsing timed out");
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
        reports.map((report) => {
          const parsed = parsedResults[report.id];
          const isExpanded = expandedId === report.id;
          return (
            <View key={report.id} style={styles.reportCard}>
              <TouchableOpacity
                style={styles.reportHeader}
                onPress={() => setExpandedId(isExpanded ? null : report.id)}
                activeOpacity={0.7}
              >
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
              </TouchableOpacity>

              {isExpanded && (
                <View style={styles.parseSection}>
                  <TouchableOpacity
                    style={styles.parseBtn}
                    onPress={() => handleParse(report.id)}
                    disabled={parsingId === report.id}
                  >
                    {parsingId === report.id ? (
                      <ActivityIndicator size={12} color="#7c3aed" />
                    ) : (
                      <Ionicons name="sparkles" size={12} color="#7c3aed" />
                    )}
                    <Text style={styles.parseBtnText}>
                      {parsed ? "Re-parse" : parsingId === report.id ? "Parsing..." : "AI Parse Report"}
                    </Text>
                  </TouchableOpacity>

                  {parseError && expandedId === report.id && !parsed && (
                    <Text style={styles.parseError}>{parseError}</Text>
                  )}

                  {!parsed && parsingId !== report.id && !parseError && (
                    <Text style={styles.parseHint}>
                      Extract lab values, test results, and patient info using AI
                    </Text>
                  )}

                  {parsed?.pii && (
                    <View style={styles.piiCard}>
                      <Text style={styles.piiTitle}>REPORT INFO</Text>
                      {parsed.pii.patient_name && <Text style={styles.piiRow}>Patient: {parsed.pii.patient_name}</Text>}
                      {parsed.pii.doctor_name && <Text style={styles.piiRow}>Doctor: {parsed.pii.doctor_name}</Text>}
                      {parsed.pii.facility_name && <Text style={styles.piiRow}>Facility: {parsed.pii.facility_name}</Text>}
                      {parsed.pii.report_date && <Text style={styles.piiRow}>Date: {parsed.pii.report_date}</Text>}
                    </View>
                  )}

                  {parsed?.classification && (
                    <View style={styles.piiCard}>
                      <Text style={styles.piiRow}>Type: {parsed.classification.replace(/_/g, " ")}</Text>
                    </View>
                  )}

                  {parsed?.tests && parsed.tests.length > 0 && (
                    <View style={styles.labResults}>
                      <Text style={styles.labTitle}>LAB RESULTS</Text>
                      {parsed.tests.map((item, idx) => (
                        <View key={idx} style={styles.labRow}>
                          <Text style={styles.labTestName}>{item.test_name || "Unknown test"}</Text>
                          <View style={styles.labValueRow}>
                            <Text style={styles.labValue}>{item.value ?? "-"} {item.unit ?? ""}</Text>
                            {item.normal_range && (
                              <Text style={styles.labRange}>
                                Range: {item.normal_range.min ?? "?"}-{item.normal_range.max ?? "?"}
                              </Text>
                            )}
                          </View>
                          {item.interpretation && (
                            <Text style={[
                              styles.labInterpretation,
                              item.interpretation.toLowerCase() === "normal" ? styles.labNormal : styles.labAbnormal,
                            ]}>
                              {item.interpretation}
                            </Text>
                          )}
                        </View>
                      ))}
                    </View>
                  )}

                  {parsed && (!parsed.tests || parsed.tests.length === 0) && (
                    <Text style={styles.parseHint}>No lab values found in this report</Text>
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
  reportCard: {
    backgroundColor: colors.slate[50],
    borderWidth: 1,
    borderColor: colors.slate[100],
    borderRadius: 14,
    overflow: "hidden",
    marginBottom: 10,
  },
  reportHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
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
  parseSection: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    borderTopWidth: 1,
    borderTopColor: colors.slate[100],
    gap: 8,
    paddingTop: 10,
  },
  parseBtn: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 4,
    backgroundColor: "#f5f3ff",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  parseBtnText: { fontSize: 12, color: "#7c3aed", fontWeight: "500" },
  parseError: { fontSize: 11, color: colors.red[600] },
  parseHint: { fontSize: 11, color: colors.slate[400] },
  piiCard: {
    backgroundColor: colors.white,
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.slate[100],
  },
  piiTitle: { fontSize: 10, fontWeight: "700", color: colors.slate[500], letterSpacing: 1, marginBottom: 6 },
  piiRow: { fontSize: 12, color: colors.slate[700], marginBottom: 2 },
  labResults: {
    backgroundColor: colors.white,
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.slate[100],
  },
  labTitle: { fontSize: 10, fontWeight: "700", color: colors.slate[500], letterSpacing: 1, marginBottom: 8 },
  labRow: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate[50],
  },
  labTestName: { fontSize: 13, fontWeight: "500", color: colors.slate[800] },
  labValueRow: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 2 },
  labValue: { fontSize: 14, fontWeight: "600", color: colors.slate[900] },
  labRange: { fontSize: 11, color: colors.slate[400] },
  labInterpretation: { fontSize: 11, fontWeight: "500", marginTop: 2 },
  labNormal: { color: "#10b981" },
  labAbnormal: { color: "#ef4444" },
});
