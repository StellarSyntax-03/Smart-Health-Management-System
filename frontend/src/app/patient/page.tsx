"use client";

import { useState, useEffect } from "react";
import {
  Loader2,
  User,
  FileText,
  File,
  MessageCircle,
  RefreshCw,
  Heart,
  Calendar,
  Droplets,
  Shield,
} from "lucide-react";
import { api } from "@/lib/api";
import { PatientProfile, ApiResponse } from "@/types";
import DashboardHeader from "@/components/patient/DashboardHeader";
import ProfileTab from "@/components/patient/ProfileTab";
import PrescriptionsTab from "@/components/patient/PrescriptionsTab";
import ReportsTab from "@/components/patient/ReportsTab";
import ChatTab from "@/components/patient/ChatTab";
import VitalsTab from "@/components/patient/VitalsTab";

type Tab = "profile" | "prescriptions" | "reports" | "vitals" | "chat";

const TABS: { key: Tab; label: string; icon: typeof User }[] = [
  { key: "profile", label: "Profile", icon: User },
  { key: "prescriptions", label: "Prescriptions", icon: FileText },
  { key: "reports", label: "Reports", icon: File },
  { key: "vitals", label: "Vitals", icon: Heart },
  { key: "chat", label: "AI Chat", icon: MessageCircle },
];

function QuickStat({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: typeof Heart;
  label: string;
  value: string | number | null | undefined;
  color: string;
}) {
  if (value == null) return null;
  return (
    <div className="flex items-center gap-3 bg-white rounded-xl px-4 py-3 border border-slate-100 shadow-sm">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}>
        <Icon size={16} className="text-white" />
      </div>
      <div>
        <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">
          {label}
        </p>
        <p className="text-sm font-semibold text-slate-800 capitalize">{value}</p>
      </div>
    </div>
  );
}

export default function PatientDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>("profile");
  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  function fetchProfile() {
    setLoading(true);
    setError("");
    api
      .get<ApiResponse<PatientProfile>>("/patient/profile")
      .then((res) => {
        if (res.data) setProfile(res.data);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load profile");
      })
      .finally(() => {
        setLoading(false);
      });
  }

  useEffect(() => {
    fetchProfile();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col h-screen">
        <DashboardHeader />
        <div className="flex flex-1 items-center justify-center bg-slate-50">
          <Loader2 size={32} className="animate-spin text-blue-500" />
        </div>
      </div>
    );
  }

  if (error && !profile) {
    return (
      <div className="flex flex-col h-screen">
        <DashboardHeader />
        <div className="flex flex-1 items-center justify-center bg-slate-50">
          <div className="text-center space-y-3">
            <p className="text-red-600 text-sm">{error}</p>
            <button
              onClick={fetchProfile}
              className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 mx-auto"
            >
              <RefreshCw size={14} /> Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  const greeting = getGreeting();

  return (
    <div className="flex flex-col h-screen">
      <DashboardHeader />
      <main className="flex-1 overflow-y-auto bg-slate-50/80">
        <div className="max-w-6xl mx-auto px-4 lg:px-8 py-6">
          {/* Welcome section */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-slate-900">
              {greeting}, {profile?.name?.split(" ")[0]}
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Here&apos;s your health overview
            </p>
          </div>

          {/* Quick stats */}
          {profile?.patient && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <QuickStat
                icon={Calendar}
                label="Age"
                value={profile.patient.age}
                color="bg-blue-500"
              />
              <QuickStat
                icon={Heart}
                label="Gender"
                value={profile.patient.gender}
                color="bg-pink-500"
              />
              <QuickStat
                icon={Droplets}
                label="Blood Group"
                value={profile.patient.bloodGroup}
                color="bg-red-500"
              />
              <QuickStat
                icon={Shield}
                label="Allergies"
                value={
                  profile.patient.allergies.length > 0
                    ? profile.patient.allergies.length.toString()
                    : "None"
                }
                color="bg-amber-500"
              />
            </div>
          )}

          {/* Tab navigation */}
          <div className="flex gap-1 bg-white rounded-xl p-1.5 border border-slate-200 shadow-sm mb-6 overflow-x-auto">
            {TABS.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg whitespace-nowrap transition-all ${
                  activeTab === key
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                }`}
              >
                <Icon size={16} />
                {label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div
            className={
              activeTab === "chat"
                ? ""
                : "bg-white rounded-2xl border border-slate-200 shadow-sm p-5 lg:p-7"
            }
          >
            {activeTab === "profile" && profile && (
              <ProfileTab profile={profile} onUpdate={fetchProfile} />
            )}
            {activeTab === "prescriptions" && <PrescriptionsTab />}
            {activeTab === "reports" && <ReportsTab />}
            {activeTab === "vitals" && <VitalsTab />}
            {activeTab === "chat" && <ChatTab />}
          </div>
        </div>
      </main>
    </div>
  );
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}
