import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { api } from "../../lib/api";
import { colors } from "../../lib/colors";
import { ApiResponse } from "../../types";

interface DoctorRequest {
  id: string;
  status: string;
  createdAt: string;
  doctor: {
    id: string;
    specialization: string | null;
    qualification: string | null;
    experience: number | null;
    clinicName: string | null;
    user: {
      name: string;
      email: string;
    };
  };
}

interface Props {
  onCountChange?: () => void;
}

export default function DoctorRequestsTab({ onCountChange }: Props) {
  const [requests, setRequests] = useState<DoctorRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [processing, setProcessing] = useState<string | null>(null);

  const fetchRequests = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError("");
    try {
      const res = await api.get<ApiResponse<DoctorRequest[]>>(
        "/patient/connections/requests"
      );
      if (res.success && res.data) setRequests(res.data);
    } catch (err: any) {
      setError(err.message || "Failed to load requests");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleApprove = useCallback(
    async (requestId: string, doctorName: string) => {
      Alert.alert(
        "Approve Request",
        `Allow Dr. ${doctorName} to access your health data?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Approve",
            onPress: async () => {
              setProcessing(requestId);
              try {
                await api.patch<ApiResponse>(
                  `/patient/connections/requests/${requestId}/approve`
                );
                setRequests((prev) => prev.filter((r) => r.id !== requestId));
                onCountChange?.();
              } catch (err: any) {
                Alert.alert("Error", err.message || "Failed to approve");
              } finally {
                setProcessing(null);
              }
            },
          },
        ]
      );
    },
    []
  );

  const handleReject = useCallback(
    async (requestId: string, doctorName: string) => {
      Alert.alert(
        "Reject Request",
        `Decline Dr. ${doctorName}'s request?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Reject",
            style: "destructive",
            onPress: async () => {
              setProcessing(requestId);
              try {
                await api.patch<ApiResponse>(
                  `/patient/connections/requests/${requestId}/reject`
                );
                setRequests((prev) => prev.filter((r) => r.id !== requestId));
                onCountChange?.();
              } catch (err: any) {
                Alert.alert("Error", err.message || "Failed to reject");
              } finally {
                setProcessing(null);
              }
            },
          },
        ]
      );
    },
    []
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.blue[600]} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity
          style={styles.retryBtn}
          onPress={() => fetchRequests()}
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
          refreshing={refreshing}
          onRefresh={() => fetchRequests(true)}
          tintColor={colors.blue[600]}
        />
      }
    >
      {requests.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons
            name="people-outline"
            size={48}
            color={colors.slate[300]}
          />
          <Text style={styles.emptyTitle}>No pending requests</Text>
          <Text style={styles.emptySubtitle}>
            When a doctor sends you a connection request, it will appear here.
          </Text>
        </View>
      ) : (
        requests.map((req) => {
          const doc = req.doctor;
          const isProcessing = processing === req.id;
          const initials = doc.user.name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);

          return (
            <View key={req.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{initials}</Text>
                </View>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardName}>
                    {doc.user.name.startsWith("Dr")
                      ? doc.user.name
                      : `Dr. ${doc.user.name}`}
                  </Text>
                  {doc.specialization && (
                    <Text style={styles.cardSpec}>{doc.specialization}</Text>
                  )}
                  <Text style={styles.cardEmail}>{doc.user.email}</Text>
                </View>
              </View>

              <View style={styles.detailRow}>
                {doc.qualification && (
                  <View style={styles.tag}>
                    <Ionicons
                      name="school"
                      size={11}
                      color={colors.blue[600]}
                    />
                    <Text style={styles.tagText}>{doc.qualification}</Text>
                  </View>
                )}
                {doc.experience != null && (
                  <View style={styles.tag}>
                    <Ionicons
                      name="time"
                      size={11}
                      color={colors.blue[600]}
                    />
                    <Text style={styles.tagText}>{doc.experience} yrs exp</Text>
                  </View>
                )}
                {doc.clinicName && (
                  <View style={styles.tag}>
                    <Ionicons
                      name="business"
                      size={11}
                      color={colors.blue[600]}
                    />
                    <Text style={styles.tagText}>{doc.clinicName}</Text>
                  </View>
                )}
              </View>

              <View style={styles.actions}>
                <TouchableOpacity
                  style={[styles.rejectBtn, isProcessing && styles.btnDisabled]}
                  onPress={() => handleReject(req.id, doc.user.name)}
                  disabled={isProcessing}
                  activeOpacity={0.7}
                >
                  {isProcessing ? (
                    <ActivityIndicator size="small" color={colors.red[500]} />
                  ) : (
                    <>
                      <Ionicons
                        name="close"
                        size={16}
                        color={colors.red[500]}
                      />
                      <Text style={styles.rejectBtnText}>Decline</Text>
                    </>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.approveBtn,
                    isProcessing && styles.btnDisabled,
                  ]}
                  onPress={() => handleApprove(req.id, doc.user.name)}
                  disabled={isProcessing}
                  activeOpacity={0.7}
                >
                  {isProcessing ? (
                    <ActivityIndicator size="small" color={colors.white} />
                  ) : (
                    <>
                      <Ionicons
                        name="checkmark"
                        size={16}
                        color={colors.white}
                      />
                      <Text style={styles.approveBtnText}>Approve</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
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
    backgroundColor: colors.blue[600],
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
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.blue[50],
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: colors.blue[600],
    fontSize: 16,
    fontWeight: "700",
  },
  cardInfo: {
    flex: 1,
  },
  cardName: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.slate[800],
  },
  cardSpec: {
    fontSize: 13,
    color: colors.blue[600],
    fontWeight: "500",
    marginTop: 1,
  },
  cardEmail: {
    fontSize: 12,
    color: colors.slate[400],
    marginTop: 1,
  },
  detailRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 12,
  },
  tag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.blue[50],
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  tagText: {
    fontSize: 11,
    fontWeight: "500",
    color: colors.blue[700],
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },
  rejectBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.red[200],
    backgroundColor: colors.red[50],
  },
  rejectBtnText: {
    color: colors.red[500],
    fontSize: 14,
    fontWeight: "600",
  },
  approveBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: colors.blue[600],
  },
  approveBtnText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: "600",
  },
  btnDisabled: {
    opacity: 0.5,
  },
});
