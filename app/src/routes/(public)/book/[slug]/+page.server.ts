// Import the error helper from SvelteKit for error handling
import { error } from '@sveltejs/kit'
// Import the type for the page server load function
import type { PageServerLoad } from './$types'

// The load function runs on every request to this booking page.
// It fetches the shop details based on the slug in the URL.
export const load: PageServerLoad = async ({ params, locals }) => {
  const { data: shop, error: shopError } = await locals.supabase
    .from('shops')
    .select('id, name, plan_type, client_branding(color_primary, color_secondary, logo_url)')
    .eq('slug', params.slug)
    .eq('is_active', true)
    .single()

  // PGRST116 = no rows returned — treat as 404.
  // Any other DB error is a genuine server fault.
  if (shopError) {
    if (shopError.code === 'PGRST116') error(404, 'Shop not found')
    throw shopError
  }

  const { data: services, error: servicesError } = await locals.supabase
    .from('services')
    .select('id, name, description, duration_minutes, price_pence')
    .eq('shop_id', shop.id)
    .eq('is_active', true)
    .order('display_order')

  if (servicesError) throw servicesError

  return { shop, services }
}
