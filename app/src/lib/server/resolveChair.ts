import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Returns a chair id for the given barber/shop combination.
 * Prefers the barber's own chair; falls back to any active chair in the shop.
 * Returns null if no chair is available.
 */
export async function resolveChair(
  supabase: SupabaseClient,
  barberId: string,
  shopId: string,
): Promise<string | null> {
  const { data: preferred } = await supabase
    .from('chairs')
    .select('id')
    .eq('barber_id', barberId)
    .eq('is_active', true)
    .limit(1)
    .maybeSingle()

  if (preferred) return preferred.id

  const { data: any } = await supabase
    .from('chairs')
    .select('id')
    .eq('shop_id', shopId)
    .eq('is_active', true)
    .limit(1)
    .maybeSingle()

  return any?.id ?? null
}
