// ============================================================
// CONFIGURACIÓN — reemplaza estos dos valores por los de tu
// proyecto: Supabase → Project Settings → API
// La "anon key" es pública por diseño. Lo que protege los datos
// es RLS + el login. NUNCA pongas aquí la service_role key.
// ============================================================

const SUPABASE_URL = 'https://nmztavrmecjrqxxrapeu.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5tenRhdnJtZWNqcnF4eHJhcGV1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk5NDUwMjIsImV4cCI6MjEwNTUyMTAyMn0.Nh7tpi11h27kfEDZBz1SWadAIyYbG9DH5ITqvd4sNIo';

const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
