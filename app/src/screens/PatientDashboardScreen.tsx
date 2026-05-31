import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/auth";
import { api } from "../lib/api";
import { colors } from "../lib/colors";
import { PatientProfile, ApiResponse } from "../types";
import HomeTab from "./tabs/HomeTab";
import ProfileTab from "./tabs/ProfileTab";
import VitalsTab from "./tabs/VitalsTab";
import MedicationsTab from "./tabs/MedicationsTab";
import PrescriptionsTab from "./tabs/PrescriptionsTab";
import ReportsTab from "./tabs/ReportsTab";
import HealthAssistantTab from "./tabs/HealthAssistantTab";
import SOSTab from "./tabs/SOSTab";

type TabKey = "home" | "profile" | "vitals" | "medications" | "prescriptions" | "reports" | "chat" | "sos";

const TABS: { key: TabKey; label: string; icon: string; color?: string }[] = [
  { key: "home", label: "Home", icon: "home" },
  { key: "vitals", label: "Vitals", icon: "pulse" },
  { key: "medications", label: "Meds", icon: "medical" },
  { key: "prescriptions", label: "Rx", icon: "document-text" },
  { key: "reports", label: "Reports", icon: "folder" },
  { key: "chat", label: "Health Assistant", icon: "chatbubbles" },
  { key: "sos", label: "SOS", icon: "alert-circle", color: "#ef4444" },
];

export default function PatientDashboardScreen() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<TabKey>("home");
  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  const fetchProfile = useCallback(async () => {
    try {
      const res = await api.get<ApiResponse<PatientProfile>>("/patient/profile");
      if (res.data) setProfile(res.data);
    } catch {}
    finally {
      setLoadingProfile(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  })();

  const initials = user?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "?";

  function renderTab() {
    if (activeTab === "home" || activeTab === "profile") {
      if (loadingProfile || !profile) {
        return (
          <View style={styles.tabLoader}>
            <ActivityIndicator size="large" color={colors.blue[600]} />
          </View>
        );
      }
      if (activeTab === "profile") {
        return <ProfileTab profile={profile} onUpdate={fetchProfile} />;
      }
      return <HomeTab profile={profile} onNavigate={(tab) => setActiveTab(tab as TabKey)} />;
    }

    switch (activeTab) {
      case "vitals": return <VitalsTab />;
      case "medications": return <MedicationsTab />;
      case "prescriptions": return <PrescriptionsTab />;
      case "reports": return <ReportsTab />;
      case "chat": return <HealthAssistantTab />;
      case "sos": return <SOSTab />;
      default: return null;
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.logoRow}>
            <View style={styles.logoBox}>
              <Ionicons name="pulse" size={18} color={colors.white} />
            </View>
            <Text style={styles.logoText}>SmartHealth AI</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={() => setActiveTab("profile")} style={styles.avatarBtn}>
              <Text style={styles.avatarBtnText}>{initials}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={logout} style={styles.logoutButton}>
              <Ionicons name="log-out-outline" size={20} color="rgba(255,255,255,0.8)" />
            </TouchableOpacity>
          </View>
        </View>
        <Text style={styles.greeting}>{greeting}, {user?.name?.split(" ")[0]}</Text>
        <Text style={styles.subGreeting}>Your health dashboard</Text>
      </View>

      <View style={styles.tabBarContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabBar}
        >
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            const tabColor = tab.color || colors.blue[600];
            return (
              <TouchableOpacity
                key={tab.key}
                style={[
                  styles.tab,
                  isActive && { backgroundColor: tabColor },
                ]}
                onPress={() => setActiveTab(tab.key)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={tab.icon as any}
                  size={15}
                  color={isActive ? colors.white : colors.slate[400]}
                />
                <Text
                  style={[
                    styles.tabLabel,
                    isActive && styles.tabLabelActive,
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <View style={styles.content}>
        {renderTab()}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.slate[50],
  },
  header: {
    backgroundColor: colors.blue[600],
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  logoBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "700",
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  avatarBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.25)",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarBtnText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: "700",
  },
  logoutButton: {
    padding: 6,
  },
  greeting: {
    color: colors.white,
    fontSize: 22,
    fontWeight: "700",
  },
  subGreeting: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 14,
    marginTop: 2,
  },
  tabBarContainer: {
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate[100],
  },
  tabBar: {
    flexDirection: "row",
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 6,
  },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: colors.slate[50],
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: colors.slate[400],
  },
  tabLabelActive: {
    color: colors.white,
    fontWeight: "600",
  },
  content: {
    flex: 1,
  },
  tabLoader: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
