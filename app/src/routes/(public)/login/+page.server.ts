import { redirect, fail } from '@sveltejs/kit'
import type { Actions, PageServerLoad } from './$types'

function safeRedirectTo(value: string | null): string {
  // Only allow internal paths — must start with / but not // (protocol-relative URLs)
  if (value && /^\/[^/]/.test(value)) return value
  return '/dashboard'
}

export const load: PageServerLoad = async ({ locals, url }) => {
  const { user } = await locals.safeGetSession()
  if (user) return redirect(303, safeRedirectTo(url.searchParams.get('redirectTo')))
  return {}
}

export const actions: Actions = {
  default: async ({ request, url, locals }) => {
    const form = await request.formData()
    const email = form.get('email') as string
    const password = form.get('password') as string

    if (!email || !password) {
      return fail(400, { error: 'Email and password are required' })
    }

    const { error } = await locals.supabase.auth.signInWithPassword({
      email,
      password
    })

    if (error) {
      return fail(401, { error: 'Invalid email or password' })
    }

    return redirect(303, safeRedirectTo(url.searchParams.get('redirectTo')))
  }
}