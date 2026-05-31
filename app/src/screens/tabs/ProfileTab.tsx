import { useState } from "react";
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
import { PatientProfile, ApiResponse } from "../../types";
import { colors } from "../../lib/colors";

const GENDER_OPTIONS = ["Male", "Female", "Other"];
const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

interface Props {
  profile: PatientProfile;
  onUpdate: () => void;
}

export default function ProfileTab({ profile, onUpdate }: Props) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showGenderPicker, setShowGenderPicker] = useState(false);
  const [showBloodPicker, setShowBloodPicker] = useState(false);

  const initials = profile.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  function getFormDefaults() {
    return {
      name: profile.name,
      phone: profile.phone || "",
      age: String(profile.patient?.age || ""),
      gender: profile.patient?.gender || "",
      bloodGroup: profile.patient?.bloodGroup || "",
      address: profile.patient?.address || "",
      allergies: (profile.patient?.allergies || []).join(", "),
      chronicConditions: (profile.patient?.chronicConditions || []).join(", "),
    };
  }

  const [form, setForm] = useState(getFormDefaults);

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function startEdit() {
    setForm(getFormDefaults());
    setError("");
    setEditing(true);
  }

  function cancelEdit() {
    setEditing(false);
    setError("");
    setShowGenderPicker(false);
    setShowBloodPicker(false);
  }

  async function handleSave() {
    setError("");
    setSaving(true);
    try {
      const parsedAge = parseInt(form.age, 10);
      await api.put<ApiResponse>("/patient/profile", {
        name: form.name || undefined,
        phone: form.phone || null,
        age: Number.isFinite(parsedAge) ? parsedAge : undefined,
        gender: form.gender || undefined,
        bloodGroup: form.bloodGroup || null,
        address: form.address || null,
        allergies: form.allergies
          ? form.allergies.split(",").map((s) => s.trim()).filter(Boolean)
          : [],
        chronicConditions: form.chronicConditions
          ? form.chronicConditions.split(",").map((s) => s.trim()).filter(Boolean)
          : [],
      });
      setEditing(false);
      onUpdate();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.profileHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <Text style={styles.profileName}>{profile.name}</Text>
        <Text style={styles.profileEmail}>{profile.email}</Text>
        {!editing ? (
          <TouchableOpacity style={styles.editButton} onPress={startEdit}>
            <Ionicons name="create-outline" size={14} color={colors.blue[600]} />
            <Text style={styles.editButtonText}>Edit Profile</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.editActions}>
            <TouchableOpacity style={styles.cancelButton} onPress={cancelEdit}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={saving}>
              {saving ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <>
                  <Ionicons name="checkmark" size={14} color={colors.white} />
                  <Text style={styles.saveText}>Save</Text>
                </>
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

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="person" size={16} color={colors.blue[600]} />
          <Text style={styles.cardTitle}>Personal Information</Text>
        </View>

        <InfoRow icon="call" label="Phone" editing={editing}>
          {editing ? (
            <TextInput style={styles.input} value={form.phone} onChangeText={(v) => updateField("phone", v)} placeholder="Not set" placeholderTextColor={colors.slate[400]} keyboardType="phone-pad" />
          ) : (
            <Text style={styles.infoValue}>{profile.phone || "Not set"}</Text>
          )}
        </InfoRow>

        <InfoRow icon="calendar" label="Age" editing={editing}>
          {editing ? (
            <TextInput style={styles.input} value={form.age} onChangeText={(v) => updateField("age", v)} keyboardType="number-pad" />
          ) : (
            <Text style={styles.infoValue}>{profile.patient?.age ?? "Not set"}</Text>
          )}
        </InfoRow>

        <InfoRow icon="male-female" label="Gender" editing={editing} last>
          {editing ? (
            <View>
              <TouchableOpacity style={styles.picker} onPress={() => { setShowGenderPicker(!showGenderPicker); setShowBloodPicker(false); }}>
                <Text style={form.gender ? styles.pickerText : styles.pickerPlaceholder}>{form.gender || "Select"}</Text>
                <Ionicons name="chevron-down" size={16} color={colors.slate[400]} />
              </TouchableOpacity>
              {showGenderPicker && (
                <View style={styles.dropdown}>
                  {GENDER_OPTIONS.map((g) => (
                    <TouchableOpacity key={g} style={styles.dropdownItem} onPress={() => { updateField("gender", g.toLowerCase()); setShowGenderPicker(false); }}>
                      <Text style={styles.dropdownText}>{g}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          ) : (
            <Text style={[styles.infoValue, { textTransform: "capitalize" }]}>{profile.patient?.gender || "Not set"}</Text>
          )}
        </InfoRow>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="medkit" size={16} color="#10b981" />
          <Text style={styles.cardTitle}>Medical Information</Text>
        </View>

        <InfoRow icon="water" label="Blood Group" editing={editing}>
          {editing ? (
            <View>
              <TouchableOpacity style={styles.picker} onPress={() => { setShowBloodPicker(!showBloodPicker); setShowGenderPicker(false); }}>
                <Text style={form.bloodGroup ? styles.pickerText : styles.pickerPlaceholder}>{form.bloodGroup || "Select"}</Text>
                <Ionicons name="chevron-down" size={16} color={colors.slate[400]} />
              </TouchableOpacity>
              {showBloodPicker && (
                <View style={styles.dropdown}>
                  {BLOOD_GROUPS.map((bg) => (
                    <TouchableOpacity key={bg} style={styles.dropdownItem} onPress={() => { updateField("bloodGroup", bg); setShowBloodPicker(false); }}>
                      <Text style={styles.dropdownText}>{bg}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          ) : (
            <Text style={styles.infoValue}>{profile.patient?.bloodGroup || "Not set"}</Text>
          )}
        </InfoRow>

        <InfoRow icon="location" label="Address" editing={editing}>
          {editing ? (
            <TextInput style={styles.input} value={form.address} onChangeText={(v) => updateField("address", v)} placeholder="Not set" placeholderTextColor={colors.slate[400]} />
          ) : (
            <Text style={styles.infoValue}>{profile.patient?.address || "Not set"}</Text>
          )}
        </InfoRow>

        <InfoRow icon="alert-circle" label="Allergies" editing={editing}>
          {editing ? (
            <TextInput style={styles.input} value={form.allergies} onChangeText={(v) => updateField("allergies", v)} placeholder="Comma separated" placeholderTextColor={colors.slate[400]} />
          ) : (
            <View style={styles.tagRow}>
              {profile.patient?.allergies?.length ? (
                profile.patient.allergies.map((a) => (
                  <View key={a} style={styles.tagRed}><Text style={styles.tagRedText}>{a}</Text></View>
                ))
              ) : (
                <Text style={styles.emptyValue}>None</Text>
              )}
            </View>
          )}
        </InfoRow>

        <InfoRow icon="fitness" label="Chronic Conditions" editing={editing} last>
          {editing ? (
            <TextInput style={styles.input} value={form.chronicConditions} onChangeText={(v) => updateField("chronicConditions", v)} placeholder="Comma separated" placeholderTextColor={colors.slate[400]} />
          ) : (
            <View style={styles.tagRow}>
              {profile.patient?.chronicConditions?.length ? (
                profile.patient.chronicConditions.map((c) => (
                  <View key={c} style={styles.tagAmber}><Text style={styles.tagAmberText}>{c}</Text></View>
                ))
              ) : (
                <Text style={styles.emptyValue}>None</Text>
              )}
            </View>
          )}
        </InfoRow>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

function InfoRow({ icon, label, editing, last, children }: { icon: string; label: string; editing: boolean; last?: boolean; children: React.ReactNode }) {
  return (
    <View style={[styles.infoRow, !last && styles.infoRowBorder]}>
      <View style={styles.infoRowLabel}>
        <Ionicons name={icon as any} size={14} color={colors.slate[400]} />
        <Text style={styles.label}>{label}</Text>
      </View>
      <View style={styles.infoRowContent}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  profileHeader: {
    alignItems: "center",
    paddingVertical: 24,
    marginBottom: 8,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.blue[600],
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  avatarText: {
    color: colors.white,
    fontSize: 28,
    fontWeight: "700",
  },
  profileName: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.slate[900],
  },
  profileEmail: {
    fontSize: 13,
    color: colors.slate[400],
    marginTop: 4,
    marginBottom: 16,
  },
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.blue[50],
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
  },
  editButtonText: { fontSize: 13, fontWeight: "600", color: colors.blue[600] },
  editActions: { flexDirection: "row", gap: 10 },
  cancelButton: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, backgroundColor: colors.slate[100] },
  cancelText: { fontSize: 13, fontWeight: "500", color: colors.slate[500] },
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.blue[600],
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
  },
  saveText: { fontSize: 13, fontWeight: "600", color: colors.white },
  errorBox: {
    backgroundColor: colors.red[50],
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  errorText: { color: colors.red[600], fontSize: 13 },
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.slate[100],
    overflow: "hidden",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: colors.slate[50],
    borderBottomWidth: 1,
    borderBottomColor: colors.slate[100],
  },
  cardTitle: { fontSize: 14, fontWeight: "700", color: colors.slate[700] },
  infoRow: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  infoRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.slate[50],
  },
  infoRowLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.slate[400],
  },
  infoRowContent: {},
  infoValue: { fontSize: 15, fontWeight: "500", color: colors.slate[800] },
  emptyValue: { fontSize: 14, color: colors.slate[400] },
  input: {
    borderWidth: 1,
    borderColor: colors.slate[200],
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: colors.slate[900],
    backgroundColor: colors.slate[50],
  },
  picker: {
    borderWidth: 1,
    borderColor: colors.slate[200],
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.slate[50],
  },
  pickerText: { fontSize: 14, color: colors.slate[900] },
  pickerPlaceholder: { fontSize: 14, color: colors.slate[400] },
  dropdown: {
    backgroundColor: colors.white,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.slate[200],
    marginTop: 4,
  },
  dropdownItem: { paddingHorizontal: 14, paddingVertical: 10 },
  dropdownText: { fontSize: 14, color: colors.slate[900] },
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  tagRed: { backgroundColor: "#fef2f2", borderWidth: 1, borderColor: "#fecaca", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  tagRedText: { fontSize: 12, fontWeight: "500", color: "#dc2626" },
  tagAmber: { backgroundColor: "#fffbeb", borderWidth: 1, borderColor: "#fde68a", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  tagAmberText: { fontSize: 12, fontWeight: "500", color: "#d97706" },
});
