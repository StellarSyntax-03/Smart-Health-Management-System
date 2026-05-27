"use client";

import { useState } from "react";
import { Edit3, Loader2, Save, X } from "lucide-react";
import { api } from "@/lib/api";
import { PatientProfile, ApiResponse } from "@/types";

interface ProfileTabProps {
  profile: PatientProfile;
  onUpdate: () => void;
}

export default function ProfileTab({ profile, onUpdate }: ProfileTabProps) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState(getFormDefaults());

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

  function startEdit() {
    setForm(getFormDefaults());
    setError("");
    setEditing(true);
  }

  function cancelEdit() {
    setEditing(false);
    setError("");
  }

  async function handleSave() {
    setError("");
    setSaving(true);
    try {
      await api.put<ApiResponse>("/patient/profile", {
        name: form.name,
        phone: form.phone || null,
        age: parseInt(form.age, 10),
        gender: form.gender,
        bloodGroup: form.bloodGroup || null,
        address: form.address || null,
        allergies: form.allergies ? form.allergies.split(",").map((s) => s.trim()).filter(Boolean) : [],
        chronicConditions: form.chronicConditions ? form.chronicConditions.split(",").map((s) => s.trim()).filter(Boolean) : [],
      });
      setEditing(false);
      onUpdate();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setSaving(false);
    }
  }

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  const inputClass = "w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm";
  const labelClass = "block text-xs font-medium text-slate-500 mb-1 uppercase tracking-wide";
  const valueClass = "text-sm text-slate-900";

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-slate-900">Profile</h2>
        {!editing ? (
          <button onClick={startEdit} className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium">
            <Edit3 size={16} /> Edit
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button onClick={cancelEdit} className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
              <X size={16} /> Cancel
            </button>
            <button onClick={handleSave} disabled={saving} className="flex items-center gap-1 text-sm text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-lg disabled:opacity-60">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              Save
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg mb-4">{error}</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-slate-700 border-b border-slate-100 pb-2">Personal Information</h3>

          <div>
            <span className={labelClass}>Name</span>
            {editing ? (
              <input type="text" value={form.name} onChange={(e) => updateField("name", e.target.value)} className={inputClass} />
            ) : (
              <p className={valueClass}>{profile.name}</p>
            )}
          </div>

          <div>
            <span className={labelClass}>Email</span>
            <p className={valueClass}>{profile.email}</p>
          </div>

          <div>
            <span className={labelClass}>Phone</span>
            {editing ? (
              <input type="tel" value={form.phone} onChange={(e) => updateField("phone", e.target.value)} placeholder="Not set" className={inputClass} />
            ) : (
              <p className={valueClass}>{profile.phone || "Not set"}</p>
            )}
          </div>

          <div>
            <span className={labelClass}>Age</span>
            {editing ? (
              <input type="number" min={0} max={150} value={form.age} onChange={(e) => updateField("age", e.target.value)} className={inputClass} />
            ) : (
              <p className={valueClass}>{profile.patient?.age ?? "Not set"}</p>
            )}
          </div>

          <div>
            <span className={labelClass}>Gender</span>
            {editing ? (
              <select value={form.gender} onChange={(e) => updateField("gender", e.target.value)} className={inputClass}>
                <option value="">Select</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            ) : (
              <p className={valueClass}>{profile.patient?.gender || "Not set"}</p>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-slate-700 border-b border-slate-100 pb-2">Medical Information</h3>

          <div>
            <span className={labelClass}>Blood Group</span>
            {editing ? (
              <select value={form.bloodGroup} onChange={(e) => updateField("bloodGroup", e.target.value)} className={inputClass}>
                <option value="">Select</option>
                {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((bg) => (
                  <option key={bg} value={bg}>{bg}</option>
                ))}
              </select>
            ) : (
              <p className={valueClass}>{profile.patient?.bloodGroup || "Not set"}</p>
            )}
          </div>

          <div>
            <span className={labelClass}>Address</span>
            {editing ? (
              <input type="text" value={form.address} onChange={(e) => updateField("address", e.target.value)} placeholder="Not set" className={inputClass} />
            ) : (
              <p className={valueClass}>{profile.patient?.address || "Not set"}</p>
            )}
          </div>

          <div>
            <span className={labelClass}>Allergies</span>
            {editing ? (
              <input type="text" value={form.allergies} onChange={(e) => updateField("allergies", e.target.value)} placeholder="Comma separated" className={inputClass} />
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {profile.patient?.allergies?.length ? (
                  profile.patient.allergies.map((a) => (
                    <span key={a} className="bg-red-50 text-red-700 text-xs px-2 py-1 rounded-full">{a}</span>
                  ))
                ) : (
                  <p className="text-sm text-slate-400">None</p>
                )}
              </div>
            )}
          </div>

          <div>
            <span className={labelClass}>Chronic Conditions</span>
            {editing ? (
              <input type="text" value={form.chronicConditions} onChange={(e) => updateField("chronicConditions", e.target.value)} placeholder="Comma separated" className={inputClass} />
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {profile.patient?.chronicConditions?.length ? (
                  profile.patient.chronicConditions.map((c) => (
                    <span key={c} className="bg-amber-50 text-amber-700 text-xs px-2 py-1 rounded-full">{c}</span>
                  ))
                ) : (
                  <p className="text-sm text-slate-400">None</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
