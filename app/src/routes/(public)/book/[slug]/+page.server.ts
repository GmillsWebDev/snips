// Import the error helper from SvelteKit for error handling
import { error } from '@sveltejs/kit'
// Import the type for the page server load function
import type { PageServerLoad } from './$types'

// The load function runs on every request to this booking page.
// It fetches the shop details based on the slug in the URL.
export const load: PageServerLoad = async ({ params, locals }) => {
  const { data: shop, error: shopError } = await locals.supabase
    .from('shops')
    .select('id, name, plan_type, booking_window_days, timezone')
    .eq('slug', params.slug)
    .eq('is_active', true)
    .single()

  // PGRST116 = no rows returned — treat as 404.
  // Any other DB error is a genuine server fault.
  if (shopError) {
    if (shopError.code === 'PGRST116') error(404, 'Shop not found')
    throw shopError
  }

  const [servicesResult, barberResult] = await Promise.all([
    locals.supabase
      .from('services')
      .select('id, name, description, duration_minutes, price_pence')
      .eq('shop_id', shop.id)
      .eq('is_active', true)
      .order('display_order'),
    locals.supabase
      .from('barbers')
      .select('id')
      .eq('shop_id', shop.id)
      .eq('is_active', true)
      .limit(1)
      .single(),
  ])

  if (servicesResult.error) throw servicesResult.error
  // PGRST116 = no active barber configured yet — not a hard error, slots will be empty
  if (barberResult.error && barberResult.error.code !== 'PGRST116') throw barberResult.error

  return {
    shop,
    services: servicesResult.data,
    barber_id: barberResult.data?.id ?? null,
  }
}
