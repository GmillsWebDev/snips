
import { redirect, fail } from '@sveltejs/kit'
import type { Actions, PageServerLoad } from './$types'

// Load function to check if user is already authenticated
export const load: PageServerLoad = async ({ locals }) => {
  // Get the current user session (if any)
  const { user } = await locals.safeGetSession()
  // If user is logged in, redirect to dashboard
  if (user) redirect(303, '/dashboard')
  // Otherwise, render the registration page
  return {}
}

// Actions for handling registration form submission
export const actions: Actions = {
  default: async ({ request, locals }) => {
    // Parse form data from the request
    const form = await request.formData()
    const first_name = form.get('first_name') as string
    const last_name = form.get('last_name') as string
    const email = form.get('email') as string
    const password = form.get('password') as string
    const confirm = form.get('confirm') as string

    if (!first_name || !last_name || !email || !password) {
    return fail(400, { error: 'All fields are required' })
    }

    // Check if passwords match
    if (password !== confirm) {
      return fail(400, { error: 'Passwords do not match' })
    }

    // Enforce minimum password length
    if (password.length < 10) {
      return fail(400, { error: 'Password must be at least 10 characters' })
    }

    // Attempt to register the user with Supabase
    const { error } = await locals.supabase.auth.signUp({
      email,
      password,
      options: {
        data: { first_name, last_name } // Store name in user metadata
      }
    })

    // Handle registration errors
    if (error) {
      return fail(400, { error: error.message })
    }

    // Registration successful, redirect to confirmation page
    return redirect(303, '/register/confirm')
  }
}