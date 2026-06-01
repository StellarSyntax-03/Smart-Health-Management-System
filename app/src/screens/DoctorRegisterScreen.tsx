import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../lib/api";
import { colors } from "../lib/colors";
import { AuthStackParamList } from "../navigation/types";
import { ApiResponse } from "../types";

type Props = NativeStackScreenProps<AuthStackParamList, "DoctorRegister">;

export default function DoctorRegisterScreen({ navigation }: Props) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    specialization: "",
    licenseNumber: "",
    qualification: "",
    experience: "",
    clinicName: "",
    clinicAddress: "",
    phone: "",
    bio: "",
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit() {
    setError("");

    if (!form.name || !form.email || !form.password || !form.specialization || !form.licenseNumber) {
      setError("Please fill in all required fields");
      return;
    }

    if (form.password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setSubmitting(true);
    try {
      await api.post<ApiResponse>("/doctor/register", {
        name: form.name,
        email: form.email,
        password: form.password,
        specialization: form.specialization,
        licenseNumber: form.licenseNumber,
        qualification: form.qualification || undefined,
        experience: form.experience ? parseInt(form.experience, 10) : undefined,
        clinicName: form.clinicName || undefined,
        clinicAddress: form.clinicAddress || undefined,
        phone: form.phone || undefined,
        bio: form.bio || undefined,
      });
      Alert.alert(
        "Registration Successful",
        "Your account is pending admin approval. You'll be able to login once approved.",
        [{ text: "OK", onPress: () => navigation.navigate("Login", { role: "doctor" }) }],
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <View style={styles.header}>
            <View style={styles.iconBox}>
              <Ionicons name="pulse" size={24} color={colors.white} />
            </View>
            <Text style={styles.title}>Doctor Registration</Text>
            <Text style={styles.subtitle}>Join SmartHealth AI as a provider</Text>
          </View>

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.form}>
            <Text style={styles.sectionLabel}>Account</Text>

            <View style={styles.field}>
              <Text style={styles.label}>Full Name *</Text>
              <TextInput
                style={styles.input}
                value={form.name}
                onChangeText={(v) => updateField("name", v)}
                placeholder="Dr. John Doe"
                placeholderTextColor={colors.slate[400]}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Email *</Text>
              <TextInput
                style={styles.input}
                value={form.email}
                onChangeText={(v) => updateField("email", v)}
                placeholder="you@example.com"
                placeholderTextColor={colors.slate[400]}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Password *</Text>
              <TextInput
                style={styles.input}
                value={form.password}
                onChangeText={(v) => updateField("password", v)}
                placeholder="Min 6 characters"
                placeholderTextColor={colors.slate[400]}
                secureTextEntry
                autoCapitalize="none"
              />
            </View>

            <Text style={styles.sectionLabel}>Professional</Text>

            <View style={styles.field}>
              <Text style={styles.label}>Specialization *</Text>
              <TextInput
                style={styles.input}
                value={form.specialization}
                onChangeText={(v) => updateField("specialization", v)}
                placeholder="e.g. Cardiology"
                placeholderTextColor={colors.slate[400]}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>License Number *</Text>
              <TextInput
                style={styles.input}
                value={form.licenseNumber}
                onChangeText={(v) => updateField("licenseNumber", v)}
                placeholder="e.g. MCI-12345"
                placeholderTextColor={colors.slate[400]}
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.field, styles.flex1]}>
                <Text style={styles.label}>Qualification</Text>
                <TextInput
                  style={styles.input}
                  value={form.qualification}
                  onChangeText={(v) => updateField("qualification", v)}
                  placeholder="e.g. MBBS, MD"
                  placeholderTextColor={colors.slate[400]}
                />
              </View>
              <View style={[styles.field, styles.flex1]}>
                <Text style={styles.label}>Experience (yrs)</Text>
                <TextInput
                  style={styles.input}
                  value={form.experience}
                  onChangeText={(v) => updateField("experience", v)}
                  placeholder="e.g. 10"
                  placeholderTextColor={colors.slate[400]}
                  keyboardType="number-pad"
                />
              </View>
            </View>

            <Text style={styles.sectionLabel}>Clinic</Text>

            <View style={styles.field}>
              <Text style={styles.label}>Clinic Name</Text>
              <TextInput
                style={styles.input}
                value={form.clinicName}
                onChangeText={(v) => updateField("clinicName", v)}
                placeholder="e.g. City Health Clinic"
                placeholderTextColor={colors.slate[400]}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Clinic Address</Text>
              <TextInput
                style={styles.input}
                value={form.clinicAddress}
                onChangeText={(v) => updateField("clinicAddress", v)}
                placeholder="123 Main St, City"
                placeholderTextColor={colors.slate[400]}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Phone</Text>
              <TextInput
                style={styles.input}
                value={form.phone}
                onChangeText={(v) => updateField("phone", v)}
                placeholder="+91 9876543210"
                placeholderTextColor={colors.slate[400]}
                keyboardType="phone-pad"
              />
            </View>

            <Text style={styles.sectionLabel}>About</Text>

            <View style={styles.field}>
              <Text style={styles.label}>Bio</Text>
              <TextInput
                style={[styles.input, styles.multiline]}
                value={form.bio}
                onChangeText={(v) => updateField("bio", v)}
                placeholder="Tell patients about yourself..."
                placeholderTextColor={colors.slate[400]}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            <TouchableOpacity
              style={styles.button}
              onPress={handleSubmit}
              disabled={submitting}
              activeOpacity={0.8}
            >
              {submitting ? (
                <ActivityIndicator color={colors.white} size="small" />
              ) : (
                <Text style={styles.buttonText}>Register</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate("Login", { role: "doctor" })}>
              <Text style={styles.footerLink}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.slate[50],
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 20,
    paddingVertical: 40,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 28,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  header: {
    alignItems: "center",
    marginBottom: 24,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.emerald[600],
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.slate[900],
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: colors.slate[500],
  },
  errorBox: {
    backgroundColor: colors.red[50],
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: colors.red[600],
    fontSize: 13,
  },
  form: {
    gap: 14,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.emerald[600],
    textTransform: "uppercase",
    letterSpacing: 1,
    marginTop: 4,
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  flex1: {
    flex: 1,
  },
  field: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.slate[700],
  },
  input: {
    borderWidth: 1,
    borderColor: colors.slate[200],
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: colors.slate[900],
  },
  multiline: {
    minHeight: 80,
    paddingTop: 12,
  },
  button: {
    backgroundColor: colors.emerald[600],
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  buttonText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: "600",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 20,
  },
  footerText: {
    fontSize: 13,
    color: colors.slate[500],
  },
  footerLink: {
    fontSize: 13,
    color: colors.emerald[600],
    fontWeight: "600",
  },
});
