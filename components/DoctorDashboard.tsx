import React from 'react';
import { useAppStore } from '../store';
import { SOSAlert } from '../types';
import { Bell, MapPin, CheckCircle, Users, AlertTriangle } from 'lucide-react';

interface DoctorDashboardProps {
  onViewPatient: (id: string) => void;
}

export const DoctorDashboard: React.FC<DoctorDashboardProps> = ({ onViewPatient }) => {
  const { alerts, patients, resolveAlert } = useAppStore();
  const activeAlerts = alerts.filter(a => a.status === 'Active');
  
  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div className="mb-6">
         <h1 className="text-2xl font-bold text-slate-900">Dashboard Overview</h1>
         <p className="text-slate-500">Welcome back, Dr. Connor.</p>
      </div>

      {/* Header Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className={`p-3 rounded-lg ${activeAlerts.length > 0 ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-slate-100 text-slate-400'}`}>
            <AlertTriangle size={24} />
          </div>
          <div>
            <p className="text-slate-500 text-sm font-medium">Active SOS Alerts</p>
            <p className={`text-2xl font-bold ${activeAlerts.length > 0 ? 'text-red-600' : 'text-slate-900'}`}>{activeAlerts.length}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="p-3 bg-blue-100 text-blue-600 rounded-lg">
            <Users size={24} />
          </div>
          <div>
            <p className="text-slate-500 text-sm font-medium">Total Patients</p>
            <p className="text-2xl font-bold text-slate-900">{patients.length}</p>
          </div>
        </div>
         <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="p-3 bg-green-100 text-green-600 rounded-lg">
            <CheckCircle size={24} />
          </div>
          <div>
            <p className="text-slate-500 text-sm font-medium">Appointments Today</p>
            <p className="text-2xl font-bold text-slate-900">4</p>
          </div>
        </div>
      </div>

      {/* Active SOS Alerts List */}
      {activeAlerts.length > 0 ? (
        <div className="bg-red-50 border border-red-100 rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-bold text-red-800 mb-4 flex items-center gap-2">
            <Bell className="animate-pulse" /> Emergency Alerts
          </h2>
          <div className="space-y-4">
            {activeAlerts.map(alert => (
              <div key={alert.id} className="bg-white p-4 rounded-lg border border-red-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <p className="font-bold text-slate-800 text-lg">{alert.patientName}</p>
                  <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500 mt-1">
                    <span className="flex items-center gap-1"><MapPin size={14} /> {alert.location?.lat.toFixed(4)}, {alert.location?.lng.toFixed(4)}</span>
                    <span className="hidden sm:inline">•</span>
                    <span>{new Date(alert.timestamp).toLocaleTimeString()}</span>
                  </div>
                </div>
                <button
                  onClick={() => resolveAlert(alert.id)}
                  className="w-full md:w-auto px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
                >
                  Mark Resolved
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
            <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center text-green-500 mx-auto mb-4">
                <CheckCircle size={32} />
            </div>
            <h3 className="text-lg font-bold text-slate-800">No Active Emergencies</h3>
            <p className="text-slate-500">All systems operational.</p>
        </div>
      )}
    </div>
  );
};