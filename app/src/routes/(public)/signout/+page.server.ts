
import { redirect } from '@sveltejs/kit'
import type { Actions } from './$types'

// Actions for handling public signout
export const actions: Actions = {
  // Sign out the current user and redirect to login page
  default: async ({ locals }) => {
    // Call Supabase to sign out the user
    await locals.supabase.auth.signOut()
    // Redirect to the login page after sign out
    redirect(303, '/login')
  }
}