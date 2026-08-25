// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://fjazbdgcetjvzshsluvx.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZqYXpiZGdjZXRqdnpzaHNsdXZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODczODA2NjIsImV4cCI6MjEwMjk1NjY2Mn0.Nr60wAVE08qF2xGdgZKMoXVHOUwkeFxxTT8SdSaUblk';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);