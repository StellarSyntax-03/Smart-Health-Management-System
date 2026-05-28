"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Loader2,
  Plus,
  Trash2,
  Heart,
  Thermometer,
  Activity,
  Droplets,
  Weight,
  Wind,
  TrendingUp,
  X,
} from "lucide-react";
import { api } from "@/lib/api";
import { ApiResponse } from "@/types";

interface Vital {
  id: string;
  type: string;
  value: string;
  unit: string;
  recordedAt: string;
}

const VITAL_TYPES = [
  { key: "heart_rate", label: "Heart Rate", unit: "bpm", icon: Heart, color: "bg-red-500", lightColor: "bg-red-50", textColor: "text-red-600" },
  { key: "blood_pressure", label: "Blood Pressure", unit: "mmHg", icon: Activity, color: "bg-blue-500", lightColor: "bg-blue-50", textColor: "text-blue-600" },
  { key: "temperature", label: "Temperature", unit: "°F", icon: Thermometer, color: "bg-orange-500", lightColor: "bg-orange-50", textColor: "text-orange-600" },
  { key: "spo2", label: "SpO2", unit: "%", icon: Wind, color: "bg-cyan-500", lightColor: "bg-cyan-50", textColor: "text-cyan-600" },
  { key: "blood_sugar", label: "Blood Sugar", unit: "mg/dL", icon: Droplets, color: "bg-purple-500", lightColor: "bg-purple-50", textColor: "text-purple-600" },
  { key: "weight", label: "Weight", unit: "kg", icon: Weight, color: "bg-emerald-500", lightColor: "bg-emerald-50", textColor: "text-emerald-600" },
] as const;

function getVitalConfig(type: string) {
  return VITAL_TYPES.find((v) => v.key === type) || VITAL_TYPES[0];
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function VitalsTab() {
  const [vitals, setVitals] = useState<Vital[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [filterType, setFilterType] = useState<string>("all");
  const [formData, setFormData] = useState({ type: "heart_rate", value: "", unit: "bpm" });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchVitals();
  }, []);

  async function fetchVitals() {
    setLoading(true);
    try {
      const res = await api.get<ApiResponse<Vital[]>>("/patient/vitals");
      if (res.data) setVitals(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load vitals");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.value.trim()) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await api.post<ApiResponse<Vital>>("/patient/vitals", {
        type: formData.type,
        value: formData.value.trim(),
        unit: formData.unit,
      });
      if (res.data) {
        setVitals((prev) => [res.data!, ...prev]);
        setFormData((prev) => ({ ...prev, value: "" }));
        setShowForm(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save vital");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await api.delete<ApiResponse>(`/patient/vitals/${id}`);
      setVitals((prev) => prev.filter((v) => v.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete vital");
    }
  }

  function handleTypeChange(type: string) {
    const config = getVitalConfig(type);
    setFormData({ type, value: "", unit: config.unit });
  }

  const filtered = useMemo(
    () => (filterType === "all" ? vitals : vitals.filter((v) => v.type === filterType)),
    [vitals, filterType]
  );

  const latestByType = useMemo(() => {
    const map: Record<string, Vital> = {};
    for (const v of vitals) {
      if (!map[v.type] || new Date(v.recordedAt) > new Date(map[v.type].recordedAt)) {
        map[v.type] = v;
      }
    }
    return map;
  }, [vitals]);

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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Vitals Tracking</h2>
          <p className="text-sm text-slate-400 mt-0.5">Monitor your health metrics over time</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-all shadow-sm shadow-blue-600/20"
        >
          {showForm ? <X size={16} /> : <Plus size={16} />}
          {showForm ? "Cancel" : "Record Vital"}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 text-sm px-4 py-2.5 rounded-xl border border-red-100">
          {error}
        </div>
      )}

      {/* Add form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-slate-50 rounded-xl p-5 border border-slate-200 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1.5 block">Type</label>
              <select
                value={formData.type}
                onChange={(e) => handleTypeChange(e.target.value)}
                className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {VITAL_TYPES.map((t) => (
                  <option key={t.key} value={t.key}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1.5 block">Value</label>
              <input
                type="text"
                value={formData.value}
                onChange={(e) => setFormData((prev) => ({ ...prev, value: e.target.value }))}
                placeholder={formData.type === "blood_pressure" ? "120/80" : "Enter value"}
                className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1.5 block">Unit</label>
              <input
                type="text"
                value={formData.unit}
                readOnly
                className="w-full px-3 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-sm text-slate-500"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={submitting || !formData.value.trim()}
            className="flex items-center gap-1.5 px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-all shadow-sm"
          >
            {submitting ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
            Save
          </button>
        </form>
      )}

      {/* Latest vitals cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {VITAL_TYPES.map(({ key, label, unit, icon: Icon, color, lightColor, textColor }) => {
          const latest = latestByType[key];
          return (
            <div key={key} className={`rounded-xl p-4 border border-slate-100 ${lightColor}`}>
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-8 h-8 rounded-lg ${color} flex items-center justify-center`}>
                  <Icon size={14} className="text-white" />
                </div>
                <span className="text-xs font-medium text-slate-500">{label}</span>
              </div>
              {latest ? (
                <>
                  <p className={`text-xl font-bold ${textColor}`}>
                    {latest.value}
                    <span className="text-xs font-normal text-slate-400 ml-1">{unit}</span>
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1">{formatDate(latest.recordedAt)}</p>
                </>
              ) : (
                <p className="text-sm text-slate-300 mt-1">No data</p>
              )}
            </div>
          );
        })}
      </div>

      {/* Filter + History */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={16} className="text-slate-400" />
          <h3 className="text-sm font-semibold text-slate-700">History</h3>
          <div className="ml-auto">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All types</option>
              {VITAL_TYPES.map((t) => (
                <option key={t.key} value={t.key}>{t.label}</option>
              ))}
            </select>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-10">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
              <Activity size={24} className="text-slate-300" />
            </div>
            <p className="text-sm text-slate-400">No vitals recorded yet</p>
            <p className="text-xs text-slate-300 mt-1">Tap &quot;Record Vital&quot; to start tracking</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((vital) => {
              const config = getVitalConfig(vital.type);
              const Icon = config.icon;
              return (
                <div
                  key={vital.id}
                  className="group flex items-center gap-4 bg-white rounded-xl px-4 py-3 border border-slate-100 hover:shadow-sm transition-all"
                >
                  <div className={`w-10 h-10 rounded-xl ${config.color} flex items-center justify-center shrink-0`}>
                    <Icon size={16} className="text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700">{config.label}</p>
                    <p className="text-xs text-slate-400">{formatDate(vital.recordedAt)}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-lg font-bold ${config.textColor}`}>{vital.value}</p>
                    <p className="text-[10px] text-slate-400">{vital.unit}</p>
                  </div>
                  <button
                    onClick={() => handleDelete(vital.id)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-500 transition-all"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
