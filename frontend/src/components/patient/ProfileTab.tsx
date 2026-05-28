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
      const parsedAge = parseInt(form.age, 10);
      await api.put<ApiResponse>("/patient/profile", {
        name: form.name || undefined,
        phone: form.phone || null,
        age: Number.isFinite(parsedAge) ? parsedAge : undefined,
        gender: form.gender || undefined,
        bloodGroup: form.bloodGroup || null,
        address: form.address || null,
        allergies: form.allergies
          ? form.allergies.split(",").map((s) => s.trim()).filter(Boolean)
          : [],
        chronicConditions: form.chronicConditions
          ? form.chronicConditions.split(",").map((s) => s.trim()).filter(Boolean)
          : [],
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

  const inputClass =
    "w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white text-sm transition-all";
  const labelClass =
    "block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider";
  const valueClass = "text-sm text-slate-800 font-medium";

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Profile</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage your personal and medical information
          </p>
        </div>
        {!editing ? (
          <button
            onClick={startEdit}
            className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-xl transition-all"
          >
            <Edit3 size={15} /> Edit
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={cancelEdit}
              className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 px-3 py-2 rounded-xl hover:bg-slate-100 transition-all"
            >
              <X size={15} /> Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 text-sm text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-xl disabled:opacity-60 shadow-sm transition-all"
            >
              {saving ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Save size={14} />
              )}
              Save
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl mb-5 border border-red-100">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            Personal Information
          </h3>
          <div className="space-y-4">
            <Field label="Name" value={profile.name} editing={editing}>
              <input
                type="text"
                value={form.name}
                onChange={(e) => updateField("name", e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Email" value={profile.email} editing={false}>
              <></>
            </Field>
            <Field
              label="Phone"
              value={profile.phone || "Not set"}
              editing={editing}
            >
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => updateField("phone", e.target.value)}
                placeholder="Not set"
                className={inputClass}
              />
            </Field>
            <Field
              label="Age"
              value={profile.patient?.age ?? "Not set"}
              editing={editing}
            >
              <input
                type="number"
                min={0}
                max={150}
                value={form.age}
                onChange={(e) => updateField("age", e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field
              label="Gender"
              value={profile.patient?.gender || "Not set"}
              editing={editing}
            >
              <select
                value={form.gender}
                onChange={(e) => updateField("gender", e.target.value)}
                className={inputClass}
              >
                <option value="">Select</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </Field>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Medical Information
          </h3>
          <div className="space-y-4">
            <Field
              label="Blood Group"
              value={profile.patient?.bloodGroup || "Not set"}
              editing={editing}
            >
              <select
                value={form.bloodGroup}
                onChange={(e) => updateField("bloodGroup", e.target.value)}
                className={inputClass}
              >
                <option value="">Select</option>
                {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map(
                  (bg) => (
                    <option key={bg} value={bg}>
                      {bg}
                    </option>
                  )
                )}
              </select>
            </Field>
            <Field
              label="Address"
              value={profile.patient?.address || "Not set"}
              editing={editing}
            >
              <input
                type="text"
                value={form.address}
                onChange={(e) => updateField("address", e.target.value)}
                placeholder="Not set"
                className={inputClass}
              />
            </Field>
            <div>
              <span className={labelClass}>Allergies</span>
              {editing ? (
                <input
                  type="text"
                  value={form.allergies}
                  onChange={(e) => updateField("allergies", e.target.value)}
                  placeholder="Comma separated"
                  className={inputClass}
                />
              ) : (
                <div className="flex flex-wrap gap-1.5 mt-0.5">
                  {profile.patient?.allergies?.length ? (
                    profile.patient.allergies.map((a) => (
                      <span
                        key={a}
                        className="bg-red-50 text-red-600 text-xs px-2.5 py-1 rounded-lg font-medium border border-red-100"
                      >
                        {a}
                      </span>
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
                <input
                  type="text"
                  value={form.chronicConditions}
                  onChange={(e) =>
                    updateField("chronicConditions", e.target.value)
                  }
                  placeholder="Comma separated"
                  className={inputClass}
                />
              ) : (
                <div className="flex flex-wrap gap-1.5 mt-0.5">
                  {profile.patient?.chronicConditions?.length ? (
                    profile.patient.chronicConditions.map((c) => (
                      <span
                        key={c}
                        className="bg-amber-50 text-amber-600 text-xs px-2.5 py-1 rounded-lg font-medium border border-amber-100"
                      >
                        {c}
                      </span>
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
    </div>
  );
}

function Field({
  label,
  value,
  editing,
  children,
}: {
  label: string;
  value: string | number;
  editing: boolean;
  children: React.ReactNode;
}) {
  const labelClass =
    "block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider";
  return (
    <div>
      <span className={labelClass}>{label}</span>
      {editing ? (
        children
      ) : (
        <p className="text-sm text-slate-800 font-medium capitalize">{value}</p>
      )}
    </div>
  );
}
