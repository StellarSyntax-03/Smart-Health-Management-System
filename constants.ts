import { Patient, Role, User, SOSAlert } from './types';

export const MOCK_PATIENTS: Patient[] = [
  {
    id: 'p1',
    name: 'John Doe',
    role: Role.PATIENT,
    email: 'john@example.com',
    age: 45,
    bloodGroup: 'O+',
    phone: '+1 (555) 123-4567',
    address: '123 Main St, New York, NY',
    allergies: ['Penicillin', 'Peanuts'],
    chronicConditions: ['Hypertension', 'Asthma'],
    history: [
      { id: 'h1', date: '2023-10-15', type: 'Consultation', condition: 'Flu Symptoms', notes: 'Prescribed rest and hydration.' },
      { id: 'h2', date: '2023-11-20', type: 'Lab Report', condition: 'Annual Checkup', notes: 'Cholesterol slightly elevated.' }
    ],
    prescriptions: [
       {
         id: 'pr1',
         date: '2023-10-15',
         doctorName: 'Dr. Smith',
         medications: [
           { name: 'Paracetamol', dosage: '500mg', frequency: 'Every 6 hours', duration: '5 days' }
         ]
       }
    ],
    reports: [
      { id: 'r1', name: 'Blood_Test_Oct23.pdf', date: '2023-10-15', type: 'PDF', url: '' }
    ]
  },
  {
    id: 'p2',
    name: 'Jane Smith',
    role: Role.PATIENT,
    email: 'jane@example.com',
    age: 32,
    bloodGroup: 'A-',
    phone: '+1 (555) 987-6543',
    address: '456 Oak Ave, San Francisco, CA',
    allergies: [],
    chronicConditions: ['Diabetes Type 2'],
    history: [],
    prescriptions: [],
    reports: []
  }
];

export const MOCK_DOCTOR: User = {
  id: 'd1',
  name: 'Dr. Sarah Connor',
  role: Role.DOCTOR,
  email: 'sarah.connor@clinic.com'
};

export const MOCK_ALERTS: SOSAlert[] = [
  {
    id: 'sos1',
    patientId: 'p1',
    patientName: 'John Doe',
    timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 mins ago
    location: { lat: 40.7128, lng: -74.0060 },
    status: 'Active'
  }
];

// Initial prompts
export const SYSTEM_INSTRUCTION_CHATBOT = `You are a compassionate and knowledgeable medical AI assistant named "SmartHealth AI". 
Your goal is to help patients understand their symptoms, analyze uploaded medical reports (PDFs or Images), and provide general wellness advice.

FORMATTING RULES (Strictly Follow):
1. Use SHORT paragraphs. Avoid walls of text.
2. Use BULLET POINTS for lists (remedies, steps, symptoms).
3. Use **BOLD** text for key terms or warnings.
4. Keep the tone professional yet warm.

IMPORTANT SAFETY RULES:
1. NEVER provide a definitive medical diagnosis.
2. ALWAYS advise the user to consult a doctor for serious concerns.
3. If the symptoms sound life-threatening (e.g., chest pain, difficulty breathing, severe bleeding), tell them to call emergency services immediately.
`;

export const SYSTEM_INSTRUCTION_PRESCRIPTION = `You are an expert medical transcriptionist and safety officer.
Your task is two-fold:
1. Parse unstructured text into a structured JSON prescription format.
2. Analyze the medications against the patient's allergies and conditions for safety.

Output JSON structure:
{
  "structuredPrescription": [ { "name": "Drug Name", "dosage": "Amount", "frequency": "Freq", "duration": "Time" } ],
  "safe": boolean,
  "warnings": ["List of potential interactions or allergy conflicts"]
}
`;