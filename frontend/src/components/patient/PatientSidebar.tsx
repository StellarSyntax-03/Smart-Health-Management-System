"use client";

import { User, Calendar, Droplets, Heart } from "lucide-react";
import { PatientProfile } from "@/types";

interface PatientSidebarProps {
  profile: PatientProfile | null;
  visible: boolean;
  onClose: () => void;
}

function InfoRow({ icon: Icon, label, value }: { icon: typeof Calendar; label: string; value: string | number | null | undefined }) {
  if (!value) return null;
  return (
    <div className="flex items-center gap-2 text-sm">
      <Icon size={14} className="text-slate-400 shrink-0" />
      <span className="text-slate-500">{label}:</span>
      <span className="text-slate-700 font-medium">{value}</span>
    </div>
  );
}

export default function PatientSidebar({ profile, visible, onClose }: PatientSidebarProps) {
  if (!profile) return null;

  return (
    <>
      {visible && (
        <div className="fixed inset-0 bg-black/30 z-30 lg:hidden" onClick={onClose} />
      )}
      <aside
        className={`w-64 bg-slate-50 border-r border-slate-200 p-6 space-y-5 shrink-0 overflow-y-auto
          ${visible ? "fixed inset-y-0 left-0 z-40 pt-20" : "hidden"} lg:relative lg:block lg:pt-6`}
      >
        <div className="text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <User size={28} className="text-blue-600" />
          </div>
          <h2 className="font-semibold text-slate-900">{profile.name}</h2>
          <p className="text-sm text-slate-500">{profile.email}</p>
        </div>
        <div className="space-y-2">
          <InfoRow icon={Calendar} label="Age" value={profile.patient?.age} />
          <InfoRow icon={Heart} label="Gender" value={profile.patient?.gender} />
          <InfoRow icon={Droplets} label="Blood" value={profile.patient?.bloodGroup} />
        </div>
      </aside>
    </>
  );
}
