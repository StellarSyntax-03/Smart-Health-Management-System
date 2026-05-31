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
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/auth";
import { colors } from "../lib/colors";
import { AuthStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<AuthStackParamList, "Register">;

const GENDER_OPTIONS = ["Male", "Female", "Other"];
const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

export default function RegisterScreen({ navigation }: Props) {
  const { register } = useAuth();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    age: "",
    gender: "",
    phone: "",
    bloodGroup: "",
    address: "",
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showGenderPicker, setShowGenderPicker] = useState(false);
  const [showBloodPicker, setShowBloodPicker] = useState(false);

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit() {
    setError("");

    if (!form.name || !form.email || !form.password || !form.confirmPassword || !form.age || !form.gender) {
      setError("Please fill in all required fields");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (form.password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    const age = parseInt(form.age, 10);
    if (isNaN(age) || age < 0 || age > 150) {
      setError("Age must be between 0 and 150");
      return;
    }

    setSubmitting(true);
    try {
      await register({
        name: form.name,
        email: form.email,
        password: form.password,
        age,
        gender: form.gender.toLowerCase(),
        phone: form.phone || undefined,
        bloodGroup: form.bloodGroup || undefined,
        address: form.address || undefined,
      });
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
            <Text style={styles.title}>Patient Registration</Text>
            <Text style={styles.subtitle}>Create your SmartHealth AI account</Text>
          </View>

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.form}>
            <View style={styles.field}>
              <Text style={styles.label}>Full Name *</Text>
              <TextInput
                style={styles.input}
                value={form.name}
                onChangeText={(v) => updateField("name", v)}
                placeholder="John Doe"
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

            <View style={styles.row}>
              <View style={[styles.field, styles.flex1]}>
                <Text style={styles.label}>Password *</Text>
                <TextInput
                  style={styles.input}
                  value={form.password}
                  onChangeText={(v) => updateField("password", v)}
                  placeholder="Min 6 chars"
                  placeholderTextColor={colors.slate[400]}
                  secureTextEntry
                  autoCapitalize="none"
                />
              </View>
              <View style={[styles.field, styles.flex1]}>
                <Text style={styles.label}>Confirm *</Text>
                <TextInput
                  style={styles.input}
                  value={form.confirmPassword}
                  onChangeText={(v) => updateField("confirmPassword", v)}
                  placeholder="Repeat"
                  placeholderTextColor={colors.slate[400]}
                  secureTextEntry
                  autoCapitalize="none"
                />
              </View>
            </View>

            <View style={styles.row}>
              <View style={[styles.field, styles.flex1]}>
                <Text style={styles.label}>Age *</Text>
                <TextInput
                  style={styles.input}
                  value={form.age}
                  onChangeText={(v) => updateField("age", v)}
                  placeholder="25"
                  placeholderTextColor={colors.slate[400]}
                  keyboardType="number-pad"
                />
              </View>
              <View style={[styles.field, styles.flex1]}>
                <Text style={styles.label}>Gender *</Text>
                <TouchableOpacity
                  style={styles.picker}
                  onPress={() => {
                    setShowGenderPicker(!showGenderPicker);
                    setShowBloodPicker(false);
                  }}
                >
                  <Text style={form.gender ? styles.pickerText : styles.pickerPlaceholder}>
                    {form.gender || "Select"}
                  </Text>
                  <Ionicons name="chevron-down" size={16} color={colors.slate[400]} />
                </TouchableOpacity>
                {showGenderPicker && (
                  <View style={styles.dropdown}>
                    {GENDER_OPTIONS.map((g) => (
                      <TouchableOpacity
                        key={g}
                        style={styles.dropdownItem}
                        onPress={() => {
                          updateField("gender", g);
                          setShowGenderPicker(false);
                        }}
                      >
                        <Text style={styles.dropdownText}>{g}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            </View>

            <View style={styles.row}>
              <View style={[styles.field, styles.flex1]}>
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
              <View style={[styles.field, styles.flex1]}>
                <Text style={styles.label}>Blood Group</Text>
                <TouchableOpacity
                  style={styles.picker}
                  onPress={() => {
                    setShowBloodPicker(!showBloodPicker);
                    setShowGenderPicker(false);
                  }}
                >
                  <Text style={form.bloodGroup ? styles.pickerText : styles.pickerPlaceholder}>
                    {form.bloodGroup || "Select"}
                  </Text>
                  <Ionicons name="chevron-down" size={16} color={colors.slate[400]} />
                </TouchableOpacity>
                {showBloodPicker && (
                  <View style={styles.dropdown}>
                    {BLOOD_GROUPS.map((bg) => (
                      <TouchableOpacity
                        key={bg}
                        style={styles.dropdownItem}
                        onPress={() => {
                          updateField("bloodGroup", bg);
                          setShowBloodPicker(false);
                        }}
                      >
                        <Text style={styles.dropdownText}>{bg}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Address</Text>
              <TextInput
                style={styles.input}
                value={form.address}
                onChangeText={(v) => updateField("address", v)}
                placeholder="123 Main St, City"
                placeholderTextColor={colors.slate[400]}
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
                <Text style={styles.buttonText}>Create Account</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate("Login", { role: "patient" })}>
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
    backgroundColor: colors.blue[600],
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
  picker: {
    borderWidth: 1,
    borderColor: colors.slate[200],
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  pickerText: {
    fontSize: 14,
    color: colors.slate[900],
  },
  pickerPlaceholder: {
    fontSize: 14,
    color: colors.slate[400],
  },
  dropdown: {
    position: "absolute",
    top: 72,
    left: 0,
    right: 0,
    backgroundColor: colors.white,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.slate[200],
    zIndex: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  dropdownItem: {
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  dropdownText: {
    fontSize: 14,
    color: colors.slate[900],
  },
  button: {
    backgroundColor: colors.blue[600],
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
    color: colors.blue[600],
    fontWeight: "600",
  },
});
