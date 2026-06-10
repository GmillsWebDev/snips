import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { createSupabaseAdminClient } from '$lib/server/supabase'

type RequestBody = {
  code: string
  shopId: string
  serviceId: string
  pricePence: number
  customerId?: string
}

type RawDiscount = {
  id: string
  discount_type: 'percentage' | 'fixed'
  discount_value: number
  min_spend_pence: number | null
  max_uses: number | null
  max_uses_per_customer: number | null
  times_used: number
  valid_from: string | null
  valid_until: string | null
  is_active: boolean
  discount_code_services: Array<{ service_id: string; services: { name: string } | null }>
}

export const POST: RequestHandler = async ({ request }) => {
  let body: RequestBody
  try {
    body = await request.json()
  } catch {
    return json({ error: 'Invalid request body.' }, { status: 400 })
  }

  const { code: rawCode, shopId, serviceId, pricePence, customerId } = body

  if (!rawCode || !shopId || !serviceId || typeof pricePence !== 'number') {
    return json({ error: 'Missing required fields.' }, { status: 400 })
  }

  const code = String(rawCode).trim().toUpperCase()
  const admin = createSupabaseAdminClient()

  const { data: raw, error: fetchErr } = await admin
    .from('discount_codes')
    .select(`
      id, discount_type, discount_value, min_spend_pence,
      max_uses, max_uses_per_customer, times_used,
      valid_from, valid_until, is_active,
      discount_code_services ( service_id, services ( name ) )
    `)
    .eq('shop_id', shopId)
    .eq('code', code)
    .maybeSingle()

  if (fetchErr) return json({ error: 'Failed to validate code.' }, { status: 500 })

  const dc = raw as unknown as RawDiscount | null

  if (!dc || !dc.is_active) {
    return json({ error: 'Invalid or inactive discount code.' }, { status: 400 })
  }

  const now = new Date()

  if (dc.valid_from && now < new Date(dc.valid_from)) {
    return json({ error: 'This code is not yet valid.' }, { status: 400 })
  }

  if (dc.valid_until && now > new Date(dc.valid_until)) {
    return json({ error: 'This discount code has expired.' }, { status: 400 })
  }

  if (dc.max_uses !== null && dc.times_used >= dc.max_uses) {
    return json({ error: 'This discount code has reached its usage limit.' }, { status: 400 })
  }

  if (dc.max_uses_per_customer !== null && customerId) {
    const { count } = await admin
      .from('discount_code_uses')
      .select('*', { count: 'exact', head: true })
      .eq('discount_code_id', dc.id)
      .eq('customer_id', customerId)

    if ((count ?? 0) >= dc.max_uses_per_customer) {
      return json({ error: 'You have already used this discount code.' }, { status: 400 })
    }
  }

  const restrictedServiceIds = dc.discount_code_services.map((s) => s.service_id)
  if (restrictedServiceIds.length > 0 && !restrictedServiceIds.includes(serviceId)) {
    const names = dc.discount_code_services
      .map((s) => (s.services as { name: string } | null)?.name)
      .filter(Boolean)
    const list = names.length > 0
      ? `This code is only valid for: ${names.join(', ')}.`
      : 'This code is not valid for the selected service.'
    return json({ error: list }, { status: 400 })
  }

  if (dc.min_spend_pence !== null && pricePence < dc.min_spend_pence) {
    const shortfall = dc.min_spend_pence - pricePence
    return json(
      {
        error: `This code requires a minimum spend of £${(dc.min_spend_pence / 100).toFixed(2)}. ` +
          `Your booking is £${(pricePence / 100).toFixed(2)} — you're £${(shortfall / 100).toFixed(2)} short.`,
      },
      { status: 400 }
    )
  }

  let discountAmountPence: number
  if (dc.discount_type === 'percentage') {
    discountAmountPence = Math.floor(pricePence * dc.discount_value / 100)
  } else {
    discountAmountPence = Math.min(dc.discount_value, pricePence)
  }

  const discountLabel = dc.discount_type === 'percentage'
    ? `${dc.discount_value}% off`
    : `£${(dc.discount_value / 100).toFixed(2)} off`

  return json({
    valid: true,
    discountCodeId: dc.id,
    discountAmountPence,
    discountLabel,
    finalPricePence: pricePence - discountAmountPence,
  })
}
