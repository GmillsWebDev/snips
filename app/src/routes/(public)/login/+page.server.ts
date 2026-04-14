import { redirect, fail } from '@sveltejs/kit'
import type { Actions, PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ locals }) => {
  const { user } = await locals.safeGetSession()
  if (user) redirect(303, '/dashboard')
  return {}
}

export const actions: Actions = {
  default: async ({ request, locals }) => {
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

    redirect(303, '/dashboard')
  }
}