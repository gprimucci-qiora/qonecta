import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL || 'https://pubcbstrapwwfzuqiklf.supabase.co',
  import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB1YmNic3RyYXB3d2Z6dXFpa2xmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI5MjU3MTUsImV4cCI6MjA5ODUwMTcxNX0.Jy7GWFfDcSaRSfNLSRvAL_xqwIdpLOfZmNehMxlq4bM'
)
