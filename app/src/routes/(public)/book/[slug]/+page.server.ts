// Import the error helper from SvelteKit for error handling
import { error } from '@sveltejs/kit'
// Import the type for the page server load function
import type { PageServerLoad } from './$types'

// The load function runs on every request to this booking page.
// It fetches the shop details based on the slug in the URL.
export const load: PageServerLoad = async ({ params, locals }) => {
  // Query the 'shops' table for a shop with the given slug and is_active = true
  const { data: shop } = await locals.supabase
    .from('shops')
    .select('name, logo_url, brand_colour, plan_type')
    .eq('slug', params.slug)
    .eq('is_active', true)
    .single()

  // If no shop is found, throw a 404 error
  if (!shop) {
    error(404, 'Shop not found')
  }

  // Return the shop data to the page
  return { shop }
}
