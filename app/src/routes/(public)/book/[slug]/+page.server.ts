import { error, fail, redirect } from '@sveltejs/kit'
import type { PageServerLoad, Actions } from './$types'
import { createSupabaseAdminClient } from '$lib/server/supabase'
import { resolveCustomer } from '$lib/server/resolveCustomer'
import { resolveChair } from '$lib/server/resolveChair'

export const load: PageServerLoad = async ({ params, locals }) => {
  const { data: shopRaw, error: shopError } = await locals.supabase
    .from('shops')
    .select('id, name, plan_type, timezone, shop_preferences(booking_window_days)')
    .eq('slug', params.slug)
    .eq('is_active', true)
    .single()

  if (shopError) {
    if (shopError.code === 'PGRST116') error(404, 'Shop not found')
    throw shopError
  }

  const shop = {
    id: shopRaw.id,
    name: shopRaw.name,
    plan_type: shopRaw.plan_type,
    timezone: shopRaw.timezone,
    booking_window_days: shopRaw.shop_preferences?.[0]?.booking_window_days ?? 30,
  }

  const [servicesResult, barberResult] = await Promise.all([
    locals.supabase
      .from('services')
      .select('id, name, description, duration_minutes, price_pence')
      .eq('shop_id', shop.id)
      .eq('is_active', true)
      .eq('is_deleted', false)
      .order('display_order'),
    locals.supabase
      .from('barbers')
      .select('id')
      .eq('shop_id', shop.id)
      .eq('is_active', true)
      .limit(1)
      .single(),
  ])

  if (servicesResult.error) throw servicesResult.error
  if (barberResult.error && barberResult.error.code !== 'PGRST116') throw barberResult.error

  return {
    shop,
    services: servicesResult.data,
    barber_id: barberResult.data?.id ?? null,
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
