# SmartHealth AI

AI-powered health management platform with patient and doctor portals, plus a React Native mobile app. Features AI-driven prescription/report analysis, voice-enabled health chat, medication tracking, vitals monitoring, symptom assessment, drug search, doctor-patient connections, and emergency SOS alerts via WhatsApp.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Web Frontend** | Next.js 16, React 19, TypeScript, Tailwind CSS 4 |
| **Mobile App** | React Native 0.85, Expo SDK 56, TypeScript |
| **Backend** | Express.js 5, TypeScript, tsx |
| **Database** | PostgreSQL (Neon serverless) + Prisma ORM 7 |
| **AI Chat** | Google Gemini via Mastra framework |
| **Image Analysis** | Groq (Llama 4 Scout) for prescription/report OCR |
| **Symptom Assessment** | Gemini-powered adaptive questionnaire engine |
| **Drug Search** | Eka Care Medicine API |
| **Voice** | Web Speech API (STT) + Sarvam AI (TTS) |
| **Notifications** | Twilio (WhatsApp + SMS), Nodemailer (email) |
| **File Storage** | Cloudinary |
| **Auth** | JWT + bcrypt, email-based doctor approval |
| **Deployment** | Vercel (frontend), Node.js (backend) |

## Features

### Patient Portal (Web + Mobile)

- **Profile Management** -- View/edit personal info, allergies, chronic conditions, blood group
- **Prescriptions** -- Upload prescription images, AI auto-extracts medication names/dosage/frequency using Groq vision. Manual add/edit/delete supported.
- **Medical Reports** -- Upload lab reports (PDF/image), AI auto-extracts vitals (BP, heart rate, SpO2, temperature, sugar, weight)
- **Vitals Tracking** -- Record and monitor 6 vital types with history, filtering, and latest-value cards
- **Medication Reminders** -- Daily schedule derived from prescriptions, grouped by time slot (morning/afternoon/evening/night). Toggle doses as taken, 7-day adherence tracking.
- **AI Health Chat** -- Context-aware chat with access to patient's prescriptions, reports, and vitals. Supports text, image upload, and voice input/output. Hindi/English/Hinglish language matching.
- **Symptom Checker** -- Adaptive AI-driven symptom assessment: select symptoms, answer follow-up questions, receive a severity-rated assessment with recommended actions
- **Drug Search** -- Search medicines by name via Eka Care API with dosage and composition details
- **Doctor Connections** -- View/approve/reject connection requests from doctors
- **SOS Emergency Alert** -- Setup emergency contacts + family doctor. One-tap SOS sends WhatsApp message with Google Maps location link. Auto-resolves when contact replies "ok". SMS fallback.

### Doctor Portal (Web + Mobile)

- **Registration + Approval** -- Doctors register with credentials; approval via email verification link
- **Profile Management** -- Specialization, license number, qualification, experience, clinic details
- **Patient Search + Connection** -- Search patients by email, send connection requests, manage connected patients
- **Patient Detail View** -- View connected patient's full medical history: prescriptions, reports, vitals
- **Doctor Actions** -- Add prescriptions (with file upload), record vitals, and upload reports for connected patients

### AI Capabilities

- **Prescription OCR** -- Groq Llama 4 Scout reads handwritten prescriptions and extracts structured medication data (name, dosage, frequency, duration)
- **Report Analysis** -- Auto-extracts vital signs from uploaded medical report images
- **Health Chat Agent** -- Gemini-powered agent with full patient context (medications, vitals, reports) via Mastra framework
- **Symptom Assessment Engine** -- Gemini generates adaptive follow-up questions based on selected symptoms, produces severity-rated assessment
- **Voice Interaction** -- WhatsApp-style voice bubbles, browser STT, Sarvam AI TTS with language detection
- **Multilingual** -- Responds in the same language the patient uses (Hindi, English, Hinglish)
- **Audio Transcription** -- Backend STT service for voice message processing

## Project Structure

```
Smart-Health-Management-System/
├── frontend/                        # Next.js web app
│   └── src/
│       ├── app/                     # Pages (login, signup, patient, doctor)
│       ├── components/
│       │   ├── patient/             # Patient dashboard tabs
│       │   │   ├── ProfileTab.tsx
│       │   │   ├── PrescriptionsTab.tsx
│       │   │   ├── ReportsTab.tsx
│       │   │   ├── VitalsTab.tsx
│       │   │   ├── MedicationsTab.tsx
│       │   │   ├── ChatTab.tsx
│       │   │   └── SOSTab.tsx
│       │   └── doctor/              # Doctor dashboard
│       ├── lib/                     # API client, utilities
│       └── types/                   # TypeScript definitions
├── app/                             # React Native (Expo) mobile app
│   └── src/
│       ├── screens/
│       │   ├── LoginScreen.tsx
│       │   ├── RegisterScreen.tsx
│       │   ├── PatientDashboardScreen.tsx
│       │   ├── DoctorDashboardScreen.tsx
│       │   ├── DoctorRegisterScreen.tsx
│       │   ├── PatientDetailScreen.tsx
│       │   └── tabs/               # Patient mobile tabs
│       │       ├── HomeTab.tsx
│       │       ├── ProfileTab.tsx
│       │       ├── PrescriptionsTab.tsx
│       │       ├── ReportsTab.tsx
│       │       ├── VitalsTab.tsx
│       │       ├── MedicationsTab.tsx
│       │       ├── HealthAssistantTab.tsx
│       │       ├── SymptomCheckerTab.tsx
│       │       ├── SOSTab.tsx
│       │       └── DoctorRequestsTab.tsx
│       ├── components/              # Reusable mobile components
│       ├── context/                 # Auth context
│       ├── lib/                     # API client
│       ├── navigation/              # React Navigation config
│       └── types/                   # TypeScript definitions
├── backend/                         # Express API server
│   ├── prisma/
│   │   └── schema.prisma           # Database schema (13 models)
│   └── src/
│       ├── config/                  # Env, database
│       ├── controllers/             # Route handlers
│       ├── middleware/              # Auth, upload, error handling, logging
│       ├── services/
│       │   ├── chatService.ts                   # AI chat with patient context
│       │   ├── prescriptionExtractorService.ts  # Groq OCR for prescriptions
│       │   ├── vitalExtractorService.ts         # Groq OCR for vitals
│       │   ├── medicationService.ts             # Daily schedule, adherence
│       │   ├── sosService.ts                    # SOS alerts + WhatsApp
│       │   ├── whatsappService.ts               # Twilio WhatsApp/SMS
│       │   ├── ttsService.ts                    # Sarvam AI text-to-speech
│       │   ├── sttService.ts                    # Speech-to-text transcription
│       │   ├── cloudinaryService.ts             # File uploads
│       │   ├── ekaCareService.ts                # Eka Care drug search API
│       │   ├── emailService.ts                  # Doctor approval emails
│       │   ├── doctorService.ts                 # Doctor business logic
│       │   ├── doctorPatientService.ts          # Doctor-patient connections
│       │   ├── patientService.ts                # Patient business logic
│       │   ├── prescriptionService.ts           # Prescription CRUD
│       │   ├── reportService.ts                 # Report CRUD
│       │   └── vitalService.ts                  # Vital CRUD
│       ├── mastra/                  # AI agent configuration (Gemini)
│       └── routes/
│           ├── patient/             # Patient API routes
│           ├── doctor/              # Doctor API routes
│           ├── ai/                  # AI chat + transcription routes
│           └── webhooks/            # Twilio webhook for SOS auto-resolve
├── package.json                     # Root scripts (concurrently)
└── vercel.json                      # Frontend deployment config
```

## Database Schema

| Model | Purpose |
|-------|---------|
| **User** | Auth (email, password, role: patient/doctor) |
| **Patient** | Profile (age, gender, blood group, allergies, chronic conditions, SOS contacts) |
| **Doctor** | Profile (specialization, license, qualification, experience, clinic info, approval status) |
| **DoctorPatient** | Connection requests between doctors and patients (pending/approved/rejected) |
| **Prescription** | Uploaded prescriptions with file storage, linked to patient and optionally doctor |
| **Medication** | Extracted/manual medications linked to prescriptions (name, dosage, frequency, duration) |
| **MedicationLog** | Daily dose tracking (taken/missed per time slot) |
| **MedicalReport** | Uploaded lab reports (PDF/image) with parsed vitals data |
| **MedicalRecord** | General medical records |
| **Vital** | Health metrics (BP, heart rate, temperature, SpO2, sugar, weight) |
| **ChatSession** | AI chat sessions per patient |
| **ChatMessage** | Chat messages (text, image URL, audio URL) |
| **SOSAlert** | Emergency alerts with GPS coordinates and status |

## API Endpoints

### Auth + Profile

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/patient/register` | Register patient |
| POST | `/api/patient/login` | Patient login |
| GET | `/api/patient/profile` | Get patient profile |
| PUT | `/api/patient/profile` | Update patient profile |
| POST | `/api/doctor/register` | Register doctor |
| POST | `/api/doctor/login` | Doctor login |
| GET | `/api/doctor/approve/:doctorId` | Approve doctor (email link) |
| GET | `/api/doctor/profile` | Get doctor profile |
| PUT | `/api/doctor/profile` | Update doctor profile |

### Prescriptions

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/patient/prescriptions` | Upload prescription (multipart) |
| GET | `/api/patient/prescriptions` | List prescriptions |
| GET | `/api/patient/prescriptions/:id` | Get single prescription |
| DELETE | `/api/patient/prescriptions/:id` | Delete prescription |
| POST | `/api/patient/prescriptions/:id/extract` | AI extract medications from image |
| POST | `/api/patient/prescriptions/:id/medications` | Add medication manually |
| DELETE | `/api/patient/prescriptions/:prescriptionId/medications/:medId` | Remove medication |

### Reports

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/patient/reports` | Upload report (auto-extracts vitals) |
| GET | `/api/patient/reports` | List reports |
| DELETE | `/api/patient/reports/:id` | Delete report |

### Vitals

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/patient/vitals` | Record vital |
| GET | `/api/patient/vitals` | List vitals (filter by type) |
| DELETE | `/api/patient/vitals/:id` | Delete vital |

### Medications

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/patient/medications` | Today's schedule |
| PATCH | `/api/patient/medications/:logId/toggle` | Toggle dose taken |
| GET | `/api/patient/medications/adherence` | 7-day adherence stats |

### SOS

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/patient/sos/config` | Get SOS setup |
| POST | `/api/patient/sos/setup` | Enable SOS with contacts |
| POST | `/api/patient/sos/disable` | Disable SOS |
| POST | `/api/patient/sos` | Trigger SOS alert |
| GET | `/api/patient/sos` | List alerts |
| GET | `/api/patient/sos/active` | Get active alert |
| PATCH | `/api/patient/sos/:id/cancel` | Cancel alert |

### Symptom Assessment

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/patient/assessment/symptoms` | Get symptom categories list |
| POST | `/api/patient/assessment/init` | Start assessment with selected symptoms |
| POST | `/api/patient/assessment/answer` | Answer follow-up question |
| POST | `/api/patient/assessment/submit` | Submit assessment for final evaluation |

### Drug Search

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/patient/drugs/search` | Search medicines by name (Eka Care API) |

### Doctor-Patient Connections

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/doctor/patients/search` | Search patients by email |
| POST | `/api/doctor/patients/request` | Send connection request |
| GET | `/api/doctor/patients/connected` | List connected patients |
| GET | `/api/doctor/patients/requests` | List sent requests |
| GET | `/api/doctor/patients/:patientId` | View patient details |
| DELETE | `/api/doctor/patients/:patientId` | Remove connection |
| GET | `/api/patient/connections/requests` | View pending requests (patient side) |
| GET | `/api/patient/connections/requests/count` | Pending request count |
| PATCH | `/api/patient/connections/requests/:requestId/approve` | Approve request |
| PATCH | `/api/patient/connections/requests/:requestId/reject` | Reject request |

### Doctor Actions

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/doctor/patients/:patientId/prescriptions` | Add prescription for patient |
| POST | `/api/doctor/patients/:patientId/vitals` | Record vital for patient |
| POST | `/api/doctor/patients/:patientId/reports` | Upload report for patient |

### AI Chat

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/ai/chat/sessions` | Create chat session |
| GET | `/api/ai/chat/sessions` | List sessions |
| GET | `/api/ai/chat/sessions/:id/messages` | Get session messages |
| POST | `/api/ai/chat/sessions/:id/messages` | Send message (text/image/voice) |
| DELETE | `/api/ai/chat/sessions/:id` | Delete session |
| POST | `/api/ai/chat/transcribe` | Transcribe audio to text |

### Webhooks

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/webhooks/twilio/whatsapp` | Twilio WhatsApp reply handler (SOS auto-resolve) |

## Prerequisites

- Node.js >= 22
- PostgreSQL database (or Neon serverless)
- API Keys: Google Gemini, Groq, Cloudinary, Sarvam AI, Twilio, Eka Care
- (Mobile) Expo CLI, iOS Simulator / Android Emulator

## Setup

### Web App

1. Clone and install:
   ```bash
   git clone https://github.com/StellarSyntax-03/Smart-Health-Management-System.git
   cd Smart-Health-Management-System
   npm run install:all
   ```

2. Configure backend environment:
   ```bash
   cp backend/.env.example backend/.env
   ```

   Required variables:
   ```env
   DATABASE_URL=postgresql://...
   JWT_SECRET=your-secret
   GEMINI_API_KEY=your-gemini-key
   GROQ_API_KEY=your-groq-key
   CLOUDINARY_CLOUD_NAME=...
   CLOUDINARY_API_KEY=...
   CLOUDINARY_API_SECRET=...
   SARVAM_API_KEY=your-sarvam-key
   TWILIO_ACCOUNT_SID=your-twilio-sid
   TWILIO_AUTH_TOKEN=your-twilio-token
   TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
   EKA_CARE_CLIENT_ID=your-eka-client-id
   EKA_CARE_CLIENT_SECRET=your-eka-client-secret
   ```

3. Configure frontend environment:
   ```bash
   cp frontend/.env.example frontend/.env
   ```
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:5001/api
   ```

4. Push database schema:
   ```bash
   cd backend && npx prisma db push
   ```

5. Run development servers:
   ```bash
   npm run dev
   ```
   - Frontend: http://localhost:3000
   - Backend: http://localhost:5001

6. (Optional) For SOS webhook testing, expose backend via ngrok:
   ```bash
   ngrok http 5001
   ```
   Set the ngrok URL in Twilio WhatsApp Sandbox settings:
   `https://your-ngrok-url/api/webhooks/twilio/whatsapp`

### Mobile App

1. Install dependencies:
   ```bash
   cd app
   npm install
   ```

2. Update API base URL in `app/src/lib/` to point to your backend.

3. Start Expo:
   ```bash
   npx expo start
   ```

4. Scan the QR code with Expo Go, or press `i` for iOS Simulator / `a` for Android Emulator.

## Available Scripts

### Root

| Command | Description |
|---------|-------------|
| `npm run dev` | Start both frontend and backend concurrently |
| `npm run dev:frontend` | Start frontend only |
| `npm run dev:backend` | Start backend only |
| `npm run build` | Build both for production |
| `npm run install:all` | Install deps for frontend + backend |

### Backend

| Command | Description |
|---------|-------------|
| `npm run db:push` | Push Prisma schema to database |
| `npm run db:studio` | Open Prisma Studio (database GUI) |
| `npm run db:generate` | Regenerate Prisma client |

### Mobile

| Command | Description |
|---------|-------------|
| `npm start` | Start Expo dev server |
| `npm run ios` | Run on iOS simulator |
| `npm run android` | Run on Android emulator |

## Architecture Decisions

- **Groq for extraction, Gemini for chat** -- Groq (Llama 4 Scout) handles image analysis/OCR with higher free-tier limits. Gemini powers the conversational health agent via Mastra.
- **Mastra framework** -- Manages Gemini agent with multiple API key fallback for rate limiting.
- **Sarvam AI for TTS** -- Indian language support (Hindi/English) with the bulbul:v2 model.
- **Eka Care API** -- Drug search and medical data integration for the Indian healthcare ecosystem.
- **Twilio WhatsApp sandbox** -- SOS alerts sent via WhatsApp with SMS fallback. Production would use Twilio WhatsApp Business API.
- **Fire-and-forget extraction** -- Prescription/report uploads return immediately. AI extraction runs in background.
- **Email-based doctor approval** -- Doctors receive an approval link via Nodemailer after registration.
- **Expo for mobile** -- Shared TypeScript codebase with the backend API, cross-platform iOS/Android support with native modules (camera, location, file picker).
