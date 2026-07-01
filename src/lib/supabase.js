import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  'https://pubcbstrapwwfzuqiklf.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB1YmNic3RyYXB3d2Z6dXFpa2xmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI5MjU3MTUsImV4cCI6MjA5ODUwMTcxNX0.Jy7GWFfDcSaRSfNLSRvAL_xqwIdpLOfZmNehMxlq4bM'
)
