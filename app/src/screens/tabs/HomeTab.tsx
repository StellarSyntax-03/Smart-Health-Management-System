import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { PatientProfile } from "../../types";
import { colors } from "../../lib/colors";

interface Props {
  profile: PatientProfile;
  onNavigate: (tab: string) => void;
}

export default function HomeTab({ profile, onNavigate }: Props) {
  const patient = profile.patient;
  const initials = profile.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.profileName}>{profile.name}</Text>
          <Text style={styles.profileMeta}>
            {patient?.age ? `${patient.age} yrs` : ""}{patient?.gender ? ` · ${patient.gender}` : ""}{patient?.bloodGroup ? ` · ${patient.bloodGroup}` : ""}
          </Text>
        </View>
        <TouchableOpacity style={styles.profileArrow} onPress={() => onNavigate("profile")}>
          <Ionicons name="chevron-forward" size={20} color={colors.slate[400]} />
        </TouchableOpacity>
      </View>

      {(patient?.allergies?.length || patient?.chronicConditions?.length) ? (
        <View style={styles.alertCard}>
          <View style={styles.alertHeader}>
            <Ionicons name="warning" size={16} color="#d97706" />
            <Text style={styles.alertTitle}>Health Alerts</Text>
          </View>
          {patient?.allergies?.length ? (
            <View style={styles.alertRow}>
              <Text style={styles.alertLabel}>Allergies</Text>
              <View style={styles.tagRow}>
                {patient.allergies.map((a) => (
                  <View key={a} style={styles.tagRed}>
                    <Text style={styles.tagRedText}>{a}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}
          {patient?.chronicConditions?.length ? (
            <View style={styles.alertRow}>
              <Text style={styles.alertLabel}>Conditions</Text>
              <View style={styles.tagRow}>
                {patient.chronicConditions.map((c) => (
                  <View key={c} style={styles.tagAmber}>
                    <Text style={styles.tagAmberText}>{c}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}
        </View>
      ) : null}

      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.grid}>
        <QuickAction icon="pulse" label="Vitals" color="#3b82f6" bg="#eff6ff" onPress={() => onNavigate("vitals")} />
        <QuickAction icon="medical" label="Medications" color="#8b5cf6" bg="#f5f3ff" onPress={() => onNavigate("medications")} />
        <QuickAction icon="chatbubbles" label="AI Assistant" color="#10b981" bg="#ecfdf5" onPress={() => onNavigate("chat")} />
        <QuickAction icon="document-text" label="Prescriptions" color="#f59e0b" bg="#fffbeb" onPress={() => onNavigate("prescriptions")} />
        <QuickAction icon="folder" label="Reports" color="#6366f1" bg="#eef2ff" onPress={() => onNavigate("reports")} />
        <QuickAction icon="alert-circle" label="SOS" color="#ef4444" bg="#fef2f2" onPress={() => onNavigate("sos")} />
      </View>

      <View style={styles.infoCards}>
        <View style={styles.infoCard}>
          <View style={[styles.infoIcon, { backgroundColor: "#eff6ff" }]}>
            <Ionicons name="water" size={20} color="#3b82f6" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.infoLabel}>Blood Group</Text>
            <Text style={styles.infoValue}>{patient?.bloodGroup || "Not set"}</Text>
          </View>
        </View>
        <View style={styles.infoCard}>
          <View style={[styles.infoIcon, { backgroundColor: "#ecfdf5" }]}>
            <Ionicons name="location" size={20} color="#10b981" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.infoLabel}>Address</Text>
            <Text style={styles.infoValue}>{patient?.address || "Not set"}</Text>
          </View>
        </View>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

function QuickAction({ icon, label, color, bg, onPress }: { icon: string; label: string; color: string; bg: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={[styles.quickAction, { backgroundColor: bg }]} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.quickActionIcon, { backgroundColor: color }]}>
        <Ionicons name={icon as any} size={20} color="#fff" />
      </View>
      <Text style={[styles.quickActionLabel, { color }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.slate[100],
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.blue[600],
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: colors.white,
    fontSize: 20,
    fontWeight: "700",
  },
  profileInfo: {
    flex: 1,
    marginLeft: 14,
  },
  profileName: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.slate[900],
  },
  profileMeta: {
    fontSize: 13,
    color: colors.slate[400],
    marginTop: 2,
    textTransform: "capitalize",
  },
  profileArrow: {
    padding: 8,
  },
  alertCard: {
    backgroundColor: "#fffbeb",
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#fde68a",
    gap: 10,
  },
  alertHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  alertTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#92400e",
  },
  alertRow: {
    gap: 6,
  },
  alertLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#b45309",
    letterSpacing: 0.5,
  },
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  tagRed: {
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fecaca",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  tagRedText: { fontSize: 12, fontWeight: "500", color: "#dc2626" },
  tagAmber: {
    backgroundColor: "#fff7ed",
    borderWidth: 1,
    borderColor: "#fed7aa",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  tagAmberText: { fontSize: 12, fontWeight: "500", color: "#c2410c" },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.slate[800],
    marginBottom: 14,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 24,
  },
  quickAction: {
    width: "47%",
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
    gap: 10,
  },
  quickActionIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  quickActionLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
  infoCards: {
    gap: 10,
  },
  infoCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.slate[100],
  },
  infoIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.slate[400],
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.slate[800],
    marginTop: 2,
  },
});
