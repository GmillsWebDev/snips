import { fail, redirect, error } from '@sveltejs/kit'
import { createSupabaseAdminClient } from '$lib/server/supabase'
import { getRole } from '$lib/server/getRole'
import type { PageServerLoad, Actions } from './$types'

export type BlockedSlot = {
  id: string
  start_at: string
  end_at: string
  reason: string | null
  recurrence_pattern: string
}

// Converts a Europe/London date + time string to a UTC Date.
// Probes at noon UTC on the given date to determine the London UTC offset,
// avoiding DST edge cases at midnight.
function londonToUtc(dateStr: string, timeStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number)
  const probe = new Date(Date.UTC(year, month - 1, day, 12, 0, 0))
  const londonHour = parseInt(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/London',
      hour: '2-digit',
      hour12: false,
    }).format(probe),
    10,
  )
  const offsetHours = londonHour - 12 // 0 for GMT, 1 for BST
  const [hh, mm, ss = 0] = timeStr.split(':').map(Number)
  return new Date(Date.UTC(year, month - 1, day, hh - offsetHours, mm, ss))
}

type ParsedBlock =
  | { ok: false; message: string }
  | {
      ok: true
      blockType: 'full_day' | 'custom_range'
      date: string
      startTime: string
      endTime: string
      reason: string
      startUtc: Date
      endUtc: Date
    }

function parseBlock(formData: FormData): ParsedBlock {
  const blockType = String(formData.get('blockType') ?? '')
  const date = String(formData.get('date') ?? '')
  const startTime = String(formData.get('startTime') ?? '')
  const endTime = String(formData.get('endTime') ?? '')
  const reason = String(formData.get('reason') ?? '').trim()

  if (blockType !== 'full_day' && blockType !== 'custom_range') {
    return { ok: false, message: 'Invalid block type' }
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return { ok: false, message: 'A valid date is required' }
  }
  if (reason.length > 200) {
    return { ok: false, message: 'Reason must be 200 characters or fewer' }
  }

  let startUtc: Date
  let endUtc: Date

  if (blockType === 'full_day') {
    startUtc = londonToUtc(date, '00:00:00')
    endUtc = londonToUtc(date, '23:59:59')
  } else {
    if (!/^\d{2}:\d{2}$/.test(startTime) || !/^\d{2}:\d{2}$/.test(endTime)) {
      return { ok: false, message: 'Valid start and end times are required' }
    }
    if (startTime >= endTime) {
      return { ok: false, message: 'Start time must be before end time' }
    }
    startUtc = londonToUtc(date, startTime)
    endUtc = londonToUtc(date, endTime)
  }

  if (startUtc <= new Date()) {
    return { ok: false, message: 'Blocked slot must be in the future' }
  }

  return { ok: true, blockType, date, startTime, endTime, reason, startUtc, endUtc }
}

export const load: PageServerLoad = async ({ parent }) => {
  const { role } = await parent()
  const admin = createSupabaseAdminClient()

  const { data: barber, error: barberErr } = await admin
    .from('barbers')
    .select('id, name')
    .eq('shop_id', role.shop_id)
    .eq('is_active', true)
    .limit(1)
    .single()

  if (barberErr || !barber) throw error(500, 'Barber not found for this shop')

  const { data: blocks, error: blocksErr } = await admin
    .from('blocked_slots')
    .select('id, start_at, end_at, reason, recurrence_pattern')
    .eq('barber_id', barber.id)
    .eq('recurrence_pattern', 'none')
    .gt('end_at', new Date().toISOString())
    .order('start_at', { ascending: true })

  if (blocksErr) throw error(500, blocksErr.message)

  return { barber, blocks: (blocks ?? []) as BlockedSlot[] }
}

export const actions: Actions = {
  createBlock: async ({ request, locals }) => {
    const { user } = await locals.safeGetSession()
    if (!user) return fail(403, { formError: 'Not authenticated' })

    const role = await getRole(locals.supabase, user.id)
    if (!role) return fail(403, { formError: 'Not authorized' })

    const formData = await request.formData()
    const parsed = parseBlock(formData)
    if (!parsed.ok) return fail(400, { formError: parsed.message })

    const { startUtc, endUtc, blockType, reason } = parsed
    const admin = createSupabaseAdminClient()

    const { data: barber, error: barberErr } = await admin
      .from('barbers')
      .select('id')
      .eq('shop_id', role.shop_id)
      .eq('is_active', true)
      .limit(1)
      .single()

    if (barberErr || !barber) return fail(404, { formError: 'Barber not found' })

    const { data: upcoming, error: bookingsErr } = await admin
      .from('bookings')
      .select('id')
      .eq('barber_id', barber.id)
      .not('status', 'in', '(cancelled,rejected,completed,no_show)')
      .gte('start_at', startUtc.toISOString())
      .lt('start_at', endUtc.toISOString())

    if (bookingsErr) return fail(500, { formError: 'Failed to check upcoming bookings' })

    if (upcoming && upcoming.length > 0) {
      return fail(409, {
        warning: true,
        count: upcoming.length,
        startAt: startUtc.toISOString(),
        endAt: endUtc.toISOString(),
        blockType,
        reason,
      })
    }

    const { error: insertErr } = await admin
      .from('blocked_slots')
      .insert({
        barber_id: barber.id,
        start_at: startUtc.toISOString(),
        end_at: endUtc.toISOString(),
        reason: reason || null,
        recurrence_pattern: 'none',
        recurrence_id: null,
      })

    if (insertErr) return fail(500, { formError: 'Failed to create blocked slot' })

    return { created: true }
  },

  createBlockConfirmed: async ({ request, locals }) => {
    const { user } = await locals.safeGetSession()
    if (!user) return fail(403, { formError: 'Not authenticated' })

    const role = await getRole(locals.supabase, user.id)
    if (!role) return fail(403, { formError: 'Not authorized' })

    const formData = await request.formData()
    const parsed = parseBlock(formData)
    if (!parsed.ok) return fail(400, { formError: parsed.message })

    const { startUtc, endUtc, reason } = parsed
    const admin = createSupabaseAdminClient()

    const { data: barber, error: barberErr } = await admin
      .from('barbers')
      .select('id')
      .eq('shop_id', role.shop_id)
      .eq('is_active', true)
      .limit(1)
      .single()

    if (barberErr || !barber) return fail(404, { formError: 'Barber not found' })

    const { error: insertErr } = await admin
      .from('blocked_slots')
      .insert({
        barber_id: barber.id,
        start_at: startUtc.toISOString(),
        end_at: endUtc.toISOString(),
        reason: reason || null,
        recurrence_pattern: 'none',
        recurrence_id: null,
      })

    if (insertErr) return fail(500, { formError: 'Failed to create blocked slot' })

    return { created: true }
  },

  deleteBlock: async ({ request, locals }) => {
    const { user } = await locals.safeGetSession()
    if (!user) return fail(403, { deleteError: 'Not authenticated' })

    const role = await getRole(locals.supabase, user.id)
    if (!role) return fail(403, { deleteError: 'Not authorized' })

    const formData = await request.formData()
    const blockId = formData.get('blockId')

    if (typeof blockId !== 'string') return fail(400, { deleteError: 'Invalid request' })

    const admin = createSupabaseAdminClient()

    const { data: barber, error: barberErr } = await admin
      .from('barbers')
      .select('id')
      .eq('shop_id', role.shop_id)
      .eq('is_active', true)
      .limit(1)
      .single()

    if (barberErr || !barber) return fail(404, { deleteError: 'Barber not found' })

    const { data: block, error: blockErr } = await admin
      .from('blocked_slots')
      .select('id, recurrence_pattern')
      .eq('id', blockId)
      .eq('barber_id', barber.id)
      .maybeSingle()

    if (blockErr) return fail(500, { deleteError: 'Failed to verify blocked slot' })
    if (!block) return fail(404, { deleteError: 'Blocked slot not found' })

    if (block.recurrence_pattern !== 'none') {
      return fail(400, { deleteError: 'Use the recurring breaks section to manage recurring blocks' })
    }

    const { error: deleteErr } = await admin
      .from('blocked_slots')
      .delete()
      .eq('id', blockId)

    if (deleteErr) return fail(500, { deleteError: 'Failed to delete blocked slot' })

    redirect(303, '/admin/blocked-slots')
  },
}
