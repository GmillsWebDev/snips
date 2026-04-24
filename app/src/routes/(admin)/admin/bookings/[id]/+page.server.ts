import { error, fail } from '@sveltejs/kit'
import { createSupabaseAdminClient } from '$lib/server/supabase'
import { getRole } from '$lib/server/getRole'
import type { PageServerLoad, Actions } from './$types'

export type BookingStatus = 'pending' | 'accepted' | 'rejected' | 'cancelled' | 'completed' | 'no_show'

export type RelatedBooking = {
  id: string
  date: string
  time: string
  serviceName: string
  status: BookingStatus
}

export type BookingDetail = {
  id: string
  status: BookingStatus
  date: string
  startTime: string
  endTime: string
  createdAt: string
  updatedAt: string
  notes: string | null
  cancellationReason: string | null
  depositPaidPence: number
  customer: {
    name: string
    email: string
    phone: string
  }
  service: {
    name: string
    durationMinutes: number
    pricePence: number
  }
  barberName: string
  chairLabel: string
}

const TIMEZONE = 'Europe/London'

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    timeZone: TIMEZONE,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
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

function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    timeZone: TIMEZONE,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', {
    timeZone: TIMEZONE,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export const load: PageServerLoad = async ({ parent, params, request }) => {
  const { role } = await parent()
  const shopId = role.shop_id
  const admin = createSupabaseAdminClient()

  // Carry query params back to the list page (e.g. active filters)
  let backHref = '/admin/bookings'
  const referer = request.headers.get('referer')
  if (referer) {
    try {
      const refUrl = new URL(referer)
      if (refUrl.pathname === '/admin/bookings') {
        backHref = refUrl.pathname + refUrl.search
      }
    } catch {
      // malformed referer — keep default
    }
  }

  const { data, error: err } = await admin
    .from('bookings')
    .select(`
      id,
      shop_id,
      customer_id,
      status,
      start_at,
      end_at,
      notes,
      cancellation_reason,
      deposit_paid_pence,
      created_at,
      updated_at,
      customers ( first_name, last_name, email, phone ),
      services ( name, duration_minutes, price_pence ),
      barbers ( name ),
      chairs ( label )
    `)
    .eq('id', params.id)
    .single()

  // Treat a wrong shop the same as not found — don't leak existence
  if (err || !data || data.shop_id !== shopId) error(404, 'Booking not found')

  const relatedSelect = 'id, start_at, status, services ( name )'

  const [previousResult, upcomingResult] = await Promise.all([
    admin
      .from('bookings')
      .select(relatedSelect)
      .eq('shop_id', shopId)
      .eq('customer_id', data.customer_id)
      .neq('id', params.id)
      .lt('start_at', data.start_at)
      .order('start_at', { ascending: false })
      .limit(4),
    admin
      .from('bookings')
      .select(relatedSelect)
      .eq('shop_id', shopId)
      .eq('customer_id', data.customer_id)
      .neq('id', params.id)
      .gt('start_at', data.start_at)
      .order('start_at', { ascending: true })
      .limit(1),
  ])

  function toRelated(b: { id: string; start_at: string; status: string; services: { name: string } | null }): RelatedBooking {
    return {
      id: b.id,
      date: formatShortDate(b.start_at),
      time: formatTime(b.start_at),
      serviceName: b.services?.name ?? '',
      status: b.status as BookingStatus,
    }
  }

  const relatedBookings = {
    previous: (previousResult.data ?? []).map(toRelated),
    upcoming: upcomingResult.data?.[0] ? toRelated(upcomingResult.data[0]) : null,
  }

  const booking: BookingDetail = {
    id: data.id,
    status: data.status as BookingStatus,
    date: formatDate(data.start_at),
    startTime: formatTime(data.start_at),
    endTime: formatTime(data.end_at),
    createdAt: formatDateTime(data.created_at),
    updatedAt: formatDateTime(data.updated_at),
    notes: data.notes ?? null,
    cancellationReason: data.cancellation_reason ?? null,
    depositPaidPence: data.deposit_paid_pence ?? 0,
    customer: {
      name: `${data.customers?.first_name ?? ''} ${data.customers?.last_name ?? ''}`.trim(),
      email: data.customers?.email ?? '',
      phone: data.customers?.phone ?? '',
    },
    service: {
      name: data.services?.name ?? '',
      durationMinutes: data.services?.duration_minutes ?? 0,
      pricePence: data.services?.price_pence ?? 0,
    },
    barberName: data.barbers?.name ?? '',
    chairLabel: data.chairs?.label ?? '',
  }

  return { booking, relatedBookings, backHref }
}

export const actions: Actions = {
  accept: ({ params, locals }) => setBookingStatus(params.id, 'accepted', locals),
  reject: ({ params, locals }) => setBookingStatus(params.id, 'rejected', locals),
}

async function setBookingStatus(
  bookingId: string,
  newStatus: 'accepted' | 'rejected',
  locals: App.Locals,
) {
  const { user } = await locals.safeGetSession()
  if (!user) return fail(403, { error: 'Not authenticated' })

  const role = await getRole(locals.supabase, user.id)
  if (!role) return fail(403, { error: 'Not authorized' })

  const admin = createSupabaseAdminClient()

  const { data: booking, error: fetchErr } = await admin
    .from('bookings')
    .select('id, status')
    .eq('id', bookingId)
    .eq('shop_id', role.shop_id)
    .single()

  if (fetchErr || !booking) return fail(404, { error: 'Booking not found' })
  if (booking.status !== 'pending') return { success: true }

  const { error: updateErr } = await admin
    .from('bookings')
    .update({ status: newStatus })
    .eq('id', bookingId)
    .eq('shop_id', role.shop_id)

  if (updateErr) return fail(500, { error: 'Failed to update booking status. Please try again.' })

  return { success: true }
}
