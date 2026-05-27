"use client";

import { Activity, LogOut, Menu } from "lucide-react";
import { useAuth } from "@/context/auth";
import { useRouter } from "next/navigation";

interface DashboardHeaderProps {
  onToggleSidebar: () => void;
}

export default function DashboardHeader({ onToggleSidebar }: DashboardHeaderProps) {
  const { logout } = useAuth();
  const router = useRouter();

  function handleLogout() {
    logout();
    router.push("/login?role=patient");
  }

  return (
    <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-6 shrink-0">
      <div className="flex items-center gap-3">
        <button onClick={onToggleSidebar} className="lg:hidden text-slate-500 hover:text-slate-700">
          <Menu size={20} />
        </button>
        <div className="flex items-center gap-2">
          <Activity className="text-blue-600" size={24} />
          <span className="font-bold text-lg text-slate-900">SmartHealth AI</span>
        </div>
      </div>
      <button
        onClick={handleLogout}
        className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1.5"
      >
        <LogOut size={16} />
        <span className="hidden sm:inline">Logout</span>
      </button>
    </header>
  );
}
