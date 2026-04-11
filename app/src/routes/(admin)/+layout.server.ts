import { redirect, error } from '@sveltejs/kit'
import type { LayoutServerLoad } from './$types'

// The load function runs on every request to this admin layout route.
// It ensures that only authenticated users with a role in at least one shop can access admin pages.
export const load: LayoutServerLoad = async ({ locals }) => {
  // Retrieve the current user and session from locals
  const { user, session } = await locals.safeGetSession()

  // If there is no authenticated user, redirect to the login page
  if (!user) {
    redirect(303, '/login')
  }

  // Query the database to check if the user has any roles in shops
  const { data: roles } = await locals.supabase
    .from('user_roles')
    .select('role, shop_id')
    .eq('user_id', user.id)

  // If the user has no roles, deny access to the admin area
  if (!roles || roles.length === 0) {
    error(403, 'You do not have access to this area')
  }

  // Provide user, session, and roles data to the layout and its children
  return { user, session, roles }
}