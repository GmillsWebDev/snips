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
  customerId: string
  status: BookingStatus
  date: string
  startTime: string
  endTime: string
  createdAt: string
  updatedAt: string
  notes: string | null
  internalNotes: string | null
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

export type NotificationLog = {
  id: string
  type: string
  channel: string
  status: string
  sentAt: string
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

type RawBookingData = {
  id: string
  shop_id: string
  customer_id: string
  status: string
  start_at: string
  end_at: string
  notes: string | null
  internal_notes: string | null
  cancellation_reason: string | null
  deposit_paid_pence: number | null
  created_at: string
  updated_at: string
  customers: { first_name: string; last_name: string; email: string; phone: string } | null
  services: { name: string; duration_minutes: number; price_pence: number } | null
  barbers: { name: string } | null
  chairs: { label: string } | null
}

type RawReview = { rating: number; comment: string | null; created_at: string } | null

function buildBackHref(referer: string | null): string {
  if (!referer) return '/admin/bookings'
  try {
    const url = new URL(referer)
    if (url.pathname === '/admin/bookings') return url.pathname + url.search
  } catch {
    // malformed referer — keep default
  }
  return '/admin/bookings'
}

function toRelated(b: { id: string; start_at: string; status: string; services: { name: string } | null }): RelatedBooking {
  return {
    id: b.id,
    date: formatShortDate(b.start_at),
    time: formatTime(b.start_at),
    serviceName: b.services?.name ?? '',
    status: b.status as BookingStatus,
  }
}

function buildBookingDetail(data: RawBookingData): BookingDetail {
  return {
    id: data.id,
    customerId: data.customer_id,
    status: data.status as BookingStatus,
    date: formatDate(data.start_at),
    startTime: formatTime(data.start_at),
    endTime: formatTime(data.end_at),
    createdAt: formatDateTime(data.created_at),
    updatedAt: formatDateTime(data.updated_at),
    notes: data.notes ?? null,
    internalNotes: data.internal_notes ?? null,
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
}

function buildReview(raw: RawReview): { rating: number; comment: string | null; createdAt: string } | null {
  if (!raw) return null
  return {
    rating: raw.rating,
    comment: raw.comment ?? null,
    createdAt: new Date(raw.created_at).toLocaleDateString('en-GB', {
      timeZone: TIMEZONE,
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }),
  }
}

export const load: PageServerLoad = async ({ parent, params, request }) => {
  const { role } = await parent()
  const shopId = role.shop_id
  const admin = createSupabaseAdminClient()

  const backHref = buildBackHref(request.headers.get('referer'))

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
      internal_notes,
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

  const [previousResult, upcomingResult, reviewResult, notificationsResult] = await Promise.all([
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
    admin
      .from('reviews')
      .select('rating, comment, created_at')
      .eq('booking_id', params.id)
      .maybeSingle(),
    admin
      .from('notification_log')
      .select('id, type, channel, status, sent_at')
      .eq('booking_id', params.id)
      .order('sent_at', { ascending: true }),
  ])

  if (reviewResult.error) error(500, 'Failed to load review')

  type AsRelated = { id: string; start_at: string; status: string; services: { name: string } | null }
  const relatedBookings = {
    previous: ((previousResult.data ?? []) as unknown as AsRelated[]).map(toRelated),
    upcoming: upcomingResult.data?.[0] ? toRelated(upcomingResult.data[0] as unknown as AsRelated) : null,
  }

  const notifications: NotificationLog[] = (notificationsResult.data ?? []).map(n => ({
    id: n.id,
    type: n.type,
    channel: n.channel,
    status: n.status,
    sentAt: formatDateTime(n.sent_at),
  }))

  return {
    booking: buildBookingDetail(data as unknown as RawBookingData),
    relatedBookings,
    backHref,
    review: buildReview(reviewResult.data),
    notifications,
  }
}

export const actions: Actions = {
  accept:   ({ params, locals }) => setBookingStatus(params.id, 'accepted',  'pending',  locals),
  reject:   ({ params, locals }) => setBookingStatus(params.id, 'rejected',  'pending',  locals),
  complete: ({ params, locals }) => setBookingStatus(params.id, 'completed', 'accepted', locals),
  noshow:   ({ params, locals }) => setBookingStatus(params.id, 'no_show',   'accepted', locals),

  saveNotes: async ({ params, request, locals }) => {
    const { user } = await locals.safeGetSession()
    if (!user) return fail(403, { notesError: 'Not authenticated' })

    const role = await getRole(locals.supabase, user.id)
    if (!role) return fail(403, { notesError: 'Not authorized' })

    const formData = await request.formData()
    const notes = formData.get('notes')
    if (typeof notes !== 'string') return fail(400, { notesError: 'Invalid notes value' })

    const admin = createSupabaseAdminClient()

    const { error: updateErr } = await admin
      .from('bookings')
      .update({ internal_notes: notes.trim() || null })
      .eq('id', params.id)
      .eq('shop_id', role.shop_id)

    if (updateErr) return fail(500, { notesError: 'Failed to save notes. Please try again.' })

    return { notesSaved: true }
  },
}

async function setBookingStatus(
  bookingId: string,
  newStatus: 'accepted' | 'rejected' | 'completed' | 'no_show',
  expectedStatus: 'pending' | 'accepted',
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
  if (booking.status !== expectedStatus) return { success: true }

  const { error: updateErr } = await admin
    .from('bookings')
    .update({ status: newStatus })
    .eq('id', bookingId)
    .eq('shop_id', role.shop_id)

  if (updateErr) return fail(500, { error: 'Failed to update booking status. Please try again.' })

  return { success: true }
}
