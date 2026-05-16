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

export const load: PageServerLoad = async ({ locals, parent }) => {
  await parent()

  const { user } = await locals.safeGetSession()
  if (!user) return redirect(303, '/login')

  const { data: customerByUserId, error: customerError } = await locals.supabase
    .from('customers')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (customerError) throw customerError

  let customerId: string | null = customerByUserId?.id ?? null

  if (!customerId && user.email) {
    const admin = createSupabaseAdminClient()
    const { data: customerByEmail } = await admin
      .from('customers')
      .select('id')
      .eq('email', user.email)
      .maybeSingle()

    if (customerByEmail) {
      await admin
        .from('customers')
        .update({ user_id: user.id, is_guest: false })
        .eq('id', customerByEmail.id)
      customerId = customerByEmail.id
    }
  }

  if (!customerId) return { upcomingBookings: [] as UpcomingBooking[], pastBookings: [] as PastBooking[] }

  const now = new Date().toISOString()

  const [upcomingResult, pastResult] = await Promise.all([
    locals.supabase
      .from('bookings')
      .select(`
        id,
        start_at,
        status,
        notes,
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
  ])

  if (upcomingResult.error) throw upcomingResult.error
  if (pastResult.error) throw pastResult.error

  const upcomingBookings: UpcomingBooking[] = (upcomingResult.data ?? []).map(b => ({
    id: b.id,
    date: formatDate(b.start_at),
    time: formatTime(b.start_at),
    status: b.status as 'pending' | 'accepted',
    notes: b.notes ?? null,
    service: {
      name: (b.services as unknown as { name: string; duration_minutes: number; price_pence: number } | null)?.name ?? '',
      durationMinutes: (b.services as unknown as { name: string; duration_minutes: number; price_pence: number } | null)?.duration_minutes ?? 0,
      pricePence: (b.services as unknown as { name: string; duration_minutes: number; price_pence: number } | null)?.price_pence ?? 0,
    },
    barberName: (b.barbers as unknown as { name: string } | null)?.name ?? '',
    chairLabel: (b.chairs as unknown as { label: string } | null)?.label ?? null,
    shopSlug: (b.shops as unknown as { slug: string } | null)?.slug ?? null,
  }))

  const pastBookings: PastBooking[] = (pastResult.data ?? []).map(b => ({
    id: b.id,
    date: formatDate(b.start_at),
    time: formatTime(b.start_at),
    status: b.status as BookingStatus,
    service: { name: (b.services as unknown as { name: string } | null)?.name ?? '' },
    hasReview: Array.isArray(b.reviews) ? b.reviews.length > 0 : b.reviews !== null,
  }))

  return { upcomingBookings, pastBookings }
}
