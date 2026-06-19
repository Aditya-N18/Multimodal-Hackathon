# EvidenceLine

Voice-first incident documentation for emergency and insurance workflows. Callers describe what happened via a Vapi voice agent; the dashboard shows live cases, prompts photo uploads, and displays AI-generated evidence reports.

## What it does

1. **Voice intake** — A Vapi assistant collects incident details over the phone or in the browser.
2. **Live dashboard** — Cases appear in real time from InsForge with status tracking.
3. **Photo evidence** — When a case needs photos, an inline upload widget appears on the dashboard.
4. **AI analysis** — Backend vision analysis produces hazard evidence, severity, and summaries on the incident report.

## Architecture

```
Caller (phone / browser)
        │
        ▼
   Vapi voice agent  ──webhooks──▶  Fly.dev API  ──▶  InsForge DB
        │                                │
        │                                └──▶  Nebius vision (photo analysis)
        ▼
  Browser voice test (/call)

Dashboard (this repo)
        │
        ├── reads incidents from InsForge
        ├── InsForge Realtime (with 5s polling fallback)
        └── uploads photos to Fly.dev API
```

| Service | Role |
|---------|------|
| **Vapi** | Voice agent, STT/TTS, tool calls |
| **InsForge** | `incidents` table, realtime updates |
| **Fly.dev API** | Vapi webhooks, photo upload, vision pipeline |
| **React frontend** | Dashboard, voice test, inline uploads |

## Tech stack

- **React 19** + **Vite 8**
- **Tailwind CSS 3.4** + **shadcn/ui**
- **Aceternity UI** patterns (spotlight, beams, moving border)
- **Framer Motion** — voice blob, animations
- **@vapi-ai/web** — browser voice calls
- **@insforge/sdk** — database reads + realtime

## Getting started

### Prerequisites

- Node.js 18+
- InsForge project URL + anon key
- Vapi public key + assistant ID

### Install & run

```bash
cd frontend
npm install
cp .env.example .env
# Fill in your credentials in .env
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

### Build for production

```bash
cd frontend
npm run build
npm run preview
```

## Environment variables

Copy `frontend/.env.example` to `frontend/.env`:

| Variable | Description |
|----------|-------------|
| `VITE_INSFORGE_URL` | InsForge project URL (no trailing slash) |
| `VITE_INSFORGE_ANON_KEY` | InsForge anon key |
| `VITE_REALTIME_CHANNEL` | Realtime channel (default: `incidents`) |
| `VITE_REALTIME_EVENT` | Realtime event (default: `incident_updated`) |
| `VITE_VAPI_PUBLIC_KEY` | Vapi public API key |
| `VITE_VAPI_ASSISTANT_ID` | Vapi assistant ID |
| `VITE_UPLOAD_API_BASE` | Fly.dev API base URL for photo uploads |

Without InsForge credentials, the app runs in **demo mode** with mock incident data.

## Routes

| Path | Page |
|------|------|
| `/` | Incident dashboard — live case list |
| `/incidents/:id` | Full incident report |
| `/call` | Browser voice agent test |

## Key features

### Dashboard

- Live incident list with status badges (`new`, `awaiting_photos`, `analyzing`, `report_ready`)
- Detects status transitions to `awaiting_photos` and shows an inline photo upload widget
- Polls every 5 seconds as a fallback when Realtime is unavailable

### Voice test (`/call`)

- Morphing AI blob visual that pulses while listening
- Mic test mode (stays active until stopped)
- Call persists across page navigation until you end it
- Live transcript shows complete turns (not word-by-word partials)
- Tool-call events appear in the transcript

### Incident report

- Modern glassmorphism card layout
- Caller info, transcript, evidence photos, AI analysis
- Responder summary and insurance case file sections

## Vapi tools

All three tools point to the same webhook:

```
POST {VITE_UPLOAD_API_BASE}/webhooks/vapi
```

| Tool | Purpose |
|------|---------|
| `create_incident` | Create a new case in InsForge |
| `request_photo_upload` | Set status to `awaiting_photos` |
| `check_incident_status` | Return current case status |

Tool names must match exactly in the Vapi dashboard.

## Photo upload

```
POST {VITE_UPLOAD_API_BASE}/upload/:incident_id
Content-Type: multipart/form-data
Field name: photo
```

The dashboard widget offers **Choose File** (gallery) and **Upload Photo** (camera on mobile).

## Project structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── VoiceAssistant.jsx   # Voice test UI
│   │   ├── VoiceBlob.jsx        # Animated AI orb
│   │   ├── IncidentCard.jsx     # Dashboard list card
│   │   ├── IncidentPhotoUpload.jsx
│   │   ├── Layout.jsx
│   │   └── ui/                  # shadcn + glass cards
│   ├── context/
│   │   └── VapiContext.jsx      # Global call state
│   ├── hooks/
│   │   ├── useIncidents.js      # List + realtime + polling
│   │   ├── useIncident.js       # Single case fetch
│   │   └── useVapiCall.js       # Re-exports VapiContext
│   ├── lib/
│   │   ├── insforge.js          # InsForge client
│   │   ├── vapi.js              # Vapi SDK singleton
│   │   ├── upload-incident-photo.js
│   │   └── constants.js
│   └── pages/
│       ├── IncidentList.jsx
│       ├── IncidentDetail.jsx
│       └── VoiceCall.jsx
├── .env.example
└── package.json
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |
| `npm run lint` | ESLint |

## License

Hackathon project — internal use.
