"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState, FormEvent, Suspense } from "react";
import { Activity, Loader2 } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/context/auth";

function LoginForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { login } = useAuth();

  const VALID_ROLES = ["patient", "doctor"] as const;
  const rawRole = searchParams.get("role");
  const role = VALID_ROLES.includes(rawRole as typeof VALID_ROLES[number])
    ? (rawRole as typeof VALID_ROLES[number])
    : "patient";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isPatient = role === "patient";
  const title = isPatient ? "Patient Login" : "Doctor Login";

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(email, password, role);
      router.push(`/${role}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-1 items-center justify-center p-4 bg-gradient-to-br from-blue-50 to-slate-100">
      <div className="bg-white max-w-md w-full rounded-2xl shadow-xl p-8 space-y-6">
        <div className="text-center space-y-2">
          <div className={`${isPatient ? "bg-blue-600" : "bg-emerald-600"} w-12 h-12 rounded-xl flex items-center justify-center text-white mx-auto`}>
            <Activity size={24} />
          </div>
          <h1 className="text-xl font-bold text-slate-900">{title}</h1>
          <p className="text-sm text-slate-500">Sign in to SmartHealth AI</p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className={`w-full text-white py-2.5 rounded-lg font-medium transition-colors text-sm flex items-center justify-center gap-2 ${isPatient ? "bg-blue-600 hover:bg-blue-700" : "bg-emerald-600 hover:bg-emerald-700"} disabled:opacity-60`}
          >
            {submitting && <Loader2 size={16} className="animate-spin" />}
            {submitting ? "Signing in..." : "Sign In"}
          </button>
        </form>

        {isPatient && (
          <p className="text-center text-sm text-slate-500">
            Don&apos;t have an account?{" "}
            <Link href="/register?role=patient" className="text-blue-600 hover:underline font-medium">
              Sign Up
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
