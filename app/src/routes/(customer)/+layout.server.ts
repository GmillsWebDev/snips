import { redirect } from '@sveltejs/kit'
import type { LayoutServerLoad } from './$types'

// The load function runs on every request to this layout route.
// It ensures that only authenticated users can access customer routes.
export const load: LayoutServerLoad = async ({ locals }) => {
  // Retrieve the current user and session from locals
  const { user, session } = await locals.safeGetSession()

  // If there is no authenticated user, redirect to the login page
  if (!user) {
    redirect(303, '/login')
  }

  // Provide user and session data to the layout and its children
  return { user, session }
}