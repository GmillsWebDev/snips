import { redirect } from '@sveltejs/kit'
import { createSupabaseAdminClient } from '$lib/server/supabase'
import type { PageServerLoad } from './$types'

export type BookingStatus = 'pending' | 'accepted' | 'completed' | 'cancelled' | 'no_show' | 'rejected'

export type UpcomingBooking = {
  id: string
  date: string
  time: string
  status: 'pending' | 'accepted'
  notes: string | null
  service: {
    name: string
    durationMinutes: number
    pricePence: number
  }
  finalPricePence: number
  discountCodeId: string | null
  barberName: string
  chairLabel: string | null
  shopSlug: string | null
}

export type PastBooking = {
  id: string
  date: string
  time: string
  status: BookingStatus
  service: { name: string }
  hasReview: boolean
}

export type LoyaltyLogEntry = {
  id: string
  change: number
  reason: string
  createdAt: string
  serviceName: string | null
}

const TIMEZONE = 'Europe/London'

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    timeZone: TIMEZONE,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-GB', {
    timeZone: TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    timeZone: TIMEZONE,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

type RawLoyaltyLogRow = {
  id: string
  change: number
  reason: string
  created_at: string
  bookings: { services: { name: string } | null } | null
}

export const load: PageServerLoad = async ({ locals, parent }) => {
  await parent()

  const { user } = await locals.safeGetSession()
  if (!user) return redirect(303, '/login')

  const admin = createSupabaseAdminClient()

  const { data: customerByUserId, error: customerError } = await locals.supabase
    .from('customers')
    .select('id, shop_id, loyalty_points')
    .eq('user_id', user.id)
    .maybeSingle()

  if (customerError) throw customerError

  let customerId: string | null = customerByUserId?.id ?? null
  let shopId: string | null = customerByUserId?.shop_id ?? null
  let loyaltyPoints: number = customerByUserId?.loyalty_points ?? 0

  if (!customerId && user.email) {
    const { data: customerByEmail } = await admin
      .from('customers')
      .select('id, shop_id, loyalty_points')
      .eq('email', user.email)
      .maybeSingle()

    if (customerByEmail) {
      await admin
        .from('customers')
        .update({ user_id: user.id, is_guest: false })
        .eq('id', customerByEmail.id)
      customerId = customerByEmail.id
      shopId = customerByEmail.shop_id
      loyaltyPoints = customerByEmail.loyalty_points ?? 0
    }
  }

  if (!customerId) {
    return {
      upcomingBookings: [] as UpcomingBooking[],
      pastBookings: [] as PastBooking[],
      loyaltyEnabled: false,
      loyaltyPoints: 0,
      loyaltyLog: [] as LoyaltyLogEntry[],
    }
  }

  const now = new Date().toISOString()
  const custShopId = shopId ?? ''

  const [upcomingResult, pastResult, loyaltyPrefsResult, loyaltyLogResult] = await Promise.all([
    locals.supabase
      .from('bookings')
      .select(`
        id,
        start_at,
        status,
        notes,
        discount_code_id,
        discount_amount_pence,
        services ( name, duration_minutes, price_pence ),
        barbers ( name ),
        chairs ( label ),
        shops ( slug )
      `)
      .eq('customer_id', customerId)
      .in('status', ['pending', 'accepted'])
      .gte('start_at', now)
      .order('start_at', { ascending: true }),

    locals.supabase
      .from('bookings')
      .select(`
        id,
        start_at,
        status,
        services ( name ),
        reviews ( id )
      `)
      .eq('customer_id', customerId)
      .or(`status.in.(completed,cancelled,no_show,rejected),and(status.in.(pending,accepted),start_at.lt.${now})`)
      .order('start_at', { ascending: false }),

    admin
      .from('shop_preferences')
      .select('loyalty_enabled')
      .eq('shop_id', custShopId)
      .single(),

    admin
      .from('loyalty_points_log')
      .select('id, change, reason, created_at, bookings ( services ( name ) )')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  if (upcomingResult.error) throw upcomingResult.error
  if (pastResult.error) throw pastResult.error

  type RawUpcoming = {
    id: string; start_at: string; status: string; notes: string | null
    discount_code_id: string | null; discount_amount_pence: number | null
    services: { name: string; duration_minutes: number; price_pence: number } | null
    barbers: { name: string } | null
    chairs: { label: string } | null
    shops: { slug: string } | null
  }

  const upcomingBookings: UpcomingBooking[] = ((upcomingResult.data ?? []) as unknown as RawUpcoming[]).map(b => {
    const pricePence = b.services?.price_pence ?? 0
    const discountAmount = b.discount_amount_pence ?? 0
    return {
      id: b.id,
      date: formatDate(b.start_at),
      time: formatTime(b.start_at),
      status: b.status as 'pending' | 'accepted',
      notes: b.notes ?? null,
      service: {
        name: b.services?.name ?? '',
        durationMinutes: b.services?.duration_minutes ?? 0,
        pricePence,
      },
      finalPricePence: discountAmount > 0 ? pricePence - discountAmount : pricePence,
      discountCodeId: b.discount_code_id ?? null,
      barberName: b.barbers?.name ?? '',
      chairLabel: b.chairs?.label ?? null,
      shopSlug: b.shops?.slug ?? null,
    }
  })

  const pastBookings: PastBooking[] = (pastResult.data ?? []).map(b => ({
    id: b.id,
    date: formatDate(b.start_at),
    time: formatTime(b.start_at),
    status: b.status as BookingStatus,
    service: { name: (b.services as unknown as { name: string } | null)?.name ?? '' },
    hasReview: Array.isArray(b.reviews) ? b.reviews.length > 0 : b.reviews !== null,
  }))

  const loyaltyLog: LoyaltyLogEntry[] = ((loyaltyLogResult.data ?? []) as unknown as RawLoyaltyLogRow[]).map(row => ({
    id: row.id,
    change: row.change,
    reason: row.reason,
    createdAt: formatShortDate(row.created_at),
    serviceName: row.bookings?.services?.name ?? null,
  }))

  return {
    upcomingBookings,
    pastBookings,
    loyaltyEnabled: loyaltyPrefsResult.data?.loyalty_enabled ?? false,
    loyaltyPoints,
    loyaltyLog,
  }
}
