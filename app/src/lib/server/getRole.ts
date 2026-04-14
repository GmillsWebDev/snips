
// Import the Supabase client type for type safety
import type { SupabaseClient } from '@supabase/supabase-js'


// Define the shape of a user role object
export type UserRole = {
  role: string
  shop_id: string
}


// Fetch the user's role and shop association from the database
export const getRole = async (
  supabase: SupabaseClient, // Supabase client instance for DB access
  user_id: string           // The user's unique identifier
): Promise<UserRole | null> => {
  // Query the 'user_roles' table for the given user_id, selecting role and shop_id
  const { data } = await supabase
    .from('user_roles')
    .select('role, shop_id')
    .eq('user_id', user_id)
    .maybeSingle() // Return a single result or null if not found

  // Return the user role object if found, otherwise null
  return data ?? null
}
