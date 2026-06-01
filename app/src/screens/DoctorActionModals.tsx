import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ActivityIndicator,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import { api } from "../lib/api";
import { colors } from "../lib/colors";
import { ApiResponse } from "../types";

interface AddVitalModalProps {
  visible: boolean;
  patientId: string;
  onClose: () => void;
  onAdded: () => void;
}

const VITAL_OPTIONS: { type: string; label: string; unit: string }[] = [
  { type: "blood_pressure", label: "Blood Pressure", unit: "mmHg" },
  { type: "heart_rate", label: "Heart Rate", unit: "bpm" },
  { type: "temperature", label: "Temperature", unit: "°F" },
  { type: "spo2", label: "SpO2", unit: "%" },
  { type: "blood_sugar", label: "Blood Sugar", unit: "mg/dL" },
  { type: "weight", label: "Weight", unit: "kg" },
];

export function AddVitalModal({ visible, patientId, onClose, onAdded }: AddVitalModalProps) {
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [value, setValue] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const selected = VITAL_OPTIONS.find((v) => v.type === selectedType);

  async function handleSubmit() {
    if (!selectedType || !value.trim()) return;
    setSubmitting(true);
    try {
      await api.post<ApiResponse>(`/doctor/patients/${patientId}/vitals`, {
        type: selectedType,
        value: value.trim(),
        unit: selected!.unit,
      });
      setValue("");
      setSelectedType(null);
      onAdded();
      onClose();
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to add vital");
    } finally {
      setSubmitting(false);
    }
  }

  function handleClose() {
    setValue("");
    setSelectedType(null);
    onClose();
  }

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView style={ms.overlay} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={ms.sheet}>
          <View style={ms.sheetHeader}>
            <Text style={ms.sheetTitle}>Add Vital</Text>
            <TouchableOpacity onPress={handleClose}>
              <Ionicons name="close" size={24} color={colors.slate[500]} />
            </TouchableOpacity>
          </View>

          <ScrollView style={ms.sheetBody}>
            <Text style={ms.label}>Type</Text>
            <View style={ms.chipRow}>
              {VITAL_OPTIONS.map((v) => (
                <TouchableOpacity
                  key={v.type}
                  style={[ms.chip, selectedType === v.type && ms.chipActive]}
                  onPress={() => setSelectedType(v.type)}
                >
                  <Text style={[ms.chipText, selectedType === v.type && ms.chipTextActive]}>
                    {v.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {selected && (
              <>
                <Text style={ms.label}>Value ({selected.unit})</Text>
                <TextInput
                  style={ms.input}
                  value={value}
                  onChangeText={setValue}
                  placeholder={`e.g. ${selected.type === "blood_pressure" ? "120/80" : "98"}`}
                  placeholderTextColor={colors.slate[300]}
                  keyboardType={selected.type === "blood_pressure" ? "default" : "numeric"}
                />
              </>
            )}
          </ScrollView>

          <TouchableOpacity
            style={[ms.submitBtn, (!selectedType || !value.trim() || submitting) && ms.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={!selectedType || !value.trim() || submitting}
          >
            {submitting ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={ms.submitBtnText}>Add Vital</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

interface AddPrescriptionModalProps {
  visible: boolean;
  patientId: string;
  onClose: () => void;
  onAdded: () => void;
}

interface MedForm {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
}

export function AddPrescriptionModal({ visible, patientId, onClose, onAdded }: AddPrescriptionModalProps) {
  const [file, setFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [notes, setNotes] = useState("");
  const [meds, setMeds] = useState<MedForm[]>([]);
  const [submitting, setSubmitting] = useState(false);

  function addMed() {
    setMeds((prev) => [...prev, { name: "", dosage: "", frequency: "", duration: "" }]);
  }

  function updateMed(index: number, field: keyof MedForm, val: string) {
    setMeds((prev) => prev.map((m, i) => (i === index ? { ...m, [field]: val } : m)));
  }

  function removeMed(index: number) {
    setMeds((prev) => prev.filter((_, i) => i !== index));
  }

  async function pickFile() {
    const result = await DocumentPicker.getDocumentAsync({
      type: ["image/*", "application/pdf"],
      copyToCacheDirectory: true,
    });
    if (!result.canceled && result.assets[0]) {
      setFile(result.assets[0]);
    }
  }

  async function handleSubmit() {
    if (!file && meds.length === 0) {
      Alert.alert("Error", "Add a prescription file or medications");
      return;
    }

    const validMeds = meds.filter((m) => m.name.trim());
    setSubmitting(true);

    try {
      const formData = new FormData();
      if (file) {
        formData.append("file", {
          uri: file.uri,
          name: file.name,
          type: file.mimeType || "application/octet-stream",
        } as any);
      }
      if (notes.trim()) formData.append("notes", notes.trim());
      if (validMeds.length > 0) formData.append("medications", JSON.stringify(validMeds));

      await api.upload<ApiResponse>(`/doctor/patients/${patientId}/prescriptions`, formData);
      handleClose();
      onAdded();
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to add prescription");
    } finally {
      setSubmitting(false);
    }
  }

  function handleClose() {
    setFile(null);
    setNotes("");
    setMeds([]);
    onClose();
  }

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView style={ms.overlay} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={[ms.sheet, { maxHeight: "85%" }]}>
          <View style={ms.sheetHeader}>
            <Text style={ms.sheetTitle}>Add Prescription</Text>
            <TouchableOpacity onPress={handleClose}>
              <Ionicons name="close" size={24} color={colors.slate[500]} />
            </TouchableOpacity>
          </View>

          <ScrollView style={ms.sheetBody}>
            <Text style={ms.label}>Prescription File</Text>
            <TouchableOpacity style={ms.filePicker} onPress={pickFile}>
              <Ionicons name={file ? "document-attach" : "cloud-upload-outline"} size={20} color={colors.emerald[600]} />
              <Text style={ms.filePickerText} numberOfLines={1}>
                {file ? file.name : "Pick image or PDF"}
              </Text>
            </TouchableOpacity>

            <Text style={ms.label}>Notes (optional)</Text>
            <TextInput
              style={[ms.input, { height: 60, textAlignVertical: "top" }]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Any notes..."
              placeholderTextColor={colors.slate[300]}
              multiline
            />

            <View style={ms.medHeader}>
              <Text style={ms.label}>Medications</Text>
              <TouchableOpacity onPress={addMed}>
                <Ionicons name="add-circle" size={24} color={colors.emerald[600]} />
              </TouchableOpacity>
            </View>

            {meds.map((med, i) => (
              <View key={i} style={ms.medCard}>
                <View style={ms.medCardHeader}>
                  <Text style={ms.medCardTitle}>Med {i + 1}</Text>
                  <TouchableOpacity onPress={() => removeMed(i)}>
                    <Ionicons name="trash-outline" size={18} color={colors.red[500]} />
                  </TouchableOpacity>
                </View>
                <TextInput
                  style={ms.input}
                  value={med.name}
                  onChangeText={(v) => updateMed(i, "name", v)}
                  placeholder="Medicine name"
                  placeholderTextColor={colors.slate[300]}
                />
                <View style={ms.row}>
                  <TextInput
                    style={[ms.input, { flex: 1 }]}
                    value={med.dosage}
                    onChangeText={(v) => updateMed(i, "dosage", v)}
                    placeholder="Dosage"
                    placeholderTextColor={colors.slate[300]}
                  />
                  <TextInput
                    style={[ms.input, { flex: 1 }]}
                    value={med.frequency}
                    onChangeText={(v) => updateMed(i, "frequency", v)}
                    placeholder="Frequency"
                    placeholderTextColor={colors.slate[300]}
                  />
                </View>
                <TextInput
                  style={ms.input}
                  value={med.duration}
                  onChangeText={(v) => updateMed(i, "duration", v)}
                  placeholder="Duration (e.g. 7 days)"
                  placeholderTextColor={colors.slate[300]}
                />
              </View>
            ))}
          </ScrollView>

          <TouchableOpacity
            style={[ms.submitBtn, (!file && meds.length === 0 || submitting) && ms.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={(!file && meds.length === 0) || submitting}
          >
            {submitting ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={ms.submitBtnText}>Add Prescription</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

interface AddReportModalProps {
  visible: boolean;
  patientId: string;
  onClose: () => void;
  onAdded: () => void;
}

export function AddReportModal({ visible, patientId, onClose, onAdded }: AddReportModalProps) {
  const [file, setFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function pickFile() {
    const result = await DocumentPicker.getDocumentAsync({
      type: ["image/*", "application/pdf"],
      copyToCacheDirectory: true,
    });
    if (!result.canceled && result.assets[0]) {
      setFile(result.assets[0]);
    }
  }

  async function handleSubmit() {
    if (!file || !name.trim()) return;
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("file", {
        uri: file.uri,
        name: file.name,
        type: file.mimeType || "application/octet-stream",
      } as any);
      formData.append("name", name.trim());

      await api.upload<ApiResponse>(`/doctor/patients/${patientId}/reports`, formData);
      handleClose();
      onAdded();
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to upload report");
    } finally {
      setSubmitting(false);
    }
  }

  function handleClose() {
    setFile(null);
    setName("");
    onClose();
  }

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView style={ms.overlay} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={ms.sheet}>
          <View style={ms.sheetHeader}>
            <Text style={ms.sheetTitle}>Upload Report</Text>
            <TouchableOpacity onPress={handleClose}>
              <Ionicons name="close" size={24} color={colors.slate[500]} />
            </TouchableOpacity>
          </View>

          <ScrollView style={ms.sheetBody}>
            <Text style={ms.label}>Report Name</Text>
            <TextInput
              style={ms.input}
              value={name}
              onChangeText={setName}
              placeholder="e.g. Blood Test Report"
              placeholderTextColor={colors.slate[300]}
            />

            <Text style={ms.label}>File</Text>
            <TouchableOpacity style={ms.filePicker} onPress={pickFile}>
              <Ionicons name={file ? "document-attach" : "cloud-upload-outline"} size={20} color={colors.emerald[600]} />
              <Text style={ms.filePickerText} numberOfLines={1}>
                {file ? file.name : "Pick image or PDF"}
              </Text>
            </TouchableOpacity>
          </ScrollView>

          <TouchableOpacity
            style={[ms.submitBtn, (!file || !name.trim() || submitting) && ms.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={!file || !name.trim() || submitting}
          >
            {submitting ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={ms.submitBtnText}>Upload Report</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const ms = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 34,
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate[100],
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.slate[800],
  },
  sheetBody: {
    padding: 20,
    maxHeight: 400,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.slate[600],
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    backgroundColor: colors.slate[50],
    borderWidth: 1,
    borderColor: colors.slate[200],
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.slate[800],
    marginBottom: 8,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.slate[50],
    borderWidth: 1,
    borderColor: colors.slate[200],
  },
  chipActive: {
    backgroundColor: colors.emerald[600],
    borderColor: colors.emerald[600],
  },
  chipText: {
    fontSize: 13,
    fontWeight: "500",
    color: colors.slate[600],
  },
  chipTextActive: {
    color: colors.white,
  },
  filePicker: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.slate[50],
    borderWidth: 1,
    borderColor: colors.slate[200],
    borderRadius: 10,
    borderStyle: "dashed",
    padding: 14,
    marginBottom: 8,
  },
  filePickerText: {
    flex: 1,
    fontSize: 14,
    color: colors.slate[500],
  },
  medHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    marginBottom: 4,
  },
  medCard: {
    backgroundColor: colors.slate[50],
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  medCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  medCardTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.slate[600],
  },
  row: {
    flexDirection: "row",
    gap: 8,
  },
  submitBtn: {
    backgroundColor: colors.emerald[600],
    marginHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  submitBtnDisabled: {
    opacity: 0.5,
  },
  submitBtnText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: "600",
  },
});
