import { createClient } from '@supabase/supabase-js';

// Use environment variables or fallback to placeholder values
const supabaseUrl = import.meta?.env?.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = import.meta?.env?.VITE_SUPABASE_ANON_KEY || 'placeholder-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
