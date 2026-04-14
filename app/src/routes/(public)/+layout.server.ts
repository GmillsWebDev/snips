

// Import the redirect helper from SvelteKit for navigation
import { redirect } from '@sveltejs/kit'
// Import the type for the layout server load function
import type { LayoutServerLoad } from './$types'

// The load function runs on every request to this layout route.
// It checks if the user is already logged in and prevents access to login/register pages if so.
export const load: LayoutServerLoad = async ({ locals, url }) => {
  // Retrieve the session and user from the session helper
  const { session, user } = await locals.safeGetSession()

  // List of routes that should not be accessible to logged-in users
  const authRoutes = ['/login', '/register', '/forgot-password', '/reset-password']
  // If the user is logged in and tries to access an auth-only page, redirect to dashboard
  if (user && authRoutes.includes(url.pathname)) {
    redirect(303, '/dashboard')
  }

  // Return session and user to the layout
  return { session, user }
}