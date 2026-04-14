
import { fail } from '@sveltejs/kit'
import type { Actions } from './$types'

// Actions for handling forgot password form submission
export const actions: Actions = {
  default: async ({ request, locals, url }) => {
    // Parse form data from the request
    const form = await request.formData()
    const email = form.get('email') as string

    // Validate that email is provided
    if (!email) {
      return fail(400, { error: 'Email is required' })
    }

    // Attempt to send a password reset email
    const { error } = await locals.supabase.auth.resetPasswordForEmail(email, {
      // Set the redirect URL for the reset link
      redirectTo: `${url.origin}/reset-password`
    })

    // Handle errors from Supabase
    if (error) {
      return fail(400, { error: error.message })
    }

    // Indicate success if no errors occurred
    return { success: true }
  }
}