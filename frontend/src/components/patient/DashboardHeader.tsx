"use client";

import { Activity, LogOut, Bell, ChevronDown } from "lucide-react";
import { useAuth } from "@/context/auth";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function DashboardHeader() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  function handleLogout() {
    logout();
    router.push("/login?role=patient");
  }

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "U";

  return (
    <header className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 shrink-0">
      <div className="max-w-7xl mx-auto px-4 lg:px-8">
        <div className="h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
              <Activity className="text-white" size={20} />
            </div>
            <div>
              <span className="font-bold text-lg text-white tracking-tight">
                SmartHealth
              </span>
              <span className="text-blue-200 text-lg font-light ml-1">AI</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button className="relative p-2 text-blue-200 hover:text-white hover:bg-white/10 rounded-xl transition-colors">
              <Bell size={18} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-amber-400 rounded-full" />
            </button>

            <div className="relative">
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl hover:bg-white/10 transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center text-white text-sm font-semibold backdrop-blur-sm">
                  {initials}
                </div>
                <span className="hidden sm:block text-sm text-white font-medium">
                  {user?.name}
                </span>
                <ChevronDown size={14} className="text-blue-200" />
              </button>

              {menuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setMenuOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-slate-200 py-1 z-50">
                    <div className="px-4 py-2.5 border-b border-slate-100">
                      <p className="text-sm font-medium text-slate-800">
                        {user?.name}
                      </p>
                      <p className="text-xs text-slate-400">{user?.email}</p>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <LogOut size={15} />
                      Sign out
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
