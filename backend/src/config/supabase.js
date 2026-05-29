import dotenv from "dotenv";
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

// In desktop/offline mode Supabase is not configured — return null so callers
// can fall back to local disk storage instead.
let supabase = null;

if (supabaseUrl && supabaseKey) {
  const { createClient } = await import("@supabase/supabase-js");
  const { default: ws }  = await import("ws");
  supabase = createClient(supabaseUrl, supabaseKey, {
    realtime: { transport: ws },
  });
}

export default supabase;