import { error, fail } from '@sveltejs/kit'
import { createSupabaseAdminClient } from '$lib/server/supabase'
import { getRole } from '$lib/server/getRole'
import type { PageServerLoad, Actions } from './$types'

const TIMEZONE = 'Europe/London'

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

type RawLoyaltyLog = {
  id: string
  change: number
  reason: string
  note: string | null
  created_at: string
  bookings: { start_at: string; services: { name: string } | null } | null
}

export type LoyaltyLogEntry = {
  id: string
  change: number
  reason: string
  note: string | null
  createdAt: string
  serviceName: string | null
}

export type CustomerDetail = {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  loyaltyPoints: number
  createdAt: string
}

export const load: PageServerLoad = async ({ parent, params }) => {
  const { role } = await parent()
  const shopId = role.shop_id
  const customerId = params.id
  const admin = createSupabaseAdminClient()

  const { data: customer, error: customerErr } = await admin
    .from('customers')
    .select('id, first_name, last_name, email, phone, loyalty_points, created_at')
    .eq('id', customerId)
    .eq('shop_id', shopId)
    .single()

  if (customerErr || !customer) error(404, 'Customer not found')

  const [loyaltyPrefsResult, loyaltyLogResult] = await Promise.all([
    admin
      .from('shop_preferences')
      .select('loyalty_enabled')
      .eq('shop_id', shopId)
      .single(),
    admin
      .from('loyalty_points_log')
      .select('id, change, reason, note, created_at, bookings ( start_at, services ( name ) )')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false }),
  ])

  const loyaltyEnabled = loyaltyPrefsResult.data?.loyalty_enabled ?? false

  const loyaltyLog: LoyaltyLogEntry[] = ((loyaltyLogResult.data ?? []) as unknown as RawLoyaltyLog[]).map(row => ({
    id: row.id,
    change: row.change,
    reason: row.reason,
    note: row.note,
    createdAt: formatDateTime(row.created_at),
    serviceName: row.bookings?.services?.name ?? null,
  }))

  return {
    customer: {
      id: customer.id,
      firstName: customer.first_name,
      lastName: customer.last_name,
      email: customer.email ?? '',
      phone: customer.phone ?? '',
      loyaltyPoints: customer.loyalty_points ?? 0,
      createdAt: formatDateTime(customer.created_at),
    } satisfies CustomerDetail,
    loyaltyEnabled,
    loyaltyLog,
  }
}

export const actions: Actions = {
  adjustPoints: async ({ params, request, locals }) => {
    const { user } = await locals.safeGetSession()
    if (!user) return fail(403, { message: 'Not authenticated' })

    const role = await getRole(locals.supabase, user.id)
    if (!role) return fail(403, { message: 'Not authorized' })

    const formData = await request.formData()
    const rawAdjustment = String(formData.get('adjustment') ?? '').trim()
    const note = String(formData.get('note') ?? '').trim() || null

    const adjustment = parseInt(rawAdjustment, 10)
    if (isNaN(adjustment) || adjustment === 0) {
      return fail(400, { message: 'Adjustment must be a non-zero whole number.' })
    }

    const admin = createSupabaseAdminClient()
    const customerId = params.id

    const { data: customer, error: customerErr } = await admin
      .from('customers')
      .select('id, loyalty_points')
      .eq('id', customerId)
      .eq('shop_id', role.shop_id)
      .single()

    if (customerErr || !customer) return fail(404, { message: 'Customer not found.' })

    const newBalance = (customer.loyalty_points ?? 0) + adjustment
    if (newBalance < 0) {
      return fail(400, {
        message: `Adjustment would result in a negative balance (current: ${customer.loyalty_points ?? 0} points).`,
      })
    }

    const { error: logErr } = await admin
      .from('loyalty_points_log')
      .insert({
        customer_id: customerId,
        shop_id: role.shop_id,
        booking_id: null,
        change: adjustment,
        reason: 'manual_adjustment',
        note,
      })

    if (logErr) return fail(500, { message: 'Failed to record adjustment.' })

    const { error: updateErr } = await admin
      .from('customers')
      .update({ loyalty_points: newBalance })
      .eq('id', customerId)
      .eq('shop_id', role.shop_id)

    if (updateErr) return fail(500, { message: 'Failed to update balance.' })

    return { adjustSuccess: true }
  },
}
