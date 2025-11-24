import React from 'react';
import { useAppStore } from '../store';
import { Role } from '../types';
import { LogOut, User as UserIcon, Activity, Stethoscope } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, activeTab, onTabChange }) => {
  const { currentUser, logout } = useAppStore();
  const isDoctor = currentUser?.role === Role.DOCTOR;

  const navItems = isDoctor 
    ? [
        { id: 'dashboard', label: 'Dashboard', icon: Activity },
        { id: 'patients', label: 'Patients', icon: UserIcon },
      ]
    : [
        { id: 'health', label: 'My Health', icon: Activity },
        { id: 'assistant', label: 'AI Assistant', icon: Stethoscope },
        { id: 'profile', label: 'Profile', icon: UserIcon },
      ];

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Sidebar (Desktop) */}
      <aside className="w-64 bg-white border-r border-slate-200 hidden md:flex flex-col z-20 shadow-sm">
        <div className="p-6 border-b border-slate-100 flex items-center gap-2">
          <div className="bg-blue-600 text-white p-1.5 rounded-lg">
            <Activity size={20} />
          </div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">SmartHealth</h1>
        </div>
        
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                activeTab === item.id 
                  ? 'bg-blue-50 text-blue-600' 
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <item.icon size={18} />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-100">
          <div className="flex items-center gap-3 px-4 py-3 mb-2">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-xs shrink-0">
              {currentUser?.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">{currentUser?.name}</p>
              <p className="text-xs text-slate-500 truncate">{isDoctor ? 'Doctor' : 'Patient'}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut size={16} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full w-full relative">
        {/* Mobile Header */}
        <header className="h-16 bg-white border-b border-slate-200 md:hidden flex items-center px-4 justify-between shrink-0 z-20">
           <div className="flex items-center gap-2">
             <div className="bg-blue-600 text-white p-1.5 rounded-lg">
                <Activity size={20} />
             </div>
             <span className="font-bold text-slate-800">SmartHealth</span>
           </div>
           <button onClick={logout} className="text-slate-500 p-2"><LogOut size={20}/></button>
        </header>

        {/* Scrollable Content */}
        <main className="flex-1 overflow-auto p-4 md:p-8 pb-24 md:pb-8 relative scroll-smooth">
          {children}
        </main>

        {/* Mobile Nav Tabs (Bottom) */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex justify-around py-2 pb-safe z-30 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
           {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`flex flex-col items-center gap-1 p-2 rounded-lg text-[10px] w-full ${activeTab === item.id ? 'text-blue-600 bg-blue-50/50' : 'text-slate-500'}`}
            >
              <item.icon size={22} strokeWidth={activeTab === item.id ? 2.5 : 2} />
              <span className="font-medium">{item.label}</span>
            </button>
           ))}
        </div>
      </div>
    </div>
  );
};