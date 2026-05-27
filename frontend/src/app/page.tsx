import Link from "next/link";
import { Activity, User, Stethoscope } from "lucide-react";

export default function Home() {
  return (
    <div className="flex flex-1 items-center justify-center p-4 bg-gradient-to-br from-blue-50 to-slate-100">
      <div className="bg-white max-w-md w-full rounded-2xl shadow-xl p-8 space-y-8">
        <div className="text-center space-y-2">
          <div className="bg-blue-600 w-16 h-16 rounded-2xl flex items-center justify-center text-white mx-auto shadow-lg shadow-blue-600/20">
            <Activity size={32} />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">SmartHealth AI</h1>
          <p className="text-slate-500">AI-Powered Health Management</p>
        </div>

        <div className="space-y-4">
          <Link
            href="/login?role=patient"
            className="w-full group relative flex items-center p-4 bg-white border-2 border-slate-100 hover:border-blue-500 rounded-xl transition-all hover:shadow-md"
          >
            <div className="bg-blue-50 p-3 rounded-full text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <User size={24} />
            </div>
            <div className="ml-4 text-left">
              <p className="font-bold text-slate-800">Patient Portal</p>
              <p className="text-xs text-slate-400">Health records, AI assistant & more</p>
            </div>
          </Link>

          <Link
            href="/login?role=doctor"
            className="w-full group relative flex items-center p-4 bg-white border-2 border-slate-100 hover:border-emerald-500 rounded-xl transition-all hover:shadow-md"
          >
            <div className="bg-emerald-50 p-3 rounded-full text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <Stethoscope size={24} />
            </div>
            <div className="ml-4 text-left">
              <p className="font-bold text-slate-800">Doctor Portal</p>
              <p className="text-xs text-slate-400">Manage patients & prescriptions</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
