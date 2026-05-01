import { error, fail, redirect } from '@sveltejs/kit'
import { createSupabaseAdminClient } from '$lib/server/supabase'
import type { PageServerLoad, Actions } from './$types'

export type BookingStatus = 'pending' | 'accepted' | 'rejected' | 'cancelled' | 'completed' | 'no_show'

export type BookingDetail = {
  id: string
  status: BookingStatus
  date: string
  time: string
  notes: string | null
  cancellationReason: string | null
  service: {
    name: string
    durationMinutes: number
    pricePence: number
  }
  barberName: string
  chairLabel: string | null
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

export const load: PageServerLoad = async ({ params, locals, parent }) => {
  await parent()

  const { user } = await locals.safeGetSession()
  if (!user) return redirect(303, '/login')

  const admin = createSupabaseAdminClient()

  // Find customer row, with email fallback for accounts where user_id was never set
  const { data: customerByUserId } = await admin
    .from('customers')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  let customerId: string | null = customerByUserId?.id ?? null

  if (!customerId && user.email) {
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

  if (!customerId) error(403, 'Forbidden')

  const { data, error: bookingError } = await admin
    .from('bookings')
    .select(`
      id,
      customer_id,
      status,
      start_at,
      notes,
      cancellation_reason,
      services ( name, duration_minutes, price_pence ),
      barbers ( name ),
      chairs ( label )
    `)
    .eq('id', params.id)
    .single()

  if (bookingError || !data) error(404, 'Booking not found')
  if (data.customer_id !== customerId) error(403, 'Forbidden')

  const booking: BookingDetail = {
    id: data.id,
    status: data.status as BookingStatus,
    date: formatDate(data.start_at),
    time: formatTime(data.start_at),
    notes: data.notes ?? null,
    cancellationReason: data.cancellation_reason ?? null,
    service: {
      name: data.services?.name ?? '',
      durationMinutes: data.services?.duration_minutes ?? 0,
      pricePence: data.services?.price_pence ?? 0,
    },
    barberName: data.barbers?.name ?? '',
    chairLabel: data.chairs?.label ?? null,
  }

  return { booking }
}

export const actions: Actions = {
  cancel: async ({ params, locals }) => {
    const { user } = await locals.safeGetSession()
    if (!user) return fail(401, { error: 'Not authenticated' })

    const admin = createSupabaseAdminClient()

    const { data: customer } = await admin
      .from('customers')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!customer) return fail(403, { error: 'Forbidden' })

    const { data: booking, error: fetchErr } = await admin
      .from('bookings')
      .select('id, customer_id, status')
      .eq('id', params.id)
      .single()

    if (fetchErr || !booking) return fail(404, { error: 'Booking not found' })
    if (booking.customer_id !== customer.id) return fail(403, { error: 'Forbidden' })

    if (booking.status !== 'pending' && booking.status !== 'accepted') {
      return fail(400, { error: 'This booking cannot be cancelled' })
    }

    const { error: updateErr } = await admin
      .from('bookings')
      .update({ status: 'cancelled', cancellation_reason: 'Cancelled by customer' })
      .eq('id', params.id)

    if (updateErr) return fail(500, { error: 'Could not cancel the booking. Please try again.' })

    return redirect(303, '/dashboard')
  },
}
