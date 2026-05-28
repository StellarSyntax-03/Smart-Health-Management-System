"use client";

import { useState, useEffect, FormEvent } from "react";
import { Upload, Download, Trash2, File as FileIcon, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { MedicalReport, ApiResponse } from "@/types";
import UploadModal from "./UploadModal";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export default function ReportsTab() {
  const [reports, setReports] = useState<MedicalReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");

  function fetchReports() {
    setLoading(true);
    api.get<ApiResponse<MedicalReport[]>>("/patient/reports").then((res) => {
      setReports(res.data || []);
    }).catch(() => {}).finally(() => {
      setLoading(false);
    });
  }

  useEffect(() => {
    fetchReports();
  }, []);

  function openUpload() {
    setFile(null);
    setName("");
    setUploadError("");
    setShowUpload(true);
  }

  async function handleUpload(e: FormEvent) {
    e.preventDefault();
    if (!file || !name.trim()) return;
    setUploadError("");
    setUploading(true);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("name", name.trim());

    try {
      const res = await api.upload<ApiResponse<MedicalReport>>("/patient/reports", formData);
      if (res.data) setReports((prev) => [res.data!, ...prev]);
      setShowUpload(false);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this report?")) return;
    const prev = [...reports];
    setReports((r) => r.filter((rep) => rep.id !== id));
    try {
      await api.delete<ApiResponse>(`/patient/reports/${id}`);
    } catch {
      setReports(prev);
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
          <h2 className="text-lg font-bold text-slate-900">Medical Reports</h2>
          <p className="text-xs text-slate-400 mt-0.5">Upload and manage your medical reports</p>
        </div>
        <button onClick={openUpload} className="flex items-center gap-1.5 text-sm text-white bg-blue-600 hover:bg-blue-700 px-4 py-2.5 rounded-xl font-medium shadow-sm transition-all">
          <Upload size={15} /> Upload
        </button>
      </div>

      {reports.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-4">
            <FileIcon size={28} className="text-emerald-400" />
          </div>
          <p className="text-slate-500 font-medium">No reports yet</p>
          <p className="text-sm text-slate-400 mt-1 mb-4">Upload your first report to get started</p>
          <button onClick={openUpload} className="text-sm text-blue-600 hover:text-blue-700 font-medium bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-xl transition-all">
            Upload Report
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((report) => (
            <div key={report.id} className="bg-slate-50/50 border border-slate-100 rounded-xl p-4 flex items-start justify-between gap-4 hover:bg-slate-50 transition-colors">
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                  <FileIcon size={18} className="text-emerald-500" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-slate-800 truncate text-sm">{report.name}</p>
                    <span className={`text-[10px] px-2 py-0.5 rounded-md font-semibold uppercase ${report.type === "pdf" ? "bg-red-50 text-red-500 border border-red-100" : "bg-blue-50 text-blue-500 border border-blue-100"}`}>
                      {report.type}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">{formatDate(report.date)}</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <a href={report.url} target="_blank" rel="noopener noreferrer" className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all" title="Download">
                  <Download size={16} />
                </a>
                <button onClick={() => handleDelete(report.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all" title="Delete">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <UploadModal open={showUpload} onClose={() => setShowUpload(false)} title="Upload Report">
        <form onSubmit={handleUpload} className="space-y-4">
          {uploadError && (
            <div className="bg-red-50 text-red-600 text-sm px-3 py-2 rounded-xl border border-red-100">{uploadError}</div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">File *</label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              required
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="w-full text-sm text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-600 hover:file:bg-blue-100 file:transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Report Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Blood Test Report"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-sm transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={uploading || !file || !name.trim()}
            className="w-full text-white bg-blue-600 hover:bg-blue-700 py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-60 shadow-sm transition-all"
          >
            {uploading && <Loader2 size={16} className="animate-spin" />}
            {uploading ? "Uploading..." : "Upload Report"}
          </button>
        </form>
      </UploadModal>
    </div>
  );
}
