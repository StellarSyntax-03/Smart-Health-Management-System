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

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}
