export enum Role {
  PATIENT = "patient",
  DOCTOR = "doctor",
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface Patient extends User {
  age: number;
  gender: string;
  bloodGroup: string;
  phone?: string;
  address?: string;
  allergies: string[];
  chronicConditions: string[];
}

export interface Medication {
  id: string;
  prescriptionId: string;
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
}

export interface Prescription {
  id: string;
  patientId: string;
  doctorId: string | null;
  date: string;
  notes: string | null;
  fileUrl: string | null;
  fileName: string | null;
  filePublicId: string | null;
  medications: Medication[];
}

export interface MedicalReport {
  id: string;
  patientId: string;
  name: string;
  date: string;
  type: "pdf" | "image";
  url: string;
  filePublicId: string | null;
}

export interface PatientProfile {
  id: string;
  email: string;
  name: string;
  role: Role;
  phone: string | null;
  createdAt: string;
  patient: {
    id: string;
    age: number;
    gender: string;
    bloodGroup: string | null;
    address: string | null;
    allergies: string[];
    chronicConditions: string[];
  } | null;
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  role: "user" | "assistant";
  text: string;
  imageUrl: string | null;
  createdAt: string;
}

export interface ChatSession {
  id: string;
  patientId: string;
  createdAt: string;
  messages: ChatMessage[];
}

export interface SendMessageResult {
  userMessage: ChatMessage;
  assistantMessage: ChatMessage;
  usage: Record<string, unknown>;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
