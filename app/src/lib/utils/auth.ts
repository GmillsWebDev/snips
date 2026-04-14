
import { createSupabaseBrowserClient } from '$lib/supabase'

// Create a Supabase client for browser usage
const supabase = createSupabaseBrowserClient()

/**
 * Sign in a user with email and password.
 * Throws an error if authentication fails.
 */
export const signIn = async (email: string, password: string) => {
  // Attempt to sign in with provided credentials
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error // Propagate error to caller
  return data // Return user/session data
}

/**
 * Register a new user with email, password, first name, and last name.
 * The first and last name are stored in the user's metadata.
 * Throws an error if registration fails.
 */
export const signUp = async (email: string, password: string, first_name: string, last_name: string) => {
  // Attempt to sign up the user with provided credentials and metadata
  const { data, error } = await supabase.auth.signUp({
    email, // User's email address
    password, // User's password
    options: {
      data: { first_name, last_name } // Store first and last name in user profile metadata
    }
  })
  // If there was an error during sign up, throw it to be handled by the caller
  if (error) throw error
  // Return the user/session data on successful registration
  return data
}

/**
 * Sign out the current user.
 * Throws an error if sign out fails.
 */
export const signOut = async () => {
  // Attempt to sign out
  const { error } = await supabase.auth.signOut()
  if (error) throw error // Propagate error to caller
}

/**
 * Send a password reset email to the given address.
 * The user will be redirected to /reset-password after clicking the link.
 * Throws an error if the request fails.
 */
export const resetPassword = async (email: string) => {
  // Send password reset email with redirect
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`
  })
  if (error) throw error // Propagate error to caller
}