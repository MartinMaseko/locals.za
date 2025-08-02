import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

export const signUp = (email: string, password: string) => supabase.auth.signUp({ email, password })
export const signIn = (email: string, password: string) => supabase.auth.signInWithPassword({ email, password })
export const signOut = () => supabase.auth.signOut()
export const getSession = () => supabase.auth.getSession()
export const getUser = () => supabase.auth.getUser()

export default supabase