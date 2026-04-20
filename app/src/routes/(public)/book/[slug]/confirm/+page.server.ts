import { error } from '@sveltejs/kit'
import type { PageServerLoad } from './$types'
import { createSupabaseAdminClient } from '$lib/server/supabase'

export const load: PageServerLoad = async ({ params, url }) => {
  const booking_id = url.searchParams.get('id')
  if (!booking_id) error(400, 'Missing booking ID')

  const admin = createSupabaseAdminClient()

  const { data: shop } = await admin
    .from('shops')
    .select('id, name, timezone')
    .eq('slug', params.slug)
    .eq('is_active', true)
    .single()
  if (!shop) error(404, 'Shop not found')

  const { data: booking, error: bookingErr } = await admin
    .from('bookings')
    .select(`
      id,
      start_at,
      end_at,
      status,
      services ( name, duration_minutes, price_pence ),
      customers ( first_name, last_name, email, phone )
    `)
    .eq('id', booking_id)
    .eq('shop_id', shop.id)
    .single()

  if (bookingErr || !booking) error(404, 'Booking not found')

  return { shop, booking }
}
