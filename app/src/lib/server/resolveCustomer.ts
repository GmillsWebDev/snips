import type { SupabaseClient } from '@supabase/supabase-js'

type CustomerInput = {
  shopId: string
  email: string
  firstName: string
  lastName: string
  phone: string
  isGuest: boolean
  userId: string | null
}

/**
 * Finds an existing customer row by email or creates a new one.
 * If an auth user_id is provided and the row isn't already linked, patches it.
 * Returns the resolved customer id, or null on insert failure.
 */
export async function resolveCustomer(
  admin: SupabaseClient,
  input: CustomerInput,
): Promise<string | null> {
  const { shopId, email, firstName, lastName, phone, isGuest, userId } = input

  const { data: existing } = await admin
    .from('customers')
    .select('id')
    .eq('shop_id', shopId)
    .eq('email', email)
    .maybeSingle()

  if (existing) {
    if (userId) {
      await admin
        .from('customers')
        .update({ user_id: userId, is_guest: false })
        .eq('id', existing.id)
    }
    return existing.id
  }

  const { data: created, error } = await admin
    .from('customers')
    .insert({ shop_id: shopId, first_name: firstName, last_name: lastName, email, phone, is_guest: isGuest, user_id: userId })
    .select('id')
    .single()

  if (error || !created) return null

  return created.id
}
