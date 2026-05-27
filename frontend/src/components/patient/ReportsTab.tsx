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
        <Loader2 size={24} className="animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-slate-900">Medical Reports</h2>
        <button onClick={openUpload} className="flex items-center gap-1.5 text-sm text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-lg font-medium">
          <Upload size={16} /> Upload
        </button>
      </div>

      {reports.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <FileIcon size={40} className="mx-auto mb-3" />
          <p>No reports yet</p>
          <button onClick={openUpload} className="text-blue-600 hover:underline text-sm mt-2">Upload your first report</button>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((report) => (
            <div key={report.id} className="bg-white border border-slate-200 rounded-lg p-4 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <FileIcon size={16} className="text-emerald-500 shrink-0" />
                  <p className="font-medium text-slate-900 truncate">{report.name}</p>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium uppercase ${report.type === "pdf" ? "bg-red-50 text-red-600" : "bg-blue-50 text-blue-600"}`}>
                    {report.type}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">{formatDate(report.date)}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <a href={report.url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-700" title="Download">
                  <Download size={18} />
                </a>
                <button onClick={() => handleDelete(report.id)} className="text-red-400 hover:text-red-600" title="Delete">
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <UploadModal open={showUpload} onClose={() => setShowUpload(false)} title="Upload Report">
        <form onSubmit={handleUpload} className="space-y-4">
          {uploadError && (
            <div className="bg-red-50 text-red-600 text-sm px-3 py-2 rounded-lg">{uploadError}</div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">File *</label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              required
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="w-full text-sm text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-600 hover:file:bg-blue-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Report Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Blood Test Report"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={uploading || !file || !name.trim()}
            className="w-full text-white bg-blue-600 hover:bg-blue-700 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {uploading && <Loader2 size={16} className="animate-spin" />}
            {uploading ? "Uploading..." : "Upload Report"}
          </button>
        </form>
      </UploadModal>
    </div>
  );
}
