import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://wnayjzewxiavuwfmxtez.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InduYXlqemV3eGlhdnV3Zm14dGV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1MzYyNjIsImV4cCI6MjA3OTExMjI2Mn0.Bd4ranHy_MqSMVe7GIMHywxTn7-jp84jiM9QWcbZ5kQ';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
