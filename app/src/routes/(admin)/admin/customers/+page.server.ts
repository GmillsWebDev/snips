import { createSupabaseAdminClient } from '$lib/server/supabase'
import type { PageServerLoad } from './$types'

export type CustomerRow = {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  loyaltyPoints: number
  isGuest: boolean
  totalBookings: number
  lastBookingAt: string | null
}

export const load: PageServerLoad = async ({ parent }) => {
  const { role } = await parent()
  const shopId = role.shop_id
  const admin = createSupabaseAdminClient()

  const [customersResult, bookingsResult, loyaltyPrefsResult] = await Promise.all([
    admin
      .from('customers')
      .select('id, first_name, last_name, email, phone, loyalty_points, is_guest')
      .eq('shop_id', shopId)
      .order('last_name', { ascending: true })
      .order('first_name', { ascending: true }),
    admin
      .from('bookings')
      .select('customer_id, start_at')
      .eq('shop_id', shopId)
      .in('status', ['pending', 'accepted', 'completed', 'no_show']),
    admin
      .from('shop_preferences')
      .select('loyalty_enabled')
      .eq('shop_id', shopId)
      .single(),
  ])

  if (customersResult.error) throw customersResult.error

  // Aggregate booking count and last visit per customer in JS
  const statsMap: Record<string, { count: number; lastAt: string | null }> = {}
  for (const b of bookingsResult.data ?? []) {
    const s = statsMap[b.customer_id]
    if (!s) {
      statsMap[b.customer_id] = { count: 1, lastAt: b.start_at }
    } else {
      s.count++
      if (!s.lastAt || b.start_at > s.lastAt) s.lastAt = b.start_at
    }
  }

  const loyaltyEnabled = loyaltyPrefsResult.data?.loyalty_enabled ?? false

  const customers: CustomerRow[] = (customersResult.data ?? []).map(c => ({
    id: c.id,
    firstName: c.first_name,
    lastName: c.last_name,
    email: c.email ?? '',
    phone: c.phone ?? '',
    loyaltyPoints: c.loyalty_points ?? 0,
    isGuest: c.is_guest ?? false,
    totalBookings: statsMap[c.id]?.count ?? 0,
    lastBookingAt: statsMap[c.id]?.lastAt ?? null,
  }))

  return { customers, loyaltyEnabled }
}
