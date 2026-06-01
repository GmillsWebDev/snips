import { error, fail, redirect } from '@sveltejs/kit'
import type { PageServerLoad, Actions } from './$types'
import { createSupabaseAdminClient } from '$lib/server/supabase'
import { resolveCustomer } from '$lib/server/resolveCustomer'
import { resolveChair } from '$lib/server/resolveChair'

export type RewardTier = {
  id: string
  name: string
  points_required: number
  reward_description: string
  reward_value_pence: number | null
}

export const load: PageServerLoad = async ({ params, locals }) => {
  const { user } = await locals.safeGetSession()

  const { data: shopRaw, error: shopError } = await locals.supabase
    .from('shops')
    .select('id, name, plan_type, timezone')
    .eq('slug', params.slug)
    .eq('is_active', true)
    .single()

  if (shopError) {
    if (shopError.code === 'PGRST116') error(404, 'Shop not found')
    throw shopError
  }

  const admin = createSupabaseAdminClient()

  const [servicesResult, barberResult, prefsResult, tiersResult, customerResult] = await Promise.all([
    locals.supabase
      .from('services')
      .select('id, name, description, duration_minutes, price_pence')
      .eq('shop_id', shopRaw.id)
      .eq('is_active', true)
      .eq('is_deleted', false)
      .order('display_order'),
    locals.supabase
      .from('barbers')
      .select('id')
      .eq('shop_id', shopRaw.id)
      .eq('is_active', true)
      .limit(1)
      .single(),
    admin
      .from('shop_preferences')
      .select('booking_window_days, loyalty_enabled')
      .eq('shop_id', shopRaw.id)
      .single(),
    admin
      .from('loyalty_reward_tiers')
      .select('id, name, points_required, reward_description, reward_value_pence')
      .eq('shop_id', shopRaw.id)
      .eq('is_active', true)
      .order('points_required', { ascending: true }),
    user
      ? admin
          .from('customers')
          .select('loyalty_points')
          .eq('shop_id', shopRaw.id)
          .eq('user_id', user.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  if (servicesResult.error) throw servicesResult.error
  if (barberResult.error && barberResult.error.code !== 'PGRST116') throw barberResult.error

  const loyaltyEnabled = prefsResult.data?.loyalty_enabled ?? false

  const shop = {
    id: shopRaw.id,
    name: shopRaw.name,
    plan_type: shopRaw.plan_type,
    timezone: shopRaw.timezone,
    booking_window_days: prefsResult.data?.booking_window_days ?? 30,
  }

  return {
    shop,
    services: servicesResult.data,
    barber_id: barberResult.data?.id ?? null,
    loyaltyEnabled,
    rewardTiers: (tiersResult.data ?? []) as RewardTier[],
    customerLoyaltyPoints: customerResult.data?.loyalty_points ?? null,
  }
}

export const actions: Actions = {
  confirm: async ({ request, params, locals }) => {
    const form = await request.formData()
    const service_id  = form.get('service_id')  as string | null
    const start_at    = form.get('start_at')    as string | null
    const first_name  = form.get('first_name')  as string | null
    const last_name   = form.get('last_name')   as string | null
    const email       = form.get('email')       as string | null
    const phone       = form.get('phone')       as string | null
    const is_guest             = form.get('is_guest') === 'true'
    const customer_id          = form.get('customer_id') as string | null
    const discount_code_id     = (form.get('discount_code_id') as string | null) || null
    const discount_amount_pence = discount_code_id
      ? (parseInt(form.get('discount_amount_pence') as string ?? '0', 10) || 0)
      : null
    const loyalty_tier_id       = (form.get('loyalty_tier_id') as string | null) || null
    const loyalty_points_required = loyalty_tier_id
      ? (parseInt(form.get('loyalty_points_required') as string ?? '0', 10) || 0)
      : null

    if (!service_id || !start_at || !first_name || !last_name || !email || !phone) {
      return fail(400, { error: 'Missing required booking details.' })
    }

    const supabase = locals.supabase
    const admin = createSupabaseAdminClient()

    const { data: shop, error: shopErr } = await supabase
      .from('shops')
      .select('id, timezone')
      .eq('slug', params.slug)
      .eq('is_active', true)
      .single()
    if (shopErr || !shop) return fail(400, { error: 'Shop not found.' })

    const { data: service, error: serviceErr } = await supabase
      .from('services')
      .select('id, duration_minutes')
      .eq('id', service_id)
      .eq('shop_id', shop.id)
      .eq('is_active', true)
      .eq('is_deleted', false)
      .single()
    if (serviceErr || !service) return fail(400, { error: 'Service not found.' })

    const end_at = new Date(
      new Date(start_at).getTime() + service.duration_minutes * 60_000
    ).toISOString()

    const { data: barber, error: barberErr } = await supabase
      .from('barbers')
      .select('id')
      .eq('shop_id', shop.id)
      .eq('is_active', true)
      .limit(1)
      .single()
    if (barberErr || !barber) return fail(400, { error: 'No barber available.' })

    const chair_id = await resolveChair(supabase, barber.id, shop.id)
    if (!chair_id) return fail(400, { error: 'No chair available.' })

    let resolved_customer_id: string

    if (!is_guest && customer_id) {
      resolved_customer_id = customer_id
    } else {
      const user_id = !is_guest ? (await locals.safeGetSession()).user?.id ?? null : null
      const id = await resolveCustomer(admin, {
        shopId: shop.id,
        email,
        firstName: first_name,
        lastName: last_name,
        phone,
        isGuest: !user_id,
        userId: user_id,
      })
      if (!id) return fail(500, { error: 'Could not save your details. Please try again.' })
      resolved_customer_id = id
    }

    const { data: booking, error: bookingErr } = await admin
      .from('bookings')
      .insert({
        shop_id: shop.id,
        customer_id: resolved_customer_id,
        barber_id: barber.id,
        chair_id,
        service_id,
        start_at,
        end_at,
        status: 'pending',
        ...(discount_code_id ? { discount_code_id, discount_amount_pence } : {}),
      })
      .select('id')
      .single()

    if (bookingErr || !booking) return fail(500, { error: 'Could not create booking. Please try again.' })

    if (discount_code_id) {
      try {
        const { data: codeRow } = await admin
          .from('discount_codes')
          .select('times_used')
          .eq('id', discount_code_id)
          .single()

        await Promise.all([
          admin.from('discount_code_uses').insert({
            discount_code_id,
            customer_id: resolved_customer_id,
            booking_id: booking.id,
          }),
          admin.from('discount_codes')
            .update({ times_used: (codeRow?.times_used ?? 0) + 1 })
            .eq('id', discount_code_id),
        ])
      } catch {
        // Non-fatal — booking is already created
      }
    }

    if (loyalty_tier_id && loyalty_points_required !== null) {
      try {
        const { data: tier } = await admin
          .from('loyalty_reward_tiers')
          .select('id, name, points_required, reward_value_pence')
          .eq('id', loyalty_tier_id)
          .eq('shop_id', shop.id)
          .eq('is_active', true)
          .maybeSingle()

        if (!tier) throw new Error('Loyalty reward tier not found or inactive.')

        const { data: customerRow } = await admin
          .from('customers')
          .select('loyalty_points')
          .eq('id', resolved_customer_id)
          .single()

        const currentPoints = customerRow?.loyalty_points ?? 0
        if (currentPoints < tier.points_required) {
          throw new Error(`You no longer have enough points for this reward (you have ${currentPoints}, need ${tier.points_required}).`)
        }

        await admin
          .from('bookings')
          .update({
            loyalty_tier_id: tier.id,
            loyalty_points_redeemed: tier.points_required,
            loyalty_discount_amount_pence: tier.reward_value_pence ?? 0,
          })
          .eq('id', booking.id)

        await Promise.all([
          admin.from('loyalty_points_log').insert({
            customer_id: resolved_customer_id,
            shop_id: shop.id,
            booking_id: booking.id,
            change: -tier.points_required,
            reason: 'redeemed',
            note: tier.name,
          }),
          admin.from('customers')
            .update({ loyalty_points: currentPoints - tier.points_required })
            .eq('id', resolved_customer_id),
        ])
      } catch (e) {
        await admin.from('bookings').delete().eq('id', booking.id)
        const msg = e instanceof Error ? e.message : 'Failed to redeem loyalty reward. Please try again.'
        return fail(400, { error: msg })
      }
    }

    if (is_guest) {
      const origin = new URL(request.url).origin
      const redirectTo = `${origin}/book/${params.slug}/confirm?id=${booking.id}`
      await admin.functions.invoke('send-guest-booking-link', {
        body: { booking_id: booking.id, email, redirect_to: redirectTo },
      })
    }

    return redirect(303, `/book/${params.slug}/confirm?id=${booking.id}`)
  },
}
