# SmartHealth AI

AI-powered health management platform with separate patient and doctor portals.

## Tech Stack

- **Frontend:** Next.js + TypeScript + Tailwind CSS
- **Backend:** Express + TypeScript
- **AI:** Google Gemini API
- **Database:** PostgreSQL + Prisma (upcoming)

## Project Structure

```
├── frontend/          # Next.js app (patient & doctor UI)
│   └── src/
│       ├── app/       # Pages (login, patient, doctor)
│       ├── components/ # Reusable UI components
│       ├── lib/       # API client, utilities
│       └── types/     # TypeScript definitions
├── backend/           # Express API server
│   └── src/
│       ├── routes/    # patient, doctor, ai endpoints
│       ├── middleware/ # error handling, auth
│       ├── services/  # business logic
│       └── config/    # environment, database
```

## Prerequisites

- Node.js >= 20.19.0
- npm

## Setup

1. Clone the repo:
   ```bash
   git clone https://github.com/StellarSyntax-03/Smart-Health-Management-System.git
   cd Smart-Health-Management-System
   ```

2. Install dependencies:
   ```bash
   npm run install:all
   ```

3. Set up environment variables:
   ```bash
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env.local
   ```
   Update `backend/.env` with your Gemini API key.

4. Run both servers:
   ```bash
   npm run dev
   ```

   - Frontend: http://localhost:3000
   - Backend: http://localhost:5001

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start both frontend and backend |
| `npm run dev:frontend` | Start frontend only |
| `npm run dev:backend` | Start backend only |
| `npm run build` | Build both for production |
| `npm run install:all` | Install deps for both apps |

## API Endpoints

| Method | URL | Purpose |
|--------|-----|---------|
| GET | `/api/health` | Server health check |
| GET | `/api/patient` | Patient routes |
| GET | `/api/doctor` | Doctor routes |
| GET | `/api/ai` | AI routes |
