
import { fail, redirect } from '@sveltejs/kit'
import type { Actions } from './$types'

// Actions for handling reset password form submission
export const actions: Actions = {
  default: async ({ request, locals }) => {
    // Parse form data from the request
    const form = await request.formData()
    const password = form.get('password') as string
    const confirm = form.get('confirm') as string

    // Validate that both fields are provided
    if (!password || !confirm) {
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

    // Attempt to update the user's password in Supabase
    const { error } = await locals.supabase.auth.updateUser({ password })

    // Handle errors from Supabase
    if (error) {
      return fail(400, { error: error.message })
    }

    // Redirect to dashboard on successful password reset
    return redirect(303, '/dashboard')
  }
}