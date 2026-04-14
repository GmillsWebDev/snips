
// Import the redirect helper from SvelteKit for navigation
import { redirect } from '@sveltejs/kit'
// Import the type for the layout server load function
import type { LayoutServerLoad } from './$types'

// The load function runs on every request to this layout route.
// It ensures that only authenticated users can access customer routes.
export const load: LayoutServerLoad = async ({ locals, url }) => {
  // Retrieve the user and session from the session helper
  const { user, session } = await locals.safeGetSession()

  // If the user is not logged in, redirect to login page with redirect back to original page after login
  if (!user) {
    redirect(303, `/login?redirectTo=${url.pathname}`)
  }

  // Return user and session to the layout
  return { user, session }
}