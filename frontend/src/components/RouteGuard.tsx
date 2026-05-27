"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth";
import { Loader2 } from "lucide-react";

export default function RouteGuard({ role, children }: { role: string; children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace(`/login?role=${role}`);
    }
    if (!loading && user && user.role !== role) {
      router.replace(`/login?role=${role}`);
    }
  }, [user, loading, role, router]);

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 size={32} className="animate-spin text-slate-400" />
      </div>
    );
  }

  if (!user || user.role !== role) return null;

  return <>{children}</>;
}
