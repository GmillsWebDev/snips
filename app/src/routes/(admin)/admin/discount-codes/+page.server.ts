import { fail } from '@sveltejs/kit'
import { createSupabaseAdminClient } from '$lib/server/supabase'
import { getRole } from '$lib/server/getRole'
import type { PageServerLoad, Actions } from './$types'

export type DiscountCode = {
  id: string
  code: string
  description: string | null
  discount_type: 'percentage' | 'fixed'
  discount_value: number
  min_spend_pence: number | null
  max_uses: number | null
  max_uses_per_customer: number | null
  times_used: number
  valid_from: string | null
  valid_until: string | null
  is_active: boolean
  created_at: string
  restricted_service_ids: string[]
  restricted_service_names: string[]
}

export type ServiceOption = {
  id: string
  name: string
}

type RawCode = Omit<DiscountCode, 'restricted_service_ids' | 'restricted_service_names'> & {
  discount_code_services: Array<{
    service_id: string
    services: { name: string } | null
  }>
}

export const load: PageServerLoad = async ({ parent }) => {
  const { role } = await parent()
  const admin = createSupabaseAdminClient()

  const [
    { data: rawCodes, error: codesErr },
    { data: services, error: servicesErr },
  ] = await Promise.all([
    admin
      .from('discount_codes')
      .select(`
        id, code, description, discount_type, discount_value,
        min_spend_pence, max_uses, max_uses_per_customer, times_used,
        valid_from, valid_until, is_active, created_at,
        discount_code_services ( service_id, services ( name ) )
      `)
      .eq('shop_id', role.shop_id)
      .order('created_at', { ascending: false }),
    admin
      .from('services')
      .select('id, name')
      .eq('shop_id', role.shop_id)
      .eq('is_deleted', false)
      .eq('is_active', true)
      .order('display_order', { ascending: true }),
  ])

  if (codesErr) throw codesErr
  if (servicesErr) throw servicesErr

  const codes: DiscountCode[] = (rawCodes ?? []).map((c) => {
    const raw = c as unknown as RawCode
    return {
      id: raw.id,
      code: raw.code,
      description: raw.description,
      discount_type: raw.discount_type,
      discount_value: raw.discount_value,
      min_spend_pence: raw.min_spend_pence,
      max_uses: raw.max_uses,
      max_uses_per_customer: raw.max_uses_per_customer,
      times_used: raw.times_used,
      valid_from: raw.valid_from,
      valid_until: raw.valid_until,
      is_active: raw.is_active,
      created_at: raw.created_at,
      restricted_service_ids: raw.discount_code_services.map((s) => s.service_id),
      restricted_service_names: raw.discount_code_services
        .map((s) => (s.services as { name: string } | null)?.name ?? '')
        .filter(Boolean),
    }
  })

  return { codes, services: (services ?? []) as ServiceOption[] }
}

function parseOptionalPounds(raw: FormDataEntryValue | null): number | null {
  const s = String(raw ?? '').trim()
  if (!s) return null
  const n = parseFloat(s)
  if (isNaN(n) || n <= 0) return null
  return Math.round(n * 100)
}

function parseOptionalInt(raw: FormDataEntryValue | null): number | null {
  const s = String(raw ?? '').trim()
  if (!s) return null
  const n = parseInt(s, 10)
  return isNaN(n) || n <= 0 ? null : n
}

function parseOptionalDate(raw: FormDataEntryValue | null): string | null {
  const s = String(raw ?? '').trim()
  if (!s) return null
  const d = new Date(s)
  return isNaN(d.getTime()) ? null : d.toISOString()
}

async function getAuthenticatedRole(locals: App.Locals) {
  const { user } = await locals.safeGetSession()
  if (!user) return { user: null, role: null }
  const role = await getRole(locals.supabase, user.id)
  return { user, role }
}

export const actions: Actions = {
  createCode: async ({ request, locals }) => {
    const { role } = await getAuthenticatedRole(locals)
    if (!role) return fail(403, { createError: 'Not authorized' })

    const formData = await request.formData()

    const rawCode = String(formData.get('code') ?? '').trim().toUpperCase()
    const description = String(formData.get('description') ?? '').trim() || null
    const discountType = formData.get('discountType')
    const rawDiscountValue = formData.get('discountValue')
    const rawValidFrom = formData.get('validFrom')
    const rawValidUntil = formData.get('validUntil')
    const serviceIds = formData.getAll('serviceIds').map(String).filter(Boolean)

    if (!rawCode) return fail(400, { createError: 'Code is required', field: 'code' })
    if (rawCode.length > 30) return fail(400, { createError: 'Code must be 30 characters or fewer', field: 'code' })
    if (!/^[A-Z0-9-]+$/.test(rawCode)) {
      return fail(400, { createError: 'Code may only contain letters, numbers, and hyphens', field: 'code' })
    }

    if (discountType !== 'percentage' && discountType !== 'fixed') {
      return fail(400, { createError: 'Invalid discount type', field: 'discountType' })
    }

    const rawValueNum = parseFloat(String(rawDiscountValue ?? ''))
    if (!rawDiscountValue || isNaN(rawValueNum) || rawValueNum <= 0) {
      return fail(400, { createError: 'Discount value must be a positive number', field: 'discountValue' })
    }

    let discountValue: number
    if (discountType === 'percentage') {
      discountValue = Math.round(rawValueNum)
      if (discountValue > 100) {
        return fail(400, { createError: 'Percentage discount cannot exceed 100%', field: 'discountValue' })
      }
    } else {
      discountValue = Math.round(rawValueNum * 100)
      if (discountValue > 10000) {
        return fail(400, { createError: 'Fixed discount cannot exceed £100', field: 'discountValue' })
      }
    }

    const minSpendPence = parseOptionalPounds(formData.get('minSpendPence'))
    const maxUses = parseOptionalInt(formData.get('maxUses'))
    const maxUsesPerCustomer = parseOptionalInt(formData.get('maxUsesPerCustomer'))
    const validFrom = parseOptionalDate(rawValidFrom)
    const validUntil = parseOptionalDate(rawValidUntil)

    if (validFrom && validUntil && new Date(validUntil) <= new Date(validFrom)) {
      return fail(400, { createError: 'Valid until must be after valid from', field: 'validUntil' })
    }

    const admin = createSupabaseAdminClient()

    const { data: existing } = await admin
      .from('discount_codes')
      .select('id')
      .eq('shop_id', role.shop_id)
      .eq('code', rawCode)
      .maybeSingle()

    if (existing) {
      return fail(400, { createError: `A code "${rawCode}" already exists`, field: 'code' })
    }

    const { data: inserted, error: insertErr } = await admin
      .from('discount_codes')
      .insert({
        shop_id: role.shop_id,
        code: rawCode,
        description,
        discount_type: discountType,
        discount_value: discountValue,
        min_spend_pence: minSpendPence,
        max_uses: maxUses,
        max_uses_per_customer: maxUsesPerCustomer,
        valid_from: validFrom,
        valid_until: validUntil,
        is_active: true,
      })
      .select('id')
      .single()

    if (insertErr || !inserted) return fail(500, { createError: 'Failed to create discount code' })

    if (serviceIds.length > 0) {
      const { error: svcErr } = await admin
        .from('discount_code_services')
        .insert(serviceIds.map((service_id) => ({ discount_code_id: inserted.id, service_id })))

      if (svcErr) return fail(500, { createError: 'Code created but failed to set service restrictions' })
    }

    return { created: true }
  },

  toggleCode: async ({ request, locals }) => {
    const { role } = await getAuthenticatedRole(locals)
    if (!role) return fail(403, { toggleError: 'Not authorized' })

    const formData = await request.formData()
    const codeId = formData.get('codeId')
    if (typeof codeId !== 'string') return fail(400, { toggleError: 'Invalid request' })

    const admin = createSupabaseAdminClient()

    const { data: current, error: fetchErr } = await admin
      .from('discount_codes')
      .select('id, is_active')
      .eq('id', codeId)
      .eq('shop_id', role.shop_id)
      .single()

    if (fetchErr || !current) return fail(404, { toggleError: 'Code not found' })

    const { error: updateErr } = await admin
      .from('discount_codes')
      .update({ is_active: !current.is_active })
      .eq('id', codeId)

    if (updateErr) return fail(500, { toggleError: 'Failed to update code' })

    return { toggled: true }
  },

  deleteCode: async ({ request, locals }) => {
    const { role } = await getAuthenticatedRole(locals)
    if (!role) return fail(403, { deleteError: 'Not authorized' })

    const formData = await request.formData()
    const codeId = formData.get('codeId')
    if (typeof codeId !== 'string') return fail(400, { deleteError: 'Invalid request' })

    const admin = createSupabaseAdminClient()

    const { data: current, error: fetchErr } = await admin
      .from('discount_codes')
      .select('id, times_used')
      .eq('id', codeId)
      .eq('shop_id', role.shop_id)
      .single()

    if (fetchErr || !current) return fail(404, { deleteError: 'Code not found' })

    if (current.times_used > 0) {
      return fail(400, {
        deleteError: 'This code has been used and cannot be deleted. Deactivate it instead.',
        deletedCodeId: codeId,
      })
    }

    const { error: deleteErr } = await admin
      .from('discount_codes')
      .delete()
      .eq('id', codeId)

    if (deleteErr) return fail(500, { deleteError: 'Failed to delete code' })

    return { deleted: true }
  },
}
