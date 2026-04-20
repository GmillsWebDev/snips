import { error } from '@sveltejs/kit'
import { createSupabaseAdminClient } from '$lib/server/supabase'
import type { PageServerLoad } from './$types'

export type BookingStatus = 'pending' | 'accepted' | 'rejected' | 'cancelled' | 'completed' | 'no_show'

export type Booking = {
  id: string
  startAt: string
  endAt: string
  date: string
  time: string
  customerName: string
  customerEmail: string
  customerPhone: string
  serviceName: string
  barberName: string
  status: BookingStatus
  pricePence: number
}

export type Barber = {
  id: string
  name: string
}

const TIMEZONE = 'Europe/London'
const VALID_STATUSES: BookingStatus[] = ['pending', 'accepted', 'rejected', 'cancelled', 'completed', 'no_show']

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    timeZone: TIMEZONE,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-GB', {
    timeZone: TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
  })
}

function londonDayBounds(dateStr: string): { start: string; end: string } {
  const probe = new Date(`${dateStr}T12:00:00Z`)
  const tzPart = new Intl.DateTimeFormat('en-US', {
    timeZone: TIMEZONE,
    timeZoneName: 'shortOffset',
  }).formatToParts(probe).find(p => p.type === 'timeZoneName')?.value ?? 'GMT'

  let offsetStr = '+00:00'
  const match = tzPart.match(/GMT([+-])(\d+)/)
  if (match) offsetStr = `${match[1]}${match[2].padStart(2, '0')}:00`

  return {
    start: new Date(`${dateStr}T00:00:00${offsetStr}`).toISOString(),
    end:   new Date(`${dateStr}T23:59:59${offsetStr}`).toISOString(),
  }
}

export const load: PageServerLoad = async ({ parent, url }) => {
  const { role } = await parent()
  const shopId = role.shop_id
  const admin = createSupabaseAdminClient()

  const statusParam = url.searchParams.get('status')
  const dateParam   = url.searchParams.get('date')
  const barberParam = url.searchParams.get('barber')

  const validStatus = statusParam && (VALID_STATUSES as string[]).includes(statusParam)
    ? statusParam as BookingStatus
    : null

  const validDate = dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)
    ? dateParam
    : null

  const [shopResult, barbersResult] = await Promise.all([
    admin.from('shops').select('plan_type').eq('id', shopId).single(),
    admin.from('barbers').select('id, name').eq('shop_id', shopId).eq('is_active', true).order('name'),
  ])

  if (shopResult.error) error(500, shopResult.error.message)
  if (barbersResult.error) error(500, barbersResult.error.message)

  const planType = shopResult.data.plan_type as 'solo' | 'multi'

  const validBarber = barberParam && planType === 'multi' ? barberParam : null

  let query = admin
    .from('bookings')
    .select(`
      id,
      start_at,
      end_at,
      status,
      customers ( first_name, last_name, email, phone ),
      services ( name, price_pence ),
      barbers ( name )
    `)
    .eq('shop_id', shopId)

  if (validStatus) query = query.eq('status', validStatus)

  if (validDate) {
    const { start, end } = londonDayBounds(validDate)
    query = query.gte('start_at', start).lte('start_at', end)
  }

  if (validBarber) query = query.eq('barber_id', validBarber)

  const { data, error: err } = await query.order('start_at', { ascending: true })
  if (err) error(500, err.message)

  const bookings: Booking[] = (data ?? []).map(b => ({
    id: b.id,
    startAt: b.start_at,
    endAt: b.end_at,
    date: formatDate(b.start_at),
    time: formatTime(b.start_at),
    customerName: `${b.customers?.first_name ?? ''} ${b.customers?.last_name ?? ''}`.trim(),
    customerEmail: b.customers?.email ?? '',
    customerPhone: b.customers?.phone ?? '',
    serviceName: b.services?.name ?? '',
    barberName: b.barbers?.name ?? '',
    status: b.status as BookingStatus,
    pricePence: b.services?.price_pence ?? 0,
  }))

  return {
    bookings,
    planType,
    barbers: (barbersResult.data ?? []) as Barber[],
    filters: {
      status: validStatus,
      date:   validDate,
      barber: validBarber,
    },
  }
}
