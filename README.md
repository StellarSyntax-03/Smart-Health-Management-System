# SmartHealth AI

AI-powered health management platform with patient and doctor portals. Features AI-driven prescription/report analysis, voice-enabled health chat, medication tracking, vitals monitoring, and emergency SOS alerts via WhatsApp.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15, TypeScript, Tailwind CSS |
| Backend | Express.js, TypeScript |
| Database | PostgreSQL (Neon) + Prisma ORM |
| AI Chat | Google Gemini via Mastra framework |
| Image Analysis | Groq (Llama 4 Scout) for prescription/report OCR |
| Voice | Web Speech API (STT) + Sarvam AI (TTS) |
| Notifications | Twilio (WhatsApp + SMS) |
| File Storage | Cloudinary |
| Auth | JWT with bcrypt |

## Features

### Patient Portal

- **Profile Management** - View/edit personal info, allergies, chronic conditions, blood group
- **Prescriptions** - Upload prescription images, AI auto-extracts medication names/dosage/frequency using Groq vision. Manual add/edit/delete supported.
- **Medical Reports** - Upload lab reports (PDF/image), AI auto-extracts vitals (BP, heart rate, SpO2, etc.)
- **Vitals Tracking** - Record and monitor 6 vital types with history, filtering, and latest-value cards
- **Medication Reminders** - Daily schedule derived from prescriptions, grouped by time slot (morning/afternoon/evening/night). Toggle doses as taken, 7-day adherence tracking.
- **AI Health Chat** - Context-aware chat with access to patient's prescriptions, reports, and vitals. Supports text, image upload, and voice input/output. Hindi/English/Hinglish language matching.
- **SOS Emergency Alert** - Setup emergency contacts + family doctor. One-tap SOS sends WhatsApp message with Google Maps location link. Auto-resolves when contact replies "ok". SMS fallback.

### AI Capabilities

- **Prescription OCR** - Groq Llama 4 Scout reads handwritten prescriptions and extracts structured medication data
- **Report Analysis** - Auto-extracts vital signs from uploaded medical report images
- **Health Chat Agent** - Gemini-powered agent with full patient context (meds, vitals, reports)
- **Voice Interaction** - WhatsApp-style voice bubbles, browser STT, Sarvam AI TTS with language detection
- **Multilingual** - Responds in the same language the patient uses (Hindi, English, Hinglish)

## Project Structure

```
Smart-Health-Management-System/
├── frontend/                    # Next.js app
│   └── src/
│       ├── app/                 # Pages (login, signup, patient, doctor)
│       ├── components/patient/  # Patient dashboard tabs
│       │   ├── ProfileTab.tsx
│       │   ├── PrescriptionsTab.tsx
│       │   ├── ReportsTab.tsx
│       │   ├── VitalsTab.tsx
│       │   ├── MedicationsTab.tsx
│       │   ├── ChatTab.tsx
│       │   └── SOSTab.tsx
│       ├── lib/                 # API client, utilities
│       └── types/               # TypeScript definitions
├── backend/                     # Express API server
│   └── src/
│       ├── config/              # env, database
│       ├── controllers/         # Route handlers
│       ├── middleware/          # Auth, upload, error handling, logging
│       ├── services/            # Business logic
│       │   ├── chatService.ts           # AI chat with patient context
│       │   ├── prescriptionExtractorService.ts  # Groq OCR for prescriptions
│       │   ├── vitalExtractorService.ts         # Groq OCR for vitals
│       │   ├── medicationService.ts     # Daily schedule, adherence
│       │   ├── sosService.ts            # SOS alerts + WhatsApp
│       │   ├── whatsappService.ts       # Twilio WhatsApp/SMS
│       │   ├── ttsService.ts            # Sarvam AI text-to-speech
│       │   └── cloudinaryService.ts     # File uploads
│       ├── mastra/              # AI agent configuration (Gemini)
│       ├── routes/
│       │   ├── patient/         # Patient API routes
│       │   └── webhooks/        # Twilio webhook for SOS auto-resolve
│       └── generated/prisma/    # Prisma client
└── prisma/
    └── schema.prisma            # Database schema
```

## Database Schema

| Model | Purpose |
|-------|---------|
| User | Auth (email, password, role) |
| Patient | Profile (age, gender, blood group, allergies, SOS contacts) |
| Doctor | Profile (specialization, license) |
| Prescription | Uploaded prescriptions with file storage |
| Medication | Extracted/manual medications linked to prescriptions |
| MedicationLog | Daily dose tracking (taken/missed per time slot) |
| MedicalReport | Uploaded lab reports |
| Vital | Health metrics (BP, heart rate, temperature, SpO2, sugar, weight) |
| MedicalRecord | General medical records |
| ChatSession | AI chat sessions |
| ChatMessage | Chat messages (text, image, audio URLs) |
| SOSAlert | Emergency alerts with location |

## API Endpoints

### Patient

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/patient/register` | Register patient |
| POST | `/api/patient/login` | Login |
| GET | `/api/patient/profile` | Get profile |
| PUT | `/api/patient/profile` | Update profile |

### Prescriptions

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/patient/prescriptions` | Upload prescription (multipart) |
| GET | `/api/patient/prescriptions` | List prescriptions |
| GET | `/api/patient/prescriptions/:id` | Get one |
| DELETE | `/api/patient/prescriptions/:id` | Delete |
| POST | `/api/patient/prescriptions/:id/extract` | AI extract medications from image |
| POST | `/api/patient/prescriptions/:id/medications` | Add medication manually |
| DELETE | `/api/patient/prescriptions/:prescriptionId/medications/:medId` | Remove medication |

### Reports

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/patient/reports` | Upload report (auto-extracts vitals) |
| GET | `/api/patient/reports` | List reports |
| DELETE | `/api/patient/reports/:id` | Delete |

### Vitals

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/patient/vitals` | Record vital |
| GET | `/api/patient/vitals` | List vitals (filter by type) |
| DELETE | `/api/patient/vitals/:id` | Delete |

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

### AI Chat

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/ai/chat/sessions` | Create chat session |
| GET | `/api/ai/chat/sessions` | List sessions |
| POST | `/api/ai/chat/sessions/:id/messages` | Send message (text/image/voice) |

### Webhooks

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/webhooks/twilio/whatsapp` | Twilio WhatsApp reply handler (SOS auto-resolve) |

## Prerequisites

- Node.js >= 20
- PostgreSQL database (or Neon serverless)
- API Keys: Gemini, Groq, Cloudinary, Sarvam AI, Twilio

## Setup

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
   ```

3. Push database schema:
   ```bash
   cd backend && npx prisma db push
   ```

4. Run development servers:
   ```bash
   npm run dev
   ```
   - Frontend: http://localhost:3000
   - Backend: http://localhost:5001

5. (Optional) For SOS webhook testing, expose backend via ngrok:
   ```bash
   ngrok http 5001
   ```
   Set the ngrok URL in Twilio WhatsApp Sandbox settings as the webhook URL:
   `https://your-ngrok-url/api/webhooks/twilio/whatsapp`

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start both frontend and backend |
| `npm run dev:frontend` | Start frontend only |
| `npm run dev:backend` | Start backend only |
| `npm run build` | Build both for production |
| `npm run install:all` | Install deps for both apps |

## Architecture Decisions

- **Groq for extraction, Gemini for chat** - Groq (Llama 4 Scout) handles image analysis/OCR with higher free-tier limits. Gemini powers the conversational health agent via Mastra.
- **Sarvam AI for TTS** - Indian language support (Hindi/English) with the bulbul:v2 model.
- **Twilio WhatsApp sandbox** - SOS alerts sent via WhatsApp with SMS fallback. Production would use Twilio WhatsApp Business API.
- **Fire-and-forget extraction** - Prescription/report uploads return immediately. AI extraction runs in background.
- **Mastra framework** - Manages Gemini agent with multiple API key fallback for rate limiting.
