// Supabase client, created only when credentials are present.
//
// The app must keep working with localStorage-only saves when Supabase isn't
// configured — CI builds without these env vars, and a fresh clone shouldn't
// need a Supabase project just to run `npm run dev`.

import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabaseConfigured = Boolean(url && anonKey);

export const supabase = supabaseConfigured ? createClient(url, anonKey) : null;
