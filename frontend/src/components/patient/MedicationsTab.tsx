"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Loader2,
  Pill,
  Check,
  Clock,
  Sun,
  Sunset,
  Moon,
  CloudSun,
  TrendingUp,
  AlertCircle,
} from "lucide-react";
import { api } from "@/lib/api";
import { ApiResponse } from "@/types";

interface MedicationLog {
  id: string;
  medicationId: string;
  date: string;
  timeSlot: string;
  taken: boolean;
  takenAt: string | null;
}

interface Medication {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  logs: MedicationLog[];
  prescription: {
    date: string;
    notes: string | null;
  };
}

interface Adherence {
  total: number;
  taken: number;
  missed: number;
  percentage: number;
}

const SLOT_CONFIG: Record<string, { label: string; icon: typeof Sun; color: string; bgColor: string }> = {
  morning: { label: "Morning", icon: Sun, color: "text-amber-500", bgColor: "bg-amber-50" },
  afternoon: { label: "Afternoon", icon: CloudSun, color: "text-orange-500", bgColor: "bg-orange-50" },
  evening: { label: "Evening", icon: Sunset, color: "text-indigo-500", bgColor: "bg-indigo-50" },
  night: { label: "Night", icon: Moon, color: "text-slate-600", bgColor: "bg-slate-100" },
};

const SLOT_ORDER = ["morning", "afternoon", "evening", "night"];

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function MedicationsTab() {
  const [medications, setMedications] = useState<Medication[]>([]);
  const [adherence, setAdherence] = useState<Adherence | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    setError("");
    try {
      const [scheduleRes, adherenceRes] = await Promise.all([
        api.get<ApiResponse<Medication[]>>("/patient/medications"),
        api.get<ApiResponse<Adherence>>("/patient/medications/adherence"),
      ]);
      if (scheduleRes.data) setMedications(scheduleRes.data);
      if (adherenceRes.data) setAdherence(adherenceRes.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load medications");
    } finally {
      setLoading(false);
    }
  }

  async function handleToggle(logId: string) {
    setTogglingIds((prev) => new Set(prev).add(logId));
    try {
      const res = await api.patch<ApiResponse<MedicationLog>>(
        `/patient/medications/${logId}/toggle`,
      );
      if (res.data) {
        setMedications((prev) =>
          prev.map((med) => ({
            ...med,
            logs: med.logs.map((log) => (log.id === logId ? res.data! : log)),
          })),
        );
        const adherenceRes = await api.get<ApiResponse<Adherence>>("/patient/medications/adherence");
        if (adherenceRes.data) setAdherence(adherenceRes.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setTogglingIds((prev) => {
        const next = new Set(prev);
        next.delete(logId);
        return next;
      });
    }
  }

  const grouped = useMemo(() => {
    const map: Record<string, { medication: Medication; log: MedicationLog }[]> = {};
    for (const slot of SLOT_ORDER) map[slot] = [];

    for (const med of medications) {
      for (const log of med.logs) {
        if (map[log.timeSlot]) {
          map[log.timeSlot].push({ medication: med, log });
        }
      }
    }

    return Object.entries(map).filter(([, items]) => items.length > 0);
  }, [medications]);

  const todayTaken = useMemo(() => {
    let taken = 0;
    let total = 0;
    for (const med of medications) {
      for (const log of med.logs) {
        total++;
        if (log.taken) taken++;
      }
    }
    return { taken, total };
  }, [medications]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 size={24} className="animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-bold text-slate-800">Medication Reminders</h2>
        <p className="text-sm text-slate-400 mt-0.5">Track your daily medication schedule</p>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 text-sm px-4 py-2.5 rounded-xl border border-red-100">
          {error}
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
          <p className="text-xs font-medium text-blue-400">Today&apos;s Progress</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">
            {todayTaken.taken}/{todayTaken.total}
          </p>
          <p className="text-[10px] text-blue-400 mt-0.5">doses taken</p>
        </div>
        <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
          <p className="text-xs font-medium text-emerald-400">7-Day Adherence</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">
            {adherence?.percentage ?? 0}%
          </p>
          <p className="text-[10px] text-emerald-400 mt-0.5">
            {adherence?.taken ?? 0} of {adherence?.total ?? 0} doses
          </p>
        </div>
        <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
          <p className="text-xs font-medium text-amber-400">Missed</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">{adherence?.missed ?? 0}</p>
          <p className="text-[10px] text-amber-400 mt-0.5">last 7 days</p>
        </div>
        <div className="bg-purple-50 rounded-xl p-4 border border-purple-100">
          <p className="text-xs font-medium text-purple-400">Medications</p>
          <p className="text-2xl font-bold text-purple-600 mt-1">{medications.length}</p>
          <p className="text-[10px] text-purple-400 mt-0.5">active prescriptions</p>
        </div>
      </div>

      {/* Schedule */}
      {medications.length === 0 ? (
        <div className="text-center py-10">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
            <Pill size={24} className="text-slate-300" />
          </div>
          <p className="text-sm text-slate-400">No medications prescribed yet</p>
          <p className="text-xs text-slate-300 mt-1">
            Prescriptions with medications will appear here
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {grouped.map(([slot, items]) => {
            const config = SLOT_CONFIG[slot];
            const Icon = config.icon;
            const allDone = items.every((i) => i.log.taken);

            return (
              <div key={slot}>
                <div className="flex items-center gap-2 mb-3">
                  <div className={`w-8 h-8 rounded-lg ${config.bgColor} flex items-center justify-center`}>
                    <Icon size={16} className={config.color} />
                  </div>
                  <h3 className="text-sm font-semibold text-slate-700">{config.label}</h3>
                  {allDone && (
                    <span className="ml-auto text-xs text-emerald-500 font-medium flex items-center gap-1">
                      <Check size={12} /> All done
                    </span>
                  )}
                </div>

                <div className="space-y-2">
                  {items.map(({ medication, log }) => (
                    <div
                      key={log.id}
                      className={`flex items-center gap-4 rounded-xl px-4 py-3 border transition-all ${
                        log.taken
                          ? "bg-emerald-50/50 border-emerald-100"
                          : "bg-white border-slate-100 hover:shadow-sm"
                      }`}
                    >
                      <button
                        onClick={() => handleToggle(log.id)}
                        disabled={togglingIds.has(log.id)}
                        className={`w-8 h-8 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all ${
                          log.taken
                            ? "bg-emerald-500 border-emerald-500"
                            : "border-slate-300 hover:border-blue-400"
                        }`}
                      >
                        {togglingIds.has(log.id) ? (
                          <Loader2 size={14} className="animate-spin text-slate-400" />
                        ) : log.taken ? (
                          <Check size={14} className="text-white" />
                        ) : null}
                      </button>

                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-sm font-medium ${
                            log.taken ? "text-slate-400 line-through" : "text-slate-700"
                          }`}
                        >
                          {medication.name}
                        </p>
                        <p className="text-xs text-slate-400">
                          {medication.dosage} &middot; {medication.frequency}
                        </p>
                      </div>

                      {log.taken && log.takenAt ? (
                        <span className="text-xs text-emerald-500 flex items-center gap-1">
                          <Check size={12} /> {formatTime(log.takenAt)}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-300 flex items-center gap-1">
                          <Clock size={12} /> Pending
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
