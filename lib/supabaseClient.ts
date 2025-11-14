import { createClient } from '@supabase/supabase-js';

// The Supabase URL and Anon Key are hardcoded here based on user input.
// In a production environment, these should be stored securely as environment variables.
const supabaseUrl = 'https://omunsyiramsdgixvxvuz.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9tdW5zeWlyYW1zZGdpeHZ4dnV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIwMzIzMDUsImV4cCI6MjA3NzYwODMwNX0.4uRYceFN4lLRJXft1-EVAlQP6e-jKvj4Ke1kodmyyeE';


if (!supabaseUrl || !supabaseAnonKey) {
    // In a real app, you might want to show this message in the UI
    console.error("***********************************************************************************");
    console.error("Supabase credentials were not provided correctly.");
    console.error("***********************************************************************************");
    throw new Error("Supabase URL and Anon Key must be provided.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
