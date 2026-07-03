// Vivran.ai extension configuration.
// The anon key is a public client key (same one shipped in the web app bundle);
// all data access is still gated by Supabase RLS with the signed-in user's JWT.
export const CONFIG = {
  SUPABASE_URL: "https://pguwrkejmhzpjfazkhzd.supabase.co",
  SUPABASE_ANON_KEY:
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBndXdya2VqbWh6cGpmYXpraHpkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI1NzkwODQsImV4cCI6MjA5ODE1NTA4NH0.36LfGioDbwoDBZRAPTI3JVdCp_SYycHhZcLVia--Pyo",
  // FastAPI backend that runs transcription/summarisation
  API_URL: "https://vivran-ai.onrender.com",
  // Next.js portal, used for "View in Vivran.ai" links
  PORTAL_URL: "https://vivran-ai.vercel.app",
  STORAGE_BUCKET: "meeting-audio",
};
