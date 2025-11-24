import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Patient, Role, SOSAlert, Prescription, MedicalReport } from '../types';
import { MOCK_PATIENTS, MOCK_DOCTOR, MOCK_ALERTS } from '../constants';

interface AppState {
  currentUser: User | null;
  role: Role | null;
  patients: Patient[];
  alerts: SOSAlert[];
  login: (role: Role, id?: string) => void;
  logout: () => void;
  triggerSOS: (location: { lat: number; lng: number }) => void;
  addPrescription: (patientId: string, prescription: Prescription) => void;
  addReport: (patientId: string, report: MedicalReport) => void;
  updatePatientProfile: (updatedData: Partial<Patient>) => void;
  resolveAlert: (id: string) => void;
}

const AppContext = createContext<AppState | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [patients, setPatients] = useState<Patient[]>(MOCK_PATIENTS);
  const [alerts, setAlerts] = useState<SOSAlert[]>(MOCK_ALERTS);

  // Sync currentUser with patients array when patients update
  useEffect(() => {
    if (currentUser && currentUser.role === Role.PATIENT) {
      const updatedPatient = patients.find(p => p.id === currentUser.id);
      if (updatedPatient) {
        setCurrentUser(updatedPatient);
      }
    }
  }, [patients]);

  const login = (role: Role, id?: string) => {
    if (role === Role.DOCTOR) {
      setCurrentUser(MOCK_DOCTOR);
    } else {
      // Default to first patient if no ID provided for demo
      const patient = id ? patients.find(p => p.id === id) : patients[0];
      if (patient) setCurrentUser(patient);
    }
  };

  const logout = () => {
    setCurrentUser(null);
  };

  const triggerSOS = (location: { lat: number; lng: number }) => {
    if (currentUser?.role !== Role.PATIENT) return;
    
    const newAlert: SOSAlert = {
      id: `sos-${Date.now()}`,
      patientId: currentUser.id,
      patientName: currentUser.name,
      timestamp: new Date().toISOString(),
      location,
      status: 'Active'
    };
    setAlerts(prev => [newAlert, ...prev]);
  };

  const resolveAlert = (id: string) => {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, status: 'Resolved' } : a));
  };

  const addPrescription = (patientId: string, prescription: Prescription) => {
    setPatients(prev => prev.map(p => {
      if (p.id === patientId) {
        return { ...p, prescriptions: [prescription, ...p.prescriptions] };
      }
      return p;
    }));
  };

  const addReport = (patientId: string, report: MedicalReport) => {
    setPatients(prev => prev.map(p => {
      if (p.id === patientId) {
        return { ...p, reports: [report, ...p.reports] };
      }
      return p;
    }));
  };

  const updatePatientProfile = (updatedData: Partial<Patient>) => {
    if (!currentUser || currentUser.role !== Role.PATIENT) return;
    
    setPatients(prev => prev.map(p => 
        p.id === currentUser.id ? { ...p, ...updatedData } : p
    ));
    
    // Also update currentUser to reflect changes immediately
    setCurrentUser(prev => prev ? { ...prev, ...updatedData } as User : null);
  };

  return (
    <AppContext.Provider value={{
      currentUser,
      role: currentUser?.role || null,
      patients,
      alerts,
      login,
      logout,
      triggerSOS,
      addPrescription,
      addReport,
      updatePatientProfile,
      resolveAlert
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppStore = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useAppStore must be used within AppProvider");
  return context;
};