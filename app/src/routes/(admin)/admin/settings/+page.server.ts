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
  ] = await Promise.all([
    admin
      .from('shop_preferences')
      .select('id, booking_window_days, buffer_minutes, auto_accept, deposit_required, show_shop_page')
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
  ])

  if (prefErr) throw prefErr
  if (displayErr) throw displayErr
  if (brandingErr) throw brandingErr

  return {
    preferences: preferences as ShopPreferences,
    displaySettings: displaySettings as ShopDisplaySettings,
    branding: branding as ClientBranding,
  }
}

export const actions: Actions = {
  updatePreferences: async ({ request, locals }) => {
    const { user } = await locals.safeGetSession()
    if (!user) return fail(403, { errors: { form: 'Not authenticated' } })

    const role = await getRole(locals.supabase, user.id)
    if (!role) return fail(403, { errors: { form: 'Not authorized' } })

    const formData = await request.formData()
    const rawWindow = formData.get('booking_window_days')
    const rawBuffer = formData.get('buffer_minutes')

    const errors: { booking_window_days?: string; buffer_minutes?: string } = {}

    const bookingWindowDays = rawWindow !== null ? parseInt(String(rawWindow), 10) : NaN
    if (isNaN(bookingWindowDays) || bookingWindowDays < 1 || bookingWindowDays > 365) {
      errors.booking_window_days = 'Must be a whole number between 1 and 365'
    }

    const bufferMinutes = rawBuffer !== null ? parseInt(String(rawBuffer), 10) : NaN
    if (isNaN(bufferMinutes) || bufferMinutes < 0 || bufferMinutes > 120) {
      errors.buffer_minutes = 'Must be a whole number between 0 and 120'
    }

    if (Object.keys(errors).length > 0) {
      return fail(400, {
        errors,
        values: { booking_window_days: String(rawWindow ?? ''), buffer_minutes: String(rawBuffer ?? '') },
      })
    }

    const admin = createSupabaseAdminClient()

    const { error: updateErr } = await admin
      .from('shop_preferences')
      .update({ booking_window_days: bookingWindowDays, buffer_minutes: bufferMinutes })
      .eq('shop_id', role.shop_id)

    if (updateErr) return fail(500, { errors: { form: 'Failed to save settings. Please try again.' } })

    return redirect(303, '/admin/settings?saved=1')
  },

  updateBranding: async ({ request, locals }) => {
    const { user } = await locals.safeGetSession()
    if (!user) return fail(403, { brandingErrors: { form: 'Not authenticated' } })

    const role = await getRole(locals.supabase, user.id)
    if (!role) return fail(403, { brandingErrors: { form: 'Not authorized' } })

    const formData = await request.formData()
    const rawPrimary     = String(formData.get('color_primary')     ?? '')
    const rawSecondary   = String(formData.get('color_secondary')   ?? '')
    const rawOnPrimary   = String(formData.get('color_on_primary')  ?? '')
    const rawOnSecondary = String(formData.get('color_on_secondary') ?? '')

    const brandingErrors: {
      color_primary?: string
      color_secondary?: string
      color_on_primary?: string
      color_on_secondary?: string
      form?: string
    } = {}

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

    if (updateErr) return fail(500, { brandingErrors: { form: 'Failed to save branding. Please try again.' } })

    return redirect(303, '/admin/settings?saved=1')
  },
}
