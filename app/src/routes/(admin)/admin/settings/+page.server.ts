import { fail, redirect } from '@sveltejs/kit'
import { createSupabaseAdminClient } from '$lib/server/supabase'
import { getRole } from '$lib/server/getRole'
import type { PageServerLoad, Actions } from './$types'

export type ShopPreferences = {
  id: string
  booking_window_days: number
  buffer_minutes: number
  auto_accept: boolean
  deposit_required: boolean
  show_shop_page: boolean
  loyalty_enabled: boolean
  loyalty_points_per_booking: number | null
  loyalty_points_per_pence: number | null
}

export type ShopDisplaySettings = {
  id: string
  info_panel_enabled: boolean
  info_panel_message: string | null
  info_panel_expires_at: string | null
}

export type ClientBranding = {
  id: string
  color_primary: string
  color_secondary: string
  color_on_primary: string
  color_on_secondary: string
}

export type RewardTier = {
  id: string
  name: string
  points_required: number
  reward_description: string
  reward_value_pence: number | null
  is_active: boolean
  display_order: number
}

const HEX_RE = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/

function normalizeHex(raw: string): string {
  const v = raw.toLowerCase()
  if (v.length === 4) {
    return `#${v[1]}${v[1]}${v[2]}${v[2]}${v[3]}${v[3]}`
  }
  return v
}

export const load: PageServerLoad = async ({ parent }) => {
  const { role } = await parent()
  const admin = createSupabaseAdminClient()

  const [
    { data: preferences, error: prefErr },
    { data: displaySettings, error: displayErr },
    { data: branding, error: brandingErr },
    { data: tiers, error: tiersErr },
  ] = await Promise.all([
    admin
      .from('shop_preferences')
      .select('id, booking_window_days, buffer_minutes, auto_accept, deposit_required, show_shop_page, loyalty_enabled, loyalty_points_per_booking, loyalty_points_per_pence')
      .eq('shop_id', role.shop_id)
      .single(),
    admin
      .from('shop_display_settings')
      .select('id, info_panel_enabled, info_panel_message, info_panel_expires_at')
      .eq('shop_id', role.shop_id)
      .single(),
    admin
      .from('client_branding')
      .select('id, color_primary, color_secondary, color_on_primary, color_on_secondary')
      .eq('shop_id', role.shop_id)
      .single(),
    admin
      .from('loyalty_reward_tiers')
      .select('id, name, points_required, reward_description, reward_value_pence, is_active, display_order')
      .eq('shop_id', role.shop_id)
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: true }),
  ])

  if (prefErr) throw prefErr
  if (displayErr) throw displayErr
  if (brandingErr) throw brandingErr
  if (tiersErr) throw tiersErr

  return {
    preferences: preferences as ShopPreferences,
    displaySettings: displaySettings as ShopDisplaySettings,
    branding: branding as ClientBranding,
    tiers: (tiers ?? []) as RewardTier[],
  }
}

export const actions: Actions = {
  updatePreferences: async ({ request, locals }) => {
    type PrefErrors = { form?: string; booking_window_days?: string; buffer_minutes?: string }
    type PrefPayload = { errors: PrefErrors; values?: { booking_window_days: string; buffer_minutes: string } }

    const { user } = await locals.safeGetSession()
    if (!user) return fail<PrefPayload>(403, { errors: { form: 'Not authenticated' } })

    const role = await getRole(locals.supabase, user.id)
    if (!role) return fail<PrefPayload>(403, { errors: { form: 'Not authorized' } })

    const formData = await request.formData()
    const rawWindow = formData.get('booking_window_days')
    const rawBuffer = formData.get('buffer_minutes')

    const errors: PrefErrors = {}

    const bookingWindowDays = rawWindow !== null ? parseInt(String(rawWindow), 10) : NaN
    if (isNaN(bookingWindowDays) || bookingWindowDays < 1 || bookingWindowDays > 365) {
      errors.booking_window_days = 'Must be a whole number between 1 and 365'
    }

    const bufferMinutes = rawBuffer !== null ? parseInt(String(rawBuffer), 10) : NaN
    if (isNaN(bufferMinutes) || bufferMinutes < 0 || bufferMinutes > 120) {
      errors.buffer_minutes = 'Must be a whole number between 0 and 120'
    }

    if (Object.keys(errors).length > 0) {
      return fail<PrefPayload>(400, {
        errors,
        values: { booking_window_days: String(rawWindow ?? ''), buffer_minutes: String(rawBuffer ?? '') },
      })
    }

    const admin = createSupabaseAdminClient()

    const { error: updateErr } = await admin
      .from('shop_preferences')
      .update({ booking_window_days: bookingWindowDays, buffer_minutes: bufferMinutes })
      .eq('shop_id', role.shop_id)

    if (updateErr) return fail<PrefPayload>(500, { errors: { form: 'Failed to save settings. Please try again.' } })

    return redirect(303, '/admin/settings?saved=1')
  },

  updateBranding: async ({ request, locals }) => {
    type BrandingErrors = {
      form?: string
      color_primary?: string
      color_secondary?: string
      color_on_primary?: string
      color_on_secondary?: string
    }

    const { user } = await locals.safeGetSession()
    if (!user) { const brandingErrors: BrandingErrors = { form: 'Not authenticated' }; return fail(403, { brandingErrors }) }

    const role = await getRole(locals.supabase, user.id)
    if (!role) { const brandingErrors: BrandingErrors = { form: 'Not authorized' }; return fail(403, { brandingErrors }) }

    const formData = await request.formData()
    const rawPrimary     = String(formData.get('color_primary')     ?? '')
    const rawSecondary   = String(formData.get('color_secondary')   ?? '')
    const rawOnPrimary   = String(formData.get('color_on_primary')  ?? '')
    const rawOnSecondary = String(formData.get('color_on_secondary') ?? '')

    const brandingErrors: BrandingErrors = {}

    if (!rawPrimary || !HEX_RE.test(rawPrimary))
      brandingErrors.color_primary = 'Must be a valid hex colour (e.g. #2d5a27)'
    if (!rawSecondary || !HEX_RE.test(rawSecondary))
      brandingErrors.color_secondary = 'Must be a valid hex colour (e.g. #8e4432)'
    if (!rawOnPrimary || !HEX_RE.test(rawOnPrimary))
      brandingErrors.color_on_primary = 'Must be a valid hex colour (e.g. #ffffff)'
    if (!rawOnSecondary || !HEX_RE.test(rawOnSecondary))
      brandingErrors.color_on_secondary = 'Must be a valid hex colour (e.g. #ffffff)'

    if (Object.keys(brandingErrors).length > 0) {
      return fail(400, {
        brandingErrors,
        brandingValues: {
          color_primary:     rawPrimary,
          color_secondary:   rawSecondary,
          color_on_primary:  rawOnPrimary,
          color_on_secondary: rawOnSecondary,
        },
      })
    }

    const admin = createSupabaseAdminClient()

    const { error: updateErr } = await admin
      .from('client_branding')
      .update({
        color_primary:     normalizeHex(rawPrimary),
        color_secondary:   normalizeHex(rawSecondary),
        color_on_primary:  normalizeHex(rawOnPrimary),
        color_on_secondary: normalizeHex(rawOnSecondary),
      })
      .eq('shop_id', role.shop_id)

    if (updateErr) { const brandingErrors: BrandingErrors = { form: 'Failed to save branding. Please try again.' }; return fail(500, { brandingErrors }) }

    return redirect(303, '/admin/settings?saved=1')
  },

  updateLoyalty: async ({ request, locals }) => {
    type LoyaltyErrors = { form?: string; pointsPerBooking?: string; pointsPerPence?: string }

    const { user } = await locals.safeGetSession()
    if (!user) return fail<{ loyaltyErrors: LoyaltyErrors }>(403, { loyaltyErrors: { form: 'Not authenticated' } })

    const role = await getRole(locals.supabase, user.id)
    if (!role) return fail<{ loyaltyErrors: LoyaltyErrors }>(403, { loyaltyErrors: { form: 'Not authorized' } })

    const formData = await request.formData()
    const loyaltyEnabled = formData.get('loyaltyEnabled') === 'on'
    const rawPerBooking = String(formData.get('pointsPerBooking') ?? '').trim()
    const rawPerPence   = String(formData.get('pointsPerPence')   ?? '').trim()

    const loyaltyErrors: LoyaltyErrors = {}

    let pointsPerBooking: number | null = null
    if (rawPerBooking !== '') {
      const v = parseInt(rawPerBooking, 10)
      if (isNaN(v) || v < 0) loyaltyErrors.pointsPerBooking = 'Must be a positive whole number'
      else if (v > 0) pointsPerBooking = v
      // v === 0 treated as null (same as leaving blank — disables this earning method)
    }

    let pointsPerPence: number | null = null
    if (rawPerPence !== '') {
      const v = parseInt(rawPerPence, 10)
      if (isNaN(v) || v < 0) loyaltyErrors.pointsPerPence = 'Must be a positive whole number'
      else if (v > 0) pointsPerPence = v
      // v === 0 treated as null (same as leaving blank — disables this earning method)
    }

    if (Object.keys(loyaltyErrors).length > 0) {
      return fail(400, {
        loyaltyErrors,
        loyaltyValues: { pointsPerBooking: rawPerBooking, pointsPerPence: rawPerPence },
      })
    }

    const admin = createSupabaseAdminClient()

    const { error: updateErr } = await admin
      .from('shop_preferences')
      .update({
        loyalty_enabled: loyaltyEnabled,
        loyalty_points_per_booking: pointsPerBooking,
        loyalty_points_per_pence: pointsPerPence,
      })
      .eq('shop_id', role.shop_id)

    if (updateErr) return fail(500, { loyaltyErrors: { form: 'Failed to save loyalty settings. Please try again.' } })

    return redirect(303, '/admin/settings?saved=1')
  },

  addTier: async ({ request, locals }) => {
    type TierErrors = { form?: string; name?: string; pointsRequired?: string; rewardDescription?: string; rewardValuePence?: string }

    const { user } = await locals.safeGetSession()
    if (!user) return fail<{ tierErrors: TierErrors }>(403, { tierErrors: { form: 'Not authenticated' } })

    const role = await getRole(locals.supabase, user.id)
    if (!role) return fail<{ tierErrors: TierErrors }>(403, { tierErrors: { form: 'Not authorized' } })

    const formData = await request.formData()
    const name = String(formData.get('tierName') ?? '').trim()
    const rawPoints = String(formData.get('tierPointsRequired') ?? '').trim()
    const description = String(formData.get('tierRewardDescription') ?? '').trim()
    const rawValue = String(formData.get('tierRewardValuePence') ?? '').trim()

    const tierErrors: TierErrors = {}

    if (!name) tierErrors.name = 'Name is required'
    else if (name.length > 50) tierErrors.name = 'Name must be 50 characters or fewer'

    let pointsRequired = 0
    if (!rawPoints) {
      tierErrors.pointsRequired = 'Points required is required'
    } else {
      const v = parseInt(rawPoints, 10)
      if (isNaN(v) || v < 1) tierErrors.pointsRequired = 'Must be a positive whole number'
      else pointsRequired = v
    }

    if (!description) tierErrors.rewardDescription = 'Reward description is required'
    else if (description.length > 200) tierErrors.rewardDescription = 'Description must be 200 characters or fewer'

    let rewardValuePence: number | null = null
    if (rawValue !== '') {
      const v = parseInt(rawValue, 10)
      if (isNaN(v) || v < 1) tierErrors.rewardValuePence = 'Must be a positive whole number if provided'
      else rewardValuePence = v
    }

    if (Object.keys(tierErrors).length > 0) {
      return fail(400, {
        tierErrors,
        tierValues: { name, pointsRequired: rawPoints, rewardDescription: description, rewardValuePence: rawValue },
      })
    }

    const admin = createSupabaseAdminClient()

    const { data: maxRow } = await admin
      .from('loyalty_reward_tiers')
      .select('display_order')
      .eq('shop_id', role.shop_id)
      .order('display_order', { ascending: false })
      .limit(1)
      .maybeSingle()

    const displayOrder = (maxRow?.display_order ?? 0) + 1

    const { error: insertErr } = await admin
      .from('loyalty_reward_tiers')
      .insert({
        shop_id: role.shop_id,
        name,
        points_required: pointsRequired,
        reward_description: description,
        reward_value_pence: rewardValuePence,
        is_active: true,
        display_order: displayOrder,
      })

    if (insertErr) return fail(500, { tierErrors: { form: 'Failed to add tier. Please try again.' } })

    return redirect(303, '/admin/settings?saved=1')
  },

  toggleTier: async ({ request, locals }) => {
    const { user } = await locals.safeGetSession()
    if (!user) return fail(403, { tierError: 'Not authenticated' })

    const role = await getRole(locals.supabase, user.id)
    if (!role) return fail(403, { tierError: 'Not authorized' })

    const formData = await request.formData()
    const tierId = String(formData.get('tierId') ?? '').trim()
    if (!tierId) return fail(400, { tierError: 'Missing tier ID' })

    const admin = createSupabaseAdminClient()

    const { data: tier, error: fetchErr } = await admin
      .from('loyalty_reward_tiers')
      .select('is_active')
      .eq('id', tierId)
      .eq('shop_id', role.shop_id)
      .single()

    if (fetchErr || !tier) return fail(404, { tierError: 'Tier not found' })

    const { error: updateErr } = await admin
      .from('loyalty_reward_tiers')
      .update({ is_active: !tier.is_active })
      .eq('id', tierId)
      .eq('shop_id', role.shop_id)

    if (updateErr) return fail(500, { tierError: 'Failed to update tier. Please try again.' })

    return redirect(303, '/admin/settings?saved=1')
  },

  deleteTier: async ({ request, locals }) => {
    const { user } = await locals.safeGetSession()
    if (!user) return fail(403, { deleteError: 'Not authenticated', deletedTierId: '' })

    const role = await getRole(locals.supabase, user.id)
    if (!role) return fail(403, { deleteError: 'Not authorized', deletedTierId: '' })

    const formData = await request.formData()
    const tierId = String(formData.get('tierId') ?? '').trim()
    if (!tierId) return fail(400, { deleteError: 'Missing tier ID', deletedTierId: '' })

    const admin = createSupabaseAdminClient()

    const { data: tier, error: fetchErr } = await admin
      .from('loyalty_reward_tiers')
      .select('name')
      .eq('id', tierId)
      .eq('shop_id', role.shop_id)
      .single()

    if (fetchErr || !tier) return fail(404, { deleteError: 'Tier not found', deletedTierId: tierId })

    const { count, error: logErr } = await admin
      .from('loyalty_points_log')
      .select('id', { count: 'exact', head: true })
      .eq('note', tier.name)

    if (logErr) return fail(500, { deleteError: 'Failed to check tier usage. Please try again.', deletedTierId: tierId })

    if ((count ?? 0) > 0) {
      return fail(400, {
        deleteError: 'This tier has been used and cannot be deleted. Deactivate it instead.',
        deletedTierId: tierId,
      })
    }

    const { error: deleteErr } = await admin
      .from('loyalty_reward_tiers')
      .delete()
      .eq('id', tierId)
      .eq('shop_id', role.shop_id)

    if (deleteErr) return fail(500, { deleteError: 'Failed to delete tier. Please try again.', deletedTierId: tierId })

    return redirect(303, '/admin/settings?saved=1')
  },
}
