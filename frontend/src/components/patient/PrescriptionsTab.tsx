"use client";

import { useState, useEffect, FormEvent } from "react";
import { Upload, Download, Trash2, FileText, Plus, Minus, Loader2, Pill } from "lucide-react";
import { api } from "@/lib/api";
import { Prescription, ApiResponse } from "@/types";
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

export default function PrescriptionsTab() {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [notes, setNotes] = useState("");
  const [meds, setMeds] = useState<MedRow[]>([]);

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
    setMeds((prev) => [...prev, { name: "", dosage: "", frequency: "", duration: "" }]);
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
          {prescriptions.map((rx) => (
            <div key={rx.id} className="bg-slate-50/50 border border-slate-100 rounded-xl p-4 flex items-start justify-between gap-4 hover:bg-slate-50 transition-colors">
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                  <FileText size={18} className="text-blue-500" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-slate-800 truncate text-sm">{rx.fileName || "Prescription"}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{formatDate(rx.date)}</p>
                  {rx.notes && <p className="text-sm text-slate-500 mt-1.5">{rx.notes}</p>}
                  {rx.medications.length > 0 && (
                    <div className="flex items-center gap-1 mt-1.5">
                      <Pill size={12} className="text-emerald-500" />
                      <span className="text-xs text-emerald-600 font-medium">{rx.medications.length} medication(s)</span>
                    </div>
                  )}
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
          ))}
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
                <input placeholder="Frequency" value={med.frequency} onChange={(e) => updateMed(i, "frequency", e.target.value)} className="px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white" />
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
