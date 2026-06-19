# EvidenceLine Backend

Node.js API for the EvidenceLine incident response pipeline: Vapi voice webhooks, photo upload, Nebius vision analysis, and InsForge database/storage.

## Setup

```bash
cd backend
npm install
cp .env.example .env   # add NEBIUS_API_KEY, INSFORGE_URL, INSFORGE_API_KEY
npm start              # http://localhost:3001
```

Link to InsForge (optional — creates `.insforge/project.json` locally):

```bash
npx @insforge/cli link
npx @insforge/cli db migrations up --all
```

## API

| Endpoint | Description |
|----------|-------------|
| `POST /webhooks/vapi` | Vapi tool-calls webhook |
| `POST /upload/:incident_id` | Photo upload (multipart field `photo`) |
| `GET /api/incidents` | Incident list for dashboard |
| `GET /debug/logs` | In-memory log buffer |

## Deploy (InsForge Compute)

```bash
npx @insforge/cli compute deploy . --name evidenceline-api --env-file .env.deploy
```

## Tests

```bash
npm run test:gemini-e2e      # Full pipeline with test image
npm run test:dashboard-e2e   # API + incidents list
npm run monitor              # Poll production logs
```
