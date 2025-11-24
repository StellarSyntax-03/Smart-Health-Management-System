import React, { useState } from 'react';
import { AppProvider, useAppStore } from './store';
import { Layout } from './components/Layout';
import { PatientDashboard } from './components/PatientDashboard';
import { AiAssistant } from './components/AiAssistant';
import { DoctorDashboard } from './components/DoctorDashboard';
import { PatientsTab } from './components/PatientsTab';
import { ProfileSettings } from './components/ProfileSettings';
import { Role } from './types';
import { Activity, User, Stethoscope } from 'lucide-react';

const LoginScreen: React.FC = () => {
  const { login } = useAppStore();
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 flex items-center justify-center p-4">
      <div className="bg-white max-w-md w-full rounded-2xl shadow-xl p-8 space-y-8">
        <div className="text-center space-y-2">
          <div className="bg-blue-600 w-16 h-16 rounded-2xl flex items-center justify-center text-white mx-auto shadow-lg shadow-blue-600/20">
            <Activity size={32} />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">SmartHealth AI</h1>
          <p className="text-slate-500">Secure Patient & Doctor Portal</p>
        </div>

        <div className="space-y-4">
          <button
            onClick={() => login(Role.PATIENT)}
            className="w-full group relative flex items-center p-4 bg-white border-2 border-slate-100 hover:border-blue-500 rounded-xl transition-all hover:shadow-md"
          >
            <div className="bg-blue-50 p-3 rounded-full text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <User size={24} />
            </div>
            <div className="ml-4 text-left">
              <p className="font-bold text-slate-800">Patient Login</p>
              <p className="text-xs text-slate-400">Access history, AI chat & SOS</p>
            </div>
          </button>

          <button
            onClick={() => login(Role.DOCTOR)}
            className="w-full group relative flex items-center p-4 bg-white border-2 border-slate-100 hover:border-blue-500 rounded-xl transition-all hover:shadow-md"
          >
            <div className="bg-emerald-50 p-3 rounded-full text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <Stethoscope size={24} />
            </div>
            <div className="ml-4 text-left">
              <p className="font-bold text-slate-800">Doctor Login</p>
              <p className="text-xs text-slate-400">Manage patients & prescriptions</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

const MainApp: React.FC = () => {
  const { role } = useAppStore();
  const [activeTab, setActiveTab] = useState(role === Role.DOCTOR ? 'dashboard' : 'health');

  // Render content based on Role and Tab
  const renderContent = () => {
    if (role === Role.PATIENT) {
      switch (activeTab) {
        case 'health': return <PatientDashboard />;
        case 'assistant': return <AiAssistant />;
        case 'profile': return <ProfileSettings />;
        default: return <PatientDashboard />;
      }
    } else {
      // Doctor Views
      switch (activeTab) {
        case 'dashboard': return <DoctorDashboard onViewPatient={() => setActiveTab('patients')} />;
        case 'patients': return <PatientsTab />;
        default: return <DoctorDashboard onViewPatient={() => setActiveTab('patients')} />;
      }
    }
  };

  return (
    <Layout activeTab={activeTab} onTabChange={setActiveTab}>
      {renderContent()}
    </Layout>
  );
};

const AppContent: React.FC = () => {
  const { currentUser } = useAppStore();
  return currentUser ? <MainApp /> : <LoginScreen />;
};

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}