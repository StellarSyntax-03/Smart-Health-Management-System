"use client";

import { useState, useEffect, FormEvent } from "react";
import {
  Upload,
  Download,
  Trash2,
  FileText,
  Plus,
  Minus,
  Loader2,
  Pill,
  ChevronDown,
  ChevronUp,
  Sparkles,
  X,
} from "lucide-react";
import { api } from "@/lib/api";
import { Prescription, Medication, ApiResponse } from "@/types";
import UploadModal from "./UploadModal";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

interface MedRow {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
}

const FREQUENCIES = ["Once daily", "Twice daily", "Three times daily", "Four times daily"];

export default function PrescriptionsTab() {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [notes, setNotes] = useState("");
  const [meds, setMeds] = useState<MedRow[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [extractingId, setExtractingId] = useState<string | null>(null);
  const [addingMedFor, setAddingMedFor] = useState<string | null>(null);
  const [newMed, setNewMed] = useState<MedRow>({ name: "", dosage: "", frequency: "Once daily", duration: "" });
  const [addingMedLoading, setAddingMedLoading] = useState(false);
  const [extractError, setExtractError] = useState("");

  function fetchPrescriptions() {
    setLoading(true);
    api.get<ApiResponse<Prescription[]>>("/patient/prescriptions").then((res) => {
      setPrescriptions(res.data || []);
    }).catch(() => {}).finally(() => {
      setLoading(false);
    });
  }

  useEffect(() => {
    fetchPrescriptions();
  }, []);

  function resetForm() {
    setFile(null);
    setNotes("");
    setMeds([]);
    setUploadError("");
  }

  function openUpload() {
    resetForm();
    setShowUpload(true);
  }

  function addMedRow() {
    setMeds((prev) => [...prev, { name: "", dosage: "", frequency: "Once daily", duration: "" }]);
  }

  function updateMed(index: number, field: keyof MedRow, value: string) {
    setMeds((prev) => prev.map((m, i) => (i === index ? { ...m, [field]: value } : m)));
  }

  function removeMed(index: number) {
    setMeds((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleUpload(e: FormEvent) {
    e.preventDefault();
    if (!file) return;
    setUploadError("");
    setUploading(true);

    const formData = new FormData();
    formData.append("file", file);
    if (notes.trim()) formData.append("notes", notes.trim());

    const validMeds = meds.filter((m) => m.name && m.dosage && m.frequency && m.duration);
    if (validMeds.length > 0) formData.append("medications", JSON.stringify(validMeds));

    try {
      const res = await api.upload<ApiResponse<Prescription>>("/patient/prescriptions", formData);
      if (res.data) setPrescriptions((prev) => [res.data!, ...prev]);
      setShowUpload(false);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this prescription?")) return;
    const prev = [...prescriptions];
    setPrescriptions((p) => p.filter((rx) => rx.id !== id));
    try {
      await api.delete<ApiResponse>(`/patient/prescriptions/${id}`);
    } catch {
      setPrescriptions(prev);
    }
  }

  async function handleExtract(rxId: string) {
    setExtractingId(rxId);
    setExtractError("");
    try {
      const res = await api.post<ApiResponse<Medication[]>>(`/patient/prescriptions/${rxId}/extract`, {});
      if (res.data && res.data.length > 0) {
        const freshRes = await api.get<ApiResponse<Prescription[]>>("/patient/prescriptions");
        if (freshRes.data) setPrescriptions(freshRes.data);
      } else {
        setExtractError("No medications found in the image. Try adding manually.");
      }
    } catch (err) {
      setExtractError(err instanceof Error ? err.message : "Extraction failed");
    } finally {
      setExtractingId(null);
    }
  }

  async function handleAddMedication(rxId: string) {
    if (!newMed.name || !newMed.dosage || !newMed.frequency || !newMed.duration) return;
    setAddingMedLoading(true);
    try {
      const res = await api.post<ApiResponse<Medication>>(`/patient/prescriptions/${rxId}/medications`, newMed);
      if (res.data) {
        setPrescriptions((prev) =>
          prev.map((rx) =>
            rx.id === rxId ? { ...rx, medications: [...rx.medications, res.data!] } : rx,
          ),
        );
        setNewMed({ name: "", dosage: "", frequency: "Once daily", duration: "" });
        setAddingMedFor(null);
      }
    } catch {
    } finally {
      setAddingMedLoading(false);
    }
  }

  async function handleDeleteMedication(rxId: string, medId: string) {
    try {
      await api.delete<ApiResponse>(`/patient/prescriptions/${rxId}/medications/${medId}`);
      setPrescriptions((prev) =>
        prev.map((rx) =>
          rx.id === rxId ? { ...rx, medications: rx.medications.filter((m) => m.id !== medId) } : rx,
        ),
      );
    } catch {
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 size={24} className="animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Prescriptions</h2>
          <p className="text-xs text-slate-400 mt-0.5">Upload and manage your prescriptions</p>
        </div>
        <button onClick={openUpload} className="flex items-center gap-1.5 text-sm text-white bg-blue-600 hover:bg-blue-700 px-4 py-2.5 rounded-xl font-medium shadow-sm transition-all">
          <Upload size={15} /> Upload
        </button>
      </div>

      {prescriptions.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-4">
            <FileText size={28} className="text-blue-400" />
          </div>
          <p className="text-slate-500 font-medium">No prescriptions yet</p>
          <p className="text-sm text-slate-400 mt-1 mb-4">Upload your first prescription to get started</p>
          <button onClick={openUpload} className="text-sm text-blue-600 hover:text-blue-700 font-medium bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-xl transition-all">
            Upload Prescription
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {prescriptions.map((rx) => {
            const isExpanded = expandedId === rx.id;

            return (
              <div key={rx.id} className="bg-slate-50/50 border border-slate-100 rounded-xl overflow-hidden transition-colors">
                <div className="p-4 flex items-start justify-between gap-4 hover:bg-slate-50">
                  <div
                    className="flex items-start gap-3 min-w-0 flex-1 cursor-pointer"
                    onClick={() => setExpandedId(isExpanded ? null : rx.id)}
                  >
                    <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                      <FileText size={18} className="text-blue-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-800 truncate text-sm">{rx.fileName || "Prescription"}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{formatDate(rx.date)}</p>
                      {rx.notes && <p className="text-sm text-slate-500 mt-1.5">{rx.notes}</p>}
                      <div className="flex items-center gap-2 mt-1.5">
                        {rx.medications.length > 0 ? (
                          <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                            <Pill size={12} className="text-emerald-500" />
                            {rx.medications.length} medication(s)
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">No medications extracted</span>
                        )}
                        {isExpanded ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {rx.fileUrl && (
                      <a href={rx.fileUrl} target="_blank" rel="noopener noreferrer" className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all" title="Download">
                        <Download size={16} />
                      </a>
                    )}
                    <button onClick={() => handleDelete(rx.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all" title="Delete">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-slate-100">
                    <div className="flex items-center justify-between mt-3 mb-2">
                      <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Medications</h4>
                      <div className="flex items-center gap-2">
                        {rx.fileUrl && (
                          <button
                            onClick={() => handleExtract(rx.id)}
                            disabled={extractingId === rx.id}
                            className="flex items-center gap-1 text-xs text-purple-600 hover:text-purple-700 font-medium bg-purple-50 hover:bg-purple-100 px-2.5 py-1.5 rounded-lg transition-all disabled:opacity-50"
                          >
                            {extractingId === rx.id ? (
                              <Loader2 size={12} className="animate-spin" />
                            ) : (
                              <Sparkles size={12} />
                            )}
                            {extractingId === rx.id ? "Extracting..." : "AI Extract"}
                          </button>
                        )}
                        <button
                          onClick={() => setAddingMedFor(addingMedFor === rx.id ? null : rx.id)}
                          className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded-lg transition-all"
                        >
                          {addingMedFor === rx.id ? <X size={12} /> : <Plus size={12} />}
                          {addingMedFor === rx.id ? "Cancel" : "Add"}
                        </button>
                      </div>
                    </div>

                    {extractError && expandedId === rx.id && (
                      <div className="bg-amber-50 text-amber-700 text-xs px-3 py-2 rounded-lg border border-amber-100 mb-2">
                        {extractError}
                      </div>
                    )}

                    {addingMedFor === rx.id && (
                      <div className="bg-white rounded-lg border border-slate-200 p-3 mb-3 space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            placeholder="Medicine name"
                            value={newMed.name}
                            onChange={(e) => setNewMed((p) => ({ ...p, name: e.target.value }))}
                            className="px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                          />
                          <input
                            placeholder="Dosage (e.g. 500mg)"
                            value={newMed.dosage}
                            onChange={(e) => setNewMed((p) => ({ ...p, dosage: e.target.value }))}
                            className="px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                          />
                          <select
                            value={newMed.frequency}
                            onChange={(e) => setNewMed((p) => ({ ...p, frequency: e.target.value }))}
                            className="px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                          >
                            {FREQUENCIES.map((f) => (
                              <option key={f} value={f}>{f}</option>
                            ))}
                          </select>
                          <input
                            placeholder="Duration (e.g. 7 days)"
                            value={newMed.duration}
                            onChange={(e) => setNewMed((p) => ({ ...p, duration: e.target.value }))}
                            className="px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                          />
                        </div>
                        <button
                          onClick={() => handleAddMedication(rx.id)}
                          disabled={addingMedLoading || !newMed.name || !newMed.dosage || !newMed.duration}
                          className="flex items-center gap-1 text-xs text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-lg font-medium disabled:opacity-50 transition-all"
                        >
                          {addingMedLoading ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                          Add Medication
                        </button>
                      </div>
                    )}

                    {rx.medications.length === 0 ? (
                      <p className="text-xs text-slate-400 py-3 text-center">
                        No medications yet. Use &quot;AI Extract&quot; to read from the prescription image, or add manually.
                      </p>
                    ) : (
                      <div className="space-y-1.5">
                        {rx.medications.map((med) => (
                          <div key={med.id} className="group flex items-center gap-3 bg-white rounded-lg px-3 py-2.5 border border-slate-100">
                            <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                              <Pill size={12} className="text-emerald-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-slate-700">{med.name}</p>
                              <p className="text-xs text-slate-400">
                                {med.dosage} &middot; {med.frequency} &middot; {med.duration}
                              </p>
                            </div>
                            <button
                              onClick={() => handleDeleteMedication(rx.id, med.id)}
                              className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <UploadModal open={showUpload} onClose={() => setShowUpload(false)} title="Upload Prescription">
        <form onSubmit={handleUpload} className="space-y-4">
          {uploadError && (
            <div className="bg-red-50 text-red-600 text-sm px-3 py-2 rounded-xl border border-red-100">{uploadError}</div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">File *</label>
            <input
              type="file"
              accept="image/*,application/pdf,.docx"
              required
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="w-full text-sm text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-600 hover:file:bg-blue-100 file:transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes"
              rows={2}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm transition-all"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-slate-700">Medications</label>
              <button type="button" onClick={addMedRow} className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium">
                <Plus size={14} /> Add
              </button>
            </div>
            {meds.map((med, i) => (
              <div key={i} className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] gap-2 mb-2">
                <input placeholder="Name" value={med.name} onChange={(e) => updateMed(i, "name", e.target.value)} className="px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white" />
                <input placeholder="Dosage" value={med.dosage} onChange={(e) => updateMed(i, "dosage", e.target.value)} className="px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white" />
                <select value={med.frequency} onChange={(e) => updateMed(i, "frequency", e.target.value)} className="px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white">
                  <option value="">Frequency</option>
                  {FREQUENCIES.map((f) => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
                <input placeholder="Duration" value={med.duration} onChange={(e) => updateMed(i, "duration", e.target.value)} className="px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white" />
                <button type="button" onClick={() => removeMed(i)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all">
                  <Minus size={14} />
                </button>
              </div>
            ))}
          </div>

          <button
            type="submit"
            disabled={uploading || !file}
            className="w-full text-white bg-blue-600 hover:bg-blue-700 py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-60 shadow-sm transition-all"
          >
            {uploading && <Loader2 size={16} className="animate-spin" />}
            {uploading ? "Uploading..." : "Upload Prescription"}
          </button>
        </form>
      </UploadModal>
    </div>
  );
}
