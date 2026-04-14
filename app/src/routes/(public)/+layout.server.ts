
// Import the redirect helper from SvelteKit for navigation
import { redirect } from '@sveltejs/kit'
// Import the type for the layout server load function
import type { LayoutServerLoad } from './$types'

// The load function runs on every request to this layout route.
// It checks if the user is already logged in and prevents access to login/register pages if so.
export const load: LayoutServerLoad = async ({ locals, url }) => {
  // Retrieve the current user session (if any) from locals
  const { user } = await locals.safeGetSession()

  // Define routes that should not be accessible to logged-in users
  const authRoutes = ['/login', '/register', '/forgot-password', '/reset-password']

  // If a user is logged in and tries to access an auth route, redirect to dashboard
  if (user && authRoutes.includes(url.pathname)) {
    redirect(303, '/dashboard')
  }

  // Return an empty object as no additional data is needed for the layout
  return {}
}