"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2, User, FileText, File } from "lucide-react";
import { api } from "@/lib/api";
import { PatientProfile, ApiResponse } from "@/types";
import DashboardHeader from "@/components/patient/DashboardHeader";
import PatientSidebar from "@/components/patient/PatientSidebar";
import ProfileTab from "@/components/patient/ProfileTab";
import PrescriptionsTab from "@/components/patient/PrescriptionsTab";
import ReportsTab from "@/components/patient/ReportsTab";

type Tab = "profile" | "prescriptions" | "reports";

const TABS: { key: Tab; label: string; icon: typeof User }[] = [
  { key: "profile", label: "Profile", icon: User },
  { key: "prescriptions", label: "Prescriptions", icon: FileText },
  { key: "reports", label: "Reports", icon: File },
];

export default function PatientDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>("profile");
  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  async function fetchProfile() {
    try {
      const res = await api.get<ApiResponse<PatientProfile>>("/patient/profile");
      if (res.data) setProfile(res.data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    api.get<ApiResponse<PatientProfile>>("/patient/profile").then((res) => {
      if (!cancelled && res.data) setProfile(res.data);
    }).catch(() => {}).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 size={32} className="animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      <DashboardHeader onToggleSidebar={() => setSidebarOpen((v) => !v)} />
      <div className="flex flex-1 overflow-hidden">
        <PatientSidebar profile={profile} visible={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6 bg-slate-50/50">
          <div className="max-w-4xl mx-auto">
            <div className="flex gap-1 border-b border-slate-200 mb-6 overflow-x-auto">
              {TABS.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                    activeTab === key
                      ? "border-blue-600 text-blue-600"
                      : "border-transparent text-slate-500 hover:text-slate-700"
                  }`}
                >
                  <Icon size={16} />
                  {label}
                </button>
              ))}
            </div>

            {activeTab === "profile" && profile && (
              <ProfileTab profile={profile} onUpdate={fetchProfile} />
            )}
            {activeTab === "prescriptions" && <PrescriptionsTab />}
            {activeTab === "reports" && <ReportsTab />}
          </div>
        </main>
      </div>
    </div>
  );
}
