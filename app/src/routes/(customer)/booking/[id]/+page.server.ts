import { error, fail, redirect } from '@sveltejs/kit'
import { createSupabaseAdminClient } from '$lib/server/supabase'
import type { PageServerLoad, Actions } from './$types'

export type BookingStatus = 'pending' | 'accepted' | 'rejected' | 'cancelled' | 'completed' | 'no_show'

export type DiscountCode = {
  code: string
  discountType: 'percentage' | 'fixed'
  discountValue: number
  discountAmountPence: number
}

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
      discount_code_id,
      discount_amount_pence,
      services ( name, duration_minutes, price_pence ),
      barbers ( name ),
      chairs ( label )
    `)
    .eq('id', params.id)
    .single()

  if (bookingError || !data) error(404, 'Booking not found')
  if (data.customer_id !== customerId) error(403, 'Forbidden')

  type RawData = typeof data & { discount_code_id: string | null; discount_amount_pence: number | null }
  const raw = data as unknown as RawData

  let discountCode: DiscountCode | null = null
  if (raw.discount_code_id) {
    const { data: dc } = await admin
      .from('discount_codes')
      .select('code, discount_type, discount_value')
      .eq('id', raw.discount_code_id)
      .maybeSingle()

    if (dc) {
      discountCode = {
        code: dc.code as string,
        discountType: dc.discount_type as 'percentage' | 'fixed',
        discountValue: dc.discount_value as number,
        discountAmountPence: raw.discount_amount_pence ?? 0,
      }
    }
  }

  const booking: BookingDetail = {
    id: data.id,
    status: data.status as BookingStatus,
    date: formatDate(data.start_at),
    time: formatTime(data.start_at),
    notes: data.notes ?? null,
    cancellationReason: data.cancellation_reason ?? null,
    service: {
      name: (data.services as unknown as { name: string; duration_minutes: number; price_pence: number } | null)?.name ?? '',
      durationMinutes: (data.services as unknown as { name: string; duration_minutes: number; price_pence: number } | null)?.duration_minutes ?? 0,
      pricePence: (data.services as unknown as { name: string; duration_minutes: number; price_pence: number } | null)?.price_pence ?? 0,
    },
    barberName: (data.barbers as unknown as { name: string } | null)?.name ?? '',
    chairLabel: (data.chairs as unknown as { label: string } | null)?.label ?? null,
  }

  return { booking, discountCode }
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
