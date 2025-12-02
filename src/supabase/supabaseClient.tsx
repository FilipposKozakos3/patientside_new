// src/supabase/supabaseClient.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

console.log(supabaseAnonKey);

// Make sure you set these two env vars in your Vite/React setup.
// Or temporarily replace with the literal URL and anon key from the Supabase dashboard.
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
