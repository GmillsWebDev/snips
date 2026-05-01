import { redirect } from '@sveltejs/kit'
import type { PageServerLoad } from './$types'

export type BookingStatus = 'pending' | 'accepted'

export type UpcomingBooking = {
  id: string
  date: string
  time: string
  status: BookingStatus
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

  const { data: customer, error: customerError } = await locals.supabase
    .from('customers')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (customerError) throw customerError
  if (!customer) return { bookings: [] as UpcomingBooking[] }

  const { data, error: bookingsError } = await locals.supabase
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
    .eq('customer_id', customer.id)
    .in('status', ['pending', 'accepted'])
    .gte('start_at', new Date().toISOString())
    .order('start_at', { ascending: true })

  if (bookingsError) throw bookingsError

  const bookings: UpcomingBooking[] = (data ?? []).map(b => ({
    id: b.id,
    date: formatDate(b.start_at),
    time: formatTime(b.start_at),
    status: b.status as BookingStatus,
    notes: b.notes ?? null,
    service: {
      name: b.services?.name ?? '',
      durationMinutes: b.services?.duration_minutes ?? 0,
      pricePence: b.services?.price_pence ?? 0,
    },
    barberName: b.barbers?.name ?? '',
    chairLabel: b.chairs?.label ?? null,
    shopSlug: b.shops?.slug ?? null,
  }))

  return { bookings }
}
