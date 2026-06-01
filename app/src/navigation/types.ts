export type AuthStackParamList = {
  Login: { role?: string };
  Register: undefined;
  DoctorRegister: undefined;
};

export type AppStackParamList = {
  PatientDashboard: undefined;
  DoctorDashboard: undefined;
  PatientDetail: { patientId: string; patientName: string };
};
