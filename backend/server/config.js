export const STORAGE_BUCKET = 'incident-photos';
export const PORT = Number(process.env.PORT ?? 3001);
export const UPLOAD_BASE_URL =
  process.env.UPLOAD_BASE_URL ?? `http://localhost:${PORT}`;
export const API_BASE_URL =
  process.env.API_BASE_URL ??
  'https://evidenceline-api-0e3b962d-641e-40eb-9df9-2e78323ae83a.fly.dev';
