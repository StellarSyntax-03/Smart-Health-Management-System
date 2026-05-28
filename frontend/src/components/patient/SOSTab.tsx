"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Loader2,
  AlertTriangle,
  MapPin,
  Clock,
  X,
  Shield,
  Phone,
  User,
  Stethoscope,
  Settings,
  Power,
} from "lucide-react";
import { api } from "@/lib/api";
import { ApiResponse } from "@/types";

interface SOSAlert {
  id: string;
  patientId: string;
  latitude: number | null;
  longitude: number | null;
  status: string;
  createdAt: string;
}

interface SOSConfig {
  sosEnabled: boolean;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  familyDoctorName: string | null;
  familyDoctorPhone: string | null;
}

interface SOSResult {
  alert: SOSAlert;
  notificationsSent: number;
  notificationsTotal: number;
}

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function SOSTab() {
  const [config, setConfig] = useState<SOSConfig | null>(null);
  const [alerts, setAlerts] = useState<SOSAlert[]>([]);
  const [activeAlert, setActiveAlert] = useState<SOSAlert | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [_, setTick] = useState(0);

  const [showSetup, setShowSetup] = useState(false);
  const [setupForm, setSetupForm] = useState({
    emergencyContactName: "",
    emergencyContactPhone: "",
    familyDoctorName: "",
    familyDoctorPhone: "",
  });
  const [settingUp, setSettingUp] = useState(false);
  const [disabling, setDisabling] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [configRes, allRes, activeRes] = await Promise.all([
        api.get<ApiResponse<SOSConfig>>("/patient/sos/config"),
        api.get<ApiResponse<SOSAlert[]>>("/patient/sos"),
        api.get<ApiResponse<SOSAlert | null>>("/patient/sos/active"),
      ]);
      if (configRes.data) {
        setConfig(configRes.data);
        if (configRes.data.sosEnabled) {
          setSetupForm({
            emergencyContactName: configRes.data.emergencyContactName || "",
            emergencyContactPhone: configRes.data.emergencyContactPhone || "",
            familyDoctorName: configRes.data.familyDoctorName || "",
            familyDoctorPhone: configRes.data.familyDoctorPhone || "",
          });
        }
      }
      if (allRes.data) setAlerts(allRes.data);
      setActiveAlert(activeRes.data ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load SOS data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!activeAlert) return;
    const interval = setInterval(async () => {
      setTick((t) => t + 1);
      try {
        const res = await api.get<ApiResponse<SOSAlert | null>>("/patient/sos/active");
        if (!res.data) {
          setActiveAlert(null);
          setSuccessMsg("Alert resolved! Your contact has confirmed.");
          setTimeout(() => setSuccessMsg(""), 5000);
          const allRes = await api.get<ApiResponse<SOSAlert[]>>("/patient/sos");
          if (allRes.data) setAlerts(allRes.data);
        }
      } catch {}
    }, 5000);
    return () => clearInterval(interval);
  }, [activeAlert]);

  async function handleSetup() {
    const { emergencyContactName, emergencyContactPhone, familyDoctorName, familyDoctorPhone } = setupForm;
    if (!emergencyContactName || !emergencyContactPhone || !familyDoctorName || !familyDoctorPhone) {
      setError("All fields are required");
      return;
    }

    setSettingUp(true);
    setError("");
    try {
      await api.post<ApiResponse>("/patient/sos/setup", setupForm);
      setConfig((prev) => prev ? { ...prev, sosEnabled: true, ...setupForm } : null);
      setShowSetup(false);
      setSuccessMsg("SOS enabled! Emergency contacts saved.");
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Setup failed");
    } finally {
      setSettingUp(false);
    }
  }

  async function handleDisable() {
    if (!confirm("Disable SOS? Your emergency contacts will be kept but alerts won't be sent.")) return;
    setDisabling(true);
    try {
      await api.post<ApiResponse>("/patient/sos/disable", {});
      setConfig((prev) => prev ? { ...prev, sosEnabled: false } : null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to disable");
    } finally {
      setDisabling(false);
    }
  }

  async function handleSOS() {
    setSending(true);
    setError("");
    setSuccessMsg("");

    let latitude: number | undefined;
    let longitude: number | undefined;

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          timeout: 5000,
          enableHighAccuracy: true,
        });
      });
      latitude = position.coords.latitude;
      longitude = position.coords.longitude;
    } catch {
    }

    try {
      const res = await api.post<ApiResponse<SOSResult>>("/patient/sos", { latitude, longitude });
      if (res.data) {
        setActiveAlert(res.data.alert);
        setAlerts((prev) => [res.data!.alert, ...prev]);
        setSuccessMsg(
          `Alert sent! ${res.data.notificationsSent}/${res.data.notificationsTotal} notifications delivered via WhatsApp.`
        );
        setTimeout(() => setSuccessMsg(""), 5000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send SOS");
    } finally {
      setSending(false);
    }
  }

  async function handleCancel(id: string) {
    setCancelling(true);
    setError("");
    try {
      const res = await api.patch<ApiResponse<SOSAlert>>(`/patient/sos/${id}/cancel`);
      if (res.data) {
        setActiveAlert(null);
        setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, status: "cancelled" } : a)));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to cancel alert");
    } finally {
      setCancelling(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 size={24} className="animate-spin text-blue-500" />
      </div>
    );
  }

  const isEnabled = config?.sosEnabled;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Emergency SOS</h2>
          <p className="text-sm text-slate-400 mt-0.5">
            Send an emergency alert with your location via WhatsApp
          </p>
        </div>
        {isEnabled && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSetup(!showSetup)}
              className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
              title="Edit contacts"
            >
              <Settings size={18} />
            </button>
            <button
              onClick={handleDisable}
              disabled={disabling}
              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
              title="Disable SOS"
            >
              {disabling ? <Loader2 size={18} className="animate-spin" /> : <Power size={18} />}
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 text-sm px-4 py-2.5 rounded-xl border border-red-100">
          {error}
        </div>
      )}

      {successMsg && (
        <div className="bg-emerald-50 text-emerald-600 text-sm px-4 py-2.5 rounded-xl border border-emerald-100">
          {successMsg}
        </div>
      )}

      {/* Setup form (shown when not enabled or editing) */}
      {(!isEnabled || showSetup) && (
        <div className="bg-slate-50 rounded-xl p-6 border border-slate-200 space-y-5">
          <div className="flex items-center gap-2 mb-1">
            <Shield size={18} className="text-blue-600" />
            <h3 className="text-sm font-semibold text-slate-700">
              {isEnabled ? "Edit Emergency Contacts" : "Set Up SOS"}
            </h3>
          </div>

          {!isEnabled && (
            <p className="text-xs text-slate-500">
              Enable SOS to send emergency alerts with your location to your contacts via WhatsApp.
            </p>
          )}

          <div className="space-y-4">
            <div className="bg-white rounded-lg border border-slate-200 p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <User size={14} className="text-blue-500" />
                Emergency Contact
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  placeholder="Contact name"
                  value={setupForm.emergencyContactName}
                  onChange={(e) => setSetupForm((p) => ({ ...p, emergencyContactName: e.target.value }))}
                  className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                />
                <input
                  placeholder="Phone with country code (e.g. +91...)"
                  value={setupForm.emergencyContactPhone}
                  onChange={(e) => setSetupForm((p) => ({ ...p, emergencyContactPhone: e.target.value }))}
                  className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                />
              </div>
            </div>

            <div className="bg-white rounded-lg border border-slate-200 p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <Stethoscope size={14} className="text-emerald-500" />
                Family Doctor
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  placeholder="Doctor name"
                  value={setupForm.familyDoctorName}
                  onChange={(e) => setSetupForm((p) => ({ ...p, familyDoctorName: e.target.value }))}
                  className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                />
                <input
                  placeholder="Phone with country code (e.g. +91...)"
                  value={setupForm.familyDoctorPhone}
                  onChange={(e) => setSetupForm((p) => ({ ...p, familyDoctorPhone: e.target.value }))}
                  className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSetup}
              disabled={settingUp}
              className="flex items-center gap-1.5 px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-all shadow-sm"
            >
              {settingUp ? <Loader2 size={16} className="animate-spin" /> : <Shield size={16} />}
              {isEnabled ? "Update Contacts" : "Enable SOS"}
            </button>
            {showSetup && (
              <button
                onClick={() => setShowSetup(false)}
                className="text-sm text-slate-500 hover:text-slate-700"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      )}

      {/* SOS Button - only when enabled */}
      {isEnabled && !showSetup && (
        <>
          {/* Contact info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
              <div className="flex items-center gap-2 mb-2">
                <User size={14} className="text-blue-500" />
                <span className="text-xs font-medium text-blue-400">Emergency Contact</span>
              </div>
              <p className="text-sm font-semibold text-blue-700">{config?.emergencyContactName}</p>
              <p className="text-xs text-blue-500 flex items-center gap-1 mt-0.5">
                <Phone size={10} /> {config?.emergencyContactPhone}
              </p>
            </div>
            <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
              <div className="flex items-center gap-2 mb-2">
                <Stethoscope size={14} className="text-emerald-500" />
                <span className="text-xs font-medium text-emerald-400">Family Doctor</span>
              </div>
              <p className="text-sm font-semibold text-emerald-700">{config?.familyDoctorName}</p>
              <p className="text-xs text-emerald-500 flex items-center gap-1 mt-0.5">
                <Phone size={10} /> {config?.familyDoctorPhone}
              </p>
            </div>
          </div>

          {/* Big SOS button */}
          <div className="flex flex-col items-center py-6">
            <button
              onClick={handleSOS}
              disabled={sending || !!activeAlert}
              className={`relative w-36 h-36 rounded-full font-bold text-white text-lg transition-all shadow-lg focus:outline-none disabled:cursor-not-allowed ${
                activeAlert
                  ? "bg-red-400 shadow-red-400/30"
                  : "bg-red-600 hover:bg-red-700 shadow-red-600/30 hover:shadow-red-600/50 active:scale-95"
              }`}
            >
              {activeAlert && (
                <span className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-30" />
              )}
              <span className="relative flex flex-col items-center gap-1.5">
                {sending ? (
                  <Loader2 size={32} className="animate-spin" />
                ) : (
                  <AlertTriangle size={32} />
                )}
                <span className="text-base tracking-wide">
                  {sending ? "Sending..." : activeAlert ? "ACTIVE" : "SOS"}
                </span>
              </span>
            </button>
            <p className="text-xs text-slate-400 mt-4 text-center max-w-xs">
              {activeAlert
                ? "Emergency alert is active. Your contacts have been notified."
                : "Press to send your location to emergency contacts via WhatsApp"}
            </p>
          </div>

          {/* Active alert banner */}
          {activeAlert && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield size={16} className="text-red-600" />
                  <h3 className="text-sm font-semibold text-red-700">Active Alert</h3>
                </div>
                <span className="px-2.5 py-1 text-[11px] font-semibold rounded-full bg-red-600 text-white uppercase tracking-wider">
                  Active
                </span>
              </div>
              <div className="flex flex-wrap gap-4 text-sm text-red-700">
                {activeAlert.latitude != null && activeAlert.longitude != null && (
                  <div className="flex items-center gap-1.5">
                    <MapPin size={14} />
                    <span>{activeAlert.latitude.toFixed(4)}, {activeAlert.longitude.toFixed(4)}</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  <Clock size={14} />
                  <span>{timeAgo(activeAlert.createdAt)}</span>
                </div>
              </div>
              <button
                onClick={() => handleCancel(activeAlert.id)}
                disabled={cancelling}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-white text-red-600 text-sm font-medium rounded-xl border border-red-200 hover:bg-red-50 disabled:opacity-50 transition-all"
              >
                {cancelling ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />}
                Cancel Alert
              </button>
            </div>
          )}
        </>
      )}

      {/* Alert History */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Clock size={16} className="text-slate-400" />
          <h3 className="text-sm font-semibold text-slate-700">Alert History</h3>
        </div>

        {alerts.length === 0 ? (
          <div className="text-center py-10">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
              <Shield size={24} className="text-slate-300" />
            </div>
            <p className="text-sm text-slate-400">No alerts sent yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className="flex items-center gap-4 bg-white rounded-xl px-4 py-3 border border-slate-100 hover:shadow-sm transition-all"
              >
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    alert.status === "active" ? "bg-red-500" : "bg-slate-300"
                  }`}
                >
                  <AlertTriangle size={16} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-slate-700">Emergency Alert</p>
                    <span
                      className={`px-2 py-0.5 text-[10px] font-semibold rounded-full uppercase tracking-wider ${
                        alert.status === "active"
                          ? "bg-red-100 text-red-600"
                          : alert.status === "resolved"
                            ? "bg-emerald-100 text-emerald-600"
                            : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {alert.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">{formatDate(alert.createdAt)}</p>
                </div>
                {alert.latitude != null && alert.longitude != null && (
                  <div className="flex items-center gap-1 text-xs text-slate-400">
                    <MapPin size={12} />
                    <span>{alert.latitude.toFixed(2)}, {alert.longitude.toFixed(2)}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
