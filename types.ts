export enum Role {
  DOCTOR = 'DOCTOR',
  PATIENT = 'PATIENT'
}

export interface User {
  id: string;
  name: string;
  role: Role;
  email: string;
}

export interface MedicalRecord {
  id: string;
  date: string;
  condition: string;
  notes: string;
  type: 'Consultation' | 'Lab Report' | 'Emergency';
}

export interface MedicalReport {
  id: string;
  name: string;
  date: string;
  type: 'PDF' | 'IMAGE';
  url: string; // In a real app, this is a URL. Here, it might be base64.
}

export interface Prescription {
  id: string;
  date: string;
  doctorName: string;
  medications: Medication[];
  notes?: string;
}

export interface Medication {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
}

export interface Patient extends User {
  age: number;
  bloodGroup: string;
  phone?: string;
  address?: string;
  allergies: string[];
  chronicConditions: string[];
  history: MedicalRecord[];
  prescriptions: Prescription[];
  reports: MedicalReport[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
  attachment?: {
    mimeType: string;
    data: string; // Base64
    name?: string;
  };
}

export interface SOSAlert {
  id: string;
  patientId: string;
  patientName: string;
  timestamp: string;
  location: { lat: number; lng: number } | null;
  status: 'Active' | 'Resolved';
}

export interface PrescriptionAnalysisResult {
  safe: boolean;
  warnings: string[];
  structuredPrescription: Medication[];
}