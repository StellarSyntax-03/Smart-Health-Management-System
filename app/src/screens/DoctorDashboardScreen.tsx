import { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TextInput,
  RefreshControl,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useAuth } from "../context/auth";
import { api } from "../lib/api";
import { colors } from "../lib/colors";
import { ApiResponse } from "../types";
import { AppStackParamList } from "../navigation/types";

type TabKey = "patients" | "search" | "profile";

const TABS: { key: TabKey; label: string; icon: string }[] = [
  { key: "patients", label: "My Patients", icon: "people" },
  { key: "search", label: "Search", icon: "search" },
  { key: "profile", label: "Profile", icon: "person" },
];

interface ConnectedPatient {
  id: string;
  patientId: string;
  patient: {
    id: string;
    age: number;
    gender: string;
    bloodGroup: string | null;
    allergies: string[];
    chronicConditions: string[];
    user: {
      name: string;
      email: string;
      phone: string | null;
    };
  };
}

interface SearchResult {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  patient: {
    id: string;
    age: number;
    gender: string;
  };
}

interface DoctorProfile {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  doctor: {
    id: string;
    specialization: string;
    qualification: string;
    experience: number;
    licenseNumber: string;
    clinicName: string | null;
    clinicAddress: string | null;
    bio: string | null;
  } | null;
}

export default function DoctorDashboardScreen() {
  const { user, logout } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const [activeTab, setActiveTab] = useState<TabKey>("patients");

  const [connectedPatients, setConnectedPatients] = useState<ConnectedPatient[]>([]);
  const [loadingPatients, setLoadingPatients] = useState(true);
  const [refreshingPatients, setRefreshingPatients] = useState(false);
  const [patientsError, setPatientsError] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [requestStatuses, setRequestStatuses] = useState<Record<string, string>>({});
  const [sendingRequest, setSendingRequest] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [doctorProfile, setDoctorProfile] = useState<DoctorProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [profileError, setProfileError] = useState("");

  const fetchConnectedPatients = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshingPatients(true);
    else setLoadingPatients(true);
    setPatientsError("");
    try {
      const res = await api.get<ApiResponse<ConnectedPatient[]>>("/doctor/patients/connected");
      if (res.success && res.data) setConnectedPatients(res.data);
    } catch (err: any) {
      setPatientsError(err.message || "Failed to load patients");
    } finally {
      setLoadingPatients(false);
      setRefreshingPatients(false);
    }
  }, []);

  const fetchDoctorProfile = useCallback(async () => {
    setLoadingProfile(true);
    setProfileError("");
    try {
      const res = await api.get<ApiResponse<DoctorProfile>>("/doctor/profile");
      if (res.success && res.data) setDoctorProfile(res.data);
    } catch (err: any) {
      setProfileError(err.message || "Failed to load profile");
    } finally {
      setLoadingProfile(false);
    }
  }, []);

  const fetchRequestStatuses = useCallback(async () => {
    try {
      const res = await api.get<ApiResponse<{ patientId: string; status: string }[]>>("/doctor/patients/requests");
      if (res.success && res.data) {
        const map: Record<string, string> = {};
        for (const r of res.data) map[r.patientId] = r.status;
        setRequestStatuses(map);
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchConnectedPatients();
    fetchRequestStatuses();
  }, [fetchConnectedPatients, fetchRequestStatuses]);

  useEffect(() => {
    if (activeTab === "profile" && !doctorProfile && !profileError) {
      fetchDoctorProfile();
    }
  }, [activeTab, doctorProfile, profileError, fetchDoctorProfile]);

  const searchPatients = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    setSearchError("");
    try {
      const res = await api.get<ApiResponse<SearchResult[]>>(
        `/doctor/patients/search?q=${encodeURIComponent(query.trim())}`
      );
      if (res.success && res.data) setSearchResults(res.data);
    } catch (err: any) {
      setSearchError(err.message || "Search failed");
    } finally {
      setSearching(false);
    }
  }, []);

  const handleSearchChange = useCallback(
    (text: string) => {
      setSearchQuery(text);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => searchPatients(text), 300);
    },
    [searchPatients]
  );

  const sendConnectionRequest = useCallback(async (patientId: string) => {
    setSendingRequest(patientId);
    try {
      const res = await api.post<ApiResponse>("/doctor/patients/request", { patientId });
      if (res.success) {
        setRequestStatuses((prev) => ({ ...prev, [patientId]: "pending" }));
      }
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to send request");
    } finally {
      setSendingRequest(null);
    }
  }, []);

  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  })();

  const displayName = user?.name?.startsWith("Dr") ? user.name : `Dr. ${user?.name}`;

  const initials =
    user?.name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "?";

  function renderPatientsTab() {
    if (loadingPatients) {
      return (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.emerald[600]} />
        </View>
      );
    }

    if (patientsError) {
      return (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{patientsError}</Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => fetchConnectedPatients()}
          >
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshingPatients}
            onRefresh={() => fetchConnectedPatients(true)}
            tintColor={colors.emerald[600]}
          />
        }
      >
        {connectedPatients.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={48} color={colors.slate[300]} />
            <Text style={styles.emptyTitle}>No patients connected yet</Text>
            <Text style={styles.emptySubtitle}>
              Search for patients to send connection requests.
            </Text>
            <TouchableOpacity
              style={styles.emptyAction}
              onPress={() => setActiveTab("search")}
            >
              <Ionicons name="search" size={16} color={colors.white} />
              <Text style={styles.emptyActionText}>Search Patients</Text>
            </TouchableOpacity>
          </View>
        ) : (
          connectedPatients.map((cp) => (
            <TouchableOpacity
              key={cp.id}
              style={styles.card}
              activeOpacity={0.7}
              onPress={() =>
                navigation.navigate("PatientDetail", {
                  patientId: cp.patient.id,
                  patientName: cp.patient.user.name,
                })
              }
            >
              <View style={styles.cardHeader}>
                <View style={styles.patientAvatar}>
                  <Text style={styles.patientAvatarText}>
                    {cp.patient.user.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()
                      .slice(0, 2)}
                  </Text>
                </View>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardName}>{cp.patient.user.name}</Text>
                  <Text style={styles.cardMeta}>
                    {cp.patient.age} yrs | {cp.patient.gender}
                  </Text>
                  <Text style={styles.cardEmail}>{cp.patient.user.email}</Text>
                </View>
              </View>
              {(cp.patient.bloodGroup || cp.patient.allergies.length > 0) && (
                <View style={styles.cardTags}>
                  {cp.patient.bloodGroup && (
                    <View style={styles.tag}>
                      <Text style={styles.tagText}>{cp.patient.bloodGroup}</Text>
                    </View>
                  )}
                  {cp.patient.allergies.slice(0, 2).map((a) => (
                    <View key={a} style={[styles.tag, styles.tagAllergy]}>
                      <Text style={styles.tagAllergyText}>{a}</Text>
                    </View>
                  ))}
                </View>
              )}
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    );
  }

  function renderSearchTab() {
    return (
      <View style={styles.searchContainer}>
        <View style={styles.searchInputRow}>
          <Ionicons name="search" size={18} color={colors.slate[400]} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name or email..."
            placeholderTextColor={colors.slate[400]}
            value={searchQuery}
            onChangeText={handleSearchChange}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => {
                setSearchQuery("");
                setSearchResults([]);
              }}
            >
              <Ionicons name="close-circle" size={18} color={colors.slate[400]} />
            </TouchableOpacity>
          )}
        </View>

        {searching && (
          <View style={styles.searchLoading}>
            <ActivityIndicator size="small" color={colors.emerald[600]} />
            <Text style={styles.searchLoadingText}>Searching...</Text>
          </View>
        )}

        {searchError ? (
          <Text style={styles.errorText}>{searchError}</Text>
        ) : null}

        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={styles.scrollContent}
        >
          {!searching && searchQuery.trim().length > 0 && searchResults.length === 0 && !searchError && (
            <View style={styles.emptyState}>
              <Ionicons name="search-outline" size={40} color={colors.slate[300]} />
              <Text style={styles.emptyTitle}>No patients found</Text>
              <Text style={styles.emptySubtitle}>Try a different search term.</Text>
            </View>
          )}

          {searchResults.map((result) => {
            const status = requestStatuses[result.patient.id];
            const isSending = sendingRequest === result.patient.id;

            const statusConfig: Record<string, { label: string; bg: string; text: string; icon: string }> = {
              approved: { label: "Connected", bg: colors.emerald[50], text: colors.emerald[600], icon: "checkmark-circle" },
              pending: { label: "Pending", bg: "#fffbeb", text: "#d97706", icon: "time" },
              rejected: { label: "Declined", bg: colors.red[50], text: colors.red[500], icon: "close-circle" },
            };

            const badge = status ? statusConfig[status] : null;

            return (
              <View key={result.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.patientAvatar}>
                    <Text style={styles.patientAvatarText}>
                      {result.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase()
                        .slice(0, 2)}
                    </Text>
                  </View>
                  <View style={styles.cardInfo}>
                    <View style={styles.nameRow}>
                      <Text style={styles.cardName}>{result.name}</Text>
                      {badge && (
                        <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
                          <Ionicons name={badge.icon as any} size={10} color={badge.text} />
                          <Text style={[styles.statusBadgeText, { color: badge.text }]}>{badge.label}</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.cardMeta}>
                      {result.patient.age} yrs | {result.patient.gender}
                    </Text>
                    <Text style={styles.cardEmail}>{result.email}</Text>
                  </View>
                </View>
                {!status && (
                  <TouchableOpacity
                    style={[styles.requestBtn, isSending && styles.requestBtnDisabled]}
                    onPress={() => sendConnectionRequest(result.patient.id)}
                    disabled={isSending}
                    activeOpacity={0.7}
                  >
                    {isSending ? (
                      <ActivityIndicator size="small" color={colors.white} />
                    ) : (
                      <>
                        <Ionicons name="person-add" size={14} color={colors.white} />
                        <Text style={styles.requestBtnText}>Send Request</Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}
                {status === "rejected" && (
                  <TouchableOpacity
                    style={[styles.requestBtn, isSending && styles.requestBtnDisabled]}
                    onPress={() => sendConnectionRequest(result.patient.id)}
                    disabled={isSending}
                    activeOpacity={0.7}
                  >
                    {isSending ? (
                      <ActivityIndicator size="small" color={colors.white} />
                    ) : (
                      <>
                        <Ionicons name="refresh" size={14} color={colors.white} />
                        <Text style={styles.requestBtnText}>Resend Request</Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
        </ScrollView>
      </View>
    );
  }

  function renderProfileTab() {
    if (loadingProfile) {
      return (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.emerald[600]} />
        </View>
      );
    }

    if (profileError) {
      return (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{profileError}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchDoctorProfile}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (!doctorProfile) return null;

    const doc = doctorProfile.doctor;

    const sections: { title: string; icon: string; fields: { label: string; value: string | null | undefined }[] }[] = [
      {
        title: "Contact",
        icon: "person",
        fields: [
          { label: "Email", value: doctorProfile.email },
          { label: "Phone", value: doctorProfile.phone },
        ],
      },
      {
        title: "Professional",
        icon: "medkit",
        fields: [
          { label: "Specialization", value: doc?.specialization },
          { label: "Qualification", value: doc?.qualification },
          { label: "Experience", value: doc?.experience != null ? `${doc.experience} years` : null },
          { label: "License No.", value: doc?.licenseNumber },
        ],
      },
      {
        title: "Clinic",
        icon: "business",
        fields: [
          { label: "Clinic Name", value: doc?.clinicName },
          { label: "Address", value: doc?.clinicAddress },
        ],
      },
    ];

    return (
      <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent}>
        <View style={styles.profileHeader}>
          <View style={styles.profileAvatar}>
            <Text style={styles.profileAvatarText}>{initials}</Text>
          </View>
          <Text style={styles.profileName}>{displayName}</Text>
          {doc?.specialization && (
            <Text style={styles.profileSpec}>{doc.specialization}</Text>
          )}
        </View>

        {sections.map((section) => {
          const visibleFields = section.fields.filter((f) => f.value);
          if (visibleFields.length === 0) return null;
          return (
            <View key={section.title} style={styles.card}>
              <View style={styles.sectionHeader}>
                <Ionicons name={section.icon as any} size={16} color={colors.emerald[600]} />
                <Text style={styles.sectionTitle}>{section.title}</Text>
              </View>
              {visibleFields.map((field) => (
                <View key={field.label} style={styles.profileRow}>
                  <Text style={styles.profileFieldLabel}>{field.label}</Text>
                  <Text style={styles.profileFieldValue}>{field.value}</Text>
                </View>
              ))}
            </View>
          );
        })}

        {doc?.bio && (
          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <Ionicons name="document-text" size={16} color={colors.emerald[600]} />
              <Text style={styles.sectionTitle}>About</Text>
            </View>
            <Text style={styles.bioText}>{doc.bio}</Text>
          </View>
        )}

        <TouchableOpacity style={styles.logoutBtnFull} onPress={logout} activeOpacity={0.8}>
          <Ionicons name="log-out-outline" size={18} color={colors.white} />
          <Text style={styles.logoutBtnFullText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  function renderTab() {
    switch (activeTab) {
      case "patients":
        return renderPatientsTab();
      case "search":
        return renderSearchTab();
      case "profile":
        return renderProfileTab();
      default:
        return null;
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
            <TouchableOpacity
              onPress={() => setActiveTab("profile")}
              style={styles.avatarBtn}
            >
              <Text style={styles.avatarBtnText}>{initials}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={logout} style={styles.logoutButton}>
              <Ionicons name="log-out-outline" size={20} color="rgba(255,255,255,0.8)" />
            </TouchableOpacity>
          </View>
        </View>
        <Text style={styles.greeting}>
          {greeting}, {displayName.split(" ").slice(0, 2).join(" ")}
        </Text>
        <Text style={styles.subGreeting}>Doctor Dashboard</Text>
      </View>

      <View style={styles.tabBarContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabBar}
        >
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[
                  styles.tab,
                  isActive && { backgroundColor: colors.emerald[600] },
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
                  style={[styles.tabLabel, isActive && styles.tabLabelActive]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <View style={styles.content}>{renderTab()}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.slate[50],
  },
  header: {
    backgroundColor: colors.emerald[600],
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
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  errorText: {
    color: colors.red[500],
    fontSize: 14,
    textAlign: "center",
    marginBottom: 12,
  },
  retryBtn: {
    backgroundColor: colors.emerald[600],
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryBtnText: {
    color: colors.white,
    fontWeight: "600",
    fontSize: 14,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 48,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.slate[700],
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 13,
    color: colors.slate[400],
    marginTop: 4,
    textAlign: "center",
    paddingHorizontal: 32,
  },
  emptyAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.emerald[600],
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 16,
  },
  emptyActionText: {
    color: colors.white,
    fontWeight: "600",
    fontSize: 14,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  patientAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.emerald[50],
    alignItems: "center",
    justifyContent: "center",
  },
  patientAvatarText: {
    color: colors.emerald[600],
    fontSize: 14,
    fontWeight: "700",
  },
  cardInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  cardName: {
    fontSize: 15,
    fontWeight: "600",
    color: colors.slate[800],
  },
  cardMeta: {
    fontSize: 12,
    color: colors.slate[500],
    marginTop: 2,
  },
  cardEmail: {
    fontSize: 12,
    color: colors.slate[400],
    marginTop: 1,
  },
  cardTags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 10,
  },
  tag: {
    backgroundColor: colors.emerald[50],
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  tagText: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.emerald[700],
  },
  tagAllergy: {
    backgroundColor: colors.red[50],
  },
  tagAllergyText: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.red[500],
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: "700",
  },
  requestBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: colors.emerald[600],
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 12,
  },
  requestBtnDisabled: {
    backgroundColor: colors.slate[100],
  },
  requestBtnText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: "600",
  },
  searchContainer: {
    flex: 1,
  },
  searchInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.white,
    margin: 16,
    marginBottom: 0,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.slate[200],
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.slate[800],
    paddingVertical: 0,
  },
  searchLoading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
  },
  searchLoadingText: {
    fontSize: 13,
    color: colors.slate[500],
  },
  profileHeader: {
    alignItems: "center",
    marginBottom: 20,
  },
  profileAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.emerald[600],
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  profileAvatarText: {
    color: colors.white,
    fontSize: 24,
    fontWeight: "700",
  },
  profileName: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.slate[800],
  },
  profileSpec: {
    fontSize: 14,
    color: colors.emerald[600],
    fontWeight: "500",
    marginTop: 2,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.slate[100],
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.slate[700],
  },
  profileRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  profileFieldLabel: {
    fontSize: 13,
    color: colors.slate[400],
    fontWeight: "500",
  },
  profileFieldValue: {
    fontSize: 14,
    color: colors.slate[800],
    fontWeight: "500",
    flexShrink: 1,
    textAlign: "right",
    maxWidth: "60%",
  },
  bioText: {
    fontSize: 14,
    color: colors.slate[700],
    lineHeight: 20,
  },
  logoutBtnFull: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.red[500],
    borderRadius: 10,
    paddingVertical: 14,
    marginTop: 8,
  },
  logoutBtnFullText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: "600",
  },
});
