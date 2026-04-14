
// Import SvelteKit helpers for navigation and error handling
import { redirect, error } from '@sveltejs/kit'
// Import the type for the layout server load function
import type { LayoutServerLoad } from './$types'
// Import the getRole helper to fetch user roles
import { getRole } from '$lib/server/getRole'


// The load function runs on every request to this layout route.
// It ensures that only authenticated users with a valid role can access admin routes.
export const load: LayoutServerLoad = async ({ locals }) => {
  // Retrieve the user and session from the session helper
  const { user, session } = await locals.safeGetSession()

  // If the user is not logged in, redirect to login page
  if (!user) {
    redirect(303, '/login')
  }

  // Fetch the user's role for admin access
  const role = await getRole(locals.supabase, user.id)

  // If the user does not have a valid role, deny access
  if (!role) {
    error(403, 'You do not have access to this area')
  }

  // Return user, session, and role to the layout
  return { user, session, role }
}