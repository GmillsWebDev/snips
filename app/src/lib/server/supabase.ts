import { createServerClient } from '@supabase/ssr'
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public'
import { SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private'
import type { Cookies } from '@sveltejs/kit'

// Used in load functions and form actions — respects RLS
export const createSupabaseServerClient = (cookies: Cookies) =>
  createServerClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => cookies.getAll(),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value, options }) =>
          cookies.set(name, value, { ...options, path: '/' })
        )
      }
    }
  })

// Used in Edge Functions and server actions that need to bypass RLS
export const createSupabaseAdminClient = () =>
  createServerClient(PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    cookies: { getAll: () => [], setAll: () => {} }
  })